import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { defaultContent, type ContentDocument } from "./content.default.js";

const __filename = fileURLToPath(import.meta.url);
const DATA_DIR = join(dirname(dirname(dirname(__filename))), "data");
const CONTENT_DIR = join(DATA_DIR, "content");
const CONTENT_FILE = join(CONTENT_DIR, "website-content.json");

function ensureContentFile(): void {
  if (!existsSync(CONTENT_DIR)) mkdirSync(CONTENT_DIR, { recursive: true });
  if (!existsSync(CONTENT_FILE)) {
    writeFileSync(CONTENT_FILE, JSON.stringify(defaultContent(), null, 2), "utf-8");
  }
}

export function readContent(): ContentDocument {
  ensureContentFile();
  try {
    const raw = readFileSync(CONTENT_FILE, "utf-8");
    const parsed = JSON.parse(raw) as ContentDocument;
    return mergedWithDefaults(parsed);
  } catch {
    return defaultContent();
  }
}

// Merge so that any future defaults added still appear, while keeping stored edits.
function mergedWithDefaults(stored: ContentDocument): ContentDocument {
  const def = defaultContent();
  return {
    ...def,
    ...stored,
    version: stored.version ?? def.version,
    updatedAt: stored.updatedAt ?? def.updatedAt,
  };
}

export function writeContent(doc: ContentDocument): void {
  ensureContentFile();
  const next: ContentDocument = {
    ...doc,
    version: (doc.version ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  writeFileSync(CONTENT_FILE, JSON.stringify(next, null, 2), "utf-8");
}

// Update a single section, bumping the version. Returns the new full document.
export function updateSection<K extends keyof ContentDocument>(
  key: K,
  value: ContentDocument[K]
): ContentDocument {
  const current = readContent();
  const next = { ...current, [key]: value };
  writeContent(next);
  return readContent();
}
