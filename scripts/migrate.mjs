#!/usr/bin/env node
// One-shot: extract gallery and batch data from index.html into JSON.
// Self-verifies expected row counts. Run from repo root.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(REPO_ROOT, "index.html"), "utf8");

// --- Gallery: <div class="gallery-item"><img src="..." alt="..."></div>
const galleryRegex =
  /<div class="gallery-item"><img src="([^"]+)" alt="([^"]+)"><\/div>/g;
const gallery = [];
for (const m of html.matchAll(galleryRegex)) {
  gallery.push({ file: m[1], alt: { uk: m[2], en: m[2] } });
}

// --- Batches: rows inside <table class="batch-log">
const tableMatch = html.match(/<table class="batch-log">([\s\S]*?)<\/table>/);
if (!tableMatch) throw new Error("batch-log table not found");
const rowRegex =
  /<tr>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<td>([^<]+)<\/td>\s*<\/tr>/g;
const batches = [];
for (const m of tableMatch[1].matchAll(rowRegex)) {
  const number = m[1].trim();
  if (number.toLowerCase() === "batch #") continue; // skip header row
  batches.push({
    number,
    character: { uk: m[2].trim(), en: "" },
    notes: { uk: m[3].trim(), en: "" },
  });
}

// --- Self-verification (per spec: no formal tests, script asserts itself)
const EXPECTED_GALLERY = 9;
const EXPECTED_BATCHES = 3;
if (gallery.length !== EXPECTED_GALLERY) {
  throw new Error(
    `gallery: expected ${EXPECTED_GALLERY} items, got ${gallery.length}`,
  );
}
if (batches.length !== EXPECTED_BATCHES) {
  throw new Error(
    `batches: expected ${EXPECTED_BATCHES} rows, got ${batches.length}`,
  );
}

// --- Write
mkdirSync(resolve(REPO_ROOT, "data"), { recursive: true });
writeFileSync(
  resolve(REPO_ROOT, "data/gallery.json"),
  JSON.stringify({ items: gallery }, null, 2) + "\n",
);
writeFileSync(
  resolve(REPO_ROOT, "data/batches.json"),
  JSON.stringify({ items: batches }, null, 2) + "\n",
);

console.log(`✓ data/gallery.json — ${gallery.length} items`);
console.log(`✓ data/batches.json — ${batches.length} rows`);
console.log("\nReminder: EN fields in batches.json are empty. Fill in Task 9.");
