<!--
  Latency check: the course plays a click, the reader presses any key in time with it. The average gap
  between click and key (sound out, through the speakers, the ear and the hand, and back over MIDI) is
  stored and subtracted in timing exercises. Four clicks count in, then eight are measured.
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { audio } from '$lib/audio/engine.svelte';
  import { instrument } from '$lib/midi/instrument.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  const BPM = 90;
  const COUNT_IN = 4;
  const MEASURED = 8;

  let running = $state(false);
  let beat = $state(-1);
  let result: { median: number; spread: number; n: number } | undefined = $state();
  let message = $state('');
  let clicks: number[] = [];
  let presses: number[] = [];
  let unsub: (() => void) | undefined;
  let timer: number | undefined;

  /** performance.now() time at which an audio-clock time is heard. */
  function heardAt(ctx: AudioContext, t: number): number {
    const ts = ctx.getOutputTimestamp?.();
    if (ts && ts.contextTime !== undefined && ts.performanceTime !== undefined && ts.performanceTime > 0) return ts.performanceTime + (t - ts.contextTime) * 1000;
    return performance.now() + (t - ctx.currentTime + (ctx.outputLatency || ctx.baseLatency || 0)) * 1000;
  }

  function start() {
    const ctx = audio.start();
    stop();
    running = true;
    result = undefined;
    message = '';
    clicks = [];
    presses = [];
    const t0 = ctx.currentTime + 0.3;
    const period = 60 / BPM;
    for (let i = 0; i < COUNT_IN + MEASURED; i++) {
      const t = t0 + i * period;
      audio.click(t, i % 4 === 0);
      clicks.push(heardAt(ctx, t));
    }
    const tick = () => {
      const now = performance.now();
      beat = clicks.filter((c) => c <= now).length - 1;
      if (now > clicks.at(-1)! + period * 1000) finish();
      else timer = window.setTimeout(tick, 30);
    };
    tick();
    unsub = instrument.subscribe((e) => {
      if (e.on) presses.push(e.time);
    });
  }

  function finish() {
    stop();
    const period = (60 / BPM) * 1000;
    const offsets: number[] = [];
    for (const c of clicks.slice(COUNT_IN)) {
      const near = presses.filter((p) => Math.abs(p - c) < period / 2);
      if (near.length) offsets.push(near.reduce((a, b) => (Math.abs(b - c) < Math.abs(a - c) ? b : a)) - c);
    }
    if (offsets.length < MEASURED / 2) {
      message = `Only ${offsets.length} of ${MEASURED} clicks had a key press near them. Try again, pressing on each click after the first four.`;
      return;
    }
    offsets.sort((a, b) => a - b);
    const median = offsets[Math.floor(offsets.length / 2)]!;
    const spread = (offsets.at(-1)! - offsets[0]!) / 2;
    result = { median: Math.round(median), spread: Math.round(spread), n: offsets.length };
    settings.latencyMs = Math.round(median);
    settings.save();
  }

  function stop() {
    running = false;
    beat = -1;
    clearTimeout(timer);
    unsub?.();
    unsub = undefined;
  }

  onDestroy(stop);
</script>

<Widget title="Tap along" subtitle="Press any key on each click. The first four clicks count you in." kind="Calibration">
  <div class="tap ui">
    <div class="beats" aria-hidden="true">
      {#each Array(COUNT_IN + MEASURED) as _, i (i)}
        <span class:countin={i < COUNT_IN} class:now={i === beat} class:past={i < beat}></span>
      {/each}
    </div>
    <div class="row">
      <button class="go" onclick={() => (running ? stop() : start())}>
        <Icon name={running ? 'stop' : 'play'} size={14} /> {running ? 'Stop' : result ? 'Again' : 'Start'}
      </button>
      <p aria-live="polite">
        {#if running}
          {beat < COUNT_IN ? 'Listen…' : 'Press on each click.'}
        {:else if result}
          Measured on {result.n} clicks: your key arrives <strong>{Math.abs(result.median)} ms {result.median >= 0 ? 'after' : 'before'}</strong> the click you hear, give or take {result.spread} ms. Saved: timing exercises allow for it.
        {:else if message}
          {message}
        {:else if settings.latencyMs}
          Saved from an earlier check: {settings.latencyMs} ms.
        {:else}
          Not measured yet.
        {/if}
      </p>
    </div>
  </div>
</Widget>

<style>
  .tap {
    display: grid;
    gap: 0.8rem;
  }
  .beats {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
  }
  .beats span {
    width: 1.1rem;
    height: 1.1rem;
    border-radius: 50%;
    border: 1.5px solid var(--line-strong);
  }
  .beats span.countin {
    border-style: dashed;
  }
  .beats span.past {
    background: var(--surface-3);
  }
  .beats span.now {
    background: var(--accent);
    border-color: var(--accent);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.9rem;
    flex-wrap: wrap;
  }
  .row p {
    margin: 0;
    font-size: 0.92rem;
    flex: 1 1 16rem;
  }
  .go {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 0;
    background: var(--accent);
    color: var(--on-accent);
    border-radius: var(--radius-sm);
    padding: 0.4rem 0.9rem;
    font-weight: 600;
    cursor: pointer;
  }
</style>
