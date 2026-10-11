<script lang="ts">
  import type { Fill } from '$lib/exercises/types';
  import Choose from './Choose.svelte';
  let { data, id, report }: { data: Fill; id: string; report: (ok: boolean) => void } = $props();
  const items = $derived(data.items.map((it) => ({ ...it, sentence: it.de, de: undefined, prompt: undefined })));
</script>

<Choose data={{ items }} {id} {report} />
