<script lang="ts">
  import { untrack } from 'svelte';
  /**
   * Writing. Trace items: watch the stroke order, then write the character over a faint outline.
   * Recall items: hear a word and see its meaning, then write it from memory on an empty grid,
   * one character after another; "Show me" animates the character you are stuck on.
   */
  import type HanziWriterType from 'hanzi-writer';
  import type { Write } from '$lib/exercises/types';
  import { Sequence } from '$lib/exercises/sequence.svelte';
  import { lookup } from '$lib/zh/lexicon';
  import { annotate } from '$lib/zh/annotate';
  import { settings } from '$lib/state/settings.svelte';
  import { sfx } from '$lib/audio/sfx';
  import { speech } from '$lib/audio/speech.svelte';
  import Steps from './Steps.svelte';
  import Feedback from './Feedback.svelte';
  import HanziCanvas from '../zh/HanziCanvas.svelte';
  import PlayButton from '../zh/PlayButton.svelte';
  import CharBuild from '../zh/CharBuild.svelte';
  import Icon from '../ui/Icon.svelte';

  let { data, report }: { data: Write; id: string; report: (ok: boolean) => void } = $props();

  type Item = { kind: 'trace' | 'recall'; word: string; chars: string[]; gloss: string };
  const han = (s: string) => [...s].filter((c) => /\p{Script=Han}/u.test(c));
  function itemsOf(d: Write): Item[] {
    const trace = han(d.chars ?? '').map((ch): Item => ({ kind: 'trace', word: ch, chars: [ch], gloss: lookup(ch)?.g ?? '' }));
    const recall = (d.recall ?? []).map((line): Item => {
      const [w, g] = String(line).split('|').map((x) => x.trim());
      const word = w!.replace(/\[[^\]]*\]/g, '');
      return { kind: 'recall', word, chars: han(word), gloss: g || lookup(word)?.g || '' };
    });
    return [...trace, ...recall];
  }
  const items = $derived(itemsOf(data));
  const seq = new Sequence(untrack(() => itemsOf(data).length));
  const item = $derived(items[seq.index]!);
  /** Which character of the word is being written. */
  let sub = $state(0);
  const ch = $derived(item.chars[sub]!);
  const syllables = $derived(annotate(item.word).flatMap((t) => t.s ?? []));
  let mode = $state<'show' | 'quiz'>('show');
  let watch: HanziWriterType | undefined = $state();
  let mistakes = $state<number | null>(null);
  /** Mistakes so far on this word, and whether "Show me" was used. */
  let total = 0;
  let peeked = $state(false);

  $effect(() => {
    void seq.index;
    void seq.round;
    untrack(() => {
      sub = 0;
      total = 0;
      peeked = false;
      mistakes = null;
      mode = item.kind === 'recall' ? 'quiz' : 'show';
    });
  });

  function done(m: number) {
    total += m;
    if (item.kind === 'recall' && sub + 1 < item.chars.length) {
      sfx('right', settings.data.sounds);
      sub++;
      mode = 'quiz';
      return;
    }
    mistakes = total;
    // At most two slips per character, and from memory only if you did not need to be shown.
    const ok = total <= 2 * item.chars.length && !peeked;
    seq.attempt(ok);
    seq.settled = true;
    sfx(ok ? 'right' : 'wrong', settings.data.sounds);
    void speech.say(item.word);
  }

  function peek() {
    peeked = true;
    seq.attempt(false);
    mode = 'show';
  }

  const outline = $derived(item.kind === 'trace' || mode === 'show');
  const feedbackText = $derived(
    mistakes === null ? '' : peeked ? 'Written, with a look at the model: try it from memory next round.' : mistakes === 0 ? 'Every stroke right.' : `${mistakes} stroke slip${mistakes > 1 ? 's' : ''}.`,
  );
</script>

<Steps {seq} {report}>
  {#if item.kind === 'recall'}
    <div class="prompt">
      <span class="ui task">Write from memory</span>
      <span class="gloss-big">{item.gloss}</span>
      <span class="sy">{#each syllables as s, i (i)}<span class="t{s.tone} py">{s.py}</span>{/each}</span>
      <PlayButton text={item.word} small />
    </div>
  {/if}
  <div class="wrap">
    <div class="canvas">
      {#key `${seq.index}:${sub}:${mode}:${seq.round}`}
        <HanziCanvas char={ch} {mode} {outline} bind:writer={watch} oncomplete={done} />
      {/key}
      {#if item.chars.length > 1}
        <ol class="progress" aria-label="Characters in this word">
          {#each item.chars as c, i (i)}
            <li class:done={i < sub || mistakes !== null} class:now={i === sub && mistakes === null}>
              {#if i < sub || mistakes !== null}<span class="zh-font" lang="zh-CN">{c}</span>{:else}<span class="blank">{i + 1}</span>{/if}
            </li>
          {/each}
        </ol>
      {/if}
    </div>
    <div class="side">
      {#if item.kind === 'trace'}
        <p class="info"><span class="t{syllables[0]?.tone ?? 5} py big">{syllables[0]?.py}</span> <span class="gloss">{item.gloss}</span></p>
      {/if}
      {#if mistakes !== null || mode === 'show'}<p class="build ui"><CharBuild {ch} /></p>{/if}
      {#if mistakes !== null}
        <!-- settled: the feedback and Next button below take over -->
      {:else if item.kind === 'trace' && mode === 'show'}
        <p class="ui how">Watch the strokes, then write it yourself. Order matters: it is how your hand will remember the shape.</p>
        <div class="btns ui">
          <button class="btn" onclick={() => watch?.animateCharacter()}><Icon name="play" size={14} />Animate</button>
          <button class="btn primary" onclick={() => (mode = 'quiz')}><Icon name="brush" size={15} />Now you write it</button>
        </div>
      {:else if item.kind === 'trace'}
        <p class="ui how">Draw each stroke in order with your finger or mouse. After three misses, the next stroke is hinted.</p>
        <button class="btn small ghost" onclick={() => (mode = 'show')}>Watch again</button>
      {:else if mode === 'show'}
        <p class="ui how">Here is how it goes. Watch it, then write it again from memory.</p>
        <div class="btns ui">
          <button class="btn" onclick={() => watch?.animateCharacter()}><Icon name="play" size={14} />Animate</button>
          <button class="btn primary" onclick={() => (mode = 'quiz')}><Icon name="brush" size={15} />Write it again</button>
        </div>
      {:else}
        <p class="ui how">
          {item.chars.length > 1 ? `Character ${sub + 1} of ${item.chars.length}. ` : ''}No outline this time: draw it stroke by stroke from memory. After three misses, the next stroke is hinted.
        </p>
        <button class="btn small ghost" onclick={peek}><Icon name="eye" size={14} />Show me</button>
      {/if}
    </div>
  </div>
  {#snippet feedback()}
    {#if mistakes !== null}
      <Feedback ok={mistakes <= 2 * item.chars.length && !peeked} text={feedbackText} />
    {/if}
  {/snippet}
</Steps>

<style>
  .prompt {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem 0.6rem;
    margin: 0 0 0.9rem;
  }
  .task {
    flex-basis: 100%;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--mute);
  }
  .gloss-big {
    font-size: 1.15rem;
    font-weight: 600;
  }
  .sy {
    display: inline-flex;
    gap: 0.25rem;
  }
  .wrap {
    display: flex;
    flex-wrap: wrap;
    gap: 1.2rem;
    align-items: flex-start;
  }
  .canvas {
    display: grid;
    gap: 0.5rem;
    justify-items: center;
  }
  .progress {
    list-style: none;
    display: flex;
    gap: 0.35rem;
    margin: 0;
    padding: 0;
  }
  .progress li {
    width: 2.2rem;
    height: 2.2rem;
    display: grid;
    place-items: center;
    border: 1.5px dashed var(--line-strong);
    border-radius: 6px;
    font-size: 1.35rem;
  }
  .progress li.now {
    border-style: solid;
    border-color: var(--accent);
  }
  .progress li.done {
    border-style: solid;
  }
  .blank {
    font-size: 0.75rem;
    color: var(--mute);
  }
  .side {
    flex: 1;
    min-width: 12rem;
  }
  .info {
    margin: 0 0 0.4rem;
  }
  .py {
    color: var(--tone);
    font-weight: 700;
    font-family: var(--font-py);
  }
  .py.big {
    font-size: 1.2rem;
  }
  .gloss {
    color: var(--ink-2);
  }
  .build {
    font-size: 0.85rem;
    margin: 0 0 0.6rem;
  }
  .how {
    font-size: 0.88rem;
    color: var(--ink-2);
    margin: 0 0 0.8rem;
  }
  .btns {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
</style>
