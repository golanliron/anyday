// A small fixed-window rate limiter, in process memory.
//
// HONESTY FIRST: this is a seatbelt, not a wall. The map lives inside one
// serverless instance — a cold start empties it, and parallel instances each
// count on their own. What it reliably stops is the cheap version of abuse:
// a loop hammering an AI route on one warm instance, a script probing
// /api/connect, a tab stuck in retry. Anything stronger (per-org quotas that
// survive restarts, billing-grade metering) needs shared storage and is a
// deliberate later step — do not "upgrade" this quietly into that.
//
// Why fixed-window: it is the simplest shape that answers the one question
// these routes ask — "has this key called too often just now?" — and its
// worst-case burst (2x at a window boundary) is acceptable for every limit
// we set with it.

interface Window { count: number; resetAt: number }

const windows = new Map<string, Window>();

/** Occasionally sweep expired windows so the map cannot grow without bound. */
let lastSweep = 0;
function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, w] of windows) if (w.resetAt <= now) windows.delete(k);
}

export interface RateVerdict {
  ok: boolean;
  /** Seconds until the window resets — for a Retry-After header. */
  retryAfterSec: number;
}

/**
 * Count one call for `key` inside `bucket` and say whether it is allowed.
 * `bucket` keeps routes from sharing each other's budgets ("chat", "connect").
 */
export function rateLimit(bucket: string, key: string, limit: number, windowMs: number): RateVerdict {
  const now = Date.now();
  sweep(now);
  const id = `${bucket}:${key}`;
  const w = windows.get(id);
  if (!w || w.resetAt <= now) {
    windows.set(id, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  w.count += 1;
  const retryAfterSec = Math.max(1, Math.ceil((w.resetAt - now) / 1000));
  return { ok: w.count <= limit, retryAfterSec };
}

/**
 * The caller's IP as Vercel reports it — for routes that have no org to key
 * on. Behind the proxy the first x-forwarded-for entry is the client.
 */
export function clientIp(req: { headers: { get(name: string): string | null } }): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

/** The standard refusal — one shape for every rate-limited route. */
export const RATE_LIMIT_MESSAGE = "יותר מדי קריאות ברצף. נסו שוב בעוד רגע.";
