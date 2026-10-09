<!--
  Code on the left, what the parser made of it on the right: tokens, ESTree, scopes, types and code paths, from
  the same typescript-eslint parser SonarJS uses first. `:::ast-explorer{tabs="tokens,tree"}` with a code block.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import CodeEditor from '$lib/editor/CodeEditor.svelte';
  import Inspector from '$lib/components/workbench/Inspector.svelte';

  type Tab = 'tokens' | 'tree' | 'scopes' | 'types' | 'paths';
  let { code, title = 'AST explorer', subtitle, tabs = 'tokens,tree,scopes,types,paths', initial, n, caption, lang = 'ts' }: { code: string; title?: string; subtitle?: string; tabs?: string; initial?: Tab; n?: string; caption?: string; lang?: 'ts' | 'js' } = $props();

  // svelte-ignore state_referenced_locally
  let source = $state(code);
  let cursor = $state<number | undefined>(undefined);
  let picked = $state<{ from: number; to: number } | null>(null);
  let editor = $state<CodeEditor | undefined>();
  const tabList = $derived(tabs.split(',').map((t) => t.trim()) as Tab[]);
</script>

<Widget {title} subtitle={subtitle ?? 'Edit the code; click a node to select its source.'} {n} {caption} onreset={() => editor?.setValue(code)}>
  <div class="explorer">
    <CodeEditor bind:this={editor} value={source} {lang} minLines={6} label="Code to parse" highlight={picked} onchange={(c) => (source = c)} oncursor={(o) => (cursor = o)} />
    <Inspector code={source} {cursor} tabs={tabList} initial={initial ?? tabList[0]} file={lang === 'js' ? '/explore/input.js' : '/explore/input.ts'} onpick={(r) => (picked = { from: r[0], to: r[1] })} />
  </div>
</Widget>

<style>
  .explorer {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.7rem;
    container-type: inline-size;
  }
  @media (min-width: 900px) {
    .explorer {
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    }
  }
</style>
