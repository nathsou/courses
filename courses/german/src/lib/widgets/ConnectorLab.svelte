<script lang="ts">
  /**
   * Two clauses joined by a connector: und/aber/oder/denn leave the order alone (position 0),
   * weil/obwohl/wenn/dass/damit send the verb to the end, deshalb/trotzdem/dann/außerdem pull it
   * straight after themselves. The verb is highlighted and the rule named. Quiz: pick the right order.
   */
  import { CLAUSE_PAIRS, CONNECTORS, KIND_RULES, type ConnectorId, type ConnectorKind } from './data/connector-lab';
  import { CAN_LEAD, join, kindOf, text, variants, type Tok } from './grammar/connectors';
  import { shuffle } from '$lib/exercises/shuffle';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { settings } from '$lib/state/settings.svelte';
  import Shell from './kit/Shell.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  let tab = $state(0);
  let pi = $state(0);
  let conn = $state<ConnectorId>('weil');
  let lead = $state(false);
  const pair = $derived(CLAUSE_PAIRS[pi]!);
  const fits = (c: ConnectorId) => pair.connectors.some((x) => x.c === c);
  const current = $derived(fits(conn) ? conn : pair.connectors[0]!.c);
  const pc = $derived(pair.connectors.find((x) => x.c === current)!);
  const kind = $derived(kindOf(current));
  const canLead = $derived(CAN_LEAD.has(current));
  const toks = $derived(join(pair, current, { lead: lead && canLead }));
  const sentence = $derived(text(toks));
  const GROUPS: ConnectorKind[] = ['zero', 'end', 'invert'];

  function step(d: number) {
    pi = (pi + d + CLAUSE_PAIRS.length) % CLAUSE_PAIRS.length;
  }

  // Quiz
  const ALL = CLAUSE_PAIRS.flatMap((p, i) => p.connectors.map((c) => ({ pi: i, c: c.c, en: c.en }))).filter((q) => variants(CLAUSE_PAIRS[q.pi]!, q.c).wrong.length === 2);
  const ROUND = 8;
  let order = $state<typeof ALL>([]);
  let qi = $state(0);
  let score = $state(0);
  let picked = $state<string | null>(null);
  const q = $derived(order[qi]);
  const qv = $derived(q ? variants(CLAUSE_PAIRS[q.pi]!, q.c) : null);
  const options = $derived(q && qv ? shuffle([qv.right, ...qv.wrong], `${q.pi}-${q.c}-${qi}`) : []);
  const done = $derived(order.length > 0 && qi >= order.length);

  function start() {
    order = shuffle(ALL, Date.now() % 1e9).slice(0, ROUND);
    qi = 0;
    score = 0;
    picked = null;
  }
  function pick(o: string) {
    if (picked || !qv) return;
    picked = o;
    const ok = o === qv.right;
    if (ok) score++;
    sfx(ok ? 'right' : 'wrong', settings.data.sounds);
    void speech.say(qv.right);
  }
  function next() {
    qi++;
    picked = null;
    if (qi >= order.length) sfx('done', settings.data.sounds);
  }
</script>

{#snippet line(ts: Tok[])}
  <span class="line" lang="de">
    {#each ts as t, i (i)}{#if t.t === ',' || t.t === '.'}{t.t}{:else}{i ? ' ' : ''}{#if t.k}<span class="k-{t.k}">{t.t}</span>{:else}{t.t}{/if}{/if}{/each}
  </span>
{/snippet}

<Shell label="Connector lab" icon="arrow" title="Watch the verb move" tabs={['Explore', 'Quiz']} bind:tab>
  {#if tab === 0}
    <div class="pairnav">
      <button type="button" class="btn small ghost" onclick={() => step(-1)} aria-label="Previous pair"><Icon name="back" size={15} /></button>
      <div class="clauses">
        <p lang="de"><span class="tag ui">A</span> {pair.x.de} <PlayButton text={pair.x.de} small /></p>
        <p lang="de"><span class="tag ui">B</span> {pair.y.de} <PlayButton text={pair.y.de} small /></p>
      </div>
      <button type="button" class="btn small ghost" onclick={() => step(1)} aria-label="Next pair"><Icon name="arrow" size={15} /></button>
    </div>
    <p class="count ui">Pair {pi + 1} of {CLAUSE_PAIRS.length}</p>

    <div class="groups">
      {#each GROUPS as g (g)}
        <div class="group g-{g}">
          <p class="glabel ui">{KIND_RULES[g].label}</p>
          <div class="chips">
            {#each CONNECTORS.filter((x) => x.kind === g) as x (x.c)}
              <button
                type="button"
                class="chip"
                class:on={current === x.c}
                aria-pressed={current === x.c}
                disabled={!fits(x.c)}
                title={fits(x.c) ? x.gloss : `${x.gloss}: does not fit these two clauses`}
                lang="de"
                onclick={() => (conn = x.c)}>{x.c}</button
              >
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <div class="stage" aria-live="polite">
      <p class="sentence">{@render line(toks)} <PlayButton text={sentence} /></p>
      <p class="en ui">“{pc.en}”</p>
      {#if canLead}
        <label class="leadopt ui"><input type="checkbox" bind:checked={lead} /> Put the <span lang="de">{current}</span>-clause first</label>
      {/if}
      <p class="rule ui">
        <b>{KIND_RULES[kind].label}.</b>
        {lead && canLead ? 'The whole subordinate clause now fills position 1 of the sentence, so the main verb comes straight after the comma: verb, comma, verb.' : KIND_RULES[kind].rule}
      </p>
    </div>
    <p class="key ui"><span class="k-conn">connector</span> <span class="k-verb">verb</span> <span class="k-subj">subject</span> · greyed-out connectors don’t fit these two clauses</p>
  {:else}
    <div class="quiz">
      {#if !order.length || done}
        {#if done}<p class="ui score"><strong>{score} / {order.length}</strong> {score === order.length ? 'Ausgezeichnet!' : 'Have another go.'}</p>{:else}<p class="ui intro">Which word order is right? Watch where each connector puts the verb.</p>{/if}
        <button type="button" class="btn primary" onclick={start}>{done ? 'Again' : 'Start'}</button>
      {:else if q && qv}
        <div class="head ui"><span>{qi + 1} / {order.length}</span><span>Score {score}</span></div>
        <p class="qprompt ui">Join with <b lang="de" class="k-conn">{q.c}</b>: <span class="mute">“{q.en}”</span></p>
        <div class="opts" role="group" aria-label="Choose the sentence">
          {#each options as o (o)}
            <button type="button" class="opt" class:right={!!picked && o === qv.right} class:wrong={picked === o && o !== qv.right} disabled={!!picked} lang="de" onclick={() => pick(o)}>{o}</button>
          {/each}
        </div>
        <div class="fb" aria-live="polite">
          {#if picked}
            <p class="ui verdict" class:ok={picked === qv.right}>
              <strong lang="de">{picked === qv.right ? 'Richtig!' : 'Nicht ganz.'}</strong>
              {KIND_RULES[kindOf(q.c)].label}: {KIND_RULES[kindOf(q.c)].rule}
            </p>
            <button type="button" class="btn primary small" onclick={next}>Next <Icon name="arrow" size={14} /></button>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</Shell>

<style>
  .pairnav {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .clauses {
    flex: 1;
    min-width: 0;
  }
  .clauses p {
    margin: 0.1rem 0;
    font-size: 1.1rem;
    font-weight: 560;
  }
  .tag {
    display: inline-grid;
    place-items: center;
    width: 1.3rem;
    height: 1.3rem;
    border-radius: 5px;
    background: var(--pn);
    color: var(--mute);
    font-size: 0.72rem;
    font-weight: 700;
    vertical-align: 0.1em;
  }
  .count {
    margin: 0.1rem 0 0.7rem;
    text-align: center;
    font-size: 0.75rem;
    color: var(--mute);
  }
  .groups {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
    gap: 0.5rem;
  }
  .group {
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 0.45rem 0.55rem 0.55rem;
    background: var(--bg);
  }
  .glabel {
    margin: 0 0 0.35rem;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--ink-2);
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .chip {
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 999px;
    padding: 0.18rem 0.65rem;
    font-family: var(--font-body);
    font-size: 0.95rem;
    font-weight: 560;
    cursor: pointer;
  }
  .chip:disabled {
    opacity: 0.38;
    cursor: not-allowed;
    border-style: dashed;
  }
  .chip.on {
    background: var(--jade);
    border-color: var(--jade);
    color: #fff;
  }
  .stage {
    margin: 0.8rem 0 0.5rem;
    padding: 0.85rem 0.9rem 0.7rem;
    border-radius: 12px;
    background: var(--bg);
    border: 1px solid var(--line);
  }
  .sentence {
    margin: 0;
    font-size: 1.35rem;
    line-height: 1.5;
    font-weight: 560;
  }
  .k-conn {
    color: var(--jade);
    font-weight: 750;
    background: var(--jade-soft);
    border-radius: 5px;
    padding: 0 0.2rem;
  }
  .k-verb {
    color: #fff;
    background: var(--accent);
    border-radius: 5px;
    padding: 0 0.25rem;
  }
  .k-subj {
    box-shadow: inset 0 -2px 0 var(--gold);
  }
  .en {
    margin: 0.35rem 0 0;
    font-size: 0.9rem;
    color: var(--ink-2);
  }
  .leadopt {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    margin-top: 0.5rem;
    font-size: 0.85rem;
  }
  .rule {
    margin: 0.55rem 0 0;
    font-size: 0.88rem;
    color: var(--ink-2);
    line-height: 1.55;
  }
  .key {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.6rem;
    align-items: center;
    font-size: 0.75rem;
    color: var(--mute);
    margin: 0.5rem 0 0;
  }
  .head {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--mute);
  }
  .intro {
    color: var(--ink-2);
    margin: 0 0 0.6rem;
  }
  .qprompt {
    margin: 0.4rem 0 0.6rem;
    font-size: 0.95rem;
  }
  .mute {
    color: var(--mute);
  }
  .opts {
    display: grid;
    gap: 0.4rem;
  }
  .opt {
    text-align: left;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 10px;
    padding: 0.55rem 0.8rem;
    font-family: var(--font-body);
    font-size: 1.05rem;
    font-weight: 560;
    cursor: pointer;
  }
  .opt:hover:not(:disabled) {
    border-color: var(--accent);
  }
  .opt:disabled {
    cursor: default;
  }
  .opt.right {
    border-color: var(--jade);
    background: var(--jade-soft);
  }
  .opt.wrong {
    border-color: var(--bad);
    background: var(--bad-soft);
  }
  .fb {
    min-height: 3rem;
    margin-top: 0.5rem;
  }
  .verdict {
    margin: 0 0 0.5rem;
    font-size: 0.88rem;
    color: var(--ink-2);
    line-height: 1.5;
  }
  .verdict strong {
    color: var(--accent-ink);
  }
  .verdict.ok strong {
    color: var(--jade);
  }
  .score {
    font-size: 1.05rem;
  }
  @media (max-width: 480px) {
    .sentence {
      font-size: 1.15rem;
    }
  }
</style>
