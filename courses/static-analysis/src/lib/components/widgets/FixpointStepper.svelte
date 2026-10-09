<!--
  A dataflow analysis, one worklist step at a time, on the statement-level CFG of a JavaScript function:
  constant propagation, live variables or reaching definitions (Part III), intervals (Part V).
  `:::fixpoint-stepper{analysis="liveness"}` with a ```js block.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import CodeEditor from '$lib/editor/CodeEditor.svelte';
  import CodePathGraph from '$lib/components/workbench/CodePathGraph.svelte';
  import type { CodePathInfo } from '$lib/sa/runtime/inspect';
  import { buildCfg, CfgError, type Cfg } from '$lib/sa/flow/cfg';
  import { solve, type Analysis } from '$lib/sa/flow/dataflow';
  import { ANALYSES, type AnalysisKey } from '$lib/sa/flow/analyses';

  let { code, analysis = 'constants', n, caption, title, subtitle }: { code: string; analysis?: AnalysisKey | string; n?: string; caption?: string; title?: string; subtitle?: string } = $props();

  // svelte-ignore state_referenced_locally
  let source = $state(code);
  let editor = $state<CodeEditor | undefined>();
  let k = $state(0);
  // svelte-ignore state_referenced_locally
  const chosen = ANALYSES[analysis as AnalysisKey] as Analysis<unknown> | undefined;

  const built = $derived.by((): { cfg?: Cfg; error?: string } => {
    try {
      return { cfg: buildCfg(source) };
    } catch (e) {
      return { error: e instanceof CfgError ? e.message : String(e) };
    }
  });
  const solution = $derived(built.cfg && chosen ? solve(built.cfg, chosen) : undefined);
  $effect(() => {
    void solution;
    k = 0;
  });

  /** Facts after `k` steps: bottom everywhere, then each step's change. */
  const current = $derived.by(() => {
    if (!built.cfg || !solution || !chosen) return undefined;
    const out = built.cfg.nodes.map(() => undefined as unknown);
    for (let i = 0; i < k; i++) {
      const s = solution.steps[i]!;
      if (s.changed || out[s.node] === undefined) out[s.node] = s.after;
    }
    return out;
  });
  const step = $derived(k > 0 ? solution?.steps[k - 1] : undefined);
  const done = $derived(!!solution && k >= solution.steps.length);

  const path = $derived.by((): CodePathInfo | undefined => {
    const cfg = built.cfg;
    if (!cfg) return undefined;
    return {
      id: 'cfg',
      name: cfg.name,
      range: [0, source.length],
      initial: `n${cfg.entry}`,
      final: [`n${cfg.exit}`],
      returned: [`n${cfg.exit}`],
      thrown: [],
      loops: cfg.backEdges.map(([a, b]) => [`n${a}`, `n${b}`]),
      segments: cfg.nodes.map((node) => ({ id: `n${node.id}`, reachable: true, next: node.succ.map((x) => `n${x}`), prev: node.pred.map((x) => `n${x}`), nodes: node.range ? [{ type: node.kind, range: node.range }] : [] })),
    };
  });
  const labels = $derived(built.cfg ? Object.fromEntries(built.cfg.nodes.map((node) => [`n${node.id}`, [node.text]])) : {});
  const facts = $derived.by(() => {
    if (!built.cfg || !current || !chosen) return {};
    const cfg = built.cfg;
    return Object.fromEntries(cfg.nodes.map((node) => [`n${node.id}`, current[node.id] === undefined ? '·' : `${chosen.direction === 'forward' ? '↓' : '↑'} ${chosen.lattice.format(current[node.id], cfg)}`]));
  });
  const fmt = (v: unknown) => (built.cfg && chosen ? chosen.lattice.format(v, built.cfg) : '');
  const nodeText = (id: number) => built.cfg?.nodes[id]?.text ?? '';
</script>

<Widget title={title ?? chosen?.name ?? 'Fixpoint'} subtitle={subtitle ?? 'Step through the worklist algorithm until nothing changes.'} {n} {caption} onreset={() => { editor?.setValue(code); k = 0; }}>
  <div class="fs">
    <div class="left">
      <CodeEditor bind:this={editor} value={source} lang="js" minLines={8} label="Function" onchange={(c) => (source = c)} highlight={step && built.cfg?.nodes[step.node]?.range ? { from: built.cfg.nodes[step.node]!.range![0], to: built.cfg.nodes[step.node]!.range![1] } : null} />
      <div class="controls ui">
        <button onclick={() => (k = Math.max(0, k - 1))} disabled={k === 0}>Back</button>
        <button class="primary" onclick={() => (k = Math.min(solution?.steps.length ?? 0, k + 1))} disabled={done}>Step</button>
        <button onclick={() => (k = solution?.steps.length ?? 0)} disabled={done}>Run to fixpoint</button>
        <button onclick={() => (k = 0)} disabled={k === 0}>Restart</button>
        <span class="count">step {k} / {solution?.steps.length ?? 0}</span>
      </div>
      <div class="explain ui" aria-live="polite">
        {#if built.error}
          <p class="err">{built.error}</p>
        {:else if !chosen}
          <p class="err">Unknown analysis “{analysis}”.</p>
        {:else if step}
          <p><strong>Node n{step.node}</strong> <code>{nodeText(step.node)}</code></p>
          <p>{chosen.direction === 'forward' ? (chosen.edge ? 'In (join over the incoming edges, each refined by its branch)' : 'In (join of predecessors)') : 'Out (join of successors)'}: <code>{fmt(step.input)}</code></p>
          <p>{chosen.direction === 'forward' ? 'Out' : 'In'}: <code>{fmt(step.before)}</code> → <code>{fmt(step.after)}</code> {#if step.changed}<span class="chg">changed: its {chosen.direction === 'forward' ? 'successors' : 'predecessors'} go back on the worklist</span>{:else}<span class="same">unchanged</span>{/if}</p>
          <p>Worklist: {#if step.worklist.length}{#each step.worklist as w (w)}<code class="wl">n{w}</code>{/each}{:else}<em>empty: fixpoint reached</em>{/if}</p>
        {:else}
          <p>Every fact starts at ⊥. The worklist holds every node; press <strong>Step</strong>.</p>
        {/if}
        {#if done && solution && !solution.truncated}<p class="fix">Fixpoint after {solution.steps.length} steps.</p>{/if}
        {#if solution?.truncated}<p class="err">Stopped after {solution.steps.length} steps without reaching a fixpoint.</p>{/if}
      </div>
    </div>
    <div class="graph">
      {#if path}
        <CodePathGraph {path} code={source} {labels} {facts} picked={step ? `n${step.node}` : null} changed={step?.changed ? `n${step.node}` : null} />
      {/if}
    </div>
  </div>
</Widget>

<style>
  .fs {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.8rem;
    container-type: inline-size;
  }
  @media (min-width: 900px) {
    .fs {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
  }
  .graph {
    overflow: auto;
    max-height: 640px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--pn);
  }
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
    margin-top: 0.5rem;
  }
  .controls button {
    font: inherit;
    font-size: 0.82rem;
    padding: 0.25rem 0.7rem;
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
  }
  .controls button.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-fg, #fff);
  }
  .controls button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .count {
    font-size: 0.8rem;
    color: var(--mute);
    font-family: var(--font-mono);
  }
  .explain {
    font-size: 0.84rem;
    margin-top: 0.5rem;
  }
  .explain p {
    margin: 0.2rem 0;
  }
  .chg {
    color: var(--accent-ink);
    font-weight: 600;
  }
  .same {
    color: var(--mute);
  }
  .wl {
    margin-right: 0.25rem;
  }
  .fix {
    color: var(--ok);
    font-weight: 600;
  }
  .err {
    color: var(--bad);
  }
</style>
