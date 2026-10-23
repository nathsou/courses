<!-- A term in the reader's British or American set: :t[crotchet] reads crotchet or quarter note; {both} adds the other in brackets. -->
<script lang="ts">
  import { settings } from '$lib/state/settings.svelte';

  let { word, both = false }: { word: string; both?: boolean } = $props();
  const text = $derived(settings.term(word, both));
</script>

{text}
