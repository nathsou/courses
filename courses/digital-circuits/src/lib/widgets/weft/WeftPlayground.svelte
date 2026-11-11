<!--
  A Weft design you can edit, simulate, test and look inside:

    ::weft-playground{src="designs/counter.weft" top="counter"}

  Everything runs on synth, compiled to WebAssembly (in Web Workers): the editor checks as you type
  (synth's diagnostics, with their suggested fixes, and hover); Simulate drives the design on synth's
  simulator; Circuit draws the gates synth makes of it, running on the course's digital engine in step with
  the simulator; Tests runs the design's tests (`$lib/weft/testbench.ts`). Hovering a register or port in the
  source lights its flip-flops or switches, and the other way round.
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import WeftEditor from '$lib/weft/WeftEditor.svelte';
  import type { WeftAnalysis } from '$lib/weft/analysis';
  import type { FormatOutcome } from '$lib/weft/editor/index';
  import type { GateNetlist } from '$lib/weft/gates';
  import type { TestRun } from '$lib/weft/testbench';
  import type { Circuit } from '$lib/sim/netlist/types';
  import type { Synth } from '$lib/synth/api';
  import CircuitView from './CircuitView.svelte';
  import Problems from './Problems.svelte';
  import SimPanel from './SimPanel.svelte';
  import Tabs from './Tabs.svelte';
  import TestsPanel from './TestsPanel.svelte';
  import { designFile, designSource, designTests } from './designs';
  import { Probe } from './probe.svelte';
  import { TbDriver } from './tbDriver.svelte';

  let {
    src,
    code: inlineCode,
    tests: testsSource,
    top,
    title,
    subtitle,
    caption,
    n,
    showTests = true,
    circuit: withCircuit = true,
    maxLines = 30,
    tab: initialTab,
  }: {
    /** A reference design: `designs/counter.weft` (its tests: `designs/counter.tests`). */
    src?: string;
    /** Or the source itself. */
    code?: string;
    /** The tests, in the course's test language (default: the design's `.tests` file). */
    tests?: string;
    /** The module to simulate (default: the one no other module instantiates). */
    top?: string;
    title?: string;
    subtitle?: string;
    caption?: string;
    n?: string | number;
    /** Show the Tests tab. */
    showTests?: boolean;
    /** Show the Circuit tab. */
    circuit?: boolean;
    maxLines?: number;
    /** The tab shown first on a narrow screen: code, run, circuit or tests. */
    tab?: string;
  } = $props();

  const original = untrack(() => inlineCode ?? (src ? designSource(src) : undefined) ?? '// design not found\n');
  const originalTests = untrack(() => testsSource ?? (src ? designTests(src) : undefined) ?? '');
  const file = untrack(() => designFile(src));
  const uid = $props.id();

  let code = $state(original);
  let testCode = $state(originalTests);
  let analysis: WeftAnalysis | undefined = $state.raw();
  let pending = $state(true);
  let stale = $state(false);
  let tab = $state(untrack(() => initialTab ?? 'code'));
  let editor: WeftEditor | undefined = $state();
  let view: CircuitView | undefined = $state();
  let status = $state('');
  let statusTimer: ReturnType<typeof setTimeout> | undefined;
  let testRun: TestRun | undefined = $state.raw();
  let testing = $state(false);
  let circuit: { circuit: Circuit; gates: GateNetlist } | undefined = $state.raw();
  let circuitError = $state('');
  let building = $state(false);

  const withTests = $derived(showTests && (testCode.trim().length > 0 || originalTests.length > 0));
  const lane = (name: 'sim' | 'run') => import('$lib/synth/client').then((m): Synth => m.synthOn(name));
  const driver = new TbDriver(() => lane('sim'));
  const probe = new Probe();

  const files = () => [{ name: file, text: code }];
  const registersOf = (a: WeftAnalysis) => [...new Set(a.refs.filter((r) => r.item.kind === 'Register').map((r) => a.source.slice(r.from, r.to)))];

  let circuitFor = '';
  async function buildCircuit(text: string) {
    if (!withCircuit || circuitFor === text) return;
    circuitFor = text;
    building = true;
    try {
      const [{ run }, { gatesFromGraph }, { layoutNetlist }, synth] = await Promise.all([import('$lib/synth/api'), import('$lib/weft/gates'), import('$lib/sim/layout/gates'), lane('run')]);
      const r = await run(synth, { files: [{ name: file, text }], top, stop: 'synth', testbench: true });
      if (circuitFor !== text) return;
      const g = r.stages.find((s) => s.id === 'gates_optimised')?.graph;
      if (!r.ok || !g) {
        circuitError = r.ok ? 'synth made no gates of this design.' : '';
        return;
      }
      const gates = gatesFromGraph(g);
      const layout = layoutNetlist(gates.netlist, top ?? file, { maxElements: 320 });
      for (const c of layout.circuit.components) {
        const info = gates.elements[c.id];
        if (!info) continue;
        c.label = c.type === 'toggle' || c.type === 'indicator' ? info.name + (info.bit !== undefined && (gates.ports.find((p) => p.name === info.name)?.width ?? 1) > 1 ? `[${info.bit}]` : '') : c.type.startsWith('dff') ? `${info.name}${(gates.byName[info.name]?.length ?? 1) > 1 ? `[${info.bit}]` : ''}` : '';
      }
      circuit = { circuit: layout.circuit, gates };
      circuitError = '';
    } catch (e) {
      circuit = undefined;
      circuitError = `This design has no drawing as gates: ${e instanceof Error ? e.message : String(e)}.`;
    } finally {
      building = false;
    }
  }

  function onanalysis(a: WeftAnalysis) {
    pending = false;
    analysis = a;
    const ok = !a.diagnostics.some((d) => d.severity === 'error');
    if (ok) {
      void driver.load(files(), top, registersOf(a));
      void buildCircuit(a.source);
      stale = false;
    } else stale = true;
    if (testRun) testRun = undefined;
  }

  async function runTests() {
    testing = true;
    tab = 'tests';
    try {
      const [{ runTestSource }, synth] = await Promise.all([import('$lib/weft/testbench'), lane('sim')]);
      testRun = await runTestSource(synth, files(), top, testCode);
    } catch (e) {
      testRun = { ok: false, error: e instanceof Error ? e.message : String(e), results: [] };
    } finally {
      testing = false;
    }
  }

  function say(text: string) {
    status = text;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => (status = ''), 2500);
  }
  function onformat(o: FormatOutcome) {
    say(o === 'changed' ? 'Formatted.' : o === 'unchanged' ? 'Already formatted.' : 'Cannot format: fix the syntax errors first.');
  }
  function reset() {
    code = original;
    testCode = originalTests;
    testRun = undefined;
    say('Restored the original code.');
  }
  function reveal(offset: number) {
    tab = 'code';
    queueMicrotask(() => editor?.reveal(offset));
  }

  let pg: HTMLDivElement | undefined = $state();
  onMount(() => {
    const ro = new ResizeObserver(([e]) => {
      if (e && e.contentRect.width >= 736 && tab === 'code') tab = 'run';
    });
    if (pg) ro.observe(pg);
    return () => {
      ro.disconnect();
      clearTimeout(statusTimer);
      driver.dispose();
    };
  });

  const errors = $derived(analysis?.diagnostics.filter((d) => d.severity === 'error').length ?? 0);
  const panes = $derived([
    { id: 'code', label: 'Code', narrowOnly: true, badge: errors ? String(errors) : undefined },
    { id: 'run', label: 'Simulate' },
    { id: 'circuit', label: 'Circuit', hidden: !withCircuit },
    { id: 'tests', label: 'Tests', hidden: !withTests },
  ]);
  const problems = $derived(analysis?.diagnostics.length ?? 0);
  const testLines = $derived(Math.max(4, Math.min(24, testCode.split('\n').length)));
</script>

{#snippet controls()}
  <div class="bar ui" role="toolbar" aria-label="Editor tools">
    <button class="tool" type="button" onclick={() => editor?.format()} title="Format the code as synth fmt does (Shift+Alt+F)">Format</button>
    <button class="tool" type="button" onclick={reset} disabled={code === original && testCode === originalTests}>Reset code</button>
    {#if withTests}<button class="tool primary" type="button" onclick={runTests} disabled={testing || errors > 0}>Run tests</button>{/if}
    <span class="status" role="status" aria-live="polite">{status}</span>
  </div>
{/snippet}

<Widget title={title ?? file} {subtitle} {caption} {n} kind="Weft playground" live={false} {controls}>
  <div class="pg" data-tab={tab} bind:this={pg}>
    <div class="tabbar">
      <Tabs tabs={panes} bind:value={tab} label="Views" idPrefix="{uid}-tab" />
    </div>

    <div class="pane pane-code" id="{uid}-tab-panel-code" role="tabpanel" aria-labelledby="{uid}-tab-code">
      <WeftEditor
        bind:this={editor}
        bind:doc={code}
        {file}
        {top}
        {onanalysis}
        {onformat}
        {maxLines}
        probe={probe.ranges}
        onpointer={(h) => probe.fromSource(analysis, circuit?.gates, h)}
        label="Weft source of {title ?? file}"
      />
      <Problems {analysis} {pending} onreveal={reveal} />
    </div>

    <div class="pane pane-run" id="{uid}-tab-panel-run" role="tabpanel" aria-labelledby="{uid}-tab-run">
      {#if stale && driver.ready}<p class="stale ui">The source has errors: this is the last version that compiled.</p>{/if}
      <SimPanel {driver} oninput={(name, value) => view?.apply({ op: 'set', name, value })} ontick={() => view?.apply({ op: 'tick' })} onreset={() => view?.apply({ op: 'reset' })} />
    </div>

    {#if withCircuit}
      <div class="pane pane-circuit" id="{uid}-tab-panel-circuit" role="tabpanel" aria-labelledby="{uid}-tab-circuit">
        {#if circuit}
          <p class="stats ui">
            <span><b>{circuit.gates.stats.ands}</b> AND</span><span><b>{circuit.gates.stats.nots}</b> NOT</span>
            {#if circuit.gates.stats.adders}<span><b>{circuit.gates.stats.adders}</b> full adders</span>{/if}
            <span><b>{circuit.gates.stats.flipFlops}</b> flip-flops</span>
            <span class="hint">The gates synth made of the design, after optimisation. Hover a register or port in the code to light its parts. Flip the switches; press <em>Step clock</em> on the Simulate tab.</span>
          </p>
          <CircuitView
            bind:this={view}
            circuit={circuit.circuit}
            gates={circuit.gates}
            highlight={probe.ids}
            replay={driver.history}
            dim={stale}
            label="Gate-level circuit of {title ?? file}"
            onhover={(id) => probe.fromElement(analysis, circuit?.gates, id)}
            oninput={(name, value) => driver.set(name, value)}
          />
        {:else}
          <p class="note ui">{circuitError || (pending || building ? 'Building the circuit…' : 'Fix the errors in the source to see its circuit.')}</p>
        {/if}
      </div>
    {/if}

    {#if withTests}
      <div class="pane pane-tests" id="{uid}-tab-panel-tests" role="tabpanel" aria-labelledby="{uid}-tab-tests">
        <label class="tlabel ui" for="{uid}-tests">Tests <small>(<code>set</code>, <code>step</code>, <code>expect</code>, <code>for</code>)</small></label>
        <textarea id="{uid}-tests" class="tsrc" bind:value={testCode} rows={testLines} spellcheck="false" autocomplete="off" aria-label="Tests of {title ?? file}"></textarea>
        <TestsPanel run={testRun} running={testing} />
        {#if !testRun && !testing}
          <button class="tool primary" type="button" onclick={runTests} disabled={errors > 0}>Run tests</button>
        {/if}
      </div>
    {/if}
  </div>
  <span class="sr" aria-live="polite">{problems ? `${problems} problems in the source` : ''}</span>
</Widget>

<style>
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.5rem;
    flex: 1 1 100%;
  }
  .tool {
    height: 1.9rem;
    padding: 0 0.75rem;
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    background: var(--panel);
    color: var(--fg);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
  }
  .tool:hover:not(:disabled) {
    border-color: var(--copper);
    color: var(--copper-ink);
  }
  .tool:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .tool:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }
  .tool.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
  }
  .tool.primary:hover:not(:disabled) {
    background: var(--accent-ink);
    border-color: var(--accent-ink);
    color: var(--on-accent);
  }
  .status {
    font-size: 0.78rem;
    color: var(--mute);
    margin-left: 0.3rem;
  }
  .pg {
    container-type: inline-size;
    display: grid;
    gap: 0.8rem;
    min-width: 0;
  }
  .pane {
    display: none;
    grid-template-columns: minmax(0, 1fr);
    min-width: 0;
    gap: 0.6rem;
  }
  .pg[data-tab='code'] .pane-code,
  .pg[data-tab='run'] .pane-run,
  .pg[data-tab='circuit'] .pane-circuit,
  .pg[data-tab='tests'] .pane-tests {
    display: grid;
    align-content: start;
  }
  .stale {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    color: var(--maybe);
  }
  .note {
    color: var(--mute);
    font-size: 0.85rem;
    margin: 0.4rem 0;
  }
  .stats {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 1rem;
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .stats b {
    font-family: var(--font-mono);
    color: var(--fg);
  }
  .hint {
    flex: 1 1 100%;
    color: var(--mute);
    font-size: 0.76rem;
  }
  .tlabel {
    font-size: 0.78rem;
    color: var(--ink-2);
  }
  .tlabel small {
    color: var(--mute);
  }
  .tsrc {
    width: 100%;
    box-sizing: border-box;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    line-height: 1.55;
    padding: 0.5rem 0.7rem;
    background: var(--pn);
    color: var(--code-def, var(--fg));
    border: 1px solid var(--line);
    border-radius: 6px;
    resize: vertical;
    tab-size: 4;
  }
  .tsrc:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 1px;
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  @container (min-width: 46rem) {
    .pg {
      grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
      grid-template-rows: auto auto 1fr;
      align-items: start;
      column-gap: 1.1rem;
    }
    .pane-code {
      display: grid;
      grid-column: 1;
      grid-row: 1 / span 3;
    }
    .tabbar {
      grid-column: 2;
      grid-row: 1;
    }
    .pane-run,
    .pane-circuit,
    .pane-tests {
      grid-column: 2;
      grid-row: 2;
    }
    .pg[data-tab='code'] .pane-run {
      display: grid;
      align-content: start;
    }
  }
</style>
