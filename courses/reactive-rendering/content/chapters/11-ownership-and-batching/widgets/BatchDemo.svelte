<!--
  Two writes, one effect. Without a batch the effect runs after each write and sees a name that was never set.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { createEngine, type Engine, type Signal } from '$lib/rx/signals';

  let { n, title = 'Two writes, one update', caption }: { n?: string | number; title?: string; caption?: string } = $props();

  const PEOPLE = [
    ['Ada', 'Lovelace'],
    ['Grace', 'Hopper'],
    ['Edsger', 'Dijkstra'],
    ['Barbara', 'Liskov'],
  ] as const;

  let batched = $state('no');
  let i = 0;
  let seen = $state.raw<string[]>([]);
  let log: string[] = [];
  let engine: Engine;
  let first: Signal<string>;
  let last: Signal<string>;

  function reset() {
    engine = createEngine('colour');
    first = engine.signal(PEOPLE[0][0]);
    last = engine.signal(PEOPLE[0][1]);
    log = [];
    i = 0;
    engine.effect(() => {
      log.push(`${first.get()} ${last.get()}`);
    });
    seen = [...log];
  }
  $effect(() => {
    batched;
    untrack(reset);
  });

  function rename() {
    i = (i + 1) % PEOPLE.length;
    const [f, l] = PEOPLE[i]!;
    const write = () => {
      first.set(f);
      last.set(l);
    };
    if (batched === 'yes') engine.batch(write);
    else write();
    seen = [...log];
  }
  const torn = (s: string) => !PEOPLE.some(([f, l]) => `${f} ${l}` === s);
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="Rename the person: two signals, first and last name, are written one after the other. An effect shows the full name.">
  {#snippet controls()}
    <Segmented label="Batch the writes" bind:value={batched} options={[{ value: 'no', label: 'No batch' }, { value: 'yes', label: 'batch(() => { … })' }]} />
  {/snippet}
  <div class="actions ui">
    <Button variant="primary" onclick={rename}>Next person</Button>
    <Button variant="ghost" onclick={reset}>Reset</Button>
  </div>
  <div class="ui seen" aria-live="polite">
    <span class="h">What the effect showed, in order</span>
    <ol>
      {#each seen as s, k (k)}<li class:torn={torn(s)}>{s}{#if torn(s)} <span class="flag">← nobody’s name</span>{/if}</li>{/each}
    </ol>
  </div>
</Widget>

<style>
  .actions {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.7rem;
  }
  .seen {
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
    padding: 0.6rem 0.75rem;
    font-size: 0.86rem;
  }
  .h {
    display: block;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--mute);
    margin-bottom: 0.3rem;
  }
  ol {
    margin: 0;
    padding-left: 1.3rem;
    columns: 2 11rem;
  }
  li.torn {
    color: var(--red);
    font-weight: 600;
  }
  .flag {
    margin-left: 0.35em;
    font-size: 0.76rem;
    font-weight: 400;
  }
</style>
