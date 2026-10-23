<!--
  Play a key: its name, its number from the bottom of the piano, its frequency, and the wave it makes,
  drawn against the wave of the same note an octave lower (exactly half as fast).
-->
<script lang="ts">
  import { instrument } from '$lib/midi/instrument.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { pitchName } from '$lib/music/names';
  import { frequency, spell } from '$lib/music/pitch';
  import Keyboard from '$lib/widgets/Keyboard.svelte';
  import Widget from '$lib/components/ui/Widget.svelte';

  let note = $state(69);
  $effect(() => {
    if (instrument.last?.on) note = instrument.last.midi;
  });
  const f = $derived(frequency(note));
  const lower = $derived(frequency(note - 12));
  // 20 ms of each wave, drawn as a sine.
  const W = 600;
  const H = 120;
  const path = (hz: number, y0: number, amp: number) => {
    const pts: string[] = [];
    for (let i = 0; i <= 600; i++) {
      const t = (i / 600) * 0.02;
      pts.push(`${(i / 600) * W},${(y0 + amp * Math.sin(2 * Math.PI * hz * t)).toFixed(1)}`);
    }
    return 'M' + pts.join('L');
  };
  const cycles = $derived(Math.round(f * 0.02 * 10) / 10);
</script>

<Widget title="What a pitch is" subtitle="Play any key. Its sound is a vibration; the higher the key, the faster the vibration.">
  <div class="pl ui">
    <div class="facts" aria-live="polite">
      <p><span class="big">{pitchName(spell(note, 0), settings.nameOptions)}</span></p>
      <p>Key {note - 20} of 88 from the bottom</p>
      <p><strong>{f.toFixed(f < 100 ? 1 : 0)}</strong> vibrations a second (hertz)</p>
      <p>An octave lower: {lower.toFixed(lower < 100 ? 1 : 0)} Hz, exactly half</p>
    </div>
    <svg viewBox="0 0 {W} {H}" role="img" aria-label="The wave of the note and of the note an octave lower, over a fiftieth of a second">
      <path d={path(f, 34, 26)} class="w1" />
      <path d={path(lower, 88, 22)} class="w2" />
      <text x="4" y="12">{pitchName(spell(note, 0), settings.nameOptions)}: {cycles} vibrations in 1/50 s</text>
      <text x="4" y={H - 2}>an octave lower: half as many</text>
    </svg>
    <Keyboard lo={21} hi={108} minKey={14} labels="c" label="Full piano keyboard" />
  </div>
</Widget>

<style>
  .pl {
    display: grid;
    gap: 0.7rem;
    padding: 0.9rem 1.15rem 1rem;
  }
  .facts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 1.4rem;
    align-items: baseline;
  }
  .facts p {
    margin: 0;
    font-size: 0.92rem;
  }
  .big {
    font-family: var(--font-display);
    font-size: 2rem;
    font-weight: 600;
  }
  svg {
    width: 100%;
    height: auto;
  }
  .w1,
  .w2 {
    fill: none;
    stroke-width: 1.6;
  }
  .w1 {
    stroke: var(--accent);
  }
  .w2 {
    stroke: var(--fn-t);
  }
  text {
    font-size: 11px;
    fill: var(--mute);
  }
</style>
