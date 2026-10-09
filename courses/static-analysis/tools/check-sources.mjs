#!/usr/bin/env node
/**
 * Checks every SonarJS reference in the content (`::source{path=… symbol=…}` and `:source[…]{path=… symbol=…}`)
 * against SonarJS at the pinned commit: the file must exist, and the symbol must occur in it.
 *
 * Uses the checkout in $SONARJS_DIR if it is at the pinned commit; otherwise clones SonarJS into a temporary
 * directory (needs network).
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outline = readFileSync(path.join(root, 'content/outline.ts'), 'utf8');
const commit = /SONARJS_COMMIT = '([0-9a-f]{40})'/.exec(outline)?.[1];
if (!commit) throw new Error('SONARJS_COMMIT not found in content/outline.ts');

function git(dir, ...args) {
  return execFileSync('git', ['-C', dir, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

let repo = process.env.SONARJS_DIR;
if (!repo || !existsSync(repo) || git(repo, 'rev-parse', 'HEAD') !== commit) {
  repo = mkdtempSync(path.join(tmpdir(), 'sonarjs-'));
  console.log(`Cloning SonarJS at ${commit.slice(0, 7)} into ${repo}…`);
  execFileSync('git', ['init', '-q', repo]);
  git(repo, 'remote', 'add', 'origin', 'https://github.com/SonarSource/SonarJS.git');
  git(repo, 'fetch', '-q', '--depth', '1', 'origin', commit);
  git(repo, 'checkout', '-q', 'FETCH_HEAD');
}

function* markdownFiles(dir) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) yield* markdownFiles(p);
    else if (name.endsWith('.md')) yield p;
  }
}

const attr = (attrs, key) => new RegExp(`${key}="([^"]*)"`).exec(attrs)?.[1];
const problems = [];
let count = 0;
for (const file of markdownFiles(path.join(root, 'content'))) {
  if (file.includes(`${path.sep}corpus${path.sep}`)) continue;
  const text = readFileSync(file, 'utf8');
  for (const m of text.matchAll(/:{1,2}source(?:\[[^\]]*\])?\{([^}]*)\}/g)) {
    const attrs = m[1];
    const p = attr(attrs, 'path');
    if (!p) continue;
    count++;
    const where = `${path.relative(root, file)}:${text.slice(0, m.index).split('\n').length}`;
    const full = path.join(repo, p);
    if (!existsSync(full)) {
      problems.push(`${where}: ${p} does not exist at ${commit.slice(0, 7)}`);
      continue;
    }
    const symbol = attr(attrs, 'symbol')?.replace(/&quot;/g, '"');
    if (symbol && !readFileSync(full, 'utf8').includes(symbol)) problems.push(`${where}: “${symbol}” not found in ${p}`);
  }
  // Stages of :::follow-issue figures: `path:` and `symbol:` lines in their YAML.
  for (const m of text.matchAll(/^\s+path: (\S+)\n(?:\s+symbol: (.+)\n)?/gm)) {
    const [, p, symbol] = m;
    if (!p.includes('/')) continue;
    count++;
    const where = `${path.relative(root, file)}:${text.slice(0, m.index).split('\n').length + 1}`;
    const full = path.join(repo, p);
    if (!existsSync(full)) problems.push(`${where}: ${p} does not exist at ${commit.slice(0, 7)}`);
    else if (symbol && !readFileSync(full, 'utf8').includes(symbol.trim())) problems.push(`${where}: “${symbol.trim()}” not found in ${p}`);
  }
}

if (problems.length) {
  console.error(`${problems.length} of ${count} SonarJS references are broken:\n${problems.map((p) => `  ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`All ${count} SonarJS references resolve at ${commit.slice(0, 7)}.`);
