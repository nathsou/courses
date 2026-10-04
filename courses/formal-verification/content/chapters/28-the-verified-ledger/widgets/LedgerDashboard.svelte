<!--
  The Ledger dashboard (chapter 28): the specification, the protocol, the implementation and the step handlers,
  each with its checks, the engine that ran them, the badge and the certificate. "Break it" switches inject one bug
  into one layer and re-run every check, to show which check catches it and which cannot. The step handlers are
  not checked until the reader asks; the bug that slips between the layers is waiting there.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { runLedger } from '$lib/components/induction/client';
  import { CHECKS, ENGINE_NAMES, SWITCHES, SPEC, PROTOCOL, IMPL, HANDLERS, sources, type CheckResult, type LayerId, type Sources } from '$lib/fv/ledger/ledger';
  import { diffLines } from './diff';

  let { title, caption }: { title?: string; caption?: string } = $props();

  let bug = $state('none');
  let link = $state(false);
  let fixed = $state(false);
  let results = $state<Record<string, CheckResult>>({});
  let running = $state(false);
  let error = $state('');
  let ms = $state(0);
  let open = $state<Record<string, boolean>>({});
  let cancel: (() => void) | undefined;

  function run() {
    cancel?.();
    running = true;
    error = '';
    results = {};
    const t0 = performance.now();
    cancel = runLedger({ on: bug === 'none' ? [] : [bug], fixed, link }, (e) => {
      if (e.kind === 'result') results = { ...results, [e.result.id]: e.result };
      else if (e.kind === 'error') error = e.message;
      else {
        running = false;
        ms = Math.round(performance.now() - t0);
      }
    });
  }
  onMount(() => {
    run();
    return () => cancel?.();
  });

  const LAYERS: { id: LayerId; name: string; doc: keyof Sources; what: string }[] = [
    { id: 'spec', name: 'Specification', doc: 'spec', what: 'What the bank must do: one atomic transfer at a time.' },
    { id: 'protocol', name: 'Protocol', doc: 'protocol', what: 'How it does it across two shards: local transfers, and credits sent as messages.' },
    { id: 'impl', name: 'Implementation', doc: 'impl', what: 'The code: unsigned 64-bit balances in an array, a fee, a journal.' },
    { id: 'link', name: 'Step handlers', doc: 'handlers', what: 'The glue: the code that carries out each protocol step by calling the implementation.' },
  ];
  const ORIGINAL: Sources = { spec: SPEC, protocol: PROTOCOL, impl: IMPL, handlers: HANDLERS };
  const CONNECT: Partial<Record<LayerId, string>> = {
    protocol: 'refines the specification above it, through a refinement mapping (assumptions A1 and A2)',
    link: 'connect the implementation to the protocol: each handler’s contract is one protocol step (assumptions A3 to A5)',
  };

  const current = $derived(sources(bug === 'none' ? [] : [bug], fixed));
  const active = $derived(SWITCHES.find((s) => s.id === bug));
  const shown = $derived(CHECKS.filter((k) => link || k.layer !== 'link'));
  const done = $derived(!running && shown.every((k) => results[k.id]));
  const failing = $derived(shown.filter((k) => results[k.id] && results[k.id]!.status !== 'verified'));
  // The step handler for local transfers fails without the fix, whatever else is on: that is the gap, not the switch.
  const baseline = (id: string) => id === 'link.local' && !fixed;
  const caught = $derived(failing.filter((k) => !baseline(k.id)));
  const allGreen = $derived(done && link && failing.length === 0);

  const icon = (r: CheckResult | undefined) => (!r ? '…' : r.status === 'verified' ? '✓' : r.status === 'violated' ? '✗' : '?');
  const ENGINE_SHORT = { explorer: 'explorer', refinement: 'refinement', vc: 'verifier + SMT', absint: 'intervals', heap: 'separation logic' } as const;

  /** Scroll a code view to its first changed line. */
  function toChange(node: HTMLElement) {
    const first = node.querySelector<HTMLElement>('.dl.add, .dl.del');
    if (first) node.scrollTop = Math.max(0, first.offsetTop - 40);
  }

  function layerStatus(id: LayerId): 'ok' | 'bad' | 'maybe' | 'pending' | 'off' {
    if (id === 'link' && !link) return 'off';
    const ks = CHECKS.filter((k) => k.layer === id);
    if (ks.some((k) => !results[k.id])) return 'pending';
    if (ks.some((k) => results[k.id]!.status === 'violated' || results[k.id]!.status === 'error')) return 'bad';
    if (ks.some((k) => results[k.id]!.status !== 'verified')) return 'maybe';
    return 'ok';
  }
</script>

<figure class="ld">
  {#if title}<h4 class="ui ttl">{title}</h4>{/if}
  <div class="cols">
    <div class="layers">
      {#each LAYERS as L (L.id)}
        {@const st = layerStatus(L.id)}
        {#if CONNECT[L.id]}<p class="conn ui"><span aria-hidden="true">↑</span> {L.id === 'link' ? 'The handlers' : 'The protocol'} {CONNECT[L.id]}</p>{/if}
        <section class="layer {st}" aria-label={L.name}>
          <header>
            <span class="lname ui">{L.name}</span>
            <span class="lst ui">{st === 'ok' ? '✓ verified' : st === 'bad' ? '✗ broken' : st === 'maybe' ? '? not proved' : st === 'off' ? 'not checked' : 'checking…'}</span>
          </header>
          <p class="what">{L.what}</p>
          {#if L.id === 'link' && !link}
            <button type="button" class="go ui" onclick={() => ((link = true), run())}>Check the step handlers</button>
          {:else}
            <ul class="checks">
              {#each CHECKS.filter((k) => k.layer === L.id) as k (k.id)}
                {@const r = results[k.id]}
                <li class:bad={r && r.status !== 'verified'} class:caught={r && r.status !== 'verified' && !baseline(k.id) && bug !== 'none'}>
                  <button type="button" class="row" aria-expanded={!!open[k.id]} onclick={() => (open = { ...open, [k.id]: !open[k.id] })}>
                    <span class="ic" class:ok={r?.status === 'verified'} class:no={r?.status === 'violated' || r?.status === 'error'} class:mb={r && r.status !== 'verified' && r.status !== 'violated' && r.status !== 'error'}>{icon(r)}</span>
                    <span class="kt">{k.title}</span>
                    <span class="eng ui" title={ENGINE_NAMES[k.engine]}>{ENGINE_SHORT[k.engine]}</span>
                  </button>
                  {#if open[k.id] && r}
                    <div class="det ui">
                      <p><b>Engine:</b> {ENGINE_NAMES[k.engine]}. <b>Badge:</b> {r.badge}.</p>
                      <p><b>Certificate:</b> {r.certificate}.</p>
                      {#if r.message}<p class="msg">{r.message}</p>{/if}
                    </div>
                  {/if}
                </li>
              {/each}
            </ul>
            {#if L.id === 'link'}
              <button type="button" class="code-t ui" onclick={() => ((link = false), (fixed = false), run())}>Stop checking the handlers</button>
              <label class="fix ui"><input type="checkbox" bind:checked={fixed} onchange={run} /> Fix: <code>on_local</code> skips a transfer to the same account</label>
            {/if}
          {/if}
          <button type="button" class="code-t ui" aria-expanded={!!open[`code-${L.id}`]} onclick={() => (open = { ...open, [`code-${L.id}`]: !open[`code-${L.id}`] })}>{open[`code-${L.id}`] ? 'Hide' : 'Show'} the code</button>
          {#if open[`code-${L.id}`]}
            <pre class="src" use:toChange>{#each diffLines(ORIGINAL[L.doc], current[L.doc]) as d, i (i)}<span class="dl {d.kind}">{d.kind === 'add' ? '+ ' : d.kind === 'del' ? '− ' : '  '}{d.text || ' '}</span>{/each}</pre>
          {/if}
        </section>
      {/each}
    </div>

    <aside class="side">
      <fieldset class="sw ui">
        <legend>Break it</legend>
        <label><input type="radio" name="ledger-bug" value="none" bind:group={bug} onchange={run} /> No bug</label>
        {#each LAYERS.slice(0, 3) as L (L.id)}
          <p class="grp">{L.name}</p>
          {#each SWITCHES.filter((s) => s.layer === L.id) as s (s.id)}
            <label><input type="radio" name="ledger-bug" value={s.id} bind:group={bug} onchange={run} /> {s.label}</label>
          {/each}
        {/each}
      </fieldset>

      <div class="out ui" aria-live="polite">
        {#if error}<p class="err">{error}</p>{/if}
        {#if !done}
          <p class="mute">Checking {shown.length} properties…</p>
        {:else}
          <p class="mute">{shown.length} checks in {(ms / 1000).toFixed(1)} s, in a background worker.</p>
          {#if active}
            <p class="bugd"><b>The bug.</b> {active.detail}</p>
            {#if caught.length}
              <p class="catch">✗ Caught by {#each caught as k, i (k.id)}{i ? (i === caught.length - 1 ? ' and ' : ', ') : ''}<b>{k.title}</b> ({ENGINE_SHORT[k.engine]}){/each}.</p>
              <p class="mute">Every other check still passes: each one looks only at its own layer.</p>
            {:else}
              <p class="none">No check fails. The bug is still in the code.</p>
            {/if}
          {/if}
          {#if allGreen}
            <p class="prf"><b>✓ What the composition proves.</b> Every run of the step handlers, called as the protocol allows, changes the balances as a run of the specification would, so money is conserved and no balance goes negative. Under assumptions A1–A7, below.</p>
          {:else if !link && failing.length === 0}
            <p class="gap"><b>Every layer is verified.</b> But nothing yet checks that the implementation carries out the protocol’s steps.</p>
          {:else if link && failing.some((k) => baseline(k.id))}
            <p class="gap"><b>Every layer is verified, and the composition is not.</b> Open the failing handler for the counterexample.</p>
          {/if}
        {/if}
      </div>
    </aside>
  </div>
  {#if caption}<figcaption>{caption}</figcaption>{/if}
</figure>

<style>
  .ld {
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
    grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr);
    gap: 0.9rem;
    align-items: start;
  }
  @media (max-width: 860px) {
    .cols {
      grid-template-columns: minmax(0, 1fr);
    }
    .side {
      order: -1;
    }
  }
  .layer {
    padding: 0.55rem 0.7rem;
    border: 1px solid var(--line-strong);
    border-left: 4px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--panel);
  }
  .layer.ok {
    border-left-color: var(--seal);
  }
  .layer.bad {
    border-left-color: var(--pencil);
  }
  .layer.maybe {
    border-left-color: var(--maybe, var(--gold));
  }
  .layer.off {
    border-style: dashed;
    border-left-style: solid;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
  }
  .lname {
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }
  .lst {
    font-size: 0.76rem;
    color: var(--mute);
  }
  .ok .lst {
    color: var(--seal);
  }
  .bad .lst {
    color: var(--pencil);
  }
  .what {
    margin: 0.2rem 0 0.4rem;
    font-size: 0.88rem;
    color: var(--ink-2);
  }
  .conn {
    margin: 0.35rem 0 0.35rem 0.8rem;
    font-size: 0.76rem;
    color: var(--mute);
  }
  .checks {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.15rem;
  }
  .row {
    all: unset;
    box-sizing: border-box;
    display: grid;
    grid-template-columns: 1.3rem minmax(0, 1fr) auto;
    gap: 0.4rem;
    align-items: baseline;
    width: 100%;
    padding: 0.15rem 0.3rem;
    border-radius: var(--radius-sm);
    cursor: pointer;
    font-size: 0.86rem;
  }
  .row:hover {
    background: var(--ink-blue-soft);
  }
  .row:focus-visible {
    outline: 2px solid var(--ink-blue);
  }
  li.caught .row {
    background: var(--pencil-soft);
  }
  .ic {
    font-family: var(--font-ui);
    font-weight: 700;
    text-align: center;
    color: var(--mute);
  }
  .ic.ok {
    color: var(--seal);
  }
  .ic.no {
    color: var(--pencil);
  }
  .ic.mb {
    color: var(--maybe, var(--gold));
  }
  .eng {
    font-size: 0.72rem;
    color: var(--mute);
    white-space: nowrap;
  }
  .det {
    margin: 0.15rem 0 0.35rem 1.7rem;
    font-size: 0.78rem;
    color: var(--ink-2);
  }
  .det p {
    margin: 0.15rem 0;
  }
  .msg {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    overflow-wrap: anywhere;
  }
  button.go,
  .code-t {
    font-family: var(--font-ui);
    font-size: 0.8rem;
    padding: 0.22rem 0.65rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
  }
  button.go {
    background: var(--ink-blue);
    border-color: var(--ink-blue);
    color: var(--on-accent);
    font-weight: 600;
  }
  .code-t {
    margin-top: 0.45rem;
    font-size: 0.74rem;
    padding: 0.12rem 0.5rem;
  }
  .fix {
    display: block;
    margin-top: 0.4rem;
    font-size: 0.8rem;
  }
  .ld code {
    all: unset;
    font-family: var(--font-mono);
    font-size: 0.78rem;
  }
  .src {
    position: relative;
    margin: 0.4rem 0 0;
    padding: 0.5rem;
    max-height: 26rem;
    overflow: auto;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--bg);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    line-height: 1.45;
  }
  .dl {
    display: block;
    min-width: 100%;
    width: max-content;
    white-space: pre;
  }
  .dl.add {
    background: var(--seal-soft);
    color: var(--seal-ink);
  }
  .dl.del {
    background: var(--pencil-soft);
    color: var(--pencil);
    text-decoration: line-through;
  }
  .side {
    display: grid;
    gap: 0.7rem;
  }
  .sw {
    margin: 0;
    padding: 0.5rem 0.7rem 0.6rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--panel);
    font-size: 0.84rem;
  }
  .sw legend {
    padding: 0 0.3rem;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }
  .sw label {
    display: flex;
    gap: 0.4rem;
    align-items: baseline;
    padding: 0.1rem 0;
  }
  .grp {
    margin: 0.45rem 0 0.1rem;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mute);
  }
  .out {
    font-size: 0.84rem;
  }
  .out p {
    margin: 0 0 0.45rem;
  }
  .mute {
    color: var(--mute);
    font-size: 0.78rem;
  }
  .catch,
  .err {
    color: var(--pencil);
  }
  .none {
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--maybe, var(--gold));
    border-radius: var(--radius-sm);
    font-weight: 600;
  }
  .prf {
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--seal);
    border-radius: var(--radius-sm);
    background: var(--seal-soft);
  }
  .gap {
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--gold);
    border-radius: var(--radius-sm);
    background: var(--gold-soft);
  }
  figcaption {
    margin-top: 0.6rem;
    font-family: var(--font-ui);
    font-size: 0.86rem;
    color: var(--ink-2);
  }
</style>
