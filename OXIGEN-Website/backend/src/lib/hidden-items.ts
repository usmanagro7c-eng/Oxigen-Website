import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const DATA_DIR = join(dirname(dirname(dirname(__filename))), "data");
const FILE = join(DATA_DIR, "hidden-items.json");

function ensure(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(FILE)) writeFileSync(FILE, JSON.stringify([], null, 2), "utf-8");
}
function readAll(): string[] {
  ensure();
  try { return JSON.parse(readFileSync(FILE, "utf-8")); } catch { return []; }
}
function writeAll(d: string[]): void {
  ensure();
  writeFileSync(FILE, JSON.stringify(d, null, 2), "utf-8");
}

export const hiddenItems = {
  list(): string[] { return readAll(); },
  isHidden(name: string): boolean { return readAll().includes(name); },
  hide(name: string): void {
    const list = readAll();
    if (!list.includes(name)) { list.push(name); writeAll(list); }
  },
  unhide(name: string): void {
    const list = readAll();
    const next = list.filter((n) => n !== name);
    if (next.length !== list.length) writeAll(next);
  },
};