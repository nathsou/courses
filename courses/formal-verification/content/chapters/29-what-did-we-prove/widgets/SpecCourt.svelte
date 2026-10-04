<!--
  The spec court (chapter 29): each case is a function that the verifier accepts against a planted bad
  specification. Call witnesses (an implementation that should not pass, a caller that should), each run through
  the program verifier, then click the line at fault.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { parse } from '$lib/fv/vouch/syntax/parser';
  import { check } from '$lib/fv/vouch/check/checker';
  import { verifyFunction } from '$lib/fv/vouch/vc/verify';
  import { CASES, witnessCode, type Witness } from './court';
  import { codeParts } from './text';

  let { title }: { title?: string } = $props();

  type Outcome = { verified: boolean; message: string };
  let at = $state(0);
  let base = $state<Record<string, Outcome>>({});
  let wit = $state<Record<string, Outcome | 'running'>>({});
  let accused = $state<Record<string, number>>({});

  function run(code: string, fn: string): Outcome {
    const p = parse(code);
    const c = check(p.program);
    const errs = [...p.diagnostics, ...c.diagnostics].filter((d) => d.severity === 'error');
    if (errs.length) return { verified: false, message: errs.map((e) => e.message).join(' ') };
    const r = verifyFunction(c, c.fns.get(fn)!, { timeout: 8000 });
    const bad = r.verdicts.find((v) => v.status !== 'verified');
    return { verified: !!r.verdicts.length && !bad, message: (bad ?? r.verdicts[0])?.message ?? '' };
  }

  onMount(() => {
    // Verify each case's code once, one per tick, so the page stays responsive.
    CASES.forEach((c, i) => setTimeout(() => (base = { ...base, [c.id]: run(c.code, c.fn) }), 50 * (i + 1)));
  });

  function call(w: Witness, k: number) {
    const c = CASES[at]!;
    const key = `${c.id}:${k}`;
    wit = { ...wit, [key]: 'running' };
    setTimeout(() => {
      const { code, fn } = witnessCode(c, w);
      wit = { ...wit, [key]: run(code, fn) };
    }, 20);
  }

  function reading(w: Witness, o: Outcome): { tone: 'ok' | 'bad'; text: string } {
    if (w.kind === 'impl') return o.verified ? { tone: 'bad', text: `It verifies. ${w.meaning}` } : { tone: 'ok', text: 'The verifier rejects it: on this point, the contract does constrain the code.' };
    return o.verified ? { tone: 'ok', text: 'The call verifies: the contract allows it.' } : { tone: 'bad', text: `The call does not verify. ${w.meaning}` };
  }

  const C = $derived(CASES[at]!);
  const verdictOf = $derived(accused[C.id]);
  const solved = $derived(CASES.filter((c) => accused[c.id] !== undefined && c.fault.includes(accused[c.id]!)).length);
</script>

<figure class="court">
  {#if title}<h4 class="ui ttl">{title}</h4>{/if}
  <div class="tabs ui" role="tablist">
    {#each CASES as c, i (c.id)}
      {@const done = accused[c.id] !== undefined && c.fault.includes(accused[c.id]!)}
      <button type="button" role="tab" aria-selected={at === i} class:on={at === i} onclick={() => (at = i)}>{done ? '✓ ' : ''}Case {i + 1}</button>
    {/each}
    <span class="score">{solved} of {CASES.length} solved</span>
  </div>

  <h5 class="ui">{C.title}</h5>
  <p class="story">{#each codeParts(C.story) as p, i (i)}{#if p.code}<code>{p.text}</code>{:else}{p.text}{/if}{/each}</p>
  <p class="badge ui">
    {#if !base[C.id]}Verifying…{:else if base[C.id]!.verified}<span class="okb">✓ verified</span> by the program verifier: {base[C.id]!.message}{:else}<span class="badb">✗ not verified</span>: {base[C.id]!.message}{/if}
  </p>

  <div class="cols">
    <div>
      <p class="sub ui">The code: click the line at fault</p>
      <div class="src" role="group" aria-label="The code">
        {#each C.code.split('\n') as l, i (i)}
          {@const n = i + 1}
          <button type="button" class="ln" class:acc={verdictOf === n} class:fault={verdictOf !== undefined && C.fault.includes(n)} onclick={() => (accused = { ...accused, [C.id]: n })}><span class="no">{n}</span><code>{l || ' '}</code></button>
        {/each}
      </div>
    </div>
    <div>
      <p class="sub ui">Witnesses</p>
      {#each C.witnesses as w, k (k)}
        {@const o = wit[`${C.id}:${k}`]}
        <div class="w">
          <button type="button" class="call ui" disabled={o === 'running'} onclick={() => call(w, k)}>{w.label}</button>
          {#if o === 'running'}<p class="ui wr">Verifying…</p>{:else if o}{@const r = reading(w, o)}<p class="ui wr {r.tone}">{#each codeParts(r.text) as p, i (i)}{#if p.code}<code>{p.text}</code>{:else}{p.text}{/if}{/each}</p>{/if}
          {#if o && o !== 'running' && o.message}<p class="ui vm">The verifier: {o.message}</p>{/if}
          {#if o && o !== 'running' && w.kind === 'impl'}
            <details class="ui"><summary>The implementation</summary><pre>{w.body}</pre></details>
          {:else if o && o !== 'running' && w.caller}
            <details class="ui"><summary>The caller</summary><pre>{w.caller.code}</pre></details>
          {/if}
        </div>
      {/each}
      {#if verdictOf !== undefined}
        <div class="judg ui" class:right={C.fault.includes(verdictOf)}>
          {#if C.fault.includes(verdictOf)}
            <p><b>✓ Line {verdictOf}.</b> {#each codeParts(C.verdict) as p, i (i)}{#if p.code}<code>{p.text}</code>{:else}{p.text}{/if}{/each}</p>
          {:else}
            <p><b>Not line {verdictOf}.</b> {verdictOf > 0 && /requires|ensures/.test(C.code.split('\n')[verdictOf - 1] ?? '') ? 'That clause says what it should.' : 'The code meets its contract: the verifier said so. Look at the contract.'} Try again.</p>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</figure>

<style>
  .court {
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
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    align-items: baseline;
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
  .tabs button.on {
    border-color: var(--ink-blue);
    background: color-mix(in srgb, var(--ink-blue) 14%, var(--panel));
    font-weight: 600;
  }
  .score {
    margin-left: auto;
    font-size: 0.78rem;
    color: var(--mute);
  }
  h5 {
    margin: 0.8rem 0 0.2rem;
    font-size: 0.9rem;
  }
  .story {
    margin: 0 0 0.4rem;
    font-size: 0.94rem;
  }
  .badge {
    margin: 0 0 0.6rem;
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .okb {
    color: var(--seal);
    font-weight: 700;
  }
  .badb {
    color: var(--pencil);
    font-weight: 700;
  }
  .cols {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    gap: 0.9rem;
  }
  @media (max-width: 820px) {
    .cols {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .sub {
    margin: 0 0 0.25rem;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mute);
  }
  .src {
    padding: 0.35rem 0;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--panel);
    overflow-x: auto;
  }
  .ln {
    all: unset;
    box-sizing: border-box;
    display: flex;
    gap: 0.6rem;
    min-width: 100%;
    width: max-content;
    padding: 0 0.5rem;
    cursor: pointer;
    line-height: 1.55;
  }
  .ln:hover {
    background: var(--ink-blue-soft);
  }
  .ln:focus-visible {
    outline: 2px solid var(--ink-blue);
  }
  .ln.acc {
    background: var(--pencil-soft);
  }
  .ln.fault.acc {
    background: var(--seal-soft);
  }
  .no {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--mute);
    min-width: 1.4rem;
    text-align: right;
  }
  .court code {
    all: unset;
    font-family: var(--font-mono);
    font-size: 0.76rem;
  }
  .src code {
    white-space: pre;
  }
  .w {
    margin-bottom: 0.55rem;
  }
  .call {
    text-align: left;
  }
  .wr {
    margin: 0.3rem 0 0;
    font-size: 0.82rem;
  }
  .wr.bad {
    color: var(--pencil);
  }
  .wr.ok {
    color: var(--seal-ink);
  }
  .vm {
    margin: 0.15rem 0 0;
    font-size: 0.72rem;
    color: var(--mute);
  }
  details {
    font-size: 0.76rem;
    color: var(--mute);
  }
  pre {
    margin: 0.2rem 0 0;
    padding: 0.4rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--panel);
    font-size: 0.72rem;
    overflow-x: auto;
    color: var(--fg);
  }
  .judg {
    margin-top: 0.6rem;
    padding: 0.45rem 0.65rem;
    border: 1px solid var(--gold);
    border-radius: var(--radius-sm);
    font-size: 0.86rem;
  }
  .judg.right {
    border-color: var(--seal);
    background: var(--seal-soft);
  }
  .judg p {
    margin: 0;
  }
  .judg code {
    font-size: 0.78rem;
    overflow-wrap: anywhere;
  }
</style>
