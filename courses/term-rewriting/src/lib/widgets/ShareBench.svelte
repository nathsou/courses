<script lang="ts">
  /** Naive Fibonacci in Peano arithmetic: plain evaluation against hash-consing with a normal-form table. */
  import Widget from '$lib/components/ui/Widget.svelte';
  import { parseStrict } from '$lib/trs/parse';
  import { evaluate, fromProgram } from '$lib/trs/rewrite';
  import { evaluateShared, dagSize } from '$lib/trs/share';
  import { f, size, type Term } from '$lib/trs/term';

  const prog = parseStrict(`#priority
Fib(0) -> 0
Fib(S(0)) -> S(0)
Fib(S(S(n))) -> +(Fib(S(n)), Fib(n))
+(0, y) -> y
+(S(x), y) -> S(+(x, y))`);
  const sys = fromProgram(prog);
  const nat = (k: number): Term => (k === 0 ? f('0') : f('S', nat(k - 1)));
  let n = $state(14);
  let res = $state<{ plain: { steps: number; ms: number }; shared: { steps: number; hits: number; nodes: number; ms: number }; noMemo: { steps: number; ms: number }; size: number; dag: number } | null>(null);
  function run() {
    const t = f('Fib', nat(n));
    let t0 = performance.now();
    const p = evaluate(sys, t, { fuel: 20_000_000 });
    const plainMs = performance.now() - t0;
    t0 = performance.now();
    const s = evaluateShared(sys, t);
    const sharedMs = performance.now() - t0;
    t0 = performance.now();
    const nm = evaluateShared(sys, t, { memo: false });
    const nmMs = performance.now() - t0;
    res = { plain: { steps: p.steps, ms: plainMs }, shared: { steps: s.stats.steps, hits: s.stats.cacheHits, nodes: s.stats.nodes, ms: sharedMs }, noMemo: { steps: nm.stats.steps, ms: nmMs }, size: size(p.term), dag: dagSize(p.term) };
  }
</script>

<Widget title="What sharing buys" subtitle="Fib(n) with the naive rules, evaluated three ways. The rewrite steps are counted, the times measured in your browser.">
  <div class="w-row">
    <label>n = <input type="range" min="5" max="19" bind:value={n} aria-label="n" /> <strong>{n}</strong></label>
    <button class="w-btn primary" onclick={run}>Evaluate Fib({n})</button>
  </div>
  {#if res}
    <div class="w-scroll">
      <table class="w-table">
        <thead><tr><th>Evaluator</th><th class="num">rewrite steps</th><th class="num">time</th><th>notes</th></tr></thead>
        <tbody>
          <tr><td>Plain innermost</td><td class="num">{res.plain.steps.toLocaleString('en-GB')}</td><td class="num">{res.plain.ms.toFixed(1)} ms</td><td>copies every term</td></tr>
          <tr><td>Hash-consed, no memo</td><td class="num">{res.noMemo.steps.toLocaleString('en-GB')}</td><td class="num">{res.noMemo.ms.toFixed(1)} ms</td><td>same steps; equal terms are one object</td></tr>
          <tr><td>Hash-consed + normal-form table</td><td class="num">{res.shared.steps.toLocaleString('en-GB')}</td><td class="num">{res.shared.ms.toFixed(1)} ms</td><td>{res.shared.hits.toLocaleString('en-GB')} cache hits, {res.shared.nodes.toLocaleString('en-GB')} distinct terms</td></tr>
        </tbody>
      </table>
    </div>
    <p class="w-note">The result, S(S(…(0)…)), has {res.size.toLocaleString('en-GB')} symbols as a tree but only {res.dag.toLocaleString('en-GB')} distinct subterms.</p>
  {/if}
</Widget>
