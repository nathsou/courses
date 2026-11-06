<script lang="ts">
  /** A discrimination tree built from the left-hand sides, and the path a query term takes through it. */
  import Widget from '$lib/components/ui/Widget.svelte';
  import { parseProgram, parseTerm } from '$lib/trs/parse';
  import { DiscriminationTree, preorder } from '$lib/trs/indexing';
  import { show } from '$lib/trs/term';
  import { matches } from '$lib/trs/match';

  let { rules, term }: { rules: string; term: string } = $props();
  // svelte-ignore state_referenced_locally
  let src = $state(rules);
  // svelte-ignore state_referenced_locally
  let tSrc = $state(term);
  type Shape = { label: string; values: number[]; children: Shape[] };
  const data = $derived.by(() => {
    const prog = parseProgram(src);
    const err = prog.diagnostics.find((d) => d.severity === 'error');
    if (err) return { error: `line ${err.line}: ${err.message}` };
    const dt = new DiscriminationTree<number>();
    prog.rules.forEach((r, i) => dt.insert(r.lhs, i));
    let query: { candidates: number[]; real: number[]; visited: number } | null = null;
    try {
      const t = parseTerm(tSrc, prog.fixity);
      const stats = { visited: 0 };
      const candidates = dt.retrieve(t, stats);
      query = { candidates, real: candidates.filter((i) => matches(prog.rules[i]!.lhs, t)), visited: stats.visited };
    } catch {
      query = null;
    }
    return { prog, shape: dt.shape() as Shape, query };
  });
</script>

{#snippet node(s: Shape, depth: number)}
  <li>
    <span class="sym" class:star={s.label === '*'}>{s.label}</span>{#if s.values.length}<span class="leaf"> ⇒ rule {s.values.map((v) => v + 1).join(', ')}</span>{/if}
    {#if s.children.length}<ul>{#each s.children as c, i (i)}{@render node(c, depth + 1)}{/each}</ul>{/if}
  </li>
{/snippet}

<Widget title="A discrimination tree" subtitle="Left-hand sides stored as pre-order symbol strings (* for a variable). A query walks the tree and only meets rules that might match." onreset={() => ((src = rules), (tSrc = term))}>
  <textarea class="w-input" rows={Math.min(10, rules.split('\n').length + 1)} bind:value={src} spellcheck="false" aria-label="Rules"></textarea>
  {#if 'error' in data}
    <p class="w-note w-bad">{data.error}</p>
  {:else}
    <div class="cols">
      <div>
        <p class="w-note">Keys</p>
        <ol class="keys">{#each data.prog.rules as r, i (i)}<li class="w-code">{preorder(r.lhs).join(' ')}</li>{/each}</ol>
      </div>
      <div class="tree"><p class="w-note">Tree</p><ul class="root">{@render node(data.shape, 0)}</ul></div>
    </div>
    <div class="w-row"><label class="grow">Query <input class="w-input" bind:value={tSrc} spellcheck="false" /></label></div>
    {#if data.query}
      <p class="w-note">
        Visited {data.query.visited} tree nodes; candidates: {data.query.candidates.length ? data.query.candidates.map((i) => `rule ${i + 1}`).join(', ') : 'none'}
        ({data.query.real.length} really match{data.query.real.length === 1 ? 'es' : ''}). A linear scan would try all {data.prog.rules.length} rules.
      </p>
    {:else}<p class="w-note w-bad">Cannot read the query.</p>{/if}
  {/if}
</Widget>

<style>
  .cols {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: 0.5rem 1.2rem;
  }
  .keys {
    margin: 0;
    padding-left: 1.5rem;
  }
  .tree ul {
    list-style: none;
    margin: 0;
    padding-left: 1.1rem;
    border-left: 1px solid var(--rule);
  }
  .tree ul.root {
    border: 0;
    padding: 0;
  }
  .tree li {
    font-family: var(--font-mono);
    font-size: 0.8rem;
  }
  .sym {
    color: var(--code-type);
  }
  .sym.star {
    color: var(--code-prop);
    font-weight: 700;
  }
  .leaf {
    color: var(--nf);
    font-weight: 600;
  }
  p {
    margin: 0.3rem 0;
  }
</style>
