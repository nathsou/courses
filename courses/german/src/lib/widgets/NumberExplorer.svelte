<script lang="ts">
  /**
   * Type or step through numbers and watch the German word assemble from coloured parts
   * (vier·und·zwanzig: units before tens); then a listening drill: hear a number, type the digits.
   */
  import { onDestroy } from 'svelte';
  import { numberWord, numberWords, formatNumber, parseDigits, drillNumber, type NumberPart } from '$lib/de/numbers';
  import { rng } from '$lib/exercises/shuffle';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { settings } from '$lib/state/settings.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Shell from './kit/Shell.svelte';

  let { max: maxProp = 100 }: { max?: number | string } = $props();
  const max = $derived(Math.min(1_000_000, Math.max(20, Number(maxProp) || 100)));

  let tab = $state(0);
  let n = $state(24);
  let typed = $state('24');

  function set(v: number) {
    n = Math.max(0, Math.min(max, Math.round(v)));
    typed = formatNumber(n);
  }
  function onType(v: string) {
    typed = v;
    const p = parseDigits(v);
    if (!Number.isNaN(p)) n = Math.min(max, p);
  }
  const steps = $derived(max >= 1_000_000 ? [1, 10, 1000] : max >= 1000 ? [1, 10, 100] : [1, 10]);
  const random = () => {
    const r = rng((Date.now() ^ (n * 7919)) % 1e9);
    set(drillNumber(max, r));
    void speech.say(numberWord(n));
  };

  const word = $derived(numberWord(n));
  const words = $derived(numberWords(n));

  /** A short explanation of what is special about this number. */
  const notes = $derived.by(() => {
    const out: string[] = [];
    const parts = words.flat();
    const texts = parts.map((p) => p.text);
    if (texts.includes('und')) out.push('Units before tens, joined by und: 24 is "four-and-twenty", vier·und·zwanzig.');
    if (texts.includes('sechzehn') || texts.includes('siebzehn') || texts.includes('sechzig') || texts.includes('siebzig')) out.push('sechs and sieben lose a letter or two: sechzehn, sechzig, siebzehn, siebzig.');
    if (texts.includes('dreißig')) out.push('dreißig is the one ten spelt with ß, not -zig.');
    if (texts.includes('ein') && n !== 1) out.push('eins loses its s inside a number: einundzwanzig, einhundert. At the very end it stays eins: hunderteins.');
    else if (texts[texts.length - 1] === 'eins' && n > 100) out.push('A number ending in 1 ends in eins: hunderteins, tausendeins.');
    if (n >= 100 && n < 200 && n < 1_000_000) out.push('The ein of einhundert is optional: hundert is just as correct.');
    if (n >= 1000 && n < 1_000_000) out.push('Below a million the whole number is one word, however long.');
    if (n >= 1_000_000) out.push('Million is a noun: written apart, with a capital, and with a plural (zwei Millionen).');
    if (n >= 1000) out.push('Digits are grouped with a point: 1.000 (and a comma is the decimal point: 3,50 €).');
    if (n === 0) out.push('null, as in "null Uhr" (midnight) and the null of phone numbers.');
    if (n === 2) out.push('On the phone you will often hear zwo, so that zwei is not confused with drei.');
    return out.slice(0, 2);
  });

  const KIND_LABEL: Record<NumberPart['kind'], string> = { digit: '', ten: '', und: '+', hundred: '×100', thousand: '×1000', million: '×1 000 000' };
  const annot = (p: NumberPart) => (p.kind === 'digit' || p.kind === 'ten' ? String(p.value) : KIND_LABEL[p.kind]);

  // Listening drill
  const ROUNDS = 8;
  let qs = $state<number[]>([]);
  let qi = $state(0);
  let answer = $state('');
  let result = $state<boolean | null>(null);
  let score = $state(0);
  let input: HTMLInputElement | undefined = $state();
  let nextBtn: HTMLButtonElement | undefined = $state();
  let cancel = () => {};
  onDestroy(() => cancel());
  const q = $derived(qs[qi]);
  const finished = $derived(qs.length > 0 && qi >= qs.length);

  function startDrill() {
    const r = rng(Date.now() % 1e9);
    const seen = new Set<number>();
    const out: number[] = [];
    while (out.length < ROUNDS) {
      const x = drillNumber(max, r);
      if (!seen.has(x)) (seen.add(x), out.push(x));
    }
    qs = out;
    qi = 0;
    score = 0;
    ask();
  }
  function ask() {
    answer = '';
    result = null;
    cancel();
    if (qs[qi] !== undefined) cancel = speech.schedule(numberWord(qs[qi]!), 300);
    queueMicrotask(() => input?.focus());
  }
  function check(e: Event) {
    e.preventDefault();
    if (q === undefined || result !== null || !answer.trim()) return;
    result = parseDigits(answer) === q;
    if (result) score++;
    sfx(result ? 'right' : 'wrong', settings.data.sounds);
    queueMicrotask(() => nextBtn?.focus());
  }
  function next() {
    qi++;
    if (qi >= qs.length) sfx('done', settings.data.sounds);
    else ask();
  }
  $effect(() => {
    if (tab === 1 && !qs.length) startDrill();
  });
</script>

{#snippet parts(num: number, big: boolean)}
  <span class="word" class:big lang="de">
    {#each numberWords(num) as w, wi (wi)}{#if wi > 0}<span class="space"> </span>{/if}<span class="w">
        {#each w as p, pi (pi)}{#if pi > 0}<span class="dot" aria-hidden="true">·</span>{/if}<span class="part k-{p.kind}"
            ><span class="t">{p.text}</span>{#if big}<span class="v ui" aria-hidden="true">{annot(p)}</span>{/if}</span
          >{/each}</span
      >{/each}
  </span>
{/snippet}

<Shell label="Numbers" icon="keyboard" title={`0 to ${formatNumber(max)}`} tabs={['Explore', 'Listen']} bind:tab>
  {#if tab === 0}
    <div class="controls ui">
      {#each [...steps].reverse() as s (s)}
        <button class="btn small step" type="button" aria-label="Minus {s}" disabled={n - s < 0} onclick={() => set(n - s)}>−{formatNumber(s)}</button>
      {/each}
      <input
        class="num"
        inputmode="numeric"
        aria-label="Number"
        value={typed}
        oninput={(e) => onType(e.currentTarget.value)}
        onblur={() => (typed = formatNumber(n))}
        onkeydown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
            e.preventDefault();
            set(n + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1));
          } else if (e.key === 'Enter') void speech.say(word);
        }}
      />
      {#each steps as s (s)}
        <button class="btn small step" type="button" aria-label="Plus {s}" disabled={n + s > max} onclick={() => set(n + s)}>+{formatNumber(s)}</button>
      {/each}
      <button class="btn small ghost" type="button" onclick={random} title="A random number"><Icon name="shuffle" size={15} />Random</button>
    </div>

    <div class="stage" aria-live="polite">
      <div class="digits ui">{formatNumber(n)}</div>
      <div class="say">
        {@render parts(n, true)}
        <span class="play"><PlayButton text={word} /><PlayButton text={word} slow /></span>
      </div>
    </div>
    <ul class="notes ui">
      {#each notes as note (note)}<li>{note}</li>{/each}
    </ul>
    <p class="legend ui" aria-hidden="true">
      <span class="k-digit">units and teens</span> · <span class="k-ten">tens</span> · <span class="k-und">und</span> · <span class="k-hundred">hundert, tausend, Million</span>
    </p>
  {:else if finished}
    <div class="end" aria-live="polite">
      <p class="score ui"><strong>{score}</strong> / {qs.length}</p>
      <p class="ui msg">{score === qs.length ? 'Perfect: your ears have got the units-first habit.' : 'Listen for the unit first, then the ten.'}</p>
      <button class="btn primary" type="button" onclick={startDrill}><Icon name="refresh" size={16} />Again</button>
    </div>
  {:else if q !== undefined}
    <div class="top ui"><span>Number {qi + 1} of {qs.length}</span><span class="pts">{score} right</span></div>
    <p class="ui instr">Listen, then type the number in digits.</p>
    <div class="listen">
      <PlayButton text={numberWord(q)} label="Play the number" />
      <PlayButton text={numberWord(q)} slow />
    </div>
    <form class="row ui" onsubmit={check}>
      <input bind:this={input} bind:value={answer} inputmode="numeric" autocomplete="off" aria-label="The number in digits" placeholder="e.g. 42" readonly={result !== null} class:ok={result === true} class:bad={result === false} />
      {#if result === null}<button class="btn" disabled={!answer.trim()}>Check</button>{/if}
    </form>
    <div class="fb" aria-live="polite">
      {#if result !== null}
        <p class:ok={result}>
          <strong>{result ? 'Richtig!' : 'Nicht ganz.'}</strong>
          {#if !result}It was <b class="ui">{formatNumber(q)}</b>.{/if}
        </p>
        <p class="said">{@render parts(q, false)}</p>
        <button bind:this={nextBtn} class="btn small primary" type="button" onclick={next}>{qi + 1 < qs.length ? 'Next' : 'Finish'}<Icon name="arrow" size={15} /></button>
      {/if}
    </div>
  {/if}
</Shell>

<style>
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem;
  }
  .step {
    min-width: 2.6rem;
    font-variant-numeric: tabular-nums;
  }
  .num {
    width: 7.5rem;
    min-width: 0;
    flex: 0 1 7.5rem;
    font-size: 1.15rem;
    font-weight: 650;
    text-align: center;
    padding: 0.35rem 0.5rem;
    border-radius: 10px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    font-variant-numeric: tabular-nums;
  }
  .stage {
    margin: 1rem 0 0.4rem;
    padding: 0.9rem 1rem;
    border-radius: 12px;
    background: var(--pn);
  }
  .digits {
    font-size: 2.4rem;
    font-weight: 700;
    line-height: 1.1;
    letter-spacing: 0.01em;
    font-variant-numeric: tabular-nums;
  }
  .say {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 0.3rem 0.6rem;
    margin-top: 0.4rem;
  }
  .play {
    display: inline-flex;
    gap: 0.2rem;
    padding-bottom: 0.3rem;
  }
  .word {
    font-weight: 560;
    overflow-wrap: anywhere;
    min-width: 0;
  }
  .word.big {
    font-size: 1.5rem;
    line-height: 1.3;
  }
  .w {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: flex-start;
    max-width: 100%;
  }
  .space {
    display: inline-block;
    width: 0.4em;
  }
  .part {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
  }
  .v {
    font-size: 0.68rem;
    font-weight: 600;
    color: var(--mute);
    line-height: 1.2;
  }
  .dot {
    color: var(--line-strong);
    padding: 0 0.04em;
  }
  .k-digit {
    color: var(--accent-ink);
  }
  .k-ten {
    color: var(--jade);
  }
  .k-und {
    color: var(--mute);
  }
  .k-hundred,
  .k-thousand,
  .k-million {
    color: var(--gold);
  }
  .notes {
    margin: 0.6rem 0 0;
    padding-left: 1.1rem;
    font-size: 0.88rem;
    color: var(--ink-2);
    min-height: 2.6rem;
  }
  .notes li + li {
    margin-top: 0.15rem;
  }
  .legend {
    margin: 0.5rem 0 0;
    font-size: 0.75rem;
    color: var(--mute);
  }
  .legend span {
    font-weight: 600;
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
  .instr {
    margin: 0.4rem 0 0.5rem;
    font-size: 0.92rem;
  }
  .listen {
    display: flex;
    gap: 0.3rem;
    margin-bottom: 0.6rem;
  }
  .row {
    display: flex;
    gap: 0.5rem;
  }
  .row input {
    flex: 1;
    min-width: 0;
    max-width: 16rem;
    font-size: 1.15rem;
    padding: 0.45rem 0.75rem;
    border-radius: 10px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    font-variant-numeric: tabular-nums;
  }
  .row input.ok {
    border-color: var(--jade);
    background: var(--jade-soft);
  }
  .row input.bad {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .fb {
    margin-top: 0.6rem;
    min-height: 2rem;
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
  .said {
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
</style>
