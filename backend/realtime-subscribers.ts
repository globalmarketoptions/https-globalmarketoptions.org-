import { db, ws } from '@appdeploy/sdk';

type Subscription = {
  id: string;
  entity_type: string;
  entity_id: string;
  connection_id: string;
  created_at: number;
};

async function listSubscriptions(): Promise<Subscription[]> {
  const page = await db.list<Subscription>('entity_subscriptions', { limit: 1000 });
  return page.items;
}

export async function addSubscription(entityType: string, entityId: string, connectionId: string) {
  const [id] = await db.add('entity_subscriptions', [{
    entity_type: entityType,
    entity_id: entityId,
    connection_id: connectionId,
    created_at: Date.now(),
  }]);
  if (!id) throw new Error('Could not save realtime subscription.');
}

export async function removeSubscription(entityType: string, entityId: string, connectionId: string) {
  const subscriptions = await listSubscriptions();
  const ids = subscriptions
    .filter(item => item.entity_type === entityType && item.entity_id === entityId && item.connection_id === connectionId)
    .map(item => item.id);
  if (ids.length) await db.delete('entity_subscriptions', ids);
}

export async function removeSubscriptionsByConnection(connectionId: string) {
  const subscriptions = await listSubscriptions();
  const ids = subscriptions.filter(item => item.connection_id === connectionId).map(item => item.id);
  if (ids.length) await db.delete('entity_subscriptions', ids);
}

export async function notifySubscribers(entityType: string, entityId: string, data: unknown) {
  const subscriptions = await listSubscriptions();
  const ids = Array.from(new Set(subscriptions
    .filter(item => item.entity_type === entityType && item.entity_id === entityId)
    .map(item => item.connection_id)));
  if (!ids.length) return;
  const result = await ws.send(ids, {
    v: 1,
    type: 'entity.update',
    payload: { entity_type: entityType, entity_id: entityId, data },
  });
  if (!result.ok) throw new Error(result.error || 'Realtime delivery failed.');
}
