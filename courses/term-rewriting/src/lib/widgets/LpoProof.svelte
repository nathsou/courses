<script lang="ts">
  /** Compare two terms in a path order and see why: the proof tree of the comparison. */
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { parseTerm } from '$lib/trs/parse';
  import { rpoExplain, precedence, kbo, weight, type Why } from '$lib/trs/orders';
  import { show } from '$lib/trs/term';

  let { left = 'Ack(S(x), S(y))', right = 'Ack(x, Ack(S(x), y))', prec = 'Ack > S' }: { left?: string; right?: string; prec?: string } = $props();
  // svelte-ignore state_referenced_locally
  let a = $state(left);
  // svelte-ignore state_referenced_locally
  let b = $state(right);
  // svelte-ignore state_referenced_locally
  let p = $state(prec);
  let kind = $state<'lpo' | 'rpo' | 'kbo'>('lpo');
  const res = $derived.by(() => {
    try {
      const s = parseTerm(a), t = parseTerm(b);
      const pr = precedence(p.split('>').map((x) => x.trim()).filter(Boolean));
      if (kind === 'kbo') {
        const gt = kbo({ prec: pr });
        return { s, t, kbo: { holds: gt(s, t), ws: weight(s, { prec: pr }), wt: weight(t, { prec: pr }) } };
      }
      return { s, t, why: rpoExplain(pr, s, t, () => (kind === 'lpo' ? 'lex' : 'mul')) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  });
</script>

{#snippet tree(w: Why)}
  <li>
    <span class:w-ok={w.holds} class:w-bad={!w.holds}>{w.holds ? '✓' : '✗'}</span>
    <span class="w-code">{show(w.s)} &gt; {show(w.t)}</span>
    <span class="why">{w.rule}</span>
    {#if w.children.length}<ul>{#each w.children as c, i (i)}{@render tree(c)}{/each}</ul>{/if}
  </li>
{/snippet}

<Widget title="Why is one term bigger?" subtitle="A path order compares terms by their root symbols first, then recursively. Change the precedence and watch the proof change." onreset={() => ((a = left), (b = right), (p = prec))}>
  <div class="w-row">
    <label class="grow">s <input class="w-input" bind:value={a} spellcheck="false" /></label>
    <label class="grow">t <input class="w-input" bind:value={b} spellcheck="false" /></label>
  </div>
  <div class="w-row">
    <label class="grow">Precedence <input class="w-input" bind:value={p} spellcheck="false" /></label>
    <Segmented size="sm" label="Order" options={[{ value: 'lpo', label: 'LPO' }, { value: 'rpo', label: 'MPO' }, { value: 'kbo', label: 'KBO' }]} bind:value={kind} />
  </div>
  {#if 'error' in res}
    <p class="w-note w-bad">{res.error}</p>
  {:else if res.why}
    <ul class="proof">{@render tree(res.why)}</ul>
  {:else if res.kbo}
    <p class="w-code">weight(s) = {res.kbo.ws}, weight(t) = {res.kbo.wt} (every symbol and variable weighs 1)</p>
    <p class:w-ok={res.kbo.holds} class:w-bad={!res.kbo.holds}>{res.kbo.holds ? 's > t in KBO' : 's > t does not hold in KBO'}</p>
  {/if}
</Widget>

<style>
  .proof,
  .proof ul {
    list-style: none;
    margin: 0;
    padding-left: 1.1rem;
  }
  .proof {
    padding: 0;
  }
  .proof ul {
    border-left: 1px solid var(--rule);
  }
  .proof li {
    font-size: 0.82rem;
    margin: 0.2rem 0;
  }
  .why {
    display: block;
    font-family: var(--font-ui);
    color: var(--mute);
    font-size: 0.76rem;
    margin-left: 1.2rem;
  }
</style>
