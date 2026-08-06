import { TRPCError } from "@trpc/server";

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();

let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

export type RateLimitOpts = {
  limit: number;
  windowMs: number;
  message?: string;
};

/**
 * In-memory sliding-window rate limiter keyed by `key`.
 * Suitable for single-instance/self-hosted deployments.
 */
export function rateLimit(
  key: string,
  { limit, windowMs }: RateLimitOpts,
): { ok: true } | { ok: false; retryAfterMs: number } {
  const now = Date.now();
  sweep(now);

  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterMs: bucket.resetAt - now };
  }

  bucket.count += 1;
  return { ok: true };
}

export function throwIfRateLimited(key: string, opts: RateLimitOpts) {
  const result = rateLimit(key, opts);
  if (!result.ok) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message:
        opts.message ??
        "Too many requests. Please slow down and try again in a moment.",
    });
  }
}

export function getClientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() ?? "unknown";
  return headers.get("x-real-ip") ?? "unknown";
}
