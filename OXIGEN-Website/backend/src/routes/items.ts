import { Router, type IRouter } from "express";
import { itemCache } from "../lib/item-cache.js";
import { logger } from "../lib/logger.js";
import { ErpAdapter } from "../services/erp-adapter.js";

const router: IRouter = Router();

// ─── GET /api/items/version ───────────────────────────────────────────────────
router.get("/items/version", (_req, res) => {
  res.json({ version: itemCache.getVersion() });
});

// ─── GET /api/items ───────────────────────────────────────────────────────────
router.get("/items", async (req, res) => {
  try {
    const { search, limit = "60", item_group, _t } = req.query as {
      search?: string;
      limit?: string;
      item_group?: string;
      _t?: string;
    };

    const bustCache = Boolean(_t);
    const cacheKey = `website_items:${search ?? ""}:${limit}:${item_group ?? ""}`;
    const cached = !bustCache && itemCache.get(cacheKey);

    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("X-Cache-Version", String(itemCache.getVersion()));
      res.setHeader("Cache-Control", "public, max-age=120, stale-while-revalidate=300");
      res.json({ data: cached, version: itemCache.getVersion() });
      return;
    }

    const normalized = await ErpAdapter.fetchWebsiteItems({ search, limit, itemGroup: item_group });

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

// ─── GET /api/items/groups ────────────────────────────────────────────────────
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
