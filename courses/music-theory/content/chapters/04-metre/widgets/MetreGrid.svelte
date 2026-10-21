<!--
  Metre made audible: a short course-written tune played in 2/4, 3/4 or 4/4 with a click that accents the
  first beat. The counting is shown beat by beat.
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { audio, type ScheduledNote } from '$lib/audio/engine.svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  let beats = $state(3);
  let playing = $state(false);
  let current = $state(-1);
  let timers: number[] = [];
  const BPM = 96;
  // One bar of melody per metre, written for the course: strong beat low, weak beats higher.
  const BARS: Record<number, number[][]> = {
    2: [[48, 64], [67]],
    3: [[48, 64], [67], [67]],
    4: [[48, 64], [67], [55, 64], [67]],
  };
  const COUNT: Record<number, string[]> = { 2: ['1', '2'], 3: ['1', '2', '3'], 4: ['1', '2', '3', '4'] };

  function play() {
    stop();
    const ctx = audio.start();
    playing = true;
    const beat = 60 / BPM;
    const notes: ScheduledNote[] = [];
    const beatsAt: { t: number; i: number }[] = [];
    for (let bar = 0; bar < 4; bar++) {
      BARS[beats]!.forEach((group, i) => {
        const t = (bar * beats + i) * beat;
        for (const m of group) notes.push({ midi: m, time: t, duration: beat * 0.9, velocity: i === 0 ? 100 : i === 2 && beats === 4 ? 78 : 58 });
        beatsAt.push({ t, i });
      });
    }
    const { start, done } = audio.playSequence(notes);
    for (const { t, i } of beatsAt) {
      audio.click(start + t, i === 0);
      timers.push(window.setTimeout(() => (current = i), (start + t - ctx.currentTime) * 1000));
    }
    done.then(() => {
      playing = false;
      current = -1;
    });
  }
  function stop() {
    for (const t of timers) clearTimeout(t);
    timers = [];
    audio.stopSequence();
    playing = false;
    current = -1;
  }
  onDestroy(stop);
</script>

<Widget title="Strong and weak beats" subtitle="The same pulse, grouped in twos, threes or fours. Listen for the stronger first beat of each group.">
  {#snippet controls()}
    <Segmented options={[{ value: 2, label: '2/4' }, { value: 3, label: '3/4' }, { value: 4, label: '4/4' }]} value={beats} label="Time signature" onchange={(v) => { beats = v; if (playing) play(); }} size="sm" />
    <button class="go" onclick={() => (playing ? stop() : play())}><Icon name={playing ? 'stop' : 'play'} size={14} /> {playing ? 'Stop' : 'Play four bars'}</button>
  {/snippet}
  <div class="mg ui">
    <div class="count" aria-live="off">
      {#each COUNT[beats] as c, i (i)}
        <span class:strong={i === 0} class:medium={beats === 4 && i === 2} class:on={current === i}>{c}</span>
      {/each}
    </div>
  </div>
</Widget>

<style>
  .mg {
    padding: 1rem 1.15rem 1.2rem;
  }
  .count {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }
  .count span {
    display: grid;
    place-items: center;
    width: 3.2rem;
    height: 3.2rem;
    border-radius: 50%;
    border: 2px solid var(--line-strong);
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--ink-2);
  }
  .count span.strong {
    width: 3.8rem;
    height: 3.8rem;
    font-size: 1.5rem;
    border-color: var(--accent);
    color: var(--accent);
  }
  .count span.medium {
    width: 3.5rem;
    height: 3.5rem;
  }
  .count span.on {
    background: var(--accent);
    color: var(--on-accent);
    border-color: var(--accent);
  }
  .go {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    background: var(--accent);
    color: var(--on-accent);
    border: 0;
    border-radius: var(--radius-sm);
    padding: 0.35rem 0.85rem;
    font-weight: 600;
    cursor: pointer;
  }
</style>
