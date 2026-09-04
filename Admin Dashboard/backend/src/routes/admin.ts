import { timingSafeEqual, createHash } from "crypto";
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
import { pingErpNext, getErpUrl, getErpHeaders, erpFetch, parseErpError, buildMultipartBody } from "../lib/erpnext-client.js";
import { itemCache } from "../lib/item-cache.js";
import { ErpAdapter } from "../services/erp-adapter.js";
import { notificationService } from "../services/notification.service.js";

function secureEqual(a: string, b: string): boolean {
  const hashA = createHash("sha256").update(a, "utf8").digest();
  const hashB = createHash("sha256").update(b, "utf8").digest();
  return timingSafeEqual(hashA, hashB);
}

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

function getMainWarehouse(): string {
  return (process.env.MAIN_WAREHOUSE || process.env.DEFAULT_WAREHOUSE || process.env.ONLINE_WAREHOUSE || "Oxigen Warehouse - O").trim();
}

function getOnlineWarehouse(): string {
  return (process.env.ONLINE_WAREHOUSE || getMainWarehouse()).trim();
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
      const mainWarehouse = getMainWarehouse();
      const onlineWarehouse = getOnlineWarehouse();

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
        const mainBin = binMap[`${itemCode}::${mainWarehouse}`] ?? null;
        const onlineBin = binMap[`${itemCode}::${onlineWarehouse}`] ?? null;

        const actual_qty = mainBin?.actual_qty ?? 0;
        const reserved_qty = onlineBin?.reserved_qty ?? 0;
        const ordered_qty = onlineBin?.ordered_qty ?? 0;
        const available_qty = Math.max(0, (onlineBin?.actual_qty ?? 0) - reserved_qty);
        const projected_qty = onlineBin?.projected_qty ?? (actual_qty - reserved_qty + ordered_qty);

        return {
          item_code: itemCode,
          item_name: item.item_name || itemCode,
          item_group: item.item_group || "General",
          warehouse: onlineWarehouse,
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
      const mainWarehouse = getMainWarehouse();
      const onlineWarehouse = getOnlineWarehouse();
      const targetWarehouse = warehouse || (entry_type === "Material Receipt" ? mainWarehouse : onlineWarehouse);
      const numQty = Number(qty) ?? 0;
      const today = new Date().toISOString().split("T")[0];

      // When website stock is edited, set the target online warehouse to the desired quantity by
      // calculating the delta vs. current stock instead of blindly moving the entered number.
      if (mode === "set" || entry_type === "Stock Reconciliation" || entry_type === "Stock Adjustment") {
        const isOnlineEdit = targetWarehouse === onlineWarehouse;

        if (isOnlineEdit && item_code) {
          const currentBinRes = await erpFetch(
            getErpUrl(`/api/resource/Bin?${new URLSearchParams({
              fields: JSON.stringify(["actual_qty", "reserved_qty"]),
              filters: JSON.stringify([
                ["item_code", "=", item_code],
                ["warehouse", "=", onlineWarehouse],
              ]),
              limit_page_length: "1",
            }).toString()}`),
            { headers: getErpHeaders() }
          ).catch(() => null);

          let currentOnlineQty = 0;
          if (currentBinRes?.ok) {
            const currentBinJson = (await currentBinRes.json()) as {
              data?: { actual_qty?: number; reserved_qty?: number }[];
            };
            const row = currentBinJson.data?.[0];
            currentOnlineQty = row ? Math.max(0, Number(row.actual_qty ?? 0) - Number(row.reserved_qty ?? 0)) : 0;
          }

          const deltaQty = numQty - currentOnlineQty;

          if (deltaQty > 0) {
            // Check available stock in Stores - O before transferring
            const mainBinRes = await erpFetch(
              getErpUrl(`/api/resource/Bin?${new URLSearchParams({
                fields: JSON.stringify(["actual_qty", "reserved_qty"]),
                filters: JSON.stringify([
                  ["item_code", "=", item_code],
                  ["warehouse", "=", mainWarehouse],
                ]),
                limit_page_length: "1",
              }).toString()}`),
              { headers: getErpHeaders() }
            ).catch(() => null);

            let mainAvailableQty = 0;
            if (mainBinRes?.ok) {
              const mainBinJson = (await mainBinRes.json()) as {
                data?: { actual_qty?: number; reserved_qty?: number }[];
              };
              const row = mainBinJson.data?.[0];
              mainAvailableQty = row ? Math.max(0, Number(row.actual_qty ?? 0) - Number(row.reserved_qty ?? 0)) : 0;
            }

            if (mainAvailableQty < deltaQty) {
              itemCache.clear();
              res.status(400).json({
                error: `Low stock in main warehouse (${mainWarehouse}). Quantity cannot be added to website stock.`,
              });
              return;
            }

            // Transfer from Stores - O to Oxigen Warehouse - O
            const transferPayload = {
              doctype: "Stock Entry",
              stock_entry_type: "Material Transfer",
              company: defaultCompany,
              posting_date: today,
              items: [
                {
                  item_code,
                  qty: deltaQty,
                  s_warehouse: mainWarehouse,
                  t_warehouse: onlineWarehouse,
                },
              ],
            };

            const seRes = await erpFetch(getErpUrl("/api/resource/Stock Entry"), {
              method: "POST",
              headers: getErpHeaders(),
              body: JSON.stringify(transferPayload),
            });

            if (seRes.ok) {
              const seData: any = await seRes.json();
              if (seData.data) {
                await erpFetch(getErpUrl("/api/method/frappe.client.submit"), {
                  method: "POST",
                  headers: getErpHeaders(),
                  body: JSON.stringify({ doc: seData.data }),
                }).catch(() => {});
              }
              itemCache.clear();
              res.status(200).json({ success: true, data: seData.data, warehouse: onlineWarehouse });
              return;
            }

            const err = (await seRes.json().catch(() => ({}))) as any;
            res.status(seRes.status).json({ error: parseErpError(err) || "Failed to transfer stock to the online warehouse." });
            return;
          }

          if (deltaQty < 0) {
            const returnQty = Math.abs(deltaQty);
            const reversePayload = {
              doctype: "Stock Entry",
              stock_entry_type: "Material Transfer",
              company: defaultCompany,
              posting_date: today,
              items: [
                {
                  item_code,
                  qty: returnQty,
                  s_warehouse: onlineWarehouse,
                  t_warehouse: mainWarehouse,
                },
              ],
            };

            const seRes = await erpFetch(getErpUrl("/api/resource/Stock Entry"), {
              method: "POST",
              headers: getErpHeaders(),
              body: JSON.stringify(reversePayload),
            });

            if (seRes.ok) {
              const seData: any = await seRes.json();
              if (seData.data) {
                await erpFetch(getErpUrl("/api/method/frappe.client.submit"), {
                  method: "POST",
                  headers: getErpHeaders(),
                  body: JSON.stringify({ doc: seData.data }),
                }).catch(() => {});
              }
              itemCache.clear();
              res.status(200).json({ success: true, data: seData.data, warehouse: onlineWarehouse });
              return;
            }

            const err = (await seRes.json().catch(() => ({}))) as any;
            res.status(seRes.status).json({ error: parseErpError(err) || "Failed to reverse stock transfer." });
            return;
          }

          itemCache.clear();
          res.status(200).json({ success: true, data: null, warehouse: onlineWarehouse });
          return;
        }

        // 1. Check current stock in targetWarehouse (e.g. Stores - O)
        const currentBinRes = await erpFetch(
          getErpUrl(`/api/resource/Bin?${new URLSearchParams({
            fields: JSON.stringify(["actual_qty", "reserved_qty", "valuation_rate"]),
            filters: JSON.stringify([
              ["item_code", "=", item_code],
              ["warehouse", "=", targetWarehouse],
            ]),
            limit_page_length: "1",
          }).toString()}`),
          { headers: getErpHeaders() }
        ).catch(() => null);

        let currentQty = 0;
        let valRate = Number(rate) || 0;
        if (currentBinRes?.ok) {
          const currentBinJson = (await currentBinRes.json()) as any;
          const row = currentBinJson.data?.[0];
          if (row) {
            currentQty = Number(row.actual_qty ?? 0);
            if (!valRate && row.valuation_rate) {
              valRate = Number(row.valuation_rate);
            }
          }
        if (!valRate || valRate <= 0) {
          const itemDocRes = await erpFetch(
            getErpUrl(`/api/resource/Item/${encodeURIComponent(item_code)}?fields=${encodeURIComponent(JSON.stringify(["standard_rate", "valuation_rate"]))}`),
            { headers: getErpHeaders() }
          ).catch(() => null);
          if (itemDocRes?.ok) {
            const itemDocJson = (await itemDocRes.json()) as any;
            valRate = Number(itemDocJson.data?.standard_rate || itemDocJson.data?.valuation_rate) || 0;
          }
        }
        if (!valRate || valRate <= 0) {
          valRate = 100;
        }

        const delta = numQty - currentQty;

        if (delta > 0) {
          // Add delta units strictly via Purchase Invoice with update_stock: 1
          const supplier = await ErpAdapter.getOrCreateSupplier(defaultCompany);
          const piPayload: any = {
            doctype: "Purchase Invoice",
            company: defaultCompany,
            supplier,
            posting_date: today,
            due_date: today,
            update_stock: 1,
            set_warehouse: targetWarehouse,
            items: [
              {
                item_code,
                qty: delta,
                rate: valRate,
                warehouse: targetWarehouse,
                expense_account: "Stock In Hand - O",
                cost_center: "Main - O",
              },
            ],
          };

          let piRes = await erpFetch(getErpUrl("/api/resource/Purchase Invoice"), {
            method: "POST",
            headers: getErpHeaders(),
            body: JSON.stringify(piPayload),
          });

          // If initial creation fails, retry without hardcoded expense account/cost center
          if (!piRes.ok) {
            delete piPayload.items[0].expense_account;
            delete piPayload.items[0].cost_center;
            piRes = await erpFetch(getErpUrl("/api/resource/Purchase Invoice"), {
              method: "POST",
              headers: getErpHeaders(),
              body: JSON.stringify(piPayload),
            });
          }

          if (piRes.ok) {
            const piJson: any = await piRes.json().catch(() => ({}));
            if (piJson.data) {
              await erpFetch(getErpUrl("/api/method/frappe.client.submit"), {
                method: "POST",
                headers: getErpHeaders(),
                body: JSON.stringify({ doc: piJson.data }),
              }).catch(() => {});
            }
            itemCache.clear();
            res.status(200).json({ success: true, data: piJson.data, warehouse: targetWarehouse });
            return;
          }

          // Fallback: Stock Entry Material Receipt
          const seRes = await erpFetch(getErpUrl("/api/resource/Stock Entry"), {
            method: "POST",
            headers: getErpHeaders(),
            body: JSON.stringify({
              doctype: "Stock Entry",
              stock_entry_type: "Material Receipt",
              company: defaultCompany,
              posting_date: today,
              items: [
                {
                  item_code,
                  qty: delta,
                  t_warehouse: targetWarehouse,
                },
              ],
            }),
          }).catch(() => null);

          if (seRes && seRes.ok) {
            const seJson: any = await seRes.json().catch(() => ({}));
            if (seJson.data) {
              await erpFetch(getErpUrl("/api/method/frappe.client.submit"), {
                method: "POST",
                headers: getErpHeaders(),
                body: JSON.stringify({ doc: seJson.data }),
              }).catch(() => {});
            }
            itemCache.clear();
            res.status(200).json({ success: true, data: seJson.data, warehouse: targetWarehouse });
            return;
          }

          const err = (await piRes.json().catch(() => ({}))) as any;
          res.status(piRes.status).json({ error: parseErpError(err) || "Failed to create Purchase Invoice in ERPNext." });
          return;
        } else if (delta < 0) {
          // Reduce units via Stock Entry Material Issue
          const seRes = await erpFetch(getErpUrl("/api/resource/Stock Entry"), {
            method: "POST",
            headers: getErpHeaders(),
            body: JSON.stringify({
              doctype: "Stock Entry",
              stock_entry_type: "Material Issue",
              company: defaultCompany,
              posting_date: today,
              items: [
                {
                  item_code,
                  qty: Math.abs(delta),
                  s_warehouse: targetWarehouse,
                },
              ],
            }),
          }).catch(() => null);

          if (seRes && seRes.ok) {
            const seJson: any = await seRes.json().catch(() => ({}));
            if (seJson.data) {
              await erpFetch(getErpUrl("/api/method/frappe.client.submit"), {
                method: "POST",
                headers: getErpHeaders(),
                body: JSON.stringify({ doc: seJson.data }),
              }).catch(() => {});
            }
            itemCache.clear();
            res.status(200).json({ success: true, data: seJson.data, warehouse: targetWarehouse });
            return;
          }

          const err = (await seRes?.json().catch(() => ({}))) as any;
          res.status(seRes?.status || 500).json({ error: parseErpError(err) || "Failed to issue stock in ERPNext." });
          return;
        }

        itemCache.clear();
        res.status(200).json({ success: true, message: "Stock is already up to date.", warehouse: targetWarehouse });
        return;
      }

      if (entry_type === "Material Receipt") {
        const receiptWarehouse = targetWarehouse === onlineWarehouse ? mainWarehouse : targetWarehouse;

        const piPayload = {
          doctype: "Purchase Invoice",
          company: defaultCompany,
          supplier: "External",
          posting_date: today,
          due_date: today,
          update_stock: 1,
          set_warehouse: receiptWarehouse,
          items: [
            {
              item_code,
              qty: numQty,
              rate: Number(rate) || 0,
              warehouse: receiptWarehouse,
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
    }
    } catch (err: any) {
      logger.error({ err }, "[admin/inventory/adjust]");
      res.status(500).json({ error: err.message || "Failed to adjust inventory." });
    }
  }
);

// ---------------------------------------------------------------------------
// ORDERS (Sales Order CRUD)
// ---------------------------------------------------------------------------

type ShippingDetails = {
  title?: string;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  phone?: string;
  email?: string;
};

async function resolveShippingAddresses(orderDocs: { shipping_address_name?: string }[]): Promise<Map<string, ShippingDetails | null>> {
  const names = orderDocs
    .map((o) => o.shipping_address_name)
    .filter((n): n is string => Boolean(n));
  const uniqueNames = [...new Set(names)];
  const map = new Map<string, ShippingDetails | null>();
  const CHUNK = 10;

  for (let i = 0; i < uniqueNames.length; i += CHUNK) {
    const slice = uniqueNames.slice(i, i + CHUNK);
    const results = await Promise.all(
      slice.map(async (name) => {
        try {
          const res = await erpFetch(
            getErpUrl(`/api/resource/Address/${encodeURIComponent(name)}`),
            { headers: getErpHeaders() }
          );
          if (!res.ok) return null;
          const json = (await res.json()) as { data?: any };
          const a = json.data ?? {};
          return {
            title: a.address_title || undefined,
            line1: a.address_line1 || undefined,
            line2: a.address_line2 || undefined,
            city: a.city || undefined,
            state: a.state || undefined,
            pincode: a.pincode || undefined,
            country: a.country || undefined,
            phone: a.phone || undefined,
            email: a.email_id || undefined,
          } satisfies ShippingDetails;
        } catch {
          return null;
        }
      })
    );
    slice.forEach((name, idx) => map.set(name, results[idx] ?? null));
  }
  return map;
}

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
          "shipping_address_name",
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
      const orders = data.data || [];
      const shippingMap = await resolveShippingAddresses(orders);
      const withShipping = orders.map((o) => ({
        ...o,
        shipping: shippingMap.get(o.shipping_address_name) || null,
      }));
      res.json({ data: withShipping });
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
// DISCOUNTS / PRICING RULES
// ---------------------------------------------------------------------------
router.get(
  "/admin/discounts",
  attachRequestId,
  async (_req: Request, res: Response) => {
    try {
      const params = new URLSearchParams({
        fields: JSON.stringify([
          "name",
          "title",
          "apply_on",
          "rate_or_discount",
          "rate",
          "discount_percentage",
          "discount_amount",
          "valid_from",
          "valid_upto",
          "priority",
          "disable",
          "modified",
          "creation",
        ]),
        filters: JSON.stringify([["selling", "=", 1]]),
        limit_page_length: "1000",
        order_by: "modified desc",
      });

      const erpRes = await erpFetch(
        getErpUrl(`/api/resource/Pricing Rule?${params}`),
        { headers: getErpHeaders() }
      );

      if (!erpRes.ok) {
        res.status(502).json({ error: "Failed to fetch pricing rules." });
        return;
      }

      const listJson: any = await erpRes.json();
      const rules = listJson.data ?? [];

      // Child table "items" parent fields ke through nahi milta — har doc ko
      // individual fetch karke item_code list nikaalni hoti hai (v14 structure).
      const enriched = await Promise.all(
        rules.map(async (rule: any) => {
          const itemCodes: string[] = [];
          const detailRes = await erpFetch(
            getErpUrl(`/api/resource/Pricing Rule/${encodeURIComponent(rule.name)}`),
            { headers: getErpHeaders() }
          ).catch(() => null);
          if (detailRes?.ok) {
            const detailJson: any = await detailRes.json();
            const items = detailJson.data?.items ?? [];
            for (const it of items) {
              if (it.item_code) itemCodes.push(it.item_code);
            }
          }
          return { ...rule, item_codes: itemCodes, item_code: itemCodes[0] || "" };
        })
      );

      res.json({ data: enriched });
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
      const {
        item_code,
        title,
        rate_or_discount = "Discount Percentage",
        discount_percentage,
        rate,
        discount_amount,
        valid_from,
        valid_upto,
        priority = 0,
        disable = 0,
      } = req.body;

      if (!item_code) {
        res.status(400).json({ error: "Item code is required." });
        return;
      }

      const payload: Record<string, unknown> = {
        doctype: "Pricing Rule",
        title: title || `Discount ${item_code}`,
        apply_on: "Item Code",
        selling: 1,
        price_or_product_discount: "Price",
        rate_or_discount,
        priority: Number(priority) || 0,
        disable: Number(disable) || 0,
        company: process.env.DEFAULT_COMPANY || "Oxigen",
        items: [{ item_code }],
      };

      if (rate_or_discount === "Rate") {
        payload.rate = Number(rate) || 0;
      } else if (rate_or_discount === "Discount Amount") {
        payload.discount_amount = Number(discount_amount) || 0;
      } else {
        payload.discount_percentage = Number(discount_percentage) || 0;
      }

      if (valid_from) payload.valid_from = valid_from;
      if (valid_upto) payload.valid_upto = valid_upto;

      const erpRes = await erpFetch(getErpUrl("/api/resource/Pricing Rule"), {
        method: "POST",
        headers: getErpHeaders(),
        body: JSON.stringify(payload),
      });

      if (!erpRes.ok) {
        const err = (await erpRes.json().catch(() => ({}))) as any;
        res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to create pricing rule." });
        return;
      }

      const data: any = await erpRes.json();
      itemCache.clear();
      res.status(201).json({ data: data.data });
    } catch (err: any) {
      logger.error({ err }, "[admin/discounts.POST]");
      res.status(500).json({ error: err.message || "Failed to create pricing rule." });
    }
  }
);

router.put(
  "/admin/discounts/:name",
  attachRequestId,
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const {
        item_code,
        rate_or_discount,
        discount_percentage,
        rate,
        discount_amount,
        valid_from,
        valid_upto,
        priority,
        disable,
        title,
      } = req.body;

      const payload: Record<string, unknown> = {};
      if (title !== undefined) payload.title = title;
      if (rate_or_discount !== undefined) payload.rate_or_discount = rate_or_discount;
      if (priority !== undefined) payload.priority = Number(priority) || 0;
      if (disable !== undefined) payload.disable = Number(disable) || 0;
      if (valid_from !== undefined) payload.valid_from = valid_from || null;
      if (valid_upto !== undefined) payload.valid_upto = valid_upto || null;
      if (item_code !== undefined) payload.items = [{ item_code }];

      if (rate_or_discount === "Rate" && rate !== undefined) payload.rate = Number(rate) || 0;
      else if (rate_or_discount === "Discount Amount" && discount_amount !== undefined) payload.discount_amount = Number(discount_amount) || 0;
      else if (rate_or_discount === "Discount Percentage" && discount_percentage !== undefined) payload.discount_percentage = Number(discount_percentage) || 0;

      if (Object.keys(payload).length === 0) {
        res.status(400).json({ error: "No fields to update." });
        return;
      }

      const erpRes = await erpFetch(
        getErpUrl(`/api/resource/Pricing Rule/${encodeURIComponent(name)}`),
        {
          method: "PUT",
          headers: getErpHeaders(),
          body: JSON.stringify(payload),
        }
      );

      if (!erpRes.ok) {
        const err = (await erpRes.json().catch(() => ({}))) as any;
        res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to update pricing rule." });
        return;
      }

      const data: any = await erpRes.json();
      itemCache.clear();
      res.json({ data: data.data });
    } catch (err: any) {
      logger.error({ err }, "[admin/discounts/:name.PUT]");
      res.status(500).json({ error: err.message || "Internal server error." });
    }
  }
);

router.delete(
  "/admin/discounts/:name",
  attachRequestId,
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      
      // Step 1: Try hard delete first
      const erpRes = await erpFetch(
        getErpUrl(`/api/resource/Pricing Rule/${encodeURIComponent(name)}`),
        {
          method: "DELETE",
          headers: getErpHeaders(),
        }
      );

      // Step 2: If successfully deleted
      if (erpRes.ok) {
        itemCache.clear();
        res.json({ success: true, message: `Pricing rule ${name} deleted.`, action: "deleted" });
        return;
      }

      // Step 3: Parse error to check if it's a "linked" error
      const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string; message?: string };
      const errorMsg = parseErpError(err) || err.message || "";

      // Step 4: If linked to orders (417 status or "linked" in error message), try soft delete
      if (erpRes.status === 417 || errorMsg.toLowerCase().includes("linked")) {
        logger.info({ name, errorMsg }, "[admin/discounts/:name.DELETE] Pricing rule linked, attempting soft delete");
        
        const updateRes = await erpFetch(
          getErpUrl(`/api/resource/Pricing Rule/${encodeURIComponent(name)}`),
          {
            method: "PUT",
            headers: getErpHeaders(),
            body: JSON.stringify({ disabled: 1 }),
          }
        );

        if (updateRes.ok) {
          itemCache.clear();
          res.json({
            success: true,
            message: `Pricing rule ${name} archived (linked to existing orders).`,
            action: "disabled",
            reason: errorMsg,
          });
          return;
        }

        // If soft delete also failed, return that error
        const updateErr = (await updateRes.json().catch(() => ({}))) as { _server_messages?: string; message?: string };
        const updateErrorMsg = parseErpError(updateErr) || updateErr.message || "Failed to disable pricing rule.";
        res.status(updateRes.status).json({ error: updateErrorMsg });
        return;
      }

      // Step 5: Other errors - return as-is
      res.status(erpRes.status).json({ error: errorMsg || "Failed to delete pricing rule." });
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
          "is_folder",
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
      const rawFiles = (data.data || []).filter(
        (f: any) => !f.is_folder && f.file_url && f.file_url.trim() !== ""
      );

      // Deduplicate files by file_url while aggregating attached references and DB IDs
      const fileMap = new Map<string, any>();
      for (const f of rawFiles) {
        const key = f.file_url.trim().toLowerCase();
        if (!fileMap.has(key)) {
          fileMap.set(key, {
            ...f,
            file_ids: [f.name],
            attachments: f.attached_to_doctype ? [`${f.attached_to_doctype}: ${f.attached_to_name}`] : [],
          });
        } else {
          const existing = fileMap.get(key);
          if (!existing.file_ids.includes(f.name)) {
            existing.file_ids.push(f.name);
          }
          if (f.attached_to_doctype) {
            const att = `${f.attached_to_doctype}: ${f.attached_to_name}`;
            if (!existing.attachments.includes(att)) {
              existing.attachments.push(att);
            }
          }
        }
      }

      const files = Array.from(fileMap.values());
      res.json({ data: files });
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

      const { body, contentType } = buildMultipartBody([
        { name: "file", value: file.buffer, filename: file.originalname },
        { name: "is_private", value: "0" },
        { name: "folder", value: "Home/Attachments" },
      ]);

      const erpRes = await erpFetch(getErpUrl("/api/method/upload_file"), {
        method: "POST",
        headers: { ...getErpHeaders(), "Content-Type": contentType },
        body,
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

router.delete(
  "/admin/files/:name",
  attachRequestId,
  async (req: Request, res: Response) => {
    try {
      const { name } = req.params;
      const idsToDelete = name.split(",").map((s) => s.trim()).filter(Boolean);
      let anySuccess = false;
      let lastError = "";

      for (const id of idsToDelete) {
        const erpRes = await erpFetch(
          getErpUrl(`/api/resource/File/${encodeURIComponent(id)}`),
          {
            method: "DELETE",
            headers: getErpHeaders(),
          }
        );
        if (erpRes.ok) {
          anySuccess = true;
        } else {
          lastError = `Failed for ${id} (status ${erpRes.status})`;
        }
      }

      if (!anySuccess && idsToDelete.length > 0) {
        res.status(500).json({ error: lastError || "Failed to delete file from ERPNext." });
        return;
      }

      res.json({ success: true, message: `File(s) deleted.` });
    } catch (err: any) {
      logger.error({ err }, "[admin/files/:name.DELETE]");
      res.status(500).json({ error: err.message || "Internal server error." });
    }
  }
);

// ---------------------------------------------------------------------------
// Real-time Admin Notifications & Live Order Stream
// ---------------------------------------------------------------------------

router.get("/admin/notifications", attachRequestId, async (_req: Request, res: Response) => {
  res.json({
    data: notificationService.getAll(),
    unread: notificationService.getUnreadCount(),
  });
});

router.post("/admin/notifications", attachRequestId, async (req: Request, res: Response) => {
  const expected = process.env["WEBHOOK_SECRET"] ?? "";
  const provided = (req.headers["x-admin-shared-secret"] as string) ?? "";
  if (!expected || !secureEqual(expected, provided)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const { orderId, customerName, email, city, total, itemCount, paymentMethod, items } = req.body;
    if (!email) {
      res.status(400).json({ error: "email is required" });
      return;
    }
    const notif = notificationService.addOrderNotification({
      orderId,
      customerName,
      email,
      city,
      total: Number(total) || 0,
      itemCount: Number(itemCount) || 1,
      paymentMethod,
      items,
    });
    res.status(201).json({ data: notif });
  } catch (err: any) {
    logger.error({ err }, "[admin/notifications.POST]");
    res.status(500).json({ error: err.message || "Failed to create notification" });
  }
});

router.post("/admin/notifications/mark-read", attachRequestId, async (req: Request, res: Response) => {
  const { id } = req.body || {};
  notificationService.markAsRead(id);
  res.json({ success: true, unread: notificationService.getUnreadCount() });
});

router.post("/admin/notifications/clear", attachRequestId, async (_req: Request, res: Response) => {
  notificationService.clear();
  res.json({ success: true, unread: 0 });
});

router.delete("/admin/notifications/:id", attachRequestId, async (req: Request, res: Response) => {
  const { id } = req.params;
  notificationService.deleteNotification(id);
  res.json({ success: true, unread: notificationService.getUnreadCount() });
});

router.get("/admin/notifications/stream", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");

  const sendInitial = () => {
    res.write(`event: init\ndata: ${JSON.stringify({
      notifications: notificationService.getAll(),
      unread: notificationService.getUnreadCount(),
    })}\n\n`);
  };

  sendInitial();

  const onNotification = (notif: any) => {
    res.write(`event: notification\ndata: ${JSON.stringify({
      notification: notif,
      unread: notificationService.getUnreadCount(),
    })}\n\n`);
  };

  const onChange = () => {
    res.write(`event: change\ndata: ${JSON.stringify({
      notifications: notificationService.getAll(),
      unread: notificationService.getUnreadCount(),
    })}\n\n`);
  };

  notificationService.on("notification", onNotification);
  notificationService.on("change", onChange);

  const heartbeat = setInterval(() => {
    res.write(": heartbeat\n\n");
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    notificationService.off("notification", onNotification);
    notificationService.off("change", onChange);
  });
});

export default router;
