import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import { randomUUID } from "crypto";
import { existsSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";
import { doubleCsrf } from "csrf-csrf";
import { isIP } from "net";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { rateLimitMiddleware } from "./middlewares/rate-limit.js";
import { getQueueStats } from "./lib/order-queue.js";
import { erpFetch, getErpUrl, getErpHeaders, sanitizeErpFilePath } from "./lib/erpnext-client.js";
import { getPurposeSecret } from "./lib/session-signer.js";

const app: Express = express();

// ── Trust proxy ──────────────────────────────────────────────────────────────
// Never trust a random `X-Forwarded-For`. Only honour forwarded headers when
// the immediate peer is one of the `TRUSTED_PROXIES` (IPs or CIDR ranges,
// comma-separated). Behind nginx this must be `127.0.0.1`. Without this, any
// client that can reach the backend directly can spoof XFF and bypass both
// rate limiting and the CSRF IP fallback.
function ipToBytes(ip: string): Buffer | null {
  if (isIP(ip) === 4) {
    return Buffer.from(ip.split(".").map((octet) => Number(octet)));
  }
  if (isIP(ip) === 6) {
    const doubleColon = ip.indexOf("::");
    let head: string[] = [];
    let tail: string[] = [];
    if (doubleColon !== -1) {
      const left = ip.slice(0, doubleColon);
      const right = ip.slice(doubleColon + 2);
      head = left ? left.split(":") : [];
      tail = right ? right.split(":") : [];
    } else {
      head = ip.split(":");
    }
    const parseGroup = (group: string): Buffer | null => {
      if (group === "") return null;
      const value = parseInt(group, 16);
      if (Number.isNaN(value) || value < 0 || value > 0xffff) return null;
      const buf = Buffer.alloc(2);
      buf.writeUInt16BE(value);
      return buf;
    };
    const headBuf = head.map(parseGroup);
    const tailBuf = tail.map(parseGroup);
    if (headBuf.includes(null) || tailBuf.includes(null)) return null;
    const missing = 8 - headBuf.length - tailBuf.length;
    if (missing < 0) return null;
    return Buffer.concat([...(headBuf as Buffer[]), Buffer.alloc(2 * missing), ...(tailBuf as Buffer[])]);
  }
  return null;
}

function ipInCidr(cidr: string, ip: string): boolean {
  const [range, bitsRaw] = cidr.split("/").map((part) => part.trim());
  if (!range) return false;
  const ver = isIP(range);
  if (ver === 0) return false;
  const bits =
    bitsRaw !== undefined
      ? Number(bitsRaw)
      : ver === 4 ? 32 : 128;
  if (!Number.isInteger(bits)) return false;
  const a = ipToBytes(range);
  const b = ipToBytes(ip);
  if (!a || !b || a.length !== b.length) return false;
  const maxBits = a.length * 8;
  const n = Math.min(bits, maxBits);
  const fullBytes = n >> 3;
  const rem = n & 7;
  for (let i = 0; i < fullBytes; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  if (rem > 0) {
    const mask = 0xff << (8 - rem);
    if ((a[fullBytes] & mask) !== (b[fullBytes] & mask)) return false;
  }
  return true;
}

const trustedProxies = (process.env["TRUSTED_PROXIES"] ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

if (trustedProxies.length > 0) {
  app.set("trust proxy", (ip: string): boolean =>
    trustedProxies.some((rule) => rule === ip || ipInCidr(rule, ip)),
  );
  logger.info({ trustedProxies }, "trust proxy: restricted to configured proxies");
} else {
  logger.warn(
    "TRUSTED_PROXIES is not set — trusting a single proxy hop. Set TRUSTED_PROXIES=127.0.0.1 (nginx) in production.",
  );
  app.set("trust proxy", 1);
}

// Request ID Middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const reqId = (req.headers["x-request-id"] as string) || randomUUID();
  req.headers["x-request-id"] = reqId;
  res.setHeader("x-request-id", reqId);
  next();
});

// ====================== SECURITY MIDDLEWARES ======================

// 1. Helmet — Security Headers (XSS, Clickjacking, HSTS, etc.)
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
scriptSrc: ["'self'", "https://static.cloudflareinsights.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        imgSrc: ["'self'", "data:", "https:"],
         connectSrc: ["'self'", "https://cloudflareinsights.com"],
        frameAncestors: ["'none'"],
         upgradeInsecureRequests: null, 
      },
    },
    hsts: process.env.NODE_ENV === "production" ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

// 2. CORS — Strict Configuration
const configuredOrigins = [
  ...(process.env["FRONTEND_ORIGIN"] ? process.env["FRONTEND_ORIGIN"].split(",") : []),
  ...(process.env["FRONTEND_URL"] ? process.env["FRONTEND_URL"].split(",") : []),
]
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set([
    ...configuredOrigins,
    "http://localhost:5173",
    "http://localhost:8080",
    "https://testing.oxigen.com.pk"
  ])
);

const isAllowedOrigin = (origin: string | undefined) => {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-CSRF-Token",
    ],
    maxAge: 86400, // 24 hours preflight cache
  })
);

// 3. Request Logging with Sensitive Data Redaction
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.headers["x-request-id"],
          method: req.method,
          url: req.url?.split("?")[0],
          ip: req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown",
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
    redact: [
      "req.headers.authorization",
      "req.body.password",
      "req.body.pwd",
      "req.body.token",
      "req.body.secret",
      "req.body.new_password",
      "req.body.old_password",
    ],
  })
);

// 4. Body Parser with Size Limits (protection against large payload attacks)
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// 5. Cookie Parser with secure defaults
app.use(cookieParser());

// ====================== CSRF PROTECTION ======================
// Only set the Secure flag when the frontend is served over HTTPS.
// When running locally over HTTP the browser would silently drop a
// Secure cookie, making every CSRF-protected request fail with 403.
const csrfCookieSecure =
  (process.env["FRONTEND_ORIGIN"] ?? "").startsWith("https://") ||
  (process.env["FRONTEND_URL"] ?? "").startsWith("https://");

const {
  generateCsrfToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => getPurposeSecret("csrf"),
  getSessionIdentifier: (req) =>
    // Use the ERPNext session cookie as the stable session identifier.
    // For unauthenticated requests (signup, contact) fall back to IP.
    req.headers["cookie"]?.match(/sid=([^;]+)/)?.[1] ||
    req.socket.remoteAddress ||
    "unknown",
  cookieName: "__oxigen-csrf",
  cookieOptions: {
    sameSite: "lax",
    secure: csrfCookieSecure,
    httpOnly: true,
    path: "/",
  },
  size: 64,
});

// Expose CSRF token endpoint (unguarded — called before login)
app.get("/api/csrf-token", (req: Request, res: Response) => {
  res.json({ csrfToken: generateCsrfToken(req, res) });
});

// CSRF middleware — protects all state-changing routes except webhooks (non-browser)
app.use((req: Request, res: Response, next: NextFunction) => {
  if (
    req.method === "GET" ||
    req.path === "/health" ||
    req.path.startsWith("/api/auth/login") ||
    req.path.startsWith("/api/auth/signup") ||
    req.path.startsWith("/api/webhooks") ||
    req.path.startsWith("/api/admin/notifications") ||
    req.path.startsWith("/api/notifications")
  ) {
    next();
    return;
  }
  doubleCsrfProtection(req, res, next);
});

// 6. General Rate Limiting
app.use(rateLimitMiddleware);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const frontendDistPath = resolve(__dirname, "../..", "frontend", "dist");
const frontendIndexPath = resolve(frontendDistPath, "index.html");
const hasFrontendDist = existsSync(frontendDistPath) && existsSync(frontendIndexPath);
// Serve frontend when explicitly enabled, or by default in production when the
// built `frontend/dist` is present. This helps avoid accidental 404s when the
// process environment isn't wired but the static build exists.
const serveFrontend = (process.env["SERVE_FRONTEND"] === "true") || (process.env["NODE_ENV"] === "production" && hasFrontendDist);

if (serveFrontend && hasFrontendDist) {
  app.use(express.static(frontendDistPath, { index: false }));
}
// Log what the server decided for serving the frontend (useful for debugging)
logger.info({ serveFrontend, hasFrontendDist, frontendDistPath }, "frontend: serve status");
logger.info({ rawServeEnv: process.env["SERVE_FRONTEND"], nodeEnv: process.env["NODE_ENV"] }, "frontend: env debug");

// ====================== ERPNEXT FILE / IMAGE PROXY ======================
app.get(["/files/*", "/private/files/*", "/api/files/*", "/api/private/files/*"], async (req: Request, res: Response) => {
  try {
    let targetPath = req.originalUrl || req.url;
    if (targetPath.startsWith("/api/files/")) {
      targetPath = targetPath.replace("/api/files/", "/files/");
    } else if (targetPath.startsWith("/api/private/files/")) {
      targetPath = targetPath.replace("/api/private/files/", "/private/files/");
    }

    // Reject traversal so the file proxy can never reach arbitrary ERPNext
    // API endpoints with the server API-key credentials.
    const safePath = sanitizeErpFilePath(targetPath);
    if (!safePath) {
      res.status(400).send("Invalid file path.");
      return;
    }

    let erpUrl = getErpUrl(safePath);
    let erpRes = await erpFetch(erpUrl, {
      headers: getErpHeaders(),
    });

    // Fallback: If 403 / 404 and safePath was /private/files/, try public /files/ (or vice-versa)
    if (!erpRes.ok && safePath.includes("/private/files/")) {
      const fallbackSafe = sanitizeErpFilePath(safePath.replace("/private/files/", "/files/"));
      if (fallbackSafe) {
        const fallbackRes = await erpFetch(getErpUrl(fallbackSafe), {
          headers: getErpHeaders(),
        });
        if (fallbackRes.ok) {
          erpRes = fallbackRes;
        }
      }
    } else if (!erpRes.ok && safePath.includes("/files/")) {
      const fallbackSafe = sanitizeErpFilePath(safePath.replace("/files/", "/private/files/"));
      if (fallbackSafe) {
        const fallbackRes = await erpFetch(getErpUrl(fallbackSafe), {
          headers: getErpHeaders(),
        });
        if (fallbackRes.ok) {
          erpRes = fallbackRes;
        }
      }
    }

    if (!erpRes.ok) {
      res.status(erpRes.status).send("File not found in ERPNext.");
      return;
    }

    const contentType = erpRes.headers.get("content-type");
    if (contentType) {
      res.setHeader("Content-Type", contentType);
    }
    const contentLength = erpRes.headers.get("content-length");
    if (contentLength) {
      res.setHeader("Content-Length", contentLength);
    }
    const cacheControl = erpRes.headers.get("cache-control");
    res.setHeader("Cache-Control", cacheControl || "public, max-age=86400");

    const arrayBuffer = await erpRes.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    logger.error({ err, path: req.url }, "[files proxy error]");
    res.status(500).send("Error fetching file from ERPNext.");
  }
});

// ====================== ROUTES ======================
app.use("/api", router);

if (serveFrontend && hasFrontendDist) {
  app.get("/*", (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/health") || req.path.startsWith("/files") || req.path.startsWith("/private/files")) {
      next();
      return;
    }
    res.sendFile(frontendIndexPath);
  });
}

// ====================== HEALTH CHECK ======================
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    queue: getQueueStats(),
  });
});

// ====================== GLOBAL ERROR HANDLER ======================
app.use((err: Error & { statusCode?: number; status?: number }, req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err, reqId: req.headers["x-request-id"] }, "Unhandled error occurred");

  const statusCode = (err as { statusCode?: number }).statusCode
    || (err as { status?: number }).status
    || 500;

  res.status(statusCode).json({
    success: false,
    message:
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : err.message || "Something went wrong",
    ...(process.env["DEBUG"] === "true" && { stack: err.stack }),
  });
});

export default app;
