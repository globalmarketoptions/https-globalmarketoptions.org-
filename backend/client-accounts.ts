import {
  db,
  error,
  increment,
  json,
  requireAdminEmailAllowlist,
  requireAuth,
  withScopes,
} from '@appdeploy/sdk';
import { notifySubscribers, addSubscription, removeSubscription } from './realtime-subscribers';

const ADMIN_EMAILS = ['support@globalmarketoptions.org'];
const MAX_HISTORY = 100;
const MAX_REQUESTS = 100;

type AccountRequest = {
  id: string;
  kind: 'deposit' | 'withdrawal';
  amountCents: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt?: string;
};
type AccountHistory = {
  id: string;
  kind: string;
  amountCents?: number;
  description: string;
  createdAt: string;
};
type ClientAccount = {
  email: string;
  name: string;
  balanceCents: number;
  reservedCents: number;
  status: 'active' | 'restricted';
  verificationStatus: 'not_configured';
  dailyLimitPercent: null;
  revision: number;
  createdAt: string;
  updatedAt: string;
  requests: AccountRequest[];
  history: AccountHistory[];
  appliedActions: string[];
};

function asHex(bytes: Uint8Array): string {
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function accountIdFor(userId: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(userId));
  return 'acct_' + asHex(new Uint8Array(digest));
}

function newId(prefix: string): string {
  return prefix + crypto.randomUUID().replace(/-/g, '');
}

function amountToCents(value: unknown): number | null {
  const amount = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1000000) return null;
  const cents = Math.round(amount * 100);
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function validId(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{8,100}$/.test(value);
}

function accountForResponse(account: ClientAccount, id: string) {
  return { ...account, id };
}

async function ensureAccount(user: { userId: string; email?: string; name?: string }): Promise<ClientAccount & { id: string }> {
  const id = await accountIdFor(user.userId);
  let [account] = await db.get<ClientAccount>('client_accounts', [id], { consistent: true });
  if (!account) {
    await db.tx.add('client_accounts', [{
      id,
      email: (user.email || '').trim().toLowerCase(),
      name: (user.name || user.email?.split('@')[0] || 'Client').slice(0, 120),
      balanceCents: 0,
      reservedCents: 0,
      status: 'active',
      verificationStatus: 'not_configured',
      dailyLimitPercent: null,
      revision: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      requests: [],
      history: [],
      appliedActions: [],
    }]);
    const result = await db.get<ClientAccount>('client_accounts', [id], { consistent: true });
    account = result[0] || null;
  }
  if (!account) throw new Error('Could not initialize the demo account.');
  return accountForResponse(account, id);
}

async function updateAccount(
  id: string,
  change: (current: ClientAccount) => Partial<ClientAccount> | null,
): Promise<ClientAccount & { id: string }> {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const [current] = await db.get<ClientAccount>('client_accounts', [id], { consistent: true });
    if (!current) throw new Error('Account not found.');
    const patch = change(current);
    if (!patch) return accountForResponse(current, id);

    const [updated] = await db.tx.update('client_accounts', [{
      id,
      record: {
        ...patch,
        revision: increment(1),
        updatedAt: new Date().toISOString(),
      },
      if: { revision: current.revision },
    }], { patch: true });
    if (!updated) continue;

    const [saved] = await db.get<ClientAccount>('client_accounts', [id], { consistent: true });
    if (!saved) throw new Error('Account update could not be confirmed.');
    try {
      await notifySubscribers('client_account', id, accountForResponse(saved, id));
    } catch {
      console.error('Realtime demo account notification could not be delivered.');
    }
    return accountForResponse(saved, id);
  }
  throw new Error('Account changed concurrently. Please refresh and retry.');
}

function addHistory(current: ClientAccount, entry: AccountHistory): AccountHistory[] {
  return [entry, ...(current.history || [])].slice(0, MAX_HISTORY);
}

async function handleClientRequest(body: unknown, user: { userId: string; email?: string; name?: string }) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return error('Invalid demo request.', 400);
  const input = body as Record<string, unknown>;
  const kind = input.kind;
  const amountCents = amountToCents(input.amount);
  const requestId = validId(input.request_id) ? input.request_id : newId('req_');
  if ((kind !== 'deposit' && kind !== 'withdrawal') || !amountCents) {
    return error('Choose a demo request type and a valid positive USD amount.', 400);
  }

  const account = await ensureAccount(user);
  try {
    const updated = await updateAccount(account.id, current => {
      const existing = current.requests.find(item => item.id === requestId);
      if (existing) return null;
      if (kind === 'withdrawal' && amountCents > current.balanceCents - current.reservedCents) {
        throw new Error('This demo withdrawal exceeds the available balance.');
      }
      const createdAt = new Date().toISOString();
      const request: AccountRequest = { id: requestId, kind, amountCents, status: 'pending', createdAt };
      const historyEntry: AccountHistory = {
        id: requestId,
        kind: kind === 'deposit' ? 'demo_deposit_request' : 'demo_withdrawal_request',
        amountCents,
        description: 'Simulated request submitted for admin review.',
        createdAt,
      };
      return {
        balanceCents: current.balanceCents,
        reservedCents: current.reservedCents + (kind === 'withdrawal' ? amountCents : 0),
        requests: [request, ...current.requests].slice(0, MAX_REQUESTS),
        history: addHistory(current, historyEntry),
      };
    });
    return json({ account: updated }, 201);
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : 'Could not create the demo request.', 400);
  }
}

async function handleAdminAction(accountId: string, body: unknown) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return error('Invalid account action.', 400);
  const input = body as Record<string, unknown>;
  const action = input.action;
  const actionId = validId(input.action_id) ? input.action_id : '';
  if (!actionId) return error('A valid action id is required.', 400);
  const amountCents = amountToCents(input.amount);

  try {
    const updated = await updateAccount(accountId, current => {
      if (current.appliedActions.includes(actionId)) return null;
      let patch: Partial<ClientAccount>;
      let description = '';
      let kind = String(action || '');

      if (action === 'credit') {
        if (!amountCents) throw new Error('Enter a valid demo credit amount.');
        patch = { balanceCents: current.balanceCents + amountCents };
        description = 'Administrator demo balance credit. No funds were transferred.';
      } else if (action === 'set-status') {
        if (input.status !== 'active' && input.status !== 'restricted') throw new Error('Choose active or restricted account status.');
        patch = { status: input.status };
        description = 'Demo account status set to ' + input.status + '.';
      } else if (action === 'history-note' || action === 'create-trade') {
        const note = typeof input.note === 'string' ? input.note.trim().slice(0, 180) : '';
        if (!note) throw new Error('Enter a short description first.');
        patch = {};
        description = note;
      } else if (action === 'process-request') {
        const requestId = input.request_id;
        const decision = input.decision;
        if (typeof requestId !== 'string' || (decision !== 'approved' && decision !== 'rejected')) {
          throw new Error('Choose a pending demo request and a valid decision.');
        }
        const request = current.requests.find(item => item.id === requestId);
        if (!request || request.status !== 'pending') throw new Error('This request is no longer pending.');
        const requests = current.requests.map(item => item.id === requestId
          ? { ...item, status: decision, updatedAt: new Date().toISOString() }
          : item);
        const depositCredit = request.kind === 'deposit' && decision === 'approved' ? request.amountCents : 0;
        const withdrawalDebit = request.kind === 'withdrawal' && decision === 'approved' ? request.amountCents : 0;
        patch = {
          balanceCents: current.balanceCents + depositCredit - withdrawalDebit,
          reservedCents: Math.max(0, current.reservedCents - (request.kind === 'withdrawal' ? request.amountCents : 0)),
          requests,
        };
        description = 'Demo ' + request.kind + ' request ' + decision + '. No payment or payout occurred.';
        kind = 'process_demo_' + request.kind;
      } else {
        throw new Error('This account action is not available.');
      }

      const historyEntry: AccountHistory = {
        id: actionId,
        kind: action === 'create-trade' ? 'simulated_trade' : action === 'history-note' ? 'admin_note' : kind,
        amountCents: action === 'credit' ? amountCents || undefined : undefined,
        description,
        createdAt: new Date().toISOString(),
      };
      return {
        ...patch,
        history: addHistory(current, historyEntry),
        appliedActions: [actionId, ...current.appliedActions].slice(0, MAX_HISTORY),
      };
    });
    return json({ account: updated }, 200);
  } catch (cause) {
    return error(cause instanceof Error ? cause.message : 'The account action could not be saved.', 400);
  }
}

export const clientAccountRoutes = {
  'GET /api/client-account': [
    requireAuth(),
    withScopes('email'),
    async ({ user }) => {
      try {
        return json({ account: await ensureAccount(user!) }, 200);
      } catch {
        return error('The demo account could not be loaded.', 503);
      }
    },
  ],
  'POST /api/client-account/requests': [
    requireAuth(),
    withScopes('email'),
    async ({ body, user }) => handleClientRequest(body, user!),
  ],
  'POST /api/client-account/subscribe': [
    requireAuth(),
    withScopes('email'),
    async ({ body, user }) => {
      const value = body && typeof body === 'object' ? body as Record<string, unknown> : {};
      const connectionId = value.connection_id;
      if (typeof connectionId !== 'string' || connectionId.length > 200) return error('A valid connection id is required.', 400);
      const accountId = await accountIdFor(user!.userId);
      await addSubscription('client_account', accountId, connectionId);
      return json({ ok: true });
    },
  ],
  'POST /api/client-account/unsubscribe': [
    requireAuth(),
    withScopes('email'),
    async ({ body, user }) => {
      const value = body && typeof body === 'object' ? body as Record<string, unknown> : {};
      const connectionId = value.connection_id;
      if (typeof connectionId !== 'string' || connectionId.length > 200) return error('A valid connection id is required.', 400);
      const accountId = await accountIdFor(user!.userId);
      await removeSubscription('client_account', accountId, connectionId);
      return json({ ok: true });
    },
  ],
  'GET /api/admin/client-accounts': [
    requireAuth(),
    withScopes('email'),
    requireAdminEmailAllowlist(ADMIN_EMAILS),
    async ({ query }) => {
      const requested = Number(query.limit);
      const limit = Number.isFinite(requested) ? Math.min(50, Math.max(1, Math.floor(requested))) : 25;
      const page = await db.list<ClientAccount>('client_accounts', { limit, nextToken: query.nextToken || undefined });
      return json({ accounts: page.items, nextToken: page.nextToken || null }, 200);
    },
  ],
  'POST /api/admin/client-accounts/:id/action': [
    requireAuth(),
    withScopes('email'),
    requireAdminEmailAllowlist(ADMIN_EMAILS),
    async ({ body, params }) => handleAdminAction(params.id, body),
  ],
};
