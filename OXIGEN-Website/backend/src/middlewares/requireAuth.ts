import { logger } from "../lib/logger.js";
import type { Request, Response, NextFunction } from "express";
import { getErpUrl, erpFetch} from "../lib/erpnext-client.js";

// Add loggedInEmail field to the Express Request type
declare global {
  namespace Express {
    interface Request {
      loggedInEmail?: string;
    }
  }
}

/**
 * Middleware: verify the logged-in user via the ERPNext session cookie.
 * If the session is invalid, return 401.
 * If valid, set req.loggedInEmail — routes use this for authorization.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const erpRes = await erpFetch(
      getErpUrl("/api/method/frappe.auth.get_logged_user"),
      {
        headers: {
          "Content-Type": "application/json",
          Cookie: req.headers.cookie ?? "",
        },
      },
    );

    if (!erpRes.ok) {
      res.status(401).json({ error: "Login required." });
      return;
    }

    const data = (await erpRes.json()) as { message?: string };
    const email = data.message;

    if (!email || email === "Guest") {
      res.status(401).json({ error: "Login required." });
      return;
    }

    req.loggedInEmail = email;
    next();
  } catch (err) {
    logger.error({ err: err }, "[requireAuth]");
    res.status(401).json({ error: "Authentication failed." });
  }
}

/**
 * Helper: Ensure karo ke requested email = logged-in user ka email.
 * Agar match na kare toh 403 Forbidden return karo.
 * Admin users ko bypass milta hai (future use ke liye).
 */
export function assertOwner(
  req: Request,
  res: Response,
  requestedEmail: string,
): boolean {
  if (req.loggedInEmail !== requestedEmail) {
    res.status(403).json({ error: "Access denied." });
    return false;
  }
  return true;
}
