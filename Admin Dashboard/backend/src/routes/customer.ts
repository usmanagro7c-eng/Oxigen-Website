import { Router, type IRouter, type Request, type Response } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { frappeService } from "../services/frappe.service.js";
import { logger } from "../lib/logger.js";

const router: IRouter = Router();

// ─── GET /api/customer/profile ───────────────────────────────────────────────
router.get("/customer/profile", requireAuth, async (req: Request, res: Response) => {
  const email = req.loggedInEmail!;
  try {
    const result = await frappeService.getCustomerProfile(email);
    if (result.error) { res.status((result as { status?: number }).status || 400).json(result); return; }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "[customer/profile GET]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PUT /api/customer/profile ────────────────────────────────────────────────
router.put("/customer/profile", requireAuth, async (req: Request, res: Response) => {
  const email = req.loggedInEmail!;
  try {
    // Also update User doc for fields like full_name, mobile_no
    const { customer_name, mobile_no } = req.body as Record<string, unknown>;
    const userPatch: Record<string, unknown> = {};
    if (customer_name) {
      userPatch.full_name = customer_name;
      const parts = (customer_name as string).trim().split(/\s+/);
      userPatch.first_name = parts[0];
      if (parts.length > 1) userPatch.last_name = parts.slice(1).join(" ");
    }
    if (mobile_no) {
      userPatch.mobile_no = mobile_no;
      userPatch.phone = mobile_no;
    }
    if (Object.keys(userPatch).length > 0) {
      try {
        await frappeService.updateProfile(email, userPatch);
      } catch (err) {
        logger.error({ err }, "[customer/profile PUT] updateProfile failed");
      }
    }

    const result = await frappeService.updateCustomerProfile(email, req.body as Record<string, unknown>);
    if (result.error) { res.status((result as { status?: number }).status || 400).json(result); return; }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "[customer/profile PUT]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/customer/orders ─────────────────────────────────────────────────
router.get("/customer/orders", requireAuth, async (req: Request, res: Response) => {
  const email = req.loggedInEmail!;
  try {
    const result = await frappeService.getOrders(email);
    if (result.error) { res.status(400).json(result); return; }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "[customer/orders GET]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/customer/addresses ──────────────────────────────────────────────
router.get("/customer/addresses", requireAuth, async (req: Request, res: Response) => {
  const email = req.loggedInEmail!;
  try {
    const result = await frappeService.getAddresses(email);
    if (result.error) { res.status(400).json(result); return; }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "[customer/addresses GET]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/customer/addresses ─────────────────────────────────────────────
router.post("/customer/addresses", requireAuth, async (req: Request, res: Response) => {
  const email = req.loggedInEmail!;
  try {
    const result = await frappeService.createAddress(email, req.body as Record<string, unknown>);
    if (result.error) { res.status(400).json(result); return; }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "[customer/addresses POST]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── PUT /api/customer/addresses/:name ────────────────────────────────────────
router.put("/customer/addresses/:name", requireAuth, async (req: Request, res: Response) => {
  const email = req.loggedInEmail!;
  const { name } = req.params;
  try {
    const result = await frappeService.updateAddress(name as string, email, req.body as Record<string, unknown>);
    if (result.error) { res.status((result as { status?: number }).status || 400).json(result); return; }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "[customer/addresses PUT]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── DELETE /api/customer/addresses/:name ─────────────────────────────────────
router.delete("/customer/addresses/:name", requireAuth, async (req: Request, res: Response) => {
  const email = req.loggedInEmail!;
  const { name } = req.params;
  try {
    const result = await frappeService.deleteAddress(name as string, email);
    if (result.error) { res.status((result as { status?: number }).status || 400).json(result); return; }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "[customer/addresses DELETE]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/customer/change-password ───────────────────────────────────────
router.post("/customer/change-password", requireAuth, async (req: Request, res: Response) => {
  const email = req.loggedInEmail!;
  const { old_password, new_password } = req.body as { old_password?: string; new_password?: string };

  if (!old_password || !new_password) {
    res.status(400).json({ error: "old_password and new_password are required." });
    return;
  }
  if (new_password.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters." });
    return;
  }

  try {
    const result = await frappeService.changePassword(email, old_password, new_password);
    if (result.error) { res.status(400).json(result); return; }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "[customer/change-password]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── POST /api/customer/profile-image ─────────────────────────────────────────
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

router.post("/customer/profile-image", requireAuth, upload.single("image"), async (req: Request, res: Response) => {
  const email = req.loggedInEmail!;

  if (!req.file) {
    res.status(400).json({ error: "Image file required." });
    return;
  }

  try {
    const result = await frappeService.uploadProfileImage(email, req.file.originalname, req.file.buffer);
    if (result.error) { res.status(400).json(result); return; }
    res.json(result);
  } catch (err) {
    logger.error({ err }, "[customer/profile-image POST]");
    res.status(500).json({ error: "Internal server error." });
  }
});

// ─── GET /api/customer/wishlist ───────────────────────────────────────────────
router.get("/customer/wishlist", requireAuth, async (_req: Request, res: Response) => {
  res.json({ data: [] });
});

// ─── GET /api/customer/cart ───────────────────────────────────────────────────
router.get("/customer/cart", requireAuth, async (_req: Request, res: Response) => {
  res.json({ data: [] });
});

export default router;
