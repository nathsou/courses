/**
 * The corpus's expected issues (content/corpus/expected/<KEY>.json) are the issues of the reference solution of
 * the first rule exercise with `corpus: true` for each key, like SonarJS's ruling expectations. This test fails
 * when they are out of date; `npm run corpus:sync` (CORPUS_SYNC=1) rewrites them.
 */
import { describe, expect, test } from 'vitest';
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { loadLibs } from '../../src/lib/sa/runtime/libs';
import { runCorpus } from '../../src/lib/sa/runtime/corpus';
import { toExpected } from '../../src/lib/sa/runtime/ruling';
import { absoluteFiles, entryPath, keyOf, type WorkbenchSpec } from '../../src/lib/sa/exercise';
import { workbenchBlocks } from './exercises.test';

const root = path.resolve(import.meta.dirname, '../../content');
const expectedDir = path.join(root, 'corpus/expected');
const sync = !!process.env.CORPUS_SYNC;

const references = new Map<string, { spec: WorkbenchSpec; doc: string }>();
for (const dir of ['chapters', 'appendices']) {
  const d = path.join(root, dir);
  if (!existsSync(d)) continue;
  for (const c of readdirSync(d).sort()) {
    const doc = path.join(d, c, 'index.md');
    if (!existsSync(doc)) continue;
    for (const { kind, spec } of workbenchBlocks(readFileSync(doc, 'utf8'))) {
      if (kind !== 'rule' || !spec.corpus) continue;
      const key = keyOf(spec);
      if (!references.has(key)) references.set(key, { spec, doc: path.relative(root, doc) });
    }
  }
}

describe('corpus expectations', () => {
  for (const [key, { spec, doc }] of references) {
    test(`${key} (${doc}: ${spec.id})`, async () => {
      const libs = await loadLibs();
      const r = runCorpus({ ruleFiles: absoluteFiles(spec, { ...spec.files, ...spec.answer }), entry: entryPath(spec), ruleKey: key, options: spec.options, libs });
      expect(r.loadError).toBeUndefined();
      expect(r.ruleErrors).toEqual([]);
      const text = `${JSON.stringify(toExpected(r.issues), null, 2)}\n`;
      const file = path.join(expectedDir, `${key}.json`);
      if (sync) {
        mkdirSync(expectedDir, { recursive: true });
        writeFileSync(file, text);
      } else {
        expect(existsSync(file), `${file} is missing: run npm run corpus:sync`).toBe(true);
        expect(readFileSync(file, 'utf8'), `${key}.json is out of date: run npm run corpus:sync`).toBe(text);
      }
    });
  }

  test('no expectations without an exercise', () => {
    const stale = existsSync(expectedDir) ? readdirSync(expectedDir).filter((f) => f.endsWith('.json') && !references.has(f.replace(/\.json$/, ''))) : [];
    if (sync) for (const f of stale) rmSync(path.join(expectedDir, f));
    else expect(stale).toEqual([]);
  });
});
