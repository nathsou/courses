<!--
  A Weft playground that starts from a program kept in snippets.ts (so that the tests can run it):

    ::snippet-playground{id="fix-the-test" n="…" caption="…"}

  It is the shared playground (`$lib/widgets/weft/WeftPlayground.svelte`): an editor that checks as you type,
  a simulator, the gates synth makes, and the program's tests.
-->
<script lang="ts">
  import WeftPlayground from '$lib/widgets/weft/WeftPlayground.svelte';
  import { SNIPPETS } from './snippets';

  let {
    id,
    title,
    subtitle,
    caption,
    n,
    tests = true,
    circuit = true,
    cost = false,
    tab,
  }: {
    id: string;
    title?: string;
    subtitle?: string;
    caption?: string;
    n?: string | number;
    tests?: boolean;
    circuit?: boolean;
    cost?: boolean;
    tab?: string;
  } = $props();

  const snippet = $derived(SNIPPETS[id]);
</script>

{#if snippet}
  <WeftPlayground code={snippet.code} tests={snippet.tests} top={snippet.top} title={title ?? snippet.title} {subtitle} {caption} {n} showTests={tests} {circuit} {cost} {tab} />
{:else}
  <p role="alert">Unknown snippet “{id}”.</p>
{/if}
