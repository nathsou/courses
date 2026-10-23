<!--
  Pitch-class set lab: hold notes (MIDI, computer keyboard or the keys below; or click keys to toggle them) and read
  the set in integer notation, its normal form, prime form, Forte name (for trichords) and interval-class vector.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { instrument } from '$lib/midi/instrument.svelte';
  import { intervalVector, normalForm, pcs, primeForm, primeText, TRICHORDS } from '$lib/music/pcset';
  import Keyboard, { type Mark } from './Keyboard.svelte';
  import Widget from '$lib/components/ui/Widget.svelte';

  let { title = 'Pitch-class set lab' }: { title?: string } = $props();

  let chosen: number[] = $state([0, 4, 7]);
  const set = $derived(pcs(chosen));
  const nf = $derived(normalForm(set));
  const pf = $derived(primeForm(set));
  const forte = $derived(set.length === 3 ? TRICHORDS[primeText(pf)] : undefined);
  const vec = $derived(intervalVector(set));
  const marks = $derived(Object.fromEntries(Array.from({ length: 25 }, (_, i) => 60 + i).filter((m) => set.includes(m % 12)).map((m) => [m, 'target' as Mark])));
  const fmt = (xs: number[]) => (xs.length ? xs.map((x) => (x === 10 ? 'T' : x === 11 ? 'E' : String(x))).join(' ') : '—');

  onMount(() =>
    instrument.subscribe((e) => {
      if (!e.on) return;
      const pc = e.midi % 12;
      chosen = set.includes(pc) ? set.filter((x) => x !== pc) : [...set, pc];
    }),
  );
</script>

<Widget {title} subtitle="Play a key to add its pitch class, play it again to remove it. C = 0, C♯ = 1 … B = 11 (T = 10, E = 11)." onreset={() => (chosen = [])}>
  <div class="pl ui">
    <Keyboard lo={60} hi={84} {marks} showHeld={false} label="Keyboard: play keys to build a set" />
    <dl>
      <dt>Set</dt><dd>{'{'}{fmt(set)}{'}'}</dd>
      <dt>Normal form</dt><dd>[{fmt(nf)}]</dd>
      <dt>Prime form</dt><dd>({fmt(pf)}){forte ? `, Forte ${forte}` : ''}</dd>
      <dt>Interval vector</dt><dd>&lt;{vec.join('')}&gt;</dd>
    </dl>
  </div>
</Widget>

<style>
  .pl {
    padding: 0.7rem 1.15rem 1rem;
    display: grid;
    gap: 0.6rem;
  }
  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.25rem 1rem;
    margin: 0;
    font-variant-numeric: tabular-nums;
  }
  dt {
    color: var(--ink-2);
  }
  dd {
    margin: 0;
    font-weight: 600;
    font-family: var(--font-ui);
  }
</style>
