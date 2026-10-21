import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger.js";
import { readContent } from "../lib/content-store.js";

const router: IRouter = Router();

// GET /api/site-content
// Public endpoint: returns the full website content document managed by the
// content editor. Served fresh (no caching) so admin edits reflect immediately.
router.get("/site-content", async (_req: Request, res: Response) => {
  try {
    const doc = readContent();
    const content = doc ?? null;
    const version = content && typeof content === "object" ? (content as any).version ?? 0 : 0;

    // No caching — admin edits must reflect on the website immediately.
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.json({ data: content, version });
  } catch (err: any) {
    logger.error({ err }, "[site-content]");
    res.status(500).json({ error: "Internal server error." });
  }
});

export default router;
