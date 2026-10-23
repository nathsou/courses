<!--
  The harmonic series: a note on the piano (or any instrument) is not one frequency but a stack of them,
  at 1, 2, 3, 4 … times the lowest. Toggle the partials to build the tone; compare a second note's partials
  to see which coincide (the more that do, the smoother the interval sounds).
-->
<script lang="ts">
  import { onDestroy } from 'svelte';
  import { audio } from '$lib/audio/engine.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { noteName } from '$lib/music/names';
  import { frequency, spell } from '$lib/music/pitch';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  let { compare = false, base = 48 }: { compare?: boolean; base?: number } = $props();
  const N = 12;
  let on = $state(Array.from({ length: N }, (_, i) => i < 6));
  let second = $state(7); // semitones above the base
  let nodes: { o: OscillatorNode; g: GainNode }[] = [];
  let playing = $state(false);

  const f0 = $derived(frequency(base));
  const f1 = $derived(frequency(base + second));
  // Partials on a log-frequency axis from f0 to 16 f0.
  const x = (f: number) => 20 + (Math.log2(f / f0) / 4) * 560;
  const coincide = $derived(
    Array.from({ length: N }, (_, i) => (i + 1) * f0).filter((a) => Array.from({ length: N }, (_, j) => (j + 1) * f1).some((b) => Math.abs(1200 * Math.log2(a / b)) < 15)).length,
  );

  function stop() {
    for (const n of nodes) {
      n.g.gain.setTargetAtTime(0, audio.ctx!.currentTime, 0.05);
      n.o.stop(audio.ctx!.currentTime + 0.3);
    }
    nodes = [];
    playing = false;
  }
  function play(which: 'one' | 'both') {
    stop();
    const ctx = audio.start();
    const fs = which === 'both' ? [f0, f1] : [f0];
    for (const f of fs)
      on.forEach((v, i) => {
        if (!v) return;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = f * (i + 1);
        g.gain.value = 0;
        g.gain.setTargetAtTime(0.18 / (i + 1), ctx.currentTime, 0.02);
        o.connect(g).connect(ctx.destination);
        o.start();
        nodes.push({ o, g });
      });
    playing = true;
    setTimeout(stop, 2500);
  }
  onDestroy(() => playing && stop());
  const INTERVALS = [
    { value: 12, label: 'octave' },
    { value: 7, label: 'fifth' },
    { value: 5, label: 'fourth' },
    { value: 4, label: 'major third' },
    { value: 3, label: 'minor third' },
    { value: 2, label: 'tone' },
    { value: 1, label: 'semitone' },
    { value: 6, label: 'tritone' },
  ];
</script>

<Widget title="The harmonic series" subtitle={compare ? 'The partials of two notes. Where they coincide (marked), the two notes reinforce each other; where they nearly coincide, they clash.' : 'One piano note contains many frequencies: 1, 2, 3, 4… times the lowest. Switch partials on and off and listen.'}>
  {#snippet controls()}
    <button onclick={() => play('one')}><Icon name="play" size={14} /> Play {noteName(spell(base, 0), settings.nameOptions)} with these partials</button>
    {#if compare}
      <Segmented options={INTERVALS} value={second} label="Second note" onchange={(v) => (second = v)} size="sm" />
      <button onclick={() => play('both')}><Icon name="play" size={14} /> Play both</button>
    {/if}
  {/snippet}
  <div class="hs ui">
    <svg viewBox="0 0 600 {compare ? 150 : 100}" role="img" aria-label="Partials on a frequency axis">
      {#each on as v, i (i)}
        {@const px = x((i + 1) * f0)}
        <g class="p" class:off={!v} role="button" tabindex="0" aria-pressed={v} aria-label="Partial {i + 1}" onclick={() => (on[i] = !on[i])} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), (on[i] = !on[i]))}>
          <line x1={px} y1="70" x2={px} y2={70 - 55 / Math.sqrt(i + 1)} />
          <circle cx={px} cy={70 - 55 / Math.sqrt(i + 1)} r="5" />
          <text x={px} y="86">{i + 1}</text>
        </g>
      {/each}
      {#if compare}
        {#each Array(N) as _, j (j)}
          {@const fj = (j + 1) * f1}
          {#if fj <= 16 * f0}
            {@const hit = Array.from({ length: N }, (_, i) => (i + 1) * f0).some((a) => Math.abs(1200 * Math.log2(a / fj)) < 15)}
            <line class="q" class:hit x1={x(fj)} y1="100" x2={x(fj)} y2={100 + 40 / Math.sqrt(j + 1)} />
            {#if hit}<circle class="hitdot" cx={x(fj)} cy="96" r="3.5" />{/if}
          {/if}
        {/each}
      {/if}
    </svg>
    <p>
      {#if compare}
        {coincide} of the first {N} partials of {noteName(spell(base, 0), settings.nameOptions)} coincide with partials of {noteName(spell(base + second, 0), settings.nameOptions)}.
      {:else}
        Partial 2 is an octave above the first, 3 a fifth above that, 4 two octaves up, 5 a major third above that. Click a partial to switch it.
      {/if}
    </p>
  </div>
</Widget>

<style>
  .hs {
    padding: 0.8rem 1.15rem 1rem;
  }
  svg {
    width: 100%;
    height: auto;
  }
  .p {
    cursor: pointer;
  }
  .p line {
    stroke: var(--accent);
    stroke-width: 3;
  }
  .p circle {
    fill: var(--accent);
  }
  .p.off line,
  .p.off circle {
    stroke: var(--line-strong);
    fill: var(--line-strong);
  }
  .p text {
    font-size: 10px;
    text-anchor: middle;
    fill: var(--mute);
  }
  .q {
    stroke: var(--fn-t);
    stroke-width: 3;
  }
  .hitdot {
    fill: var(--ok);
  }
  p {
    margin: 0.3rem 0 0;
    font-size: 0.9rem;
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.75rem;
    font-weight: 600;
    cursor: pointer;
  }
</style>
