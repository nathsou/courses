<script lang="ts">
  /**
   * An analogue clock with step buttons and a digital readout. It reads the time formally
   * (vierzehn Uhr dreißig) and informally (halb drei), with the common alternatives; the
   * listening drill says a time and the learner sets the clock.
   */
  import { onDestroy } from 'svelte';
  import { formalTime, informalTime, dayPart, digital, sameTime, randomTime, hour12 } from '$lib/de/time';
  import { rng } from '$lib/exercises/shuffle';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { settings } from '$lib/state/settings.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Shell from './kit/Shell.svelte';

  let { mode = 'both' }: { mode?: 'informal' | 'formal' | 'both' } = $props();
  const showFormal = $derived(mode !== 'informal');
  const showInformal = $derived(mode !== 'formal');

  let tab = $state(0);
  /** Minutes since midnight, never wrapped, so the hands always turn the short way round. */
  let total = $state(14 * 60 + 30);
  const mins = $derived(((total % 1440) + 1440) % 1440);
  const h = $derived(Math.floor(mins / 60));
  const m = $derived(mins % 60);

  const formal = $derived(formalTime(h, m));
  const informal = $derived(informalTime(h, m));
  const part = $derived(dayPart(h));

  const hint = $derived.by(() => {
    if (m === 30) return `halb looks forward: ${informal.main} is half way to ${hour12(h + 1)}, so ${hour12(h)}:30. Not "half past ${hour12(h + 1)}"!`;
    if (m === 25 || m === 35) return `Counted from halb: five minutes ${m === 25 ? 'before' : 'after'} half past.`;
    if (m === 20 || m === 40) return 'You will hear both; the form with halb is more common in the south and east.';
    if (m === 15 || m === 45) return 'Viertel nach / vor everywhere; viertel / drei viertel (+ next hour) in the south and east and in Austria.';
    if (m === 0) return 'Uhr only with the full hour: drei Uhr, but fünf nach drei.';
    return showInformal && showFormal ? 'Timetables and the radio use the 24-hour form; friends use the 12-hour one.' : '';
  });

  const STEPS: [number, string, string][] = [
    [-60, '−1 h', 'One hour back'],
    [-5, '−5 min', 'Five minutes back'],
    [5, '+5 min', 'Five minutes on'],
    [60, '+1 h', 'One hour on'],
  ];

  // Listening drill
  const ROUNDS = 6;
  let qs = $state<{ h: number; m: number; formal: boolean }[]>([]);
  let qi = $state(0);
  let result = $state<boolean | null>(null);
  let score = $state(0);
  let cancel = () => {};
  onDestroy(() => cancel());
  const q = $derived(qs[qi]);
  const qText = (x: { h: number; m: number; formal: boolean }) => (x.formal ? formalTime(x.h, x.m) : informalTime(x.h, x.m).main);
  const finished = $derived(qs.length > 0 && qi >= qs.length);

  function startDrill() {
    const r = rng(Date.now() % 1e9);
    qs = Array.from({ length: ROUNDS }, (_, i) => {
      let t = randomTime(r);
      while (t.m === 0 && r() < 0.6) t = randomTime(r);
      return { ...t, formal: mode === 'formal' || (mode === 'both' && i % 2 === 1) };
    });
    qi = 0;
    score = 0;
    ask();
  }
  function ask() {
    result = null;
    total = 12 * 60;
    cancel();
    if (qs[qi]) cancel = speech.schedule(qText(qs[qi]!), 300);
  }
  function check() {
    if (!q || result !== null) return;
    result = sameTime(q, h, m, !q.formal);
    if (result) score++;
    else total = q.h * 60 + q.m + Math.round((total - (q.h * 60 + q.m)) / 1440) * 1440;
    sfx(result ? 'right' : 'wrong', settings.data.sounds);
  }
  function next() {
    qi++;
    if (qi >= qs.length) sfx('done', settings.data.sounds);
    else ask();
  }
  $effect(() => {
    if (tab === 1 && !qs.length) startDrill();
  });
  $effect(() => {
    if (tab === 0) total = 14 * 60 + 30;
  });
</script>

{#snippet clock(size: number)}
  <svg class="face" viewBox="0 0 200 200" width={size} height={size} role="img" aria-label="Clock showing {digital(h, m)}">
    <circle cx="100" cy="100" r="94" class="rim" />
    {#each Array.from({ length: 60 }, (_, i) => i) as i (i)}
      <line x1="100" y1={i % 5 ? 12 : 10} x2="100" y2={i % 5 ? 17 : 22} class:big={i % 5 === 0} transform="rotate({i * 6} 100 100)" />
    {/each}
    {#each Array.from({ length: 12 }, (_, i) => i + 1) as k (k)}
      <text x={100 + 69 * Math.sin((k * Math.PI) / 6)} y={100 - 69 * Math.cos((k * Math.PI) / 6)} dy="0.36em">{k}</text>
    {/each}
    <line class="hand hour" x1="100" y1="108" x2="100" y2="54" style="transform: rotate({total * 0.5}deg)" />
    <line class="hand minute" x1="100" y1="112" x2="100" y2="26" style="transform: rotate({total * 6}deg)" />
    <circle cx="100" cy="100" r="4.5" class="pin" />
  </svg>
{/snippet}

{#snippet stepper()}
  <div class="steps ui" role="group" aria-label="Set the clock">
    {#each STEPS as [d, label, aria] (d)}
      <button class="btn small" type="button" aria-label={aria} onclick={() => (total += d)}>{label}</button>
    {/each}
  </div>
{/snippet}

{#snippet readout()}
  <div class="digital ui" aria-live="polite">
    <span class="dg">{digital(h, m)}</span>
    <span class="dp"><Icon name={h >= 6 && h < 20 ? 'sun' : 'moon'} size={15} />{part}</span>
  </div>
{/snippet}

<Shell label="Telling the time" icon="clock" tabs={['Clock', 'Listen']} bind:tab>
  {#if tab === 0}
    <div class="layout">
      <div class="left">
        {@render clock(190)}
        {@render stepper()}
      </div>
      <div class="right">
        {@render readout()}
        {#if showFormal}
          <div class="reading">
            <span class="lbl ui">Formal · 24-hour</span>
            <p class="de" lang="de">{formal}<PlayButton text={formal} small /></p>
          </div>
        {/if}
        {#if showInformal}
          <div class="reading">
            <span class="lbl ui">Everyday · 12-hour</span>
            <p class="de" lang="de">{informal.main} <span class="part">({part})</span><PlayButton text={informal.main} small /></p>
            {#if informal.alt.length}
              <ul class="alt ui">
                {#each informal.alt as a (a.de)}
                  <li>also <span class="de-sm" lang="de">{a.de}</span>{#if a.note}<span class="note"> · {a.note}</span>{/if}<PlayButton text={a.de} small /></li>
                {/each}
              </ul>
            {/if}
          </div>
        {/if}
        {#if hint}<p class="hint ui"><Icon name="lightbulb" size={15} />{hint}</p>{/if}
      </div>
    </div>
  {:else if finished}
    <div class="end" aria-live="polite">
      <p class="score ui"><strong>{score}</strong> / {qs.length}</p>
      <p class="ui msg">{score === qs.length ? 'Perfect timing.' : 'Remember: halb drei is 2:30.'}</p>
      <button class="btn primary" type="button" onclick={startDrill}><Icon name="refresh" size={16} />Again</button>
    </div>
  {:else if q}
    <div class="top ui"><span>Time {qi + 1} of {qs.length}</span><span class="pts">{score} right</span></div>
    <div class="ask ui">
      <PlayButton text={qText(q)} label="Play the time" />
      <PlayButton text={qText(q)} slow />
      <span>Listen, then set the clock{q.formal ? ' (24-hour: watch the day and night sign)' : ''}.</span>
    </div>
    <div class="layout">
      <div class="left">
        {@render clock(170)}
        {@render stepper()}
      </div>
      <div class="right">
        {@render readout()}
        {#if result === null}
          <button class="btn primary" type="button" onclick={check}><Icon name="check" size={16} />Check</button>
        {/if}
        <div class="fb" aria-live="polite">
          {#if result !== null}
            <p class:ok={result}>
              <strong>{result ? 'Richtig!' : 'Nicht ganz.'}</strong>
              {#if !result}The clock now shows the time you heard.{/if}
            </p>
            <p class="de" lang="de">{qText(q)} = {digital(q.formal ? q.h : q.h % 12 || 12, q.m)}<PlayButton text={qText(q)} small /></p>
            <button class="btn small primary" type="button" onclick={next}>{qi + 1 < qs.length ? 'Next' : 'Finish'}<Icon name="arrow" size={15} /></button>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</Shell>

<style>
  .layout {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem 1.6rem;
    align-items: flex-start;
  }
  .left {
    display: grid;
    justify-items: center;
    gap: 0.6rem;
    flex: 0 0 auto;
    max-width: 100%;
  }
  .right {
    flex: 1 1 15rem;
    min-width: 0;
  }
  .face {
    max-width: 100%;
    height: auto;
  }
  .rim {
    fill: var(--panel);
    stroke: var(--line-strong);
    stroke-width: 3;
  }
  .face line {
    stroke: var(--line-strong);
    stroke-width: 1.2;
  }
  .face line.big {
    stroke: var(--mute);
    stroke-width: 2.4;
  }
  .face text {
    font-family: var(--font-ui);
    font-size: 15px;
    font-weight: 600;
    fill: var(--ink-2);
    text-anchor: middle;
  }
  .face .hand {
    stroke-linecap: round;
    transform-origin: 100px 100px;
    transition: transform 280ms cubic-bezier(0.3, 0.7, 0.4, 1);
  }
  .face .hour {
    stroke: var(--fg);
    stroke-width: 7;
  }
  .face .minute {
    stroke: var(--accent);
    stroke-width: 4;
  }
  .pin {
    fill: var(--fg);
  }
  .steps {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    gap: 0.3rem;
  }
  .steps .btn {
    padding-inline: 0.55rem;
    font-variant-numeric: tabular-nums;
  }
  .digital {
    display: flex;
    align-items: baseline;
    gap: 0.7rem;
    margin-bottom: 0.6rem;
  }
  .dg {
    font-size: 2.2rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    line-height: 1.1;
  }
  .dp {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    font-size: 0.85rem;
    color: var(--mute);
  }
  .reading {
    margin-bottom: 0.7rem;
  }
  .lbl {
    display: block;
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--mute);
  }
  .de {
    margin: 0.05rem 0 0;
    font-size: 1.3rem;
    font-weight: 560;
    line-height: 1.35;
  }
  .part {
    font-size: 0.95rem;
    font-weight: 400;
    color: var(--mute);
  }
  .alt {
    list-style: none;
    margin: 0.2rem 0 0;
    padding: 0;
    font-size: 0.85rem;
    color: var(--mute);
  }
  .de-sm {
    font-family: var(--font-body);
    font-size: 1rem;
    color: var(--ink-2);
    font-weight: 560;
  }
  .note {
    font-size: 0.78rem;
  }
  .hint {
    display: flex;
    gap: 0.4rem;
    align-items: flex-start;
    margin: 0.8rem 0 0;
    padding: 0.55rem 0.7rem;
    border-radius: 10px;
    background: var(--gold-soft);
    color: var(--ink-2);
    font-size: 0.85rem;
    line-height: 1.45;
  }
  .hint :global(svg) {
    color: var(--gold);
    margin-top: 0.1rem;
  }
  .top {
    display: flex;
    justify-content: space-between;
    font-size: 0.78rem;
    color: var(--mute);
  }
  .pts {
    color: var(--jade);
    font-weight: 600;
  }
  .ask {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
    margin: 0.5rem 0 0.9rem;
    font-size: 0.92rem;
  }
  .fb p {
    margin: 0 0 0.4rem;
  }
  .fb strong {
    color: var(--accent-ink);
  }
  .fb .ok strong {
    color: var(--jade);
  }
  .fb .de {
    font-size: 1.15rem;
  }
  .end {
    text-align: center;
    padding: 0.6rem 0;
  }
  .score {
    font-size: 1.1rem;
    margin: 0;
  }
  .score strong {
    font-size: 2rem;
    color: var(--jade);
  }
  .msg {
    color: var(--mute);
    font-size: 0.9rem;
    margin: 0.2rem 0 0.8rem;
  }
  @media (prefers-reduced-motion: reduce) {
    .face .hand {
      transition: none;
    }
  }
</style>
