import { logger } from "../lib/logger.js";
import { pingErpNext } from "../lib/erpnext-client.js";
import { sendMail, buildOrderConfirmationEmail } from "../lib/mailer.js";
import { ErpAdapter } from "./erp-adapter.js";
import { authService } from "./auth.service.js";
import { authTokenService } from "./auth-token.service.js";
import emailService from "./email.service.js";

/**
 * Interface representing the queue storage and management.
 * This allows the processor to be decoupled from the persistence layer.
 */
export interface IQueueStore<T> {
  getDueJobs(now: Date): T[];
  saveQueue(): void;
  markProcessing(job: T): void;
  markCompleted(job: T, orderName: string): void;
  markFailed(job: T, error: string, isConnectivityError: boolean): void;
  checkAndAlertBacklog(): Promise<void>;
}

// Jobs the processor handles must identify their kind and carry a payload
// that is one of the known queue payloads (order or signup).
type ProcessorJob = {
  id: string;
  kind: "order" | "signup";
  payload: any;
  retryCount: number;
};

export class QueueProcessor<T extends ProcessorJob> {
  private isProcessing = false;
  private circuitState: "CLOSED" | "OPEN" | "HALF_OPEN" = "CLOSED";
  private consecutiveFailures = 0;
  private openedAt: number | null = null;
  private readonly failureThreshold = 3;
  private readonly openTimeoutMs = 60_000;

  constructor(private store: IQueueStore<T>) {}

  async tick(): Promise<void> {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      void this.store.checkAndAlertBacklog();

      const reachable = await this.isErpNextReachable();
      if (!reachable) return;

      const due = this.store.getDueJobs(new Date());

      for (const job of due) {
        this.store.markProcessing(job);
        logger.info(
          { jobId: job.id, attempt: job.retryCount + 1 },
          "QueueProcessor: processing job"
        );

        try {
          // Route by job kind — an "order" places a Sales Order, a "signup"
          // creates the Frappe user and sends the set-password email once
          // ERPNext is reachable again.
          const completionRef = await this.processJob(job);
          this.recordSuccess();

          this.store.markCompleted(job, completionRef);
          logger.info(
            { jobId: job.id, kind: job.kind, ref: completionRef },
            "QueueProcessor: job completed successfully"
          );
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          const isConnectivityError =
            message.includes("fetch failed") ||
            message.includes("ECONNREFUSED") ||
            message.includes("ETIMEDOUT") ||
            message.includes("AbortError") ||
            message.includes("ERPNext responded with 5");

          if (isConnectivityError) this.recordFailure();
          this.store.markFailed(job, message, isConnectivityError);
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async isErpNextReachable(): Promise<boolean> {
    if (this.circuitState === "CLOSED") return true;
    if (this.circuitState === "OPEN") {
      const elapsed = Date.now() - (this.openedAt ?? 0);
      if (elapsed < this.openTimeoutMs) return false;
      this.circuitState = "HALF_OPEN";
      logger.info("QueueProcessor: circuit HALF_OPEN — probing ERPNext");
    }
    const alive = await pingErpNext();
    if (alive) {
      this.recordSuccess();
      return true;
    }
    this.circuitState = "OPEN";
    this.openedAt = Date.now();
    logger.warn("QueueProcessor: probe failed — circuit back to OPEN");
    return false;
  }

  private recordSuccess(): void {
    this.consecutiveFailures = 0;
    if (this.circuitState !== "CLOSED") {
      this.circuitState = "CLOSED";
      this.openedAt = null;
      logger.info("QueueProcessor: circuit breaker CLOSED — ERPNext is healthy");
    }
  }

  private recordFailure(): void {
    this.consecutiveFailures += 1;
    if (this.circuitState === "CLOSED" && this.consecutiveFailures >= this.failureThreshold) {
      this.circuitState = "OPEN";
      this.openedAt = Date.now();
      logger.warn(
        { failures: this.consecutiveFailures },
        "QueueProcessor: circuit breaker OPEN — ERPNext appears down"
      );
    }
  }

  private async processJob(job: T): Promise<string> {
    if (job.kind === "order") {
      const orderName = await ErpAdapter.createErpOrder(job.payload);
      void sendMail({
        to: job.payload.email,
        subject: `Order Confirmed — OXIGEN (${orderName})`,
        html: buildOrderConfirmationEmail(job.payload, orderName),
        erp: { referenceDoctype: "Sales Order", referenceName: orderName },
      }).catch((err) =>
        logger.error({ err }, "Failed to send order confirmation email")
      );
      return orderName;
    } else if (job.kind === "signup") {
      const p = job.payload;
      // Create the Frappe user now that ERPNext is reachable.
      const created = await authService.createUser(p.email, p.firstName, p.lastName, p.mobileNo);
      if (!created.success) throw new Error(created.error || "Failed to create user.");

      // Generate a set-password token and email the user the link.
      const rawToken = authTokenService.generateToken(p.email, 24 * 60 * 60 * 1000);
      if (!rawToken) throw new Error("Failed to generate password token.");

      const frontendUrl = (process.env["FRONTEND_URL"] ?? "http://localhost:5173").replace(/\/$/, "");
      const setPasswordUrl = `${frontendUrl}/set-password?token=${rawToken}&email=${encodeURIComponent(p.email)}`;
      const fullName = p.fullName ?? [p.firstName, p.lastName].filter(Boolean).join(" ");
      await emailService.sendSetPasswordEmail(p.email, fullName || p.firstName, setPasswordUrl);

      logger.info({ email: p.email }, "QueueProcessor: pending signup completed");
      return "SIGNUP_COMPLETED";
    }
    throw new Error(`Unknown job kind: ${job.kind}`);
  }

  getCircuitStatus() {
    return {
      state: this.circuitState,
      consecutiveFailures: this.consecutiveFailures,
    };
  }

  getIsProcessing(): boolean {
    return this.isProcessing;
  }
}
