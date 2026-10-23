<!-- The family of note values: each row fills the same bar of 4/4 with notes half as long as the row above. -->
<script lang="ts">
  import { settings } from '$lib/state/settings.svelte';
  import Score from '$lib/notation/Score.svelte';
  import Widget from '$lib/components/ui/Widget.svelte';

  const ROWS = [
    { word: 'semibreve', beats: 'four beats', src: "c''1 |" },
    { word: 'minim', beats: 'two beats', src: "c''2 c''2 |" },
    { word: 'crotchet', beats: 'one beat', src: "c''4 c''4 c''4 c''4 |" },
    { word: 'quaver', beats: 'half a beat', src: "c''8 c''8 c''8 c''8 c''8 c''8 c''8 c''8 |" },
    { word: 'semiquaver', beats: 'a quarter of a beat', src: "c''16 c'' c'' c'' c'' c'' c'' c'' c'' c'' c'' c'' c'' c'' c'' c'' |" },
  ];
</script>

<Widget title="Note values" subtitle="Each row lasts one bar of four beats. Going down, every note is split in two. Press Play on a row to hear it at 80 beats a minute.">
  <div class="tree ui">
    {#each ROWS as r (r.word)}
      <div class="row">
        <p class="name"><strong>{settings.term(r.word)}</strong> <span>{settings.term(r.word, true).replace(settings.term(r.word), '').trim()} · {r.beats}</span></p>
        <Score src={`\\time 4/4 \\tempo 80 ${r.src}`} label="A bar of {settings.term(r.word)}s" space={7} />
      </div>
    {/each}
  </div>
</Widget>

<style>
  .tree {
    display: grid;
    gap: 0;
    padding: 0.4rem 1.15rem 0.8rem;
  }
  .row {
    border-bottom: 1px solid var(--line);
  }
  .row :global(figure.score) {
    margin: 0.3rem 0 0.6rem;
  }
  .name {
    margin: 0.7rem 0 0;
    font-size: 0.95rem;
  }
  .name span {
    color: var(--ink-2);
    font-size: 0.85rem;
  }
</style>
