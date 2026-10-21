import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";

/**
 * hidden-addresses.ts — per-customer list of addresses hidden from their dashboard.
 *
 * "Delete Address" in the customer dashboard cannot physically delete an Address
 * that is referenced by a Sales Invoice / Sales Order (ERPNext raises a
 * link-exists error, and that accounting trail must be kept). Removing from the
 * customer's view is therefore a soft delete — the document stays in ERPNext,
 * the customer simply stops seeing the address in their saved list.
 *
 * Stored in `data/hidden-addresses.json` as `{ "<email>": ["ADDR-0001", ...] }`.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../../data");
const FILE = resolve(DATA_DIR, "hidden-addresses.json");

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
    logger.error({ err }, "[hidden-addresses] persist failed");
  }
}

export const hiddenAddresses = {
  hide(email: string, addressName: string): void {
    const key = email.toLowerCase();
    const list = store[key] ?? [];
    if (!list.includes(addressName)) {
      list.push(addressName);
      store[key] = list;
      persist();
    }
  },
  unhide(email: string, addressName: string): void {
    const key = email.toLowerCase();
    const list = store[key];
    if (!list?.length) return;
    const next = list.filter((n) => n !== addressName);
    if (next.length) store[key] = next;
    else delete store[key];
    persist();
  },
  listFor(email: string): string[] {
    return store[email.toLowerCase()] ?? [];
  },
  isHidden(email: string, addressName: string): boolean {
    return this.listFor(email).includes(addressName);
  },
};
