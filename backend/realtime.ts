import { removeSubscriptionsByConnection } from './realtime-subscribers';

type RealtimeEvent = {
  body?: string;
};

export async function realtime(event: RealtimeEvent) {
  let message: { type?: string; payload?: { connection_id?: string } } = {};
  try {
    message = JSON.parse(event.body || '{}') as typeof message;
  } catch {
    return { statusCode: 200 };
  }
  if (message.type === 'system.disconnected' && message.payload?.connection_id) {
    await removeSubscriptionsByConnection(message.payload.connection_id);
  }
  return { statusCode: 200 };
}
