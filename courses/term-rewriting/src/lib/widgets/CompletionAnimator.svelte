<script lang="ts">
  /** Knuth–Bendix completion, one inference at a time: the equations E and the rules R. */
  import Widget from '$lib/components/ui/Widget.svelte';
  import { parseProgram } from '$lib/trs/parse';
  import { complete, type CompletionResult } from '$lib/trs/completion';
  import { lpo, kbo, precedence } from '$lib/trs/orders';
  import { show, type Term } from '$lib/trs/term';

  let { equations, prec = 'I > * > E', order = 'lpo' }: { equations: string; prec?: string; order?: 'lpo' | 'kbo' } = $props();
  // svelte-ignore state_referenced_locally
  let src = $state(equations);
  // svelte-ignore state_referenced_locally
  let p = $state(prec);
  let k = $state(0);
  let result = $state<CompletionResult | null>(null);
  let fx = $state(new Map());
  function run() {
    const prog = parseProgram(src);
    fx = prog.fixity as Map<string, never>;
    const pr = precedence(p.split('>').map((x) => x.trim()).filter(Boolean));
    result = complete(prog.equations, order === 'kbo' ? kbo({ prec: pr }) : lpo(pr), { maxSteps: 2000 });
    k = 0;
  }
  $effect(() => {
    void src;
    void p;
    result = null;
  });
  const cur = $derived(result && k > 0 ? result.steps[k - 1]! : null);
  const sh = (t: Term) => show(t, fx);
</script>

<Widget title="Completion, step by step" subtitle="Orient an equation into a rule, simplify everything with it, compute the new critical pairs, repeat." onreset={() => ((src = equations), (p = prec), (result = null))}>
  <textarea class="w-input" rows={Math.min(8, equations.split('\n').length + 1)} bind:value={src} spellcheck="false" aria-label="Equations"></textarea>
  <div class="w-row">
    <label class="grow">Precedence ({order.toUpperCase()}) <input class="w-input" bind:value={p} spellcheck="false" /></label>
    <button class="w-btn primary" onclick={run}>Run completion</button>
  </div>
  {#if result}
    <div class="w-row">
      <button class="w-btn" onclick={() => (k = 0)} disabled={k === 0}>⏮</button>
      <button class="w-btn" onclick={() => k--} disabled={k === 0}>◀</button>
      <button class="w-btn primary" onclick={() => k++} disabled={k >= result.steps.length}>Next inference ▶</button>
      <button class="w-btn" onclick={() => (k = result!.steps.length)} disabled={k >= result.steps.length}>⏭</button>
      <span class="w-note">{k} / {result.steps.length}</span>
    </div>
    {#if cur}<p class="w-code"><span class="tag">{cur.rule}</span> {cur.note}</p>{/if}
    <div class="cols">
      <div>
        <p class="w-note">E: equations ({cur?.E.length ?? 0})</p>
        <ul>{#each (cur?.E ?? []).slice(0, 14) as [a, b], i (i)}<li class="w-code">{sh(a)} = {sh(b)}</li>{/each}{#if (cur?.E.length ?? 0) > 14}<li class="w-note">…</li>{/if}</ul>
      </div>
      <div>
        <p class="w-note">R: rules ({cur?.R.length ?? 0})</p>
        <ol>{#each cur?.R ?? [] as [a, b], i (i)}<li class="w-code">{sh(a)} → {sh(b)}</li>{/each}</ol>
      </div>
    </div>
    {#if k >= result.steps.length}
      <p class:w-ok={result.status === 'success'} class:w-bad={result.status !== 'success'}>{result.status === 'success' ? `Done: ${result.rules.length} rules, terminating and confluent.` : result.status === 'failed' ? `Failure: ${sh(result.stuck![0])} = ${sh(result.stuck![1])} cannot be oriented.` : 'Gave up (step limit).'}</p>
    {/if}
  {/if}
</Widget>

<style>
  .cols {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(14rem, 1fr));
    gap: 0.5rem 1rem;
  }
  ul,
  ol {
    margin: 0;
    padding-left: 1.5rem;
  }
  .tag {
    font-family: var(--font-mono);
    text-transform: uppercase;
    font-size: 0.7rem;
    color: var(--accent);
    margin-right: 0.3rem;
  }
  p {
    margin: 0.3rem 0;
  }
</style>
