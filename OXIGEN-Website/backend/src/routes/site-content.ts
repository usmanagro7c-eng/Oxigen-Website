import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger.js";
import { itemCache } from "../lib/item-cache.js";
import { readContent } from "../lib/content-store.js";

const router: IRouter = Router();

// GET /api/site-content
// Public endpoint: returns the full website content document managed by the
// content editor. Cached briefly.
router.get("/site-content", async (_req: Request, res: Response) => {
  try {
    const cacheKey = "site-content";
    const cached = itemCache.get(cacheKey) as { content: unknown; version: number } | null;
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      res.json({ data: cached.content, version: cached.version });
      return;
    }

    const doc = readContent();
    const content = doc ?? null;
    const version = content && typeof content === "object" ? (content as any).version ?? 0 : 0;

    itemCache.set(cacheKey, { content, version }, 30 * 1000);
    res.setHeader("X-Cache", "MISS");
    res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
    res.json({ data: content, version });
  } catch (err: any) {
    logger.error({ err }, "[site-content]");
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;