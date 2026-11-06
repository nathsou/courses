<!-- The lunar gearing of the Antikythera mechanism in 3D: turn the handle, watch the Sun and the Moon. -->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import MachineView from '$lib/gl/MachineView.svelte';
  import { antikytheraModel, OFFSET, PIN_R, type AntikytheraView } from '$lib/models/antikythera';
  import { anomaly, SIDEREAL_PER_YEAR, YEAR_DAYS } from '$lib/mech/antikythera';

  const model = antikytheraModel();
  const view: AntikytheraView = $state.raw({ years: 0, anomaly: true });
  let running = $state(false);
  let rate = $state(20); // days per second
  let withAnomaly = $state(true);
  let tick = $state(0);
  let mv: { wake(): void } | undefined = $state();

  function animate(dt: number) {
    if (!running) return false;
    view.years += (dt / 1000) * (rate / YEAR_DAYS);
    tick++;
    return true;
  }
  function toggle() {
    running = !running;
    mv?.wake();
  }
  function jump(days: number) {
    view.years += days / YEAR_DAYS;
    tick++;
    mv?.wake();
  }
  $effect(() => {
    view.anomaly = withAnomaly;
    mv?.wake();
  });
  const deg = (r: number) => {
    const d = ((((r * 180) / Math.PI) % 360) + 360) % 360;
    return d >= 359.95 ? 0 : d;
  };
  const info = $derived.by(() => {
    void tick;
    const days = view.years * YEAR_DAYS;
    const sun = view.years * 2 * Math.PI;
    const meanMoon = view.years * SIDEREAL_PER_YEAR * 2 * Math.PI;
    const a = withAnomaly ? anomaly(meanMoon, PIN_R, OFFSET) : 0;
    const elong = deg(meanMoon + a - sun);
    const phase = elong < 22.5 || elong >= 337.5 ? 'new' : elong < 67.5 ? 'waxing crescent' : elong < 112.5 ? 'first quarter' : elong < 157.5 ? 'waxing gibbous' : elong < 202.5 ? 'full' : elong < 247.5 ? 'waning gibbous' : elong < 292.5 ? 'last quarter' : 'waning crescent';
    return { days, sun: deg(sun), moon: deg(meanMoon + a), lead: (a * 180) / Math.PI, phase, months: view.years * SIDEREAL_PER_YEAR };
  });
  // The Moon's speed round one month, relative to its mean (pin-and-slot).
  const curve = Array.from({ length: 121 }, (_, i) => {
    const t = (i / 120) * 2 * Math.PI, h = 1e-4;
    const v = (anomaly(t + h, PIN_R, OFFSET) - anomaly(t - h, PIN_R, OFFSET)) / (2 * h) + 1;
    return `${(i / 120) * 280 + 10},${60 - (v - 1) * 220}`;
  }).join(' ');
</script>

<Widget title="The lunar gearing" subtitle="The handle turns the main wheel once a year. Follow the train to the pin-and-slot pair, then watch the Moon pointer speed up and slow down round each month." onreset={() => { view.years = 0; running = false; tick++; mv?.wake(); }}>
  {#snippet controls()}
    <button class="go" onclick={toggle}>{running ? 'Pause' : 'Turn the handle'}</button>
    <button onclick={() => jump(1)}>+1 day</button>
    <button onclick={() => jump(27.32)}>+1 sidereal month</button>
    <label>Speed <select bind:value={rate}><option value={5}>5 days/s</option><option value={20}>20 days/s</option><option value={90}>90 days/s</option></select></label>
    <label class="chk"><input type="checkbox" bind:checked={withAnomaly} /> pin-and-slot</label>
  {/snippet}
  <MachineView bind:this={mv} {model} data={view} {animate} label="The lunar gear train of the Antikythera mechanism, with Sun and Moon pointers on a zodiac dial" height="22rem">
    {#snippet readout()}
      <div class="ro">
        <div><span class="k">Days</span><strong class="num">{info.days.toFixed(1)}</strong></div>
        <div><span class="k">Sun</span><strong class="num">{info.sun.toFixed(1)}°</strong></div>
        <div><span class="k">Moon</span><strong class="num">{info.moon.toFixed(1)}°</strong></div>
        <div><span class="k">Moon ahead of mean</span><strong class="num">{Math.abs(info.lead) < 0.05 ? '' : info.lead > 0 ? '+' : '−'}{Math.abs(info.lead).toFixed(1)}°</strong></div>
        <div><span class="k">Phase</span><strong>{info.phase}</strong></div>
        <div><span class="k">Moon pointer turns</span><strong class="num">{info.months.toFixed(2)}</strong></div>
      </div>
      <svg viewBox="0 0 300 100" class="plot" role="img" aria-label="The Moon pointer's speed over one month, relative to its average: faster for half the month, slower for the other half">
        <line x1="10" y1="60" x2="290" y2="60" class="axis" />
        <polyline points={curve} class="curve" />
        <text x="12" y="95" class="lab">one month →</text>
        <text x="12" y="14" class="lab">speed (mean = the line)</text>
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
    gap: 0.4rem 1.3rem;
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
    max-width: 24rem;
    margin-top: 0.4rem;
  }
  .axis {
    stroke: var(--line-strong);
    stroke-dasharray: 3 3;
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
