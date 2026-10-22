import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const DATA_DIR = join(dirname(dirname(dirname(__filename))), "data");
const FILE = join(DATA_DIR, "sessions.json");

interface Session {
  id: string;
  email: string;
  device: string;
  createdAt: string;
}

function ensure(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(FILE)) writeFileSync(FILE, JSON.stringify({}, null, 2), "utf-8");
}
function readAll(): Record<string, Session[]> {
  ensure();
  try { return JSON.parse(readFileSync(FILE, "utf-8")); } catch { return {}; }
}
function writeAll(d: Record<string, Session[]>): void {
  ensure();
  writeFileSync(FILE, JSON.stringify(d, null, 2), "utf-8");
}

export function listSessions(email: string): Session[] {
  const all = readAll();
  let list = all[email] ?? [];
  if (list.length === 0) {
    // synthesize a current session so the UI is never empty
    const s: Session = { id: randomUUID(), email, device: "Current device", createdAt: new Date().toISOString() };
    list = [s];
    all[email] = list;
    writeAll(all);
  }
  return list;
}

export function revokeSession(email: string, id: string): boolean {
  const all = readAll();
  const list = all[email] ?? [];
  const next = list.filter((s) => s.id !== id);
  if (next.length === list.length) return false;
  all[email] = next;
  writeAll(all);
  return true;
}

export function revokeOthers(email: string, currentId: string): number {
  const all = readAll();
  const list = all[email] ?? [];
  const removed = list.filter((s) => s.id !== currentId).length;
  all[email] = list.filter((s) => s.id === currentId);
  if (all[email].length === 0 && list.length > 0) {
    // keep at least current
    all[email] = [list[0]];
  }
  writeAll(all);
  return removed;
}