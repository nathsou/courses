<script lang="ts">
  import { base } from '$app/paths';
  import { PARTS, APPENDICES, COURSE_TITLE, COURSE_SUBTITLE } from '$content/outline';
  import { ALL_ENTRIES } from '$lib/content/registry';
  import { instrument } from '$lib/midi/instrument.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { identifyChord, chordSymbol } from '$lib/music/chord';
  import Keyboard from '$lib/widgets/Keyboard.svelte';
  import Score from '$lib/notation/Score.svelte';

  const available = new Set(ALL_ENTRIES.filter((e) => e.available).map((e) => `${e.kind}:${e.slug}`));
  const first = ALL_ENTRIES.find((e) => e.available);
  const held = $derived([...instrument.held]);
  const chord = $derived(held.length >= 2 ? identifyChord(held)[0] : undefined);

  const korobeiniki = String.raw`\time 4/4 \key a \minor \tempo 132
e''4 b'8 c''8 d''4 c''8 b'8 | a'4 a'8 c''8 e''4 d''8 c''8 | b'4. c''8 d''4 e''4 | c''4 a'4 a'2 |`;
</script>

<svelte:head>
  <title>{COURSE_TITLE}: {COURSE_SUBTITLE.toLowerCase()}</title>
  <meta name="description" content="An interactive course in music theory for adults learning the piano: from the layout of the keyboard to voice leading, chromatic harmony, jazz voicings and post-tonal music, with your MIDI keyboard as the instrument the course listens to." />
</svelte:head>

<div class="home">
  <header class="hero">
    <p class="eyebrow ui">An interactive course</p>
    <h1>{COURSE_TITLE}</h1>
    <p class="sub">{COURSE_SUBTITLE}</p>
    <p class="lede">
      For adults learning the piano who can play a little and want the basics explained properly, and then
      everything after them: harmony, voice leading, form, jazz voicings and music beyond the major and minor keys.
      Connect a MIDI keyboard and the course listens to what you play.
    </p>
    <div class="ctas ui">
      {#if first}<a class="start" href="{base}{first.href}">Start with the prologue →</a>{/if}
      <a class="practice" href="{base}/practice/">Practice room</a>
    </div>
  </header>

  <section class="try" aria-label="Try the keyboard">
    <Keyboard lo={48} hi={84} label="Try the keyboard" />
    <p class="ui try-status" aria-live="polite">
      {#if chord}
        You are holding <strong>{chordSymbol(chord.chord, settings.nameOptions)}</strong>.
      {:else if held.length}
        Hold two or three keys together and the course names the chord.
      {:else if instrument.status === 'ready'}
        Your MIDI keyboard is connected: play something.
      {:else}
        Click the keys, play the computer keyboard (A W S E D F …), or connect a MIDI keyboard from the top bar.
      {/if}
    </p>
  </section>

  <section class="score-preview">
    <h2>Three pieces return throughout</h2>
    <p>
      <strong>Korobeiniki</strong>, the Russian folk song the world knows from Tetris, is the running melody: each part
      ends with a new arrangement of it. <strong>Pachelbel’s Canon</strong> is the running progression and
      <strong>Chopin’s Preludes</strong> carry the harmony from simple to chromatic. Every arrangement comes at
      several playing levels.
    </p>
    <Score src={korobeiniki} caption="Korobeiniki (Russian folk song), the opening phrase." label="The opening phrase of Korobeiniki" />
  </section>

  <section class="contents">
    <h2>Contents</h2>
    {#each PARTS as part (part.id)}
      <div class="part">
        <h3><span class="pid ui">{part.id === '0' ? 'Prologue' : part.id === 'E' ? 'Epilogue' : `Part ${part.id}`}</span> {part.id === '0' || part.id === 'E' ? '' : part.title}</h3>
        <p class="blurb">{part.blurb}</p>
        <ol class="chapters ui">
          {#each part.chapters as c (c.slug)}
            <li class:planned={!available.has(`chapter:${c.slug}`)}>
              <span class="n">{c.number}</span>
              {#if available.has(`chapter:${c.slug}`)}<a href="{base}/chapters/{c.slug}/">{c.title}</a>{:else}<span>{c.title}</span>{/if}
            </li>
          {/each}
        </ol>
      </div>
    {/each}
    <div class="part">
      <h3><span class="pid ui">Appendices</span></h3>
      <ol class="chapters ui">
        {#each APPENDICES as a (a.slug)}
          <li class:planned={!available.has(`appendix:${a.slug}`)}>
            <span class="n">{a.number}</span>
            {#if available.has(`appendix:${a.slug}`)}<a href="{base}/appendix/{a.slug}/">{a.title}</a>{:else}<span>{a.title}</span>{/if}
          </li>
        {/each}
      </ol>
    </div>
    <p class="note ui">Chapters not yet written are listed in grey.</p>
  </section>
</div>

<style>
  .home {
    max-width: 52rem;
    margin: 0 auto;
    padding: 2.5rem 1rem 5rem;
  }
  .eyebrow {
    margin: 0 0 0.6rem;
    font-size: 0.74rem;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    font-weight: 600;
    color: var(--accent);
  }
  h1 {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: clamp(3rem, 10vw, 5.2rem);
    line-height: 0.95;
    margin: 0;
  }
  .sub {
    font-family: var(--font-display);
    font-size: clamp(1.4rem, 3.6vw, 1.9rem);
    font-style: italic;
    margin: 0.4rem 0 1.4rem;
    color: var(--ink-2);
  }
  .lede {
    font-size: 1.2rem;
    max-width: 40rem;
  }
  .ctas {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    margin-top: 0.4rem;
  }
  .practice {
    display: inline-block;
    padding: 0.6rem 1.2rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    text-decoration: none;
    color: var(--ink);
    font-weight: 600;
  }
  .start {
    display: inline-block;
    background: var(--accent);
    color: var(--on-accent);
    padding: 0.6rem 1.2rem;
    border-radius: var(--radius-sm);
    text-decoration: none;
    font-weight: 600;
  }
  .start:hover {
    opacity: 0.9;
  }
  .try {
    margin: 2.5rem 0 1rem;
  }
  .try-status {
    margin: 0.6rem 0 0;
    font-size: 0.92rem;
    color: var(--ink-2);
    min-height: 1.4em;
  }
  h2 {
    font-family: var(--font-display);
    font-weight: 600;
    font-size: clamp(1.8rem, 4vw, 2.3rem);
    margin: 3rem 0 0.8rem;
    padding-top: 1.2rem;
    border-top: 1px solid var(--line-strong);
  }
  h3 {
    font-family: var(--font-display);
    font-size: 1.45rem;
    font-weight: 600;
    margin: 1.8rem 0 0.2rem;
  }
  .pid {
    font-size: 0.72rem;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--accent);
    font-weight: 600;
    margin-right: 0.4rem;
    vertical-align: 0.25em;
  }
  .blurb {
    margin: 0 0 0.6rem;
    color: var(--ink-2);
    font-size: 1.02rem;
  }
  .chapters {
    list-style: none;
    padding: 0;
    margin: 0;
    columns: 2 18rem;
    column-gap: 2rem;
    font-size: 0.92rem;
  }
  .chapters li {
    display: flex;
    gap: 0.6rem;
    padding: 0.18rem 0;
    break-inside: avoid;
  }
  .chapters .n {
    min-width: 1.6rem;
    text-align: right;
    color: var(--mute);
    font-variant-numeric: tabular-nums;
  }
  .chapters a {
    color: var(--ink);
    font-weight: 600;
  }
  .planned span:last-child {
    color: var(--mute);
  }
  .note {
    margin-top: 1.5rem;
    font-size: 0.82rem;
    color: var(--mute);
  }
</style>
