import { logger } from "../lib/logger.js";
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import {
  getQueueStats,
  getCircuitState,
  getDlqJobs,
  getPendingJobs,
  getProcessingJobs,
  getCompletedJobs,
  clearPendingQueue,
  clearDlq,
  clearCompleted,
} from "../lib/order-queue.js";
import { pingErpNext, getErpUrl, getErpHeaders, erpFetch} from "../lib/erpnext-client.js";

// Middleware to add Request ID to response if missing (for debugging)
const attachRequestId = (req: Request, res: Response, next: NextFunction) => {
  if (!res.getHeader("x-request-id")) {
    res.setHeader("x-request-id", req.headers["x-request-id"] as string);
  }
  next();
};

type SalesOrderSummary = {
  name: string;
  customer?: string;
  customer_name?: string;
  status?: string;
  grand_total?: number;
  currency?: string;
  transaction_date?: string;
  modified?: string;
  owner?: string;
};

function normalizeStatus(status?: string): string {
  return (status ?? "").trim().toLowerCase();
}

function isCompletedSalesOrder(status?: string): boolean {
  return normalizeStatus(status) === "completed";
}

function isActiveProcessingSalesOrder(status?: string): boolean {
  const s = normalizeStatus(status);
  if (!s) return false;
  return s !== "completed" && s !== "cancelled" && s !== "closed" && s !== "draft";
}

async function fetchRecentSalesOrders(): Promise<SalesOrderSummary[]> {
  try {
    const params = new URLSearchParams({
      fields: JSON.stringify([
        "name",
        "customer",
        "customer_name",
        "status",
        "grand_total",
        "currency",
        "transaction_date",
        "modified",
        "owner",
      ]),
      limit_page_length: "100",
      order_by: "modified desc",
    });

    const erpRes = await erpFetch(
      getErpUrl(`/api/resource/Sales Order?${params.toString()}`),
      { headers: getErpHeaders() }
    );

    if (!erpRes.ok) return [];
    const data = (await erpRes.json()) as { data?: SalesOrderSummary[] };
    return data.data ?? [];
  } catch {
    return [];
  }
}

const router: IRouter = Router();

// ---------------------------------------------------------------------------
// GET /api/admin/monitor
// Returns system health + queue stats + ERPNext Sales Order status buckets.
// Important naming:
// - completedJobs/order-completed.json means queue submission completed only.
// - completedOrders means ERPNext Sales Order status is actually Completed.
// ---------------------------------------------------------------------------
router.get(
  "/admin/monitor",
  requireAuth,
  requireAdmin,
  attachRequestId,
  async (_req: Request, res: Response) => {
    const pingStart = Date.now();
    const erpAlive = await pingErpNext();
    const erpLatencyMs = Date.now() - pingStart;

    const queue = getQueueStats();
    const circuit = getCircuitState();

    const dlqJobs = getDlqJobs().slice(-20).reverse();

    const pendingJobs = getPendingJobs()
      .sort(
        (a, b) =>
          new Date(a.nextAttemptAt).getTime() -
          new Date(b.nextAttemptAt).getTime()
      )
      .slice(0, 20);

    const processingJobs = getProcessingJobs().slice(0, 20);

    // These are orders that were successfully submitted to ERPNext by the queue.
    // They are NOT business-completed orders yet.
    const submittedJobs = getCompletedJobs().slice(-20).reverse();

    const salesOrders = await fetchRecentSalesOrders();
    const processingOrders = salesOrders.filter((order) =>
      isActiveProcessingSalesOrder(order.status)
    );
    const completedOrders = salesOrders.filter((order) =>
      isCompletedSalesOrder(order.status)
    );

    res.json({
      timestamp: new Date().toISOString(),
      erpnext: {
        alive: erpAlive,
        latencyMs: erpLatencyMs,
      },
      queue: {
        pending: queue.pending,
        processing: queue.processing,
        dead: queue.dead,
        // Queue submitted count: Sales Order created/submitted in ERPNext.
        // Kept as completed for backward compatibility with old frontend.
        completed: queue.completed,
        submitted: queue.completed,
        // Business status buckets from ERPNext Sales Order status.
        erpProcessing: processingOrders.length,
        erpCompleted: completedOrders.length,
        total: queue.total,
        // Queue cap + backlog alert fields
        backlogAlert: queue.backlogAlert,
        queueCapPercent: queue.queueCapPercent,
        maxQueueSize: queue.maxQueueSize,
        alertThreshold: queue.alertThreshold,
      },
      circuit: {
        state: circuit.state,
        consecutiveFailures: circuit.consecutiveFailures,
      },
      dlq: dlqJobs,
      pendingJobs,
      processingJobs,
      submittedJobs,
      completedJobs: submittedJobs,
      salesOrders,
      processingOrders,
      completedOrders,
    });
  }
);

// ---------------------------------------------------------------------------
// POST /admin/monitor routes - attachRequestId
// ---------------------------------------------------------------------------
router.post(
  "/admin/monitor/retry-dlq",
  requireAuth,
  requireAdmin,
  attachRequestId,
  async (_req: Request, res: Response) => {
    const { retryDlqJobs } = await import("../lib/order-queue");
    const count = retryDlqJobs();
    res.json({ ok: true, retriedCount: count });
  }
);

router.post(
  "/admin/monitor/clear-pending",
  requireAuth,
  requireAdmin,
  attachRequestId,
  (_req: Request, res: Response) => {
    const count = clearPendingQueue();
    res.json({ ok: true, clearedCount: count });
  }
);

router.post(
  "/admin/monitor/clear-dlq",
  requireAuth,
  requireAdmin,
  attachRequestId,
  (_req: Request, res: Response) => {
    const count = clearDlq();
    res.json({ ok: true, clearedCount: count });
  }
);

router.post(
  "/admin/monitor/clear-completed",
  requireAuth,
  requireAdmin,
  attachRequestId,
  (_req: Request, res: Response) => {
    const count = clearCompleted();
    res.json({ ok: true, clearedCount: count });
  }
);


// ---------------------------------------------------------------------------
// GET /api/admin/inventory
// Returns all published Website Items with actual_qty, reserved_qty, available_qty
// from Bin doctype for the configured website_warehouse.
// ---------------------------------------------------------------------------
router.get(
  "/admin/inventory",
  requireAuth,
  requireAdmin,
  attachRequestId,
  async (_req: Request, res: Response) => {
    try {
      // 1. Fetch all published Website Items (item_code + website_warehouse)
      const itemParams = new URLSearchParams({
        fields: JSON.stringify(["item_code", "web_item_name", "item_name", "website_warehouse", "custom_stock_qty"]),
        filters: JSON.stringify([["published", "=", 1]]),
        limit_page_length: "500",
        order_by: "web_item_name asc",
      });

      const itemRes = await erpFetch(
        getErpUrl(`/api/resource/Website Item?${itemParams}`),
        { headers: getErpHeaders() }
      );

      if (!itemRes.ok) {
        res.status(502).json({ error: "Failed to fetch Website Items from ERPNext." });
        return;
      }

      const itemJson = (await itemRes.json()) as {
        data: { item_code: string; web_item_name?: string; item_name?: string; website_warehouse?: string | null; custom_stock_qty?: number | null }[];
      };

      const items = itemJson.data;

      // 2. Batch fetch Bin data for all item+warehouse combos
      const warehouseItems = items.filter((i) => i.item_code && i.website_warehouse);
      const defaultWarehouse = process.env["ONLINE_WAREHOUSE"] || process.env["DEFAULT_WAREHOUSE"] || "Oxigen Warehouse - O";

      // Items without website_warehouse — fall back to defaultWarehouse
      const fallbackItems = items.filter((i) => i.item_code && !i.website_warehouse);

      const allBinFilters: { item_code: string; warehouse: string }[] = [
        ...warehouseItems.map((i) => ({ item_code: i.item_code, warehouse: i.website_warehouse as string })),
        ...fallbackItems.map((i) => ({ item_code: i.item_code, warehouse: defaultWarehouse })),
      ];

      const binMap: Record<string, { actual_qty: number; reserved_qty: number }> = {};

      if (allBinFilters.length > 0) {
        const binItemCodes = [...new Set(allBinFilters.map((i) => i.item_code))];
        const binWarehouses = [...new Set(allBinFilters.map((i) => i.warehouse))];

        const binParams = new URLSearchParams({
          fields: JSON.stringify(["item_code", "warehouse", "actual_qty", "reserved_qty"]),
          filters: JSON.stringify([
            ["item_code", "in", binItemCodes],
            ["warehouse", "in", binWarehouses],
          ]),
          limit_page_length: String(allBinFilters.length * 2),
        });

        const binRes = await erpFetch(
          getErpUrl(`/api/resource/Bin?${binParams}`),
          { headers: getErpHeaders() }
        );

        if (binRes.ok) {
          const binJson = (await binRes.json()) as {
            data: { item_code: string; warehouse: string; actual_qty: number; reserved_qty: number }[];
          };
          for (const row of binJson.data) {
            binMap[`${row.item_code}::${row.warehouse}`] = {
              actual_qty: row.actual_qty ?? 0,
              reserved_qty: row.reserved_qty ?? 0,
            };
          }
        }
      }

      // 3. Build response
      const inventory = items.map((item) => {
        const warehouse = item.website_warehouse || defaultWarehouse || null;
        const bin = warehouse ? (binMap[`${item.item_code}::${warehouse}`] ?? null) : null;
        const actual_qty = bin?.actual_qty ?? 0;
        const reserved_qty = bin?.reserved_qty ?? 0;
        const available_qty = actual_qty - reserved_qty;

        return {
          item_code: item.item_code,
          item_name: item.web_item_name || item.item_name || item.item_code,
          warehouse: warehouse ?? "—",
          actual_qty,
          reserved_qty,
          available_qty,
          in_stock: available_qty > 0,
        };
      });

      res.json({ data: inventory });
    } catch (err) {
      logger.error({ err: err }, "[admin/inventory]");
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

export default router;
