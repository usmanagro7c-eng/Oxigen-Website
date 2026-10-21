import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = resolve(__dirname, "../../data");
const FILE = resolve(DATA_DIR, "hidden-item-groups.json");

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
    logger.error({ err }, "[hidden-item-groups] persist failed");
  }
}

// Item groups are global (admin-managed), not per-user. Use a single "admin" key.
const KEY = "admin";

export const hiddenItemGroups = {
  hide(name: string): void {
    const list = store[KEY] ?? [];
    if (!list.includes(name)) {
      list.push(name);
      store[KEY] = list;
      persist();
    }
  },
  unhide(name: string): void {
    const list = store[KEY];
    if (!list?.length) return;
    const next = list.filter((n) => n !== name);
    if (next.length) store[KEY] = next;
    else delete store[KEY];
    persist();
  },
  list(): string[] {
    return store[KEY] ?? [];
  },
  isHidden(name: string): boolean {
    return this.list().includes(name);
  },
};
