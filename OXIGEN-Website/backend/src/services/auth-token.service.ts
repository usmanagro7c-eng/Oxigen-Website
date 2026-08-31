import * as crypto from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { logger } from "../lib/logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../../data");
const TOKEN_FILE = resolve(DATA_DIR, "auth-tokens.json");

interface TokenEntry {
  email: string;
  expires: number;
}

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function loadTokenStore(): Map<string, TokenEntry> {
  try {
    ensureDataDir();
    if (!existsSync(TOKEN_FILE)) return new Map();
    const raw = readFileSync(TOKEN_FILE, "utf-8");
    const obj = JSON.parse(raw) as Record<string, TokenEntry>;
    return new Map(Object.entries(obj));
  } catch {
    return new Map();
  }
}

function saveTokenStore(store: Map<string, TokenEntry>): void {
  try {
    ensureDataDir();
    const tmp = TOKEN_FILE + ".tmp";
    writeFileSync(tmp, JSON.stringify(Object.fromEntries(store)), "utf-8");
    renameSync(tmp, TOKEN_FILE);
  } catch {
    // non-fatal
  }
}

function hashToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

const tokenStore = loadTokenStore();

// Cleanup expired tokens every hour
setInterval(() => {
  const now = Date.now();
  let changed = false;
  for (const [key, entry] of tokenStore) {
    if (entry.expires < now) { tokenStore.delete(key); changed = true; }
  }
  if (changed) saveTokenStore(tokenStore);
}, 60 * 60 * 1000);

/**
 * AuthTokenService — manages password-set/reset tokens persisted to disk.
 */
export const authTokenService = {
  /**
   * Generate a token for setting or resetting a password.
   * @param email The user's email.
   * @param ttlMs Token time-to-live in milliseconds.
   * @returns The raw token string (to be sent via email), or null on failure.
   */
  generateToken(email: string, ttlMs: number): string | null {
    try {
      const rawToken = crypto.randomBytes(32).toString("hex");
      const hashedToken = hashToken(rawToken);

      tokenStore.set(hashedToken, {
        email,
        expires: Date.now() + ttlMs,
      });
      saveTokenStore(tokenStore);

      return rawToken;
    } catch (err) {
      logger.error({ err }, "[authTokenService.generateToken]");
      return null;
    }
  },

  /**
   * Verify and consume a password token.
   * @param rawToken The raw token from the URL.
   * @param email The expected email.
   * @returns true if the token is valid and not expired.
   */
  verifyToken(rawToken: string, email: string): boolean {
    const hashedToken = hashToken(rawToken);
    logger.info({ email, hashedToken, rawToken }, "[authTokenService.verifyToken] Attempting verification");
    const entry = tokenStore.get(hashedToken);

    if (!entry) {
      logger.warn({ email, hashedToken }, "[authTokenService.verifyToken] Token not found in store");
      return false;
    }

    if (entry.email !== email) {
      logger.warn({ email, tokenEmail: entry.email }, "[authTokenService.verifyToken] Email mismatch");
      return false;
    }

    if (entry.expires < Date.now()) {
      logger.warn({ email, expires: entry.expires, now: Date.now() }, "[authTokenService.verifyToken] Token expired");
      return false;
    }

    // Consume the token (one-time use)
    tokenStore.delete(hashedToken);
    saveTokenStore(tokenStore);
    logger.info({ email }, "[authTokenService.verifyToken] Token verified and consumed");
    return true;
  },

  /**
   * Delete a token without consuming it (e.g., on rollback).
   */
  deleteToken(rawToken: string): void {
    const hashedToken = hashToken(rawToken);
    tokenStore.delete(hashedToken);
    saveTokenStore(tokenStore);
  },
};
