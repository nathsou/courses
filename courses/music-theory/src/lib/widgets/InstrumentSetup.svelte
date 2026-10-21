<!--
  Instrument and notation settings: connect a MIDI keyboard, choose the device, note names and terms,
  the computer-keyboard piano, and whether MIDI notes also sound through the course piano.
  Used in the top bar's panel and in the prologue and appendix C.
-->
<script lang="ts">
  import { instrument } from '$lib/midi/instrument.svelte';
  import { audio } from '$lib/audio/engine.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import type { NoteNameSystem } from '$lib/music/names';
  import type { TermSet } from '$lib/settings/locale';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  let { compact = false }: { compact?: boolean } = $props();

  const STATUS: Record<string, string> = {
    unsupported: 'This browser has no Web MIDI (Safari and iOS do not support it). Use Chrome, Edge or Firefox for a MIDI keyboard; the on-screen and computer keyboards work everywhere.',
    off: 'Not connected yet.',
    asking: 'Waiting for the browser’s permission…',
    denied: 'The browser refused MIDI access. Allow it in the site settings (the icon by the address bar), then reload.',
    'no-device': 'MIDI is on, but no keyboard is connected. Plug one in (USB, or Bluetooth paired in your system settings): it appears here by itself.',
    ready: 'Connected.',
  };

  const names: { value: NoteNameSystem; label: string; title: string }[] = [
    { value: 'letters', label: 'C D E', title: 'Letters: C D E F G A B' },
    { value: 'solfege', label: 'Do Ré Mi', title: 'Fixed-do solfège: Do Re Mi Fa Sol La Si' },
    { value: 'german', label: 'C D E … H', title: 'German: B means B♭, H means B' },
  ];
  const terms: { value: TermSet; label: string; title: string }[] = [
    { value: 'british', label: 'Crotchet, bar', title: 'British terms first' },
    { value: 'american', label: 'Quarter note, measure', title: 'American terms first' },
  ];
  const lastNote = $derived(instrument.last && instrument.last.source === 'midi' ? instrument.last.midi : undefined);
</script>

<div class="setup ui" class:compact>
  <section>
    <h5><Icon name="piano" size={15} /> MIDI keyboard</h5>
    <p class="status" class:ok={instrument.status === 'ready'}>{STATUS[instrument.status]}</p>
    {#if instrument.status === 'off' || instrument.status === 'denied'}
      <button class="primary" onclick={() => instrument.connect()}><Icon name="plug" size={14} /> Connect a MIDI keyboard</button>
    {/if}
    {#if instrument.inputs.length > 1}
      <label class="field">
        Listen to
        <select value={settings.midiInput ?? ''} onchange={(e) => instrument.selectInput((e.currentTarget as HTMLSelectElement).value || null)}>
          <option value="">Every connected input</option>
          {#each instrument.inputs as i (i.id)}<option value={i.id}>{i.name}</option>{/each}
        </select>
      </label>
    {:else if instrument.inputs.length === 1}
      <p class="device">{instrument.inputs[0]!.name}</p>
    {/if}
    {#if instrument.status === 'ready'}
      <p class="hint">{lastNote !== undefined ? `Last key received: MIDI note ${lastNote}.` : 'Press a key to check that it arrives.'}</p>
      <Toggle checked={settings.echoMidi} label="Also play my MIDI keys through the course piano" onchange={(v) => { settings.echoMidi = v; settings.save(); }} />
    {/if}
  </section>
  <section>
    <h5>Note names</h5>
    <Segmented options={names} value={settings.noteNames} label="Note names" onchange={(v) => settings.setNames(v)} size="sm" />
    <h5>Terms</h5>
    <Segmented options={terms} value={settings.terms} label="Terms" onchange={(v) => settings.setTerms(v)} size="sm" />
  </section>
  <section>
    <h5>Other ways to play</h5>
    <Toggle checked={settings.qwerty} label="Computer keyboard as a piano (A W S E D F …, Z and X change octave)" onchange={(v) => { settings.qwerty = v; settings.save(); }} />
    <Toggle checked={!audio.muted} label="Sound on" onchange={(v) => audio.setMuted(!v)} />
  </section>
</div>

<style>
  .setup {
    display: grid;
    gap: 1rem;
    font-size: 0.88rem;
  }
  section {
    display: grid;
    gap: 0.45rem;
    justify-items: start;
  }
  h5 {
    margin: 0.3rem 0 0;
    display: flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.72rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--mute);
  }
  p {
    margin: 0;
    color: var(--ink-2);
  }
  .status.ok {
    color: var(--ok);
    font-weight: 600;
  }
  .device {
    font-weight: 600;
    color: var(--ink);
  }
  .hint {
    font-size: 0.82rem;
  }
  .primary {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--accent);
    color: var(--on-accent);
    border: 0;
    border-radius: var(--radius-sm);
    padding: 0.4rem 0.9rem;
    font-weight: 600;
    cursor: pointer;
  }
  .field {
    display: grid;
    gap: 0.2rem;
  }
  select {
    font: inherit;
    padding: 0.25rem 0.4rem;
    background: var(--surface);
    color: var(--ink);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
  }
</style>
