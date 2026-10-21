<!-- A chord symbol in the reader's note names: :c[Am] reads Am, Lam or Am; :c[G7/B] reads G7/B, Sol7/Si or G7/H. -->
<script lang="ts">
  import { settings } from '$lib/state/settings.svelte';
  import { chordSymbol, parseChordSymbol } from '$lib/music/chord';

  let { chord }: { chord: string } = $props();
  const text = $derived.by(() => {
    try {
      return chordSymbol(parseChordSymbol(chord), settings.nameOptions);
    } catch {
      return chord;
    }
  });
</script>

<span class="chord-name">{text}</span>

<style>
  .chord-name {
    white-space: nowrap;
    font-weight: 600;
  }
</style>
