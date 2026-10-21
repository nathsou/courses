<!--
  Realise: complete a given bass (figured, or with numerals) or a given melody in four voices, one chord per
  note, played on the reader's keyboard. Keys toggle notes into the chord being written (so on-screen
  clicks work as well as a MIDI chord); a chord is entered when four notes are down and every key is up.
  When all chords are in, the rule engine checks them. The verdict is "rules checked": the faults found or
  "no faults found", never "correct".

  YAML (```realise block): id, title, prompt, hints, solution,
    key ("C major"), style (keyboard | satb | species: two voices), time ("4/4"), tempo,
    bass ("c4 f g c") with figures (["", "6", "7", "#"]) or numerals ([I, IV, V7, I]),
    or soprano ("e''4 f'' d'' c''") with optional numerals,
    rules (a list of rule ids, default: all for the style), range ([36, 84]),
    example (one realisation, a chord per line as "C3 E4 G4 C5", shown after an attempt)
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { instrument } from '$lib/midi/instrument.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { noteName } from '$lib/music/names';
  import { spell } from '$lib/music/pitch';
  import { DEFAULT_RULES, RULES, type Fault, type Satb } from '$lib/music/voicelead';
  import { parseScore, voiceEvents } from '$lib/notation/parse';
  import Score from '$lib/notation/Score.svelte';
  import Keyboard, { type Mark } from '$lib/widgets/Keyboard.svelte';
  import ExerciseFrame from './ExerciseFrame.svelte';
  import Icon from '../ui/Icon.svelte';
  import { entryProblem, exampleChords, judge, keyOf, realiseScore, slotsOf, toSatb, voicesOf, where, type RealiseSpec } from './realise';
  import { localise } from './localise.svelte';
  import { listening } from './active';

  let { spec }: { spec: RealiseSpec } = $props();

  const style = $derived(spec.style ?? 'keyboard');
  const fifths = $derived(keyOf(spec).fifths);
  const slots = $derived(slotsOf(spec));
  const voices = $derived(voicesOf(spec));
  let entered: Satb[] = $state([]);
  let draft: number[] = $state([]);
  let problem = $state('');
  /** The draft was refused: the next key starts a new chord. */
  let stale = $state(false);
  let faults: Fault[] | undefined = $state();
  let justChecked = $state(false);
  let showExample = $state(false);
  const example = $derived(exampleChords(spec));

  const current = $derived(entered.length < slots.length ? entered.length : -1);
  const src = $derived(realiseScore(spec, slots, entered));
  const rulesOn = $derived(spec.rules ?? DEFAULT_RULES[style]);
  const errors = $derived((faults ?? []).filter((f) => f.severity === 'fault'));
  const warnings = $derived((faults ?? []).filter((f) => f.severity === 'warning'));

  /** Score event ids of each slot, all staves and voices. */
  const slotIds = $derived.by((): number[][] => {
    try {
      const sc = parseScore(src);
      const out: number[][] = slots.map(() => []);
      for (const st of sc.staves) for (let v = 0; v < 2; v++) voiceEvents(st, v).forEach((e, i) => out[i]?.push(e.id));
      return out;
    } catch {
      return [];
    }
  });
  const scoreMarks = $derived.by((): Record<number, string> => {
    const out: Record<number, string> = {};
    if (current >= 0) for (const id of slotIds[current] ?? []) out[id] = 'target';
    for (const f of errors) for (const k of [f.from, f.at]) if (k !== undefined) for (const id of slotIds[k] ?? []) out[id] = 'wrong';
    return out;
  });
  const keyMarks = $derived.by((): Record<number, Mark> => {
    const out: Record<number, Mark> = {};
    if (current >= 0) out[slots[current]!.given.midi] = 'hint';
    for (const m of draft) out[m] = stale ? 'wrong' : 'target';
    return out;
  });
  const name = (m: number) => noteName(spell(m, fifths), settings.nameOptions) + String(Math.floor(m / 12) - 1);

  function toggle(m: number) {
    if (current < 0) return;
    if (stale) {
      draft = [];
      stale = false;
    }
    problem = '';
    draft = draft.includes(m) ? draft.filter((x) => x !== m) : [...draft, m];
  }

  function tryEnter() {
    if (current < 0 || instrument.held.size > 0 || !draft.length) return;
    if (draft.length < voices) return;
    const why = entryProblem(draft, slots[current]!, voices);
    if (why) {
      problem = why;
      stale = true;
      return;
    }
    entered = [...entered, toSatb(draft)];
    draft = [];
    if (entered.length === slots.length) {
      faults = judge(spec, slots, entered);
      justChecked = true;
      if (!faults.some((f) => f.severity === 'fault')) progress.markSolved(spec.id);
    }
  }

  function undo() {
    faults = undefined;
    justChecked = false;
    draft = [];
    stale = false;
    problem = '';
    entered = entered.slice(0, -1);
  }
  function restart() {
    showExample = false;
    faults = undefined;
    justChecked = false;
    draft = [];
    stale = false;
    problem = '';
    entered = [];
  }

  let settle: number | undefined;
  onMount(() =>
    instrument.subscribe((e) => {
      if (!listening(spec.id)) return;
      if (e.on) toggle(e.midi);
      clearTimeout(settle);
      settle = window.setTimeout(tryEnter, 120);
    }),
  );
</script>

<ExerciseFrame id={spec.id} listens kind="Realise" title={spec.title} prompt={spec.prompt} hints={spec.hints} solution={spec.solution} completionLabel="Rules checked">
  <div class="re ui" use:localise>
    <Score {src} marks={scoreMarks} tempo={spec.tempo} strip={false} play={entered.length > 0} label="The given line and your chords" />
    <p class="how">
      {#if current >= 0}
        <span class="n">Chord {current + 1} of {slots.length}.</span>
        {style === 'keyboard' ? 'Bass in the left hand, three voices in the right.' : style === 'satb' ? 'Four voices: soprano, alto, tenor, bass.' : 'Two voices, note against note.'}
        Play {voices === 2 ? 'both notes' : 'all four notes'}{slots[current]!.given.voice > 0 ? `, the given ${voices === 2 ? 'note' : 'bass'} included` : ', the given melody note on top'}; a key played again is taken out.
      {:else}
        All {slots.length} chords entered.
      {/if}
    </p>
    {#if current >= 0}
      <Keyboard lo={spec.range?.[0] ?? 36} hi={spec.range?.[1] ?? 84} marks={keyMarks} fifths={fifths} showHeld={false} label="Keyboard to write the chords" />
      <p class="draft" aria-live="polite">
        {#if problem}
          <span class="bad">{problem}</span> Play the chord again.
        {:else if draft.length}
          Writing: {[...draft].sort((a, b) => a - b).map(name).join(' ')}{draft.length < voices ? ` (${voices - draft.length} more)` : draft.length > voices ? ' (too many: play a key again to take it out)' : ''}
        {:else}
          <span class="mute">The given note is marked on the keyboard.</span>
        {/if}
      </p>
    {/if}

    {#if faults}
      <div class="verdict" aria-live="polite">
        {#if !errors.length}
          <p class="ok"><Icon name="check" size={15} /> Rules checked: {justChecked ? 'no faults found' : 'no faults found earlier'}{warnings.length ? `, and ${warnings.length} thing${warnings.length > 1 ? 's' : ''} worth a look` : ''}. Press play to hear it.</p>
        {:else}
          <p class="bad">Rules checked: {errors.length} fault{errors.length > 1 ? 's' : ''} found (marked in red on the score).</p>
        {/if}
        {#if errors.length || warnings.length}
          <ul class="faults">
            {#each [...errors, ...warnings] as f, i (i)}
              <li class={f.severity}><strong>{where(f)}:</strong> {f.text} <span class="why">{RULES[f.rule].explain}</span></li>
            {/each}
          </ul>
        {/if}
      </div>
    {/if}
    {#if faults && example.length === slots.length}
      {#if showExample}
        <Score src={realiseScore(spec, slots, example)} tempo={spec.tempo} label="One realisation" caption="One realisation with no faults found. Yours may differ and be just as good." />
      {:else}
        <button class="ex" onclick={() => (showExample = true)}>See one realisation</button>
      {/if}
    {/if}

    <div class="actions">
      {#if entered.length}<button onclick={undo}><Icon name="reset" size={14} /> Take back the last chord</button>{/if}
      {#if draft.length}<button onclick={() => ((draft = []), (stale = false), (problem = ''))}>Clear this chord</button>{/if}
      {#if entered.length > 1}<button onclick={restart}>Start again</button>{/if}
    </div>
    <details class="rules">
      <summary>The rules checked here</summary>
      <ul>
        {#each rulesOn as r (r)}
          <li><span class="sev {RULES[r].severity}">{RULES[r].severity === 'fault' ? 'fault' : 'worth a look'}</span> {RULES[r].explain}</li>
        {/each}
      </ul>
      <p class="mute">{voices === 2 ? 'These are the conventions of strict counterpoint as Fux taught it in 1725' : 'These are the conventions of four-part writing in the 18th and 19th centuries'}, not laws of nature. The course checks them; it does not say a realisation is right.</p>
    </details>
  </div>
</ExerciseFrame>

<style>
  .re {
    display: grid;
    gap: 0.7rem;
  }
  .how,
  .draft {
    margin: 0;
    font-size: 0.92rem;
  }
  .n {
    font-weight: 600;
  }
  .mute {
    color: var(--ink-2);
  }
  .bad {
    color: var(--bad);
  }
  .ok {
    color: var(--ok);
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }
  .verdict p {
    margin: 0 0 0.4rem;
  }
  .faults {
    margin: 0;
    padding-left: 1.1rem;
    display: grid;
    gap: 0.35rem;
    font-size: 0.92rem;
  }
  .faults li.fault::marker {
    color: var(--bad);
  }
  .faults li.warning::marker {
    color: var(--warn, var(--ink-2));
  }
  .why {
    display: block;
    color: var(--ink-2);
    font-size: 0.86rem;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .actions button {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.2rem 0.7rem;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.88rem;
  }
  .ex {
    justify-self: start;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.2rem 0.7rem;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.88rem;
  }
  .rules {
    font-size: 0.88rem;
  }
  .rules summary {
    cursor: pointer;
    color: var(--ink-2);
    font-weight: 600;
  }
  .rules ul {
    margin: 0.4rem 0;
    padding-left: 1.1rem;
    display: grid;
    gap: 0.25rem;
  }
  .sev {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 700;
    margin-right: 0.3rem;
  }
  .sev.fault {
    color: var(--bad);
  }
  .sev.warning {
    color: var(--ink-2);
  }
</style>
