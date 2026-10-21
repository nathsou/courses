<!-- A note name in the reader's chosen system: :n[C4] reads C4, Do4 or C4; :n[Bb] reads B♭, Si♭ or B. -->
<script lang="ts">
  import { settings } from '$lib/state/settings.svelte';
  import { noteName, pitchName } from '$lib/music/names';
  import { parsePitch } from '$lib/music/pitch';

  let { note }: { note: string } = $props();
  const hasOctave = $derived(/\d$/.test(note));
  const text = $derived.by(() => {
    try {
      const p = parsePitch(note);
      return hasOctave ? pitchName(p, settings.nameOptions) : noteName(p, settings.nameOptions);
    } catch {
      return note;
    }
  });
</script>

<span class="note-name">{text}</span>

<style>
  .note-name {
    font-variant-numeric: lining-nums;
    white-space: nowrap;
  }
</style>
