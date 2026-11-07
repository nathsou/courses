<script lang="ts">
  /** Choose a polynomial for each symbol; every rule must strictly decrease for all natural-number values. */
  import Widget from '$lib/components/ui/Widget.svelte';
  import { parseProgram, showRule } from '$lib/trs/parse';
  import { checkInterpretation, findLinearInterpretation, signature } from '$lib/trs/termination';
  import { parsePoly, showPoly, type Poly } from '$lib/trs/poly';

  let { rules, interpretation = {} }: { rules: string; interpretation?: Record<string, string> } = $props();
  // svelte-ignore state_referenced_locally
  let src = $state(rules);
  const prog = $derived(parseProgram(src));
  const sig = $derived([...signature(prog.rules)]);
  // svelte-ignore state_referenced_locally
  let polys = $state<Record<string, string>>({ ...interpretation });
  let searchNote = $state('');
  const argList = (n: number) => Array.from({ length: n }, (_, i) => `x${i + 1}`).join(', ');
  const parsed = $derived.by(() => {
    const m = new Map<string, Poly>();
    const errors: string[] = [];
    for (const [s] of sig) {
      const text = polys[s];
      if (!text?.trim()) continue;
      try {
        m.set(s, parsePoly(text));
      } catch (e) {
        errors.push(`[${s}]: ${e instanceof Error ? e.message : e}`);
      }
    }
    return { m, errors };
  });
  const check = $derived(prog.diagnostics.some((d) => d.severity === 'error') ? null : checkInterpretation(parsed.m, prog.rules));
  function search() {
    searchNote = 'Searching…';
    setTimeout(() => {
      const I = findLinearInterpretation(prog.rules, { max: 3, limit: 400_000 });
      if (!I) {
        searchNote = 'No linear interpretation with coefficients up to 3 works. Try a non-linear one, or another method.';
        return;
      }
      polys = Object.fromEntries([...I].map(([s, p]) => [s, showPoly(p).replaceAll('·', '*').replaceAll('−', '-')]));
      searchNote = 'Found one.';
    }, 10);
  }
</script>

<Widget title="Polynomial interpretations" subtitle="Give each symbol a polynomial in its arguments x1, x2, … with natural-number coefficients. Symbols left blank count as 1 + the sum of their arguments." onreset={() => ((src = rules), (polys = { ...interpretation }), (searchNote = ''))}>
  <textarea class="w-input" rows={Math.min(8, rules.split('\n').length + 1)} bind:value={src} spellcheck="false" aria-label="Rules"></textarea>
  <div class="grid">
    {#each sig as [s, n] (s)}
      <label class="w-row"><span class="w-code">[{s}]({argList(n)}) =</span><input class="w-input" bind:value={polys[s]} placeholder={n === 0 ? '1' : `1 + ${argList(n).replaceAll(', ', ' + ')}`} spellcheck="false" /></label>
    {/each}
  </div>
  <div class="w-row"><button class="w-btn" onclick={search}>Search for a linear interpretation</button><span class="w-note">{searchNote}</span></div>
  {#each parsed.errors as e (e)}<p class="w-note w-bad">{e}</p>{/each}
  {#if check}
    {#if check.monotone}<p class="w-note w-bad">Not strictly monotone: {check.monotone}.</p>{/if}
    <div class="w-scroll">
      <table class="w-table">
        <thead><tr><th>Rule</th><th>[l] − [r]</th><th></th></tr></thead>
        <tbody>
          {#each check.rules as c, i (i)}
            <tr><td class="w-code">{showRule(c.rule, prog.fixity)}</td><td class="w-code">{showPoly(c.diff)}</td><td class:w-ok={c.ok} class:w-bad={!c.ok}>{c.ok ? '> 0 ✓' : 'not shown > 0'}</td></tr>
          {/each}
        </tbody>
      </table>
    </div>
    <p class:w-ok={check.ok && !check.monotone} class:w-bad={!check.ok || !!check.monotone} class="w-note">{check.ok && !check.monotone ? 'Every rule decreases: the system terminates.' : 'Not a termination proof yet.'}</p>
  {/if}
</Widget>

<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: 0.35rem 1rem;
    margin: 0.5rem 0;
  }
</style>
