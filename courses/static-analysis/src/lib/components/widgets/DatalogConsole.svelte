<!--
  A Datalog console: facts, rules and queries, evaluated bottom-up to the least fixpoint, with the work done by
  naive and semi-naive evaluation side by side. `:::datalog-console` with a ```text block.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import CodeEditor from '$lib/editor/CodeEditor.svelte';
  import { DatalogError, evaluate, parse } from '$lib/sa/datalog/datalog';

  let {
    code,
    n,
    caption,
    title = 'Datalog console',
    subtitle = 'Edit the facts, rules and queries; results update as you type.',
  }: { code: string; n?: string; caption?: string; title?: string; subtitle?: string } = $props();

  // svelte-ignore state_referenced_locally
  let source = $state(code);

  const result = $derived.by(() => {
    try {
      const program = parse(source);
      const semi = evaluate(program, { seminaive: true });
      const naive = evaluate(program, { seminaive: false });
      return { program, semi, naive, error: undefined };
    } catch (e) {
      return { error: e instanceof DatalogError ? e.message : String(e) };
    }
  });
  const heads = $derived(result.program ? [...new Set(result.program.rules.map((r) => r.head.rel))] : []);
</script>

<Widget {title} {subtitle} {n} {caption} onreset={() => (source = code)}>
  <div class="dc">
    <CodeEditor value={source} lang="text" minLines={10} label="Datalog program" onchange={(c) => (source = c)} />
    <div class="ui" aria-live="polite">
      {#if result.error}
        <p class="err">{result.error}</p>
      {:else if result.semi && result.naive}
        {#each result.semi.answers as a (a.line)}
          <div class="answer">
            <p><code>{a.text}</code> <span class="count">{a.rows.length} {a.rows.length === 1 ? 'answer' : 'answers'}</span></p>
            {#if a.vars.length === 0}
              <p class="yes">{a.rows.length ? 'true' : 'false'}</p>
            {:else if a.rows.length}
              <div class="scroll">
                <table>
                  <thead><tr>{#each a.vars as v (v)}<th scope="col">{v}</th>{/each}</tr></thead>
                  <tbody>{#each a.rows.slice(0, 50) as row, i (i)}<tr>{#each row as c, j (j)}<td>{c}</td>{/each}</tr>{/each}</tbody>
                </table>
              </div>
              {#if a.rows.length > 50}<p class="count">… and {a.rows.length - 50} more</p>{/if}
            {/if}
          </div>
        {/each}
        {#if !result.semi.answers.length}<p class="count">Add a query, such as <code>?- pts(X, O).</code>, to see answers.</p>{/if}
        <table class="stats">
          <thead><tr><th scope="col"></th><th scope="col">rounds</th><th scope="col">derivations</th><th scope="col">join steps</th></tr></thead>
          <tbody>
            <tr><th scope="row">naive</th><td>{result.naive.stats.rounds}</td><td>{result.naive.stats.derivations}</td><td>{result.naive.stats.joins}</td></tr>
            <tr><th scope="row">semi-naive</th><td>{result.semi.stats.rounds}</td><td>{result.semi.stats.derivations}</td><td>{result.semi.stats.joins}</td></tr>
          </tbody>
        </table>
        <p class="count">Derived: {heads.map((r) => `${r} (${result.semi!.relations.get(r)?.size ?? 0})`).join(', ') || 'nothing'} · new tuples per round: {result.semi.stats.perRound.join(', ')}</p>
      {/if}
    </div>
  </div>
</Widget>

<style>
  .dc {
    display: grid;
    gap: 0.7rem;
  }
  .dc > :global(*) {
    min-width: 0;
  }
  .answer p {
    margin: 0.3rem 0;
    font-size: 0.86rem;
  }
  .scroll {
    overflow-x: auto;
    max-height: 16rem;
    overflow-y: auto;
  }
  table {
    width: auto;
    min-width: 12rem;
    border-collapse: collapse;
    font-size: 0.82rem;
    font-family: var(--font-mono, monospace);
  }
  th,
  td {
    text-align: left;
    padding: 0.15rem 0.6rem;
    border-bottom: 1px solid var(--line);
    text-transform: none;
    letter-spacing: normal;
  }
  .stats {
    margin-top: 0.7rem;
  }
  .count {
    color: var(--ink-2);
    font-size: 0.8rem;
  }
  .yes {
    font-weight: 600;
  }
  .err {
    color: var(--bad);
  }
</style>
