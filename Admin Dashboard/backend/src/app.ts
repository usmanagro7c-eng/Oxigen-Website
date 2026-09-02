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
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { rateLimitMiddleware } from "./middlewares/rate-limit.js";
import { getQueueStats } from "./lib/order-queue.js";
import { erpFetch, getErpUrl, getErpHeaders } from "./lib/erpnext-client.js";

const app: Express = express();
app.set('trust proxy', 1);

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

// 2. CORS — Configuration
const configuredOrigins = [
  ...(process.env["FRONTEND_ORIGIN"] ? process.env["FRONTEND_ORIGIN"].split(",") : []),
  ...(process.env["FRONTEND_URL"] ? process.env["FRONTEND_URL"].split(",") : []),
]
  .map((value) => value.trim())
  .filter(Boolean);

const allowedOrigins = Array.from(
  new Set([
    ...configuredOrigins,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "http://192.168.90.113:8080",
    "https://testing.oxigen.com.pk",
  ])
);

const isAllowedOrigin = (origin: string | undefined) => {
  if (!origin) return true;
  if (allowedOrigins.includes(origin)) return true;
  if (
    process.env.NODE_ENV !== "production" &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  ) {
    return true;
  }
  return false;
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
      "x-request-id",
    ],
    exposedHeaders: ["Set-Cookie", "x-request-id"],
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
  getSecret: () => process.env["WEBHOOK_SECRET"] ?? "csrf-secret",
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
    req.path.startsWith("/api/admin/notifications")
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

    const erpUrl = getErpUrl(targetPath);
    const erpRes = await erpFetch(erpUrl, {
      headers: getErpHeaders(),
    });

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
    ...(process.env.NODE_ENV !== "production" && { stack: err.stack }),
  });
});

export default app;
