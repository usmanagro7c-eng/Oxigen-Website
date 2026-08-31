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
    const { item_name, item_group, standard_rate, description, image, stock_uom } = req.body;

    const itemPayload: Record<string, any> = {};
    if (item_name !== undefined) itemPayload.item_name = item_name;
    if (item_group !== undefined) itemPayload.item_group = item_group;
    if (standard_rate !== undefined) itemPayload.standard_rate = Number(standard_rate);
    if (description !== undefined) itemPayload.description = description;
    if (image !== undefined) itemPayload.image = image;
    if (stock_uom !== undefined) itemPayload.stock_uom = stock_uom;

    const erpRes = await erpFetch(
      getErpUrl(`/api/resource/Item/${encodeURIComponent(name)}`),
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

    // Also update Website Item if it exists
    try {
      await erpFetch(
        getErpUrl(`/api/resource/Website Item/${encodeURIComponent(name)}`),
        {
          method: "PUT",
          headers: getErpHeaders(),
          body: JSON.stringify({
            ...(item_name ? { web_item_name: item_name } : {}),
            ...(description ? { description, short_description: description } : {}),
            ...(image ? { website_image: image } : {}),
          }),
        }
      );
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

    itemCache.clear();
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

    // First delete associated Website Item if exists
    await erpFetch(getErpUrl(`/api/resource/Website Item/${encodeURIComponent(name)}`), {
      method: "DELETE",
      headers: getErpHeaders(),
    }).catch(() => {});

    // Delete Item
    const erpRes = await erpFetch(getErpUrl(`/api/resource/Item/${encodeURIComponent(name)}`), {
      method: "DELETE",
      headers: getErpHeaders(),
    });

    if (!erpRes.ok) {
      const err = (await erpRes.json().catch(() => ({}))) as any;
      res.status(erpRes.status).json({ error: parseErpError(err) || "Failed to delete item from ERPNext." });
      return;
    }

    itemCache.clear();
    res.json({ success: true, message: `Item ${name} deleted successfully.` });
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
