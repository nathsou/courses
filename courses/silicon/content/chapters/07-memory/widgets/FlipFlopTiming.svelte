<!--
  A D flip-flop's timing window. The data input changes at some moment around the clock's rising edge. Well
  before (more than the setup time): the new value is captured after the clock-to-Q delay. Well after (beyond
  the hold time): the old value stays. Inside the window: the flip-flop's internal latch starts near its balance
  point and takes longer to resolve, logarithmically. An illustrative model, not a particular library's cell.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';

  const SETUP = 20;
  const HOLD = 10;
  const TCQ = 35;
  const TAU = 8;

  let arrive = $state(-40);
  let fclk = $state(1000);
  let fdata = $state(100);

  // Time of the data change relative to the clock edge (negative: before it).
  const outcome = $derived.by(() => {
    if (arrive <= -SETUP) return { captured: true, delay: TCQ, meta: false };
    if (arrive >= HOLD) return { captured: false, delay: TCQ, meta: false };
    // Inside the window: the closer to its centre, the longer to resolve.
    const centre = (HOLD - SETUP) / 2;
    const half = (HOLD + SETUP) / 2;
    const dist = Math.max(1e-6, Math.abs(arrive - centre) / half);
    return { captured: arrive < centre, delay: TCQ + TAU * Math.log(1 / dist), meta: true };
  });

  const W = 600;
  const t0 = -80;
  const t1 = 160;
  const tx = (t: number) => 70 + ((t - t0) / (t1 - t0)) * (W - 80);
  const rows = { clk: 48, d: 102, q: 156 };
  const hi = (y: number) => y - 18;
  const lo = (y: number) => y + 12;
  const qPath = $derived.by(() => {
    const y = rows.q;
    const t = outcome.delay;
    if (!outcome.meta) {
      return outcome.captured ? `M${tx(t0)},${lo(y)} L${tx(t)},${lo(y)} L${tx(t) + 4},${hi(y)} L${tx(t1)},${hi(y)}` : `M${tx(t0)},${lo(y)} L${tx(t1)},${lo(y)}`;
    }
    const mid = (hi(y) + lo(y)) / 2;
    const fin = outcome.captured ? hi(y) : lo(y);
    return `M${tx(t0)},${lo(y)} L${tx(TCQ - 15)},${lo(y)} L${tx(TCQ - 5)},${mid + 2} L${tx(t - 6)},${mid} L${tx(t)},${fin} L${tx(t1)},${fin}`;
  });
  // Mean time between failures for a flip-flop sampling an unrelated signal, with resolution time t_r:
  // MTBF = e^(t_r/τ) / (T_w · f_clk · f_data), window T_w = setup + hold.
  const mtbf = (tr: number) => Math.exp(tr / TAU) / ((SETUP + HOLD) * 1e-12 * fclk * 1e6 * fdata * 1e6);
  const period = $derived(1e6 / fclk);
  const one = $derived(mtbf(period - TCQ - SETUP));
  const two = $derived(mtbf(2 * period - TCQ - SETUP));
  const human = (s: number) => {
    if (!Number.isFinite(s) || s > 1e300) return 'longer than anything meaningful';
    const y = s / 3.156e7;
    if (y > 1e13) return `about 10^${Math.floor(Math.log10(y))} years, far longer than the age of the universe`;
    if (y > 1e9) return `${(y / 1e9).toPrecision(2)} billion years${y > 1.4e10 ? ' (longer than the age of the universe)' : ''}`;
    if (y > 1) return `${y.toPrecision(2)} years`;
    if (s > 86400) return `${(s / 86400).toPrecision(2)} days`;
    if (s > 1) return `${s.toPrecision(2)} s`;
    return `${(s * 1e9).toPrecision(2)} ns`;
  };
</script>

<Widget title="Setup, hold and metastability" subtitle="The data input D changes at a chosen moment around the clock’s rising edge (at time 0). The flip-flop’s output Q follows after the clock-to-Q delay, if it can.">
  {#snippet controls()}
    <Slider bind:value={arrive} min={-70} max={40} step={0.25} label="D changes at" format={(v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)} ps`} />
  {/snippet}
  <svg viewBox="0 0 {W} 204" class="wave" role="img" aria-label="Q {outcome.meta ? 'goes metastable and resolves' : 'changes'} after {outcome.delay.toFixed(1)} ps; {outcome.captured ? 'new value captured' : 'old value kept'}">
    <rect x={tx(-SETUP)} y="20" width={tx(HOLD) - tx(-SETUP)} height="166" class="window" />
    <text x={tx(-SETUP) + 3} y="198" class="lbl">setup</text>
    <text x={tx(HOLD) - 3} y="198" class="lbl r">hold</text>
    <line x1={tx(0)} x2={tx(0)} y1="20" y2="186" class="edge" />
    <text x="6" y={rows.clk} class="name">clock</text>
    <path d="M{tx(t0)},{lo(rows.clk)} L{tx(0)},{lo(rows.clk)} L{tx(0)},{hi(rows.clk)} L{tx(t1)},{hi(rows.clk)}" class="sig" />
    <text x="6" y={rows.d} class="name">D</text>
    <path d="M{tx(t0)},{lo(rows.d)} L{tx(arrive)},{lo(rows.d)} L{tx(arrive) + 3},{hi(rows.d)} L{tx(t1)},{hi(rows.d)}" class="sig d" />
    <text x="6" y={rows.q} class="name">Q</text>
    <path d={qPath} class="sig q" class:meta={outcome.meta} />
    {#each [-60, -40, -20, 0, 20, 40, 60, 80, 100, 120, 140] as t (t)}<text x={tx(t)} y="4" class="tick">{t}</text>{/each}
  </svg>
  <p class="verdict ui" class:meta={outcome.meta}>
    {#if !outcome.meta}{outcome.captured ? 'D changed before the setup time: the new value is captured' : 'D changed after the hold time: the old value is kept'}; Q settles {outcome.delay.toFixed(0)} ps after the clock edge.
    {:else}D changed inside the window: the internal latch starts near its balance point. Q hangs between 0 and 1 and resolves to the {outcome.captured ? 'new' : 'old'} value after {outcome.delay.toFixed(1)} ps instead of {TCQ}.{/if}
  </p>
  <h5 class="ui">Sampling a signal from another clock</h5>
  <div class="mtbf ui">
    <Slider bind:value={fclk} min={100} max={4000} step={50} label="Clock" format={(v) => `${(v / 1000).toFixed(2)} GHz`} />
    <Slider bind:value={fdata} min={1} max={1000} step={1} label="Input toggles" format={(v) => `${v} MHz`} />
    <dl class="nums">
      <div><dt>Mean time between failures, one flip-flop</dt><dd>{human(one)}</dd></div>
      <div><dt>…two in a row (a synchroniser)</dt><dd>{human(two)}</dd></div>
    </dl>
  </div>
</Widget>

<style>
  .wave {
    width: 100%;
    height: auto;
    display: block;
    font-family: var(--font-ui);
  }
  .window {
    fill: var(--maybe-soft);
  }
  .edge {
    stroke: var(--ink-3);
    stroke-dasharray: 3 3;
  }
  .sig {
    fill: none;
    stroke: var(--ink);
    stroke-width: 2;
  }
  .sig.d {
    stroke: var(--series-1);
  }
  .sig.q {
    stroke: var(--series-4);
  }
  .sig.q.meta {
    stroke: var(--bad);
  }
  .name {
    font-size: 13px;
    font-weight: 700;
    fill: var(--ink);
  }
  .tick {
    font-size: 10px;
    fill: var(--ink-3);
    text-anchor: middle;
    dominant-baseline: hanging;
  }
  .lbl {
    font-size: 10px;
    fill: var(--ink-2);
  }
  .lbl.r {
    text-anchor: end;
  }
  .verdict {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
  .verdict.meta {
    color: var(--bad);
  }
  h5 {
    margin: 1rem 0 0.4rem;
    font-size: 0.9rem;
  }
  .mtbf {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1.5rem;
    align-items: flex-end;
  }
  .nums {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
    gap: 0.4rem 1rem;
    margin: 0;
    font-size: 0.82rem;
    flex: 1 1 20rem;
  }
  .nums dt {
    color: var(--ink-3);
  }
  .nums dd {
    margin: 0;
    font-family: var(--font-mono);
    font-weight: 600;
  }
</style>
