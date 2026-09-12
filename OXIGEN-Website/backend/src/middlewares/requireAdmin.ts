import type { Request, Response, NextFunction } from "express";
import { getErpUrl, erpFetch, getErpHeaders } from "../lib/erpnext-client.js";
import { logger } from "../lib/logger.js";

/**
 * requireAdmin middleware
 *
 * Checks that the logged-in user (set by requireAuth) is a System User in
 * ERPNext. ADMIN_EMAIL / ADMIN_EMAILS env values are kept as a secondary
 * allow-list so the merge stays backward compatible with the website's
 * previous role check.
 *
 * Usage: router.get("/admin/...", requireAuth, requireAdmin, handler)
 *
 * Logic:
 * 1. Get logged-in email from req.loggedInEmail (set by requireAuth)
 * 2. Fetch user from ERPNext
 * 3. Check if user.user_type === "System User"
 * 4. Allow access if yes, deny if no
 */
export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const email = req.loggedInEmail;

    if (!email) {
      res.status(401).json({ error: "Login required." });
      return;
    }

    // Secondary allow-list (env) — evaluated before the ERPNext round-trip so
    // admins still work even when ERPNext is unreachable.
    const fromList = (process.env["ADMIN_EMAILS"] ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const fromSingle = (process.env["ADMIN_EMAIL"] ?? "").trim();
    const envAdmins = [...fromList, ...(fromSingle ? [fromSingle] : [])];
    if (envAdmins.includes(email)) {
      next();
      return;
    }

    // Fetch user from ERPNext
    const userRes = await erpFetch(
      getErpUrl(`/api/resource/User/${encodeURIComponent(email)}`),
      {
        headers: getErpHeaders(),
      }
    );

    if (!userRes.ok) {
      logger.warn({ email }, "[requireAdmin] User not found in ERPNext");
      res.status(403).json({ error: "Access denied. User not found." });
      return;
    }

    const userData = (await userRes.json()) as {
      data?: { user_type?: string; enabled?: number };
    };

    const user = userData.data;

    if (!user) {
      logger.warn({ email }, "[requireAdmin] No user data returned");
      res.status(403).json({ error: "Access denied. Invalid user data." });
      return;
    }

    // Check if user is enabled
    if (user.enabled === 0) {
      logger.warn({ email }, "[requireAdmin] User is disabled");
      res.status(403).json({ error: "Access denied. User account is disabled." });
      return;
    }

    // Check if user is System User
    if (user.user_type !== "System User") {
      logger.info({ email, user_type: user.user_type }, "[requireAdmin] Non-System User tried to access admin");
      res.status(403).json({
        error: "Access denied. Only System Users can access admin dashboard.",
      });
      return;
    }

    // User is a System User, allow access
    logger.debug({ email }, "[requireAdmin] System User allowed access");
    next();
  } catch (error) {
    logger.error({ error }, "[requireAdmin] Error checking user type");
    res.status(500).json({ error: "Internal server error while checking permissions." });
  }
}