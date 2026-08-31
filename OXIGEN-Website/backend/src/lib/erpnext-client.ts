/**
 * Shared helpers for all ERPNext API calls.
 * Centralises base-URL resolution and Authorization header construction
 * so individual route files stay focused on business logic.
 *
 * Uses a persistent undici Agent for connection pooling — this eliminates
 * the per-request TCP + TLS handshake overhead that caused 3-12s latency
 * on every ERPNext call.
 */

import { Agent, fetch as undiciFetch } from "undici";

// ---------------------------------------------------------------------------
// Connection pool — one persistent Agent for all ERPNext calls.
// connections: max simultaneous sockets to ERPNext (default 10 is enough).
// keepAliveTimeout: how long to keep idle connections open (ms).
// ---------------------------------------------------------------------------
const _erpAgent = new Agent({
  connections: 10,
  keepAliveTimeout: 30_000,
  keepAliveMaxTimeout: 60_000,
  connectTimeout: 10_000,
});

/**
 * Drop-in replacement for the global `fetch` that routes through the
 * connection pool. Use this for every ERPNext call instead of global fetch.
 */
export function erpFetch(
  url: string,
  init?: Parameters<typeof undiciFetch>[1],
): ReturnType<typeof undiciFetch> {
  return undiciFetch(url, { ...init, dispatcher: _erpAgent });
}

export function getErpUrl(path: string): string {
  const base = (process.env["ERPNEXT_URL"] ?? "").replace(/\/$/, "");
  return `${base}${path}`;
}

export function getErpHeaders(): Record<string, string> {
  const apiKey = process.env["ERPNEXT_API_KEY"] ?? "";
  const apiSecret = process.env["ERPNEXT_API_SECRET"] ?? "";
  return {
    "Content-Type": "application/json",
    Authorization: `token ${apiKey}:${apiSecret}`,
  };
}

/**
 * Ping ERPNext to check if it is reachable.
 * Returns true if ERPNext responds with 2xx, false on any error or timeout.
 * Timeout: 5 seconds.
 */
export async function pingErpNext(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5_000);
    const res = await erpFetch(getErpUrl("/api/method/ping"), {
      headers: getErpHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Parse ERPNext's nested `_server_messages` error format into a plain string.
 * Returns an empty string when the field is absent or unparseable.
 */
export function parseErpError(errData: { _server_messages?: string }): string {
  if (!errData._server_messages) return "";
  try {
    const arr = JSON.parse(errData._server_messages) as string[];
    const first = JSON.parse(arr[0] ?? "{}") as { message?: string };
    return (first.message ?? "")
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  } catch {
    return "";
  }
}

// ---------------------------------------------------------------------------
// Re-exports for backward compatibility — callers migrating to frappeService
// should use the service instead of these raw functions.
// ---------------------------------------------------------------------------
import { frappeService } from "../services/frappe.service.js";

export const findCustomerByEmail = (email: string) => frappeService.findCustomerByEmail(email);
export const createCustomerForEmail = (email: string, fullName: string) =>
  frappeService.createCustomerForEmail(email, fullName);
export const ensureAddressLinkedToCustomer = async (
  addressName: string,
  customerName: string,
): Promise<boolean> => {
  // Intentionally stubbed as the logic is now handled in order-queue.ts
  return true;
};