<!--
  Fully qualified names, annotated: every call and `new` in the code is labelled with the FQN the kit's
  getFullyQualifiedName gives it, or with "?" when it has none. `:::fqn-view` with a code block.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import CodeEditor, { type EditorMark } from '$lib/editor/CodeEditor.svelte';
  import { runRuleRemote } from '$lib/sa/runtime/client';
  import type { Issue } from '$lib/sa/runtime/lint';
  import ruleSource from '$lib/sa/rules/fqn-probe.ts?raw';

  let { code, n, caption, title = 'Fully qualified names', subtitle = 'Edit the code: every call is labelled with where it comes from.' }: { code: string; n?: string; caption?: string; title?: string; subtitle?: string } = $props();

  // svelte-ignore state_referenced_locally
  let source = $state(code);
  let issues = $state<Issue[]>([]);
  let error = $state<string | null>(null);
  let editor = $state<CodeEditor | undefined>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let token = 0;

  $effect(() => {
    const c = source;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const mine = ++token;
      try {
        const r = await runRuleRemote({ ruleFiles: { '/rules/fqn/rule.ts': ruleSource }, entry: '/rules/fqn/rule.ts', ruleKey: 'fqn', fixtures: { 'input.ts': c }, types: false });
        if (mine !== token) return;
        error = r.loadError ?? r.fixtures[0]?.parseErrors[0]?.message ?? null;
        issues = r.fixtures[0]?.issues ?? [];
      } catch (e) {
        if (mine === token) error = e instanceof Error ? e.message : String(e);
      }
    }, 300);
    return () => clearTimeout(timer);
  });

  function offset(text: string, line: number, column: number) {
    const lines = text.split('\n');
    let o = 0;
    for (let i = 0; i < line - 1; i++) o += (lines[i]?.length ?? 0) + 1;
    return o + column;
  }
  const rows = $derived(
    issues.map((i) => {
      const from = offset(source, i.line, i.column);
      const to = offset(source, i.endLine, i.endColumn);
      return { from, to, line: i.line, callee: source.slice(from, to), fqn: i.message === 'null' ? null : i.message };
    }),
  );
  const marks = $derived<EditorMark[]>(rows.map((r) => ({ from: r.from, to: r.to, kind: r.fqn ? 'info' : 'warn', message: r.fqn ?? 'no fully qualified name', label: r.fqn ?? '?' })));
</script>

<Widget {title} {subtitle} {n} {caption} onreset={() => editor?.setValue(code)}>
  <div class="fv">
    <CodeEditor bind:this={editor} value={source} {marks} minLines={6} label="Code" onchange={(c) => (source = c)} />
    <div class="side ui" aria-live="polite">
      {#if error}<p class="err">{error}</p>{/if}
      <table>
        <thead><tr><th>Line</th><th>Callee</th><th>FQN</th></tr></thead>
        <tbody>
          {#each rows as r, i (i)}
            <tr class:none={!r.fqn}>
              <td><button onclick={() => editor?.reveal(r.from)}>{r.line}</button></td>
              <td><code>{r.callee}</code></td>
              <td><code>{r.fqn ?? 'null'}</code></td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</Widget>

<style>
  .fv {
    display: grid;
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: 0.8rem;
  }
  @media (max-width: 760px) {
    .fv {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
  }
  th,
  td {
    text-align: left;
    padding: 0.25rem 0.35rem;
    border-bottom: 1px solid var(--line);
    vertical-align: top;
    overflow-wrap: anywhere;
  }
  th {
    color: var(--mute);
    font-weight: 600;
    white-space: nowrap;
  }
  td button {
    border: 0;
    background: none;
    cursor: pointer;
    padding: 0;
    font-family: var(--font-mono);
    color: var(--accent-ink);
  }
  tr.none code:last-child {
    color: var(--maybe);
  }
  .err {
    color: var(--bad);
    font-size: 0.8rem;
  }
</style>
