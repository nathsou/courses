<!--
  Self-alignment: a cross-section along a transistor's channel. With an aluminium gate placed after the source
  and drain, a misaligned gate leaves part of the channel uncovered, and the transistor never turns on unless
  the gate was drawn long enough to overlap both. With a silicon gate made first, the source and drain are
  implanted around it and always meet its edges. A batch of transistors with random misalignment shows the
  yield; the overlap shows the price in capacitance. Lengths are illustrative of a 1960s process.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { rng } from '$lib/eda/sim';
  import { alignGate, alignYield, type GateProcess } from '$lib/fab/align';

  const L = 10; // µm, the channel the designer wants
  const SIGMA = 1; // µm, the standard deviation of the gate mask's misalignment
  let process = $state<GateProcess>('metal');
  let misalign = $state(0);
  let overlap = $state(1);
  let batch = $state<number[]>([]);
  let seed = 1;

  const res = $derived(alignGate(process, { length: L, overlap, misalign }));
  const X0 = -14;
  const X1 = 14;
  const sx = (um: number) => ((um - X0) / (X1 - X0)) * 600;
  const SURF = 120; // y of the silicon surface
  const expected = $derived(process === 'self' ? 1 : alignYield(overlap, SIGMA));
  const worked = $derived(batch.filter((m) => alignGate(process, { length: L, overlap, misalign: m }).works).length);
  function make() {
    const r = rng(seed++);
    // Box–Muller: Gaussian misalignments with standard deviation SIGMA.
    batch = Array.from({ length: 200 }, () => SIGMA * Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r()));
  }
  const pct = (x: number) => `${(x * 100).toFixed(x > 0.999 && x < 1 ? 2 : 1)} %`;
  const arrows = Array.from({ length: 23 }, (_, i) => X0 + 1 + i * ((X1 - X0 - 2) / 22));
</script>

<Widget title="Which comes first, the gate or the source and drain?" subtitle="A cross-section along the channel. Move the gate as a misaligned mask would. With the old order, the gate must be drawn long enough to cover the channel wherever it lands; with the new one, the source and drain are made around it.">
  {#snippet controls()}
    <Segmented
      bind:value={process}
      label="Process"
      options={[
        { value: 'metal', label: 'Aluminium gate, placed after' },
        { value: 'self', label: 'Silicon gate, self-aligned' },
      ]}
    />
    <Slider bind:value={misalign} min={-3} max={3} step={0.1} label="Gate misalignment" format={(v) => `${v > 0 ? '+' : ''}${v.toFixed(1)} µm`} />
    {#if process === 'metal'}<Slider bind:value={overlap} min={0} max={4} step={0.1} label="Overlap drawn on each side" format={(v) => `${v.toFixed(1)} µm`} />{/if}
  {/snippet}
  <svg viewBox={process === 'self' ? '0 0 600 220' : '0 64 600 156'} class="xs" role="img" aria-label="{res.works ? 'The gate covers the whole channel' : 'Part of the channel is uncovered: the transistor cannot turn on'}; gate capacitance {res.capacitance.toFixed(2)} times that of the channel">
    <rect x="0" y={SURF} width="600" height={220 - SURF} class="p" />
    <rect x="0" y={SURF} width={sx(res.sourceEnd)} height="34" class="np" />
    <rect x={sx(res.drainStart)} y={SURF} width={600 - sx(res.drainStart)} height="34" class="np" />
    <text x={Math.max(40, sx(res.sourceEnd) / 2)} y={SURF + 23} class="t c">source</text>
    <text x={Math.min(560, (sx(res.drainStart) + 600) / 2)} y={SURF + 23} class="t c">drain</text>
    <text x="300" y="206" class="t c dim">p-type silicon</text>
    <!-- The channel: an inversion layer forms only under the gate. -->
    {#if res.works}
      <rect x={sx(res.sourceEnd)} y={SURF} width={sx(res.drainStart) - sx(res.sourceEnd)} height="5" class="chan" />
    {:else}
      <rect x={sx(Math.max(res.sourceEnd, res.gate[0]))} y={SURF} width={Math.max(0, sx(Math.min(res.drainStart, res.gate[1])) - sx(Math.max(res.sourceEnd, res.gate[0])))} height="5" class="chan" />
      {#if res.gapSource > 0}<rect x={sx(res.sourceEnd)} y={SURF - 2} width={sx(res.gate[0]) - sx(res.sourceEnd)} height="10" class="gap" /><text x={sx((res.sourceEnd + res.gate[0]) / 2)} y={SURF + 52} class="t c bad">no channel</text>{/if}
      {#if res.gapDrain > 0}<rect x={sx(res.gate[1])} y={SURF - 2} width={sx(res.drainStart) - sx(res.gate[1])} height="10" class="gap" /><text x={sx((res.gate[1] + res.drainStart) / 2)} y={SURF + 52} class="t c bad">no channel</text>{/if}
    {/if}
    <rect x="0" y={SURF - 6} width="600" height="6" class="ox" />
    <rect x={sx(res.gate[0])} y={SURF - 34} width={sx(res.gate[1]) - sx(res.gate[0])} height="28" class="gate" class:poly={process === 'self'} />
    <text x={(sx(res.gate[0]) + sx(res.gate[1])) / 2} y={SURF - 16} class="t c on">{process === 'self' ? 'silicon' : 'aluminium'}</text>
    {#if process === 'self'}
      {#each arrows as a (a)}
        {@const blocked = a > res.gate[0] && a < res.gate[1]}
        <line x1={sx(a)} x2={sx(a)} y1="10" y2={blocked ? SURF - 40 : SURF - 8} class="ion" class:blocked />
      {/each}
      <text x="8" y="8" class="t dim" dominant-baseline="hanging">arsenic ions</text>
    {/if}
    {#if res.overlapSource > 0.05}<path d="M{sx(res.gate[0])} {SURF + 40}H{sx(res.sourceEnd)}" class="dim-line" />{/if}
    {#if res.overlapDrain > 0.05}<path d="M{sx(res.drainStart)} {SURF + 40}H{sx(res.gate[1])}" class="dim-line" />{/if}
  </svg>
  <dl class="nums ui">
    <div><dt>This transistor</dt><dd class:bad={!res.works} class:good={res.works}>{res.works ? 'turns on' : 'never turns on'}</dd></div>
    <div><dt>Gate over source and drain</dt><dd>{(res.overlapSource + res.overlapDrain).toFixed(1)} µm</dd></div>
    <div><dt>Gate capacitance, relative to the channel's</dt><dd>{res.works ? `× ${res.capacitance.toFixed(2)}` : '—'}</dd></div>
    <div><dt>Transistors that work, misalignment σ = {SIGMA} µm</dt><dd>{pct(expected)}</dd></div>
  </dl>
  <div class="batch ui">
    <button class="b" onclick={make}>Make 200 transistors</button>
    {#if batch.length}
      <div class="strip" role="img" aria-label="{worked} of {batch.length} transistors work">
        {#each batch as m, i (i)}
          <span class="d" class:fail={!alignGate(process, { length: L, overlap, misalign: m }).works} style:left="{((m + 4) / 8) * 100}%" style:top="{(i % 10) * 10}%"></span>
        {/each}
        <span class="zero"></span>
      </div>
      <p class="res">{worked} of {batch.length} work. Each dot is one transistor, placed by its misalignment (−4 to +4 µm).</p>
    {/if}
  </div>
</Widget>

<style>
  .xs {
    width: 100%;
    height: auto;
    display: block;
    font-family: var(--font-ui);
  }
  .p {
    fill: var(--m-p);
  }
  .np {
    fill: var(--m-nplus);
  }
  .ox {
    fill: var(--m-oxide);
    stroke: var(--m-oxide-edge);
    stroke-width: 0.6;
  }
  .gate {
    fill: var(--m-metal);
  }
  .gate.poly {
    fill: var(--m-poly);
  }
  .chan {
    fill: var(--electron);
  }
  .gap {
    fill: var(--bad);
    opacity: 0.55;
  }
  .ion {
    stroke: var(--ink-3);
    stroke-width: 1.4;
    stroke-dasharray: 5 3;
  }
  .ion.blocked {
    opacity: 0.6;
  }
  .dim-line {
    stroke: var(--ink-2);
    stroke-width: 3;
  }
  .t {
    font-size: 12px;
    fill: var(--ink);
  }
  @media (max-width: 560px) {
    .t {
      font-size: 25px;
    }
  }
  .t.c {
    text-anchor: middle;
  }
  .t.dim {
    fill: var(--ink-3);
  }
  .t.on {
    /* Dark text on the gate's mid-tone colour, in both themes. */
    fill: #1a1c24;
    font-weight: 600;
  }
  .t.bad {
    fill: var(--bad);
    font-weight: 600;
  }
  .nums {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 0.4rem 1rem;
    margin: 0.6rem 0 0;
    font-size: 0.82rem;
  }
  .nums dt {
    color: var(--ink-3);
  }
  .nums dd {
    margin: 0;
    font-family: var(--font-mono);
    font-weight: 600;
  }
  .nums dd.bad {
    color: var(--bad);
  }
  .nums dd.good {
    color: var(--ok);
  }
  .batch {
    margin-top: 0.8rem;
    font-size: 0.82rem;
  }
  .b {
    font: inherit;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.9rem;
    cursor: pointer;
    min-height: 2.2rem;
  }
  .strip {
    position: relative;
    height: 3.2rem;
    margin-top: 0.6rem;
    background: var(--surface-2);
    border-radius: 3px;
  }
  .strip .d {
    position: absolute;
    width: 0.4rem;
    height: 0.4rem;
    margin-left: -0.2rem;
    margin-top: 0.1rem;
    border-radius: 50%;
    background: var(--ok);
  }
  .strip .d.fail {
    background: var(--bad);
  }
  .strip .zero {
    position: absolute;
    left: 50%;
    top: 0;
    bottom: 0;
    border-left: 1px dashed var(--ink-3);
  }
  .res {
    margin: 0.4rem 0 0;
    color: var(--ink-2);
  }
</style>
