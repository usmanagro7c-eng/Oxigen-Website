import { Router, type IRouter, type Request, type Response } from "express";
import { logger } from "../lib/logger.js";
import { readContent, updateSection, writeContent } from "../lib/content-store.js";
import { CONTENT_SECTIONS } from "../lib/content.default.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";

const router: IRouter = Router();

router.use(requireAuth);
router.use(requireAdmin);

// GET /api/admin/content — full content document
router.get("/admin/content", async (_req: Request, res: Response) => {
  try {
    res.json({ data: readContent() });
  } catch (err: any) {
    logger.error({ err }, "[admin/content.GET]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// GET /api/admin/content/:section — single section
router.get("/admin/content/:section", async (req: Request, res: Response) => {
  try {
    const { section } = req.params;
    if (!(CONTENT_SECTIONS as readonly string[]).includes(section)) {
      res.status(400).json({ error: `Unknown section: ${section}` });
      return;
    }
    const doc = readContent() as Record<string, unknown>;
    res.json({ data: doc[section] });
  } catch (err: any) {
    logger.error({ err }, "[admin/content.section.GET]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// PUT /api/admin/content/:section — replace a single section (version++)
router.put("/admin/content/:section", async (req: Request, res: Response) => {
  try {
    const { section } = req.params;
    if (!(CONTENT_SECTIONS as readonly string[]).includes(section)) {
      res.status(400).json({ error: `Unknown section: ${section}` });
      return;
    }
    const value = req.body?.data ?? req.body;
    if (value === undefined || value === null) {
      res.status(400).json({ error: "Body required." });
      return;
    }
    updateSection(section as any, value);
    res.json({ data: readContent() });
  } catch (err: any) {
    logger.error({ err }, "[admin/content.section.PUT]");
    res.status(500).json({ error: err.message || "Internal server error." });
  }
});

// GET /api/admin/content/pages/* — nested path under pages (e.g. reviews, legal/terms)
router.get("/admin/content/pages/*", async (req: Request, res: Response) => {
  try {
    const path = req.params[0] ?? "";
    const doc = readContent() as any;
    let value: unknown;
    if (path.includes("/")) {
      const [group, key] = path.split("/");
      value = doc.pages?.[group]?.[key];
    } else {
      value = doc.pages?.[path];
    }
    if (value === undefined) {
      res.status(404).json({ error: `Page not found: ${path}` });
      return;
    }
    res.json({ data: value });
  } catch (err: any) {
    logger.error({ err }, "[admin/content.pages.GET]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// PUT /api/admin/content/pages/* — nested path under pages (e.g. reviews, legal/terms)
router.put("/admin/content/pages/*", async (req: Request, res: Response) => {
  try {
    const path = req.params[0] ?? "";
    const value = req.body?.data ?? req.body;
    const doc = readContent() as any;

    if (path.includes("/")) {
      const [group, key] = path.split("/");
      if (!doc.pages?.[group]) {
        res.status(400).json({ error: `Unknown pages group: ${group}` });
        return;
      }
      doc.pages[group][key] = value;
    } else {
      if (!doc.pages) doc.pages = {};
      doc.pages[path] = value;
    }
    writeContent(doc);
    res.json({ data: readContent() });
  } catch (err: any) {
    logger.error({ err }, "[admin/content.pages.PUT]");
    res.status(500).json({ error: err.message || "Internal server error." });
  }
});

export default router;
