import * as crypto from "crypto";
import { logger } from "./logger.js";

/**
 * Stateless signed session cookie for the website backend.
 *
 * ERPNext's `frappe.auth.get_logged_user` is not whitelisted in the current
 * ERPNext build, so /api/auth/me cannot resolve a user from the forwarded
 * `sid` cookie alone. This module signs our own `oxi_session` cookie at login
 * time (HMAC + expiry) so session hydration keeps working without an
 * ERPNext round-trip.
 */

const SESSION_SECRET =
  process.env["SESSION_SECRET"] ??
  process.env["WEBHOOK_SECRET"] ??
  "oxigen-dev-session-secret";

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

function sign(email: string): string {
  const exp = Date.now() + TTL_MS;
  const payload = `${email}.${exp}`;
  const mac = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${mac}`;
}

function verify(token: string): string | null {
  try {
    const [b64, mac] = token.split(".");
    if (!b64 || !mac) return null;
    const payload = Buffer.from(b64, "base64url").toString("utf8");
    const expected = crypto.createHmac("sha256", SESSION_SECRET).update(payload).digest("hex");
    const a = Buffer.from(mac, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const dot = payload.lastIndexOf(".");
    if (dot < 0) return null;
    const email = payload.slice(0, dot);
    const exp = Number(payload.slice(dot + 1));
    if (!email || !Number.isFinite(exp) || exp < Date.now()) return null;
    return email;
  } catch (err) {
    logger.warn({ err }, "[sessionSigner.verify] failed to verify session token");
    return null;
  }
}

const COOKIE_PATTERNS = [
  /(?:^|;\s*)oxi_session=([^;]+)/,
  /(?:^|;\s*)oxi_admin_session=([^;]+)/,
];

/** Read + verify the `oxi_session`/`oxi_admin_session` cookie. Returns the email or null. */
export function parseSessionEmail(cookieHeader?: string): string | null {
  if (!cookieHeader) return null;
  for (const pattern of COOKIE_PATTERNS) {
    const match = pattern.exec(cookieHeader);
    if (match && match[1]) {
      const email = verify(decodeURIComponent(match[1]));
      if (email) return email;
    }
  }
  return null;
}

const isSecure = () => (process.env["FRONTEND_ORIGIN"] ?? "").startsWith("https://");

/** Build a Set-Cookie value for a freshly signed session. */
export function buildSessionCookie(email: string): string {
  const token = sign(email);
  return `oxi_session=${token}; Max-Age=${Math.floor(TTL_MS / 1000)}; Path=/; HttpOnly; SameSite=Lax${isSecure() ? "; Secure" : ""}`;
}

/** Build a Set-Cookie value for a freshly signed admin session. */
export function buildAdminSessionCookie(email: string): string {
  const token = sign(email);
  return `oxi_admin_session=${token}; Max-Age=${Math.floor(TTL_MS / 1000)}; Path=/; HttpOnly; SameSite=Lax${isSecure() ? "; Secure" : ""}`;
}

/** Build a Set-Cookie value that clears the session. */
export function clearSessionCookie(): string {
  return `oxi_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${isSecure() ? "; Secure" : ""}`;
}

/** Build a Set-Cookie value that clears the admin session. */
export function clearAdminSessionCookie(): string {
  return `oxi_admin_session=; Max-Age=0; Path=/; HttpOnly; SameSite=Lax${isSecure() ? "; Secure" : ""}`;
}