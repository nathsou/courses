<!--
  An exercise in the course's HDL: edit a design, run it to see its waveform, and check it. The check proves
  what it says (equivalence to the specification, assertions in every reachable state, or tests); a result
  is cleared as soon as the design is edited, and the draft is saved before every run and check.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { parse, type Design, type Env } from '$lib/eda/hdl';
  import { simulate, type Trace } from '$lib/eda/sim';
  import { checkRtl, type RtlSpec, type RtlVerdict } from '$lib/eda/exercise';
  import { highlightHdl } from '$lib/eda/highlight';
  import ExerciseFrame from './ExerciseFrame.svelte';
  import HdlEditor from '../eda/HdlEditor.svelte';
  import Waveform from '../eda/Waveform.svelte';

  let { spec }: { spec: RtlSpec } = $props();
  let value = $state('');
  let verdict = $state<(RtlVerdict & { source: string }) | null>(null);
  let shown = $state<{ design: Design; trace: Trace; stimulus: Env[]; mark?: number; source: string } | null>(null);
  let runError = $state<{ line: number; message: string } | null>(null);

  onMount(() => {
    value = progress.draft(spec.id, spec.code);
  });

  const solutionHtml = $derived(spec.solution ? `<pre class="hdl-code"><code>${highlightHdl(spec.solution.replace(/\n$/, ''))}</code></pre>` : undefined);
  const current = $derived(verdict && verdict.source === value ? verdict : null);
  const wave = $derived(shown && shown.source === value ? shown : null);
  const errorLine = $derived(runError?.line ?? (current && !current.ok ? current.line : undefined));

  function show(stimulus: Env[], mark?: number) {
    const r = parse(value);
    if (!r.ok) {
      runError = r.errors[0]!;
      shown = null;
      return;
    }
    runError = null;
    shown = { design: r.design, trace: simulate(r.design, stimulus), stimulus, mark, source: value };
  }

  function run() {
    progress.saveDraft(spec.id, value);
    const r = parse(value);
    const n = 12;
    const stim = spec.trace ?? (r.ok ? Array.from({ length: n }, (_, i) => Object.fromEntries(r.design.inputs.map((s) => [s.name, s.name === 'rst' ? 0 : s.width === 1 ? 1 : i % 2 ** s.width]))) : []);
    show(stim);
  }

  function check() {
    progress.saveDraft(spec.id, value);
    const v = checkRtl(spec, value);
    verdict = { ...v, source: value };
    if (v.ok) progress.markSolved(spec.id);
    if (!v.ok && v.stimulus) show(v.stimulus, v.stimulus.length - 1);
  }

  function restart() {
    value = spec.code;
    progress.saveDraft(spec.id, value);
    verdict = null;
    shown = null;
    runError = null;
  }

  const rows = $derived(Math.min(16, Math.max(6, spec.code.split('\n').length + 1)));
</script>

<ExerciseFrame id={spec.id} kind="Design it" title={spec.title} prompt={spec.prompt} hints={spec.hints} solution={solutionHtml} completionLabel="Checked">
  <HdlEditor bind:value {rows} {errorLine} label="Your design" oninput={() => (runError = null)} />
  <div class="bar ui">
    <button class="primary" onclick={check}>Check</button>
    <button onclick={run}>Run</button>
    <button class="ghost" onclick={restart}>Start again</button>
  </div>
  <div class="ui" aria-live="polite">
    {#if runError}
      <p class="bad">Line {runError.line}: {runError.message}</p>
    {:else if current?.ok}
      <p class="ok">{current.message}</p>
      {#if spec.why}<div class="why">{@html spec.why}</div>{/if}
    {:else if current}
      <p class="bad">{current.message}</p>
    {:else if verdict}
      <p class="stale">You edited the design since it was checked; check it again.</p>
    {/if}
  </div>
  {#if wave}
    <Waveform
      signals={[...wave.design.inputs, ...wave.design.regs, ...wave.design.outputs].map((s) => ({ name: s.name, width: s.width }))}
      cycles={wave.trace.cycles.map((c) => c.values)}
      mark={wave.mark ?? wave.trace.failure?.cycle}
      label="Waveform of your design"
    />
    {#if wave.mark !== undefined}<p class="note ui">The waveform shows the failing run; the shaded cycle is where it goes wrong.</p>{/if}
  {/if}
</ExerciseFrame>

<style>
  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.6rem;
  }
  button {
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink);
    border-radius: var(--radius-sm);
    padding: 0.35rem 0.9rem;
    font-weight: 600;
    cursor: pointer;
    min-height: 2.2rem;
  }
  button.primary {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--on-accent);
  }
  button.ghost {
    border-color: transparent;
    background: none;
    color: var(--ink-2);
  }
  .ok {
    color: var(--ok);
    font-weight: 600;
    margin: 0.6rem 0 0.3rem;
  }
  .bad {
    color: var(--bad);
    margin: 0.6rem 0 0;
  }
  .stale {
    color: var(--ink-2);
    margin: 0.6rem 0 0;
  }
  .why {
    font-family: var(--font-body);
    font-size: 1rem;
    color: var(--ink-2);
  }
  .note {
    font-size: 0.8rem;
    color: var(--ink-2);
    margin: 0.3rem 0 0;
  }
</style>
