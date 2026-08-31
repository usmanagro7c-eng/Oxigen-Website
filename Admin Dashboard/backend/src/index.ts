import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({
  path: resolve(__dirname, "../.env"),
});

// Validate critical environment variables at startup
const requiredEnv = [
  "PORT",
  "ERPNEXT_URL",
  "ERPNEXT_API_KEY",
  "ERPNEXT_API_SECRET",
  "FRONTEND_ORIGIN",
  "FRONTEND_URL",
  "WEBHOOK_SECRET",
];

for (const env of requiredEnv) {
  if (!process.env[env]) {
    throw new Error(`Missing required environment variable: ${env}`);
  }
}

const { default: app } = await import("./app.js");
const { logger } = await import("./lib/logger.js");
const { verifyMailer } = await import("./lib/mailer.js");
const { startQueueProcessor, stopQueueProcessor } = await import("./lib/order-queue.js");

const rawPort = process.env["PORT"];
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const server = app.listen(port, () => {
  logger.info(
    {
      port,
      env: process.env["NODE_ENV"] || "development",
      frontend: process.env["FRONTEND_ORIGIN"],
    },
    "Server started successfully"
  );
  // Verify ERPNext connectivity at startup
  void verifyMailer();
  // Start the order queue processor
  startQueueProcessor();
});

// Graceful Shutdown
const shutdown = (signal: string) => {
  logger.info({ signal }, "Received shutdown signal. Closing server...");
  server.close(async () => {
    await stopQueueProcessor();
    logger.info("All connections drained. Exiting.");
    process.exit(0);
  });

  // Force exit after 10s if server hangs
  setTimeout(() => {
    logger.error("Forced exit after timeout.");
    process.exit(1);
  }, 10_000);
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

process.on("uncaughtException", (err) => {
  logger.error({ err }, "Uncaught exception — shutting down");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error({ reason }, "Unhandled promise rejection — shutting down");
  process.exit(1);
});
