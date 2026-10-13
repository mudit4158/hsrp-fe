#!/usr/bin/env node
/**
 * The backend repo (hsrp-be) owns the shared contracts in packages/contracts/src. This repo keeps a copy in
 * src/contracts so it builds on its own (decision D39).
 *
 *   node scripts/sync-contracts.mjs          copy the backend's contracts into src/contracts
 *   node scripts/sync-contracts.mjs --check  exit 1 if the copy differs from the backend (used by docs:check)
 *
 * Backend location: CONTRACTS_SRC, or the sibling folder ../hsrp-be/packages/contracts/src.
 * If the backend is not checked out next to this repo, --check warns and passes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.resolve(process.env.CONTRACTS_SRC ?? path.join(root, '..', 'hsrp-be', 'packages', 'contracts', 'src'));
const dest = path.join(root, 'src', 'contracts');
const check = process.argv.includes('--check');

const header = (file) =>
  `// Synced from hsrp-be/packages/contracts/src/${file}. Do not edit here: change the backend, then run \`pnpm contracts:sync\`.\n`;

if (!fs.existsSync(src)) {
  const msg = `Backend contracts not found at ${src} (set CONTRACTS_SRC or check out hsrp-be next to this repo).`;
  if (check) {
    console.warn(`[contracts] WARN ${msg} Skipping the drift check.`);
    process.exit(0);
  }
  console.error(`[contracts] ${msg}`);
  process.exit(1);
}

const files = fs.readdirSync(src).filter((f) => f.endsWith('.ts')).sort();
const expected = new Map(files.map((f) => [f, header(f) + fs.readFileSync(path.join(src, f), 'utf8')]));

if (check) {
  const have = fs.existsSync(dest) ? fs.readdirSync(dest).filter((f) => f.endsWith('.ts')).sort() : [];
  const problems = [];
  for (const [f, text] of expected) {
    if (!have.includes(f)) problems.push(`missing ${f}`);
    else if (fs.readFileSync(path.join(dest, f), 'utf8') !== text) problems.push(`out of date ${f}`);
  }
  for (const f of have) if (!expected.has(f)) problems.push(`extra ${f} (not in the backend)`);
  if (problems.length) {
    console.error(`[contracts] src/contracts differs from the backend: ${problems.join(', ')}. Run pnpm contracts:sync.`);
    process.exit(1);
  }
  console.log(`[contracts] OK (${files.length} files match the backend)`);
  process.exit(0);
}

fs.mkdirSync(dest, { recursive: true });
for (const f of fs.readdirSync(dest)) if (f.endsWith('.ts') && !expected.has(f)) fs.rmSync(path.join(dest, f));
for (const [f, text] of expected) fs.writeFileSync(path.join(dest, f), text);
console.log(`[contracts] synced ${files.length} files from ${src}`);
