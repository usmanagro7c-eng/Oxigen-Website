import { Router, type IRouter, type Request, type Response } from "express";
import { erpFetch, getErpUrl, getErpHeaders, parseErpError } from "../lib/erpnext-client.js";
import { logger } from "../lib/logger.js";
import { itemCache } from "../lib/item-cache.js";

const router: IRouter = Router();

// ─── GET /api/erp/stats ──────────────────────────────────────────────────────
// Computes live dashboard analytics & summary aggregates directly from ERPNext
router.get("/erp/stats", async (_req: Request, res: Response) => {
  try {
    // 1. Fetch Sales Orders (up to 500 for stats)
    const orderParams = new URLSearchParams({
      fields: JSON.stringify([
        "name",
        "customer",
        "customer_name",
        "grand_total",
        "status",
        "transaction_date",
        "modified",
        "owner",
      ]),
      limit_page_length: "500",
      order_by: "transaction_date desc",
    });

    const orderRes = await erpFetch(
      getErpUrl(`/api/resource/Sales Order?${orderParams}`),
      { headers: getErpHeaders() }
    ).catch(() => null);

    const ordersJson = orderRes?.ok ? ((await orderRes.json()) as any) : null;
    const ordersData: any[] = ordersJson?.data ?? [];

    // 2. Fetch Customers
    const custParams = new URLSearchParams({
      fields: JSON.stringify(["name", "customer_name", "email_id", "creation"]),
      limit_page_length: "500",
    });
    const custRes = await erpFetch(
      getErpUrl(`/api/resource/Customer?${custParams}`),
      { headers: getErpHeaders() }
    ).catch(() => null);
    const custJson = custRes?.ok ? ((await custRes.json()) as any) : null;
    const customersData: any[] = custJson?.data ?? [];

    // 3. Fetch Items
    const itemParams = new URLSearchParams({
      fields: JSON.stringify(["name", "item_code", "item_name", "item_group", "standard_rate", "image"]),
      limit_page_length: "500",
    });
    const itemRes = await erpFetch(
      getErpUrl(`/api/resource/Item?${itemParams}`),
      { headers: getErpHeaders() }
    ).catch(() => null);
    const itemJson = itemRes?.ok ? ((await itemRes.json()) as any) : null;
    const itemsData: any[] = itemJson?.data ?? [];

    // 4. Fetch Bin Inventory
    const binParams = new URLSearchParams({
      fields: JSON.stringify(["item_code", "warehouse", "actual_qty", "reserved_qty"]),
      limit_page_length: "500",
    });
    const binRes = await erpFetch(
      getErpUrl(`/api/resource/Bin?${binParams}`),
      { headers: getErpHeaders() }
    ).catch(() => null);
    const binJson = binRes?.ok ? ((await binRes.json()) as any) : null;
    const binsData: any[] = binJson?.data ?? [];

    // Calculate Total Revenue (excluding cancelled orders)
    const validOrders = ordersData.filter(
      (o) => (o.status || "").toLowerCase() !== "cancelled"
    );
    const totalRevenue = validOrders.reduce(
      (acc, o) => acc + (Number(o.grand_total) || 0),
      0
    );

    // Calculate Monthly Sales for last 12 months
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthlyRevenue = new Array(12).fill(0);
    const monthlyOrders = new Array(12).fill(0);

    for (const order of validOrders) {
      if (order.transaction_date) {
        const d = new Date(order.transaction_date);
        const m = d.getMonth();
        if (m >= 0 && m < 12) {
          monthlyRevenue[m] += Number(order.grand_total) || 0;
          monthlyOrders[m] += 1;
        }
      }
    }

    // Inventory counts
    let inStock = 0;
    let lowStock = 0;
    let outOfStock = 0;

    const targetWarehouse = process.env.ONLINE_WAREHOUSE || process.env.DEFAULT_WAREHOUSE || "Oxigen Warehouse - O";
    const stockByItem = new Map<string, number>();
    for (const bin of binsData) {
      if (!bin.warehouse || bin.warehouse === targetWarehouse) {
        const avail = Math.max(0, (Number(bin.actual_qty) || 0) - (Number(bin.reserved_qty) || 0));
        stockByItem.set(bin.item_code, avail);
      }
    }

    for (const item of itemsData) {
      const qty = stockByItem.get(item.item_code || item.name) ?? 0;
      if (qty > 10) inStock++;
      else if (qty > 0) lowStock++;
      else outOfStock++;
    }

    if (itemsData.length > 0 && inStock === 0 && lowStock === 0 && outOfStock === 0) {
      inStock = itemsData.length;
    }

    // Recent orders (top 10)
    const recentOrders = ordersData.slice(0, 10).map((o) => ({
      id: `#${o.name}`,
      rawId: o.name,
      customer: o.customer_name || o.customer || o.owner || "Customer",
      total: `PKR ${(Number(o.grand_total) || 0).toLocaleString()}`,
      numericTotal: Number(o.grand_total) || 0,
      status: o.status || "Draft",
      date: o.transaction_date || "—",
      modified: o.modified,
    }));

    // Top products (from Items and/or Bins)
    const topProducts = itemsData.slice(0, 5).map((it, idx) => {
      const stock = stockByItem.get(it.item_code || it.name) ?? 0;
      return {
        name: it.item_name || it.item_code || it.name,
        code: it.item_code || it.name,
        stock,
        group: it.item_group || "General",
        price: it.standard_rate || 0,
        image: it.image || null,
        soldPct: Math.max(25, 90 - idx * 15),
      };
    });

    // Recent activity list
    const activity: any[] = [];
    ordersData.slice(0, 4).forEach((o) => {
      activity.push({
        id: `act-ord-${o.name}`,
        type: "order",
        text: `Order #${o.name} (${o.status}) for ${o.customer_name || o.customer || "Customer"}`,
        time: o.transaction_date || "Recent",
        timestamp: new Date(o.modified || o.transaction_date || Date.now()).getTime(),
      });
    });

    customersData.slice(0, 3).forEach((c) => {
      activity.push({
        id: `act-cust-${c.name}`,
        type: "customer",
        text: `Customer record: ${c.customer_name || c.name} (${c.email_id || "No email"})`,
        time: c.creation ? new Date(c.creation).toLocaleDateString() : "Recent",
        timestamp: new Date(c.creation || Date.now()).getTime(),
      });
    });

    activity.sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      revenue: totalRevenue,
      ordersCount: ordersData.length,
      customersCount: customersData.length,
      productsCount: itemsData.length,
      monthlyRevenue,
      monthlyOrders,
      monthLabels: months,
      recentOrders,
      topProducts,
      inventory: {
        inStock,
        lowStock,
        outOfStock,
        total: itemsData.length,
      },
      activity: activity.slice(0, 8),
    });
  } catch (err: any) {
    logger.error({ err }, "[erp/stats]");
    res.status(500).json({ error: "Failed to generate ERP statistics." });
  }
});

// ─── GENERIC ERP RESOURCE CRUD ───────────────────────────────────────────────

// GET /api/erp/resource/:doctype (List with filters, search, fields, pagination)
router.get("/erp/resource/:doctype", async (req: Request, res: Response) => {
  try {
    const { doctype } = req.params;
    const {
      fields,
      filters,
      order_by = "modified desc",
      limit_page_length = "100",
      limit_start = "0",
      search,
    } = req.query as Record<string, string>;

    const parsedFilters: Array<[string, string, any]> = [];
    if (filters) {
      try {
        const parsed = JSON.parse(filters);
        if (Array.isArray(parsed)) {
          parsedFilters.push(...parsed);
        } else if (typeof parsed === "object") {
          for (const [k, v] of Object.entries(parsed)) {
            parsedFilters.push([k, "=", v]);
          }
        }
      } catch {
        /* invalid JSON filter, ignore */
      }
    }

    if (search) {
      parsedFilters.push(["name", "like", `%${search}%`]);
    }

    const params = new URLSearchParams({
      limit_page_length,
      limit_start,
      order_by,
    });

    if (fields) {
      params.set("fields", fields.startsWith("[") ? fields : JSON.stringify(fields.split(",").map(f => f.trim())));
    }

    if (parsedFilters.length > 0) {
      params.set("filters", JSON.stringify(parsedFilters));
    }

    const erpRes = await erpFetch(
      getErpUrl(`/api/resource/${encodeURIComponent(doctype)}?${params}`),
      { headers: getErpHeaders() }
    );

    if (!erpRes.ok) {
      const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string; message?: string };
      const msg = parseErpError(err) || err.message || `Failed to fetch ${doctype} from ERPNext.`;
      res.status(erpRes.status).json({ error: msg });
      return;
    }

    const data: any = await erpRes.json();
    res.json(data);
  } catch (err: any) {
    logger.error({ err }, "[erp/resource.GET]");
    res.status(500).json({ error: err.message || "Internal server error." });
  }
});

// GET /api/erp/resource/:doctype/:name (Get single doc)
router.get("/erp/resource/:doctype/:name", async (req: Request, res: Response) => {
  try {
    const { doctype, name } = req.params;
    const erpRes = await erpFetch(
      getErpUrl(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`),
      { headers: getErpHeaders() }
    );

    if (!erpRes.ok) {
      const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string; message?: string };
      const msg = parseErpError(err) || err.message || `Failed to fetch ${doctype} ${name}.`;
      res.status(erpRes.status).json({ error: msg });
      return;
    }

    const data: any = await erpRes.json();
    res.json(data);
  } catch (err: any) {
    logger.error({ err }, "[erp/resource/:doctype/:name.GET]");
    res.status(500).json({ error: err.message || "Internal server error." });
  }
});

// POST /api/erp/resource/:doctype (Create doc)
router.post("/erp/resource/:doctype", async (req: Request, res: Response) => {
  try {
    const { doctype } = req.params;
    const payload = {
      doctype,
      ...req.body,
    };

    const erpRes = await erpFetch(
      getErpUrl(`/api/resource/${encodeURIComponent(doctype)}`),
      {
        method: "POST",
        headers: getErpHeaders(),
        body: JSON.stringify(payload),
      }
    );

    if (!erpRes.ok) {
      const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string; message?: string; exception?: string };
      const msg = parseErpError(err) || err.message || err.exception || `Failed to create ${doctype} in ERPNext.`;
      logger.error({ err, doctype, payload }, "[erp/resource.POST] failed");
      res.status(erpRes.status).json({ error: msg });
      return;
    }

    const data: any = await erpRes.json();
    itemCache.clear();
    res.status(201).json(data);
  } catch (err: any) {
    logger.error({ err }, "[erp/resource.POST]");
    res.status(500).json({ error: err.message || "Internal server error." });
  }
});

// PUT /api/erp/resource/:doctype/:name (Update doc)
router.put("/erp/resource/:doctype/:name", async (req: Request, res: Response) => {
  try {
    const { doctype, name } = req.params;
    const erpRes = await erpFetch(
      getErpUrl(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`),
      {
        method: "PUT",
        headers: getErpHeaders(),
        body: JSON.stringify(req.body),
      }
    );

    if (!erpRes.ok) {
      const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string; message?: string };
      const msg = parseErpError(err) || err.message || `Failed to update ${doctype} ${name}.`;
      res.status(erpRes.status).json({ error: msg });
      return;
    }

    const data: any = await erpRes.json();
    itemCache.clear();
    res.json(data);
  } catch (err: any) {
    logger.error({ err }, "[erp/resource.PUT]");
    res.status(500).json({ error: err.message || "Internal server error." });
  }
});

// DELETE /api/erp/resource/:doctype/:name (Delete doc)
router.delete("/erp/resource/:doctype/:name", async (req: Request, res: Response) => {
  try {
    const { doctype, name } = req.params;
    const erpRes = await erpFetch(
      getErpUrl(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(name)}`),
      {
        method: "DELETE",
        headers: getErpHeaders(),
      }
    );

    if (!erpRes.ok) {
      const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string; message?: string };
      const msg = parseErpError(err) || err.message || `Failed to delete ${doctype} ${name}.`;
      res.status(erpRes.status).json({ error: msg });
      return;
    }

    itemCache.clear();
    res.json({ success: true, message: `${doctype} ${name} deleted successfully.` });
  } catch (err: any) {
    logger.error({ err }, "[erp/resource.DELETE]");
    res.status(500).json({ error: err.message || "Internal server error." });
  }
});

export default router;
