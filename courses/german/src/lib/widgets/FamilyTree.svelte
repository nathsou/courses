<script lang="ts">
  /**
   * Lena's family over three generations. Explore: tap anyone to hear who they are to Lena (or to
   * whoever you choose): "Das ist Emre, Lenas Onkel." Quiz: "Wer ist Jonas' Tante?" Tap the person.
   */
  import { onDestroy } from 'svelte';
  import { FAMILY, type Person } from './data/family';
  import { Family, familyRound, genitive, type FamilyQuestion } from '$lib/de/family';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { settings } from '$lib/state/settings.svelte';
  import De from '$lib/components/de/De.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import Shell from './kit/Shell.svelte';

  const fam = new Family(FAMILY);
  const ROW = 5.4; // rem from one generation to the next
  const NODE = 3.6; // rem: node height
  const HEIGHT = 2 * ROW + NODE;

  let tab = $state(0);
  let focus = $state('lena');
  let sel = $state<string | null>(null);
  const focusP = $derived(fam.get(focus));
  const intro = $derived(sel ? fam.introduce(focus, sel) : null);
  const hyph = (w: string) => w.replace(/^(Groß|Schwieger)/, '$1­');

  function tapExplore(p: Person) {
    sel = p.id;
    void speech.say(fam.introduce(focus, p.id).de);
  }

  // Connector lines, in a 100 × HEIGHT*10 box (x in per cent, y in tenths of a rem).
  const y = (rem: number) => rem * 10;
  const lines = (() => {
    const out: { x1: number; y1: number; x2: number; y2: number }[] = [];
    for (const p of FAMILY) {
      if (!p.spouse) continue;
      const s = fam.get(p.spouse);
      if (s.x < p.x) continue;
      const cy = y(p.row * ROW + NODE / 2);
      out.push({ x1: p.x, y1: cy, x2: s.x, y2: cy });
      const kids = fam.children(p.id).map((id) => fam.get(id));
      if (!kids.length) continue;
      const mx = (p.x + s.x) / 2;
      const by = y(p.row * ROW + NODE + (ROW - NODE) / 2);
      out.push({ x1: mx, y1: cy, x2: mx, y2: by });
      const xs = [mx, ...kids.map((k) => k.x)];
      out.push({ x1: Math.min(...xs), y1: by, x2: Math.max(...xs), y2: by });
      for (const k of kids) out.push({ x1: k.x, y1: by, x2: k.x, y2: y(k.row * ROW) });
    }
    return out;
  })();

  // Quiz
  const ROUNDS = 8;
  let qs = $state<FamilyQuestion[]>([]);
  let qi = $state(0);
  let solved = $state(false);
  let missed = $state(false);
  let score = $state(0);
  let wrong = $state<string | null>(null);
  let feedback = $state<{ de: string; ok: boolean } | null>(null);
  let nextBtn: HTMLButtonElement | undefined = $state();
  let cancel = () => {};
  onDestroy(() => cancel());
  const q = $derived(qs[qi]);
  const finished = $derived(qs.length > 0 && qi >= qs.length);

  function startQuiz() {
    qs = familyRound(fam, ROUNDS, Date.now() % 1e9);
    qi = 0;
    score = 0;
    ask();
  }
  function ask() {
    solved = false;
    missed = false;
    feedback = null;
    wrong = null;
    cancel();
    if (qs[qi]) cancel = speech.schedule(qs[qi]!.de, 300);
  }
  function tapQuiz(p: Person) {
    if (!q || solved) return;
    const me = fam.get(q.me);
    const w = fam.word(q.me, p.id);
    if (q.answers.includes(p.id)) {
      solved = true;
      if (!missed) score++;
      const others = q.answers.filter((a) => a !== p.id).map((a) => fam.get(a).name);
      const de = `${p.name} ist ${genitive(me.name)} ${w!.de}.` + (others.length ? ` ${others.join(' und ')} auch.` : '');
      feedback = { de, ok: true };
      sel = p.id;
      sfx('right', settings.data.sounds);
      void speech.say(de);
      queueMicrotask(() => nextBtn?.focus());
    } else {
      missed = true;
      wrong = p.id;
      const de = p.id === me.id ? `Das ist ${me.name} selbst.` : w ? `${p.name} ist ${genitive(me.name)} ${w.de}.` : `${p.name} ist nicht mit ${me.name} verwandt.`;
      feedback = { de, ok: false };
      sfx('wrong', settings.data.sounds);
      setTimeout(() => (wrong = null), 450);
    }
  }
  function next() {
    qi++;
    sel = null;
    if (qi >= qs.length) sfx('done', settings.data.sounds);
    else ask();
  }
  $effect(() => {
    void tab;
    sel = null;
  });
  $effect(() => {
    if (tab === 1 && !qs.length) startQuiz();
  });
</script>

<Shell label="Die Familie" icon="sparkle" tabs={['Explore', 'Wer ist das?']} bind:tab>
  {#if tab === 0}
    <div class="bar ui">
      <label>Seen from <select bind:value={focus} onchange={() => (sel = null)}>
          {#each FAMILY as p (p.id)}<option value={p.id}>{p.name}</option>{/each}
        </select></label>
      <span class="hint">Tap anyone to hear who they are to {focusP.name}.</span>
    </div>
  {:else if q}
    <div class="top ui"><span>Question {qi + 1} of {qs.length}</span><span class="pts">{score} right</span></div>
    <p class="question"><De text={q.de} size="md" play={false} /><PlayButton text={q.de} small /></p>
  {/if}

  {#if tab === 1 && finished}
    <div class="done" aria-live="polite">
      <p class="score ui"><strong>{score}</strong> / {qs.length}</p>
      <p class="ui msg">{score === qs.length ? 'Perfekt! You know this family better than they do.' : 'Tip: find the person in the question first, then go up, across or down.'}</p>
      <button class="btn primary" type="button" onclick={startQuiz}><Icon name="refresh" size={16} />Again</button>
    </div>
  {:else}
    <div class="tree" style="height: {HEIGHT}rem" role="group" aria-label="Family tree">
      <svg class="lines" viewBox="0 0 100 {y(HEIGHT)}" preserveAspectRatio="none" aria-hidden="true">
        {#each lines as l, i (i)}<line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} vector-effect="non-scaling-stroke" />{/each}
      </svg>
      {#each FAMILY as p (p.id)}
        {@const w = tab === 0 ? fam.word(focus, p.id) : null}
        {@const isFocus = tab === 0 ? p.id === focus : p.id === q?.me}
        <button
          type="button"
          class="person {p.sex}"
          class:focus={isFocus}
          class:sel={sel === p.id && !isFocus}
          class:wrong={wrong === p.id}
          style="left: {p.x}%; top: {p.row * ROW}rem; height: {NODE}rem"
          aria-label={tab === 0 ? `${p.name}${w ? `, ${genitive(focusP.name)} ${w.de}` : ''}` : p.name}
          onclick={() => (tab === 0 ? tapExplore(p) : tapQuiz(p))}
        >
          <span class="nm ui">{p.name}</span>
          {#if tab === 0}
            <span class="rel" lang="de">{isFocus ? 'ich' : w ? hyph(w.de) : '–'}</span>
          {/if}
        </button>
      {/each}
    </div>

    <div class="cap" aria-live="polite">
      {#if tab === 0}
        {#if intro && sel}
          <p class="say"><De text={intro.de} play={false} /><PlayButton text={intro.de} small /></p>
          <p class="en ui">{intro.en}</p>
          {#if sel !== focus}
            <button class="btn small ghost" type="button" onclick={() => ((focus = sel!), (sel = null))}><Icon name="eye" size={14} />See the family from {fam.get(sel).name}’s side</button>
          {/if}
        {:else}
          <p class="en ui">Names take an -s for "’s": <b lang="de">Lenas Onkel</b>. After an s sound, just an apostrophe: <b lang="de">Jonas’ Tante</b>.</p>
        {/if}
      {:else if feedback}
        <p class="fb" class:ok={feedback.ok}>
          <strong>{feedback.ok ? 'Richtig!' : 'Nein.'}</strong>
          <De text={feedback.de} play={false} />{#if feedback.ok}<PlayButton text={feedback.de} small />{/if}
        </p>
        {#if solved}<button bind:this={nextBtn} class="btn small primary" type="button" onclick={next}>{qi + 1 < qs.length ? 'Next' : 'Finish'}<Icon name="arrow" size={15} /></button>{/if}
      {:else}
        <p class="en ui">Find <b>{q ? fam.get(q.me).name : ''}</b> (outlined), then tap the answer.</p>
      {/if}
    </div>
  {/if}
</Shell>

<style>
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.9rem;
    margin-bottom: 0.9rem;
    font-size: 0.88rem;
  }
  select {
    margin-left: 0.3rem;
    font: inherit;
    font-weight: 600;
    padding: 0.25rem 0.5rem;
    border-radius: 8px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
  }
  .hint {
    color: var(--mute);
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
  .question {
    margin: 0.3rem 0 0.9rem;
  }
  .tree {
    position: relative;
    margin: 0 auto;
    max-width: 40rem;
  }
  .lines {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }
  .lines line {
    stroke: var(--line-strong);
    stroke-width: 2;
  }
  .person {
    position: absolute;
    transform: translateX(-50%);
    width: min(18.5%, 6.8rem);
    display: grid;
    align-content: center;
    justify-items: center;
    gap: 0.05rem;
    padding: 0.2rem 0.15rem;
    border-radius: 12px;
    border: 1.5px solid var(--line-strong);
    border-bottom-width: 3px;
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
    transition: border-color 120ms, background-color 120ms;
  }
  .person.m {
    border-bottom-color: color-mix(in srgb, var(--g-m) 55%, var(--line-strong));
  }
  .person.f {
    border-bottom-color: color-mix(in srgb, var(--g-f) 55%, var(--line-strong));
  }
  .person:hover {
    border-color: var(--accent);
  }
  .nm {
    font-weight: 650;
    font-size: clamp(0.66rem, 2.7vw, 0.85rem);
    line-height: 1.15;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .rel {
    font-family: var(--font-body);
    font-size: clamp(0.62rem, 2.5vw, 0.8rem);
    line-height: 1.1;
    color: var(--accent-ink);
    font-weight: 560;
    hyphens: manual;
    text-align: center;
    max-width: 100%;
    overflow-wrap: anywhere;
  }
  .focus {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
  .focus .rel {
    color: #fff;
  }
  .sel {
    background: var(--jade-soft);
    border-color: var(--jade);
  }
  .wrong {
    border-color: var(--accent);
    animation: shake 300ms;
  }
  .cap {
    margin-top: 0.9rem;
    min-height: 3.6rem;
  }
  .cap p {
    margin: 0 0 0.35rem;
  }
  .say {
    font-size: 1.15rem;
  }
  .en {
    font-size: 0.86rem;
    color: var(--ink-2);
  }
  .fb strong {
    color: var(--accent-ink);
    margin-right: 0.2rem;
  }
  .fb.ok strong {
    color: var(--jade);
  }
  .done {
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
  @keyframes shake {
    25% {
      transform: translateX(calc(-50% - 4px));
    }
    75% {
      transform: translateX(calc(-50% + 4px));
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .wrong {
      animation: none;
    }
  }
</style>
