<script lang="ts">
  /**
   * Extended attributes unfolded into relative clauses, step by step, with the matching pieces
   * colour-linked. Quiz: the reverse direction (relative clause → attribute).
   */
  import { ATTR_PRESETS, ATTR_STEPS, ATTR_QUIZ, type AttrKind } from './data/attribute-unfolder';
  import Shell from './kit/Shell.svelte';
  import HiText from './kit/HiText.svelte';
  import Quiz from './kit/Quiz.svelte';
  import Rich from '$lib/components/exercise/Rich.svelte';
  import De from '$lib/components/de/De.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { segments, unmark, type Tone } from './kit/marks';

  let tab = $state(0);
  let presetId = $state(ATTR_PRESETS[0]!.id);
  let step = $state(0);

  const p = $derived(ATTR_PRESETS.find((x) => x.id === presetId)!);
  const steps = $derived(ATTR_STEPS.filter((s) => s.kind.some((k) => p.kind.includes(k))));
  const shownKinds = $derived(steps.slice(0, step + 1).flatMap((s) => s.kind));
  const done = $derived(step >= steps.length - 1);

  /** A colour per group: article and noun share one; each detail gets its own. */
  const groupTone = $derived.by(() => {
    const mids: Tone[] = ['gold', 'purple', 'green'];
    let m = 0;
    return p.kind.map((k: AttrKind): Tone => (k === 'art' || k === 'noun' ? 'blue' : k === 'rel' ? 'accent' : k === 'part' ? 'jade' : mids[m++ % mids.length]!));
  });
  const tonesFor = (map: number[]) => map.map((g) => groupTone[g]!);
  const visible = (g: number) => shownKinds.includes(p.kind[g]!);
  const litFor = (map: number[]) => map.map((g, i) => (visible(g) ? i : -1)).filter((i) => i >= 0);
  const currentKinds = $derived(steps[step]?.kind ?? []);

  function choose(id: string) {
    presetId = id;
    step = 0;
  }
  const quizItems = ATTR_QUIZ.map((q) => ({ ...q, prompt: 'Fold the relative clause into an extended attribute:' }));
</script>

<Shell label="Attribute unfolder" icon="book" tabs={['Unfold', 'Fold (quiz)']} bind:tab>
  {#if tab === 0}
    <div class="presets" role="radiogroup" aria-label="Extended attribute">
      {#each ATTR_PRESETS as x (x.id)}
        <button type="button" role="radio" aria-checked={presetId === x.id} class="chip" class:on={presetId === x.id} onclick={() => choose(x.id)} lang="de">{unmark(x.attr)}</button>
      {/each}
    </div>

    <div class="stage">
      <p class="tag ui">Extended attribute</p>
      <p class="s"><HiText text={p.attr} tones={tonesFor(p.am)} on={litFor(p.am)} size="lg" play /></p>
      <p class="en ui">{p.en}</p>
      <div class="arrow" aria-hidden="true"><Icon name="arrow" size={18} /></div>
      <p class="tag ui out">Relative clause</p>
      <p class="s built lg" lang="de">
        {#each segments(p.unfold) as seg, k (k)}{#if seg.i < 0}{#if seg.t.trim() === ',' ? visible(p.um[0]!) : true}<De text={seg.t} genders="hide" play={false} />{/if}{:else if visible(p.um[seg.i]!)}<mark class="hl t-{groupTone[p.um[seg.i]!]}" class:cur={currentKinds.includes(p.kind[p.um[seg.i]!]!)}><De text={seg.t} genders="hide" play={false} /></mark>{:else}<span class="slot" aria-label="not yet unfolded">…</span>{/if}{/each}{#if done}<PlayButton text={unmark(p.unfold)} />{/if}
      </p>
    </div>

    <ol class="steps" aria-live="polite">
      {#each steps as s, i (s.title)}
        {#if i <= step}
          <li class:cur={i === step}>
            <strong class="ui">{i + 1}. {s.title}</strong>
            <Rich text={s.kind.includes('part') ? p.explain : s.explain} />
          </li>
        {/if}
      {/each}
    </ol>
    <div class="ctrl">
      <button type="button" class="btn small" disabled={step === 0} onclick={() => (step = Math.max(0, step - 1))}><Icon name="back" size={15} />Back</button>
      <button type="button" class="btn small primary" disabled={done} onclick={() => (step = Math.min(steps.length - 1, step + 1))}>Next step<Icon name="arrow" size={15} /></button>
      <button type="button" class="btn small ghost" disabled={done} onclick={() => (step = steps.length - 1)}>Show all</button>
      <span class="count ui">{step + 1} / {steps.length}</span>
    </div>
  {:else}
    <Quiz items={quizItems} seed="attribute-unfolder" count={6} />
  {/if}
</Shell>

<style>
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-bottom: 0.8rem;
  }
  .chip {
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    border-radius: 999px;
    padding: 0.2rem 0.7rem;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 0.9rem;
    text-align: left;
  }
  .chip:hover {
    border-color: var(--mute);
  }
  .chip.on {
    border-color: var(--accent);
    background: var(--accent-soft);
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
    color: var(--mute);
  }
  .tag.out {
    color: var(--accent-ink);
  }
  .s {
    margin: 0.1rem 0 0;
  }
  .lg {
    font-size: 1.4rem;
    line-height: 1.6;
    font-weight: 560;
  }
  .en {
    margin: 0;
    font-size: 0.88rem;
    color: var(--mute);
  }
  .arrow {
    color: var(--mute);
    transform: rotate(90deg);
    width: 18px;
    margin: 0.35rem 0 0.25rem 0.4rem;
  }
  .hl {
    --hl: var(--accent-ink);
    color: var(--hl);
    background: color-mix(in srgb, var(--hl) 13%, transparent);
    border-bottom: 2px solid color-mix(in srgb, var(--hl) 60%, transparent);
    border-radius: 4px 4px 1px 1px;
    padding: 0 0.12em;
  }
  .hl.cur {
    background: color-mix(in srgb, var(--hl) 24%, transparent);
    border-bottom-color: var(--hl);
  }
  .t-accent {
    --hl: var(--accent-ink);
  }
  .t-jade {
    --hl: var(--jade);
  }
  .t-gold {
    --hl: var(--gold);
  }
  .t-blue {
    --hl: var(--g-m);
  }
  .t-purple {
    --hl: var(--g-pl);
  }
  .t-green {
    --hl: var(--g-n);
  }
  .slot {
    display: inline-block;
    min-width: 2.2em;
    margin: 0 0.15em;
    text-align: center;
    color: var(--mute);
    border-bottom: 2px dashed var(--line-strong);
    font-family: var(--font-ui);
    font-size: 0.8em;
  }
  .steps {
    list-style: none;
    margin: 0.8rem 0 0.6rem;
    padding: 0;
    display: grid;
    gap: 0.4rem;
  }
  .steps li {
    font-size: 0.95rem;
    opacity: 0.72;
  }
  .steps li.cur {
    opacity: 1;
  }
  .steps strong {
    display: block;
    font-size: 0.78rem;
    color: var(--accent-ink);
  }
  .ctrl {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem;
  }
  .count {
    margin-left: auto;
    font-size: 0.78rem;
    color: var(--mute);
  }
</style>
