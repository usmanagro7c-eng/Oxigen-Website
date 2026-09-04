import { Router, type IRouter, type Request, type Response } from "express";
import { itemCache } from "../lib/item-cache.js";
import { logger } from "../lib/logger.js";
import { ErpAdapter } from "../services/erp-adapter.js";
import { erpFetch, getErpUrl, getErpHeaders, parseErpError } from "../lib/erpnext-client.js";

const router: IRouter = Router();

// ─── POST /api/items ──────────────────────────────────────────────────────────
router.post("/items", async (req: Request, res: Response) => {
  try {
    const item = await ErpAdapter.createItem(req.body);
    itemCache.clear();
    res.status(201).json({ data: item });
  } catch (err: any) {
    logger.error({ err }, "[items.POST]");
    res.status(err.statusCode || 500).json({ error: err.message || "Failed to create item in ERPNext." });
  }
});

// ─── PUT /api/items/:name ─────────────────────────────────────────────────────
router.put("/items/:name", async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const { item_name, item_group, standard_rate, description, image, stock_uom, status, images, short_description, web_long_description } = req.body;

    let itemCode = name;
    if (name.startsWith("WEB-ITM-")) {
      const webDoc = await erpFetch(getErpUrl(`/api/resource/Website Item/${encodeURIComponent(name)}`), { headers: getErpHeaders() }).catch(() => null);
      if (webDoc?.ok) {
        const webJson = await webDoc.json() as any;
        if (webJson.data?.item_code) itemCode = webJson.data.item_code;
      }
    }

    const finalImage = (Array.isArray(images) && images.length > 0) ? images[0] : image;
    const itemPayload: Record<string, any> = {};
    if (item_name !== undefined) itemPayload.item_name = item_name;
    if (item_group !== undefined) itemPayload.item_group = item_group;
    if (standard_rate !== undefined) itemPayload.standard_rate = Number(standard_rate);
    if (description !== undefined) itemPayload.description = description;
    if (finalImage !== undefined) itemPayload.image = finalImage;
    if (stock_uom !== undefined) itemPayload.stock_uom = stock_uom;

    const isDisable = status === "Disable" || status === "Disabled";
    const isEnable = status === "Enable" || status === "Enabled" || status === "Active";
    const isInStock = status === "In stock" || status === "In Stock";
    const isOutOfStock = status === "Out of stock" || status === "Out of Stock";

    if (isDisable) {
      itemPayload.disabled = 1;
    } else if (isEnable || isInStock || isOutOfStock) {
      itemPayload.disabled = 0;
    }

    const erpRes = await erpFetch(
      getErpUrl(`/api/resource/Item/${encodeURIComponent(itemCode)}`),
      {
        method: "PUT",
        headers: getErpHeaders(),
        body: JSON.stringify(itemPayload),
      }
    );

    if (!erpRes.ok) {
      const err = (await erpRes.json().catch(() => ({}))) as any;
      res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to update item in ERPNext." });
      return;
    }

    // Also update / create Website Item
    try {
      const isPublished = isDisable ? 0 : 1;
      const webItemPayload: Record<string, any> = {
        published: isPublished,
        ...(item_name ? { web_item_name: item_name } : {}),
        ...(description ? { description } : {}),
        ...(short_description !== undefined ? { short_description } : {}),
        ...(web_long_description !== undefined ? { web_long_description } : {}),
        ...(finalImage ? { website_image: finalImage } : {}),
      };

      if (isInStock) {
        webItemPayload.on_backorder = 1;
      } else if (isOutOfStock) {
        webItemPayload.on_backorder = 0;
        webItemPayload.custom_stock_qty = 0;
      }

      // Search for Website Item document linked with this item_code
      const webSearchRes = await erpFetch(
        getErpUrl(`/api/resource/Website Item?${new URLSearchParams({
          fields: JSON.stringify(["name", "published", "item_code"]),
          filters: JSON.stringify([["item_code", "=", name]]),
          limit_page_length: "1",
        }).toString()}`),
        { headers: getErpHeaders() }
      ).catch(() => null);

      let existingWebName: string | null = null;
      if (webSearchRes && webSearchRes.ok) {
        const webSearchJson: any = await webSearchRes.json().catch(() => ({}));
        const doc = webSearchJson.data?.[0];
        if (doc && doc.name) {
          existingWebName = doc.name;
        }
      }

      if (existingWebName) {
        await erpFetch(
          getErpUrl(`/api/resource/Website Item/${encodeURIComponent(existingWebName)}`),
          {
            method: "PUT",
            headers: getErpHeaders(),
            body: JSON.stringify(webItemPayload),
          }
        );

        // Immediate database update via frappe.client.set_value
        await erpFetch(getErpUrl("/api/method/frappe.client.set_value"), {
          method: "POST",
          headers: getErpHeaders(),
          body: JSON.stringify({
            doctype: "Website Item",
            name: existingWebName,
            fieldname: "published",
            value: isPublished,
          }),
        }).catch(() => {});
      } else if (!isDisable) {
        const onlineWarehouse = (process.env.ONLINE_WAREHOUSE || process.env.DEFAULT_WAREHOUSE || "Oxigen Warehouse - O").trim();
        await erpFetch(getErpUrl("/api/resource/Website Item"), {
          method: "POST",
          headers: getErpHeaders(),
          body: JSON.stringify({
            doctype: "Website Item",
            item_code: name,
            web_item_name: item_name || name,
            published: 1,
            website_warehouse: onlineWarehouse,
            short_description: short_description || description || "",
            web_long_description: web_long_description || "",
            description: description || "",
            on_backorder: isOutOfStock ? 0 : 1,
          }),
        });
      }
    } catch {
      /* non-fatal */
    }

    // Also update / create Item Price if standard_rate provided
    if (standard_rate !== undefined) {
      try {
        const rate = Number(standard_rate);
        const priceListRes = await erpFetch(
          getErpUrl(`/api/resource/Item Price?filters=[["item_code","=","${name}"],["selling","=",1]]&limit_page_length=1`),
          { headers: getErpHeaders() }
        );
        if (priceListRes.ok) {
          const priceJson: any = await priceListRes.json();
          if (priceJson.data?.[0]?.name) {
            await erpFetch(getErpUrl(`/api/resource/Item Price/${encodeURIComponent(priceJson.data[0].name)}`), {
              method: "PUT",
              headers: getErpHeaders(),
              body: JSON.stringify({ price_list_rate: rate }),
            });
          } else {
            await erpFetch(getErpUrl(`/api/resource/Item Price`), {
              method: "POST",
              headers: getErpHeaders(),
              body: JSON.stringify({
                doctype: "Item Price",
                item_code: name,
                price_list: "Standard Selling",
                price_list_rate: rate,
                selling: 1,
              }),
            });
          }
        }
      } catch {
        /* non-fatal */
      }
    }

    // ── Write slideshow gallery images (non-fatal) ──
    const imagesToSlideshow = Array.isArray(images)
      ? images
      : (image ? [image] : undefined);
    if (imagesToSlideshow !== undefined) {
      await ErpAdapter.upsertSlideshow({
        itemCode: name,
        webItemName: item_name,
        images: imagesToSlideshow,
      });
    }

    itemCache.clear();

    // Trigger immediate cache invalidation on the website backend
    try {
      const websiteUrl = process.env.WEBSITE_BACKEND_URL || "http://localhost:3002";
      await fetch(`${websiteUrl}/api/items/cache/clear`, { method: "POST" }).catch(() => {});
    } catch {
      /* non-fatal */
    }

    const data: any = await erpRes.json();
    res.json({ data: data.data });
  } catch (err: any) {
    logger.error({ err }, "[items/:name.PUT]");
    res.status(500).json({ error: err.message || "Failed to update item." });
  }
});

// ─── DELETE /api/items/:name ──────────────────────────────────────────────────
router.delete("/items/:name", async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const itemCode = name;

    const CHILD_TO_PARENT: Record<string, string> = {
      "Purchase Invoice Item": "Purchase Invoice",
      "Sales Order Item": "Sales Order",
      "Sales Invoice Item": "Sales Invoice",
      "Delivery Note Item": "Delivery Note",
      "Quotation Item": "Quotation",
      "Stock Entry Detail": "Stock Entry",
      "Stock Reconciliation Item": "Stock Reconciliation",
      "Purchase Receipt Item": "Purchase Receipt",
      "Purchase Order Item": "Purchase Order",
      "Material Request Item": "Material Request",
      "Packed Item": "Sales Order",
      "Payment Entry Reference": "Payment Entry",
      "Journal Entry Account": "Journal Entry",
      "Landed Cost Item": "Landed Cost Voucher",
    };

    // Helper to cancel & delete any parent doc safely
    const cancelAndDeleteDoc = async (rawDoctype: string, rawDocName: string) => {
      try {
        const doctype = CHILD_TO_PARENT[rawDoctype] || rawDoctype;
        const docName = rawDocName;
        if (!doctype || !docName || doctype === "Item") return;

        // 1. Fetch document to see its status
        const getRes = await erpFetch(
          getErpUrl(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(docName)}`),
          { headers: getErpHeaders() }
        ).catch(() => null);

        let isSubmitted = false;

        if (getRes && getRes.ok) {
          const docJson: any = await getRes.json().catch(() => ({}));
          const docData = docJson.data || {};
          const docstatus = Number(docData.docstatus ?? 0);
          isSubmitted = docstatus === 1;
        }

        // 2. If submitted (docstatus === 1), cancel it first
        if (isSubmitted) {
          await erpFetch(getErpUrl("/api/method/frappe.client.cancel"), {
            method: "POST",
            headers: getErpHeaders(),
            body: JSON.stringify({ doctype, name: docName }),
          }).catch(() => null);

          // Fallback cancel method if first one didn't work
          await erpFetch(getErpUrl("/api/method/frappe.desk.form.save.cancel"), {
            method: "POST",
            headers: getErpHeaders(),
            body: JSON.stringify({ doctype, name: docName }),
          }).catch(() => null);
        }

        // 3. Delete the document permanently
        await erpFetch(getErpUrl(`/api/resource/${encodeURIComponent(doctype)}/${encodeURIComponent(docName)}`), {
          method: "DELETE",
          headers: getErpHeaders(),
        }).catch(() => null);

        await erpFetch(getErpUrl("/api/method/frappe.client.delete"), {
          method: "POST",
          headers: getErpHeaders(),
          body: JSON.stringify({ doctype, name: docName }),
        }).catch(() => null);
      } catch {
        // non-fatal
      }
    };

    // 1. Discover all linked documents via Frappe's get_linked_docs API
    try {
      const linkedRes = await erpFetch(getErpUrl("/api/method/frappe.desk.form.linked_with.get_linked_docs"), {
        method: "POST",
        headers: getErpHeaders(),
        body: JSON.stringify({ doctype: "Item", name: itemCode }),
      }).catch(() => null);

      if (linkedRes?.ok) {
        const linkedJson: any = await linkedRes.json();
        const linkedMap = linkedJson.message || linkedJson.data || {};

        for (const [dt, rows] of Object.entries(linkedMap)) {
          if (Array.isArray(rows)) {
            for (const r of rows) {
              const parentType = (typeof r === "object" ? r?.parenttype : null) || CHILD_TO_PARENT[dt] || dt;
              const parentName = (typeof r === "object" ? (r?.parent || r?.name) : r) || "";
              if (parentType && parentName && parentType !== "Item") {
                await cancelAndDeleteDoc(parentType, parentName);
              }
            }
          }
        }
      }
    } catch {
      // non-fatal, proceed with standard child table searches
    }

    // 2. Specific search across common linked child doc types (e.g. Purchase Invoices, Sales Orders)
    const linkedDocConfigs = [
      { doctype: "Purchase Invoice Item", parentDoctype: "Purchase Invoice" },
      { doctype: "Purchase Receipt Item", parentDoctype: "Purchase Receipt" },
      { doctype: "Purchase Order Item", parentDoctype: "Purchase Order" },
      { doctype: "Sales Order Item", parentDoctype: "Sales Order" },
      { doctype: "Sales Invoice Item", parentDoctype: "Sales Invoice" },
      { doctype: "Delivery Note Item", parentDoctype: "Delivery Note" },
      { doctype: "Quotation Item", parentDoctype: "Quotation" },
      { doctype: "Stock Entry Detail", parentDoctype: "Stock Entry" },
      { doctype: "Stock Reconciliation Item", parentDoctype: "Stock Reconciliation" },
      { doctype: "Material Request Item", parentDoctype: "Material Request" },
      { doctype: "Packed Item", parentDoctype: "Sales Order" },
      { doctype: "Landed Cost Item", parentDoctype: "Landed Cost Voucher" },
    ];

    for (const config of linkedDocConfigs) {
      try {
        const linkedDocRes = await erpFetch(
          getErpUrl(`/api/resource/${config.doctype}?${new URLSearchParams({
            fields: JSON.stringify(["parent", "name"]),
            filters: JSON.stringify([["item_code", "=", itemCode]]),
            limit_page_length: "200",
          }).toString()}`),
          { headers: getErpHeaders() }
        );

        if (linkedDocRes.ok) {
          const linkedDocJson: any = await linkedDocRes.json();
          const parentNames = new Set<string>();

          for (const row of linkedDocJson.data || []) {
            if (row?.parent) parentNames.add(row.parent);
          }

          for (const parentName of parentNames) {
            await cancelAndDeleteDoc(config.parentDoctype, parentName);
          }
        }
      } catch {
        // non-fatal; some docs may not exist or may already be clean
      }
    }

    // 3. Remove related website item first so it disappears from frontend/site listings
    try {
      const websiteItemRes = await erpFetch(
        getErpUrl(`/api/resource/Website Item?${new URLSearchParams({
          fields: JSON.stringify(["name", "item_code"]),
          filters: JSON.stringify([["item_code", "=", itemCode]]),
          limit_page_length: "20",
        }).toString()}`),
        { headers: getErpHeaders() }
      );

      if (websiteItemRes.ok) {
        const websiteItemJson: any = await websiteItemRes.json();
        for (const row of websiteItemJson.data || []) {
          if (row?.name) {
            await erpFetch(getErpUrl(`/api/resource/Website Item/${encodeURIComponent(row.name)}`), {
              method: "DELETE",
              headers: getErpHeaders(),
            }).catch(() => {});
          }
        }
      }
    } catch {
      // non-fatal, item may already be removed
    }

    // 4. Remove item pricing records tied to this item
    try {
      const itemPriceRes = await erpFetch(
        getErpUrl(`/api/resource/Item Price?${new URLSearchParams({
          fields: JSON.stringify(["name"]),
          filters: JSON.stringify([["item_code", "=", itemCode]]),
          limit_page_length: "50",
        }).toString()}`),
        { headers: getErpHeaders() }
      );

      if (itemPriceRes.ok) {
        const itemPriceJson: any = await itemPriceRes.json();
        for (const row of itemPriceJson.data || []) {
          if (row?.name) {
            await erpFetch(getErpUrl(`/api/resource/Item Price/${encodeURIComponent(row.name)}`), {
              method: "DELETE",
              headers: getErpHeaders(),
            }).catch(() => {});
          }
        }
      }
    } catch {
      // non-fatal
    }

    // 5. Remove Bin inventory records tied to this item
    try {
      const binRes = await erpFetch(
        getErpUrl(`/api/resource/Bin?${new URLSearchParams({
          fields: JSON.stringify(["name"]),
          filters: JSON.stringify([["item_code", "=", itemCode]]),
          limit_page_length: "50",
        }).toString()}`),
        { headers: getErpHeaders() }
      );

      if (binRes.ok) {
        const binJson: any = await binRes.json();
        for (const row of binJson.data || []) {
          if (row?.name) {
            await erpFetch(getErpUrl(`/api/resource/Bin/${encodeURIComponent(row.name)}`), {
              method: "DELETE",
              headers: getErpHeaders(),
            }).catch(() => {});
          }
        }
      }
    } catch {
      // non-fatal
    }

    // 6. Delete the actual Item document
    let erpRes = await erpFetch(getErpUrl(`/api/resource/Item/${encodeURIComponent(itemCode)}`), {
      method: "DELETE",
      headers: getErpHeaders(),
    });

    if (!erpRes.ok) {
      // If resource DELETE failed, attempt frappe.client.delete method
      const clientDelRes = await erpFetch(getErpUrl("/api/method/frappe.client.delete"), {
        method: "POST",
        headers: getErpHeaders(),
        body: JSON.stringify({ doctype: "Item", name: itemCode }),
      }).catch(() => null);

      if (clientDelRes && clientDelRes.ok) {
        itemCache.clear();
        res.json({ success: true, message: `Item ${itemCode} deleted successfully.` });
        return;
      }

      const err = (await erpRes.json().catch(() => ({}))) as any;
      res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to delete item from ERPNext." });
      return;
    }

    itemCache.clear();
    res.json({ success: true, message: `Item ${itemCode} deleted successfully.` });
  } catch (err: any) {
    logger.error({ err }, "[items/:name.DELETE]");
    res.status(500).json({ error: err.message || "Failed to delete item." });
  }
});

// ─── GET /api/items/version ───────────────────────────────────────────────────
router.get("/items/version", (_req, res) => {
  res.json({ version: itemCache.getVersion() });
});

// ─── GET /api/items ───────────────────────────────────────────────────────────
router.get("/items", async (req, res) => {
  try {
    const { search, limit = "60", _t } = req.query as {
      search?: string;
      limit?: string;
      _t?: string;
    };

    const bustCache = Boolean(_t);
    const cacheKey = `website_items:${search ?? ""}:${limit}`;
    const cached = !bustCache && itemCache.get(cacheKey);

    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("X-Cache-Version", String(itemCache.getVersion()));
      res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=300");
      res.json({ data: cached, version: itemCache.getVersion() });
      return;
    }

    const normalized = await ErpAdapter.fetchWebsiteItems({ search, limit });

    itemCache.set(cacheKey, normalized);

    res.setHeader("X-Cache", "MISS");
    res.setHeader("X-Cache-Version", String(itemCache.getVersion()));
    res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=300");
    res.json({ data: normalized, version: itemCache.getVersion() });
  } catch (err) {
    logger.error({ err }, "[items]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── CATEGORIES (Item Groups) ─────────────────────────────────────────────────

// GET /api/items/groups
router.get("/items/groups", async (_req, res) => {
  try {
    const cacheKey = "item_groups";
    const cached = itemCache.get(cacheKey);

    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=300");
      res.json({ data: cached });
      return;
    }

    const normalized = await ErpAdapter.fetchItemGroups();

    itemCache.set(cacheKey, normalized);

    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=300");
    res.json({ data: normalized });
  } catch (err) {
    logger.error({ err }, "[items/groups]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// POST /api/items/groups
router.post("/items/groups", async (req: Request, res: Response) => {
  try {
    const { item_group_name, name, parent_item_group = "All Item Groups", is_group = 0, description, image } = req.body;
    const groupName = item_group_name || name;

    if (!groupName) {
      res.status(400).json({ error: "Category name is required." });
      return;
    }

    const payload = {
      doctype: "Item Group",
      item_group_name: groupName,
      parent_item_group,
      is_group: Number(is_group) || 0,
      description,
      image,
    };

    const erpRes = await erpFetch(getErpUrl("/api/resource/Item Group"), {
      method: "POST",
      headers: getErpHeaders(),
      body: JSON.stringify(payload),
    });

    if (!erpRes.ok) {
      const err = (await erpRes.json().catch(() => ({}))) as any;
      res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to create category in ERPNext." });
      return;
    }

    itemCache.clear();
    const data: any = await erpRes.json();
    res.status(201).json({ data: data.data });
  } catch (err: any) {
    logger.error({ err }, "[items/groups.POST]");
    res.status(500).json({ error: err.message || "Failed to create category." });
  }
});

// PUT /api/items/groups/:name
router.put("/items/groups/:name", async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const erpRes = await erpFetch(
      getErpUrl(`/api/resource/Item Group/${encodeURIComponent(name)}`),
      {
        method: "PUT",
        headers: getErpHeaders(),
        body: JSON.stringify(req.body),
      }
    );

    if (!erpRes.ok) {
      const err = (await erpRes.json().catch(() => ({}))) as any;
      res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to update category." });
      return;
    }

    itemCache.clear();
    const data: any = await erpRes.json();
    res.json({ data: data.data });
  } catch (err: any) {
    logger.error({ err }, "[items/groups/:name.PUT]");
    res.status(500).json({ error: err.message || "Failed to update category." });
  }
});

// DELETE /api/items/groups/:name
router.delete("/items/groups/:name", async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const erpRes = await erpFetch(
      getErpUrl(`/api/resource/Item Group/${encodeURIComponent(name)}`),
      {
        method: "DELETE",
        headers: getErpHeaders(),
      }
    );

    if (!erpRes.ok) {
      const err = (await erpRes.json().catch(() => ({}))) as any;
      res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to delete category." });
      return;
    }

    itemCache.clear();
    res.json({ success: true, message: `Category ${name} deleted successfully.` });
  } catch (err: any) {
    logger.error({ err }, "[items/groups/:name.DELETE]");
    res.status(500).json({ error: err.message || "Failed to delete category." });
  }
});

// ─── GET /api/items/:name ─────────────────────────────────────────────────────
router.get("/items/:name", async (req, res) => {
  try {
    const { name } = req.params;
    const { _t } = req.query as { _t?: string };
    const bustCache = Boolean(_t);

    const cacheKey = `website_item:${name}`;

    const cached = !bustCache && itemCache.get(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=300");
      res.json({ data: cached });
      return;
    }

    const normalized = await ErpAdapter.fetchWebsiteItemDetails(name);

    itemCache.set(cacheKey, normalized);
    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=300");
    res.json({ data: normalized });
  } catch (err) {
    logger.error({ err }, "[items/:name]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/items/image/* ────────────────────────────────────────────
router.get("/items/image/*", async (req, res) => {
  try {
    const filepath = (req.params as { [key: string]: string })["0"];
    if (!filepath) {
      res.status(400).json({ error: "File path required." });
      return;
    }
    const result = await ErpAdapter.proxyFile(filepath);

    if (!result.ok) {
      res.status(404).json({ error: "Image not found." });
      return;
    }

    res.setHeader("Content-Type", result.contentType || "image/jpeg");
    res.setHeader("Cache-Control", "public, max-age=86400");
    res.send(result.buffer);
  } catch (err) {
    logger.error({ err }, "[items/image]");
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
