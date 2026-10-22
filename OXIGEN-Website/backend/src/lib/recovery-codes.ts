import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createHash, randomBytes } from "crypto";

const __filename = fileURLToPath(import.meta.url);
const DATA_DIR = join(dirname(dirname(dirname(__filename))), "data");
const FILE = join(DATA_DIR, "recovery-codes.json");

function ensure(): void {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(FILE)) writeFileSync(FILE, JSON.stringify({}, null, 2), "utf-8");
}

function readAll(): Record<string, string[]> {
  ensure();
  try { return JSON.parse(readFileSync(FILE, "utf-8")); } catch { return {}; }
}
function writeAll(d: Record<string, string[]>): void {
  ensure();
  writeFileSync(FILE, JSON.stringify(d, null, 2), "utf-8");
}

export function generateCodes(email: string, count = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = randomBytes(5).toString("hex").toUpperCase(); // 10 hex chars
    codes.push(`${raw.slice(0,5)}-${raw.slice(5)}`);
  }
  const hashed = codes.map((c) => createHash("sha256").update(c).digest("hex"));
  const all = readAll();
  all[email] = hashed;
  writeAll(all);
  return codes; // plaintext, shown once
}

export function countCodes(email: string): number {
  const all = readAll();
  return (all[email] ?? []).length;
}

export function verifyCode(email: string, code: string): boolean {
  const all = readAll();
  const list = all[email] ?? [];
  const hash = createHash("sha256").update(code.trim().toUpperCase()).digest("hex");
  const idx = list.indexOf(hash);
  if (idx === -1) return false;
  // consume the code
  list.splice(idx, 1);
  all[email] = list;
  writeAll(all);
  return true;
}