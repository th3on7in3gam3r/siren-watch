export type StoredPushSubscription = {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

const ENDPOINTS_KEY = "push:endpoints";

function hasKvEnv(): boolean {
  return Boolean(
    process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN
  );
}

function memoryStore(): Map<string, StoredPushSubscription> {
  const g = globalThis as typeof globalThis & {
    __sirenPushSubs?: Map<string, StoredPushSubscription>;
  };
  if (!g.__sirenPushSubs) {
    g.__sirenPushSubs = new Map();
  }
  return g.__sirenPushSubs;
}

async function kv() {
  const { kv: client } = await import("@vercel/kv");
  return client;
}

function subscriptionKey(endpoint: string): string {
  return `push:sub:${endpoint}`;
}

export async function savePushSubscription(
  subscription: StoredPushSubscription
): Promise<void> {
  if (hasKvEnv()) {
    const client = await kv();
    await client.set(subscriptionKey(subscription.endpoint), subscription);
    await client.sadd(ENDPOINTS_KEY, subscription.endpoint);
    return;
  }
  memoryStore().set(subscription.endpoint, subscription);
}

export async function removePushSubscription(endpoint: string): Promise<void> {
  if (hasKvEnv()) {
    const client = await kv();
    await client.del(subscriptionKey(endpoint));
    await client.srem(ENDPOINTS_KEY, endpoint);
    return;
  }
  memoryStore().delete(endpoint);
}

export async function listPushSubscriptions(): Promise<StoredPushSubscription[]> {
  if (hasKvEnv()) {
    const client = await kv();
    const endpoints = await client.smembers<string[]>(ENDPOINTS_KEY);
    if (!endpoints?.length) return [];
    const subs = await Promise.all(
      endpoints.map((endpoint) =>
        client.get<StoredPushSubscription>(subscriptionKey(endpoint))
      )
    );
    return subs.filter((sub): sub is StoredPushSubscription => Boolean(sub));
  }
  return Array.from(memoryStore().values());
}

export function pushStoreMode(): "kv" | "memory" {
  return hasKvEnv() ? "kv" : "memory";
}
