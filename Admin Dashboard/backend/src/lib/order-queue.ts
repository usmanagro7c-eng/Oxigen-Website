/**
 * order-queue.ts
 *
 * Lightweight persistent order queue with exponential-backoff retry.
 * Refactored to delegate ERPNext and processing logic to services.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";
import { sendMail } from "./mailer.js";
import { QueueProcessor, IQueueStore } from "../services/queue-processor.js";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../../data");
const QUEUE_FILE = resolve(DATA_DIR, "order-queue.json");
const DLQ_FILE = resolve(DATA_DIR, "order-dlq.json");
const COMPLETED_FILE = resolve(DATA_DIR, "order-completed.json");

const RETRY_DELAYS_MS = [
  1 * 60 * 1000,   // 1 min
  5 * 60 * 1000,   // 5 min
  15 * 60 * 1000,  // 15 min
  60 * 60 * 1000,  // 1 h
];

const MAX_RETRIES = RETRY_DELAYS_MS.length;

const parsedMaxQueueSize = Number.parseInt(process.env.MAX_QUEUE_SIZE ?? "100", 10);
const MAX_QUEUE_SIZE = Number.isFinite(parsedMaxQueueSize) && parsedMaxQueueSize >= 1 ? parsedMaxQueueSize : 100;

const ALERT_THRESHOLD = 20;
const ALERT_COOLDOWN_MS = 30 * 60 * 1000;

let _lastAlertAt: number | null = null;

export class QueueFullError extends Error {
  constructor(size: number) {
    super(`Order queue is full (${size}/${MAX_QUEUE_SIZE} jobs). ERPNext may be down. Please try again in a few minutes.`);
    this.name = "QueueFullError";
  }
}

const TICK_INTERVAL_MS = 10_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type OrderJobStatus = "pending" | "processing" | "dead" | "completed";

export interface OrderJobPayload {
  email: string;
  items: { item_code: string; qty: number }[];
  delivery_date?: string;
  addressName?: string;
  shippingAddress?: {
    address_line1: string;
    address_line2?: string;
    city: string;
    state?: string;
    country: string;
    pincode?: string;
    phone?: string;
  };
  setAsDefault?: boolean;
  defaultWarehouse: string;
  defaultCompany: string;
}

export interface SignupJobPayload {
  email: string;
  firstName: string;
  lastName?: string;
  mobileNo?: string;
  /** Full name derived for the set-password email greeting */
  fullName?: string;
}

/** Union of every job payload the queue can carry. */
export type QueueJobPayload = OrderJobPayload | SignupJobPayload;

export interface OrderJob {
  id: string;
  status: OrderJobStatus;
  kind: "order" | "signup";
  payload: QueueJobPayload;
  retryCount: number;
  nextAttemptAt: string;
  createdAt: string;
  lastError?: string;
  orderName?: string;
}

// ---------------------------------------------------------------------------
// Persistence
// ---------------------------------------------------------------------------

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonArray<T>(filePath: string): T[] {
  ensureDataDir();
  if (!existsSync(filePath)) return [];
  try {
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T[];
  } catch {
    logger.warn({ filePath }, "order-queue: could not parse json file");
    return [];
  }
}

function loadQueue(): OrderJob[] {
  return readJsonArray<OrderJob>(QUEUE_FILE);
}

function saveQueue(jobs: OrderJob[]): void {
  ensureDataDir();
  const tmp = QUEUE_FILE + ".tmp";
  writeFileSync(tmp, JSON.stringify(jobs, null, 2), "utf-8");
  renameSync(tmp, QUEUE_FILE);
}

// ---------------------------------------------------------------------------
// Store Implementation
// ---------------------------------------------------------------------------

class OrderQueueStore implements IQueueStore<OrderJob> {
  getDueJobs(now: Date): OrderJob[] {
    return _queue.filter(
      (j) => j.status === "pending" && new Date(j.nextAttemptAt) <= now
    );
  }

  saveQueue(): void {
    saveQueue(_queue);
  }

  markProcessing(job: OrderJob): void {
    job.status = "processing";
    this.saveQueue();
  }

  markCompleted(job: OrderJob, orderName: string): void {
    job.orderName = orderName;
    this.appendCompleted(job, orderName);
    _queue = _queue.filter((j) => j.id !== job.id);
    this.saveQueue();
  }

  markFailed(job: OrderJob, error: string): void {
    job.retryCount += 1;
    job.lastError = error;

    if (job.retryCount >= MAX_RETRIES) {
      job.status = "dead";
      this.appendDlq(job);
      _queue = _queue.filter((j) => j.id !== job.id);
    } else {
      const delayMs = RETRY_DELAYS_MS[job.retryCount - 1] ?? RETRY_DELAYS_MS[RETRY_DELAYS_MS.length - 1];
      job.nextAttemptAt = new Date(Date.now() + delayMs).toISOString();
      job.status = "pending";
    }
    this.saveQueue();
  }

  async checkAndAlertBacklog(): Promise<void> {
    const pending = _queue.filter((j) => j.status === "pending").length;
    if (pending < ALERT_THRESHOLD) return;

    const now = Date.now();
    if (_lastAlertAt && now - _lastAlertAt < ALERT_COOLDOWN_MS) return;
    _lastAlertAt = now;

    const adminEmail = process.env["ADMIN_EMAIL"];
    if (!adminEmail) return;

    const capPercent = Math.round((pending / MAX_QUEUE_SIZE) * 100);
    const frontendUrl = (process.env["FRONTEND_URL"] ?? "http://localhost:5173").replace(/\/$/, "");
    const monitorUrl = `${frontendUrl}/admin/monitor`;

    const html = `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
        <h2 style="color:#dc2626;margin:0 0 12px;">Queue Backlog Alert</h2>
        <p style="color:#374151;margin:0 0 20px;">
          OXIGEN order queue mein <strong>${pending} pending orders</strong> hain
          (${capPercent}% of ${MAX_QUEUE_SIZE} max capacity).
          ERPNext down ya slow ho sakta hai.
        </p>
        <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
          <tr style="background:#f3f4f6;">
            <td style="padding:8px 12px;font-size:13px;color:#6b7280;">Pending Jobs</td>
            <td style="padding:8px 12px;font-size:13px;font-weight:600;color:#dc2626;">${pending}</td>
          </tr>
          <tr>
            <td style="padding:8px 12px;font-size:13px;color:#6b7280;">Queue Capacity</td>
            <td style="padding:8px 12px;font-size:13px;font-weight:600;">${capPercent}% (${pending}/${MAX_QUEUE_SIZE})</td>
          </tr>
          <tr style="background:#f3f4f6;">
            <td style="padding:8px 12px;font-size:13px;color:#6b7280;">Time</td>
            <td style="padding:8px 12px;font-size:13px;">${new Date().toLocaleString()}</td>
          </tr>
        </table>
        <a href="${monitorUrl}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">
          Admin Monitor Kholain
        </a>
      </div>`;

    try {
      await sendMail({
        to: adminEmail,
        subject: `OXIGEN Queue Alert: ${pending} orders pending (${capPercent}% full)`,
        html,
      });
      logger.warn({ pendingJobs: pending, capPercent, adminEmail }, "order-queue: backlog alert email sent");
    } catch (mailErr) {
      logger.error({ mailErr }, "order-queue: failed to send backlog alert email");
    }
  }

  private appendCompleted(job: OrderJob, orderName: string): void {
    const existing = readJsonArray<OrderJob>(COMPLETED_FILE);
    const completedJob: OrderJob = {
      ...job,
      status: "completed",
      orderName,
      lastError: undefined,
    };
    const withoutSameJob = existing.filter((j) => j.id !== job.id);
    withoutSameJob.push(completedJob);
    const pruned = withoutSameJob.slice(-500);
    const tmpC = COMPLETED_FILE + ".tmp";
    writeFileSync(tmpC, JSON.stringify(pruned, null, 2), "utf-8");
    renameSync(tmpC, COMPLETED_FILE);
  }

  private appendDlq(job: OrderJob): void {
    const existing = readJsonArray<OrderJob>(DLQ_FILE);
    existing.push({ ...job, status: "dead" });
    const tmpD = DLQ_FILE + ".tmp";
    writeFileSync(tmpD, JSON.stringify(existing, null, 2), "utf-8");
    renameSync(tmpD, DLQ_FILE);
  }
}

// ---------------------------------------------------------------------------
// Queue State & Processor Instance
// ---------------------------------------------------------------------------

let _queue: OrderJob[] = loadQueue().map((j) =>
  j.status === "processing" ? { ...j, status: "pending" as OrderJobStatus } : j
);
saveQueue(_queue);

const _store = new OrderQueueStore();
const _processor = new QueueProcessor(_store);
let _processorTimer: ReturnType<typeof setInterval> | null = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function enqueueOrder(idempotencyKey: string, payload: OrderJobPayload): string {
  return enqueueJob(idempotencyKey, "order", payload);
}

/**
 * Enqueue a pending signup that could not be processed because ERPNext was
 * temporarily unreachable. The queue processor completes it (Frappe user +
 * password-set email) once ERPNext is back online.
 */
export function enqueueSignup(idempotencyKey: string, payload: SignupJobPayload): string {
  return enqueueJob(idempotencyKey, "signup", payload);
}

function enqueueJob(idempotencyKey: string, kind: "order" | "signup", payload: QueueJobPayload): string {
  const existing = _queue.find((j) => j.id === idempotencyKey && j.status !== "dead");
  if (existing) return existing.id;

  const activeCount = _queue.filter((j) => j.status === "pending" || j.status === "processing").length;
  if (activeCount >= MAX_QUEUE_SIZE) throw new QueueFullError(activeCount);

  const job: OrderJob = {
    id: idempotencyKey,
    kind,
    status: "pending",
    payload,
    retryCount: 0,
    nextAttemptAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  _queue.push(job);
  saveQueue(_queue);
  return job.id;
}

export function getJobStatus(jobId: string) {
  const job =
    loadQueue().find((j) => j.id === jobId) ??
    readJsonArray<OrderJob>(COMPLETED_FILE).find((j) => j.id === jobId) ??
    readJsonArray<OrderJob>(DLQ_FILE).find((j) => j.id === jobId);

  if (!job) return undefined;
  const { id, status, retryCount, lastError, orderName, nextAttemptAt, payload } = job;
  return { id, status, retryCount, lastError, orderName, nextAttemptAt, email: payload.email };
}

export function getQueueStats() {
  const activeJobs = loadQueue();
  const pending = activeJobs.filter((j) => j.status === "pending").length;
  const processing = activeJobs.filter((j) => j.status === "processing").length;
  return {
    pending,
    processing,
    dead: readJsonArray<OrderJob>(DLQ_FILE).length,
    completed: readJsonArray<OrderJob>(COMPLETED_FILE).length,
    total: pending + processing,
    circuit: _processor.getCircuitStatus(),
    backlogAlert: pending >= ALERT_THRESHOLD,
    queueCapPercent: Math.round(((pending + processing) / MAX_QUEUE_SIZE) * 100),
    maxQueueSize: MAX_QUEUE_SIZE,
    alertThreshold: ALERT_THRESHOLD,
  };
}

export function getCircuitState() {
  return _processor.getCircuitStatus();
}

export function getDlqJobs(): OrderJob[] { return readJsonArray<OrderJob>(DLQ_FILE); }
export function getCompletedJobs(): OrderJob[] { return readJsonArray<OrderJob>(COMPLETED_FILE); }
export function getPendingJobs(): OrderJob[] { return loadQueue().filter((j) => j.status === "pending"); }
export function getProcessingJobs(): OrderJob[] { return loadQueue().filter((j) => j.status === "processing"); }

export function retryDlqJobs(): number {
  const dlqJobs = readJsonArray<OrderJob>(DLQ_FILE);
  if (dlqJobs.length === 0) return 0;
  for (const job of dlqJobs) {
    if (!_queue.find((j) => j.id === job.id)) {
      _queue.push({ ...job, status: "pending", retryCount: 0, nextAttemptAt: new Date().toISOString(), lastError: undefined });
    }
  }
  saveQueue(_queue);
  const tmpR = DLQ_FILE + ".tmp";
  writeFileSync(tmpR, JSON.stringify([], null, 2), "utf-8");
  renameSync(tmpR, DLQ_FILE);
  return dlqJobs.length;
}

export function clearPendingQueue(): number {
  const count = _queue.filter((j) => j.status === "pending").length;
  _queue = _queue.filter((j) => j.status !== "pending");
  saveQueue(_queue);
  return count;
}

export function clearDlq(): number {
  const count = readJsonArray<OrderJob>(DLQ_FILE).length;
  writeFileSync(DLQ_FILE, JSON.stringify([]), "utf-8");
  return count;
}

export function clearCompleted(): number {
  const count = readJsonArray<OrderJob>(COMPLETED_FILE).length;
  writeFileSync(COMPLETED_FILE, JSON.stringify([]), "utf-8");
  return count;
}

export function startQueueProcessor(): void {
  if (_processorTimer) return;
  _processorTimer = setInterval(() => void _processor.tick(), TICK_INTERVAL_MS);
  void _processor.tick();
  logger.info("order-queue: processor started");
}

export async function stopQueueProcessor(): Promise<void> {
  if (_processorTimer) {
    clearInterval(_processorTimer);
    _processorTimer = null;
  }
  return new Promise((resolve) => {
    const waited = setInterval(() => {
      if (!_processor.getIsProcessing()) {
        clearInterval(waited);
        logger.info("order-queue: processor stopped");
        resolve();
      }
    }, 100);
    setTimeout(() => { clearInterval(waited); resolve(); }, 5000);
  });
}
