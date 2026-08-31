import { logger } from "../lib/logger.js";
import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import multer from "multer";
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
import { pingErpNext, getErpUrl, getErpHeaders, erpFetch, parseErpError } from "../lib/erpnext-client.js";
import { itemCache } from "../lib/item-cache.js";
import { ErpAdapter } from "../services/erp-adapter.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

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
// ---------------------------------------------------------------------------
router.get(
  "/admin/monitor",
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
        completed: queue.completed,
        submitted: queue.completed,
        erpProcessing: processingOrders.length,
        erpCompleted: completedOrders.length,
        total: queue.total,
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
// Monitor Actions
// ---------------------------------------------------------------------------
router.post(
  "/admin/monitor/retry-dlq",
  attachRequestId,
  async (_req: Request, res: Response) => {
    const { retryDlqJobs } = await import("../lib/order-queue.js");
    const count = retryDlqJobs();
    res.json({ ok: true, retriedCount: count });
  }
);

router.post(
  "/admin/monitor/clear-pending",
  attachRequestId,
  (_req: Request, res: Response) => {
    const count = clearPendingQueue();
    res.json({ ok: true, clearedCount: count });
  }
);

router.post(
  "/admin/monitor/clear-dlq",
  attachRequestId,
  (_req: Request, res: Response) => {
    const count = clearDlq();
    res.json({ ok: true, clearedCount: count });
  }
);

router.post(
  "/admin/monitor/clear-completed",
  attachRequestId,
  (_req: Request, res: Response) => {
    const count = clearCompleted();
    res.json({ ok: true, clearedCount: count });
  }
);

// ---------------------------------------------------------------------------
// GET /api/admin/inventory
// ---------------------------------------------------------------------------
router.get(
  "/admin/inventory",
  attachRequestId,
  async (_req: Request, res: Response) => {
    try {
      const itemParams = new URLSearchParams({
        fields: JSON.stringify(["name", "item_code", "item_name", "item_group", "stock_uom", "image"]),
        limit_page_length: "500",
        order_by: "item_name asc",
      });

      const itemRes = await erpFetch(
        getErpUrl(`/api/resource/Item?${itemParams.toString()}`),
        { headers: getErpHeaders() }
      );

      if (!itemRes.ok) {
        const errText = await itemRes.text().catch(() => "");
        logger.error({ status: itemRes.status, errText }, "[admin/inventory] Failed to fetch Items from ERPNext");
        res.status(502).json({ error: "Failed to fetch Items from ERPNext." });
        return;
      }

      const itemJson = (await itemRes.json()) as {
        data: { item_code?: string; name: string; item_name?: string; item_group?: string; stock_uom?: string; image?: string | null }[];
      };

      const items = itemJson.data || [];
      const defaultWarehouse = process.env["ONLINE_WAREHOUSE"] || process.env["DEFAULT_WAREHOUSE"] || "Oxigen Warehouse - O";

      const binItemCodes = [...new Set(items.map((i) => i.item_code || i.name))].filter(Boolean);
      const binMap: Record<string, { actual_qty: number; reserved_qty: number; ordered_qty: number; projected_qty: number }> = {};

      if (binItemCodes.length > 0) {
        const binParams = new URLSearchParams({
          fields: JSON.stringify(["item_code", "warehouse", "actual_qty", "reserved_qty", "ordered_qty", "projected_qty"]),
          filters: JSON.stringify([["item_code", "in", binItemCodes]]),
          limit_page_length: "1000",
        });

        const binRes = await erpFetch(
          getErpUrl(`/api/resource/Bin?${binParams.toString()}`),
          { headers: getErpHeaders() }
        ).catch(() => null);

        if (binRes?.ok) {
          const binJson = (await binRes.json()) as {
            data: { item_code: string; warehouse: string; actual_qty: number; reserved_qty: number; ordered_qty: number; projected_qty: number }[];
          };
          for (const row of binJson.data || []) {
            binMap[`${row.item_code}::${row.warehouse}`] = {
              actual_qty: Number(row.actual_qty) || 0,
              reserved_qty: Number(row.reserved_qty) || 0,
              ordered_qty: Number(row.ordered_qty) || 0,
              projected_qty: Number(row.projected_qty) || 0,
            };
          }
        }
      }

      const inventory = items.map((item) => {
        const itemCode = item.item_code || item.name;
        const warehouse = defaultWarehouse;
        const bin = binMap[`${itemCode}::${warehouse}`] ?? null;
        const actual_qty = bin?.actual_qty ?? 0;
        const reserved_qty = bin?.reserved_qty ?? 0;
        const ordered_qty = bin?.ordered_qty ?? 0;
        const available_qty = Math.max(0, actual_qty - reserved_qty);
        const projected_qty = bin?.projected_qty ?? (actual_qty - reserved_qty + ordered_qty);

        return {
          item_code: itemCode,
          item_name: item.item_name || itemCode,
          item_group: item.item_group || "General",
          warehouse: warehouse,
          actual_qty,
          reserved_qty,
          ordered_qty,
          available_qty,
          projected_qty,
          stock_uom: item.stock_uom || "Nos",
          image: item.image || null,
          in_stock: available_qty > 0,
        };
      });

      res.json({ data: inventory });
    } catch (err) {
      logger.error({ err }, "[admin/inventory]");
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

// POST /api/admin/inventory/adjust (Add/Adjust/Reconcile Stock in ERPNext)
router.post(
  "/admin/inventory/adjust",
  attachRequestId,
  async (req: Request, res: Response) => {
    try {
      const { item_code, qty, warehouse, rate = 0, entry_type = "Stock Reconciliation", mode } = req.body;
      const defaultCompany = process.env.DEFAULT_COMPANY ?? "Oxigen";
      const targetWarehouse = warehouse || process.env.ONLINE_WAREHOUSE || process.env.DEFAULT_WAREHOUSE || "Oxigen Warehouse - O";
      const numQty = Number(qty) ?? 0;
      const today = new Date().toISOString().split("T")[0];

      // If mode is "set" or entry_type is "Stock Reconciliation" (Editing inventory)
      if (mode === "set" || entry_type === "Stock Reconciliation" || entry_type === "Stock Adjustment") {
        const recoPayload = {
          doctype: "Stock Reconciliation",
          company: defaultCompany,
          purpose: "Stock Reconciliation",
          expense_account: "Temporary Opening - O",
          posting_date: today,
          items: [
            {
              item_code,
              warehouse: targetWarehouse,
              qty: Math.max(0, numQty),
              valuation_rate: Number(rate) > 0 ? Number(rate) : 500,
            },
          ],
        };

        const erpRes = await erpFetch(getErpUrl("/api/resource/Stock Reconciliation"), {
          method: "POST",
          headers: getErpHeaders(),
          body: JSON.stringify(recoPayload),
        });

        if (!erpRes.ok) {
          const err = (await erpRes.json().catch(() => ({}))) as any;
          res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to reconcile stock." });
          return;
        }

        const data: any = await erpRes.json();
        if (data.data) {
          await erpFetch(getErpUrl("/api/method/frappe.client.submit"), {
            method: "POST",
            headers: getErpHeaders(),
            body: JSON.stringify({ doc: data.data }),
          });
        }

        itemCache.clear();
        res.status(200).json({ success: true, data: data.data });
        return;
      }

      if (entry_type === "Material Receipt") {
        // Create & Submit Purchase Invoice with update_stock: 1
        const piPayload = {
          doctype: "Purchase Invoice",
          company: defaultCompany,
          supplier: "External",
          posting_date: today,
          due_date: today,
          update_stock: 1,
          set_warehouse: targetWarehouse,
          items: [
            {
              item_code,
              qty: numQty,
              rate: Number(rate) || 0,
              warehouse: targetWarehouse,
              expense_account: "Stock In Hand - O",
              cost_center: "Main - O",
            },
          ],
        };

        const erpRes = await erpFetch(getErpUrl("/api/resource/Purchase Invoice"), {
          method: "POST",
          headers: getErpHeaders(),
          body: JSON.stringify(piPayload),
        });

        if (!erpRes.ok) {
          const err = (await erpRes.json().catch(() => ({}))) as any;
          res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to create Purchase Invoice." });
          return;
        }

        const data: any = await erpRes.json();
        if (data.data) {
          await erpFetch(getErpUrl("/api/method/frappe.client.submit"), {
            method: "POST",
            headers: getErpHeaders(),
            body: JSON.stringify({ doc: data.data }),
          });
        }

        itemCache.clear();
        res.status(201).json({ success: true, data: data.data });
        return;
      }

      // If negative qty or explicit Material Issue
      const stockPayload = {
        doctype: "Stock Entry",
        stock_entry_type: "Material Issue",
        company: defaultCompany,
        posting_date: today,
        items: [
          {
            item_code,
            qty: Math.abs(numQty),
            s_warehouse: targetWarehouse,
          },
        ],
      };

      const seRes = await erpFetch(getErpUrl("/api/resource/Stock Entry"), {
        method: "POST",
        headers: getErpHeaders(),
        body: JSON.stringify(stockPayload),
      });

      if (!seRes.ok) {
        const err = (await seRes.json().catch(() => ({}))) as any;
        res.status(seRes.status).json({ error: parseErpError(err) || "Failed to adjust stock." });
        return;
      }

      const seData: any = await seRes.json();
      if (seData.data) {
        await erpFetch(getErpUrl("/api/method/frappe.client.submit"), {
          method: "POST",
          headers: getErpHeaders(),
          body: JSON.stringify({ doc: seData.data }),
        });
      }

      itemCache.clear();
      res.status(201).json({ success: true, data: seData.data });
    } catch (err: any) {
      logger.error({ err }, "[admin/inventory/adjust]");
      res.status(500).json({ error: err.message || "Failed to adjust inventory." });
    }
  }
);

// ---------------------------------------------------------------------------
// ORDERS (Sales Order CRUD)
// ---------------------------------------------------------------------------
router.get(
  "/admin/orders",
  attachRequestId,
  async (_req: Request, res: Response) => {
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
          "delivery_date",
          "modified",
          "owner",
        ]),
        limit_page_length: "200",
        order_by: "transaction_date desc, modified desc",
      });

      const erpRes = await erpFetch(
        getErpUrl(`/api/resource/Sales Order?${params.toString()}`),
        { headers: getErpHeaders() }
      );

      if (!erpRes.ok) {
        res.status(502).json({ error: "Failed to fetch orders from ERPNext." });
        return;
      }

      const data = (await erpRes.json()) as { data: any[] };
      res.json({ data: data.data });
    } catch (err) {
      logger.error({ err }, "[admin/orders]");
      res.status(500).json({ error: "Internal server error." });
    }
  }
);

router.get(
  "/admin/orders/:name",
  attachRequestId,
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const erpRes = await erpFetch(
        getErpUrl(`/api/resource/Sales Order/${encodeURIComponent(name)}`),
        { headers: getErpHeaders() }
      );

      if (!erpRes.ok) {
        res.status(404).json({ error: "Order not found." });
        return;
      }

      const data: any = await erpRes.json();
      res.json({ data: data.data });
    } catch (err: any) {
      logger.error({ err }, "[admin/orders/:name.GET]");
      res.status(500).json({ error: err.message || "Internal server error." });
    }
  }
);

router.post(
  "/admin/orders",
  attachRequestId,
  async (req: Request, res: Response) => {
    try {
      const {
        customer,
        customer_name,
        delivery_date,
        transaction_date,
        items,
        currency = "PKR",
      } = req.body;

      const defaultCompany = process.env.DEFAULT_COMPANY ?? "Oxigen";
      const defaultWarehouse = process.env.ONLINE_WAREHOUSE || process.env.DEFAULT_WAREHOUSE || "Oxigen Warehouse - O";
      const today = new Date().toISOString().split("T")[0];

      const formattedItems = (items || []).map((it: any) => ({
        item_code: it.item_code || it.name,
        qty: Number(it.qty) || 1,
        rate: Number(it.rate) || Number(it.price) || 0,
        warehouse: defaultWarehouse,
      }));

      if (formattedItems.length === 0) {
        res.status(400).json({ error: "At least one item is required to create an order." });
        return;
      }

      const orderPayload = {
        doctype: "Sales Order",
        company: defaultCompany,
        customer: customer || customer_name,
        currency,
        transaction_date: transaction_date || today,
        delivery_date: delivery_date || today,
        order_type: "Sales",
        items: formattedItems,
      };

      const erpRes = await erpFetch(getErpUrl("/api/resource/Sales Order"), {
        method: "POST",
        headers: getErpHeaders(),
        body: JSON.stringify(orderPayload),
      });

      if (!erpRes.ok) {
        const err = (await erpRes.json().catch(() => ({}))) as any;
        res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to create Sales Order in ERPNext." });
        return;
      }

      const data: any = await erpRes.json();

      // Submit Sales Order in ERPNext to immediately reserve/deduct available inventory
      const orderName = data.data?.name;
      try {
        await erpFetch(getErpUrl("/api/method/frappe.client.submit"), {
          method: "POST",
          headers: getErpHeaders(),
          body: JSON.stringify({ doc: data.data }),
        });
        if (orderName) {
          await ErpAdapter.createAndSubmitDeliveryNote(orderName, defaultWarehouse);
        }
      } catch (submitErr) {
        logger.warn({ submitErr, order: orderName }, "Sales Order created in Draft, submit failed");
      }

      itemCache.clear();
      res.status(201).json({ data: data.data });
    } catch (err: any) {
      logger.error({ err }, "[admin/orders.POST]");
      res.status(500).json({ error: err.message || "Failed to create order." });
    }
  }
);

router.put(
  "/admin/orders/:name",
  attachRequestId,
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const erpRes = await erpFetch(
        getErpUrl(`/api/resource/Sales Order/${encodeURIComponent(name)}`),
        {
          method: "PUT",
          headers: getErpHeaders(),
          body: JSON.stringify(req.body),
        }
      );

      if (!erpRes.ok) {
        const err = (await erpRes.json().catch(() => ({}))) as any;
        res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to update Sales Order." });
        return;
      }

      const data: any = await erpRes.json();
      res.json({ data: data.data });
    } catch (err: any) {
      logger.error({ err }, "[admin/orders/:name.PUT]");
      res.status(500).json({ error: err.message || "Failed to update order." });
    }
  }
);

router.delete(
  "/admin/orders/:name",
  attachRequestId,
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;

      await erpFetch(getErpUrl("/api/method/frappe.client.cancel"), {
        method: "POST",
        headers: getErpHeaders(),
        body: JSON.stringify({ doctype: "Sales Order", name }),
      }).catch(() => {});

      const delRes = await erpFetch(
        getErpUrl(`/api/resource/Sales Order/${encodeURIComponent(name)}`),
        {
          method: "DELETE",
          headers: getErpHeaders(),
        }
      );

      if (!delRes.ok) {
        await erpFetch(getErpUrl(`/api/resource/Sales Order/${encodeURIComponent(name)}`), {
          method: "PUT",
          headers: getErpHeaders(),
          body: JSON.stringify({ status: "Cancelled" }),
        });
      }

      res.json({ success: true, message: `Order ${name} cancelled/deleted.` });
    } catch (err: any) {
      logger.error({ err }, "[admin/orders/:name.DELETE]");
      res.status(500).json({ error: err.message || "Failed to delete order." });
    }
  }
);

// ---------------------------------------------------------------------------
// CUSTOMERS CRUD
// ---------------------------------------------------------------------------
router.get(
  "/admin/customers",
  attachRequestId,
  async (_req: Request, res: Response) => {
    try {
      const params = new URLSearchParams({
        fields: JSON.stringify([
          "name",
          "customer_name",
          "customer_type",
          "customer_group",
          "territory",
          "email_id",
          "mobile_no",
          "creation",
          "modified",
        ]),
        limit_page_length: "200",
        order_by: "creation desc",
      });

      const erpRes = await erpFetch(
        getErpUrl(`/api/resource/Customer?${params}`),
        { headers: getErpHeaders() }
      );

      if (!erpRes.ok) {
        res.status(502).json({ error: "Failed to fetch customers from ERPNext." });
        return;
      }

      const data: any = await erpRes.json();
      res.json({ data: data.data });
    } catch (err: any) {
      logger.error({ err }, "[admin/customers.GET]");
      res.status(500).json({ error: err.message || "Internal server error." });
    }
  }
);

router.get(
  "/admin/customers/:name",
  attachRequestId,
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const erpRes = await erpFetch(
        getErpUrl(`/api/resource/Customer/${encodeURIComponent(name)}`),
        { headers: getErpHeaders() }
      );

      if (!erpRes.ok) {
        res.status(404).json({ error: "Customer not found." });
        return;
      }

      const data: any = await erpRes.json();
      res.json({ data: data.data });
    } catch (err: any) {
      logger.error({ err }, "[admin/customers/:name.GET]");
      res.status(500).json({ error: err.message || "Internal server error." });
    }
  }
);

router.post(
  "/admin/customers",
  attachRequestId,
  async (req: Request, res: Response) => {
    try {
      const {
        customer_name,
        email_id,
        mobile_no,
        customer_type = "Individual",
        customer_group = "Individual",
        territory = "Pakistan",
      } = req.body;

      if (!customer_name) {
        res.status(400).json({ error: "Customer name is required." });
        return;
      }

      const payload = {
        doctype: "Customer",
        customer_name,
        customer_type,
        customer_group,
        territory,
        email_id: email_id || undefined,
        mobile_no: mobile_no || undefined,
      };

      const erpRes = await erpFetch(getErpUrl("/api/resource/Customer"), {
        method: "POST",
        headers: getErpHeaders(),
        body: JSON.stringify(payload),
      });

      if (!erpRes.ok) {
        const err = (await erpRes.json().catch(() => ({}))) as any;
        res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to create customer in ERPNext." });
        return;
      }

      const data: any = await erpRes.json();
      res.status(201).json({ data: data.data });
    } catch (err: any) {
      logger.error({ err }, "[admin/customers.POST]");
      res.status(500).json({ error: err.message || "Failed to create customer." });
    }
  }
);

router.put(
  "/admin/customers/:name",
  attachRequestId,
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const erpRes = await erpFetch(
        getErpUrl(`/api/resource/Customer/${encodeURIComponent(name)}`),
        {
          method: "PUT",
          headers: getErpHeaders(),
          body: JSON.stringify(req.body),
        }
      );

      if (!erpRes.ok) {
        const err = (await erpRes.json().catch(() => ({}))) as any;
        res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to update customer." });
        return;
      }

      const data: any = await erpRes.json();
      res.json({ data: data.data });
    } catch (err: any) {
      logger.error({ err }, "[admin/customers/:name.PUT]");
      res.status(500).json({ error: err.message || "Failed to update customer." });
    }
  }
);

router.delete(
  "/admin/customers/:name",
  attachRequestId,
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const erpRes = await erpFetch(
        getErpUrl(`/api/resource/Customer/${encodeURIComponent(name)}`),
        {
          method: "DELETE",
          headers: getErpHeaders(),
        }
      );

      if (!erpRes.ok) {
        const err = (await erpRes.json().catch(() => ({}))) as any;
        res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to delete customer." });
        return;
      }

      res.json({ success: true, message: `Customer ${name} deleted.` });
    } catch (err: any) {
      logger.error({ err }, "[admin/customers/:name.DELETE]");
      res.status(500).json({ error: err.message || "Failed to delete customer." });
    }
  }
);

// ---------------------------------------------------------------------------
// DISCOUNTS / ITEM PRICES
// ---------------------------------------------------------------------------
router.get(
  "/admin/discounts",
  attachRequestId,
  async (_req: Request, res: Response) => {
    try {
      const params = new URLSearchParams({
        fields: JSON.stringify([
          "name",
          "item_code",
          "price_list",
          "price_list_rate",
          "currency",
          "valid_from",
          "valid_upto",
          "selling",
        ]),
        limit_page_length: "200",
        order_by: "modified desc",
      });

      const erpRes = await erpFetch(
        getErpUrl(`/api/resource/Item Price?${params}`),
        { headers: getErpHeaders() }
      );

      if (!erpRes.ok) {
        res.status(502).json({ error: "Failed to fetch Item Prices." });
        return;
      }

      const data: any = await erpRes.json();
      res.json({ data: data.data });
    } catch (err: any) {
      logger.error({ err }, "[admin/discounts.GET]");
      res.status(500).json({ error: err.message || "Internal server error." });
    }
  }
);

router.post(
  "/admin/discounts",
  attachRequestId,
  async (req: Request, res: Response) => {
    try {
      const { item_code, price_list_rate, price_list = "Standard Selling", currency = "PKR" } = req.body;
      const payload = {
        doctype: "Item Price",
        item_code,
        price_list,
        price_list_rate: Number(price_list_rate) || 0,
        currency,
        selling: 1,
      };

      const erpRes = await erpFetch(getErpUrl("/api/resource/Item Price"), {
        method: "POST",
        headers: getErpHeaders(),
        body: JSON.stringify(payload),
      });

      if (!erpRes.ok) {
        const err = (await erpRes.json().catch(() => ({}))) as any;
        res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to create price entry." });
        return;
      }

      const data: any = await erpRes.json();
      itemCache.clear();
      res.status(201).json({ data: data.data });
    } catch (err: any) {
      logger.error({ err }, "[admin/discounts.POST]");
      res.status(500).json({ error: err.message || "Failed to create discount/price." });
    }
  }
);

router.delete(
  "/admin/discounts/:name",
  attachRequestId,
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const erpRes = await erpFetch(
        getErpUrl(`/api/resource/Item Price/${encodeURIComponent(name)}`),
        {
          method: "DELETE",
          headers: getErpHeaders(),
        }
      );

      if (!erpRes.ok) {
        res.status(erpRes.status).json({ error: "Failed to delete price entry." });
        return;
      }

      itemCache.clear();
      res.json({ success: true, message: `Price entry ${name} deleted.` });
    } catch (err: any) {
      logger.error({ err }, "[admin/discounts/:name.DELETE]");
      res.status(500).json({ error: err.message || "Internal server error." });
    }
  }
);

// ---------------------------------------------------------------------------
// USERS / TEAM MANAGEMENT
// ---------------------------------------------------------------------------
router.get(
  "/admin/users",
  attachRequestId,
  async (_req: Request, res: Response) => {
    try {
      const params = new URLSearchParams({
        fields: JSON.stringify([
          "name",
          "email",
          "first_name",
          "last_name",
          "full_name",
          "user_type",
          "enabled",
          "role_profile_name",
          "creation",
          "last_active",
        ]),
        limit_page_length: "200",
        order_by: "creation desc",
      });

      const erpRes = await erpFetch(
        getErpUrl(`/api/resource/User?${params}`),
        { headers: getErpHeaders() }
      );

      if (!erpRes.ok) {
        res.status(502).json({ error: "Failed to fetch Users from ERPNext." });
        return;
      }

      const data: any = await erpRes.json();
      res.json({ data: data.data });
    } catch (err: any) {
      logger.error({ err }, "[admin/users.GET]");
      res.status(500).json({ error: err.message || "Internal server error." });
    }
  }
);

router.post(
  "/admin/users",
  attachRequestId,
  async (req: Request, res: Response) => {
    try {
      const { email, first_name, last_name, user_type = "Website User", send_welcome_email = 0 } = req.body;
      if (!email) {
        res.status(400).json({ error: "Email is required." });
        return;
      }

      const payload = {
        doctype: "User",
        email,
        first_name: first_name || email.split("@")[0],
        last_name,
        user_type,
        send_welcome_email,
        enabled: 1,
      };

      const erpRes = await erpFetch(getErpUrl("/api/resource/User"), {
        method: "POST",
        headers: getErpHeaders(),
        body: JSON.stringify(payload),
      });

      if (!erpRes.ok) {
        const err = (await erpRes.json().catch(() => ({}))) as any;
        res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to create user in ERPNext." });
        return;
      }

      const data: any = await erpRes.json();
      res.status(201).json({ data: data.data });
    } catch (err: any) {
      logger.error({ err }, "[admin/users.POST]");
      res.status(500).json({ error: err.message || "Failed to create user." });
    }
  }
);

router.put(
  "/admin/users/:name",
  attachRequestId,
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const erpRes = await erpFetch(
        getErpUrl(`/api/resource/User/${encodeURIComponent(name)}`),
        {
          method: "PUT",
          headers: getErpHeaders(),
          body: JSON.stringify(req.body),
        }
      );

      if (!erpRes.ok) {
        const err = (await erpRes.json().catch(() => ({}))) as any;
        res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to update user." });
        return;
      }

      const data: any = await erpRes.json();
      res.json({ data: data.data });
    } catch (err: any) {
      logger.error({ err }, "[admin/users/:name.PUT]");
      res.status(500).json({ error: err.message || "Internal server error." });
    }
  }
);

router.delete(
  "/admin/users/:name",
  attachRequestId,
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const erpRes = await erpFetch(
        getErpUrl(`/api/resource/User/${encodeURIComponent(name)}`),
        {
          method: "PUT",
          headers: getErpHeaders(),
          body: JSON.stringify({ enabled: 0 }),
        }
      );

      if (!erpRes.ok) {
        res.status(erpRes.status).json({ error: "Failed to disable user." });
        return;
      }

      res.json({ success: true, message: `User ${name} disabled.` });
    } catch (err: any) {
      logger.error({ err }, "[admin/users/:name.DELETE]");
      res.status(500).json({ error: err.message || "Internal server error." });
    }
  }
);

// ---------------------------------------------------------------------------
// FILES / MEDIA
// ---------------------------------------------------------------------------
router.get(
  "/admin/files",
  attachRequestId,
  async (_req: Request, res: Response) => {
    try {
      const params = new URLSearchParams({
        fields: JSON.stringify([
          "name",
          "file_name",
          "file_url",
          "file_size",
          "is_private",
          "creation",
          "attached_to_doctype",
          "attached_to_name",
        ]),
        limit_page_length: "200",
        order_by: "creation desc",
      });

      const erpRes = await erpFetch(
        getErpUrl(`/api/resource/File?${params}`),
        { headers: getErpHeaders() }
      );

      if (!erpRes.ok) {
        res.status(502).json({ error: "Failed to fetch files from ERPNext." });
        return;
      }

      const data: any = await erpRes.json();
      res.json({ data: data.data });
    } catch (err: any) {
      logger.error({ err }, "[admin/files.GET]");
      res.status(500).json({ error: err.message || "Internal server error." });
    }
  }
);

router.post(
  "/admin/files/upload",
  upload.single("file"),
  attachRequestId,
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No file uploaded." });
        return;
      }

      const formData = new FormData();
      const fileBlob = new Blob([new Uint8Array(file.buffer)]);
      formData.append("file", fileBlob, file.originalname);
      formData.append("is_private", "0");
      formData.append("folder", "Home/Attachments");

      const headers = getErpHeaders();
      delete headers["Content-Type"];

      const erpRes = await erpFetch(getErpUrl("/api/method/upload_file"), {
        method: "POST",
        headers,
        body: formData as any,
      });

      if (!erpRes.ok) {
        const err = (await erpRes.json().catch(() => ({}))) as any;
        res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to upload file to ERPNext." });
        return;
      }

      const json: any = await erpRes.json();
      res.status(201).json({ data: json.message });
    } catch (err: any) {
      logger.error({ err }, "[admin/files/upload.POST]");
      res.status(500).json({ error: err.message || "Failed to upload file." });
    }
  }
);

export default router;
