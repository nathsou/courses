<!--
  The rule workbench. The reader edits a rule (or a helper) in TypeScript with a language server, runs it on
  comment-based fixtures with the real ESLint and typescript-eslint, inspects what the rule sees, and submits it to
  hidden fixtures (and, where offered, the corpus). Used for ```rule exercises and playgrounds.
-->
<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { EditorView } from '@codemirror/view';
  import CodeEditor, { type EditorMark } from '$lib/editor/CodeEditor.svelte';
  import ExerciseFrame from '../exercise/ExerciseFrame.svelte';
  import Inspector from './Inspector.svelte';
  import Results from './Results.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { runRuleRemote, runTestsRemote, runCorpusRemote, prewarm, TimeoutError } from '$lib/sa/runtime/client';
  import type { RuleRunResult } from '$lib/sa/runtime/run';
  import type { TestsResult } from '$lib/sa/runtime/tests';
  import { rulingDiff, type RulingDiff } from '$lib/sa/runtime/ruling';
  import { expectedIssues } from '$lib/sa/runtime/corpus-files';
  import { kitSource } from '$lib/sa/kit/sources';
  import { absoluteFiles, entryPath, exerciseSlug, filePath, keyOf, languageOf, testPath, type WorkbenchSpec } from '$lib/sa/exercise';
  import { zip } from '$lib/sa/zip';

  let { spec: raw }: { spec: WorkbenchSpec } = $props();
  // svelte-ignore state_referenced_locally
  const spec: WorkbenchSpec = { ...raw, playground: raw.playground || raw.kind === 'workbench' };

  const slug = exerciseSlug(spec.id);
  const key = keyOf(spec);
  const isTests = !!(spec.tests || spec.hiddenTests);
  const isMutants = !!spec.mutants;
  const readonlyNames = new Set(spec.readonly ?? []);
  const uri = (path: string) => `file:///ex/${slug}${path}`;

  // ── State, restored from drafts ──
  type Draft = { files: Record<string, string>; fixtures: Record<string, string> };
  let files = $state<Record<string, string>>({ ...spec.files });
  let fixtures = $state<Record<string, string>>({ ...(spec.fixtures ?? {}) });
  const fileNames = $derived(Object.keys(files));
  let activeFile = $state(Object.keys(spec.files).find((n) => !readonlyNames.has(n)) ?? Object.keys(spec.files)[0] ?? '');
  let activeFixture = $state(Object.keys(spec.fixtures ?? spec.tests ?? {})[0] ?? '');
  let kitTabs = $state<{ name: string; text: string }[]>([]);
  let kitActive = $state<string | null>(null);
  let kitView = $state<EditorView | undefined>();
  let fixtureEditor = $state<CodeEditor | undefined>();

  let running = $state<'run' | 'submit' | 'corpus' | null>(null);
  let error = $state<string | null>(null);
  let ruleResult = $state<RuleRunResult | null>(null);
  let testsResult = $state<TestsResult | null>(null);
  let hiddenResult = $state<{ rule?: RuleRunResult; tests?: TestsResult; mutants?: { name: string; caught: boolean }[] } | null>(null);
  let corpus = $state<{ diff?: RulingDiff; count: number; files: number; error?: string } | null>(null);
  let lastSource = $state<string | null>(null);
  let verdict = $state<{ ok: boolean; text: string } | null>(null);
  let showAnswer = $state(false);
  let inspectorOpen = $state(spec.inspector !== false && !isTests && !isMutants);
  let cursor = $state<number | undefined>(undefined);
  let picked = $state<{ from: number; to: number } | null>(null);

  const sourceKey = $derived(JSON.stringify([files, fixtures]));
  const stale = $derived(lastSource !== null && lastSource !== sourceKey);

  onMount(() => {
    const d = progress.draft<Draft | null>(spec.id, null);
    if (d) {
      files = { ...spec.files, ...Object.fromEntries(Object.entries(d.files).filter(([n]) => n in spec.files && !readonlyNames.has(n))) };
      fixtures = { ...(spec.fixtures ?? {}), ...Object.fromEntries(Object.entries(d.fixtures ?? {}).filter(([n]) => n in (spec.fixtures ?? {}))) };
    }
  });

  function save() {
    if (!spec.playground) progress.saveDraft(spec.id, { files: $state.snapshot(files), fixtures: $state.snapshot(fixtures) } satisfies Draft);
  }

  // Cross-file jumps (F12 on a kit helper) open a read-only tab.
  onMount(() => {
    let unregister: (() => void) | undefined;
    import('$lib/sa/lsp/client').then((m) => {
      unregister = m.registerDisplay(slug, async (u) => {
        const path = u.replace(`file:///ex/${slug}`, '');
        const helper = /^\/rules\/helpers\/(.+)$/.exec(path)?.[1];
        const own = Object.keys(files).find((n) => filePath(spec, n) === path);
        if (own) {
          activeFile = own;
          kitActive = null;
          return null;
        }
        if (!helper) return null;
        const text = await kitSource(helper);
        if (text === undefined) return null;
        if (!kitTabs.some((t) => t.name === helper)) kitTabs = [...kitTabs, { name: helper, text }];
        kitActive = helper;
        kitView = undefined;
        await tick();
        for (let i = 0; i < 40 && !kitView; i++) await new Promise((r) => setTimeout(r, 50));
        return kitView ?? null;
      });
    });
    return () => unregister?.();
  });

  // Load the runner when the exercise comes into view.
  let root: HTMLDivElement;
  onMount(() => {
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        prewarm();
        io.disconnect();
      }
    });
    io.observe(root);
    return () => io.disconnect();
  });

  function ruleFiles(source: Record<string, string> = files): Record<string, string> {
    return absoluteFiles(spec, source);
  }

  function describeError(e: unknown): string {
    if (e instanceof TimeoutError) return e.message;
    return e instanceof Error ? e.message : String(e);
  }

  async function run() {
    if (running) return;
    running = 'run';
    error = null;
    verdict = null;
    hiddenResult = null;
    const snapshot = sourceKey;
    try {
      if (isTests) {
        const tests = Object.fromEntries(Object.entries(spec.tests ?? {}).map(([n, s]) => [testPath(n), s]));
        testsResult = await runTestsRemote({ ...ruleFiles(), ...tests }, testPath(Object.keys(spec.tests ?? {})[0]!));
      } else if (isMutants) {
        ruleResult = await runRuleRemote({ ruleFiles: ruleFiles(spec.answer ?? files), entry: entryPath(spec), ruleKey: key, fixtures: $state.snapshot(fixtures), options: spec.options, types: spec.types });
      } else {
        ruleResult = await runRuleRemote({ ruleFiles: ruleFiles(), entry: entryPath(spec), ruleKey: key, fixtures: $state.snapshot(fixtures), options: spec.options, types: spec.types });
      }
      lastSource = snapshot;
    } catch (e) {
      error = describeError(e);
    } finally {
      running = null;
    }
  }

  async function submit() {
    if (running) return;
    await run();
    if (error) return;
    const loadError = isTests ? testsResult?.loadError : ruleResult?.loadError;
    if (loadError) {
      finish(false, 'Fix the error above first: the code does not load.');
      return;
    }
    running = 'submit';
    const snapshot = sourceKey;
    try {
      if (isTests) {
        const all = { ...(spec.tests ?? {}), ...(spec.hiddenTests ?? {}) };
        const results: TestsResult[] = [];
        for (const name of Object.keys(all)) {
          const tests = Object.fromEntries(Object.entries(all).map(([n, s]) => [testPath(n), s]));
          results.push(await runTestsRemote({ ...ruleFiles(), ...tests }, testPath(name)));
        }
        const merged: TestsResult = { pass: results.every((r) => r.pass), loadError: results.find((r) => r.loadError)?.loadError, tests: results.flatMap((r) => r.tests) };
        hiddenResult = { tests: merged };
        finish(merged.pass, merged.pass ? `All ${merged.tests.length} tests pass, including the hidden ones.` : `${merged.tests.filter((t) => !t.pass).length} of ${merged.tests.length} tests fail.`);
      } else if (isMutants) {
        const reference = ruleResult;
        const mutants: { name: string; caught: boolean }[] = [];
        for (const [name, code] of Object.entries(spec.mutants!)) {
          const r = await runRuleRemote({ ruleFiles: ruleFiles({ ...(spec.answer ?? files), [spec.entry ?? 'rule.ts']: code }), entry: entryPath(spec), ruleKey: key, fixtures: $state.snapshot(fixtures), options: spec.options, types: spec.types });
          mutants.push({ name, caught: !r.pass });
        }
        hiddenResult = { mutants };
        const refOk = !!reference?.pass;
        const caught = mutants.filter((m) => m.caught).length;
        finish(refOk && caught === mutants.length, !refOk ? 'The correct rule fails your fixtures: an expectation is wrong.' : `Your fixtures catch ${caught} of ${mutants.length} broken rules.`);
      } else {
        const hidden = spec.hidden ?? {};
        let all = ruleResult!;
        if (Object.keys(hidden).length) {
          const r = await runRuleRemote({ ruleFiles: ruleFiles(), entry: entryPath(spec), ruleKey: key, fixtures: hidden, options: spec.options, types: spec.types });
          hiddenResult = { rule: r };
          all = { ...all, pass: all.pass && r.pass };
        }
        const visibleOk = !!ruleResult?.pass;
        const hiddenOk = !hiddenResult?.rule || hiddenResult.rule.pass;
        finish(visibleOk && hiddenOk, !visibleOk ? 'Some visible fixtures fail.' : !hiddenOk ? 'The visible fixtures pass, but some hidden ones fail (shown below).' : `Visible and hidden fixtures pass (${Object.keys(fixtures).length + Object.keys(hidden).length} files).`);
      }
      lastSource = snapshot;
    } catch (e) {
      error = describeError(e);
    } finally {
      running = null;
    }
  }

  function finish(ok: boolean, text: string) {
    verdict = { ok, text };
    if (ok && !spec.playground) progress.markSolved(spec.id);
  }

  async function runCorpus() {
    if (running) return;
    running = 'corpus';
    error = null;
    try {
      const [r, expected] = await Promise.all([runCorpusRemote({ ruleFiles: ruleFiles(), entry: entryPath(spec), ruleKey: key, options: spec.options }), expectedIssues(key)]);
      if (r.loadError) corpus = { count: 0, files: 0, error: r.loadError };
      else corpus = { count: r.issues.length, files: r.files, diff: expected ? rulingDiff(r.issues, expected) : undefined, error: r.ruleErrors[0]?.message };
    } catch (e) {
      error = describeError(e);
    } finally {
      running = null;
    }
  }

  function reset() {
    if (!confirm('Reset this exercise to its starting code? Your edits will be lost.')) return;
    files = { ...spec.files };
    fixtures = { ...(spec.fixtures ?? {}) };
    ruleResult = testsResult = hiddenResult = null;
    corpus = null;
    verdict = null;
    lastSource = null;
    progress.reset(spec.id);
  }

  function exportZip() {
    const dir = `${key}/`;
    const out: Record<string, string> = {};
    for (const [n, s] of Object.entries(files)) out[n.startsWith('helpers/') ? n : dir + n] = s;
    for (const [n, s] of Object.entries(fixtures)) out[dir + n] = s;
    out[`${dir}README.md`] = `# ${key}\n\nExported from *Every Path at Once*, exercise \`${spec.id}\`.\n\nThe layout follows a SonarJS rule folder (\`rule.ts\` plus comment-based fixtures). Imports of \`../helpers/*.js\`\nrefer to the course kit, whose helpers share their names with SonarJS's \`rules/helpers/\` but are not the same code:\ncheck each one against SonarJS before moving the rule there.\n`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(zip(out));
    a.download = `${key}-${slug}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  // ── Marks on the active fixture ──
  function offsetOf(text: string, line: number, column: number): number {
    const lines = text.split('\n');
    let off = 0;
    for (let i = 0; i < line - 1 && i < lines.length; i++) off += lines[i]!.length + 1;
    return off + column;
  }
  function lineRange(text: string, line: number): { from: number; to: number } {
    const start = offsetOf(text, line, 0);
    const len = text.split('\n')[line - 1]?.length ?? 0;
    // Do not underline the test comment itself.
    const code = (text.split('\n')[line - 1] ?? '').replace(/\s*\/\/.*$/, '');
    return { from: start, to: start + Math.max(1, Math.min(len, code.length || len)) };
  }
  const activeReport = $derived(ruleResult?.fixtures.find((f) => f.name === activeFixture));
  const marks = $derived.by<EditorMark[]>(() => {
    const r = activeReport;
    const text = fixtures[activeFixture] ?? '';
    if (!r || stale) return [];
    const out: EditorMark[] = [];
    for (const e of r.check.entries) {
      const a = e.actual;
      const at = a ? { from: offsetOf(text, a.line, a.column), to: offsetOf(text, a.endLine, a.endColumn) } : lineRange(text, e.line);
      if (e.verdict === 'matched') out.push({ ...at, kind: 'ok', message: a?.message });
      else if (e.verdict === 'missing') out.push({ ...lineRange(text, e.line), kind: 'bad', message: `Expected an issue here${e.expected?.message ? `: ${e.expected.message}` : ''}` });
      else if (e.verdict === 'unexpected') out.push({ ...at, kind: 'bad', message: `Unexpected issue: ${a?.message}` });
      else out.push({ ...at, kind: 'warn', message: e.details.join('; ') });
      for (const s of a?.secondaryLocations ?? []) out.push({ from: offsetOf(text, s.line, s.column), to: offsetOf(text, s.endLine, s.endColumn), kind: 'secondary', message: s.message ?? 'secondary location' });
    }
    return out;
  });

  function jumpTo(line: number) {
    const text = fixtures[activeFixture] ?? '';
    const r = lineRange(text, line);
    fixtureEditor?.reveal(r.from, r.to);
  }

  const answerFiles = $derived(Object.entries(spec.answer ?? {}));
  const visibleTotals = $derived.by(() => {
    if (isTests) return testsResult ? `${testsResult.tests.filter((t) => t.pass).length}/${testsResult.tests.length} tests pass` : '';
    if (!ruleResult) return '';
    const n = ruleResult.fixtures.length;
    const ok = ruleResult.fixtures.filter((f) => f.check.pass).length;
    return `${ok}/${n} fixture file${n === 1 ? '' : 's'} pass`;
  });
  const failingHidden = $derived((hiddenResult?.rule?.fixtures ?? []).filter((f) => !f.check.pass));
</script>

{#snippet body()}
  <div class="wb" bind:this={root}>
    <!-- The reader's files -->
    <div class="pane">
      <div class="tabs ui" role="tablist" aria-label="Files">
        {#each fileNames as n (n)}
          <button role="tab" aria-selected={kitActive === null && activeFile === n} class:on={kitActive === null && activeFile === n} onclick={() => { activeFile = n; kitActive = null; }}>
            {n}{#if readonlyNames.has(n)}<span class="ro" title="read-only"> 🔒</span>{/if}
          </button>
        {/each}
        {#each kitTabs as t (t.name)}
          <button role="tab" aria-selected={kitActive === t.name} class="kit" class:on={kitActive === t.name} onclick={() => (kitActive = t.name)} title="The course kit (read-only)">helpers/{t.name}</button>
          <button class="close" aria-label="Close helpers/{t.name}" onclick={() => { kitTabs = kitTabs.filter((x) => x.name !== t.name); if (kitActive === t.name) kitActive = null; }}>×</button>
        {/each}
        <span class="lsp-hint">F12 definition · Shift-F12 references · F2 rename · Mod-Enter run</span>
      </div>
      {#if kitActive}
        {#each kitTabs.filter((t) => t.name === kitActive) as t (t.name)}
          <CodeEditor value={t.text} readonly label="helpers/{t.name} (read-only)" bind:view={kitView} minLines={10} />
        {/each}
      {:else}
        {#each fileNames.filter((n) => n === activeFile) as n (n)}
          <CodeEditor
            value={files[n]!}
            lang={languageOf(n)}
            readonly={readonlyNames.has(n)}
            lspUri={uri(filePath(spec, n))}
            label="{n}{readonlyNames.has(n) ? ' (read-only)' : ''}"
            minLines={10}
            onchange={(c) => { files[n] = c; save(); }}
            onrun={run}
          />
        {/each}
      {/if}
    </div>

    <!-- Fixtures or tests, with the inspector -->
    <div class="pane">
      <div class="tabs ui" role="tablist" aria-label={isTests ? 'Tests' : 'Fixtures'}>
        {#if isTests}
          {#each Object.keys(spec.tests ?? {}) as n (n)}
            <button role="tab" aria-selected={activeFixture === n} class:on={activeFixture === n} onclick={() => (activeFixture = n)}>{n} <span class="ro" title="read-only">🔒</span></button>
          {/each}
        {:else}
          {#each Object.keys(fixtures) as n (n)}
            <button role="tab" aria-selected={activeFixture === n} class:on={activeFixture === n} onclick={() => (activeFixture = n)}>
              {n}
              {#if ruleResult && !stale}{@const rep = ruleResult.fixtures.find((f) => f.name === n)}{#if rep}<span class="tab-mark" class:ok={rep.check.pass}>{rep.check.pass ? '✓' : '✗'}</span>{/if}{/if}
            </button>
          {/each}
          {#if spec.inspector !== false && !isMutants}
            <button class="toggle" aria-pressed={inspectorOpen} onclick={() => (inspectorOpen = !inspectorOpen)}>{inspectorOpen ? 'Hide' : 'Show'} the inspector</button>
          {/if}
        {/if}
      </div>
      <div class="fix-row" class:with-inspector={inspectorOpen && !isTests}>
        <div class="fix-editor">
          {#if isTests}
            {#each Object.keys(spec.tests ?? {}).filter((n) => n === activeFixture) as n (n)}
              <CodeEditor value={spec.tests![n]!} readonly label="{n} (read-only)" minLines={8} lspUri={uri(testPath(n))} />
            {/each}
          {:else}
            {#each Object.keys(fixtures).filter((n) => n === activeFixture) as n (n)}
              <CodeEditor
                bind:this={fixtureEditor}
                value={fixtures[n]!}
                lang={languageOf(n)}
                lspUri={uri(`/fixtures/${n}`)}
                label="Fixture {n}"
                minLines={8}
                {marks}
                highlight={picked}
                onchange={(c) => { fixtures[n] = c; save(); }}
                oncursor={(o) => (cursor = o)}
                onrun={run}
              />
            {/each}
          {/if}
        </div>
        {#if inspectorOpen && !isTests && fixtures[activeFixture] !== undefined}
          <Inspector code={fixtures[activeFixture]!} {cursor} types={spec.types !== false} tabs={spec.inspector || undefined} file="/fixtures/{activeFixture}" onpick={(r) => (picked = { from: r[0], to: r[1] })} />
        {/if}
      </div>
    </div>

    <div class="actions ui">
      <button class="primary" onclick={run} disabled={!!running}>{running === 'run' ? 'Running…' : isMutants ? 'Run the correct rule' : 'Run'}</button>
      {#if !spec.playground}
        <button class="primary submit" onclick={submit} disabled={!!running}>{running === 'submit' ? 'Checking…' : isMutants ? 'Check against broken rules' : 'Submit'}</button>
      {/if}
      {#if spec.corpus}
        <button onclick={runCorpus} disabled={!!running}>{running === 'corpus' ? 'Analysing the corpus…' : 'Run on the corpus'}</button>
      {/if}
      <span class="spacer"></span>
      {#if !isTests && !isMutants}<button onclick={exportZip} title="Download the rule and fixtures as a SonarJS-shaped folder">Export</button>{/if}
      <button onclick={reset}>Reset</button>
    </div>

    <div class="results ui" aria-live="polite">
      {#if error}
        <p class="err">{error}</p>
      {/if}
      {#if stale && (ruleResult || testsResult)}
        <p class="stale">You have edited the code since this run: the results below are for the previous version.</p>
      {/if}
      {#if verdict}
        <p class="verdict" class:ok={verdict.ok}><strong>{verdict.ok ? 'Solved.' : 'Not yet.'}</strong> {verdict.text}</p>
      {/if}
      {#if ruleResult?.loadError}
        <p class="err"><strong>The rule does not load.</strong> {ruleResult.loadError}</p>
      {/if}
      {#each ruleResult?.ruleErrors ?? [] as e, i (i)}
        <p class="err"><strong>The rule threw an exception</strong> on {e.file}: {e.message}</p>
      {/each}
      {#if ruleResult && !ruleResult.loadError}
        <p class="totals">{visibleTotals}{isMutants ? ' with the correct rule' : ''}</p>
        {#each ruleResult.fixtures as rep (rep.name)}
          <Results report={rep} onjump={rep.name === activeFixture ? jumpTo : undefined} />
        {/each}
      {/if}
      {#if testsResult}
        {#if testsResult.loadError}<p class="err"><strong>The code does not load.</strong> {testsResult.loadError}</p>{/if}
        <p class="totals">{visibleTotals}</p>
        <ul class="tests">
          {#each testsResult.tests as t, i (i)}
            <li class:pass={t.pass}><span aria-hidden="true">{t.pass ? '✓' : '✗'}</span> {t.name}{#if t.message}<span class="tmsg"> — {t.message}</span>{/if}</li>
          {/each}
        </ul>
      {/if}
      {#if hiddenResult?.tests}
        <h4>All tests, including hidden ones</h4>
        <ul class="tests">
          {#each hiddenResult.tests.tests as t, i (i)}
            <li class:pass={t.pass}><span aria-hidden="true">{t.pass ? '✓' : '✗'}</span> {t.name}{#if t.message}<span class="tmsg"> — {t.message}</span>{/if}</li>
          {/each}
        </ul>
      {/if}
      {#if hiddenResult?.mutants}
        <h4>Broken rules</h4>
        <ul class="tests">
          {#each hiddenResult.mutants as m (m.name)}
            <li class:pass={m.caught}><span aria-hidden="true">{m.caught ? '✓' : '✗'}</span> {m.name}: {m.caught ? 'caught by your fixtures' : 'passes your fixtures (add a case that exposes it)'}</li>
          {/each}
        </ul>
      {/if}
      {#if hiddenResult?.rule}
        <h4>Hidden fixtures: {hiddenResult.rule.fixtures.filter((f) => f.check.pass).length}/{hiddenResult.rule.fixtures.length} pass</h4>
        {#each failingHidden as rep (rep.name)}
          <Results report={rep} hiddenSource={spec.hidden?.[rep.name]} />
        {/each}
      {/if}
      {#if corpus}
        <div class="corpus">
          <h4>Corpus run</h4>
          {#if corpus.error}<p class="err">{corpus.error}</p>{/if}
          <p>{corpus.count} issue{corpus.count === 1 ? '' : 's'} on {corpus.files} files.</p>
          {#if corpus.diff}
            {#if corpus.diff.added.length === 0 && corpus.diff.removed.length === 0}
              <p class="ok-line">✓ Same issues as the expected results ({corpus.diff.unchanged}).</p>
            {:else}
              <p>Ruling diff against the expected results: <strong>+{corpus.diff.added.length}</strong> new, <strong>−{corpus.diff.removed.length}</strong> lost, {corpus.diff.unchanged} unchanged.</p>
              <ul class="diff">
                {#each corpus.diff.added as a, i (i)}<li class="add">+ <span class="mono">{a.file}:{a.line}</span> {a.message}</li>{/each}
                {#each corpus.diff.removed as r, i (i)}<li class="del">− <span class="mono">{r.file}:{r.line}</span></li>{/each}
              </ul>
            {/if}
          {/if}
        </div>
      {/if}
    </div>

    {#if answerFiles.length}
      <div class="answer ui">
        <button onclick={() => (showAnswer = !showAnswer)}>{showAnswer ? 'Hide' : 'Show'} the reference {answerFiles.length > 1 ? 'files' : 'file'}</button>
        {#if showAnswer}
          {#each answerFiles as [n, src] (n)}
            <p class="answer-name mono">{n}</p>
            <CodeEditor value={src} readonly lang={languageOf(n)} label="Reference {n}" minLines={4} />
          {/each}
        {/if}
      </div>
    {/if}
  </div>
{/snippet}

{#if spec.playground}
  <section class="playground wide" aria-label={spec.title ?? 'Rule workbench'}>
    {#if spec.title}<p class="pg-title ui"><span class="kind">workbench</span> {spec.title}</p>{/if}
    {#if spec.prompt}<div class="prompt">{@html spec.prompt}</div>{/if}
    {@render body()}
  </section>
{:else}
  <ExerciseFrame wide id={spec.id} kind={isTests ? 'helper' : isMutants ? 'fixtures' : 'rule'} title={spec.title} prompt={spec.prompt} hints={spec.hints ?? []} solution={spec.solution}>
    {@render body()}
  </ExerciseFrame>
{/if}

<style>
  .playground {
    margin: 2rem 0;
    padding: 0.8rem 1rem 1rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--surface);
    box-shadow: var(--shadow);
  }
  .pg-title {
    margin: 0 0 0.4rem;
    font-weight: 700;
  }
  .pg-title .kind {
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.13em;
    font-size: 0.68rem;
    color: var(--accent);
    margin-right: 0.4rem;
  }
  .prompt :global(p) {
    margin: 0 0 0.75rem;
  }
  .wb {
    display: flex;
    flex-direction: column;
    gap: 0.7rem;
    min-width: 0;
  }
  .pane {
    min-width: 0;
  }
  .tabs {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.15rem;
    font-size: 0.78rem;
  }
  .tabs button {
    font: inherit;
    font-family: var(--font-mono);
    border: 1px solid var(--line);
    border-bottom: 0;
    border-radius: 5px 5px 0 0;
    background: var(--pn);
    color: var(--mute);
    padding: 0.22rem 0.6rem;
    cursor: pointer;
  }
  .tabs button.on {
    background: var(--panel);
    color: var(--fg);
    border-color: var(--line-strong);
    font-weight: 700;
  }
  .tabs button.kit {
    font-style: italic;
  }
  .tabs .close {
    border-radius: 0 5px 0 0;
    margin-left: -0.2rem;
    padding: 0.22rem 0.35rem;
  }
  .tabs .toggle {
    margin-left: auto;
    font-family: var(--font-ui);
    border-radius: 5px;
    border-bottom: 1px solid var(--line);
    margin-bottom: 0.2rem;
  }
  .lsp-hint {
    margin-left: auto;
    color: var(--mute);
    font-size: 0.68rem;
    padding: 0 0.2rem 0.25rem;
  }
  .ro {
    font-size: 0.7rem;
  }
  .tab-mark {
    color: var(--bad);
    font-weight: 800;
    margin-left: 0.2rem;
  }
  .tab-mark.ok {
    color: var(--ok);
  }
  .wb {
    container-type: inline-size;
  }
  .fix-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.6rem;
  }
  @container (min-width: 760px) {
    .fix-row.with-inspector {
      grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    }
  }
  .fix-editor {
    min-width: 0;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  .actions button {
    font: inherit;
    font-weight: 700;
    font-size: 0.85rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--fg);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.85rem;
    cursor: pointer;
  }
  .actions button.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--bg);
  }
  .actions button.submit {
    background: var(--ok);
    border-color: var(--ok);
  }
  .actions button:disabled {
    opacity: 0.6;
    cursor: progress;
  }
  .spacer {
    flex: 1;
  }
  .results {
    font-size: 0.86rem;
  }
  .results h4 {
    margin: 0.8rem 0 0.2rem;
    font-size: 0.85rem;
  }
  .err {
    color: var(--bad);
    background: var(--bad-soft);
    padding: 0.35rem 0.6rem;
    border-radius: 4px;
    white-space: pre-wrap;
    font-family: var(--font-mono);
    font-size: 0.78rem;
  }
  .stale {
    color: var(--maybe);
    font-style: italic;
  }
  .verdict {
    padding: 0.4rem 0.7rem;
    border-radius: 4px;
    background: var(--bad-soft);
    border-left: 3px solid var(--bad);
  }
  .verdict.ok {
    background: var(--ok-soft);
    border-left-color: var(--ok);
  }
  .totals {
    color: var(--mute);
    margin: 0.2rem 0;
  }
  .tests {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .tests li {
    padding: 0.1rem 0;
  }
  .tests li > span:first-child {
    color: var(--bad);
    font-weight: 800;
    margin-right: 0.3rem;
  }
  .tests li.pass > span:first-child {
    color: var(--ok);
  }
  .tmsg {
    color: var(--ink-2);
    font-family: var(--font-mono);
    font-size: 0.78rem;
  }
  .corpus .diff {
    list-style: none;
    padding: 0;
    margin: 0;
    font-size: 0.8rem;
  }
  .add {
    color: var(--ok);
  }
  .del {
    color: var(--bad);
  }
  .ok-line {
    color: var(--ok);
  }
  .mono {
    font-family: var(--font-mono);
  }
  .answer button {
    font: inherit;
    font-weight: 700;
    font-size: 0.82rem;
    border: 1px solid var(--line);
    background: var(--surface);
    color: var(--fg);
    border-radius: var(--radius-sm);
    padding: 0.2rem 0.7rem;
    cursor: pointer;
  }
  .answer-name {
    margin: 0.6rem 0 0.2rem;
    font-size: 0.8rem;
    color: var(--mute);
  }
</style>
