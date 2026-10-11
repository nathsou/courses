<script lang="ts">
  /**
   * Level checks in the spirit of the Goethe exams. Listening texts play twice, as in the real
   * test, and are only shown in the review afterwards. The pass mark is 60%, as for the Goethe
   * certificates.
   */
  import type { Paper, Question } from '$content/exams/types';
  import { speech } from '$lib/audio/speech.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { shuffle } from '$lib/exercises/shuffle';
  import Rich from '$lib/components/exercise/Rich.svelte';
  import De from '$lib/components/de/De.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  const modules = import.meta.glob<Record<string, Paper>>('/content/exams/[ab][12].ts', { eager: true });
  const ORDER = ['A1', 'A2', 'B1', 'B2'];
  const PAPERS = Object.values(modules)
    .flatMap((m) => Object.values(m))
    .sort((a, b) => ORDER.indexOf(a.level) - ORDER.indexOf(b.level));
  let paper = $state<Paper | null>(null);
  let si = $state(0);
  let answers = $state<(number | boolean | null)[][]>([]);
  let finished = $state(false);
  let playing = $state<string | null>(null);
  const section = $derived(paper?.sections[si]);

  /** Options are shown in a fixed shuffled order per question. */
  const orderOf = (n: number, k: number) => shuffle(Array.from({ length: n }, (_, i) => i), `${paper?.id}:${si}:${k}`);

  function begin(p: Paper) {
    paper = p;
    si = 0;
    answers = p.sections.map((s) => s.questions.map(() => null));
    finished = false;
    scrollTo({ top: 0 });
  }
  async function playTwice(id: string, text: string) {
    if (playing === id) {
      speech.stop();
      playing = null;
      return;
    }
    playing = id;
    await speech.say(text);
    if (playing !== id) return;
    await new Promise((r) => setTimeout(r, 1500));
    if (playing !== id) return;
    await speech.say(text);
    if (playing === id) playing = null;
  }
  function answer(qi: number, v: number | boolean) {
    answers[si]![qi] = v;
  }
  function next() {
    speech.stop();
    playing = null;
    if (paper && si + 1 < paper.sections.length) {
      si++;
      scrollTo({ top: 0 });
    } else finish();
  }
  const isRight = (q: Question, a: number | boolean | null) => a !== null && a === q.answer;
  const score = $derived(paper ? paper.sections.map((s, i) => s.questions.filter((q, k) => isRight(q, answers[i]?.[k] ?? null)).length) : []);
  const total = $derived(paper ? paper.sections.reduce((n, s) => n + s.questions.length, 0) : 0);
  const got = $derived(score.reduce((a, b) => a + b, 0));
  const bySkill = $derived.by(() => {
    if (!paper) return [];
    const out: { skill: string; got: number; of: number }[] = [];
    for (const [i, s] of paper.sections.entries()) {
      const row = out.find((r) => r.skill === s.skill) ?? (out.push({ skill: s.skill, got: 0, of: 0 }), out[out.length - 1]!);
      row.got += score[i] ?? 0;
      row.of += s.questions.length;
    }
    return out;
  });
  function finish() {
    finished = true;
    if (paper) progress.setBest(`exam-${paper.id}`, got);
    scrollTo({ top: 0 });
  }
  const unanswered = $derived(section ? answers[si]!.filter((a) => a === null).length : 0);
  const SKILL: Record<string, string> = { listening: 'Hören · listening', reading: 'Lesen · reading', language: 'Sprachbausteine · language' };
</script>

<svelte:head><title>Level checks · Auf Deutsch</title></svelte:head>

<div class="page">
  {#if !paper}
    <h1>Level checks</h1>
    <p class="ui lead">One test per level, in the spirit of the Goethe-Institut exams: listening (each text plays twice), reading, and language in use. Use headphones and don't look anything up: the point is to find your gaps. Speaking and writing are practised in the lessons (with the optional AI partner).</p>
    {#if !PAPERS.length}<p class="ui note">The level checks are being prepared.</p>{/if}
    <div class="papers">
      {#each PAPERS as p (p.id)}
        {@const best = progress.data.best[`exam-${p.id}`]}
        {@const n = p.sections.reduce((a, s) => a + s.questions.length, 0)}
        <div class="paper card">
          <span class="lvl">{p.level}</span>
          <h2>{p.title}</h2>
          <p class="ui">{n} questions · about {p.minutes} minutes · {p.sections.length} parts</p>
          {#if best !== undefined}<p class="ui best">Best score: {best} / {n} ({Math.round((best / n) * 100)}%)</p>{/if}
          <button class="btn primary" onclick={() => begin(p)}>Start</button>
        </div>
      {/each}
    </div>
    <p class="ui note">The Goethe certificates are passed with 60% in each module. These checks use the same line overall and show your score per skill.</p>
  {:else if finished}
    <h1>{paper.title}: results</h1>
    <div class="result card" class:pass={got / total >= 0.6}>
      <p class="big">{got} / {total} <span class="pct">{Math.round((got / total) * 100)}%</span></p>
      <p class="ui">{got / total >= 0.6 ? 'Bestanden! That would be a pass.' : 'Not a pass yet: the review below shows where to focus.'}</p>
      <ul class="ui per">
        {#each bySkill as r (r.skill)}<li><span>{SKILL[r.skill]}</span><strong>{r.got} / {r.of}</strong></li>{/each}
      </ul>
      <div class="row ui"><button class="btn" onclick={() => paper && begin(paper)}><Icon name="refresh" size={14} />Try again</button><button class="btn ghost" onclick={() => (paper = null)}>All levels</button></div>
    </div>
    <h2>Review</h2>
    {#each paper.sections as s, i (i)}
      <h3 class="ui">{s.title}</h3>
      {#if s.text}<div class="passage"><p class="ptools"><PlayButton text={s.text} small /></p>{#each s.text.split('\n') as line, n (n)}<p><De text={line} play={false} /></p>{/each}</div>{/if}
      <ol class="review">
        {#each s.questions as q, k (k)}
          {@const a = answers[i]?.[k] ?? null}
          <li class:ok={isRight(q, a)}>
            <span class="mark ui">{isRight(q, a) ? '✓' : '✗'}</span>
            <div>
              {#if q.type !== 'fill' && q.text}<p class="qz"><De text={q.text} play={false} /> <PlayButton text={q.text} small /></p>{/if}
              {#if q.type === 'tf'}
                <p><De text={q.claim} play={false} /> <span class="ui">— {q.answer ? 'richtig' : 'falsch'}{a !== null && a !== q.answer ? ' (you said the opposite)' : ''}</span></p>
              {:else if q.type === 'choose'}
                <p><Rich text={q.question} /></p>
                <p class="ui">Answer: <Rich text={q.options[q.answer]!} />{a !== null && a !== q.answer ? ` · you chose “${q.options[a as number]}”` : ''}</p>
              {:else}
                <p><De text={q.de.replace('___', q.options[q.answer]!)} play={false} />{a !== null && a !== q.answer ? ` (you chose “${q.options[a as number]}”)` : ''}</p>
              {/if}
              {#if q.explain}<p class="ui ex"><Rich text={q.explain} de={false} /></p>{/if}
            </div>
          </li>
        {/each}
      </ol>
    {/each}
  {:else if section}
    <div class="exam-head ui">
      <span>{paper.title}</span>
      <span>Part {si + 1} of {paper.sections.length}</span>
    </div>
    <h1 class="sec">{section.title}</h1>
    <p class="ui instr"><Icon name={section.skill === 'listening' ? 'speaker' : section.skill === 'reading' ? 'book' : 'keyboard'} size={16} /> <Rich text={section.instructions} de={false} /></p>
    {#if section.text}
      {#if section.skill === 'listening'}
        <p><button class="btn" onclick={() => playTwice(`s${si}`, section.text!)}><Icon name={playing === `s${si}` ? 'stop' : 'play'} size={15} />{playing === `s${si}` ? 'Playing… (stop)' : 'Play the text (twice)'}</button></p>
      {:else}
        <div class="passage">{#each section.text.split('\n') as line, n (n)}{#if line.trim()}<p><De text={line} play={false} /></p>{:else}<br />{/if}{/each}</div>
      {/if}
    {/if}
    <ol class="qs">
      {#each section.questions as q, k (k)}
        {@const a = answers[si]?.[k] ?? null}
        <li class="q card">
          <span class="qn ui">{k + 1}</span>
          <div class="qbody">
            {#if q.type !== 'fill' && q.text}
              {#if section.skill === 'listening'}
                <button class="btn small" onclick={() => playTwice(`${si}:${k}`, q.text!)}><Icon name={playing === `${si}:${k}` ? 'stop' : 'play'} size={14} />{playing === `${si}:${k}` ? 'Playing…' : 'Play (twice)'}</button>
              {:else}
                <div class="qtext">{#each q.text.split('\n') as line, n (n)}<p><De text={line} play={false} /></p>{/each}</div>
              {/if}
            {/if}
            {#if q.type === 'tf'}
              <p class="qq"><De text={q.claim} play={false} /></p>
              <div class="tf">
                <button class="choice" class:on={a === true} onclick={() => answer(k, true)}>richtig</button>
                <button class="choice" class:on={a === false} onclick={() => answer(k, false)}>falsch</button>
              </div>
            {:else if q.type === 'choose'}
              <p class="qq"><Rich text={q.question} /></p>
              <div class="opts">
                {#each orderOf(q.options.length, k) as i, pos (i)}<button class="choice" class:on={a === i} onclick={() => answer(k, i)}><span class="ui l">{String.fromCharCode(97 + pos)}</span> <Rich text={q.options[i]!} plain genders="hide" /></button>{/each}
              </div>
            {:else}
              <p class="qq"><Rich text={q.de} de genders="hide" /></p>
              <div class="opts">
                {#each orderOf(q.options.length, k) as i, pos (i)}<button class="choice" class:on={a === i} onclick={() => answer(k, i)}><span class="ui l">{String.fromCharCode(97 + pos)}</span> <span lang="de">{q.options[i]}</span></button>{/each}
              </div>
            {/if}
          </div>
        </li>
      {/each}
    </ol>
    <div class="row ui">
      {#if unanswered}<span class="mute">{unanswered} unanswered</span>{/if}
      <button class="btn primary" onclick={next}>{si + 1 < paper.sections.length ? 'Next part' : 'Finish and see results'} <Icon name="arrow" size={14} /></button>
    </div>
  {/if}
</div>

<style>
  .page {
    padding: 2.2rem clamp(1rem, 4vw, 3.5rem) 4rem;
    max-width: 46rem;
  }
  h1 {
    margin: 0 0 0.3rem;
  }
  .lead {
    color: var(--ink-2);
    margin: 0 0 1.2rem;
  }
  .papers {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
    gap: 0.8rem;
  }
  .paper {
    padding: 1.1rem 1.2rem;
  }
  .paper h2 {
    margin: 0.2rem 0;
    font-size: 1.25rem;
  }
  .paper p {
    font-size: 0.86rem;
    color: var(--ink-2);
  }
  .lvl {
    display: inline-grid;
    place-items: center;
    width: 2.6rem;
    height: 2.6rem;
    border-radius: 10px;
    background: var(--accent);
    color: #fff;
    font-family: var(--font-ui);
    font-weight: 750;
  }
  .passage,
  .qtext {
    background: var(--pn);
    border-left: 3px solid var(--accent);
    border-radius: 10px;
    padding: 0.6rem 0.9rem;
    margin: 0 0 1rem;
  }
  .qtext {
    margin: 0;
    width: 100%;
  }
  .passage p,
  .qtext p {
    margin: 0.2rem 0;
  }
  .ptools {
    float: right;
  }
  .ex {
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .best {
    color: var(--jade) !important;
    font-weight: 650;
  }
  .note {
    margin-top: 1.2rem;
    font-size: 0.82rem;
    color: var(--mute);
  }
  .exam-head {
    display: flex;
    justify-content: space-between;
    font-size: 0.8rem;
    color: var(--mute);
  }
  .sec {
    font-size: 1.6rem;
  }
  .instr {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    color: var(--ink-2);
    margin: 0 0 1rem;
  }
  .qs {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.7rem;
  }
  .q {
    display: grid;
    grid-template-columns: 2rem 1fr;
    gap: 0.5rem;
    padding: 0.8rem 1rem;
  }
  .qn {
    font-weight: 750;
    color: var(--accent-ink);
  }
  .qbody {
    display: grid;
    gap: 0.5rem;
    justify-items: start;
  }
  .qz,
  .qq {
    margin: 0;
  }
  .l {
    font-size: 0.72rem;
    font-weight: 700;
    color: var(--mute);
  }
  .row {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.8rem;
    margin-top: 1.2rem;
  }
  .mute {
    color: var(--mute);
    font-size: 0.85rem;
  }
  .result {
    padding: 1.2rem 1.4rem;
    margin-bottom: 1.5rem;
    border-left: 4px solid var(--accent);
  }
  .result.pass {
    border-left-color: var(--jade);
  }
  .big {
    font-size: 2.4rem;
    font-weight: 750;
    margin: 0;
    font-family: var(--font-ui);
  }
  .pct {
    font-size: 1.2rem;
    color: var(--mute);
  }
  .per {
    list-style: none;
    padding: 0;
    margin: 0.6rem 0;
  }
  .per li {
    display: flex;
    justify-content: space-between;
    padding: 0.2rem 0;
    border-bottom: 1px solid var(--line);
    font-size: 0.88rem;
  }
  .result .row {
    justify-content: flex-start;
  }
  h3 {
    font-size: 0.9rem;
    margin: 1.2rem 0 0.4rem;
    color: var(--accent-ink);
  }
  .review {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .review li {
    display: grid;
    grid-template-columns: 1.6rem 1fr;
    gap: 0.4rem;
    padding: 0.4rem 0;
    border-bottom: 1px solid var(--line);
  }
  .review p {
    margin: 0.1rem 0;
    font-size: 0.92rem;
  }
  .mark {
    color: var(--accent);
    font-weight: 700;
  }
  .review li.ok .mark {
    color: var(--jade);
  }
</style>
