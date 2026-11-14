<!--
  An ```hdl block: write Weft to a specification in the course's editor (synth's diagnostics as you type), and
  press Check. synth compiles the design, the hidden tests run on synth's simulator, and the design is compared
  with a hidden reference: every input combination when the inputs are few enough, then random ones; a clocked
  design from power-up on every short input sequence and on random ones. A mismatch comes back as a table of
  inputs, expected outputs and what your design gave.

    id: ch29/priority-encoder
    top: priority_encoder
    start: |
      module priority_encoder(in req: uint<8>, out valid: bool, out highest: uint<3>) { … }
    reference: |
      module priority_encoder(…) { … }
    tests: |
      test "highest wins" { … }
    solution: |
      module priority_encoder(…) { … }

  See check.ts for the fields and the checker.
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import ExerciseFrame from './ExerciseFrame.svelte';
  import Icon from '../ui/Icon.svelte';
  import Mismatch from './parts/Mismatch.svelte';
  import Verdict from './parts/Verdict.svelte';
  import './parts/exercise.css';
  import WeftEditor from '$lib/weft/WeftEditor.svelte';
  import Problems from '$lib/widgets/weft/Problems.svelte';
  import { highlightWeftHtml } from '$lib/weft/highlight';
  import type { WeftAnalysis } from '$lib/weft/analysis';
  import type { FormatOutcome } from '$lib/weft/editor/index';
  import { progress } from '$lib/state/progress.svelte';
  import type { HdlInput, HdlOutcome } from './hdl/check';

  let { spec }: { spec: HdlInput } = $props();

  const uid = $props.id();
  let code = $state(untrack(() => progress.draft<string>(spec.id, spec.start)));
  let analysis: WeftAnalysis | undefined = $state.raw();
  let pending = $state(true);
  let editor: WeftEditor | undefined = $state();
  let outcome = $state.raw<HdlOutcome | null>(null);
  let stale = $state(false);
  let checking = $state(false);
  let status = $state('');
  let showSolution = $state(false);
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let statusTimer: ReturnType<typeof setTimeout> | undefined;

  onMount(() => {
    progress.load();
    code = progress.draft<string>(spec.id, code);
    return () => {
      clearTimeout(saveTimer);
      clearTimeout(statusTimer);
    };
  });

  function onanalysis(a: WeftAnalysis) {
    pending = false;
    analysis = a;
  }
  $effect(() => {
    // Every edit: remember it, and mark the verdict as out of date.
    const text = code;
    untrack(() => {
      stale = true;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => progress.saveDraft(spec.id, text), 400);
    });
  });

  function say(text: string) {
    status = text;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => (status = ''), 2500);
  }
  function onformat(o: FormatOutcome) {
    say(o === 'changed' ? 'Formatted.' : o === 'unchanged' ? 'Already formatted.' : 'Cannot format: fix the syntax errors first.');
  }
  function reveal(offset: number) {
    queueMicrotask(() => editor?.reveal(offset));
  }
  async function check() {
    checking = true;
    progress.saveDraft(spec.id, code);
    try {
      const [{ checkHdl }, { synthOn }] = await Promise.all([import('./hdl/check'), import('$lib/synth/client')]);
      outcome = await checkHdl(synthOn('sim'), spec, code);
      stale = false;
      if (outcome.pass) progress.markSolved(spec.id);
    } catch (e) {
      outcome = { pass: false, diagnostics: [], problems: [`The check could not run: ${e instanceof Error ? e.message : String(e)}`], tests: [], source: code };
    } finally {
      checking = false;
    }
  }

  const eq = $derived(outcome?.equivalence);
  const solutionHtml = $derived(spec.solution ? highlightWeftHtml(spec.solution) : '');
</script>

<ExerciseFrame id={spec.id} kind="HDL" title={spec.title} prompt={spec.prompt} hints={spec.hints ?? []}>
  <div class="hdl">
    <WeftEditor
      bind:this={editor}
      bind:doc={code}
      file="{spec.top}.weft"
      top={spec.top}
      {onanalysis}
      {onformat}
      minLines={spec.height ?? 8}
      maxLines={Math.max(spec.height ?? 14, 14)}
      label="Weft source: module {spec.top}"
    />
    <Problems {analysis} {pending} onreveal={reveal} />

    <div class="ex-bar ui">
      <button type="button" class="check" onclick={check} disabled={checking}><Icon name="check" size={15} /> {checking ? 'Checking…' : 'Check'}</button>
      <button type="button" onclick={() => editor?.format()} title="Format the code as synth fmt does (Shift+Alt+F)">Format</button>
      <button type="button" onclick={() => (code = spec.start)} disabled={code === spec.start}>Start again</button>
      <span class="ex-note status" role="status" aria-live="polite">{status}</span>
    </div>

    <div class="out ui" id="{uid}-out">
      {#if outcome}
        <Verdict ok={outcome.pass}>
          {#if outcome.pass}Passes every hidden test and matches the reference.{:else if outcome.problems.length || outcome.diagnostics.some((d) => d.severity === 'error')}Not checked: the design has problems.{:else}Not yet.{/if}
          {#if stale}<span class="ex-note"> (you have edited it since)</span>{/if}
        </Verdict>
        {#each outcome.diagnostics.filter((d) => d.severity === 'error') as d, i (i)}
          <p class="ex-bad">{d.at ? `line ${d.at.line}: ` : ''}{d.message}</p>
        {/each}
        {#each outcome.problems as p (p)}<p class="ex-bad">{p}</p>{/each}
        {#if outcome.tests.length}
          <ul class="ex-list" aria-label="Hidden tests">
            {#each outcome.tests as t (t.name)}
              <li class:ok={t.passed}>
                <span class="mark">{t.passed ? '✓' : '✗'}</span> <strong>{t.name}</strong>
                {#if !t.passed}<div class="f">{t.message}</div>{/if}
              </li>
            {/each}
          </ul>
        {/if}
        {#if eq}
          <p class="ex-note">
            {#if eq.pass}
              Compared with the reference design: {#if eq.kind === 'exhaustive'}all {eq.vectors.toLocaleString('en-GB')} input combinations agree{:else if eq.kind === 'random'}{eq.vectors.toLocaleString('en-GB')} random input vectors agree (too many inputs to try them all){:else}{eq.vectors.toLocaleString('en-GB')} clock cycles from power-up agree, on every short input sequence and on random ones{/if}.
            {:else}
              {#if eq.sequential}The clocked design differs from the reference. The last cycles before the first mismatch (outputs are compared before and after each clock edge):{:else}The design differs from the reference on {eq.mismatches.toLocaleString('en-GB')} of {eq.vectors.toLocaleString('en-GB')} {eq.kind === 'exhaustive' ? 'input combinations' : 'random vectors'}. The first:{/if}
            {/if}
          </p>
          {#if !eq.pass && eq.rows.length}
            <Mismatch
              rows={eq.rows.map((r) => ({ ...r, step: r.cycle === undefined ? undefined : `cycle ${r.cycle + 1}, ${r.phase === 'before' ? 'before' : 'after'} the edge` }))}
              caption={eq.sequential ? 'Inputs held in each cycle, and the outputs expected and given' : 'Inputs, expected outputs, and what your design gave'}
            />
          {/if}
        {/if}
        {#if outcome.pass && spec.explain}<div class="ex-explain">{@html spec.explain}</div>{/if}
      {/if}
    </div>

    {#if spec.solution}
      <div class="ex-solution ui">
        <button type="button" onclick={() => (showSolution = !showSolution)} aria-expanded={showSolution}><Icon name="eye" size={14} /> {showSolution ? 'Hide the solution' : 'Show a solution'}</button>
        {#if showSolution}<div class="sol">{@html solutionHtml}</div>{/if}
      </div>
    {/if}
  </div>
</ExerciseFrame>

<style>
  .hdl {
    display: grid;
    gap: 0.6rem;
    min-width: 0;
  }
  .status {
    margin: 0;
  }
  .sol {
    margin-top: 0.5rem;
    border-left: 3px solid var(--ok);
    overflow-x: auto;
  }
  .sol :global(pre) {
    margin: 0;
    padding: 0.6rem 0.8rem;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    background: var(--surface-2) !important;
  }
</style>
