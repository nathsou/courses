<!--
  A TypeScript exercise against the simulated machine (```ts blocks). The reader edits the starter, runs the
  tests in a worker (Mod-Enter), and sees each test's result. Feedback says exactly what was established: these
  tests passed on this code. Editing invalidates the result. Drafts are saved before every run.
  Spec: { id, title, prompt, starter, solution, tests, storage?, use?, hints?, explain? }
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { impls } from '$lib/state/impl.svelte';
  import ExerciseFrame from './ExerciseFrame.svelte';
  import CodeEditor from '$lib/exercise/CodeEditor.svelte';
  import type { RunReport } from '$lib/exercise/protocol';
  import Icon from '../ui/Icon.svelte';

  interface Spec {
    id: string;
    title?: string;
    prompt?: string;
    starter: string;
    solution?: string;
    tests: string;
    storage?: boolean;
    /** Remember passing code under this slot for "use my implementation". */
    use?: string;
    hints?: string[];
    explain?: string;
  }
  let { spec }: { spec: Spec } = $props();

  let code = $state(spec.starter);
  let editor = $state<CodeEditor | undefined>();
  let report = $state<RunReport | null>(null);
  let ranOn = $state<string | null>(null);
  let running = $state(false);
  let showSolution = $state(false);
  const stale = $derived(report !== null && ranOn !== code);
  const passed = $derived(report?.ok ? report.results.filter((r) => r.passed).length : 0);
  const total = $derived(report?.results.length ?? 0);
  const allPassed = $derived(!!report?.ok && total > 0 && passed === total);

  onMount(() => {
    progress.load();
    const d = progress.draft<string>(spec.id, spec.starter);
    if (d !== spec.starter) {
      code = d;
      editor?.setValue(d);
    }
  });

  async function run() {
    if (running) return;
    progress.saveDraft(spec.id, code);
    running = true;
    const submitted = code;
    const { runExercise } = await import('$lib/exercise/runner');
    const r = await runExercise({ id: spec.id, code: submitted, tests: spec.tests, storage: spec.storage });
    running = false;
    // Bind the result to the code it was computed from.
    report = r;
    ranOn = submitted;
    if (r.ok && r.results.length && r.results.every((t) => t.passed)) {
      progress.markSolved(spec.id);
      if (spec.use) impls.save(spec.use, submitted);
    }
  }

  function reset() {
    code = spec.starter;
    editor?.setValue(spec.starter);
    report = null;
  }
</script>

<ExerciseFrame id={spec.id} kind="Build it" title={spec.title} prompt={spec.prompt} hints={spec.hints}>
  <CodeEditor bind:this={editor} value={code} onchange={(c) => (code = c)} onrun={run} label="Your code for {spec.title ?? 'this exercise'}" minLines={Math.min(18, spec.starter.split('\n').length + 1)} />
  <div class="bar ui">
    <button class="run" onclick={run} disabled={running}><Icon name="play" size={14} /> {running ? 'Running…' : 'Run the tests'}</button>
    <span class="kbd">Ctrl/⌘ + Enter</span>
    <span class="spacer"></span>
    <button class="ghost" onclick={reset}><Icon name="reset" size={14} /> Reset</button>
    {#if spec.solution}
      <button class="ghost" onclick={() => (showSolution = !showSolution)}><Icon name="eye" size={14} /> {showSolution ? 'Hide' : 'Show'} a solution</button>
    {/if}
  </div>
  {#if report}
    <div class="report ui" class:stale aria-live="polite">
      {#if stale}<p class="stale-note">You have edited the code since this run: the results below are for the previous version.</p>{/if}
      {#if report.storage?.length}
        <p class="vchip bad">✗ storage rule</p>
        <ul class="tests">
          {#each report.storage as v, i (i)}<li class="fail"><span class="mark">✗</span> line {v.line}: {v.message}</li>{/each}
        </ul>
      {:else if !report.ok}
        <p class="vchip bad">✗ did not run</p>
        <pre class="err">{report.error}</pre>
      {:else}
        <p>
          {#if allPassed}<span class="vchip ok">✓ tests passed ({passed} of {total}) on this code</span>
          {:else}<span class="vchip bad">✗ {total - passed} of {total} tests failed</span>{/if}
          <span class="ms">{report.ms.toFixed(0)} ms</span>
        </p>
        <ul class="tests">
          {#each report.results as t (t.name)}
            <li class:fail={!t.passed}>
              <span class="mark">{t.passed ? '✓' : '✗'}</span> {t.name}
              {#if t.error}<div class="msg">{t.error}</div>{/if}
            </li>
          {/each}
        </ul>
        {#if allPassed && spec.use}<p class="use"><Icon name="check" size={13} /> Saved: later figures can now run <em>your</em> implementation (look for “use my implementation”).</p>{/if}
      {/if}
      {#if report.logs.length}
        <details class="logs"><summary>Console ({report.logs.length})</summary><pre>{report.logs.join('\n')}</pre></details>
      {/if}
    </div>
  {/if}
  {#if allPassed && spec.explain}<div class="explain">{@html spec.explain}</div>{/if}
  {#if showSolution && spec.solution}
    <div class="solution"><CodeEditor value={spec.solution} readonly label="A solution" minLines={4} /></div>
  {/if}
</ExerciseFrame>

<style>
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.6rem;
    font-size: 0.86rem;
  }
  .spacer {
    flex: 1;
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border-radius: var(--radius-sm);
    padding: 0.35rem 0.75rem;
    cursor: pointer;
    font-weight: 600;
  }
  .run {
    background: var(--copper);
    color: var(--on-accent);
    border: 1px solid var(--copper);
  }
  .run:disabled {
    opacity: 0.6;
  }
  .ghost {
    background: var(--panel);
    border: 1px solid var(--line-strong);
    font-weight: 500;
  }
  .kbd {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--mute);
  }
  .report {
    margin-top: 0.8rem;
    font-size: 0.88rem;
  }
  .report.stale {
    opacity: 0.6;
  }
  .stale-note {
    color: var(--maybe);
    font-size: 0.82rem;
  }
  .ms {
    color: var(--mute);
    font-size: 0.75rem;
    margin-left: 0.4rem;
  }
  .tests {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0;
  }
  .tests li {
    padding: 0.2rem 0;
  }
  .mark {
    color: var(--ok);
    font-weight: 700;
  }
  .fail .mark {
    color: var(--bad);
  }
  .msg {
    margin: 0.2rem 0 0.3rem 1.3rem;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--bad);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .err {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--bad);
    white-space: pre-wrap;
    background: var(--bad-soft);
    padding: 0.5rem 0.7rem;
    border-radius: var(--radius-sm);
  }
  .use {
    color: var(--ok);
    display: flex;
    gap: 0.35rem;
    align-items: center;
  }
  .logs pre {
    font-size: 0.76rem;
    max-height: 12rem;
    overflow: auto;
  }
  .explain {
    margin-top: 0.8rem;
    padding: 0.6rem 0.8rem;
    border-left: 3px solid var(--ok);
    background: var(--ok-soft);
    font-size: 0.95rem;
  }
  .solution {
    margin-top: 0.8rem;
  }
</style>
