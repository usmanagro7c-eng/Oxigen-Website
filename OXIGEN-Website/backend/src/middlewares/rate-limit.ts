import type { Request, Response, NextFunction } from "express";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Different limits for different route types
const isDev = process.env.NODE_ENV === "development";

const LIMITS = {
  login:          isDev ? { max: 100, windowMs: 15 * 60 * 1000 } : { max: 10, windowMs: 15 * 60 * 1000 },
  signup:         isDev ? { max: 50,  windowMs: 60 * 60 * 1000 } : { max: 5,  windowMs: 60 * 60 * 1000 },
  forgotPassword: isDev ? { max: 20,  windowMs: 60 * 60 * 1000 } : { max: 5,  windowMs: 60 * 60 * 1000 },
  resetPassword:  isDev ? { max: 20,  windowMs: 60 * 60 * 1000 } : { max: 5,  windowMs: 60 * 60 * 1000 },
  setPassword:    isDev ? { max: 50,  windowMs: 60 * 60 * 1000 } : { max: 10, windowMs: 60 * 60 * 1000 },
  changePassword: isDev ? { max: 20,  windowMs: 15 * 60 * 1000 } : { max: 5,  windowMs: 15 * 60 * 1000 },
  contact:        isDev ? { max: 50,  windowMs: 60 * 60 * 1000 } : { max: 5,  windowMs: 60 * 60 * 1000 },
  order:          isDev ? { max: 100, windowMs: 15 * 60 * 1000 } : { max: 10, windowMs: 15 * 60 * 1000 },
  default:        isDev ? { max: 1000, windowMs: 60 * 1000 }     : { max: 100, windowMs: 60 * 1000 },
} as const;

// Cleanup old entries every 30 minutes to prevent memory leak
const cleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 30 * 60 * 1000);
cleanupTimer.unref();

function incrementBucket(key: string, max: number, windowMs: number, now: number): boolean {
  const entry = store.get(key);
  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count += 1;
  return entry.count > max;
}

export function createRateLimiter(type: keyof typeof LIMITS) {
  const { max, windowMs } = LIMITS[type];

  const reject = (res: Response) => {
    const retryAfterSec = Math.ceil(windowMs / 1000);
    res.setHeader("Retry-After", String(retryAfterSec));
    res.status(429).json({
      error: "Too many attempts. Please try again later.",
    });
  };

  return function rateLimitHandler(
    req: Request,
    res: Response,
    next: NextFunction
  ): void {
    // Per-IP bucket is always enforced — a client-supplied email in the body
    // can change per request, so it must not be able to mint fresh buckets.
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const email = (
      (req.body as Record<string, string> | undefined)?.["email"] ??
      (req.body as Record<string, string> | undefined)?.["usr"] ??
      ""
    ).toLowerCase().trim();

    const now = Date.now();
    const ipKey = `${type}:${ip}`;

    if (incrementBucket(ipKey, max, windowMs, now)) {
      reject(res);
      return;
    }

    // Secondary per-account bucket (only when the client supplies an account
    // identifier) — adds precision without enabling a bypass.
    if (email && incrementBucket(`${ipKey}:${email}`, max, windowMs, now)) {
      reject(res);
      return;
    }

    next();
  };
}

// General rate limiter — applied globally in app.ts
// General rate limiter — applied globally except SSE endpoint
export const rateLimitMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // SSE connections are long-lived — do not apply rate limiting
  if (
    req.path === "/webhooks/events" ||
    req.path.startsWith("/webhooks/events") ||
    req.path.startsWith("/api/webhooks/events") ||
    req.path.startsWith("/admin/notifications/stream") ||
    req.path.startsWith("/api/admin/notifications/stream")
  ) {
    next();
    return;
  }
  createRateLimiter("default")(req, res, next);
};