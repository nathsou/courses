<script lang="ts">
  /**
   * Verbal ↔ nominal style: toggle a sentence between the two and see each change (connector →
   * preposition, verb → noun, subject → possessive or genitive). Funktionsverbgefüge with their
   * plain verbs, and a matching game.
   */
  import { NOM_PAIRS, NOM_EXPLAIN, FVGS, type NomKind } from './data/nominal-style';
  import Shell from './kit/Shell.svelte';
  import HiText from './kit/HiText.svelte';
  import Rich from '$lib/components/exercise/Rich.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { shuffle } from '$lib/exercises/shuffle';
  import type { Tone } from './kit/marks';

  const TONE: Record<NomKind, Tone> = { conn: 'accent', subj: 'purple', obj: 'gold', verb: 'jade' };

  let tab = $state(0);
  let pairId = $state(NOM_PAIRS[0]!.id);
  let nominal = $state(true);
  let focus = $state(-1);

  const pair = $derived(NOM_PAIRS.find((p) => p.id === pairId)!);
  const tones = (m: number[]) => m.map((g) => TONE[pair.kind[g]!]);
  const on = (m: number[]) => (focus < 0 ? undefined : m.map((g, i) => (g === focus ? i : -1)).filter((i) => i >= 0));
  const main = $derived(nominal ? { de: pair.nominal, m: pair.nm } : { de: pair.verbal, m: pair.vm });
  const other = $derived(nominal ? { de: pair.verbal, m: pair.vm } : { de: pair.nominal, m: pair.nm });

  // Matching game
  let round = $state(0);
  const N = 6;
  const pool = $derived(shuffle(FVGS, `fvg:${round}`).slice(0, N));
  const right = $derived(shuffle(pool, `fvg-r:${round}`));
  let pickL = $state<string | null>(null);
  let pickR = $state<string | null>(null);
  let matched = $state<string[]>([]);
  let wrongPair = $state<[string, string] | null>(null);
  let msg = $state('Tap an expression, then the verb that means the same.');

  function tryMatch() {
    if (!pickL || !pickR) return;
    if (pickL === pickR) {
      matched = [...matched, pickL];
      const f = FVGS.find((x) => x.id === pickL)!;
      msg = `Right: ${f.fvg} = ${f.verb}.`;
      void speech.say(f.ex);
      if (matched.length === N) {
        sfx('done', settings.data.sounds);
        msg = 'All matched. Well done!';
      } else sfx('right', settings.data.sounds);
    } else {
      wrongPair = [pickL, pickR];
      msg = 'Not those two. Try again.';
      sfx('wrong', settings.data.sounds);
      setTimeout(() => (wrongPair = null), 450);
    }
    pickL = pickR = null;
  }
  function again() {
    round++;
    matched = [];
    pickL = pickR = null;
    msg = 'Tap an expression, then the verb that means the same.';
  }
</script>

<Shell label="Nominal style" icon="exam" tabs={['Verbal ↔ nominal', 'Funktionsverben', 'Match']} bind:tab>
  {#if tab === 0}
    <div class="pairs" role="radiogroup" aria-label="Sentence">
      {#each NOM_PAIRS as p (p.id)}
        <button type="button" role="radio" aria-checked={pairId === p.id} class="chip" class:on={pairId === p.id} onclick={() => {
          pairId = p.id;
          focus = -1;
        }}><Rich text={p.steps[0]!.label} plain genders="hide" /></button>
      {/each}
    </div>

    <div class="seg ui" role="radiogroup" aria-label="Style">
      <button type="button" role="radio" aria-checked={!nominal} class:on={!nominal} onclick={() => (nominal = false)}>Verbal (spoken)</button>
      <button type="button" role="radio" aria-checked={nominal} class:on={nominal} onclick={() => (nominal = true)}>Nominal (written)</button>
    </div>

    <div class="stage" aria-live="polite">
      <p class="tag ui">{nominal ? 'Nominal style' : 'Verbal style'}</p>
      <p class="s">{#key main.de}<HiText text={main.de} tones={tones(main.m)} on={on(main.m)} size="lg" play />{/key}</p>
      <p class="tag ui other">{nominal ? 'Verbal style' : 'Nominal style'}</p>
      <p class="s small"><HiText text={other.de} tones={tones(other.m)} on={on(other.m)} play /></p>
      <p class="en ui">{pair.en}</p>
    </div>

    <ul class="changes">
      {#each pair.steps as s, g (g)}
        <li>
          <button type="button" class="change t-{TONE[pair.kind[g]!]}" class:on={focus === g} aria-pressed={focus === g} onclick={() => (focus = focus === g ? -1 : g)}>
            <span class="badge ui">{NOM_EXPLAIN[pair.kind[g]!].label}</span>
            <span class="lab"><Rich text={s.label} plain /></span>
            <span class="note"><Rich text={s.explain} plain /></span>
          </button>
        </li>
      {/each}
    </ul>
    <p class="rule ui">Nominal style packs a whole clause into a noun phrase: shorter, more formal, typical of reports, the news and official letters. Speech prefers the verbal style.</p>
  {:else if tab === 1}
    <p class="ui intro">A <strong>Funktionsverbgefüge</strong> is a noun + a verb that has lost most of its meaning (<em lang="de">treffen, stellen, bringen, kommen</em>). The noun carries the meaning; the whole thing usually has a simple verb as its twin. Formal writing loves them.</p>
    <ul class="fvgs">
      {#each FVGS as f (f.id)}
        <li>
          <p class="pair"><strong lang="de">{f.fvg}</strong> <span class="eq">≈</span> <span lang="de" class="verb">{f.verb}</span> <span class="en ui">{f.en}</span></p>
          <p class="ex"><HiText text={f.ex} play /></p>
          <p class="ex muted"><HiText text={f.exVerb} play /></p>
          {#if f.note}<p class="fnote ui"><Rich text={f.note} /></p>{/if}
        </li>
      {/each}
    </ul>
  {:else}
    <p class="ui intro" aria-live="polite">{msg}</p>
    <div class="match">
      <div class="col" role="group" aria-label="Expressions">
        {#each pool as f (f.id)}
          <button type="button" class="m" lang="de" class:sel={pickL === f.id} class:done={matched.includes(f.id)} class:bad={wrongPair?.[0] === f.id} disabled={matched.includes(f.id)} aria-pressed={pickL === f.id} onclick={() => {
            pickL = f.id;
            tryMatch();
          }}>{f.fvg}</button>
        {/each}
      </div>
      <div class="col" role="group" aria-label="Verbs">
        {#each right as f (f.id)}
          <button type="button" class="m" lang="de" class:sel={pickR === f.id} class:done={matched.includes(f.id)} class:bad={wrongPair?.[1] === f.id} disabled={matched.includes(f.id)} aria-pressed={pickR === f.id} onclick={() => {
            pickR = f.id;
            tryMatch();
          }}>{f.verb}</button>
        {/each}
      </div>
    </div>
    <p class="score ui"><span>{matched.length} / {N}</span>{#if matched.length === N}<button type="button" class="btn small primary" onclick={again}><Icon name="refresh" size={15} />New round</button>{/if}</p>
  {/if}
</Shell>

<style>
  .pairs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .chip {
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    border-radius: 999px;
    padding: 0.2rem 0.7rem;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 0.92rem;
  }
  .chip:hover {
    border-color: var(--mute);
  }
  .chip.on {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .seg {
    display: inline-flex;
    flex-wrap: wrap;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    padding: 2px;
    margin: 0.8rem 0;
  }
  .seg button {
    border: none;
    background: none;
    border-radius: 999px;
    padding: 0.28rem 0.8rem;
    font-weight: 600;
    font-size: 0.82rem;
    cursor: pointer;
    color: var(--ink-2);
  }
  .seg button.on {
    background: var(--fg);
    color: var(--bg);
  }
  .stage {
    background: var(--pn);
    border-radius: 12px;
    padding: 0.8rem 1rem;
  }
  .tag {
    margin: 0;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--accent-ink);
  }
  .tag.other {
    color: var(--mute);
    margin-top: 0.6rem;
  }
  .s {
    margin: 0.1rem 0 0;
  }
  .s.small {
    opacity: 0.85;
  }
  .en {
    margin: 0.4rem 0 0;
    font-size: 0.85rem;
    color: var(--mute);
  }
  .changes {
    list-style: none;
    padding: 0;
    margin: 0.8rem 0 0;
    display: grid;
    gap: 0.35rem;
  }
  .change {
    width: 100%;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.1rem 0.6rem;
    align-items: baseline;
    text-align: left;
    padding: 0.45rem 0.7rem;
    border: 1px solid var(--line);
    border-left: 4px solid var(--c);
    border-radius: 10px;
    background: var(--panel);
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 0.95rem;
    line-height: 1.5;
  }
  .change.on {
    background: color-mix(in srgb, var(--c) 9%, var(--panel));
    border-color: var(--c);
  }
  .badge {
    font-size: 0.66rem;
    font-weight: 700;
    color: var(--c);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }
  .lab {
    font-weight: 600;
  }
  .note {
    grid-column: 1 / -1;
    color: var(--ink-2);
    font-size: 0.92rem;
  }
  .t-accent {
    --c: var(--accent);
  }
  .t-jade {
    --c: var(--jade);
  }
  .t-gold {
    --c: var(--gold);
  }
  .t-purple {
    --c: var(--g-pl);
  }
  .rule {
    margin: 0.7rem 0 0;
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .intro {
    margin: 0 0 0.7rem;
    font-size: 0.88rem;
    color: var(--ink-2);
  }
  .fvgs {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.5rem;
  }
  .fvgs li {
    padding: 0.55rem 0.8rem;
    border: 1px solid var(--line);
    border-radius: 10px;
  }
  .pair {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.2rem 0.45rem;
  }
  .pair strong {
    color: var(--accent-ink);
  }
  .eq {
    color: var(--mute);
  }
  .verb {
    font-weight: 600;
    color: var(--jade);
  }
  .pair .en {
    margin: 0;
  }
  .ex {
    margin: 0.15rem 0 0;
    font-size: 0.95rem;
  }
  .ex.muted {
    color: var(--ink-2);
  }
  .fnote {
    margin: 0.2rem 0 0;
    font-size: 0.8rem;
    color: var(--mute);
  }
  .match {
    display: grid;
    grid-template-columns: 1.4fr 1fr;
    gap: 0.5rem;
  }
  .col {
    display: grid;
    gap: 0.35rem;
    align-content: start;
  }
  .m {
    text-align: left;
    padding: 0.45rem 0.65rem;
    border: 1.5px solid var(--line-strong);
    border-radius: 10px;
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 0.95rem;
    line-height: 1.3;
    min-height: 2.6rem;
    transition: border-color 120ms, background-color 120ms;
  }
  .m:hover:not(:disabled) {
    border-color: var(--accent);
  }
  .m.sel {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .m.done {
    border-color: var(--jade);
    background: var(--jade-soft);
    cursor: default;
  }
  .m.bad {
    border-color: var(--bad);
    background: var(--bad-soft);
    animation: shake 300ms;
  }
  @keyframes shake {
    25% {
      transform: translateX(-4px);
    }
    75% {
      transform: translateX(4px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .m.bad {
      animation: none;
    }
  }
  .score {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0.7rem 0 0;
    font-size: 0.85rem;
    color: var(--mute);
  }
</style>
