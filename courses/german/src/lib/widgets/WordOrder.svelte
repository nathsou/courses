<script lang="ts">
  /**
   * The sentence fields: Vorfeld | finite verb | Mittelfeld | verb at the end | Nachfeld. Choose
   * what goes first (or ask a question, or add weil/dass/ob/wenn) and watch the sentence re-flow:
   * the finite verb stays second, or goes to the very end of a subordinate clause.
   */
  import { untrack } from 'svelte';
  import { flip } from 'svelte/animate';
  import { V2_PRESETS, QUESTION_PRESETS, BRACKET_PRESETS, SUB_PRESETS, type MainPreset } from './data/word-order';
  import { CAN_FRONT, FIELDS, chunksOf, clauseText, mainRow, rowText, standalone, subRow, withClause, type Field, type Front, type Row, type Slot } from './grammar/fields';
  import Shell from './kit/Shell.svelte';
  import Rich from '$lib/components/exercise/Rich.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';

  type Mode = 'v2' | 'questions' | 'bracket' | 'subordinate';
  const MODES: Mode[] = ['v2', 'questions', 'bracket', 'subordinate'];
  const MODE_NAMES: Record<Mode, string> = { v2: 'Verb second', questions: 'Questions', bracket: 'Verb bracket', subordinate: 'weil, dass…' };

  let { mode = 'all' }: { mode?: Mode | 'all' } = $props();
  const fixed = untrack(() => (MODES.includes(mode as Mode) ? (mode as Mode) : null));
  let tab = $state(0);
  const m = $derived<Mode>(fixed ?? MODES[tab]!);

  const presets = $derived(m === 'v2' ? V2_PRESETS : m === 'questions' ? QUESTION_PRESETS : BRACKET_PRESETS);
  let pid = $state<Record<Mode, string>>({ v2: V2_PRESETS[0]!.id, questions: QUESTION_PRESETS[0]!.id, bracket: BRACKET_PRESETS[0]!.id, subordinate: SUB_PRESETS[0]!.id });
  let front = $state<Front>({ kind: 'chunk', id: 'subject' });
  let conj = $state('weil');
  let subFirst = $state(false);

  const preset = $derived<MainPreset>(presets.find((p) => p.id === pid[m]) ?? presets[0]!);
  const sub = $derived(SUB_PRESETS.find((p) => p.id === pid.subordinate) ?? SUB_PRESETS[0]!);
  const conjs = $derived(Object.keys(sub.leads));
  const curConj = $derived(conjs.includes(conj) ? conj : conjs[0]!);
  const lead = $derived(sub.leads[curConj as keyof typeof sub.leads]!);
  const canFront = $derived(CAN_FRONT.has(curConj) && !lead.ask);

  function choosePreset(id: string) {
    pid[m] = id;
    front = { kind: 'chunk', id: 'subject' };
  }

  // The rows to draw and the sentence to say.
  interface View {
    rows: { label: string; row: Row; sub?: boolean }[];
    text: string;
    en: string;
    /** The sentence as a flat list of slots, for the animated line. */
    line: Slot[];
    punct: string;
  }
  const view = $derived.by<View>(() => {
    if (m === 'subordinate') {
      const srow = subRow(sub, curConj);
      const { row, punct } = withClause(lead, clauseText(srow), canFront && subFirst);
      const line = FIELDS.flatMap((f) => row[f]).flatMap((s) => (s.kind === 'clause' ? FIELDS.flatMap((f) => srow[f]).map((x) => ({ ...x, key: `s-${x.key}`, inClause: true })) : [s]));
      return { rows: [{ label: 'Main clause', row }, { label: `${curConj}-clause`, row: srow, sub: true }], text: rowText(row, punct), en: lead.en, line, punct };
    }
    const row = mainRow(preset, front);
    const q = m === 'questions' && front.kind !== 'chunk';
    const punct = q ? '?' : '.';
    const asked = front.kind === 'wh' ? chunksOf(preset).find((c) => c.key === front.id)?.question : undefined;
    const en = front.kind === 'yesno' ? (preset.question ?? preset.en) : (asked ?? preset.en);
    return { rows: [{ label: '', row }], text: rowText(row, punct), en, line: FIELDS.flatMap((f) => row[f]), punct };
  });

  /** Display text of each slot in the line: capitals, commas, final punctuation. */
  function shown(i: number): [string, string] {
    const s = view.line[i]!;
    const t = i === 0 ? s.de.charAt(0).toUpperCase() + s.de.slice(1) : s.de;
    const next = view.line[i + 1];
    const inC = (x: Slot | undefined) => !!x && (x as Slot & { inClause?: boolean }).inClause === true;
    return [t, next && inC(s) !== inC(next) ? ',' : !next ? view.punct : ''];
  }

  const LABELS: Record<Field, [string, string]> = {
    vorfeld: ['Vorfeld', 'position 1'],
    left: ['Verb', 'position 2'],
    mittel: ['Mittelfeld', 'middle field'],
    right: ['Verb end', 'end of the clause'],
    nach: ['Nachfeld', 'after the end'],
  };
  const SUB_LABELS: Partial<Record<Field, [string, string]>> = {
    left: ['Conjunction', 'opens the clause'],
    mittel: ['Mittelfeld', 'middle field'],
    right: ['Verb end', 'finite verb last'],
  };

  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const rule = $derived.by(() => {
    if (m === 'subordinate')
      return subFirst && canFront
        ? `The whole {${curConj}}-clause fills the Vorfeld of the main clause, so the main verb comes straight after the comma: verb, comma, verb.`
        : `In a clause with {${curConj}} the finite verb goes to the very end.${sub.prefix ? ' A separable verb joins up again there.' : ''}`;
    if (front.kind === 'yesno') return 'Yes/no question: the Vorfeld stays empty and the verb comes first.';
    if (front.kind === 'wh') return 'The question word fills the Vorfeld; the verb is still second.';
    if (front.id === 'subject') return preset.note ?? 'The subject comes first and the verb second. Now put something else first.';
    return preset.note ?? 'Something else is first, so the subject moves to just after the verb. The verb stays in position 2.';
  });
</script>

{#snippet fields(row: Row, isSub: boolean)}
  <div class="fields" class:subrow={isSub}>
    {#each FIELDS.filter((f) => !isSub || SUB_LABELS[f]) as f (f)}
      {@const lab = isSub ? SUB_LABELS[f]! : LABELS[f]}
      <div class="field f-{f}" class:empty={!row[f].length}>
        <span class="flabel ui"><b>{lab[0]}</b> <span>{lab[1]}</span></span>
        <span class="fcontent" lang="de">
          {#each row[f] as s (s.key)}
            <span class="slot k-{s.kind}">{s.kind === 'clause' ? `${curConj} …` : s.de}</span>
          {:else}
            <span class="none ui">–</span>
          {/each}
        </span>
      </div>
    {/each}
  </div>
{/snippet}

<Shell label="Word order" icon="shuffle" title={fixed ? MODE_NAMES[fixed] : 'The sentence fields'}>
  {#if !fixed}
    <div class="modes ui" role="tablist" aria-label="Topic">
      {#each MODES as x, i (x)}
        <button type="button" role="tab" aria-selected={tab === i} class:on={tab === i} onclick={() => (tab = i)}>{MODE_NAMES[x]}</button>
      {/each}
    </div>
  {/if}
  <div class="presets ui" role="radiogroup" aria-label="Example sentence">
    {#each m === 'subordinate' ? SUB_PRESETS : presets as p (p.id)}
      <button type="button" role="radio" aria-checked={pid[m] === p.id} class="chip" class:on={pid[m] === p.id} onclick={() => choosePreset(p.id)}>{p.label}</button>
    {/each}
  </div>

  {#if m === 'subordinate'}
    <p class="alone ui">On its own: <span lang="de" class="de">{rowText(standalone(sub))}</span> <PlayButton text={rowText(standalone(sub))} small /> <span class="mute">“{sub.en}”</span></p>
    <div class="controls">
      <span class="lbl ui" id="wo-conj">Join with</span>
      <div class="chips" role="radiogroup" aria-labelledby="wo-conj">
        {#each conjs as c (c)}
          <button type="button" role="radio" aria-checked={curConj === c} class="chip de" class:on={curConj === c} lang="de" onclick={() => (conj = c)}>{c}</button>
        {/each}
      </div>
      {#if canFront}
        <label class="first ui"><input type="checkbox" bind:checked={subFirst} /> {curConj}-clause first</label>
      {/if}
    </div>
  {:else}
    <div class="controls">
      <span class="lbl ui" id="wo-front">{m === 'questions' ? 'Make it' : 'Put first'}</span>
      <div class="chips" role="radiogroup" aria-labelledby="wo-front">
        {#if m === 'questions'}
          <button type="button" role="radio" aria-checked={front.kind === 'chunk'} class="chip ui" class:on={front.kind === 'chunk'} onclick={() => (front = { kind: 'chunk', id: 'subject' })}>a statement</button>
          <button type="button" role="radio" aria-checked={front.kind === 'yesno'} class="chip ui" class:on={front.kind === 'yesno'} onclick={() => (front = { kind: 'yesno' })}>a yes/no question</button>
          {#each chunksOf(preset).filter((c) => c.q) as c (c.key)}
            <button type="button" role="radio" aria-checked={front.kind === 'wh' && front.id === c.key} class="chip de" class:on={front.kind === 'wh' && front.id === c.key} lang="de" onclick={() => (front = { kind: 'wh', id: c.key })}>{c.q}?</button>
          {/each}
        {:else}
          {#each chunksOf(preset) as c (c.key)}
            <button type="button" role="radio" aria-checked={front.kind === 'chunk' && front.id === c.key} class="chip de" class:on={front.kind === 'chunk' && front.id === c.key} lang="de" onclick={() => (front = { kind: 'chunk', id: c.key })}>{c.de}</button>
          {/each}
        {/if}
      </div>
    </div>
  {/if}

  <div class="stage" aria-live="polite">
    <p class="sr-only">{view.text}</p>
    <p class="line" aria-hidden="true" lang="de">
      {#each view.line as s, i (s.key)}
        {@const [t, punct] = shown(i)}
        <span class="ww" animate:flip={{ duration: reduce ? 0 : 300 }}><span class="w k-{s.kind}">{t}</span>{punct}</span>
      {/each}
      <PlayButton text={view.text} />
    </p>
    <p class="en ui">“{view.en}”</p>
  </div>

  {#each view.rows as r (r.label)}
    {#if r.label && view.rows.length > 1}<p class="rowlabel ui" lang={r.sub ? 'de' : undefined}>{r.label}</p>{/if}
    {@render fields(r.row, !!r.sub)}
  {/each}
  <p class="rule ui"><Rich text={rule} /></p>
</Shell>

<style>
  .modes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem;
    margin: -0.2rem 0 0.8rem;
    padding-bottom: 0.6rem;
    border-bottom: 1px solid var(--line);
  }
  .modes button {
    border: none;
    background: none;
    border-radius: 8px;
    padding: 0.3rem 0.6rem;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--mute);
    cursor: pointer;
  }
  .modes button.on {
    background: var(--accent-soft);
    color: var(--accent-ink);
  }
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-bottom: 0.7rem;
  }
  .chip {
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 999px;
    padding: 0.22rem 0.7rem;
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
  }
  .chip.de {
    font-family: var(--font-body);
    font-size: 0.95rem;
    font-weight: 560;
  }
  .chip.on {
    background: var(--fg);
    border-color: var(--fg);
    color: var(--bg);
  }
  .controls {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.6rem;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .lbl {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--mute);
  }
  .first {
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
    font-size: 0.85rem;
  }
  .alone {
    font-size: 0.85rem;
    margin: 0 0 0.6rem;
    color: var(--ink-2);
  }
  .alone .de {
    font-family: var(--font-body);
    font-size: 1rem;
    font-weight: 560;
    color: var(--fg);
  }
  .mute {
    color: var(--mute);
  }
  .stage {
    margin: 0.9rem 0 0.8rem;
    padding: 0.8rem 0.9rem 0.6rem;
    border-radius: 12px;
    background: var(--bg);
    border: 1px solid var(--line);
  }
  .line {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.35rem 0.4rem;
    margin: 0;
    font-size: 1.35rem;
    line-height: 1.35;
    font-weight: 560;
  }
  .w {
    display: inline-block;
    border-radius: 6px;
  }
  .k-verb {
    background: var(--accent);
    color: #fff;
    padding: 0 0.35rem;
  }
  .k-end {
    padding: 0 0.2rem;
    background: var(--accent-soft);
    color: var(--accent-ink);
    box-shadow: inset 0 -2px 0 var(--accent);
  }
  .k-conj {
    padding: 0 0.2rem;
    background: var(--jade-soft);
    color: var(--jade);
    font-weight: 700;
  }
  .k-q {
    padding: 0 0.2rem;
    background: var(--gold-soft);
    color: var(--gold);
    font-weight: 700;
  }
  .en {
    margin: 0.45rem 0 0;
    font-size: 0.9rem;
    color: var(--ink-2);
  }
  .rowlabel {
    margin: 0.7rem 0 0.25rem;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--mute);
  }
  .fields {
    display: grid;
    grid-template-columns: minmax(4.5rem, auto) auto minmax(6rem, 1fr) auto auto;
    gap: 0.3rem;
  }
  .fields.subrow {
    grid-template-columns: auto minmax(6rem, 1fr) auto;
  }
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    padding: 0.4rem 0.5rem 0.5rem;
    border-radius: 10px;
    background: var(--pn);
    border: 1px solid var(--line);
    min-width: 0;
  }
  .field.empty {
    background: transparent;
    border-style: dashed;
  }
  .f-left,
  .f-right {
    background: color-mix(in srgb, var(--accent) 7%, var(--panel));
    border-color: color-mix(in srgb, var(--accent) 35%, transparent);
  }
  .flabel {
    display: flex;
    flex-direction: column;
    font-size: 0.66rem;
    line-height: 1.25;
    color: var(--mute);
    white-space: nowrap;
  }
  .flabel b {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-2);
  }
  .fcontent {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    font-size: 1rem;
    font-weight: 560;
  }
  .slot {
    border-radius: 6px;
    padding: 0.05rem 0.35rem;
    background: var(--panel);
    border: 1px solid var(--line);
  }
  .slot.k-verb {
    background: var(--panel);
    color: var(--accent-ink);
    border-color: var(--accent);
  }
  .ww {
    display: inline-block;
  }
  .slot.k-clause {
    font-style: italic;
    color: var(--jade);
  }
  .none {
    color: var(--mute);
  }
  .rule {
    font-size: 0.88rem;
    color: var(--ink-2);
    margin: 0.7rem 0 0;
    line-height: 1.55;
  }
  @media (max-width: 600px) {
    .fields,
    .fields.subrow {
      grid-template-columns: 1fr;
    }
    .field {
      flex-direction: row;
      align-items: center;
    }
    .flabel {
      width: 6.2rem;
      flex: none;
    }
    .line {
      font-size: 1.15rem;
    }
  }
</style>
