<script lang="ts">
  /**
   * Real vs unreal conditions: one scenario as a real condition, unreal in the present and in the
   * past, as a wish and without wenn, with the verb forms highlighted. Quiz: type the verb form.
   */
  import { K_SCENARIOS, K_EXPLAIN, K_QUIZ, type KForm, type KKind, type KSlot } from './data/konjunktiv-lab';
  import Shell from './kit/Shell.svelte';
  import HiText from './kit/HiText.svelte';
  import Quiz from './kit/Quiz.svelte';
  import Rich from '$lib/components/exercise/Rich.svelte';
  import type { Tone } from './kit/marks';

  type Time = 'real' | 'present' | 'past';
  type Shape = 'cond' | 'alt' | 'wish' | 'inverted';

  const TONE: Record<KKind, Tone> = { ind: 'jade', k2: 'accent', inf: 'gold', doch: 'purple' };
  const TIMES: { id: Time; label: string }[] = [
    { id: 'real', label: 'Real' },
    { id: 'present', label: 'Unreal: now' },
    { id: 'past', label: 'Unreal: past' },
  ];
  const SHAPES: { id: Shape; label: string }[] = [
    { id: 'cond', label: 'wenn …' },
    { id: 'alt', label: 'one-word form' },
    { id: 'wish', label: 'wish' },
    { id: 'inverted', label: 'without wenn' },
  ];

  let tab = $state(0);
  let scenarioId = $state(K_SCENARIOS[0]!.id);
  let time = $state<Time>('present');
  let shape = $state<Shape>('cond');

  const scenario = $derived(K_SCENARIOS.find((s) => s.id === scenarioId)!);

  function slots(t: Time, s: Shape): KSlot[] {
    if (t === 'real') return ['real'];
    const past = t === 'past';
    if (s === 'cond') return [past ? 'past' : 'present'];
    if (s === 'alt') return past ? [] : ['presentAlt'];
    if (s === 'wish') return past ? ['wishPast', 'wishAltPast'] : ['wish', 'wishAlt'];
    return [past ? 'invertedPast' : 'inverted'];
  }
  const shapeOk = (s: Shape) => time !== 'real' && !(s === 'alt' && time === 'past');
  const current = $derived(slots(time, time === 'real' ? 'cond' : shape));
  const forms = $derived(current.map((k) => scenario.forms[k]));
  const explainKey = $derived(time === 'real' ? 'real' : shape === 'cond' ? (time === 'past' ? 'past' : 'present') : shape === 'alt' ? 'presentAlt' : shape);
  const explain = $derived(K_EXPLAIN[explainKey]);
  const isForm = (f: KForm | { none: true; note: string }): f is KForm => !('none' in f);

  function setTime(t: Time) {
    time = t;
    if (t === 'past' && shape === 'alt') shape = 'cond';
  }
</script>

<Shell label="Konjunktiv lab" icon="lightbulb" tabs={['Explore', 'Quiz']} bind:tab>
  {#if tab === 0}
    <div class="scen" role="radiogroup" aria-label="Scenario">
      {#each K_SCENARIOS as s (s.id)}
        <button type="button" role="radio" aria-checked={scenarioId === s.id} class="chip" class:on={scenarioId === s.id} onclick={() => (scenarioId = s.id)}><Rich text={s.title} plain genders="hide" /></button>
      {/each}
    </div>

    <div class="row">
      <div class="seg ui" role="radiogroup" aria-label="Kind of condition">
        {#each TIMES as t (t.id)}
          <button type="button" role="radio" aria-checked={time === t.id} class:on={time === t.id} onclick={() => setTime(t.id)}>{t.label}</button>
        {/each}
      </div>
      <div class="seg ui" role="radiogroup" aria-label="Shape of the sentence">
        {#each SHAPES as s (s.id)}
          <button type="button" role="radio" aria-checked={time !== 'real' && shape === s.id} class:on={time !== 'real' && shape === s.id} disabled={!shapeOk(s.id)} onclick={() => (shape = s.id)}>{s.label}</button>
        {/each}
      </div>
    </div>

    <div class="stage" aria-live="polite">
      <p class="kind ui">{explain.title}</p>
      {#each forms as f, i (i)}
        {#if isForm(f)}
          <p class="sent"><HiText text={f.de} tones={f.kind.map((k) => TONE[k])} size="lg" play /></p>
          {#if i === forms.length - 1}<p class="en ui">{f.en}</p>{/if}
          {#if f.note}<p class="note"><Rich text={f.note} /></p>{/if}
        {:else}
          <p class="none"><Rich text={f.note} /></p>
        {/if}
      {/each}
      <p class="explain"><Rich text={explain.explain} /></p>
      <p class="legend ui" aria-label="Colour key">
        <span class="k t-jade">indicative</span>
        <span class="k t-accent">Konjunktiv II</span>
        <span class="k t-gold">infinitive / participle</span>
        <span class="k t-purple">doch</span>
      </p>
    </div>

    <div class="ladder" aria-label="All three side by side">
      {#each TIMES as t (t.id)}
        {@const f = scenario.forms[t.id === 'real' ? 'real' : t.id === 'present' ? 'present' : 'past']}
        {#if isForm(f)}
          <button type="button" class="rung" class:cur={time === t.id && (t.id === 'real' || shape === 'cond')} onclick={() => {
            setTime(t.id);
            shape = 'cond';
          }}>
            <span class="rl ui">{t.label}</span>
            <span class="rs"><HiText text={f.de} tones={f.kind.map((k) => TONE[k])} plain /></span>
          </button>
        {/if}
      {/each}
    </div>
  {:else}
    <p class="ui intro">Type the missing verb form (the infinitive is in the box).</p>
    <Quiz items={K_QUIZ} seed="konjunktiv-lab" count={8} />
  {/if}
</Shell>

<style>
  .scen {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .chip {
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    border-radius: 999px;
    padding: 0.25rem 0.75rem;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 0.92rem;
    line-height: 1.35;
    text-align: left;
  }
  .chip:hover {
    border-color: var(--mute);
  }
  .chip.on {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0.8rem 0;
  }
  .seg {
    display: inline-flex;
    flex-wrap: wrap;
    border: 1px solid var(--line-strong);
    border-radius: 12px;
    padding: 2px;
    gap: 2px;
  }
  .seg button {
    border: none;
    background: none;
    border-radius: 10px;
    padding: 0.3rem 0.7rem;
    font-weight: 600;
    font-size: 0.82rem;
    cursor: pointer;
    color: var(--ink-2);
  }
  .seg button.on {
    background: var(--fg);
    color: var(--bg);
  }
  .seg button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .stage {
    background: var(--pn);
    border-radius: 12px;
    padding: 0.8rem 1rem;
  }
  .kind {
    margin: 0;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--accent-ink);
  }
  .sent {
    margin: 0.3rem 0 0;
  }
  .en {
    margin: 0.1rem 0 0;
    font-size: 0.88rem;
    color: var(--mute);
  }
  .note,
  .none {
    margin: 0.5rem 0 0;
    font-size: 0.95rem;
  }
  .none {
    padding: 0.5rem 0.7rem;
    border-left: 3px solid var(--gold);
    background: var(--gold-soft);
    border-radius: 0 8px 8px 0;
  }
  .explain {
    margin: 0.7rem 0 0.5rem;
    padding-top: 0.6rem;
    border-top: 1px solid var(--line);
    font-size: 0.95rem;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.8rem;
    margin: 0;
    font-size: 0.74rem;
    color: var(--mute);
  }
  .k::before {
    content: '';
    display: inline-block;
    width: 0.6rem;
    height: 0.6rem;
    border-radius: 3px;
    margin-right: 0.3rem;
    background: var(--c);
  }
  .t-jade {
    --c: var(--jade);
  }
  .t-accent {
    --c: var(--accent);
  }
  .t-gold {
    --c: var(--gold);
  }
  .t-purple {
    --c: var(--g-pl);
  }
  .ladder {
    display: grid;
    gap: 0.3rem;
    margin-top: 0.8rem;
  }
  .rung {
    display: grid;
    grid-template-columns: 6.5rem 1fr;
    gap: 0.6rem;
    align-items: baseline;
    text-align: left;
    padding: 0.35rem 0.6rem;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--panel);
    cursor: pointer;
    font-size: 0.95rem;
  }
  .rung:hover {
    border-color: var(--line-strong);
  }
  .rung.cur {
    border-color: var(--accent);
  }
  .rl {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--mute);
  }
  .rs {
    font-family: var(--font-body);
  }
  .intro {
    margin: 0 0 0.6rem;
    font-size: 0.88rem;
    color: var(--mute);
  }
  @media (max-width: 420px) {
    .rung {
      grid-template-columns: 1fr;
      gap: 0;
    }
  }
</style>
