import type { Request, Response, NextFunction } from "express";

/**
 * requireAdmin middleware
 *
 * Checks that the logged-in user (set by requireAuth) is in the list of
 * admin email addresses.
 *
 * Usage: router.get("/admin/...", requireAuth, requireAdmin, handler)
 *
 * Set in your .env:
 *   ADMIN_EMAILS=admin1@example.com,admin2@example.com   (multiple admins)
 *   ADMIN_EMAIL=admin@example.com                         (single, fallback)
 */
export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const fromList = (process.env["ADMIN_EMAILS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const fromSingle = (process.env["ADMIN_EMAIL"] ?? "").trim();

  const admins = [...fromList, ...(fromSingle ? [fromSingle] : [])];

  if (admins.length === 0) {
    res.status(503).json({ error: "Admin access not configured." });
    return;
  }

  if (!admins.includes(req.loggedInEmail ?? "")) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }

  next();
}