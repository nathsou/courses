<!--
  The CEGAR loop: predicate abstraction of a small function, round by round. Each round shows the predicates, the
  abstract states reachable at each point, and either the abstract path to a failing assertion (then whether it is
  spurious, with the predicates learnt from it, or real, with an input the interpreter replays) or the proof, whose
  loop invariant can be handed to the program verifier.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { cegar, type CegarResult } from '$lib/fv/absint/cegar';
  import { checkInvariant, type HandoffResult } from '$lib/fv/absint/handoff';
  import { parse } from '$lib/fv/vouch/syntax/parser';
  import { check } from '$lib/fv/vouch/check/checker';
  import { Runner } from '$lib/fv/vouch/interp/exec';

  let { code, fn: fnName, title, caption }: { code: string; fn: string; title?: string; caption?: string } = $props();

  // svelte-ignore state_referenced_locally
  let source = $state(code.replace(/\n$/, ''));
  let editing = $state(false);
  let error = $state('');
  let result = $state.raw<CegarResult | undefined>();
  let at = $state(0);
  let handoff = $state.raw<HandoffResult[] | undefined>();
  let replay = $state('');
  let busy = $state(false);

  function run() {
    error = '';
    handoff = undefined;
    replay = '';
    try {
      result = cegar(source, fnName);
      at = 0;
      if (result.status === 'unsafe') {
        const last = result.rounds.at(-1)!;
        const c = check(parse(source).program);
        const info = c.fns.get(fnName)!;
        const args = info.params.map((p) => (p.ty.k === 'bool' ? last.input?.[p.name] === 'true' : BigInt(last.input?.[p.name] ?? '0')));
        const r = new Runner(c, { fuel: 50_000 }).run(fnName, args);
        replay = r.failure ? `The interpreter replays it: ${r.failure.message}` : 'The interpreter does not reproduce a failure with this input.';
      }
    } catch (e) {
      error = (e as Error).message;
      result = undefined;
    }
  }
  untrack(run);

  function verify() {
    if (!result) return;
    busy = true;
    const invs = result.invariants;
    setTimeout(() => {
      handoff = invs.map((i) => checkInvariant(source, fnName, i.line, i.text));
      busy = false;
    }, 30);
  }

  const round = $derived(result?.rounds[at]);
  const lines = $derived(source.split('\n'));
</script>

<figure class="cg">
  {#if title}<h4 class="ui ttl">{title}</h4>{/if}
  {#if editing}
    <textarea bind:value={source} rows={lines.length + 1} spellcheck="false" wrap="off" aria-label="The function"></textarea>
    <button type="button" class="go ui" onclick={() => ((editing = false), run())}>Run CEGAR</button>
  {:else}
    <div class="cols">
      <div>
        <div class="src">{#each source.split('\n') as l, i (i)}<div class="l"><code>{l || ' '}</code></div>{/each}</div>
        <button type="button" class="ui" onclick={() => (editing = true)}>Edit the code</button>
      </div>
      <div>
        {#if error}<p class="err ui">{error}</p>{/if}
        {#if result && round}
          <div class="tabs ui" role="tablist">
            {#each result.rounds as r, i (i)}
              <button type="button" role="tab" aria-selected={at === i} class:on={at === i} onclick={() => (at = i)}>Round {i + 1}: {r.verdict === 'safe' ? 'safe' : r.verdict === 'real' ? 'real bug' : r.verdict === 'spurious' ? 'spurious' : 'gave up'}</button>
            {/each}
          </div>
          <p class="sub ui">Predicates</p>
          <ul class="preds">
            {#each round.predicates as p, i (p)}<li class:new={at > 0 && !result.rounds[at - 1]!.predicates.includes(p)}><code>{p}</code></li>{/each}
          </ul>
          <p class="sub ui">Abstract states at each point ({round.queries} solver queries)</p>
          <ul class="reach">
            {#each round.reachable.filter((r) => r.label !== 'entry').sort((a, b) => (result!.cfg.nodes[a.node]!.line ?? 1e9) - (result!.cfg.nodes[b.node]!.line ?? 1e9) || a.node - b.node) as r (r.node)}
              <li class:error={r.label === 'error'}><span class="node ui">{r.label === 'error' ? 'the assertion fails' : r.label}</span>
                {#each r.states as st, k (k)}<code class="st">{st}</code>{/each}</li>
            {/each}
          </ul>
          {#if round.path}
            <p class="sub ui">Abstract path to the failing assertion</p>
            <ol class="path">{#each round.path as step, k (k)}<li><span class="ui ln">line {step.line}</span> <code>{step.text}</code></li>{/each}</ol>
          {/if}
          <div class="verdict ui {round.verdict}">
            {#if round.verdict === 'spurious'}
              <p><b>Spurious.</b> No input follows this path: its weakest precondition contradicts the precondition. New predicates, from the conditions along the path: {#each round.newPredicates ?? [] as p, k (p)}{k ? ', ' : ''}<code>{p}</code>{/each}.</p>
            {:else if round.verdict === 'real'}
              <p><b>A real counterexample.</b> The input {Object.entries(round.input ?? {}).map(([k, v]) => `${k} = ${v}`).join(', ')} follows the path. {replay}</p>
            {:else if round.verdict === 'safe'}
              <p><b>Safe.</b> With these predicates, no abstract state reaches a failing assertion: every assertion holds for every input satisfying the precondition.</p>
              {#each result.invariants as inv (inv.line)}<p>Invariant at the loop on line {inv.line}: <code>{inv.text}</code></p>{/each}
              {#if result.invariants.length}
                <button type="button" class="go" onclick={verify} disabled={busy}>{busy ? 'Verifying…' : 'Hand it to the verifier'}</button>
                {#each handoff ?? [] as h, k (k)}<p class:okp={h.status === 'verified'} class:badp={h.status !== 'verified'}>{h.status === 'verified' ? '✓' : '✗'} {h.message}</p>{/each}
              {/if}
            {:else}
              <p><b>Gave up</b> after {result.rounds.length} rounds: the predicates learnt from the paths stopped helping.</p>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  {/if}
  {#if caption}<figcaption>{caption}</figcaption>{/if}
</figure>

<style>
  .cg {
    margin: 1.8rem 0;
    padding: 0.9rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--pn);
  }
  .ttl {
    margin: 0 0 0.6rem;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-2);
  }
  .cols {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
    gap: 0.9rem;
  }
  @media (max-width: 860px) {
    .cols {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .src {
    margin: 0 0 0.4rem;
    padding: 0.5rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--panel);
    overflow-x: auto;
  }
  .cg code {
    all: unset;
    font-family: var(--font-mono);
    font-size: 0.76rem;
    overflow-wrap: anywhere;
  }
  .src code {
    white-space: pre;
  }
  .l {
    line-height: 1.5;
  }
  textarea {
    width: 100%;
    box-sizing: border-box;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    padding: 0.5rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    white-space: pre;
  }
  button {
    font-family: var(--font-ui);
    font-size: 0.8rem;
    padding: 0.22rem 0.65rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
  }
  .go {
    background: var(--ink-blue);
    border-color: var(--ink-blue);
    color: var(--on-accent);
    font-weight: 600;
  }
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .tabs button.on {
    border-color: var(--ink-blue);
    background: color-mix(in srgb, var(--ink-blue) 14%, var(--panel));
    font-weight: 600;
  }
  .sub {
    margin: 0.6rem 0 0.2rem;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mute);
  }
  .preds,
  .reach,
  .path {
    margin: 0;
    padding-left: 1.1rem;
    font-size: 0.8rem;
  }
  .preds li.new code {
    color: var(--gold);
    font-weight: 700;
  }
  .reach {
    list-style: none;
    padding: 0;
    display: grid;
    gap: 0.2rem;
  }
  .reach li {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    align-items: baseline;
  }
  .reach li.error .node {
    color: var(--pencil);
    font-weight: 700;
  }
  .node {
    font-size: 0.74rem;
    color: var(--ink-2);
    min-width: 9rem;
  }
  .cg code.st {
    padding: 0 0.3rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--panel);
  }
  .ln {
    font-size: 0.72rem;
    color: var(--mute);
  }
  .verdict {
    margin-top: 0.7rem;
    padding: 0.4rem 0.6rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--line-strong);
    font-size: 0.82rem;
  }
  .verdict.safe {
    border-color: var(--seal);
  }
  .verdict.real {
    border-color: var(--pencil);
  }
  .verdict.spurious {
    border-color: var(--gold);
  }
  .verdict p {
    margin: 0.25rem 0;
  }
  .okp {
    color: var(--seal);
  }
  .badp,
  .err {
    color: var(--pencil);
  }
  figcaption {
    margin-top: 0.6rem;
    font-family: var(--font-ui);
    font-size: 0.86rem;
    color: var(--ink-2);
  }
</style>
