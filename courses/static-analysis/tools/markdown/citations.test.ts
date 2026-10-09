import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import YAML from 'yaml';

const root = path.resolve(import.meta.dirname, '../../content');
const yamls = (name: string) => [path.join(root, `${name}.yaml`), ...readdirSync(path.join(root, `${name}.d`)).filter((f) => f.endsWith('.yaml')).map((f) => path.join(root, `${name}.d`, f))];
const walk = (dir: string): string[] => readdirSync(dir).flatMap((f) => (statSync(path.join(dir, f)).isDirectory() ? walk(path.join(dir, f)) : f.endsWith('.md') ? [path.join(dir, f)] : []));

test('every citation resolves to a bibliography entry, and every key is defined once', () => {
  const keys = new Map<string, string>();
  const dupes: string[] = [];
  for (const f of yamls('bibliography')) for (const k of Object.keys(YAML.parse(readFileSync(f, 'utf8')) ?? {})) (keys.has(k) ? dupes.push(`${k} in ${f} and ${keys.get(k)}`) : keys.set(k, f));
  expect(dupes).toEqual([]);
  const missing: string[] = [];
  for (const f of walk(root)) for (const m of readFileSync(f, 'utf8').matchAll(/:cite\[([^\]]+)\]/g)) for (const k of m[1]!.split(',').map((s) => s.trim())) if (!keys.has(k)) missing.push(`${k} (${path.relative(root, f)})`);
  for (const f of yamls('timeline')) for (const e of (YAML.parse(readFileSync(f, 'utf8')) ?? []) as { cite?: string[] }[]) for (const k of e.cite ?? []) if (!keys.has(k)) missing.push(`${k} (${path.relative(root, f)})`);
  expect(missing).toEqual([]);
});

test('glossary terms are defined once', () => {
  const seen = new Map<string, string>();
  const dupes: string[] = [];
  for (const f of yamls('glossary')) for (const k of Object.keys(YAML.parse(readFileSync(f, 'utf8')) ?? {})) (seen.has(k) ? dupes.push(`${k} in ${path.basename(f)} and ${path.basename(seen.get(k)!)}`) : seen.set(k, f));
  expect(dupes).toEqual([]);
});
