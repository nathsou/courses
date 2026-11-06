<!--
  Shrink a steel part and see how fast it can switch. A part of size L has mass ∝ L³; the force a material can
  safely carry is ∝ L² (stress × area); it must move a distance ∝ L. Then t = √(2md/F) ∝ L: halve the part
  and it switches twice as fast.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';

  let logL = $state(-2); // log10 of size in metres
  const RHO = 7900; // kg/m³, steel
  const SIGMA = 1e7; // Pa, a modest working stress
  const L = $derived(10 ** logL);
  const m = $derived(RHO * L ** 3);
  const d = $derived(0.1 * L);
  const F = $derived(SIGMA * L * L);
  const t = $derived(Math.sqrt((2 * m * d) / F));
  const sound = $derived(L / 5000); // time for a push to cross the part at the speed of sound in steel
  function size(x: number): string {
    if (x >= 1) return `${x.toPrecision(2)} m`;
    if (x >= 1e-3) return `${(x * 1e3).toPrecision(2)} mm`;
    if (x >= 1e-6) return `${(x * 1e6).toPrecision(2)} µm`;
    return `${(x * 1e9).toPrecision(2)} nm`;
  }
  function time(x: number): string {
    if (x >= 1) return `${x.toPrecision(2)} s`;
    if (x >= 1e-3) return `${(x * 1e3).toPrecision(2)} ms`;
    if (x >= 1e-6) return `${(x * 1e6).toPrecision(2)} µs`;
    if (x >= 1e-9) return `${(x * 1e9).toPrecision(2)} ns`;
    return `${(x * 1e12).toPrecision(2)} ps`;
  }
</script>

<Widget title="Shrink the part" subtitle="A steel part of size L must move a tenth of its size, pushed with the force its own cross-section can safely carry. The time it takes is proportional to L.">
  {#snippet controls()}
    <label class="sl">Size L <input type="range" min="-8" max="0" step="0.05" bind:value={logL} aria-label="Size of the part (logarithmic)" /> <strong class="num">{size(L)}</strong></label>
  {/snippet}
  <div class="grid ui">
    <div><span class="k">mass</span><strong class="num">{m.toExponential(1)} kg</strong><span class="s">∝ L³</span></div>
    <div><span class="k">force it can carry</span><strong class="num">{F.toExponential(1)} N</strong><span class="s">∝ L²</span></div>
    <div><span class="k">distance to move</span><strong class="num">{size(d)}</strong><span class="s">∝ L</span></div>
    <div class="big"><span class="k">switching time √(2md/F)</span><strong class="num">{time(t)}</strong><span class="s">∝ L</span></div>
    <div><span class="k">a push crossing it (sound in steel)</span><strong class="num">{time(sound)}</strong><span class="s">∝ L</span></div>
  </div>
  <p class="note ui">
    {#if L > 0.005}A part this size is a clock or a calculator wheel: hundreds of microseconds at best, and in practice far slower, because nobody drives brass at its breaking stress.
    {:else if L > 2e-6}A part this size is a watch part or a MEMS structure: microseconds.
    {:else if L > 2e-8}Nanometre-scale mechanics: nanoseconds, as fast as the valves of the 1940s and the transistors of the 1960s.
    {:else}Molecular scale, like Drexler’s rod logic: tenths of a nanosecond. The physics allows it; making and wiring billions of such parts is the problem.{/if}
  </p>
</Widget>

<style>
  .sl {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.86rem;
    width: 100%;
  }
  .sl input {
    flex: 1;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
    gap: 0.6rem 1rem;
  }
  .grid div {
    display: flex;
    flex-direction: column;
    border-left: 2px solid var(--line-strong);
    padding-left: 0.5rem;
  }
  .grid .big {
    border-left-color: var(--fx-red);
  }
  .k {
    font-size: 0.7rem;
    color: var(--ink-3);
  }
  .grid strong {
    font-family: var(--font-mono);
    font-size: 1rem;
  }
  .big strong {
    font-size: 1.25rem;
    color: var(--fx-red);
  }
  .s {
    font-size: 0.72rem;
    color: var(--ink-3);
  }
  .note {
    font-size: 0.84rem;
    color: var(--ink-2);
    margin: 0.7rem 0 0;
  }
</style>
