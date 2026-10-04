<!--
  The TCB map (chapter 29): the components between "what you meant" and the hardware. Pick a kind of result and
  the map shows which components it trusted, which were re-checked by a certificate checker, and which it does not
  depend on; click a component for what it does, how the course handles it, and what has gone wrong there in real
  verified systems. The audit tab asks where four "verified" artefacts' gaps were.
-->
<script lang="ts">
  import { AUDITS, COMPONENTS, RESULTS, type ComponentId, type Role } from './tcb';
  import { codeParts } from './text';

  let { title, start = 'map' }: { title?: string; start?: 'map' | 'audit' } = $props();

  // svelte-ignore state_referenced_locally
  let tab = $state<'map' | 'audit'>(start);
  let result = $state('smt');
  let selected = $state<ComponentId>('translation');
  let answers = $state<Record<string, ComponentId>>({});

  const R = $derived(RESULTS.find((r) => r.id === result)!);
  const C = $derived(COMPONENTS.find((c) => c.id === selected)!);
  const trustedCount = $derived(COMPONENTS.filter((c) => R.roles[c.id] === 'trusted').length);
  const ROLE: Record<Role, string> = { trusted: 'trusted', checked: 'checked by a certificate', untrusted: 'not trusted: the result does not depend on it', none: 'not involved' };
  const ROLE_SHORT: Record<Role, string> = { trusted: 'trusted', checked: 'checked', untrusted: 'not trusted', none: 'not involved' };
  const score = $derived(AUDITS.filter((a) => answers[a.id] === a.answer).length);
</script>

<figure class="tcb">
  {#if title}<h4 class="ui ttl">{title}</h4>{/if}
  <div class="tabs ui" role="tablist">
    <button type="button" role="tab" aria-selected={tab === 'map'} class:on={tab === 'map'} onclick={() => (tab = 'map')}>The map</button>
    <button type="button" role="tab" aria-selected={tab === 'audit'} class:on={tab === 'audit'} onclick={() => (tab = 'audit')}>Audit ({score}/{AUDITS.length})</button>
  </div>

  {#if tab === 'map'}
    <div class="cols">
      <fieldset class="results ui">
        <legend>A result</legend>
        {#each RESULTS as r (r.id)}
          <label><input type="radio" name="tcb-result" value={r.id} bind:group={result} /> <span>{r.label} <span class="ch">({r.chapter})</span></span></label>
        {/each}
      </fieldset>
      <div>
        <ol class="stack">
          {#each COMPONENTS as c (c.id)}
            {@const role = R.roles[c.id]}
            <li>
              <button type="button" class="comp {role}" class:sel={selected === c.id} aria-pressed={selected === c.id} onclick={() => (selected = c.id)}>
                <span class="cn">{c.name}</span>
                <span class="role ui">{role === 'trusted' ? '● ' : role === 'checked' ? '✓ ' : ''}{ROLE_SHORT[role]}</span>
              </button>
            </li>
          {/each}
        </ol>
        <p class="sum ui"><b>{trustedCount}</b> of {COMPONENTS.length} components trusted. {R.note}</p>
      </div>
    </div>
    <div class="detail">
      <p class="dh ui"><b>{C.name}</b> · {ROLE[R.roles[C.id]]}</p>
      <p>{C.what}</p>
      <p><span class="lab ui">In the course</span> {#each codeParts(C.course) as p, i (i)}{#if p.code}<code>{p.text}</code>{:else}{p.text}{/if}{/each}</p>
      <p><span class="lab ui">In the world</span> {C.world}</p>
    </div>
  {:else}
    <p class="intro">For each artefact, click the component where its gap was.</p>
    <div class="audits">
      {#each AUDITS as a (a.id)}
        {@const got = answers[a.id]}
        <section class="audit" class:ok={got === a.answer} class:bad={got && got !== a.answer}>
          <h5 class="ui">{a.title}</h5>
          <p>{a.story}</p>
          <div class="chips ui">
            {#each COMPONENTS as c (c.id)}
              <button type="button" class:right={got && c.id === a.answer} class:wrong={got === c.id && c.id !== a.answer} aria-pressed={got === c.id} onclick={() => (answers = { ...answers, [a.id]: c.id })}>{c.name}</button>
            {/each}
          </div>
          {#if got}
            <p class="fb ui">{got === a.answer ? '✓ Yes.' : `✗ Not ${COMPONENTS.find((c) => c.id === got)!.name.toLowerCase()}: it was ${COMPONENTS.find((c) => c.id === a.answer)!.name.toLowerCase()}.`} {a.explain}</p>
          {/if}
        </section>
      {/each}
    </div>
  {/if}
</figure>

<style>
  .tcb {
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
    gap: 0.3rem;
    margin-bottom: 0.7rem;
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
  .cols {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.3fr);
    gap: 0.9rem;
    align-items: start;
  }
  @media (max-width: 760px) {
    .cols {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .results {
    margin: 0;
    padding: 0.5rem 0.7rem 0.6rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--panel);
    font-size: 0.86rem;
  }
  .results legend {
    padding: 0 0.3rem;
    font-size: 0.74rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
  }
  .results label {
    display: flex;
    gap: 0.45rem;
    align-items: baseline;
    padding: 0.18rem 0;
  }
  .ch {
    color: var(--mute);
    font-size: 0.76rem;
  }
  .stack {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.25rem;
  }
  .comp {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.6rem;
    text-align: left;
    padding: 0.35rem 0.6rem;
    border-width: 1px 1px 1px 4px;
    font-size: 0.88rem;
  }
  .comp.trusted {
    border-left-color: var(--gold);
    background: var(--gold-soft);
  }
  .comp.checked {
    border-left-color: var(--seal);
    background: var(--seal-soft);
  }
  .comp.untrusted {
    border-style: dashed;
    border-left-style: solid;
    color: var(--ink-2);
  }
  .comp.none {
    border-style: dashed;
    border-left-style: solid;
    color: var(--mute);
    background: transparent;
  }
  .comp.sel {
    outline: 2px solid var(--ink-blue);
    outline-offset: 1px;
  }
  .cn {
    font-weight: 600;
  }
  .role {
    font-size: 0.72rem;
    white-space: nowrap;
  }
  .trusted .role {
    color: var(--gold);
  }
  .checked .role {
    color: var(--seal);
  }
  .sum {
    margin: 0.5rem 0 0;
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .detail {
    margin-top: 0.8rem;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--panel);
    font-size: 0.92rem;
  }
  .detail p {
    margin: 0.3rem 0;
  }
  .dh {
    font-size: 0.86rem;
  }
  .lab {
    display: inline-block;
    min-width: 7.5rem;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mute);
  }
  .tcb :global(code) {
    font-size: 0.82em;
  }
  .intro {
    margin: 0 0 0.6rem;
    font-size: 0.92rem;
  }
  .audits {
    display: grid;
    gap: 0.7rem;
  }
  .audit {
    padding: 0.55rem 0.75rem;
    border: 1px solid var(--line-strong);
    border-left: 4px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--panel);
  }
  .audit.ok {
    border-left-color: var(--seal);
  }
  .audit.bad {
    border-left-color: var(--pencil);
  }
  .audit h5 {
    margin: 0 0 0.2rem;
    font-size: 0.82rem;
    font-weight: 700;
  }
  .audit p {
    margin: 0.2rem 0 0.45rem;
    font-size: 0.9rem;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .chips button {
    font-size: 0.76rem;
    padding: 0.15rem 0.5rem;
  }
  .chips button.right {
    border-color: var(--seal);
    background: var(--seal-soft);
    font-weight: 600;
  }
  .chips button.wrong {
    border-color: var(--pencil);
    background: var(--pencil-soft);
  }
  .fb {
    font-size: 0.84rem !important;
  }
  .ok .fb {
    color: var(--seal-ink);
  }
</style>
