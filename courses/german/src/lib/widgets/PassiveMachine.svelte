<script lang="ts">
  /**
   * Active → passive, step by step: pick a sentence and a target (a tense, a modal, the state
   * passive or an alternative) and walk through each change, highlighted in both sentences.
   */
  import { PASSIVE_PRESETS, PASSIVE_TARGETS, STEP_NOTES, STEP_OVERRIDES, type PassiveKind, type PassiveTarget, type PassiveResult } from './data/passive-machine';
  import Shell from './kit/Shell.svelte';
  import HiText from './kit/HiText.svelte';
  import Rich from '$lib/components/exercise/Rich.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { unmark, type Tone } from './kit/marks';

  const ORDER: PassiveKind[] = ['subj', 'dat', 'obj', 'man', 'aux', 'sein', 'modal', 'lassen', 'verb', 'part', 'inf', 'zu', 'bar', 'werden', 'worden', 'agent'];
  const TONE: Record<PassiveKind, Tone> = {
    subj: 'blue',
    dat: 'blue',
    obj: 'blue',
    man: 'purple',
    aux: 'accent',
    sein: 'accent',
    modal: 'accent',
    lassen: 'accent',
    verb: 'jade',
    part: 'jade',
    inf: 'jade',
    zu: 'jade',
    bar: 'jade',
    werden: 'gold',
    worden: 'gold',
    agent: 'purple',
  };
  const GROUPS = [
    { kind: 'tense', label: 'Passive' },
    { kind: 'state', label: 'State' },
    { kind: 'alt', label: 'Alternatives' },
  ] as const;

  let presetId = $state(PASSIVE_PRESETS[0]!.id);
  let target = $state<PassiveTarget>('praes');
  let step = $state(0);

  const preset = $derived(PASSIVE_PRESETS.find((p) => p.id === presetId)!);
  const res = $derived(preset.results[target]);
  const result = $derived('none' in res ? null : (res as PassiveResult));
  const active = $derived(result?.active ?? preset.active);
  const steps = $derived(result ? ORDER.filter((k) => result.kind.includes(k)) : []);
  const shownKinds = $derived(steps.slice(0, step + 1));
  const current = $derived(steps[step]);
  const lit = (kinds: PassiveKind[]) => kinds.map((k, i) => (shownKinds.includes(k) ? i : -1)).filter((i) => i >= 0);
  const focusOf = (kinds: PassiveKind[]) => kinds.indexOf(current!);
  const noteFor = (k: PassiveKind) => STEP_OVERRIDES[target]?.[k]?.explain ?? STEP_NOTES[k].explain;
  const all = $derived(step >= steps.length - 1);

  function setTarget(t: PassiveTarget) {
    target = t;
    step = 0;
  }
  function setPreset(id: string) {
    presetId = id;
    step = 0;
  }
</script>

<Shell label="Passive machine" icon="settings">
  <label class="field ui">
    <span class="lbl">Active sentence</span>
    <select value={presetId} onchange={(e) => setPreset(e.currentTarget.value)} lang="de">
      {#each PASSIVE_PRESETS as p (p.id)}<option value={p.id}>{unmark(p.active.de)}</option>{/each}
    </select>
  </label>

  <div class="targets">
    {#each GROUPS as g (g.kind)}
      <div class="tg" role="radiogroup" aria-label={g.label}>
        <span class="lbl ui">{g.label}</span>
        {#each PASSIVE_TARGETS.filter((t) => t.kind === g.kind) as t (t.id)}
          <button type="button" role="radio" aria-checked={target === t.id} class="chip ui" class:on={target === t.id} class:none={'none' in preset.results[t.id]} onclick={() => setTarget(t.id)}>{t.label}</button>
        {/each}
      </div>
    {/each}
  </div>

  <p class="what ui"><Rich text={PASSIVE_TARGETS.find((t) => t.id === target)!.explain} /></p>

  <div class="stage">
    <div class="line">
      <span class="tag ui">Active</span>
      <span class="s"><HiText text={active.de} tones={active.kind.map((k) => TONE[k])} on={result ? lit(active.kind) : []} focus={result ? focusOf(active.kind) : -1} size="md" play /></span>
    </div>
    <div class="arrow" aria-hidden="true"><Icon name="arrow" size={18} /></div>
    {#if result}
      <div class="line out">
        <span class="tag ui">{target === 'man' || target === 'lassen' || target === 'zu' || target === 'bar' ? 'Alternative' : target === 'state' ? 'State passive' : 'Passive'}</span>
        <span class="s"><HiText text={result.de} tones={result.kind.map((k) => TONE[k])} on={lit(result.kind)} focus={focusOf(result.kind)} size="md" play /></span>
        <span class="en ui">{result.en}</span>
      </div>

      <ol class="steps" aria-live="polite">
        {#each steps as k, i (k)}
          {#if i <= step}
            <li class:cur={i === step}>
              <span class="dot t-{TONE[k]}" aria-hidden="true"></span>
              <span><strong class="ui">{STEP_NOTES[k].label}{k === 'agent' ? ' (optional)' : ''}</strong> <Rich text={noteFor(k)} /></span>
            </li>
          {/if}
        {/each}
      </ol>
      <div class="ctrl">
        <button type="button" class="btn small" disabled={step === 0} onclick={() => (step = Math.max(0, step - 1))}><Icon name="back" size={15} />Back</button>
        <button type="button" class="btn small primary" disabled={all} onclick={() => (step = Math.min(steps.length - 1, step + 1))}>Next step<Icon name="arrow" size={15} /></button>
        <button type="button" class="btn small ghost" disabled={all} onclick={() => (step = steps.length - 1)}>Show all</button>
        <span class="count ui">{step + 1} / {steps.length}</span>
      </div>
      {#if result.note && all}<p class="note"><Rich text={result.note} /></p>{/if}
    {:else}
      <div class="line out none">
        <span class="tag ui">Does not work here</span>
        <p class="nope"><Rich text={'none' in res ? res.note : ''} /></p>
      </div>
    {/if}
  </div>
</Shell>

<style>
  .field {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.25rem;
    margin-bottom: 0.7rem;
  }
  .lbl {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mute);
  }
  select {
    font-family: var(--font-body);
    font-size: 1rem;
    padding: 0.45rem 0.6rem;
    border-radius: 10px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    width: 100%;
    min-width: 0;
    text-overflow: ellipsis;
  }
  .targets {
    display: grid;
    gap: 0.4rem;
  }
  .tg {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
  }
  .tg .lbl {
    width: 6.6rem;
    flex: none;
  }
  .chip {
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    border-radius: 999px;
    padding: 0.25rem 0.7rem;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .chip:hover {
    border-color: var(--mute);
  }
  .chip.none {
    border-style: dashed;
    color: var(--mute);
  }
  .chip.on {
    border-color: var(--accent);
    border-style: solid;
    background: var(--accent-soft);
    color: var(--accent-ink);
  }
  .what {
    font-size: 0.85rem;
    color: var(--ink-2);
    margin: 0.7rem 0 0.5rem;
  }
  .stage {
    background: var(--pn);
    border-radius: 12px;
    padding: 0.8rem 0.9rem;
  }
  .line {
    display: grid;
    gap: 0.1rem;
  }
  .tag {
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mute);
  }
  .out .tag {
    color: var(--accent-ink);
  }
  .arrow {
    color: var(--mute);
    transform: rotate(90deg);
    width: 18px;
    margin: 0.3rem 0 0.2rem 0.4rem;
  }
  .en {
    font-size: 0.86rem;
    color: var(--mute);
  }
  .steps {
    list-style: none;
    margin: 0.8rem 0 0.6rem;
    padding: 0;
    display: grid;
    gap: 0.35rem;
  }
  .steps li {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.55rem;
    align-items: baseline;
    font-size: 0.95rem;
    opacity: 0.7;
  }
  .steps li.cur {
    opacity: 1;
  }
  .steps strong {
    font-size: 0.8rem;
    margin-right: 0.15rem;
  }
  .dot {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    background: var(--c);
    transform: translateY(0.05rem);
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
  .t-blue {
    --c: var(--g-m);
  }
  .t-purple {
    --c: var(--g-pl);
  }
  .ctrl {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
  }
  .count {
    font-size: 0.78rem;
    color: var(--mute);
    margin-left: auto;
  }
  .note {
    margin: 0.7rem 0 0;
    font-size: 0.95rem;
    padding-top: 0.6rem;
    border-top: 1px solid var(--line);
  }
  .nope {
    margin: 0.2rem 0 0;
  }
  @media (max-width: 420px) {
    .tg .lbl {
      width: 100%;
    }
  }
</style>
