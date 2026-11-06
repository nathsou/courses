<!-- A long deck from src/lib/mech/decks.ts, shown and runnable. -->
<script lang="ts">
  import Deck from '$lib/components/content/Deck.svelte';
  import { DECKS } from '$lib/mech/decks';
  let { name, caption }: { name: string; caption?: string } = $props();
</script>

<Deck src={DECKS[name] ?? `# no deck named ${name}`} {caption} />
