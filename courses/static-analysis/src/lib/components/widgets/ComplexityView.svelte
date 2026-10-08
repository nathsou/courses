<!--
  Cognitive Complexity, annotated: each increment of each function is marked on the code with its value, and each
  function's total is listed. Computed by the course's implementation of S3776's per-function part, run in the
  runner worker. `:::complexity-view` with a code block.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import CodeEditor, { type EditorMark } from '$lib/editor/CodeEditor.svelte';
  import { runRuleRemote } from '$lib/sa/runtime/client';
  import type { Issue } from '$lib/sa/runtime/lint';
  import ruleSource from '$lib/sa/rules/cognitive-complexity.ts?raw';

  let { code, n, caption, title = 'Cognitive Complexity, annotated', threshold = 15 }: { code: string; n?: string; caption?: string; title?: string; threshold?: number } = $props();

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
        const r = await runRuleRemote({ ruleFiles: { '/rules/S3776/rule.ts': ruleSource }, entry: '/rules/S3776/rule.ts', ruleKey: 'S3776', fixtures: { 'input.ts': c }, options: [-1], types: false });
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
  const marks = $derived<EditorMark[]>(issues.flatMap((i) => i.secondaryLocations.map((s) => ({ from: offset(source, s.line, s.column), to: offset(source, s.endLine, s.endColumn), kind: s.message === '+1' ? 'info' : 'warn', message: s.message, label: (s.message ?? '').split(' ')[0] }))));
  const functions = $derived(
    issues.map((i) => ({
      name: source.slice(offset(source, i.line, i.column), offset(source, i.endLine, i.endColumn)),
      line: i.line,
      total: Number(/from (\d+)/.exec(i.message)?.[1] ?? 0),
      points: i.secondaryLocations,
    })),
  );
</script>

<Widget {title} subtitle="Edit the code: every increment is marked, with its value on hover." {n} {caption} onreset={() => editor?.setValue(code)}>
  <div class="cv">
    <CodeEditor bind:this={editor} value={source} {marks} minLines={8} label="Code" onchange={(c) => (source = c)} />
    <div class="side ui" aria-live="polite">
      {#if error}<p class="err">{error}</p>{/if}
      <table>
        <thead><tr><th>Function</th><th>Increments</th><th>Total</th></tr></thead>
        <tbody>
          {#each functions as f, i (i)}
            <tr class:over={f.total > threshold}>
              <td><button onclick={() => editor?.reveal(offset(source, f.line, 0))}><code>{f.name}</code></button></td>
              <td class="pts">{#each f.points as p, k (k)}<span class:nest={p.message !== '+1'} title="line {p.line}">{(p.message ?? '').split(' ')[0]}</span>{/each}</td>
              <td class="total">{f.total}</td>
            </tr>
          {/each}
        </tbody>
      </table>
      <p class="note">S3776 raises an issue above {threshold} by default.</p>
    </div>
  </div>
</Widget>

<style>
  .cv {
    display: grid;
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
    gap: 0.8rem;
  }
  @media (max-width: 760px) {
    .cv {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }
  th,
  td {
    text-align: left;
    padding: 0.25rem 0.35rem;
    border-bottom: 1px solid var(--line);
    vertical-align: top;
  }
  th {
    color: var(--mute);
    font-weight: 600;
  }
  td button {
    border: 0;
    background: none;
    cursor: pointer;
    padding: 0;
  }
  .pts span {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 0.74rem;
    border: 1px solid var(--line-strong);
    border-radius: 3px;
    padding: 0 0.25rem;
    margin: 0 0.15rem 0.15rem 0;
  }
  .pts span.nest {
    border-color: var(--maybe);
    color: var(--maybe);
  }
  .total {
    font-family: var(--font-mono);
    font-weight: 700;
  }
  tr.over .total {
    color: var(--bad);
  }
  .note {
    color: var(--mute);
    font-size: 0.78rem;
  }
  .err {
    color: var(--bad);
    font-size: 0.8rem;
  }
</style>
