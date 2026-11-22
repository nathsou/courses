<!--
  Building the CMOS inverter, step by step, in cross-section: a cut through the pMOS on the left beside a cut
  through the nMOS on the right. Each lithography step shows its mask, taken from the layout of chapter 12; light
  passes through the clear parts. Vertical sizes are exaggerated and not to scale.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { COLS_PER_LAMBDA, WIDTH, inverterFlow, waferAfter, type Column, type Wafer } from '$lib/fab/xsection';

  const flow = inverterFlow();
  const states: Wafer[] = flow.map((_, i) => waferAfter(i, flow));
  let step = $state(0);
  let mounted = $state(false);
  onMount(() => {
    progress.load();
    step = Math.min(flow.length - 1, progress.draft('process-flow/step', 0));
    mounted = true;
  });
  $effect(() => {
    if (!mounted) return;
    progress.saveDraft('process-flow/step', step);
    if (step === flow.length - 1) progress.markSolved('process-flow/walkthrough');
  });

  const s = $derived(flow[step]!);
  const w = $derived(states[step]!);
  const PX = 9;
  const L = 24;
  const W = L * 2 + WIDTH * PX;
  const YS = 3;
  const BOTTOM = -44;
  const TOP = 50;
  const H = (TOP - BOTTOM) * YS;
  const yy = (v: number) => (TOP - v) * YS;

  interface Seg {
    key: string;
    y0: number;
    y1: number;
  }
  function segments(c: Column): Seg[] {
    const out: Seg[] = [{ key: 'si-p', y0: BOTTOM, y1: c.si }];
    if (c.well === 'n') out.push({ key: 'si-n', y0: Math.max(BOTTOM, -32), y1: c.si });
    if (c.sd) out.push({ key: c.sd === 'n+' ? 'si-nplus' : 'si-pplus', y0: c.si - 6, y1: c.si });
    let h = c.si;
    for (const f of c.stack) {
      out.push({ key: f.mat === 'resist' && f.exposed ? 'resist-x' : f.mat, y0: h, y1: h + f.t });
      h += f.t;
    }
    return out;
  }
  const rects = $derived.by(() => {
    const out: { key: string; x0: number; x1: number; y0: number; y1: number }[] = [];
    let open = new Map<string, (typeof out)[number]>();
    w.cols.forEach((c, i) => {
      const next = new Map<string, (typeof out)[number]>();
      for (const seg of segments(c)) {
        const sig = `${seg.key}|${seg.y0.toFixed(3)}|${seg.y1.toFixed(3)}`;
        const run = open.get(sig);
        if (run) {
          run.x1 = i + 1;
          next.set(sig, run);
        } else {
          const r = { key: seg.key, x0: i, x1: i + 1, y0: seg.y0, y1: seg.y1 };
          out.push(r);
          next.set(sig, r);
        }
      }
      open = next;
    });
    return out;
  });
  const xpx = (col: number) => L + (col / COLS_PER_LAMBDA) * PX;
  const maskClear = $derived.by(() => {
    if (!s.mask) return [] as [number, number][];
    const ivs = [...s.mask.clear].sort((a, b) => a[0] - b[0]);
    if (!s.mask.inverted) return ivs;
    const out: [number, number][] = [];
    let x = 0;
    for (const [a, b] of ivs) {
      if (a > x) out.push([x, a]);
      x = Math.max(x, b);
    }
    if (x < WIDTH) out.push([x, WIDTH]);
    return out;
  });
  const LEGEND: [string, string][] = [
    ['si-p', 'p-type silicon'],
    ['si-n', 'n-type silicon (well)'],
    ['si-nplus', 'n⁺'],
    ['si-pplus', 'p⁺'],
    ['oxide', 'silicon dioxide'],
    ['nitride', 'silicon nitride'],
    ['poly', 'polysilicon'],
    ['resist', 'resist'],
    ['tungsten', 'tungsten'],
    ['copper', 'copper'],
  ];
  const last = flow.length - 1;
</script>

<Widget title="Building the inverter" subtitle="A cut through the pMOS transistor (left) beside a cut through the nMOS (right). Step through the process; at each lithography step the mask comes from the layout you fixed in chapter 12.">
  {#snippet controls()}
    <button class="b ui" onclick={() => (step = Math.max(0, step - 1))} disabled={step === 0} aria-label="Previous step">◀ Previous</button>
    <button class="b go ui" onclick={() => (step = Math.min(last, step + 1))} disabled={step === last} aria-label="Next step">Next ▶</button>
    <label class="sel ui"><span class="visually-hidden">Step</span>
      <select bind:value={step}>{#each flow as f, i (i)}<option value={i}>{i}. {f.title}</option>{/each}</select>
    </label>
  {/snippet}
  <p class="step ui"><span class="n">Step {step} of {last}</span> <strong>{s.title}</strong></p>
  <p class="text">{s.text}</p>
  <div class="scroll">
    <svg viewBox="0 {s.mask ? -58 : 0} {W} {H + (s.mask ? 58 : 0) + 4}" class="xs" role="img" aria-label="Cross-section after step {step}: {s.title}">
      {#if s.mask}
        <rect x={L} y="-40" width={WIDTH * PX} height="10" class="chrome" />
        {#each maskClear as [a, b], i (i)}
          <rect x={L + a * PX} y="-40" width={(b - a) * PX} height="10" class="glass" />
          {#each Array.from({ length: Math.max(1, Math.floor(((b - a) * PX) / 22)) }) as _, k (k)}
            {@const x = L + a * PX + ((k + 0.5) * (b - a) * PX) / Math.max(1, Math.floor(((b - a) * PX) / 22))}
            <path d="M{x},-28 L{x},-8 M{x - 3},-13 L{x},-8 L{x + 3},-13" class="ray" />
          {/each}
        {/each}
        <text x={L} y="-43" class="lab">mask “{s.mask.name}”, from the layout’s {s.mask.layer} layer</text>
      {/if}
      {#each rects as r, i (i)}
        <rect x={xpx(r.x0)} y={yy(r.y1)} width={xpx(r.x1) - xpx(r.x0) + 0.4} height={Math.max(0.5, (r.y1 - r.y0) * YS)} class="m {r.key}" />
      {/each}
      <text x={L + 16 * PX} y={H - 6} class="lab c">pMOS (in the n-well)</text>
      <text x={L + 48 * PX} y={H - 6} class="lab c">nMOS</text>
    </svg>
  </div>
  <ul class="legend ui">
    {#each LEGEND as [k, name] (k)}<li><i class="sw m {k}"></i>{name}</li>{/each}
  </ul>
</Widget>

<style>
  .b {
    font: inherit;
    font-size: 0.84rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.9rem;
    cursor: pointer;
    min-height: 2.2rem;
  }
  .b.go {
    border-color: var(--accent);
    background: var(--accent);
    color: var(--on-accent);
    font-weight: 700;
  }
  .b:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .sel select {
    font: inherit;
    font-size: 0.84rem;
    padding: 0.3rem 0.4rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--page);
    color: var(--ink);
    max-width: 100%;
    min-height: 2.2rem;
  }
  .step {
    margin: 0;
    font-size: 0.95rem;
  }
  .step .n {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--ink-3);
    margin-right: 0.4rem;
  }
  .text {
    margin: 0.3rem 0 0.6rem;
    font-size: 0.98rem;
    min-height: 3.2em;
  }
  .scroll {
    overflow-x: auto;
  }
  .xs {
    width: 100%;
    min-width: 30rem;
    height: auto;
    display: block;
    font-family: var(--font-ui);
  }
  .chrome {
    fill: var(--ink);
  }
  .glass {
    fill: var(--m-oxide);
  }
  .ray {
    fill: none;
    stroke: var(--m-resist);
    stroke-width: 1.6;
  }
  .m.si-p {
    fill: var(--m-p);
  }
  .m.si-n {
    fill: var(--m-n);
  }
  .m.si-nplus {
    fill: var(--m-nplus);
  }
  .m.si-pplus {
    fill: var(--m-pplus);
  }
  .m.oxide {
    fill: var(--m-oxide);
    stroke: var(--m-oxide-edge);
    stroke-width: 0.3;
  }
  .m.nitride {
    fill: var(--m-nitride);
  }
  .m.poly {
    fill: var(--m-poly);
  }
  .m.resist {
    fill: var(--m-resist);
  }
  .m.resist-x {
    fill: var(--m-resist-exposed);
  }
  .m.tungsten {
    fill: var(--m-tungsten);
  }
  .m.copper {
    fill: var(--m-metal);
  }
  .lab {
    font-size: 11px;
    fill: var(--ink-2);
  }
  .lab.c {
    text-anchor: middle;
    font-weight: 700;
    fill: var(--ink);
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.9rem;
    list-style: none;
    padding: 0;
    margin: 0.6rem 0 0;
    font-size: 0.76rem;
    color: var(--ink-2);
  }
  .sw {
    display: inline-block;
    width: 0.8rem;
    height: 0.8rem;
    margin-right: 0.3rem;
    vertical-align: -0.1rem;
    border-radius: 2px;
    background: var(--c);
  }
  .sw.si-p {
    background: var(--m-p);
  }
  .sw.si-n {
    background: var(--m-n);
  }
  .sw.si-nplus {
    background: var(--m-nplus);
  }
  .sw.si-pplus {
    background: var(--m-pplus);
  }
  .sw.oxide {
    background: var(--m-oxide);
    border: 1px solid var(--m-oxide-edge);
  }
  .sw.nitride {
    background: var(--m-nitride);
  }
  .sw.poly {
    background: var(--m-poly);
  }
  .sw.resist {
    background: var(--m-resist);
  }
  .sw.tungsten {
    background: var(--m-tungsten);
  }
  .sw.copper {
    background: var(--m-metal);
  }
</style>
