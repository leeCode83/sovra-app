import Redis from "ioredis";

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
export { redis };

interface FsmState {
  state: string;
  context: Record<string, unknown>;
}

export async function getState(type: string, id: string): Promise<FsmState | null> {
  const raw = await redis.get(`fsm:${type}:${id}`);
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

export async function setState(
  type: string,
  id: string,
  state: string,
  context: Record<string, unknown>,
  ttl?: number
): Promise<void> {
  const payload = JSON.stringify({ state, context });
  if (ttl) await redis.setex(`fsm:${type}:${id}`, ttl, payload);
  else await redis.set(`fsm:${type}:${id}`, payload);
}

export async function transition(
  type: string,
  id: string,
  nextState: string,
  contextPatch: Record<string, unknown>,
  ttl?: number
): Promise<void> {
  const current = await getState(type, id);
  const context = { ...(current?.context ?? {}), ...contextPatch };
  await setState(type, id, nextState, context, ttl);
}