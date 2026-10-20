import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";

/**
 * hidden-orders.ts — per-customer list of orders hidden from their dashboard.
 *
 * "Remove Order" in the customer dashboard cannot physically delete a Sales
 * Order: ERPNext refuses to delete an order once a Sales Invoice (and its
 * Stock Ledger Entries) reference it, and that accounting trail must be kept.
 * Removing from the customer's view is therefore a soft delete — the documents
 * stay in ERPNext, the customer simply stops seeing the order in their list.
 *
 * Stored in `data/hidden-orders.json` as `{ "<email>": ["SO-0001", ...] }`.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../../data");
const FILE = resolve(DATA_DIR, "hidden-orders.json");

type HiddenStore = Record<string, string[]>;

function ensureDataDir(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function load(): HiddenStore {
  try {
    ensureDataDir();
    if (!existsSync(FILE)) return {};
    const parsed = JSON.parse(readFileSync(FILE, "utf8")) as HiddenStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

const store: HiddenStore = load();

function persist(): void {
  try {
    ensureDataDir();
    const tmp = `${FILE}.tmp`;
    writeFileSync(tmp, JSON.stringify(store, null, 2), "utf8");
    renameSync(tmp, FILE);
  } catch (err) {
    logger.error({ err }, "[hidden-orders] persist failed");
  }
}

export const hiddenOrders = {
  /** Hide an order from the given customer's dashboard. */
  hide(email: string, orderName: string): void {
    const key = email.toLowerCase();
    const list = store[key] ?? [];
    if (!list.includes(orderName)) {
      list.push(orderName);
      store[key] = list;
      persist();
    }
  },

  /** Reveal a previously hidden order. */
  unhide(email: string, orderName: string): void {
    const key = email.toLowerCase();
    const list = store[key];
    if (!list?.length) return;
    const next = list.filter((n) => n !== orderName);
    if (next.length) store[key] = next;
    else delete store[key];
    persist();
  },

  /** All order names hidden for this customer. */
  listFor(email: string): string[] {
    return store[email.toLowerCase()] ?? [];
  },

  /** True when this order is hidden from the customer's dashboard. */
  isHidden(email: string, orderName: string): boolean {
    return this.listFor(email).includes(orderName);
  },
};
