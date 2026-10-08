<!--
  Types, annotated: each occurrence of the chosen names is labelled with the type TypeScript computes at that point,
  after narrowing. A switch turns strict mode (and with it strictNullChecks) off, to show what a project without it
  gives the analyser. `:::type-view{names="user,input"}` with a code block.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import CodeEditor, { type EditorMark } from '$lib/editor/CodeEditor.svelte';
  import { inspectRemote } from '$lib/sa/runtime/client';
  import type { InspectResult } from '$lib/sa/runtime/inspect';

  let { code, names = '', n, caption, title = 'Types after narrowing', subtitle = 'Each occurrence of a name is labelled with its type at that point.' }: { code: string; names?: string; n?: string; caption?: string; title?: string; subtitle?: string } = $props();

  // svelte-ignore state_referenced_locally
  let source = $state(code);
  let strict = $state(true);
  let result = $state<InspectResult | null>(null);
  let error = $state<string | null>(null);
  let editor = $state<CodeEditor | undefined>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let token = 0;
  const wanted = $derived(new Set(names.split(',').map((s) => s.trim()).filter(Boolean)));

  $effect(() => {
    const c = source;
    const s = strict;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const mine = ++token;
      try {
        const r = await inspectRemote(c, { types: true, strict: s });
        if (mine !== token) return;
        error = r.parseError ?? null;
        result = r;
      } catch (e) {
        if (mine === token) error = e instanceof Error ? e.message : String(e);
      }
    }, 250);
    return () => clearTimeout(timer);
  });

  const marks = $derived<EditorMark[]>(
    (result?.types ?? [])
      .filter((t) => t.nodeType === 'Identifier' && (wanted.size === 0 || wanted.has(source.slice(t.range[0], t.range[1]))))
      .map((t) => ({ from: t.range[0], to: t.range[1], kind: /\bnull\b|\bundefined\b/.test(t.type) ? 'warn' : 'info', message: t.type, label: t.type.length > 40 ? `${t.type.slice(0, 39)}…` : t.type })),
  );
</script>

<Widget {title} {subtitle} {n} {caption} onreset={() => { editor?.setValue(code); strict = true; }}>
  <div class="tv">
    <label class="switch ui"><input type="checkbox" bind:checked={strict} /> <code>strict</code> (with <code>strictNullChecks</code>)</label>
    <CodeEditor bind:this={editor} value={source} {marks} minLines={6} label="Code" onchange={(c) => (source = c)} />
    {#if error}<p class="err ui">{error}</p>{/if}
  </div>
</Widget>

<style>
  .tv {
    display: grid;
    gap: 0.5rem;
  }
  .switch {
    font-size: 0.85rem;
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    cursor: pointer;
  }
  .err {
    color: var(--bad);
    font-size: 0.8rem;
  }
</style>
