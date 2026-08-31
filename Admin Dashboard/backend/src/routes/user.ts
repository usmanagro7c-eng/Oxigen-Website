import { logger } from "../lib/logger.js";
import { Router, type IRouter } from "express";
import { createHash } from "crypto";
import { getErpUrl, getErpHeaders, parseErpError, erpFetch, findCustomerByEmail } from "../lib/erpnext-client.js";
import { requireAuth, assertOwner } from "../middlewares/requireAuth.js";
import { enqueueOrder, getJobStatus, QueueFullError } from "../lib/order-queue.js";
import { ErpAdapter } from "../services/erp-adapter.js";
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

const ORDER_LIST_FIELDS = ["name","transaction_date","status","grand_total","currency"];



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
    const data = (await erpRes.json()) as { data: unknown };
    res.json({ data: data.data });
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
    res.json({ data: data.data });
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

export default router;
