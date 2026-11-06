<script lang="ts">
  /** A decision tree per defined symbol, the generated JavaScript, and a race against the interpreter. */
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { parseProgram, parseTerm } from '$lib/trs/parse';
  import { compileToJS, showTree } from '$lib/trs/compile';
  import { evaluate, fromProgram } from '$lib/trs/rewrite';
  import { show } from '$lib/trs/term';

  let { rules, query }: { rules: string; query: string } = $props();
  // svelte-ignore state_referenced_locally
  let src = $state(rules);
  // svelte-ignore state_referenced_locally
  let q = $state(query);
  let view = $state<'tree' | 'js'>('tree');
  let race = $state<{ interp: number; compiled: number; result: string; same: boolean; steps: number } | null>(null);
  const data = $derived.by(() => {
    const prog = parseProgram(src);
    const err = prog.diagnostics.find((d) => d.severity === 'error');
    if (err) return { error: `line ${err.line}: ${err.message}` };
    try {
      const c = compileToJS(prog.rules);
      const groups = [...c.trees].map(([name, tree]) => ({ name, text: showTree(tree, prog.rules.filter((r) => r.lhs.type === 'fn' && r.lhs.name === name)) }));
      return { prog, c, groups };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  });
  $effect(() => {
    void src;
    void q;
    race = null;
  });
  function runRace() {
    if ('error' in data) return;
    const t = parseTerm(q, data.prog.fixity);
    let t0 = performance.now();
    const a = evaluate(fromProgram(data.prog), t, { fuel: 50_000_000 });
    const interp = performance.now() - t0;
    t0 = performance.now();
    const b = data.c.run(t);
    const compiled = performance.now() - t0;
    race = { interp, compiled, result: show(b, data.prog.fixity), same: show(a.term) === show(b), steps: a.steps };
  }
</script>

<Widget title="From rules to a decision tree to JavaScript" subtitle="Rules are tried in order (priority). Each defined symbol becomes one JavaScript function that tests each position at most once." onreset={() => ((src = rules), (q = query))}>
  <textarea class="w-input" rows={Math.min(10, rules.split('\n').length + 1)} bind:value={src} spellcheck="false" aria-label="Rules"></textarea>
  {#if 'error' in data}
    <p class="w-note w-bad">{data.error}</p>
  {:else}
    <Segmented size="sm" label="View" options={[{ value: 'tree', label: 'Decision trees' }, { value: 'js', label: 'Generated JavaScript' }]} bind:value={view} />
    {#if view === 'tree'}
      {#each data.groups as g (g.name)}<pre class="out"><code><strong>{g.name}</strong>
{g.text}</code></pre>{/each}
    {:else}
      <pre class="out"><code>{data.c.source.split('\n').filter((l) => l.startsWith('function F_') || l.startsWith('  ') || l === '}').join('\n')}</code></pre>
    {/if}
    <div class="w-row">
      <label class="grow">Query <input class="w-input" bind:value={q} spellcheck="false" /></label>
      <button class="w-btn primary" onclick={runRace}>Race</button>
    </div>
    {#if race}
      <p class="w-note">
        Interpreter: {race.interp.toFixed(1)} ms ({race.steps.toLocaleString('en-GB')} steps). Compiled: {race.compiled.toFixed(1)} ms
        ({race.compiled > 0 ? `${(race.interp / Math.max(race.compiled, 0.01)).toFixed(0)}× faster` : ''}). {race.same ? 'Same result' : 'Results differ!'}: <span class="w-code">{race.result.length > 80 ? race.result.slice(0, 80) + '…' : race.result}</span>
      </p>
    {/if}
  {/if}
</Widget>

<style>
  .out {
    margin: 0.4rem 0;
    padding: 0.6rem 0.8rem;
    background: var(--pn);
    border-radius: var(--radius-sm);
    font-family: var(--font-mono);
    font-size: 0.76rem;
    line-height: 1.5;
    overflow-x: auto;
    max-height: 22rem;
  }
</style>
