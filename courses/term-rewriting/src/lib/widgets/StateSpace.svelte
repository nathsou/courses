<script lang="ts">
  /** Rewriting logic: every state reachable from a start state, by rules applied anywhere modulo AC. */
  import Widget from '$lib/components/ui/Widget.svelte';
  import GraphView from '$lib/components/term/GraphView.svelte';
  import { parseProgram, parseTerm } from '$lib/trs/parse';
  import { acReducts, flatten, unflatten, goalPattern } from '$lib/trs/ac';
  import { key, show, type Term } from '$lib/trs/term';

  let { rules, start, goal = '', limit = 40 }: { rules: string; start: string; goal?: string; limit?: number } = $props();
  // svelte-ignore state_referenced_locally
  let src = $state(rules);
  // svelte-ignore state_referenced_locally
  let s0 = $state(start);
  // svelte-ignore state_referenced_locally
  let g = $state(goal);
  const data = $derived.by(() => {
    const prog = parseProgram(src);
    const err = prog.diagnostics.find((d) => d.severity === 'error');
    if (err) return { error: `line ${err.line}: ${err.message}` };
    try {
      const sys = { rules: prog.rules, ac: prog.ac };
      const first = flatten(parseTerm(s0, prog.fixity), prog.ac);
      const isGoal = g.trim() ? goalPattern(parseTerm(g, prog.fixity), prog.ac) : () => false;
      const nodes: Term[] = [first];
      const idx = new Map([[key(first), 0]]);
      const edges: { from: number; to: number }[] = [];
      let truncated = false;
      for (let i = 0; i < nodes.length; i++) {
        for (const r of acReducts(sys, nodes[i]!)) {
          let j = idx.get(key(r.term));
          if (j === undefined) {
            if (nodes.length >= limit) {
              truncated = true;
              continue;
            }
            j = nodes.length;
            nodes.push(r.term);
            idx.set(key(r.term), j);
          }
          edges.push({ from: i, to: j });
        }
      }
      const sh = (t: Term) => show(unflatten(t, prog.ac), prog.fixity);
      const deadlocks = nodes.filter((_, i) => !edges.some((e) => e.from === i)).length;
      return {
        nodes: nodes.map((t, i) => ({ label: sh(t), cls: isGoal(t) ? 'hot' : edges.some((e) => e.from === i) ? (i === 0 ? 'start' : undefined) : 'nf' })),
        edges,
        truncated,
        goals: nodes.filter(isGoal).length,
        deadlocks,
      };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  });
</script>

<Widget title="Every reachable state" subtitle="Rules here are transitions, not equations: each arrow is one rule firing somewhere in the state. Orange states match the search pattern; green ones are deadlocks." onreset={() => ((src = rules), (s0 = start), (g = goal))}>
  <textarea class="w-input" rows={Math.min(8, rules.split('\n').length + 1)} bind:value={src} spellcheck="false" aria-label="Rules"></textarea>
  <div class="w-row">
    <label class="grow">Start <input class="w-input" bind:value={s0} spellcheck="false" /></label>
    <label class="grow">Search for <input class="w-input" bind:value={g} spellcheck="false" placeholder="a pattern" /></label>
  </div>
  {#if 'error' in data}
    <p class="w-note w-bad">{data.error}</p>
  {:else}
    <GraphView nodes={data.nodes} edges={data.edges} title="The state space" />
    <p class="w-note">{data.nodes.length} states{data.truncated ? ` (stopped at ${limit})` : ''}, {data.edges.length} transitions; {data.goals} match the pattern; {data.deadlocks} deadlock{data.deadlocks === 1 ? '' : 's'}.</p>
  {/if}
</Widget>
