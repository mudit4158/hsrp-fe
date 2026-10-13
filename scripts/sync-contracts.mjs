#!/usr/bin/env node
/**
 * The backend (hsrp-be) publishes the shared contracts in its OpenAPI document, exported to hsrp-be/openapi.json:
 * every enum as a named schema with `x-const-name` (the status labels as `x-labels`) and every request body model.
 * This script generates src/contracts/index.ts from it, so this repo builds on its own (D39, D48).
 *
 *   node scripts/sync-contracts.mjs          generate src/contracts/index.ts from the backend's openapi.json
 *   node scripts/sync-contracts.mjs --check  exit 1 if src/contracts differs from what the backend's file gives (docs:check)
 *
 * Backend file: OPENAPI_SRC, or the sibling ../hsrp-be/openapi.json.
 * If the backend is not checked out next to this repo, --check warns and passes.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = path.resolve(process.env.OPENAPI_SRC ?? path.join(root, '..', 'hsrp-be', 'openapi.json'));
const dest = path.join(root, 'src', 'contracts');
const check = process.argv.includes('--check');

if (!fs.existsSync(src)) {
  const msg = `Backend OpenAPI file not found at ${src} (set OPENAPI_SRC or check out hsrp-be next to this repo).`;
  if (check) {
    console.warn(`[contracts] WARN ${msg} Skipping the drift check.`);
    process.exit(0);
  }
  console.error(`[contracts] ${msg}`);
  process.exit(1);
}

const doc = JSON.parse(fs.readFileSync(src, 'utf8'));
const schemas = doc.components?.schemas ?? {};
// FastAPI's own error and multipart helper schemas are not contracts.
const skip = (name) => name.startsWith('Body_') || name === 'HTTPValidationError' || name === 'ValidationError';
const q = (s) => `'${String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;

function tsType(s) {
  if (!s) return 'unknown';
  if (s.$ref) return s.$ref.split('/').pop();
  if (s.anyOf) return [...new Set(s.anyOf.map(tsType))].join(' | ');
  if (s.const !== undefined) return q(s.const);
  if (s.enum) return s.enum.map(q).join(' | ');
  switch (s.type) {
    case 'string':
      return 'string';
    case 'integer':
    case 'number':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'array':
      return `Array<${tsType(s.items)}>`;
    case 'object':
      if (s.properties) return `{ ${props(s).join(' ')} }`;
      return `Record<string, ${s.additionalProperties && s.additionalProperties !== true ? tsType(s.additionalProperties) : 'unknown'}>`;
    default:
      return 'unknown';
  }
}

function props(s) {
  const required = new Set(s.required ?? []);
  return Object.entries(s.properties ?? {}).map(([k, v]) => `${/^[A-Za-z_$][\w$]*$/.test(k) ? k : q(k)}${required.has(k) ? '' : '?'}: ${tsType(v)};`);
}

const lines = [
  '// Generated from hsrp-be/openapi.json by scripts/sync-contracts.mjs. Do not edit: change the backend, run',
  '// scripts/export_openapi.py there, then `pnpm contracts:sync` here.',
  '',
];
const names = Object.keys(schemas).filter((n) => !skip(n)).sort();
for (const name of names) {
  const s = schemas[name];
  if (s['x-const-name']) {
    const c = s['x-const-name'];
    if (s.description) lines.push(`/** ${s.description} */`);
    lines.push(`export const ${c} = [${s.enum.map(q).join(', ')}] as const;`, `export type ${name} = (typeof ${c})[number];`, '');
  }
}
const labels = schemas.OrderStatus?.['x-labels'];
if (labels) {
  lines.push('export const STATUS_LABELS: Record<string, string> = {');
  for (const [k, v] of Object.entries(labels)) lines.push(`  ${k}: ${q(v)},`);
  lines.push('};', '');
}
lines.push('export interface Page<T> {', '  items: T[];', '  total: number;', '  page: number;', '  pageSize: number;', '}', '');
for (const name of names) {
  const s = schemas[name];
  if (s['x-const-name']) continue;
  if (s.description) lines.push(`/** ${s.description.replace(/\*\//g, '* /').replace(/\n+/g, ' ')} */`);
  if (s.type === 'object' || s.properties) lines.push(`export interface ${name} {`, ...props(s).map((p) => `  ${p}`), '}', '');
  else lines.push(`export type ${name} = ${tsType(s)};`, '');
}
const expected = new Map([['index.ts', lines.join('\n')]]);

if (check) {
  const have = fs.existsSync(dest) ? fs.readdirSync(dest).filter((f) => f.endsWith('.ts')).sort() : [];
  const problems = [];
  for (const [f, text] of expected) {
    if (!have.includes(f)) problems.push(`missing ${f}`);
    else if (fs.readFileSync(path.join(dest, f), 'utf8') !== text) problems.push(`out of date ${f}`);
  }
  for (const f of have) if (!expected.has(f)) problems.push(`extra ${f}`);
  if (problems.length) {
    console.error(`[contracts] src/contracts differs from the backend's openapi.json: ${problems.join(', ')}. Run pnpm contracts:sync.`);
    process.exit(1);
  }
  console.log(`[contracts] OK (src/contracts matches the backend's openapi.json)`);
  process.exit(0);
}

fs.mkdirSync(dest, { recursive: true });
for (const f of fs.readdirSync(dest)) if (f.endsWith('.ts') && !expected.has(f)) fs.rmSync(path.join(dest, f));
for (const [f, text] of expected) fs.writeFileSync(path.join(dest, f), text);
console.log(`[contracts] generated src/contracts/index.ts from ${src}`);
