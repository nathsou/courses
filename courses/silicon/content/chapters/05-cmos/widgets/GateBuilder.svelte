<!--
  Build a static CMOS gate: write its pull-down network as series (·) and parallel (+) nMOS transistors; the
  pull-up network of pMOS transistors is derived as its dual. Toggle the inputs to see which transistors conduct,
  and check the gate against a target function. Each target, once matched, is recorded as checked.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { conducts, dual, gateTable, inputsOf, parseNet, seriesDepth, transistorCount, type Net } from '$lib/physics/circuits';

  interface Target {
    id: string;
    name: string;
    formula: string;
    inputs: string[];
    f: (e: Record<string, number>) => number;
  }
  const TARGETS: Target[] = [
    { id: 'nand2', name: 'NAND2', formula: 'Y = ¬(A·B)', inputs: ['A', 'B'], f: (e) => +!(e.A && e.B) },
    { id: 'nor2', name: 'NOR2', formula: 'Y = ¬(A + B)', inputs: ['A', 'B'], f: (e) => +!(e.A || e.B) },
    { id: 'nand3', name: 'NAND3', formula: 'Y = ¬(A·B·C)', inputs: ['A', 'B', 'C'], f: (e) => +!(e.A && e.B && e.C) },
    { id: 'aoi21', name: 'AOI21', formula: 'Y = ¬(A·B + C)', inputs: ['A', 'B', 'C'], f: (e) => +!((e.A && e.B) || e.C) },
    { id: 'oai21', name: 'OAI21', formula: 'Y = ¬((A + B)·C)', inputs: ['A', 'B', 'C'], f: (e) => +!((e.A || e.B) && e.C) },
    { id: 'aoi22', name: 'AOI22', formula: 'Y = ¬(A·B + C·D)', inputs: ['A', 'B', 'C', 'D'], f: (e) => +!((e.A && e.B) || (e.C && e.D)) },
  ];

  let { start = 'A' }: { start?: string } = $props();
  let src = $state('');
  let targetId = $state('nand2');
  let env = $state<Record<string, number>>({ A: 0, B: 0, C: 0, D: 0 });
  let mounted = $state(false);
  onMount(() => {
    progress.load();
    src = progress.draft('cmos/gate-builder', start);
    mounted = true;
  });
  $effect(() => {
    if (mounted) progress.saveDraft('cmos/gate-builder', src);
  });

  const target = $derived(TARGETS.find((t) => t.id === targetId)!);
  const parsed = $derived.by((): { net: Net } | { error: string } => {
    try {
      return { net: parseNet(src || ' ') };
    } catch (e) {
      return { error: (e as Error).message };
    }
  });
  const net = $derived('net' in parsed ? parsed.net : null);
  const inputs = $derived(net ? [...new Set([...target.inputs, ...inputsOf(net)])].sort() : target.inputs);
  const extra = $derived(net ? inputsOf(net).filter((n) => !target.inputs.includes(n)) : []);
  const table = $derived(net ? gateTable(net, inputs) : []);
  const matches = $derived(net && !extra.length ? table.map((r) => r.out === target.f(r.env)) : []);
  const ok = $derived(matches.length > 0 && matches.every(Boolean));
  $effect(() => {
    if (ok && mounted) progress.markSolved(`cmos/gate-${target.id}`);
  });
  const solved = $derived(mounted ? TARGETS.filter((t) => progress.isSolved(`cmos/gate-${t.id}`)).map((t) => t.id) : []);
  const output = $derived(net ? (conducts(net, env) ? 0 : 1) : null);

  // Layout of a series–parallel network as primitives (transistors and wires), top terminal at y = 0.
  interface Prim {
    kind: 'line' | 'fet';
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    name?: string;
    on?: boolean;
  }
  interface Box {
    w: number;
    h: number;
    prims: Prim[];
  }
  const FW = 64;
  const FH = 46;
  function layout(n: Net, pmos: boolean): Box {
    if (n.k === 'in') {
      const on = pmos ? !env[n.name] : !!env[n.name];
      return {
        w: FW,
        h: FH,
        prims: [
          { kind: 'line', x1: FW / 2, y1: 0, x2: FW / 2, y2: 8 },
          { kind: 'fet', x1: FW / 2, y1: 8, x2: FW / 2, y2: FH - 8, name: n.name, on },
          { kind: 'line', x1: FW / 2, y1: FH - 8, x2: FW / 2, y2: FH },
        ],
      };
    }
    const kids = n.parts.map((p) => layout(p, pmos));
    if (n.k === 'ser') {
      const w = Math.max(...kids.map((k) => k.w));
      let y = 0;
      const prims: Prim[] = [];
      for (const k of kids) {
        const dx = (w - k.w) / 2;
        for (const p of k.prims) prims.push({ ...p, x1: p.x1 + dx, x2: p.x2 + dx, y1: p.y1 + y, y2: p.y2 + y });
        y += k.h;
      }
      return { w, h: y, prims };
    }
    const h = Math.max(...kids.map((k) => k.h)) + 16;
    let x = 0;
    const prims: Prim[] = [];
    const centres: number[] = [];
    for (const k of kids) {
      const top = 8;
      for (const p of k.prims) prims.push({ ...p, x1: p.x1 + x, x2: p.x2 + x, y1: p.y1 + top, y2: p.y2 + top });
      const cx = x + k.w / 2;
      centres.push(cx);
      prims.push({ kind: 'line', x1: cx, y1: 0, x2: cx, y2: top });
      prims.push({ kind: 'line', x1: cx, y1: top + k.h, x2: cx, y2: h });
      x += k.w;
    }
    const w = x;
    prims.push({ kind: 'line', x1: centres[0]!, y1: 0, x2: centres.at(-1)!, y2: 0 });
    prims.push({ kind: 'line', x1: centres[0]!, y1: h, x2: centres.at(-1)!, y2: h });
    // Re-centre the parallel group's terminals on the box's middle.
    prims.push({ kind: 'line', x1: w / 2, y1: 0, x2: w / 2, y2: 0 });
    return { w, h, prims };
  }
  const pun = $derived(net ? layout(dual(net), true) : null);
  const pdn = $derived(net ? layout(net, false) : null);
  const W = $derived(Math.max(260, (pun?.w ?? 0) + 120, (pdn?.w ?? 0) + 120));
  const H = $derived(40 + (pun?.h ?? 0) + 30 + (pdn?.h ?? 0) + 40);
  const cx = $derived(W / 2);

  function toggle(name: string) {
    env = { ...env, [name]: env[name] ? 0 : 1 };
  }
</script>

<Widget title="Build a gate" subtitle="Write the pull-down network: letters are nMOS transistors (on when their input is 1); · puts them in series, + in parallel. The pMOS pull-up is drawn for you: it is the dual.">
  {#snippet controls()}
    <label class="field ui">
      <span>Pull-down network</span>
      <input bind:value={src} spellcheck="false" autocomplete="off" aria-describedby="gb-status" />
    </label>
    <label class="field ui">
      <span>Target</span>
      <select bind:value={targetId}>
        {#each TARGETS as t (t.id)}<option value={t.id}>{t.name}: {t.formula}{solved.includes(t.id) ? ' ✓' : ''}</option>{/each}
      </select>
    </label>
  {/snippet}
  <div class="inputs ui" role="group" aria-label="Input values (press to toggle)">
    {#each inputs as name (name)}
      <button class:hi={!!env[name]} onclick={() => toggle(name)} aria-pressed={!!env[name]}>{name} = {env[name] ? 1 : 0}</button>
    {/each}
    {#if output !== null}<span class="out">output Y = <strong>{output}</strong></span>{/if}
  </div>
  {#if 'error' in parsed}
    <p id="gb-status" class="bad ui">That network does not parse: {parsed.error}.</p>
  {:else if pun && pdn}
    <div class="scroll">
      <svg viewBox="0 0 {W} {H}" width={W} height={H} class="sch" role="img" aria-label="Schematic: pull-up network of {transistorCount(net!)} pMOS, pull-down network of {transistorCount(net!)} nMOS; output {output}">
        <line x1={cx - 60} x2={cx + 60} y1="14" y2="14" class="rail" />
        <text x={cx + 66} y="18" class="t">V_DD</text>
        <line x1={cx} x2={cx} y1="14" y2="40" class="w" />
        <g transform="translate({cx - pun.w / 2} 40)">
          {#each pun.prims as p, i (i)}
            {#if p.kind === 'line'}<line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} class="w" />
            {:else}
              <rect x={p.x1 - 7} y={p.y1} width="14" height={p.y2 - p.y1} class="fet" class:on={p.on} />
              <circle cx={p.x1 - 12} cy={(p.y1 + p.y2) / 2} r="3.5" class="bubble" />
              <text x={p.x1 - 18} y={(p.y1 + p.y2) / 2 + 4} class="t r">{p.name}</text>
            {/if}
          {/each}
        </g>
        <line x1={cx} x2={cx} y1={40 + pun.h} y2={70 + pun.h} class="w" />
        <circle cx={cx} cy={55 + pun.h} r="4" class="node" />
        <line x1={cx} x2={cx + 70} y1={55 + pun.h} y2={55 + pun.h} class="w" />
        <text x={cx + 74} y={59 + pun.h} class="t">Y = {output}</text>
        <g transform="translate({cx - pdn.w / 2} {70 + pun.h})">
          {#each pdn.prims as p, i (i)}
            {#if p.kind === 'line'}<line x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2} class="w" />
            {:else}
              <rect x={p.x1 - 7} y={p.y1} width="14" height={p.y2 - p.y1} class="fet" class:on={p.on} />
              <text x={p.x1 - 12} y={(p.y1 + p.y2) / 2 + 4} class="t r">{p.name}</text>
            {/if}
          {/each}
        </g>
        <line x1={cx} x2={cx} y1={70 + pun.h + pdn.h} y2={H - 14} class="w" />
        <line x1={cx - 60} x2={cx + 60} y1={H - 14} y2={H - 14} class="rail" />
        <text x={cx + 66} y={H - 10} class="t">ground</text>
      </svg>
    </div>
    <div class="facts ui">
      <span>{transistorCount(net!) * 2} transistors</span>
      <span>longest nMOS stack: {seriesDepth(net!)}</span>
      <span>longest pMOS stack: {seriesDepth(dual(net!))}</span>
    </div>
    <table class="tt ui">
      <thead><tr>{#each inputs as n (n)}<th>{n}</th>{/each}<th>your Y</th><th>{target.name}</th></tr></thead>
      <tbody>
        {#each table as r, k (k)}
          <tr class:miss={matches.length && !matches[k]}>{#each inputs as n (n)}<td>{r.env[n]}</td>{/each}<td>{r.out}</td><td>{target.f(r.env)}</td></tr>
        {/each}
      </tbody>
    </table>
    <p id="gb-status" class="ui" class:ok class:bad={!ok} aria-live="polite">
      {#if extra.length}{target.name} has no input {extra.join(', ')}.
      {:else if ok}Truth table checked: this is {target.name}, in {transistorCount(net!) * 2} transistors.
      {:else}Not yet {target.name}: the highlighted rows differ.{/if}
    </p>
  {/if}
</Widget>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .field input,
  .field select {
    font: inherit;
    font-family: var(--font-mono);
    font-size: 0.9rem;
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--page);
    color: var(--ink);
    min-height: 2.2rem;
  }
  .field select {
    font-family: var(--font-ui);
    max-width: 100%;
  }
  .inputs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
    margin-bottom: 0.6rem;
  }
  .inputs button {
    font-family: var(--font-mono);
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.7rem;
    cursor: pointer;
    min-height: 2.2rem;
  }
  .inputs button.hi {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }
  .out {
    margin-left: 0.6rem;
    font-size: 0.9rem;
  }
  .scroll {
    overflow-x: auto;
  }
  .sch {
    display: block;
    margin: 0 auto;
    font-family: var(--font-ui);
  }
  .rail {
    stroke: var(--ink);
    stroke-width: 3;
  }
  .w {
    stroke: var(--ink-2);
    stroke-width: 1.8;
  }
  .fet {
    fill: var(--surface);
    stroke: var(--ink);
    stroke-width: 1.5;
  }
  .fet.on {
    fill: var(--ok);
  }
  .bubble {
    fill: var(--surface);
    stroke: var(--ink);
    stroke-width: 1.3;
  }
  .node {
    fill: var(--ink);
  }
  .t {
    font-size: 12px;
    fill: var(--ink);
    font-weight: 600;
  }
  .t.r {
    text-anchor: end;
  }
  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1.2rem;
    font-size: 0.8rem;
    color: var(--ink-2);
    margin: 0.4rem 0;
  }
  .tt {
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    margin: 0.3rem 0;
  }
  .tt th,
  .tt td {
    padding: 0.12rem 0.55rem;
    border-bottom: 1px solid var(--line);
    text-align: center;
  }
  .tt tr.miss td {
    background: var(--bad-soft);
  }
  .ok {
    color: var(--ok);
    font-weight: 600;
  }
  .bad {
    color: var(--bad);
  }
  p {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>
