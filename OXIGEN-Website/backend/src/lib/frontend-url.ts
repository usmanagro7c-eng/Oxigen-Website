/**
 * frontend-url.ts — canonical frontend base URL for outbound links (emails, redirects, etc.)
 *
 * FRONTEND_URL may historically hold a comma-separated CORS list. Take the first
 * entry so a stray extra origin can never corrupt a generated link again.
 */
export function getFrontendBaseUrl(): string {
  const firstEntry = (process.env["FRONTEND_URL"] ?? "http://localhost:5173").split(",")[0];
  return firstEntry.trim().replace(/\/$/, "");
}