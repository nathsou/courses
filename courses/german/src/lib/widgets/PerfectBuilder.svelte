<script lang="ts">
  /**
   * The perfect, step by step: choose a verb; step 1 haben or sein (and why); step 2 how the
   * participle is made (ge-…-t, ge-…-en, no ge-, separable an·ge·rufen); step 3 the sentence.
   * Quiz: choose the auxiliary and type the participle, checked against the verb tables.
   */
  import { PERFECT_VERBS, SEIN_REASONS, type PerfectVerb } from './data/perfect-builder';
  import { analyse, participleRule } from './grammar/participle';
  import { allVerbs, conjugate, verbTable } from '$lib/de/verbs';
  import { lookup } from '$lib/de/lexicon';
  import { mark, type Marked } from '$lib/de/check';
  import { shuffle } from '$lib/exercises/shuffle';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { settings } from '$lib/state/settings.svelte';
  import Shell from './kit/Shell.svelte';
  import Rich from '$lib/components/exercise/Rich.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import UmlautKeys from '$lib/components/de/UmlautKeys.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  interface Item extends PerfectVerb {
    /** Accepts haben and sein (Wiktionary aux "hs") in the quiz. */
    either?: boolean;
    curated: boolean;
  }

  const curated = new Set(PERFECT_VERBS.map((v) => v.verb));
  const extra: Item[] = allVerbs()
    .filter((k) => !curated.has(k) && !/^sich /.test(k) && verbTable(k)?.pp)
    .map((k) => {
      const t = verbTable(k)!;
      const aux = t.aux === 's' ? 'sein' : 'haben';
      const form = conjugate(k, 'perfect', 0) ?? '';
      return { verb: k, pp: t.pp, aux, gloss: lookup(k)?.g ?? '', de: `Ich ${form}.`, en: '', curated: false, either: t.aux === 'hs' };
    });
  const ITEMS: Item[] = [
    ...PERFECT_VERBS.map((v) => {
      const t = verbTable(v.verb);
      return { ...v, pp: t?.pp ?? v.pp, curated: true, either: t?.aux === 'hs' && v.verb !== 'bekommen' };
    }),
    ...extra,
  ];

  const GROUPS: { label: string; test: (v: Item) => boolean }[] = [
    { label: 'With sein', test: (v) => v.aux === 'sein' },
    { label: 'Regular: ge-…-t', test: (v) => !analyse(v.verb, v.pp).prefix && analyse(v.verb, v.pp).ge && analyse(v.verb, v.pp).type === 'weak' },
    { label: 'Irregular: ge-…-en', test: (v) => !analyse(v.verb, v.pp).prefix && analyse(v.verb, v.pp).ge && analyse(v.verb, v.pp).type === 'strong' },
    { label: 'Mixed: ge-…-t, new stem', test: (v) => !analyse(v.verb, v.pp).prefix && analyse(v.verb, v.pp).ge && analyse(v.verb, v.pp).type === 'mixed' },
    { label: 'No ge-', test: (v) => !analyse(v.verb, v.pp).ge && !analyse(v.verb, v.pp).prefix },
    { label: 'Separable', test: (v) => !!analyse(v.verb, v.pp).prefix },
  ];
  const groupOf = (v: Item) => GROUPS.find((g) => g.test(v))!.label;
  const grouped = GROUPS.map((g) => ({ label: g.label, items: ITEMS.filter((v) => v.curated && groupOf(v) === g.label) }));

  let tab = $state(0);
  let vid = $state('anrufen');
  const item = $derived(ITEMS.find((v) => v.verb === vid) ?? ITEMS[0]!);
  const a = $derived(analyse(item.verb, item.pp));
  const AUX_FORMS = { haben: ['habe', 'hast', 'hat', 'haben', 'habt', 'haben'], sein: ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'] };
  const PRON = ['ich', 'du', 'er/sie', 'wir', 'ihr', 'sie/Sie'];
  const whyAux = (v: Item) => (v.aux === 'sein' ? (v.kind ? SEIN_REASONS[v.kind] : 'it is movement or a change of state.') : SEIN_REASONS.haben);

  /** The sentence split for highlighting: the auxiliary and the participle. */
  function sentenceParts(v: Item): { t: string; k: '' | 'aux' | 'pp' }[] {
    const forms = new Set(AUX_FORMS[v.aux]);
    let auxDone = false;
    return v.de.split(/(\p{L}+)/u).filter(Boolean).map((t) => {
      if (!auxDone && forms.has(t.toLowerCase())) {
        auxDone = true;
        return { t, k: 'aux' as const };
      }
      if (t === v.pp) return { t, k: 'pp' as const };
      return { t, k: '' as const };
    });
  }
  const spoken = (v: Item) => (v.curated ? v.de : v.de.replace(/^Ich /, 'ich '));
  function random() {
    const pool = ITEMS.filter((v) => v.curated && v.verb !== vid);
    vid = pool[Math.floor(Math.random() * pool.length)]!.verb;
  }

  // Quiz
  const ROUND = 8;
  let order = $state<string[]>([]);
  let qi = $state(0);
  let score = $state(0);
  let auxPick = $state<'haben' | 'sein' | null>(null);
  let value = $state('');
  let result = $state<Marked | null>(null);
  let input: HTMLInputElement | undefined = $state();
  const q = $derived(order.length ? ITEMS.find((v) => v.verb === order[qi]) : undefined);
  const auxOk = $derived(!!q && !!auxPick && (auxPick === q.aux || !!q.either));
  const done = $derived(order.length > 0 && qi >= order.length);

  function startQuiz() {
    order = shuffle(
      ITEMS.filter((v) => v.curated).map((v) => v.verb),
      Date.now() % 1e9,
    ).slice(0, ROUND);
    qi = 0;
    score = 0;
    reset();
  }
  function reset() {
    auxPick = null;
    value = '';
    result = null;
  }
  function chooseAux(x: 'haben' | 'sein') {
    if (auxPick || !q) return;
    auxPick = x;
    sfx(x === q.aux || q.either ? 'right' : 'wrong', settings.data.sounds);
    queueMicrotask(() => input?.focus());
  }
  function check(e?: Event) {
    e?.preventDefault();
    if (!q || result || !value.trim()) return;
    result = mark(value, q.pp, { lenient: settings.data.lenientSpelling });
    const ok = result.verdict !== 'wrong';
    if (ok && auxOk) score++;
    sfx(ok ? 'right' : 'wrong', settings.data.sounds);
    void speech.say(spoken(q));
  }
  function next() {
    qi++;
    reset();
    if (qi >= order.length) sfx('done', settings.data.sounds);
  }
</script>

{#snippet ppPieces(v: Item, big: boolean)}
  {@const x = analyse(v.verb, v.pp)}
  <span class="pieces" class:big lang="de">
    {#if x.prefix}<span class="pc prefix"><b>{x.prefix}</b><small class="ui">prefix</small></span>{/if}
    {#if x.ge}<span class="pc ge"><b>ge</b><small class="ui">ge-</small></span>{:else}<span class="pc none"><b>∅</b><small class="ui">no ge-</small></span>{/if}
    <span class="pc stem" class:changed={x.changed}><b>{x.stem}</b><small class="ui">{x.changed ? 'new stem' : 'stem'}</small></span>
    <span class="pc end" class:strong={x.type === 'strong'}><b>{x.ending}</b><small class="ui">-{x.ending}</small></span>
  </span>
{/snippet}

<Shell label="Perfect builder" icon="clock" title="haben or sein, and the participle" tabs={['Build', 'Quiz']} bind:tab>
  {#if tab === 0}
    <div class="pick">
      <label class="ui" for="pb-verb">Verb</label>
      <select id="pb-verb" class="ui" bind:value={vid}>
        {#each grouped as g (g.label)}
          <optgroup label={g.label}>
            {#each g.items as v (v.verb)}<option value={v.verb}>{v.verb} – {v.gloss}</option>{/each}
          </optgroup>
        {/each}
        {#if extra.length}
          <optgroup label="Other verbs in the course">
            {#each extra as v (v.verb)}<option value={v.verb}>{v.verb}{v.gloss ? ` – ${v.gloss}` : ''}</option>{/each}
          </optgroup>
        {/if}
      </select>
      <button type="button" class="btn small ghost" onclick={random}><Icon name="shuffle" size={15} /> Random</button>
    </div>

    <ol class="steps">
      <li class="step">
        <p class="sh ui"><span class="n">1</span> haben or sein?</p>
        <p class="auxline"><span class="aux" lang="de">{item.aux}</span> <span class="why ui"><Rich text={`{${item.verb}} takes {${item.aux}}: ${whyAux(item)}`} /></span></p>
        {#if item.note}<p class="note ui"><Rich text={item.note} /></p>{/if}
        {#if item.either && !item.note}<p class="note ui">The course dictionary allows both haben and sein for this verb, depending on the meaning.</p>{/if}
        <p class="forms ui" lang="de">{#each AUX_FORMS[item.aux] as f, i (i)}<span><i>{PRON[i]}</i> {f}</span>{/each}</p>
      </li>
      <li class="step">
        <p class="sh ui"><span class="n">2</span> The participle</p>
        <div class="ppline">
          {@render ppPieces(item, true)}
          <span class="eq" aria-hidden="true">=</span>
          <span class="pp" lang="de">{item.pp}</span>
          <PlayButton text={item.pp} small />
        </div>
        <p class="why ui"><Rich text={participleRule(item.verb, item.pp, a)} /></p>
      </li>
      <li class="step">
        <p class="sh ui"><span class="n">3</span> The sentence</p>
        <p class="sentence" lang="de">
          {#each sentenceParts(item) as p, i (i)}{#if p.k}<span class="k-{p.k}">{p.t}</span>{:else}{p.t}{/if}{/each}
          <PlayButton text={spoken(item)} />
        </p>
        {#if item.en}<p class="en ui">“{item.en}”</p>{/if}
        <p class="why ui">The auxiliary is the conjugated verb, in position 2; the participle goes to the end.</p>
      </li>
    </ol>
  {:else}
    <div class="quiz">
      {#if !order.length || done}
        {#if done}<p class="score ui"><strong>{score} / {order.length}</strong> {score === order.length ? 'Perfekt!' : 'Try another round.'}</p>{:else}<p class="ui intro">For each verb, choose haben or sein, then type the participle.</p>{/if}
        <button type="button" class="btn primary" onclick={startQuiz}>{done ? 'Again' : 'Start'}</button>
      {:else if q}
        <div class="head ui"><span>{qi + 1} / {order.length}</span><span>Score {score}</span></div>
        <p class="qverb"><span lang="de">{q.verb}</span> <span class="ui gloss">{q.gloss}</span></p>
        <div class="auxbtns" role="group" aria-label="Auxiliary">
          {#each ['haben', 'sein'] as const as x (x)}
            <button
              type="button"
              class="btn"
              class:right={!!auxPick && (x === q.aux || (q.either && x === auxPick))}
              class:wrong={auxPick === x && !auxOk}
              disabled={!!auxPick}
              lang="de"
              onclick={() => chooseAux(x)}>{x}</button
            >
          {/each}
        </div>
        {#if auxPick}
          <form class="row" onsubmit={check}>
            <span class="pre ui" lang="de">ich {AUX_FORMS[q.aux][0]}</span>
            <input
              bind:this={input}
              bind:value
              class="ui"
              class:right={result?.verdict === 'right'}
              class:almost={result?.verdict === 'almost'}
              class:wrong={result?.verdict === 'wrong'}
              lang="de"
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              aria-label="Participle of {q.verb}"
              placeholder="participle…"
              readonly={!!result}
            />
            {#if !result}<button class="btn" disabled={!value.trim()}>Check</button>{:else}<button type="button" class="btn primary" onclick={next}>Next <Icon name="arrow" size={14} /></button>{/if}
          </form>
          {#if !result}<UmlautKeys target={input} oninput={(v) => (value = v)} />{/if}
        {/if}
        <div class="fb" aria-live="polite">
          {#if auxPick && !result}
            <p class="ui verdict" class:ok={auxOk}><strong>{auxOk ? 'Ja,' : 'Nein:'}</strong> <Rich text={`{${q.verb}} takes {${q.aux}}: ${whyAux(q)}`} /></p>
          {:else if result}
            <p class="ui verdict" class:ok={result.verdict !== 'wrong' && auxOk}>
              <strong lang="de">{result.verdict !== 'wrong' && auxOk ? 'Richtig!' : 'Nicht ganz.'}</strong>
              <span lang="de" class="de">ich {AUX_FORMS[q.aux][0]} … {q.pp}</span>
              {#if result.verdict === 'almost' && result.note}<span>({result.note})</span>{/if}
            </p>
            <p class="why ui">{@render ppPieces(q, false)}</p>
            <p class="why ui"><Rich text={participleRule(q.verb, q.pp)} /></p>
            <p class="sentence small" lang="de">{q.de} <PlayButton text={spoken(q)} small /></p>
          {/if}
        </div>
      {/if}
    </div>
  {/if}
</Shell>

<style>
  .pick {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
  .pick label {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--mute);
  }
  .pick select {
    font-size: 0.95rem;
    padding: 0.35rem 0.5rem;
    border-radius: 8px;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    max-width: 100%;
    min-width: 0;
    flex: 1 1 12rem;
  }
  .steps {
    list-style: none;
    padding: 0;
    margin: 0.8rem 0 0;
    display: grid;
    gap: 0.6rem;
  }
  .step {
    margin: 0;
    padding: 0.7rem 0.85rem 0.75rem;
    border-radius: 12px;
    background: var(--bg);
    border: 1px solid var(--line);
  }
  .sh {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    margin: 0 0 0.45rem;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-2);
  }
  .n {
    display: inline-grid;
    place-items: center;
    width: 1.35rem;
    height: 1.35rem;
    border-radius: 50%;
    background: var(--accent);
    color: #fff;
    font-size: 0.75rem;
    letter-spacing: 0;
  }
  .auxline {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.3rem 0.6rem;
    margin: 0;
  }
  .aux {
    font-size: 1.4rem;
    font-weight: 700;
    color: var(--jade);
  }
  .why {
    font-size: 0.88rem;
    color: var(--ink-2);
    line-height: 1.55;
    margin: 0.35rem 0 0;
  }
  .auxline .why {
    margin: 0;
  }
  .note {
    font-size: 0.82rem;
    color: var(--mute);
    margin: 0.3rem 0 0;
  }
  .forms {
    display: flex;
    flex-wrap: wrap;
    gap: 0.15rem 0.8rem;
    margin: 0.45rem 0 0;
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .forms i {
    color: var(--mute);
    font-style: normal;
  }
  .ppline {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.6rem;
  }
  .pieces {
    display: inline-flex;
    gap: 0.2rem;
    vertical-align: middle;
  }
  .pc {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    padding: 0.15rem 0.35rem 0.1rem;
    border-radius: 7px;
    border: 1px solid var(--line);
    background: var(--panel);
  }
  .pc b {
    font-family: var(--font-body);
    font-weight: 650;
    font-size: 1rem;
  }
  .big .pc b {
    font-size: 1.3rem;
  }
  .pc small {
    font-size: 0.62rem;
    color: var(--mute);
    white-space: nowrap;
  }
  .pc.prefix {
    background: var(--accent-soft);
    border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  }
  .pc.prefix b {
    color: var(--accent-ink);
  }
  .pc.ge b {
    color: var(--gold);
  }
  .pc.none b {
    color: var(--mute);
  }
  .pc.none {
    border-style: dashed;
  }
  .pc.stem.changed {
    background: var(--gold-soft);
  }
  .pc.end b {
    color: var(--jade);
  }
  .eq {
    color: var(--mute);
  }
  .pp {
    font-size: 1.4rem;
    font-weight: 650;
  }
  .sentence {
    margin: 0;
    font-size: 1.25rem;
    line-height: 1.5;
    font-weight: 560;
  }
  .sentence.small {
    font-size: 1.05rem;
    margin-top: 0.4rem;
  }
  .k-aux {
    color: var(--jade);
    font-weight: 750;
  }
  .k-pp {
    color: var(--accent-ink);
    font-weight: 750;
    box-shadow: inset 0 -2px 0 var(--accent);
  }
  .en {
    margin: 0.25rem 0 0;
    font-size: 0.88rem;
    color: var(--mute);
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
  .qverb {
    font-size: 1.6rem;
    font-weight: 650;
    margin: 0.3rem 0 0.6rem;
  }
  .gloss {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--mute);
  }
  .auxbtns {
    display: flex;
    gap: 0.5rem;
  }
  .auxbtns .btn {
    font-family: var(--font-body);
    font-size: 1.05rem;
    min-width: 6rem;
  }
  .auxbtns .btn.right {
    background: var(--jade-soft);
    border-color: var(--jade);
    opacity: 1;
  }
  .auxbtns .btn.wrong {
    background: var(--bad-soft);
    border-color: var(--bad);
    opacity: 1;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin: 0.7rem 0 0.45rem;
  }
  .pre {
    font-family: var(--font-body);
    font-size: 1.05rem;
    white-space: nowrap;
  }
  .row input {
    flex: 1;
    min-width: 0;
    font-size: 1.1rem;
    padding: 0.5rem 0.75rem;
    border-radius: 10px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
  }
  .row input.right {
    border-color: var(--jade);
    background: var(--jade-soft);
  }
  .row input.almost {
    border-color: var(--gold);
    background: var(--gold-soft);
  }
  .row input.wrong {
    border-color: var(--bad);
    background: var(--bad-soft);
  }
  .fb {
    min-height: 2.5rem;
  }
  .verdict {
    margin: 0.5rem 0 0;
    font-size: 0.9rem;
  }
  .verdict strong {
    color: var(--accent-ink);
  }
  .verdict.ok strong {
    color: var(--jade);
  }
  .verdict .de {
    font-family: var(--font-body);
    font-weight: 650;
    font-size: 1.05rem;
  }
  .score {
    font-size: 1.05rem;
  }
</style>
