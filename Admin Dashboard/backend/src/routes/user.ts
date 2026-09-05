import { logger } from "../lib/logger.js";
import { Router, type IRouter } from "express";
import { createHash } from "crypto";
import { getErpUrl, getErpHeaders, parseErpError, erpFetch, findCustomerByEmail } from "../lib/erpnext-client.js";
import { requireAuth, assertOwner } from "../middlewares/requireAuth.js";
import { enqueueOrder, getJobStatus, QueueFullError } from "../lib/order-queue.js";
import { ErpAdapter } from "../services/erp-adapter.js";
import { notificationService } from "../services/notification.service.js";
import { createRateLimiter } from "../middlewares/rate-limit.js";
import { validate, changePasswordSchema } from "../lib/validation.js";

const router: IRouter = Router();

const changePasswordLimiter = createRateLimiter("changePassword");

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

const USER_FIELDS = ["name","email","full_name","first_name","last_name","mobile_no","phone","username","gender","birth_date"];

router.get("/user/profile", requireAuth, async (req, res) => {
  const email = req.query["email"] as string | undefined;
  if (!email || typeof email !== "string" || email.length > 255) { res.status(400).json({ error: "Valid email query param required." }); return; }
  if (!assertOwner(req, res, email)) return;

  try {
    const erpRes = await erpFetch(
      getErpUrl(`/api/resource/User/${encodeURIComponent(email)}?fields=${encodeURIComponent(JSON.stringify(USER_FIELDS))}`),
      { headers: getErpHeaders() },
    );
    if (!erpRes.ok) {
      const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string };
      res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to fetch profile." });
      return;
    }
    const data = (await erpRes.json()) as { data: unknown };
    res.json({ data: data.data });
  } catch (err) {
    logger.error({ err: err }, "[user/profile GET]");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.put("/user/profile", requireAuth, async (req, res) => {
  const { email, ...patch } = req.body as { email?: string; [key: string]: unknown };
  if (!email) { res.status(400).json({ error: "email is required in request body." }); return; }
  if (!assertOwner(req, res, email)) return;

  const allowedFields = ["full_name","first_name","last_name","mobile_no","phone","gender","birth_date"];
  const safePatch = Object.fromEntries(Object.entries(patch).filter(([key]) => allowedFields.includes(key)));

  if (typeof safePatch.gender === "string" && safePatch.gender) {
    const g = safePatch.gender.trim().toLowerCase();
    safePatch.gender = g.charAt(0).toUpperCase() + g.slice(1);
  }

  try {
    const erpRes = await erpFetch(getErpUrl(`/api/resource/User/${encodeURIComponent(email)}`), {
      method: "PUT", headers: getErpHeaders(), body: JSON.stringify(safePatch),
    });
    if (!erpRes.ok) {
      const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string };
      res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to update profile." });
      return;
    }
    const data = (await erpRes.json()) as { data: unknown };
    res.json({ data: data.data });
  } catch (err) {
    logger.error({ err: err }, "[user/profile PUT]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// ---------------------------------------------------------------------------
// Change Password
// ---------------------------------------------------------------------------

router.post("/user/change-password", requireAuth, changePasswordLimiter, validate(changePasswordSchema), async (req, res) => {
  const { old_password, new_password } = req.body;
  try {
    const erpRes = await erpFetch(getErpUrl("/api/method/frappe.core.doctype.user.user.update_password"), {
      method: "POST",
      headers: { ...getErpHeaders(), Cookie: req.headers.cookie ?? "" },
      body: JSON.stringify({ old_password, new_password, logout_all_sessions: 0 }),
    });
    if (!erpRes.ok) {
      const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string; message?: string };
      res.status(erpRes.status).json({ error: parseErpError(err) || err.message || "Failed to change password." });
      return;
    }
    res.json({ message: "Password updated successfully." });
  } catch (err) {
    logger.error({ err: err }, "[user/change-password]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

const ADDRESS_FIELDS = ["name","address_title","address_type","address_line1","address_line2","city","state","country","pincode","phone","email_id","is_primary_address","is_shipping_address","owner"];

router.get("/user/addresses", requireAuth, async (req, res) => {
  const email = req.query["email"] as string | undefined;
  if (!email) { res.status(400).json({ error: "email query param required." }); return; }
  if (!assertOwner(req, res, email)) return;

  const params = new URLSearchParams({
    fields: JSON.stringify(ADDRESS_FIELDS),
    filters: JSON.stringify([["email_id", "=", email], ["address_type", "=", "Shipping"]]),
    limit_page_length: "100",
    order_by: "modified desc",
  });
  try {
    const erpRes = await erpFetch(getErpUrl(`/api/resource/Address?${params.toString()}`), { headers: getErpHeaders() });
    if (!erpRes.ok) {
      const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string };
      res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to fetch addresses." }); return;
    }
    const data = (await erpRes.json()) as { data: unknown };
    res.json({ data: data.data });
  } catch (err) {
    logger.error({ err: err }, "[user/addresses GET]");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.post("/user/addresses", requireAuth, async (req, res) => {
  const email = req.loggedInEmail!;
  // Find the Customer and Contact so the address can be linked to them
  const links: { link_doctype: string; link_name: string }[] = [];
  try {
    const contactParams = new URLSearchParams({
      fields: JSON.stringify(["name"]),
      filters: JSON.stringify([["user", "=", email]]),
      limit_page_length: "1",
    });
    const contactRes = await erpFetch(
      getErpUrl(`/api/resource/Contact?${contactParams.toString()}`),
      { headers: getErpHeaders() },
    );
    if (contactRes.ok) {
      const contactData = (await contactRes.json()) as { data: { name: string }[] };
      const contactName = contactData.data?.[0]?.name;
      if (contactName) {
        links.push({ link_doctype: "Contact", link_name: contactName });
        const linkParams = new URLSearchParams({
          fields: JSON.stringify(["link_name"]),
          filters: JSON.stringify([
            ["parent", "=", contactName],
            ["link_doctype", "=", "Customer"],
          ]),
          limit_page_length: "1",
        });
        const linkRes = await erpFetch(
          getErpUrl(`/api/resource/Dynamic Link?${linkParams.toString()}`),
          { headers: getErpHeaders() },
        );
        if (linkRes.ok) {
          const linkData = (await linkRes.json()) as { data: { link_name: string }[] };
          const customerName = linkData.data?.[0]?.link_name;
          if (customerName) {
            links.push({ link_doctype: "Customer", link_name: customerName });
          }
        }
      }
    }
  } catch {
    // Save the address even if the link lookup fails
  }

  const safeBody = {
    ...(req.body as Record<string, unknown>),
    owner: email,
    email_id: email,
    ...(links.length > 0 ? { links } : {}),
  };

  try {
    const erpRes = await erpFetch(getErpUrl("/api/resource/Address"), {
      method: "POST", headers: getErpHeaders(), body: JSON.stringify(safeBody),
    });
    if (!erpRes.ok) {
      const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string };
      res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to create address." }); return;
    }
    const data = (await erpRes.json()) as { data: unknown };
    res.json({ data: data.data });
  } catch (err) {
    logger.error({ err: err }, "[user/addresses POST]");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.put("/user/addresses/:name", requireAuth, async (req, res) => {
  const { name } = req.params;
  try {
    const checkRes = await erpFetch(getErpUrl(`/api/resource/Address/${encodeURIComponent(name as string)}`), { headers: getErpHeaders() });
    if (!checkRes.ok) { res.status(404).json({ error: "Address not found." }); return; }
    const checkData = (await checkRes.json()) as { data?: { owner?: string; email_id?: string } };
    const isOwner = checkData.data?.owner === req.loggedInEmail || checkData.data?.email_id === req.loggedInEmail;
    if (!isOwner) { res.status(403).json({ error: "Access denied." }); return; }

    const erpRes = await erpFetch(getErpUrl(`/api/resource/Address/${encodeURIComponent(name as string)}`), {
      method: "PUT", headers: getErpHeaders(), body: JSON.stringify(req.body),
    });
    if (!erpRes.ok) {
      const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string };
      res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to update address." }); return;
    }
    const data = (await erpRes.json()) as { data: unknown };
    res.json({ data: data.data });
  } catch (err) {
    logger.error({ err: err }, "[user/addresses PUT]");
    res.status(500).json({ error: "Internal server error." });
  }
});

router.delete("/user/addresses/:name", requireAuth, async (req, res) => {
  const { name } = req.params;
  try {
    const checkRes = await erpFetch(getErpUrl(`/api/resource/Address/${encodeURIComponent(name as string)}`), { headers: getErpHeaders() });
    if (!checkRes.ok) { res.status(404).json({ error: "Address not found." }); return; }
    const checkData = (await checkRes.json()) as { data?: { owner?: string; email_id?: string } };
    const isOwner = checkData.data?.owner === req.loggedInEmail || checkData.data?.email_id === req.loggedInEmail;
    if (!isOwner) { res.status(403).json({ error: "Access denied." }); return; }

    const erpRes = await erpFetch(getErpUrl(`/api/resource/Address/${encodeURIComponent(name as string)}`), {
      method: "DELETE", headers: getErpHeaders(),
    });
    if (!erpRes.ok) {
      const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string };
      res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to delete address." }); return;
    }
    res.json({ message: "Address deleted." });
  } catch (err) {
    logger.error({ err: err }, "[user/addresses DELETE]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// ---------------------------------------------------------------------------
// Orders (Sales Order)
// ---------------------------------------------------------------------------

const ORDER_LIST_FIELDS = ["name","transaction_date","status","grand_total","currency","docstatus"];

// ---------------------------------------------------------------------------
// Invoice helpers — resolve the linked Sales Invoice so a customer order can be
// presented as "Unpaid" (Payment / Return visible) or "Completed" (paid).
// ---------------------------------------------------------------------------

type CustomerInvoiceInfo = {
  invoice_name?: string;
  invoice_status?: string;
  outstanding_amount?: number;
  docstatus?: number;
};

// Sellable child-table list reads (Sales Invoice Item) are forbidden for the
// API key on some setups (403). These helpers therefore try that fast path first
// and fall back to reading the customer's submitted Sales Invoices and their
// `items.sales_order` child rows via permitted parent-doc reads.
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (idx < items.length) {
      const cur = idx++;
      results[cur] = await fn(items[cur]);
    }
  });
  await Promise.all(workers);
  return results;
}

async function findLinkedSalesInvoice(orderName: string, customerName: string): Promise<string | null> {
  const info = await resolveSalesInvoicesForOrders([orderName], customerName);
  return info.get(orderName)?.invoice_name ?? null;
}

async function resolveSalesInvoicesForOrders(
  orderNames: string[],
  customerName: string
): Promise<Map<string, CustomerInvoiceInfo | null>> {
  const uniqueNames = [...new Set(orderNames)];
  const out = new Map<string, CustomerInvoiceInfo | null>();
  if (!uniqueNames.length) return out;

  const fetchInvoiceInfo = async (params: URLSearchParams): Promise<Map<string, CustomerInvoiceInfo>> => {
    const infoBySiName = new Map<string, CustomerInvoiceInfo>();
    const res = await erpFetch(getErpUrl(`/api/resource/Sales Invoice?${params.toString()}`), { headers: getErpHeaders() });
    if (res.ok) {
      const json = (await res.json()) as { data?: Array<any> };
      for (const si of json.data ?? []) {
        infoBySiName.set(si.name, {
          invoice_name: si.name,
          invoice_status: si.status,
          outstanding_amount: si.outstanding_amount,
          docstatus: si.docstatus,
        });
      }
    }
    return infoBySiName;
  };

  // ── Fast path: child-table query (needs read permission on Sales Invoice Item) ──
  let childTableOk = true;
  const bySo = new Map<string, string[]>();
  const siNames = new Set<string>();
  const CHUNK = 40;
  try {
    for (let i = 0; i < uniqueNames.length; i += CHUNK) {
      const slice = uniqueNames.slice(i, i + CHUNK);
      const params = new URLSearchParams({
        filters: JSON.stringify([["sales_order", "in", slice]]),
        fields: JSON.stringify(["parent", "sales_order"]),
        limit_page_length: "1000",
      });
      const res = await erpFetch(
        getErpUrl(`/api/resource/Sales Invoice Item?${params.toString()}`),
        { headers: getErpHeaders() }
      );
      if (res.status === 403) {
        childTableOk = false;
        break;
      }
      if (res.ok) {
        const json = (await res.json()) as { data?: Array<{ parent?: string; sales_order?: string }> };
        for (const row of json.data ?? []) {
          if (!row.parent || !row.sales_order) continue;
          if (!bySo.has(row.sales_order)) bySo.set(row.sales_order, []);
          bySo.get(row.sales_order)!.push(row.parent);
          siNames.add(row.parent);
        }
      }
    }
    if (childTableOk && siNames.size > 0) {
      const infoBySiName = await fetchInvoiceInfo(
        new URLSearchParams({
          filters: JSON.stringify([["name", "in", [...siNames]]]),
          fields: JSON.stringify(["name", "status", "outstanding_amount", "docstatus"]),
          limit_page_length: "1000",
        })
      );
      for (const soName of uniqueNames) {
        const names = (bySo.get(soName) ?? []).sort(
          (a, b) => (infoBySiName.get(b)?.docstatus ?? 0) - (infoBySiName.get(a)?.docstatus ?? 0)
        );
        const first = names.map((n) => infoBySiName.get(n)).find((x): x is CustomerInvoiceInfo => Boolean(x));
        out.set(soName, first ?? null);
      }
      return out;
    }
  } catch {
    /* ignore */
  }

  // ── Fallback: read the customer's submitted Sales Invoices + items child rows ──
  logger.info({ customer: customerName, reason: childTableOk ? "no-invoices" : "no-permission" }, "[resolveSi] using parent-doc fallback");
  try {
    const siListRes = await erpFetch(
      getErpUrl(
        `/api/resource/Sales Invoice?${new URLSearchParams({
          filters: JSON.stringify([["customer", "=", customerName], ["docstatus", "=", 1]]),
          fields: JSON.stringify(["name"]),
          limit_page_length: "200",
          order_by: "creation desc",
        })}`
      ),
      { headers: getErpHeaders() }
    );
    if (siListRes.ok) {
      const invoices = ((await siListRes.json()) as { data?: Array<{ name: string }> }).data ?? [];
      const infoBySo = new Map<string, CustomerInvoiceInfo>();
      await mapWithConcurrency(invoices, 6, async (inv) => {
        try {
          const fields = encodeURIComponent(JSON.stringify(["name", "status", "docstatus", "outstanding_amount", "items"]));
          const docRes = await erpFetch(
            getErpUrl(`/api/resource/Sales Invoice/${encodeURIComponent(inv.name)}?fields=${fields}`),
            { headers: getErpHeaders() }
          );
          if (!docRes.ok) return;
          const doc = ((await docRes.json()) as { data?: any }).data;
          if (!doc?.items || !doc.status) return;
          const soNames = (doc.items as Array<{ sales_order?: string }>)
            .map((it) => it.sales_order)
            .filter((x): x is string => Boolean(x));
          const info: CustomerInvoiceInfo = {
            invoice_name: doc.name,
            invoice_status: doc.status,
            outstanding_amount: doc.outstanding_amount,
            docstatus: doc.docstatus,
          };
          for (const soName of soNames) {
            const existing = infoBySo.get(soName);
            if (!existing || (info.docstatus ?? 0) > (existing.docstatus ?? 0)) {
              infoBySo.set(soName, info);
            }
          }
        } catch {
          /* skip this invoice */
        }
      });
      for (const soName of uniqueNames) {
        out.set(soName, infoBySo.get(soName) ?? null);
      }
    }
  } catch (err) {
    logger.warn({ err }, "[resolveSi] fallback failed");
  }
  return out;
}

function computeCustomerDisplayStatus(so: any, info: CustomerInvoiceInfo | null): string {
  if (Number(so.docstatus) === 2) return "Cancelled";
  if (info && info.invoice_status) {
    const s = String(info.invoice_status).toLowerCase();
    if (s === "paid") return "Completed";
    if (
      s === "unpaid" ||
      s === "overdue" ||
      s === "partly paid" ||
      s === "partial" ||
      s === "return" ||
      s === "credit note issued" ||
      s === "draft"
    ) return "Unpaid";
  }
  return so.status || "To Deliver and Bill";
}

router.get("/user/orders", requireAuth, async (req, res) => {
  const email = req.query["email"] as string | undefined;
  if (!email) { res.status(400).json({ error: "email query param required." }); return; }
  if (!assertOwner(req, res, email)) return;

  const customerName = await findCustomerByEmail(email);

  if (!customerName) {
    res.json({ data: [] });
    return;
  }

  const params = new URLSearchParams({
    fields: JSON.stringify(ORDER_LIST_FIELDS),
    filters: JSON.stringify([["customer", "=", customerName]]),
    limit_page_length: "50",
    order_by: "transaction_date desc",
  });
  try {
    const erpRes = await erpFetch(getErpUrl(`/api/resource/Sales Order?${params.toString()}`), { headers: getErpHeaders() });
    if (!erpRes.ok) {
      const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string };
      res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to fetch orders." }); return;
    }
    const data = (await erpRes.json()) as { data: any[] };
    const orders = data.data || [];
    const invoiceMap = await resolveSalesInvoicesForOrders(orders.map((o: any) => o.name), customerName);
    const withInvoice = orders.map((o: any) => {
      const info = invoiceMap.get(o.name) || null;
      return {
        ...o,
        invoice_name: info?.invoice_name || null,
        invoice_status: info?.invoice_status || null,
        outstanding_amount: info?.outstanding_amount ?? o.grand_total ?? 0,
        status: computeCustomerDisplayStatus(o, info),
      };
    });
    res.json({ data: withInvoice });
  } catch (err) {
    logger.error({ err: err }, "[user/orders GET]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// POST /api/user/orders — Place a Sales Order (direct when ERPNext is up,
// queue + retry fallback when it is temporarily unreachable)
router.post("/user/orders", async (req, res) => {
  const { items, delivery_date, addressName, shippingAddress, setAsDefault } = req.body as {
    items?: { item_code: string; item_name?: string; qty: number }[];
    delivery_date?: string;
    /** ERPNext name of the saved address (when a saved address is selected) */
    addressName?: string;
    /** Newly entered address data (when a new address is entered) */
    shippingAddress?: {
      address_line1: string;
      address_line2?: string;
      city: string;
      state?: string;
      country: string;
      pincode?: string;
      phone?: string;
    };
    /** true = link the address with the customer and mark it as default */
    setAsDefault?: boolean;
  };

  // Logged-in customers are identified by their ERPNext session; guest
  // checkout is identified by the shipping email.
  const sessionEmail = req.loggedInEmail;
  const guestEmail = (req.body as { email?: string }).email;
  const email = sessionEmail ?? guestEmail;

  if (!email) {
    res.status(400).json({ error: "email is required for checkout." });
    return;
  }

  const defaultWarehouse = process.env["ONLINE_WAREHOUSE"] || process.env["DEFAULT_WAREHOUSE"] || "Oxigen Warehouse - O";
  const defaultCompany = process.env["DEFAULT_COMPANY"] || "Oxigen";

  if (!items || items.length === 0) {
    res.status(400).json({ error: "items array required." }); return;
  }

  for (const item of items) {
    if (
      !item.item_code ||
      !Number.isFinite(item.qty) ||
      item.qty <= 0 ||
      item.qty > 100
    ) {
      res.status(400).json({ error: "Invalid cart item quantity." });
      return;
    }
  }

  // ── Build idempotency key (sha256 of email + sorted items + address) ────────
  const idempotencyKey = createHash("sha256")
    .update(
      JSON.stringify({
        email,
        items: [...items].sort((a, b) => a.item_code.localeCompare(b.item_code)),
        addressName: addressName ?? null,
        delivery_date: delivery_date ?? null,
      })
    )
    .digest("hex");

  // ── Build order payload ─────────────────────────────────────────────────────
  const payload = {
    email,
    items: items.map(({ item_code, qty }) => ({ item_code, qty })),
    delivery_date,
    addressName,
    shippingAddress,
    setAsDefault,
    defaultWarehouse,
    defaultCompany,
  };

  // ── Try direct placement first — ERPNext is healthy in the normal case ─────
  try {
    const orderName = await ErpAdapter.createErpOrder(payload);
    const customerName = (req.body as { customerName?: string }).customerName || sessionEmail?.split("@")[0] || email.split("@")[0] || "Customer";
    const itemCount = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
    notificationService.addOrderNotification({
      orderId: orderName,
      customerName,
      email,
      city: shippingAddress?.city || "",
      total: 0,
      itemCount,
      paymentMethod: "COD",
      items,
    });
    res.status(201).json({
      queued: false,
      orderName,
      message: "Order placed successfully.",
    });
    return;
  } catch (directErr) {
    const msg = directErr instanceof Error ? directErr.message : String(directErr);
    logger.warn({ err: msg, email }, "user/orders: direct placement failed, falling back to queue");

    // If the failure is not connectivity (e.g. validation, missing customer),
    // surface it immediately instead of queueing something that will never succeed.
    const isConnectivityError =
      msg.includes("fetch failed") ||
      msg.includes("ECONNREFUSED") ||
      msg.includes("ETIMEDOUT") ||
      msg.includes("AbortError") ||
      msg.includes("ERPNext responded with 5") ||
      msg.includes("Status 5");

    if (!isConnectivityError) {
      res.status(502).json({ error: `Order could not be placed: ${msg}` });
      return;
    }
  }

  // ── Fallback: enqueue — returns immediately (202 Accepted) ─────────────────
  let jobId: string;
  try {
    jobId = enqueueOrder(idempotencyKey, payload);
  } catch (err) {
    if (err instanceof QueueFullError) {
      res.status(503).json({
        error: err.message,
        retryAfter: 300, // 5 min baad retry karo
      });
      return;
    }
    throw err;
  }

  res.status(202).json({
    queued: true,
    jobId,
    message: "ERPNext is temporarily unavailable. Order added to queue. Check status at /api/user/orders/job/:jobId.",
  });
});

// GET /api/user/orders/job/:jobId — Poll queue job status
router.get("/user/orders/job/:jobId", requireAuth, async (req, res) => {
  const { jobId } = req.params;
  const job = getJobStatus(jobId as string);
  if (!job) {
    res.status(404).json({ error: "Job not found." });
    return;
  }
  // Verify the job belongs to the requesting user
  if (job.email !== req.loggedInEmail) {
    res.status(403).json({ error: "Access denied." });
    return;
  }
  res.json({ data: job });
});

router.get("/user/orders/:name", requireAuth, async (req, res) => {
  const { name } = req.params;
  try {
    const erpRes = await erpFetch(
      getErpUrl(`/api/resource/Sales Order/${encodeURIComponent(name as string)}`),
      { headers: getErpHeaders() },
    );
    if (!erpRes.ok) {
      const err = (await erpRes.json().catch(() => ({}))) as { _server_messages?: string };
      res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to fetch order." }); return;
    }
    const data = (await erpRes.json()) as {
      data: { owner?: string; customer?: string } & Record<string, unknown>;
    };
    const customerName = await findCustomerByEmail(req.loggedInEmail!);

    if (!customerName || data.data?.customer !== customerName) {
      res.status(403).json({ error: "Access denied." });
      return;
    }

    // Attach linked Sales Invoice info so the order can be shown as "Unpaid"/"Completed".
    const invoiceName = await findLinkedSalesInvoice(name as string, customerName);
    let invoiceInfo: CustomerInvoiceInfo | null = null;
    if (invoiceName) {
      const fields = encodeURIComponent(JSON.stringify(["name", "docstatus", "status", "outstanding_amount"]));
      const siRes = await erpFetch(
        getErpUrl(`/api/resource/Sales Invoice/${encodeURIComponent(invoiceName)}?fields=${fields}`),
        { headers: getErpHeaders() },
      );
      if (siRes.ok) {
        const si = ((await siRes.json()) as { data?: any }).data;
        invoiceInfo = {
          invoice_name: si.name,
          invoice_status: si.status,
          outstanding_amount: si.outstanding_amount,
          docstatus: si.docstatus,
        };
      }
    }
    const so = data.data;
    res.json({
      data: {
        ...so,
        invoice_name: invoiceInfo?.invoice_name ?? null,
        invoice_status: invoiceInfo?.invoice_status ?? null,
        outstanding_amount: invoiceInfo?.outstanding_amount ?? (Number(so.grand_total) || 0),
        display_status: computeCustomerDisplayStatus(data.data, invoiceInfo),
      },
    });
  } catch (err) {
    logger.error({ err: err }, "[user/orders/:name GET]");
    res.status(500).json({ error: "Internal server error." });
  }
});


// DELETE /api/user/orders/:name — customer cancels their own order
router.delete("/user/orders/:name", requireAuth, async (req, res) => {
  const { name } = req.params;
  const email = req.loggedInEmail!;

  try {
    // 1) Resolve customer name (for ownership verification)
    const customerName = await findCustomerByEmail(email);
    if (!customerName) {
      res.status(403).json({ error: "Access denied." });
      return;
    }

    // 2) Fetch the order and check ownership
    const orderRes = await erpFetch(
      getErpUrl(`/api/resource/Sales Order/${encodeURIComponent(name as string)}`),
      { headers: getErpHeaders() },
    );
    if (!orderRes.ok) {
      res.status(404).json({ error: "Order not found." });
      return;
    }

    const orderData = (await orderRes.json()) as {
      data: { customer?: string; status?: string; docstatus?: number } & Record<string, unknown>;
    };

    if (orderData.data?.customer !== customerName) {
      res.status(403).json({ error: "Access denied." });
      return;
    }

    // 3) Check cancellable status
    const cancellableStatuses = ["To Deliver and Bill", "To Deliver", "To Bill"];
    const currentStatus = orderData.data?.status ?? "";
    if (!cancellableStatuses.includes(currentStatus)) {
      res.status(400).json({
        error: `An order with "${currentStatus}" status cannot be cancelled.`,
      });
      return;
    }

    // 4) Cancel it in ERPNext
    const cancelRes = await erpFetch(getErpUrl("/api/method/frappe.client.cancel"), {
      method: "POST",
      headers: getErpHeaders(),
      body: JSON.stringify({ doctype: "Sales Order", name }),
    });

    if (!cancelRes.ok) {
      const err = (await cancelRes.json().catch(() => ({}))) as {
        _server_messages?: string;
        message?: string;
        exception?: string;
      };
      res.status(cancelRes.status).json({
        error: parseErpError(err) || err.message || "Failed to cancel the order.",
      });
      return;
    }

    res.json({ message: "Order cancelled successfully." });
  } catch (err) {
    logger.error({ err: err }, "[user/orders/:name DELETE]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// POST /api/user/orders/:name/delete — Permanently delete a cancelled order
router.post("/user/orders/:name/delete", requireAuth, async (req, res) => {
  const { name } = req.params;
  const email = req.loggedInEmail!;

  try {
    // 1) Resolve customer name (for ownership verification)
    const customerName = await findCustomerByEmail(email);
    if (!customerName) {
      res.status(403).json({ error: "Access denied." });
      return;
    }

    // 2) Fetch the order and verify ownership
    const orderRes = await erpFetch(
      getErpUrl(`/api/resource/Sales Order/${encodeURIComponent(name as string)}`),
      { headers: getErpHeaders() },
    );
    if (!orderRes.ok) {
      res.status(404).json({ error: "Order not found." });
      return;
    }

    const orderData = (await orderRes.json()) as {
      data: { customer?: string; status?: string; docstatus?: number } & Record<string, unknown>;
    };

    if (orderData.data?.customer !== customerName) {
      res.status(403).json({ error: "Access denied." });
      return;
    }

    // 3) Only Cancelled orders can be deleted
    const currentStatus = orderData.data?.status ?? "";
    const docstatus = orderData.data?.docstatus;
    if (currentStatus !== "Cancelled" && docstatus !== 2) {
      res.status(400).json({
        error: `Only cancelled orders can be deleted. Current status: "${currentStatus}".`,
      });
      return;
    }

    // 4) Permanently delete from ERPNext
    const deleteRes = await erpFetch(
      getErpUrl(`/api/resource/Sales Order/${encodeURIComponent(name as string)}`),
      { method: "DELETE", headers: getErpHeaders() },
    );

    if (!deleteRes.ok) {
      const err = (await deleteRes.json().catch(() => ({}))) as {
        _server_messages?: string;
        message?: string;
        exception?: string;
      };
      res.status(deleteRes.status).json({
        error: parseErpError(err) || err.message || "Failed to delete the order.",
      });
      return;
    }

    res.json({ message: "Order deleted successfully." });
  } catch (err) {
    logger.error({ err: err }, "[user/orders/:name/delete POST]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// ---------------------------------------------------------------------------
// Payment modes + Payment / Return for customer orders
// ---------------------------------------------------------------------------

// GET /api/user/payment-modes - available Mode of Payment records for the Payment form
router.get("/user/payment-modes", requireAuth, async (_req, res) => {
  try {
    const params = new URLSearchParams({
      fields: JSON.stringify(["name", "type", "accounts"]),
      limit_page_length: "100",
      order_by: "name asc",
    });
    const erpRes = await erpFetch(
      getErpUrl(`/api/resource/Mode of Payment?${params.toString()}`),
      { headers: getErpHeaders() }
    );
    if (!erpRes.ok) {
      res.status(502).json({ error: "Failed to fetch payment modes from ERPNext." });
      return;
    }
    const data = (await erpRes.json()) as { data?: any[] };
    res.json({
      data: (data.data || []).map((m) => ({
        name: m.name,
        type: m.type || null,
        default_account: (m.accounts || [])[0]?.default_account || null,
      })),
    });
  } catch (err) {
    logger.error({ err: err }, "[user/payment-modes]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// POST /api/user/orders/:name/payment - create + submit a Payment Entry against the order's Sales Invoice
router.post("/user/orders/:name/payment", requireAuth, async (req, res) => {
  const { name } = req.params;
  const email = req.loggedInEmail!;
  const { mode_of_payment, amount, reference_no, posting_date } = req.body as {
    mode_of_payment?: string;
    amount?: number;
    reference_no?: string;
    posting_date?: string;
  };

  try {
    // 1) Ownership + load the Sales Order
    const customerName = await findCustomerByEmail(email);
    if (!customerName) {
      res.status(403).json({ error: "Access denied." });
      return;
    }
    const soRes = await erpFetch(
      getErpUrl(`/api/resource/Sales Order/${encodeURIComponent(name as string)}`),
      { headers: getErpHeaders() }
    );
    if (!soRes.ok) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    const soData: any = ((await soRes.json()) as any).data;
    if (soData?.customer !== customerName) {
      res.status(403).json({ error: "Access denied." });
      return;
    }
    if (Number(soData.docstatus) === 2) {
      res.status(400).json({ error: "Cancelled orders cannot be paid." });
      return;
    }
    if (Number(soData.docstatus) !== 1) {
      res.status(400).json({ error: "Order is not submitted yet." });
      return;
    }

    // 2) Resolve (or create) the linked Sales Invoice
    let invoiceName = await findLinkedSalesInvoice(name as string, customerName);
    if (!invoiceName) {
      try {
        invoiceName = await ErpAdapter.createAndSubmitSalesInvoice(
          name as string,
          soData?.items?.[0]?.warehouse
        );
      } catch (err: any) {
        res.status(502).json({ error: err?.message || "Failed to create Sales Invoice for this order." });
        return;
      }
    }

    // 3) Guard against double-payment
    const siFields = encodeURIComponent(JSON.stringify(["docstatus", "status"]));
    const siRes = await erpFetch(
      getErpUrl(`/api/resource/Sales Invoice/${encodeURIComponent(invoiceName)}?fields=${siFields}`),
      { headers: getErpHeaders() }
    );
    if (siRes.ok) {
      const siData = ((await siRes.json()) as any).data;
      if (Number(siData?.docstatus) === 2) {
        res.status(400).json({ error: "The order's invoice is cancelled." });
        return;
      }
      if (String(siData?.status).toLowerCase() === "paid") {
        res.status(400).json({ error: "This order is already paid." });
        return;
      }
    }

    // 4) Build the Payment Entry from the Sales Invoice
    const peTemplateRes = await erpFetch(
      getErpUrl("/api/method/erpnext.accounts.doctype.payment_entry.payment_entry.get_payment_entry"),
      {
        method: "POST",
        headers: getErpHeaders(),
        body: JSON.stringify({ dt: "Sales Invoice", dn: invoiceName }),
      }
    );
    if (!peTemplateRes.ok) {
      const err = (await peTemplateRes.json().catch(() => ({}))) as any;
      res.status(502).json({ error: parseErpError(err) || "Failed to prepare Payment Entry." });
      return;
    }
    const peTemplate: any = ((await peTemplateRes.json()) as any).message;
    if (!peTemplate || !peTemplate.doctype) {
      res.status(502).json({ error: "Payment Entry could not be prepared." });
      return;
    }

    // 5) Patch with the customer's selection
    const today = new Date().toISOString().split("T")[0];
    const payAmount = Number(amount) > 0 ? Number(amount) : (Number(soData.grand_total) || 0);
    peTemplate.mode_of_payment = mode_of_payment || "Cash";
    peTemplate.paid_amount = payAmount;
    peTemplate.received_amount = payAmount;
    if (posting_date) peTemplate.posting_date = posting_date;
    peTemplate.reference_no = reference_no || "";

    // 6) Insert + submit the Payment Entry
    const peInsRes = await erpFetch(getErpUrl("/api/resource/Payment Entry"), {
      method: "POST",
      headers: getErpHeaders(),
      body: JSON.stringify(peTemplate),
    });
    if (!peInsRes.ok) {
      const err = (await peInsRes.json().catch(() => ({}))) as any;
      res.status(502).json({ error: parseErpError(err) || "Failed to create Payment Entry." });
      return;
    }
    const peData: any = await peInsRes.json();

    const peSubRes = await erpFetch(getErpUrl("/api/method/frappe.client.submit"), {
      method: "POST",
      headers: getErpHeaders(),
      body: JSON.stringify({ doc: peData.data }),
    });
    if (!peSubRes.ok) {
      const err = (await peSubRes.json().catch(() => ({}))) as any;
      res.status(502).json({ error: parseErpError(err) || "Payment Entry could not be submitted." });
      return;
    }
    const peSubmitJson: any = await peSubRes.json();
    const peName = peSubmitJson.message?.name ?? peData.data.name;

    res.json({
      success: true,
      paymentEntry: peName,
      invoice: invoiceName,
      message: `Payment recorded against ${invoiceName}.`,
    });
  } catch (err: any) {
    logger.error({ err: err }, "[user/orders/:name/payment]");
    res.status(500).json({ error: err.message || "Failed to record payment." });
  }
});

// POST /api/user/orders/:name/return - cancel Sales Invoice + Sales Order, restore stock
router.post("/user/orders/:name/return", requireAuth, async (req, res) => {
  const { name } = req.params;
  const email = req.loggedInEmail!;

  try {
    // 1) Ownership + load the Sales Order
    const customerName = await findCustomerByEmail(email);
    if (!customerName) {
      res.status(403).json({ error: "Access denied." });
      return;
    }
    const soRes = await erpFetch(
      getErpUrl(`/api/resource/Sales Order/${encodeURIComponent(name as string)}`),
      { headers: getErpHeaders() }
    );
    if (!soRes.ok) {
      res.status(404).json({ error: "Order not found." });
      return;
    }
    const soData: any = ((await soRes.json()) as any).data;
    if (soData?.customer !== customerName) {
      res.status(403).json({ error: "Access denied." });
      return;
    }
    if (Number(soData.docstatus) === 2) {
      res.status(400).json({ error: "Order is already cancelled." });
      return;
    }

    // 2) Cancel the linked Sales Invoice first (restores physical stock when update_stock = 1)
    const invoiceName = await findLinkedSalesInvoice(name as string, customerName);
    if (invoiceName) {
      const siRes = await erpFetch(
        getErpUrl(`/api/resource/Sales Invoice/${encodeURIComponent(invoiceName)}`),
        { headers: getErpHeaders() }
      );
      if (siRes.ok) {
        const siDoc: any = ((await siRes.json()) as any).data;
        if (Number(siDoc.docstatus) === 1) {
          await erpFetch(getErpUrl("/api/method/frappe.client.cancel"), {
            method: "POST",
            headers: getErpHeaders(),
            body: JSON.stringify({ doctype: "Sales Invoice", name: invoiceName }),
          });
          logger.info({ order: name, invoice: invoiceName }, "[user return] Sales Invoice cancelled (stock restored)");
        }
      }
    }

    // 3) Cancel the Sales Order (restores reserved stock)
    await erpFetch(getErpUrl("/api/method/frappe.client.cancel"), {
      method: "POST",
      headers: getErpHeaders(),
      body: JSON.stringify({ doctype: "Sales Order", name }),
    });

    res.json({
      success: true,
      message: `Order ${name} cancelled. Stock restored.`,
    });
  } catch (err: any) {
    logger.error({ err: err }, "[user/orders/:name/return]");
    res.status(500).json({ error: err.message || "Failed to cancel order." });
  }
});

export default router;
