<!--
  Analysis: write the Roman numeral of each chord in a score. One box per chord (per onset), checked
  against the reference analysis and its accepted alternatives ("V|V7"). Figures are typed as digits:
  V65, I6, vii°7 (viio7 works too).
  YAML (```analyse block): id, title, prompt, key ("C major"), score, answers: [I, IV, V7, I]
-->
<script lang="ts">
  import { progress } from '$lib/state/progress.svelte';
  import { parseScore } from '$lib/notation/parse';
  import Score from '$lib/notation/Score.svelte';
  import ExerciseFrame from './ExerciseFrame.svelte';
  import Icon from '../ui/Icon.svelte';
  import { onsetsOf } from './perform';
  import { numeralMatches } from './analyse';
  import { localise } from './localise.svelte';

  interface Spec {
    id: string;
    title?: string;
    prompt?: string;
    hints?: string[];
    solution?: string;
    key?: string;
    score: string;
    answers: string[];
    /** The line under the score (default: one numeral per chord). */
    instruction?: string;
    /** One answer per chord (each onset, the default), per bar, or per written note of the top staff (tied notes included). */
    per?: 'chord' | 'bar' | 'note';
  }
  let { spec }: { spec: Spec } = $props();

  const score = $derived(parseScore(spec.score));
  /** The score events each answer box refers to. */
  const slots = $derived.by((): number[][] => {
    if (spec.per === 'note') return score.staves[0]!.events.filter((e) => e.kind === 'note').map((e) => [e.id]);
    if (spec.per !== 'bar') return onsetsOf(score).map((o) => o.ids);
    const bars = new Map<number, number[]>();
    for (const st of score.staves) for (const e of st.events) bars.set(e.bar, [...(bars.get(e.bar) ?? []), e.id]);
    return [...bars.entries()].sort((a, b) => a[0] - b[0]).map(([, ids]) => ids);
  });
  let typed: string[] = $state([]);
  let checked: (boolean | undefined)[] = $state([]);
  let current = $state(-1);
  /** The °, ø and ♭ buttons help with Roman numerals; labels such as CT or P do not need them. */
  const numerals = $derived(spec.answers.some((a) => /^[♭#b]?(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)/.test(a)));
  const allRight = $derived(checked.length === spec.answers.length && checked.every(Boolean));
  const marks = $derived(Object.fromEntries(current >= 0 ? (slots[current] ?? []).map((id) => [id, 'target']) : []));

  function check() {
    checked = spec.answers.map((a, i) => numeralMatches(typed[i] ?? '', a));
    if (checked.every(Boolean)) progress.markSolved(spec.id);
  }
  const insert = (i: number, s: string) => {
    typed[i] = (typed[i] ?? '') + s;
    checked = [];
  };
</script>

<ExerciseFrame id={spec.id} kind="Analyse" title={spec.title} prompt={spec.prompt} hints={spec.hints} solution={spec.solution} completionLabel="Answer checked">
  <div class="an ui" use:localise>
    <Score src={spec.score} {marks} label="The passage to analyse" />
    <p class="key">{spec.key ? `Key: ${spec.key}. ` : ''}{spec.instruction ?? 'One numeral per chord, in order.'}</p>
    <ol class="boxes">
      {#each spec.answers as _, i (i)}
        <li class:ok={checked[i] === true} class:bad={checked[i] === false}>
          <label>
            <span class="n">{i + 1}</span>
            <input
              value={typed[i] ?? ''}
              oninput={(e) => {
                typed[i] = (e.currentTarget as HTMLInputElement).value;
                checked = [];
              }}
              onfocus={() => (current = i)}
              onblur={() => (current = -1)}
              autocomplete="off"
              autocapitalize="off"
              spellcheck="false"
              aria-label="Numeral for chord {i + 1}"
            />
          </label>
          {#if numerals}
          <span class="sym">
            <button tabindex="-1" onmousedown={(e) => e.preventDefault()} onclick={() => insert(i, '°')}>°</button>
            <button tabindex="-1" onmousedown={(e) => e.preventDefault()} onclick={() => insert(i, 'ø')}>ø</button>
            <button tabindex="-1" onmousedown={(e) => e.preventDefault()} onclick={() => insert(i, '♭')}>♭</button>
          </span>
          {/if}
        </li>
      {/each}
    </ol>
    <div class="row" aria-live="polite">
      <button class="go" onclick={check}>Check</button>
      {#if allRight}
        <p class="okt"><Icon name="check" size={14} /> Answer checked: every numeral matches the analysis.</p>
      {:else if checked.length}
        <p class="badt">{checked.filter((c) => !c).length} to look at again (marked in red).</p>
      {/if}
    </div>
  </div>
</ExerciseFrame>

<style>
  .an {
    display: grid;
    gap: 0.6rem;
  }
  .key {
    margin: 0;
    font-size: 0.88rem;
    color: var(--ink-2);
  }
  .boxes {
    list-style: none;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 0;
    padding: 0;
  }
  .boxes li {
    display: grid;
    gap: 0.15rem;
    border: 2px solid var(--line-strong);
    border-radius: var(--radius-sm);
    padding: 0.3rem;
  }
  .boxes li.ok {
    border-color: var(--ok);
  }
  .boxes li.bad {
    border-color: var(--bad);
  }
  label {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .n {
    font-size: 0.7rem;
    color: var(--mute);
  }
  input {
    width: 4.6rem;
    font-family: var(--font-body);
    font-size: 1.05rem;
    padding: 0.2rem 0.3rem;
    border: 1px solid var(--line);
    border-radius: 3px;
    background: var(--bg);
    color: var(--ink);
  }
  .sym {
    display: flex;
    gap: 0.15rem;
  }
  .sym button {
    border: 1px solid var(--line);
    background: var(--surface);
    border-radius: 3px;
    font-size: 0.8rem;
    padding: 0 0.35rem;
    cursor: pointer;
    color: var(--ink-2);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 0.6rem 1rem;
    flex-wrap: wrap;
  }
  .row p {
    margin: 0;
  }
  .go {
    background: var(--accent);
    color: var(--on-accent);
    border: 0;
    border-radius: var(--radius-sm);
    padding: 0.35rem 0.9rem;
    font-weight: 600;
    cursor: pointer;
  }
  .okt {
    color: var(--ok);
    font-weight: 600;
  }
  .badt {
    color: var(--bad);
  }
</style>
