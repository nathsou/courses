<script lang="ts">
  /** The same terms under several strategies: how many steps, and whether a normal form is reached at all. */
  import Widget from '$lib/components/ui/Widget.svelte';
  import { parseProgram, parseTerm } from '$lib/trs/parse';
  import { fromProgram, normalize, type Strategy } from '$lib/trs/rewrite';
  import { show } from '$lib/trs/term';

  let { rules, terms, fuel = 2000, title = 'A race between strategies' }: { rules: string; terms: string; fuel?: number; title?: string } = $props();
  const STRATS: Strategy[] = ['innermost', 'outermost', 'parallel-outermost'];
  // svelte-ignore state_referenced_locally
  let src = $state(rules);
  // svelte-ignore state_referenced_locally
  let tsrc = $state(terms);
  const rows = $derived.by(() => {
    const prog = parseProgram(src);
    const err = prog.diagnostics.find((d) => d.severity === 'error');
    if (err) return { error: `line ${err.line}: ${err.message}` };
    const sys = fromProgram(prog);
    const out: { term: string; cells: { steps: number; normal: boolean; nf: string }[] }[] = [];
    for (const line of tsrc.split('\n').map((s) => s.trim()).filter(Boolean)) {
      try {
        const t = parseTerm(line, prog.fixity);
        out.push({ term: show(t, prog.fixity), cells: STRATS.map((s) => {
          const r = normalize(sys, t, { strategy: s, fuel, keepSteps: 0 });
          return { steps: r.count, normal: r.normal, nf: show(r.term, prog.fixity) };
        }) });
      } catch (e) {
        return { error: e instanceof Error ? e.message : String(e) };
      }
    }
    return { rows: out };
  });
</script>

<Widget {title} subtitle="Steps to a normal form under each strategy (a parallel step contracts every outermost redex at once). ∞ means no normal form within the fuel." onreset={() => ((src = rules), (tsrc = terms))}>
  <textarea class="w-input" rows={Math.min(8, rules.split('\n').length + 1)} bind:value={src} spellcheck="false" aria-label="Rules"></textarea>
  <textarea class="w-input" rows={Math.min(5, terms.split('\n').length + 1)} bind:value={tsrc} spellcheck="false" aria-label="Terms, one per line"></textarea>
  {#if 'error' in rows}
    <p class="w-note w-bad">{rows.error}</p>
  {:else}
    <div class="w-scroll">
      <table class="w-table">
        <thead><tr><th>Term</th>{#each STRATS as s (s)}<th class="num">{s}</th>{/each}<th>Normal form</th></tr></thead>
        <tbody>
          {#each rows.rows as r, i (i)}
            <tr>
              <td class="w-code">{r.term}</td>
              {#each r.cells as c, j (j)}<td class="num" class:w-bad={!c.normal}>{c.normal ? c.steps : '∞'}</td>{/each}
              <td class="w-code">{r.cells.find((c) => c.normal)?.nf ?? '—'}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</Widget>
