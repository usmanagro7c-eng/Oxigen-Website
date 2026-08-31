import type { Request, Response } from "express";
import { customerService } from "../services/customer.service.js";
import { assertOwner } from "../middlewares/requireAuth.js";

/**
 * CustomerController — thin request/response glue for customer routes.
 */
export const customerController = {
  // ── GET /api/user/profile ──────────────────────────────────────────────────

  async getProfile(req: Request, res: Response): Promise<void> {
    const email = req.query["email"] as string | undefined;
    if (!email) { res.status(400).json({ error: "email query param required." }); return; }
    if (!assertOwner(req, res, email)) return;

    const result = await customerService.getProfile(email);
    if (result.error) { res.status(400).json(result); return; }
    res.json(result);
  },

  async updateProfile(req: Request, res: Response): Promise<void> {
    const { email, ...patch } = req.body as { email?: string; [key: string]: unknown };
    if (!email) { res.status(400).json({ error: "email is required in request body." }); return; }
    if (!assertOwner(req, res, email)) return;

    const result = await customerService.updateProfile(email, patch);
    if (result.error) { res.status(400).json(result); return; }
    res.json(result);
  },

  // ── Addresses ──────────────────────────────────────────────────────────────

  async getAddresses(req: Request, res: Response): Promise<void> {
    const email = req.query["email"] as string | undefined;
    if (!email) { res.status(400).json({ error: "email query param required." }); return; }
    if (!assertOwner(req, res, email)) return;

    const result = await customerService.getAddresses(email);
    if (result.error) { res.status(400).json(result); return; }
    res.json(result);
  },

  async createAddress(req: Request, res: Response): Promise<void> {
    const email = req.loggedInEmail!;
    const result = await customerService.createAddress(email, req.body);
    if (result.error) { res.status(400).json(result); return; }
    res.json(result);
  },

  async updateAddress(req: Request, res: Response): Promise<void> {
    const { name } = req.params;
    const email = req.loggedInEmail!;
    const result = await customerService.updateAddress(name!, email, req.body);
    if (result.error) { res.status((result as any).status || 400).json(result); return; }
    res.json(result);
  },

  async deleteAddress(req: Request, res: Response): Promise<void> {
    const { name } = req.params;
    const email = req.loggedInEmail!;
    const result = await customerService.deleteAddress(name!, email);
    if (result.error) { res.status((result as any).status || 400).json(result); return; }
    res.json(result);
  },

  // ── Orders ─────────────────────────────────────────────────────────────────

  async getOrders(req: Request, res: Response): Promise<void> {
    const email = req.query["email"] as string | undefined;
    if (!email) { res.status(400).json({ error: "email query param required." }); return; }
    if (!assertOwner(req, res, email)) return;

    const result = await customerService.getOrders(email);
    if (result.error) { res.status(400).json(result); return; }
    res.json(result);
  },

  async getOrderDetail(req: Request, res: Response): Promise<void> {
    const { name } = req.params;
    const email = req.loggedInEmail!;
    const result = await customerService.getOrderDetail(name!, email);
    if (result.error) { res.status((result as any).status || 400).json(result); return; }
    res.json(result);
  },
};
