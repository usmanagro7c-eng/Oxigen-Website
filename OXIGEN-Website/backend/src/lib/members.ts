import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { randomUUID } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const DATA_DIR = join(dirname(dirname(dirname(__filename))), "data");
const FILE = join(DATA_DIR, "members.json");

interface Member { id: string; name: string; email: string; role: string; addedAt: string; }

function ensure(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(FILE)) writeFileSync(FILE, JSON.stringify([], null, 2), "utf-8");
}
function readAll(): Member[] {
  ensure();
  try { return JSON.parse(readFileSync(FILE, "utf-8")); } catch { return []; }
}
function writeAll(d: Member[]): void {
  ensure();
  writeFileSync(FILE, JSON.stringify(d, null, 2), "utf-8");
}

export function listMembers(): Member[] { return readAll(); }

export function addMember(name: string, email: string, role: string): Member {
  const list = readAll();
  const m: Member = { id: randomUUID(), name, email, role, addedAt: new Date().toISOString() };
  list.push(m);
  writeAll(list);
  return m;
}

export function removeMember(id: string): boolean {
  const list = readAll();
  const next = list.filter((m) => m.id !== id);
  if (next.length === list.length) return false;
  writeAll(next);
  return true;
}