<script lang="ts">
  import { untrack } from 'svelte';
  /**
   * der, die or das? Each noun comes from the dictionary; after answering, the ending rule that
   * predicts it (if any) is shown, and with `plural` the learner then types the plural.
   */
  import type { Gender } from '$lib/exercises/types';
  import { Sequence } from '$lib/exercises/sequence.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { speech } from '$lib/audio/speech.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { lookup, nounKey } from '$lib/de/lexicon';
  import { ruleFor } from '$lib/de/gender';
  import { mark } from '$lib/de/check';
  import { articleOf } from '$lib/de/notation';
  import Steps from './Steps.svelte';
  import Feedback from './Feedback.svelte';
  import UmlautKeys from '../de/UmlautKeys.svelte';
  import { typing } from '$lib/exercises/keys';

  let { data, report }: { data: Gender; id: string; report: (ok: boolean) => void } = $props();
  const seq = new Sequence(untrack(() => data.items.length));
  const noun = $derived(data.items[seq.index]!);
  const key = $derived(nounKey(noun));
  const entry = $derived(key ? lookup(key) : undefined);
  const right = $derived(entry?.a === 'pl' ? 'die' : entry?.a ? articleOf[entry.a] : undefined);
  const rule = $derived(ruleFor(noun));
  let picked = $state<string | null>(null);
  let wrong = $state<Set<string>>(new Set());
  let stage = $state<'article' | 'plural'>('article');
  let plural = $state('');
  let input: HTMLInputElement | undefined = $state();
  let pluralResult = $state<'right' | 'almost' | 'wrong' | null>(null);
  const askPlural = $derived(!!data.plural && !!entry?.pl && entry.a !== 'pl');

  $effect(() => {
    void seq.index;
    void seq.round;
    picked = null;
    wrong = new Set();
    stage = 'article';
    plural = '';
    pluralResult = null;
  });

  function pick(a: string) {
    if (stage !== 'article' || picked || wrong.has(a)) return;
    const ok = a === right;
    sfx(ok ? 'right' : 'wrong', settings.data.sounds);
    if (!ok) {
      wrong = new Set([...wrong, a]);
      seq.attempt(false);
      return;
    }
    picked = a;
    void speech.say(`${a} ${noun}`);
    if (askPlural) {
      stage = 'plural';
      setTimeout(() => input?.focus(), 50);
    } else seq.attempt(true);
  }
  function checkPlural(e: Event) {
    e.preventDefault();
    if (!entry?.pl || !plural.trim()) return;
    const typed = plural.replace(/^die\s+/i, '');
    const m = mark(typed, entry.pl, { lenient: settings.data.lenientSpelling });
    pluralResult = m.verdict;
    const ok = m.verdict !== 'wrong';
    sfx(ok ? 'right' : 'wrong', settings.data.sounds);
    seq.attempt(ok);
    if (ok) void speech.say(`die ${entry.pl}`);
  }
  function onKey(e: KeyboardEvent) {
    if (typing(e)) return;
    const map: Record<string, string> = { '1': 'der', '2': 'die', '3': 'das' };
    if (map[e.key]) pick(map[e.key]!);
  }
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="gender" onkeydown={onKey}>
<Steps {seq} {report} canReveal={wrong.size > 0 || pluralResult === 'wrong'} onreveal={() => ((picked = right ?? null), (plural = entry?.pl ?? ''), (pluralResult = 'right'))}>
  <div class="noun" lang="de">
    {#if picked}<span class="art g-{entry?.a}">{picked}</span>{:else}<span class="blank">___</span>{/if}
    <span class:g-m={!!picked && entry?.a === 'm'} class:g-f={!!picked && entry?.a === 'f'} class:g-n={!!picked && entry?.a === 'n'} class:g-pl={!!picked && entry?.a === 'pl'}>{noun}</span>
  </div>
  {#if picked && entry}<p class="gloss ui">{entry.g}</p>{/if}
  {#if stage === 'article'}
    <div class="arts" role="group" aria-label="Article">
      {#each ['der', 'die', 'das'] as a, i (a)}
        <button class="art-btn {a}" class:wrong={wrong.has(a)} disabled={wrong.has(a) || !!picked} onclick={() => pick(a)}><span class="n ui">{i + 1}</span>{a}</button>
      {/each}
    </div>
  {:else}
    <form class="pl" onsubmit={checkPlural}>
      <label class="ui" for="pl-{noun}">And the plural? <b>die</b></label>
      <input id="pl-{noun}" bind:this={input} bind:value={plural} lang="de" autocomplete="off" autocapitalize="off" spellcheck="false" readonly={seq.settled} class:right={pluralResult === 'right'} class:almost={pluralResult === 'almost'} />
      {#if !seq.settled}<button class="btn" disabled={!plural.trim()}>Check</button>{/if}
    </form>
    {#if !seq.settled}<UmlautKeys target={input} oninput={(v) => (plural = v)} />{/if}
  {/if}
  {#snippet feedback()}
    {#if seq.settled && entry}
      <Feedback
        ok={wrong.size === 0 && pluralResult !== 'wrong'}
        almost={pluralResult === 'almost'}
        text={`{${right} ${noun}}${entry.pl ? `, plural {die ${entry.pl}}` : ''}.`}
        explain={rule ? `Nouns ending in ${rule.ending} are ${rule.strength} ${{ m: 'masculine', f: 'feminine', n: 'neuter' }[rule.gender]}${rule.note ? ` (${rule.note})` : ''}.${rule.gender !== entry.a ? ' This one is an exception.' : ''}` : undefined}
      />
    {:else if wrong.size && stage === 'article'}
      <Feedback ok={false} text="Try another." />
    {:else if pluralResult === 'wrong'}
      <Feedback ok={false} text="Not that plural. Have another go." />
    {/if}
  {/snippet}
</Steps>
</div>

<style>
  .noun {
    font-size: 2.2rem;
    font-weight: 650;
    text-align: center;
    margin: 0.4rem 0 0.2rem;
    display: flex;
    justify-content: center;
    gap: 0.5rem;
  }
  .blank {
    color: var(--line-strong);
  }
  .gloss {
    text-align: center;
    margin: 0 0 0.6rem;
    color: var(--ink-2);
  }
  .arts {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    margin-top: 0.8rem;
  }
  .art-btn {
    position: relative;
    font-family: var(--font-body);
    font-size: 1.35rem;
    font-weight: 650;
    padding: 0.6rem 0.4rem;
    border-radius: 14px;
    border: 2px solid var(--line-strong);
    background: var(--panel);
    cursor: pointer;
  }
  .art-btn.der { color: var(--g-m); }
  .art-btn.die { color: var(--g-f); }
  .art-btn.das { color: var(--g-n); }
  .art-btn:hover:not(:disabled) {
    border-color: currentColor;
  }
  .art-btn.wrong {
    opacity: 0.4;
    text-decoration: line-through;
  }
  .n {
    position: absolute;
    left: 0.5rem;
    top: 0.3rem;
    font-size: 0.65rem;
    color: var(--mute);
  }
  .pl {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin: 0.6rem 0 0.4rem;
  }
  .pl input {
    flex: 1;
    min-width: 8rem;
    font-size: 1.1rem;
    padding: 0.45rem 0.7rem;
    border-radius: 10px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
  }
  input.right { border-color: var(--jade); background: var(--jade-soft); }
  input.almost { border-color: var(--gold); background: var(--gold-soft); }
</style>
