<!--
  A metronome: tempo, beats per bar (with the first beat accented), start and stop, and tap tempo.
  The beat light is driven by the audio clock, so it stays in time with the clicks.
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { audio } from '$lib/audio/engine.svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  let { tempo = 80, beats = 4, title = 'Metronome', subdivide = false }: { tempo?: number; beats?: number; title?: string; subdivide?: boolean } = $props();

  let bpm = $state(80);
  let perBar = $state(4);
  let sub = $state(false);
  $effect.pre(() => {
    bpm = tempo;
    perBar = beats;
    sub = subdivide;
  });
  let running = $state(false);
  let beat = $state(-1);
  let next = 0;
  let n = 0;
  let timer: number | undefined;
  let taps: number[] = [];

  function schedule() {
    const ctx = audio.ctx!;
    while (next < ctx.currentTime + 0.15) {
      const period = 60 / bpm;
      const i = n % perBar;
      audio.click(next, i === 0);
      if (sub) audio.click(next + period / 2, false);
      const at = (next - ctx.currentTime) * 1000;
      setTimeout(() => (beat = i), Math.max(0, at));
      next += period;
      n++;
    }
    timer = window.setTimeout(schedule, 40);
  }
  function toggle() {
    if (running) return stop();
    const ctx = audio.start();
    running = true;
    n = 0;
    next = ctx.currentTime + 0.1;
    schedule();
  }
  function stop() {
    running = false;
    clearTimeout(timer);
    beat = -1;
  }
  function tap() {
    const now = performance.now();
    taps = [...taps.filter((t) => now - t < 3000), now];
    if (taps.length >= 3) {
      const gaps = taps.slice(1).map((t, i) => t - taps[i]!);
      bpm = Math.round(60000 / (gaps.reduce((a, b) => a + b, 0) / gaps.length));
      bpm = Math.min(220, Math.max(30, bpm));
    }
  }
  onDestroy(stop);
</script>

<Widget {title} subtitle="Beats per minute set the tempo; the first beat of each bar is accented." kind="Metronome">
  <div class="met ui">
    <div class="lights" aria-hidden="true">
      {#each Array(perBar) as _, i (i)}<span class:on={beat === i} class:first={i === 0}></span>{/each}
    </div>
    <div class="row">
      <button class="go" onclick={toggle} aria-pressed={running}><Icon name={running ? 'stop' : 'play'} size={14} /> {running ? 'Stop' : 'Start'}</button>
      <button onclick={tap}>Tap tempo</button>
      <Segmented options={[2, 3, 4, 6].map((v) => ({ value: v, label: `${v} beats` }))} value={perBar} label="Beats per bar" onchange={(v) => (perBar = v)} size="sm" />
      <label class="sub"><input type="checkbox" bind:checked={sub} /> Click the half-beats too</label>
    </div>
    <Slider bind:value={bpm} min={30} max={220} step={1} label="Tempo (beats per minute)" format={(v) => v.toFixed(0)} />
  </div>
</Widget>

<style>
  .met {
    display: grid;
    gap: 0.8rem;
    padding: 1rem 1.15rem;
  }
  .lights {
    display: flex;
    gap: 0.6rem;
  }
  .lights span {
    width: 1.4rem;
    height: 1.4rem;
    border-radius: 50%;
    border: 2px solid var(--line-strong);
    transition: background-color 40ms;
  }
  .lights span.first {
    border-color: var(--accent);
  }
  .lights span.on {
    background: var(--accent);
    border-color: var(--accent);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.6rem 1rem;
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.35rem 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }
  .go {
    background: var(--accent);
    color: var(--on-accent);
    border-color: var(--accent);
  }
  .sub {
    font-size: 0.86rem;
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
  }
</style>
