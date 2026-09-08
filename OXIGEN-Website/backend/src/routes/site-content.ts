import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger.js";
import { itemCache } from "../lib/item-cache.js";

const router: IRouter = Router();

// GET /api/site-content
// Public endpoint: returns the full website content document managed by the
// admin backend. Cached briefly. If the admin backend is unreachable, returns
// { data: null } so the frontend falls back to its embedded static content.
router.get("/site-content", async (_req: Request, res: Response) => {
  try {
    const cacheKey = "site-content";
    const cached = itemCache.get(cacheKey) as
      | { content: unknown[] | null; version: number }
      | null;
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.setHeader("Cache-Control", "public, max-age=60, stale-while-revalidate=300");
      res.json({ data: cached.content, version: cached.version });
      return;
    }

    const adminUrl = process.env["ADMIN_API_URL"] || "http://localhost:3001/api";
    const adminRes = await fetch(`${adminUrl}/admin/content`).catch(() => null);

    if (!adminRes || !adminRes.ok) {
      res.setHeader("X-Cache", "MISS");
      res.setHeader("Cache-Control", "public, max-age=30");
      res.json({ data: null, version: 0 });
      return;
    }

    const adminData: any = await adminRes.json().catch(() => ({ data: null }));
    const content = adminData?.data ?? null;
    const version =
      content && typeof content === "object" ? (content as any).version ?? 0 : 0;

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
