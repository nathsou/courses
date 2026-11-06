<!--
  A wheel-and-disc integrator in 3D. Turn the disc (x) while the carriage sets y, by hand or by a rule, and the
  counter adds up ∫ y dx. The plot underneath shows y against x, with the area under it.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import MachineView from '$lib/gl/MachineView.svelte';
  import { DISC_R, integratorModel, WHEEL_R, type IntegratorView } from '$lib/models/integrator';

  const model = integratorModel();
  const view: IntegratorView = $state.raw({ x: 0, y: 1, out: 0 });
  const YMAX = DISC_R - 0.2;
  const XMAX = 4 * Math.PI; // two turns of the disc
  let rule: 'hand' | 'linear' | 'sine' = $state('hand');
  let hand = $state(1); // y set by hand, disc units
  let running = $state(false);
  let tick = $state(0);
  let trace: [number, number][] = $state([[0, 1]]);
  let mv: { wake(): void } | undefined = $state();

  const yOf = (x: number) => (rule === 'linear' ? (x / XMAX) * YMAX : rule === 'sine' ? 1 + 0.8 * Math.sin(x) : hand);
  function animate(dt: number) {
    const target = yOf(view.x);
    view.y += (target - view.y) * Math.min(1, dt / 60);
    if (!running) return Math.abs(target - view.y) > 1e-3;
    const dx = Math.min(dt * 0.0016, XMAX - view.x);
    view.out += (view.y * dx) / WHEEL_R;
    view.x += dx;
    if (trace.length === 0 || view.x - trace.at(-1)![0] > 0.05) trace = [...trace, [view.x, view.y]];
    tick++;
    if (view.x >= XMAX - 1e-9) running = false;
    return true;
  }
  function start() {
    if (view.x >= XMAX - 1e-9) reset();
    running = !running;
    mv?.wake();
  }
  function reset() {
    view.x = 0;
    view.out = 0;
    view.y = yOf(0);
    trace = [[0, view.y]];
    running = false;
    tick++;
    mv?.wake();
  }
  $effect(() => {
    void hand;
    void rule;
    mv?.wake();
  });
  const integral = $derived((tick, view.out * WHEEL_R));
  const W = 300, H = 90;
  const px = (x: number) => 10 + (x / XMAX) * (W - 20);
  const py = (y: number) => H - 8 - (y / YMAX) * (H - 20);
  const area = $derived(trace.length > 1 ? `M${px(0)},${py(0)} ` + trace.map(([x, y]) => `L${px(x)},${py(y)}`).join(' ') + ` L${px(trace.at(-1)![0])},${py(0)} Z` : '');
</script>

<Widget title="A wheel-and-disc integrator" subtitle="The disc turns steadily: that is x. The carriage puts the wheel at distance y from the centre. The counter shows the wheel’s total roll, ∫ y dx." onreset={reset}>
  {#snippet controls()}
    <button class="go" onclick={start}>{running ? 'Pause' : 'Turn the disc'}</button>
    <label>y set <select bind:value={rule} onchange={reset}><option value="hand">by hand</option><option value="linear">to grow with x (y = kx)</option><option value="sine">to follow 1 + 0.8 sin x</option></select></label>
    {#if rule === 'hand'}<label>y <input type="range" min="0" max={YMAX} step="0.01" bind:value={hand} /> <span class="num">{(hand * 2).toFixed(2)}</span></label>{/if}
  {/snippet}
  <MachineView bind:this={mv} {model} data={view} {animate} label="A disc turned by a crank, a small wheel resting on it, and a counter on the wheel's shaft" height="20rem">
    {#snippet readout()}
      <div class="ro">
        <div><span class="k">x (disc turns)</span><strong class="num">{((tick, view.x) / (2 * Math.PI)).toFixed(2)}</strong></div>
        <div><span class="k">y (on the scale)</span><strong class="num">{((tick, view.y) * 2).toFixed(2)}</strong></div>
        <div><span class="k">∫ y dx (counter)</span><strong class="num">{(integral * 2).toFixed(2)}</strong></div>
      </div>
      <svg viewBox="0 0 {W} {H}" class="plot" role="img" aria-label="y against x; the shaded area is what the counter has added up">
        <line x1="10" y1={py(0)} x2={W - 10} y2={py(0)} class="axis" />
        {#if area}<path d={area} class="area" />{/if}
        <polyline points={trace.map(([x, y]) => `${px(x)},${py(y)}`).join(' ')} class="curve" />
        <text x={W - 12} y={H - 1} text-anchor="end" class="lab">x →</text>
        <text x="12" y="10" class="lab">y</text>
      </svg>
    {/snippet}
  </MachineView>
</Widget>

<style>
  button,
  select {
    font: inherit;
    font-size: 0.86rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.28rem 0.65rem;
    min-height: 2rem;
    color: var(--ink);
    cursor: pointer;
  }
  .go {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
  }
  label {
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
    font-size: 0.86rem;
  }
  .ro {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1.4rem;
  }
  .ro div {
    display: flex;
    flex-direction: column;
  }
  .k {
    font-size: 0.68rem;
    color: var(--ink-3);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .ro strong {
    font-family: var(--font-mono);
  }
  .plot {
    width: 100%;
    max-width: 26rem;
    margin-top: 0.4rem;
  }
  .axis {
    stroke: var(--line-strong);
  }
  .area {
    fill: var(--brass-soft);
  }
  .curve {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
  }
  .lab {
    font-size: 9px;
    fill: var(--ink-3);
  }
</style>
