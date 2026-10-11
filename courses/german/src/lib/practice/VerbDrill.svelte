<script lang="ts">
  /**
   * Verb forms on demand: a verb, a person and a tense; type the form. Tenses follow the level:
   * present and perfect from A1, the simple past from A2 (modals) and B1 (all verbs),
   * Konjunktiv II from B1, Konjunktiv I at B2.
   */
  import { taught, type Level } from '$lib/de/lexicon';
  import { conjugate, verbTable, PERSONS, TENSE_NAMES, type Tense } from '$lib/de/verbs';
  import { mark, type Marked } from '$lib/de/check';
  import { settings } from '$lib/state/settings.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { pickOne, upTo } from './pick';
  import { defaultLevel } from './level';
  import LevelPicker from './LevelPicker.svelte';
  import UmlautKeys from '$lib/components/de/UmlautKeys.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  const ROUNDS = 10;
  const MODALS = new Set(['können', 'müssen', 'wollen', 'dürfen', 'sollen', 'mögen', 'sein', 'haben', 'werden']);
  let level = $state<Level>(defaultLevel(settings.data.start));
  const verbs = $derived(upTo(level).flatMap((l) => taught(l)).filter(([k, e]) => e.p === 'v' && verbTable(k)).map(([k]) => k));
  const tenses = $derived.by((): Tense[] => {
    const t: Tense[] = ['present', 'perfect'];
    if (level !== 'A1') t.push('preterite');
    if (level === 'B1' || level === 'B2') t.push('konj2');
    if (level === 'B2') t.push('konj1');
    return t;
  });
  type Q = { verb: string; tense: Tense; person: number; answer: string };
  let q = $state<Q | null>(null);
  let round = $state(0);
  let score = $state(0);
  let value = $state('');
  let result = $state<Marked | null>(null);
  let input: HTMLInputElement | undefined = $state();
  let over = $state(false);

  function make(): Q {
    for (;;) {
      const tense = pickOne(tenses);
      const pool = tense === 'preterite' && level === 'A2' ? verbs.filter((v) => MODALS.has(v)) : verbs;
      const verb = pickOne(pool.length ? pool : verbs);
      const person = tense === 'konj1' ? pickOne([2, 5]) : Math.floor(Math.random() * 6);
      const answer = conjugate(verb, tense, person);
      if (answer && answer !== '?') return { verb, tense, person, answer };
    }
  }
  function start() {
    round = 1;
    score = 0;
    over = false;
    q = make();
    value = '';
    result = null;
    setTimeout(() => input?.focus(), 30);
  }
  function check(e: Event) {
    e.preventDefault();
    if (!q || result || !value.trim()) return;
    const typed = value.replace(new RegExp(`^${PERSONS[q.person]!.split('/')[0]}\\s+`, 'i'), '');
    result = mark(typed, q.answer, { lenient: settings.data.lenientSpelling });
    const ok = result.verdict !== 'wrong';
    if (ok) score++;
    sfx(ok ? 'right' : 'wrong', settings.data.sounds);
    void speech.say(`${PERSONS[q.person]!.split('/')[0]} ${q.answer}`);
  }
  function next() {
    if (round >= ROUNDS) {
      over = true;
      progress.setBest(`verbs-${level}`, score);
      sfx('done', settings.data.sounds);
      return;
    }
    round++;
    q = make();
    value = '';
    result = null;
    setTimeout(() => input?.focus(), 30);
  }
</script>

<div class="game card">
  <div class="bar ui">
    <LevelPicker bind:value={level} label="Verbs up to" />
    {#if q && !over}<span class="score">{round}/{ROUNDS} · {score} right</span>{/if}
  </div>
  {#if !q}
    <p class="ui intro">{verbs.length} verbs; tenses: {tenses.map((t) => TENSE_NAMES[t]).join(', ')}. Type just the verb form (and the reflexive pronoun, for reflexive verbs).</p>
    <button class="btn primary" onclick={start} disabled={!verbs.length}><Icon name="play" size={15} />Start</button>
  {:else if over}
    <p class="result"><strong>{score}</strong> / {ROUNDS}</p>
    <button class="btn primary" onclick={start}><Icon name="refresh" size={15} />Again</button>
  {:else}
    <p class="prompt"><span class="tense ui">{TENSE_NAMES[q.tense]}</span><span lang="de"><b>{q.verb}</b> · {PERSONS[q.person]}</span></p>
    <form class="row" onsubmit={(e) => (result ? (e.preventDefault(), next()) : check(e))}>
      <span class="pr" lang="de">{PERSONS[q.person]!.split('/')[0]}</span>
      <input bind:this={input} bind:value lang="de" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Verb form" readonly={!!result} class:right={result?.verdict === 'right'} class:almost={result?.verdict === 'almost'} class:wrong={result?.verdict === 'wrong'} />
      <button class="btn">{result ? 'Next' : 'Check'}</button>
    </form>
    {#if !result}<UmlautKeys target={input} oninput={(v) => (value = v)} />{/if}
    <p class="fb ui" aria-live="polite">
      {#if result?.verdict === 'right'}<span class="ok">Richtig!</span>{:else if result?.verdict === 'almost'}<span class="almost">Fast: {result.note} <b lang="de">{q.answer}</b></span>{:else if result}<span class="bad">It's <b lang="de">{PERSONS[q.person]!.split('/')[0]} {q.answer}</b>.</span>{/if}
    </p>
  {/if}
</div>

<style>
  .game {
    padding: 1rem 1.2rem 1.2rem;
    margin: 1rem 0;
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.6rem;
  }
  .score {
    font-weight: 700;
    color: var(--accent-ink);
  }
  .intro {
    color: var(--ink-2);
    font-size: 0.9rem;
  }
  .prompt {
    display: grid;
    gap: 0.2rem;
    font-size: 1.4rem;
    margin: 0.4rem 0 0.6rem;
  }
  .tense {
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--accent-ink);
  }
  .row {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-bottom: 0.4rem;
  }
  .pr {
    color: var(--mute);
    font-size: 1.1rem;
  }
  input {
    flex: 1;
    min-width: 0;
    font-size: 1.15rem;
    padding: 0.5rem 0.7rem;
    border-radius: 10px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
  }
  input.right { border-color: var(--jade); background: var(--jade-soft); }
  input.almost { border-color: var(--gold); background: var(--gold-soft); }
  input.wrong { border-color: var(--bad); background: var(--bad-soft); }
  .fb {
    min-height: 1.5rem;
    margin: 0.4rem 0 0;
  }
  .ok { color: var(--jade); font-weight: 650; }
  .almost { color: var(--gold); }
  .bad { color: var(--bad); }
  .result strong {
    font-size: 2rem;
    color: var(--accent-ink);
  }
</style>
