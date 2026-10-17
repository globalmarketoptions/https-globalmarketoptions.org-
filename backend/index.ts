import { db, error, increment, json, router, secrets, requireAuth, requireAdminEmailAllowlist, withScopes } from '@appdeploy/sdk';
import { clientAccountRoutes } from './client-accounts';

type Ticket = {
  name: string;
  email: string;
  subject: string;
  message: string;
};

type StoredTicket = Ticket & {
  status: string;
  createdAt: string;
  updatedAt?: string;
  emailMessageId: string;
  deliveryStatus?: Record<string, string>;
};

type ResendSendResponse = {
  id?: string;
  name?: string;
  message?: string;
};

type ResendWebhookPayload = {
  type?: string;
  created_at?: string;
  data?: {
    email_id?: string;
    to?: string[];
  };
};

type RequestEvent = {
  body?: string;
  isBase64Encoded?: boolean;
  headers?: Record<string, string | undefined>;
  requestContext?: {
    http?: { sourceIp?: string };
    identity?: { sourceIp?: string };
  };
};

type RateLimitRecord = {
  windowStart: number;
  hits: number;
};

type EmailIndex = {
  ticketId: string;
  emailMessageId: string;
};

const recipients = [
  'support@globalmarketoptions.org',
  'info@globalmarketoptions.org',
] as const;
const ADMIN_EMAILS = ['support@globalmarketoptions.org'];
const rateWindowMs = 15 * 60 * 1000;
const maxTicketsPerWindow = 5;

function asHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function hmacHex(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return asHex(new Uint8Array(signature));
}

async function emailIndexId(emailId: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(emailId));
  return 'email_' + asHex(new Uint8Array(digest));
}

function getSourceIdentifier(event: unknown, email: string): string {
  const requestEvent = event as RequestEvent;
  const sourceIp = requestEvent?.requestContext?.http?.sourceIp
    || requestEvent?.requestContext?.identity?.sourceIp;
  return sourceIp ? 'ip:' + sourceIp : 'email:' + email.trim().toLowerCase();
}

async function takeRateLimit(key: string, now = Date.now()): Promise<boolean> {
  const id = 'rl_' + key;
  const windowStart = Math.floor(now / rateWindowMs) * rateWindowMs;

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const [current] = await db.get<RateLimitRecord>('support_rate_limits', [id], { consistent: true });

    if (!current) {
      const [createdId] = await db.tx.add('support_rate_limits', [{
        id,
        windowStart,
        hits: 1,
      }]);
      if (createdId) return true;
      continue;
    }

    if (current.windowStart !== windowStart) {
      const [updated] = await db.tx.update('support_rate_limits', [{
        id,
        record: { windowStart, hits: 1 },
        if: { windowStart: current.windowStart },
      }], { patch: true });
      if (updated) return true;
      continue;
    }

    if (current.hits >= maxTicketsPerWindow) return false;

    const [updated] = await db.tx.update('support_rate_limits', [{
      id,
      record: { hits: increment(1) },
      if: { windowStart, hits: current.hits },
    }], { patch: true });
    if (updated) return true;
  }

  throw new Error('Rate limit counter contention');
}

function getHeader(headers: Record<string, string | undefined> | undefined, name: string): string {
  if (!headers) return '';
  const matchingKey = Object.keys(headers).find(key => key.toLowerCase() === name.toLowerCase());
  return matchingKey ? headers[matchingKey] || '' : '';
}

function base64ToBytes(value: string): Uint8Array {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  const binary = atob(padded);
  return Uint8Array.from(binary, character => character.charCodeAt(0));
}

function decodeBase64Text(value: string): string {
  return new TextDecoder().decode(base64ToBytes(value));
}

async function verifyResendSignature(
  rawBody: string,
  headers: Record<string, string | undefined> | undefined,
  webhookSecret: string,
): Promise<boolean> {
  const id = getHeader(headers, 'svix-id');
  const timestamp = getHeader(headers, 'svix-timestamp');
  const signatureHeader = getHeader(headers, 'svix-signature');
  const timestampSeconds = Number(timestamp);

  if (
    !id || !timestamp || !signatureHeader || !Number.isFinite(timestampSeconds)
    || Math.abs(Date.now() / 1000 - timestampSeconds) > 300
  ) {
    return false;
  }

  const encodedSecret = webhookSecret.startsWith('whsec_')
    ? webhookSecret.slice('whsec_'.length)
    : webhookSecret;
  let secretBytes: Uint8Array;
  try {
    secretBytes = base64ToBytes(encodedSecret);
  } catch {
    return false;
  }

  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signedPayload = new TextEncoder().encode(id + '.' + timestamp + '.' + rawBody);
  const expected = new Uint8Array(await crypto.subtle.sign('HMAC', key, signedPayload));

  for (const candidate of signatureHeader.split(' ')) {
    const [version, encodedSignature] = candidate.split(',', 2);
    if (version !== 'v1' || !encodedSignature) continue;
    try {
      const actual = base64ToBytes(encodedSignature);
      if (actual.length !== expected.length) continue;
      let mismatch = 0;
      for (let index = 0; index < actual.length; index += 1) mismatch |= actual[index] ^ expected[index];
      if (mismatch === 0) return true;
    } catch {
      continue;
    }
  }
  return false;
}

async function updateTicketDelivery(
  emailId: string,
  recipientsForEvent: string[],
  status: string,
  eventType: string,
): Promise<boolean> {
  const [index] = await db.get<EmailIndex>(
    'support_email_index',
    [await emailIndexId(emailId)],
    { consistent: true },
  );
  if (!index) return true;

  const terminalStatuses = new Set(['delivered', 'bounced', 'failed', 'complained', 'suppressed']);
  const trackedRecipients = new Set(recipients.map(address => address.toLowerCase()));

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const [ticket] = await db.get<StoredTicket>('support_tickets', [index.ticketId], { consistent: true });
    if (!ticket || ticket.emailMessageId !== emailId) return true;

    const deliveryStatus = { ...(ticket.deliveryStatus || {}) };
    let changed = false;
    for (const address of recipientsForEvent.map(value => value.toLowerCase())) {
      if (!trackedRecipients.has(address)) continue;
      const previous = deliveryStatus[address];
      if (previous && terminalStatuses.has(previous) && !terminalStatuses.has(status)) continue;
      deliveryStatus[address] = status;
      changed = true;
    }
    if (!changed) return true;

    const [updated] = await db.tx.update('support_tickets', [{
      id: index.ticketId,
      record: {
        deliveryStatus,
        lastDeliveryEvent: eventType,
        updatedAt: new Date().toISOString(),
      },
      if: {
        emailMessageId: emailId,
        updatedAt: ticket.updatedAt,
      },
    }], { patch: true });
    if (updated) return true;
  }

  return false;
}

export const handler = router({
  'POST /api/support-tickets': [
    async ({ body, event }) => {
      if (!body || typeof body !== 'object' || Array.isArray(body)) {
        return error('Invalid support ticket.', 400);
      }

      const input = body as Record<string, unknown>;
      if (typeof input.website === 'string' && input.website.trim()) {
        return json({ success: true, ticketId: null }, 201);
      }

      const ticket: Ticket = {
        name: typeof input.name === 'string' ? input.name.trim() : '',
        email: typeof input.email === 'string' ? input.email.trim() : '',
        subject: typeof input.subject === 'string' ? input.subject.trim() : '',
        message: typeof input.message === 'string' ? input.message.trim() : '',
      };
      const emailPattern = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

      if (
        !ticket.name || ticket.name.length > 120 ||
        !emailPattern.test(ticket.email) || ticket.email.length > 254 ||
        !ticket.subject || ticket.subject.length > 180 ||
        !ticket.message || ticket.message.length > 5000
      ) {
        return error('Please check the required fields and length limits.', 400);
      }

      try {
        const configuredSecrets = await secrets.listSecretNames();
        if (!configuredSecrets.includes('RESEND_API_KEY')) {
          return error('Support email delivery is not configured.', 503);
        }

        const token = await secrets.readSecret('RESEND_API_KEY');
        const sourceIdentifier = getSourceIdentifier(event, ticket.email);
        const rateKey = await hmacHex(token, sourceIdentifier);
        let allowed: boolean;
        try {
          allowed = await takeRateLimit(rateKey);
        } catch {
          console.error('Support rate limiter unavailable.');
          return error('Ticket submission is temporarily unavailable. Please try again later.', 503);
        }
        if (!allowed) return error('Too many support tickets. Please wait 15 minutes before trying again.', 429);

        const safeSubject = ticket.subject.replace(/[\r\n]+/g, ' ').slice(0, 180);
        const emailText = [
          'New support ticket from globalmarketoptions.org',
          '',
          'Name: ' + ticket.name,
          'Reply-to: ' + ticket.email,
          'Subject: ' + safeSubject,
          '',
          ticket.message,
        ].join('\n');

        const sendResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + token,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'Global Market Options Support <support@globalmarketoptions.org>',
            to: recipients,
            reply_to: ticket.email,
            subject: 'Website support ticket: ' + safeSubject,
            text: emailText,
          }),
        });
        const responseData = await sendResponse.json() as ResendSendResponse;

        if (!sendResponse.ok || typeof responseData.id !== 'string') {
          const status = sendResponse.status;
          const message = status === 401
            ? 'Resend rejected the API key. Check that the key is active and belongs to the intended Resend account.'
            : status === 403 || status === 422
              ? 'Resend rejected the sender. Verify globalmarketoptions.org in Resend and confirm the support sender address.'
              : 'Resend did not accept the support email (HTTP ' + status + '). Please review the Resend domain and API key settings.';
          console.error('Resend support email rejected.', status, responseData.name || 'unknown');
          return error(message, status === 401 || status === 403 || status === 422 ? status : 502);
        }

        const createdAt = new Date().toISOString();
        try {
          const [ticketId] = await db.add('support_tickets', [{
            ...ticket,
            status: 'accepted',
            deliveryStatus: {
              'support@globalmarketoptions.org': 'accepted',
              'info@globalmarketoptions.org': 'accepted',
            },
            createdAt,
            emailMessageId: responseData.id,
          }]);
          if (ticketId) {
            try {
              const [indexId] = await db.tx.add('support_email_index', [{
                id: await emailIndexId(responseData.id),
                ticketId,
                emailMessageId: responseData.id,
              }]);
              if (!indexId) console.error('Resend accepted a ticket; its email index already exists.');
            } catch {
              console.error('Resend accepted a ticket; its email index could not be stored.');
            }
          } else {
            console.error('Resend accepted a ticket; its archive record was not created.');
          }
          return json({ success: true, ticketId: ticketId || null }, 201);
        } catch {
          console.error('Resend accepted a ticket; its archive write failed.');
          return json({ success: true, ticketId: null }, 201);
        }
      } catch (cause) {
        console.error('Resend support ticket delivery failed.', cause instanceof Error ? cause.name : 'unknown');
        return error('The support email service could not be reached. Please try again later.', 502);
      }
    },
  ],
  'POST /api/resend-webhooks': [
    async ({ event }) => {
      const requestEvent = event as RequestEvent;
      const webhookSecret = await secrets.readSecret('RESEND_WEBHOOK_SECRET').catch(() => '');
      if (!webhookSecret) return error('Webhook signing secret is not configured.', 503);

      const bodyValue = requestEvent?.body;
      if (typeof bodyValue !== 'string') return error('Missing webhook body.', 400);
      let rawBody: string;
      try {
        rawBody = requestEvent.isBase64Encoded ? decodeBase64Text(bodyValue) : bodyValue;
      } catch {
        return error('Invalid webhook body.', 400);
      }

      let validSignature = false;
      try {
        validSignature = await verifyResendSignature(rawBody, requestEvent.headers, webhookSecret);
      } catch {
        validSignature = false;
      }
      if (!validSignature) return error('Invalid webhook signature.', 400);

      let payload: ResendWebhookPayload;
      try {
        payload = JSON.parse(rawBody) as ResendWebhookPayload;
      } catch {
        return error('Invalid webhook JSON.', 400);
      }

      const statusByEvent: Record<string, string> = {
        'email.sent': 'sent',
        'email.delivered': 'delivered',
        'email.delivery_delayed': 'delayed',
        'email.bounced': 'bounced',
        'email.failed': 'failed',
        'email.complained': 'complained',
        'email.suppressed': 'suppressed',
      };
      const nextStatus = typeof payload.type === 'string' ? statusByEvent[payload.type] : undefined;
      const emailId = payload.data?.email_id;
      if (!nextStatus || !emailId) return json({ received: true }, 200);

      const addresses = Array.isArray(payload.data?.to)
        ? payload.data.to.filter((value): value is string => typeof value === 'string')
        : [];
      try {
        const updated = await updateTicketDelivery(emailId, addresses, nextStatus, payload.type || 'unknown');
        if (!updated) return error('Ticket status update is temporarily unavailable.', 503);
        return json({ received: true }, 200);
      } catch {
        console.error('Resend webhook processing failed.');
        return error('Webhook processing is temporarily unavailable.', 503);
      }
    },
  ],
  ...clientAccountRoutes,
  'GET /api/admin/support-tickets': [
    requireAuth(),
    withScopes('email'),
    requireAdminEmailAllowlist(ADMIN_EMAILS),
    async ({ query }) => {
      const requestedLimit = Number(query.limit);
      const limit = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, Math.floor(requestedLimit))) : 25;
      try {
        const page = await db.list<StoredTicket>('support_tickets', {
          limit,
          nextToken: query.nextToken || undefined,
        });
        const tickets = page.items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
        return json({ tickets, nextToken: page.nextToken || null }, 200);
      } catch {
        console.error('Admin support ticket history read failed.');
        return error('Support ticket history is temporarily unavailable.', 503);
      }
    },
  ],
});