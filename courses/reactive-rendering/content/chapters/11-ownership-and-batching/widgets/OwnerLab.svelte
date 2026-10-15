<!--
  An effect that creates an effect. A "card" effect reads which user is selected and, for each user, creates an inner
  effect that listens to a clock. With plain effects the inner effects pile up: nobody ever disposes the old ones. With
  ownership, re-running the card disposes everything it created. Both runs use the real engines from the lab.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { createEngine, type Engine, type Signal, type Strategy } from '$lib/rx/signals';

  let { n, title = 'Who cleans up?', caption, mode: initial = 'plain' }: { n?: string | number; title?: string; caption?: string; mode?: string } = $props();

  let mode = $state<'plain' | 'owned'>(initial === 'owned' ? 'owned' : 'plain');
  const NAMES = ['Ada', 'Grace', 'Edsger', 'Barbara', 'Donald'];

  interface Created { label: string; user: number; parent: string }
  interface Line { user: number; tick: number; stale: boolean }

  let engine: Engine | null = null;
  let user: Signal<number> | null = null;
  let tick: Signal<number> | null = null;
  let created = $state.raw<Created[]>([]);
  let alive = $state.raw<Set<string>>(new Set());
  let lines = $state.raw<Line[]>([]);
  let shownUser = $state(0);
  let ticks = $state(0);
  let counter = 0;
  let madeList: Created[] = [];
  let outList: Line[] = [];

  function reset() {
    const strategy: Strategy = mode === 'owned' ? 'colour' : 'eager';
    const e = createEngine(strategy);
    const u = e.signal(0, { label: 'user' });
    const t = e.signal(0, { label: 'clock' });
    const made: Created[] = (madeList = [{ label: 'card', user: -1, parent: '' }]);
    const out: Line[] = (outList = []);
    counter = 0;
    engine = e;
    user = u;
    tick = t;
    ticks = 0;
    // The "card": rebuilds its clock listener whenever the user changes.
    e.createRoot(() => {
      e.effect(
        () => {
          const who = u.get();
          const label = `clock #${++counter} for ${NAMES[who % NAMES.length]}`;
          made.push({ label, user: who, parent: 'card' });
          let first = true;
          e.effect(
            () => {
              const k = t.get();
              if (first) {
                first = false;
                return;
              }
              out.push({ user: who, tick: k, stale: who !== u.peek() });
            },
            { label },
          );
        },
        { label: 'card' },
      );
    });
    sync();
  }
  function sync() {
    const e = engine!;
    alive = new Set(e.graph().map((g) => g.label));
    created = [...madeList];
    lines = [...outList];
    shownUser = user!.peek();
    ticks = tick!.peek();
  }
  $effect(() => {
    mode;
    untrack(reset);
  });

  const nextUser = () => {
    user!.update((v) => v + 1);
    sync();
  };
  const tickClock = () => {
    const before = lines.length;
    tick!.update((v) => v + 1);
    sync();
    lastBatch = lines.length - before;
  };
  let lastBatch = $state(0);
  const liveClocks = $derived([...alive].filter((l) => l.startsWith('clock #')).length);
  const staleLines = $derived(lines.filter((l) => l.stale).length);
  const recent = $derived(lines.slice(-8));
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="A card shows one user and listens to a clock for that user. Switch user several times, then tick the clock.">
  {#snippet controls()}
    <Segmented
      label="Effects"
      bind:value={mode}
      options={[
        { value: 'plain', label: 'Plain effects', title: 'The eager engine has no notion of ownership' },
        { value: 'owned', label: 'Owned effects', title: 'The three-colour engine disposes what an effect created' },
      ]}
    />
  {/snippet}

  <div class="actions ui">
    <Button variant="primary" onclick={nextUser}>Show the next user</Button>
    <Button variant="primary" onclick={tickClock}>Tick the clock</Button>
    <Button variant="ghost" onclick={reset}>Reset</Button>
  </div>

  <div class="cols">
    <div class="tree ui">
      <div class="h">The effects that exist</div>
      <ul>
        <li>
          <span class="n card">card</span> <span class="who">shows {NAMES[shownUser % NAMES.length]}</span>
          <ul>
            {#each created.filter((c) => c.parent === 'card') as c (c.label)}
              <li class:dead={!alive.has(c.label)}>
                <span class="n">{c.label}</span> <span class="state">{alive.has(c.label) ? 'alive' : 'disposed'}</span>
              </li>
            {/each}
          </ul>
        </li>
      </ul>
    </div>

    <div class="log ui">
      <div class="h">Clock ticks handled ({ticks} so far)</div>
      {#if lines.length === 0}
        <p class="empty">Nothing yet.</p>
      {:else}
        <ol>
          {#each recent as l, i (i)}
            <li class:stale={l.stale}>tick {l.tick}: handler for <b>{NAMES[l.user % NAMES.length]}</b>{#if l.stale} <span class="flag">(not shown any more)</span>{/if}</li>
          {/each}
        </ol>
      {/if}
    </div>
  </div>

  <p class="out ui" aria-live="polite">
    <b>{liveClocks}</b> clock listener{liveClocks === 1 ? ' is' : 's are'} alive.
    {#if lastBatch > 1}The last tick ran <b>{lastBatch}</b> handlers.{/if}
    {#if staleLines > 0}<b class="bad">{staleLines}</b> run{staleLines === 1 ? '' : 's'} so far were for a user no longer on screen.{/if}
  </p>
</Widget>

<style>
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 0.7rem;
  }
  .cols {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: 0.8rem;
  }
  .tree,
  .log {
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
    padding: 0.6rem 0.75rem;
    font-size: 0.84rem;
    min-height: 9rem;
  }
  .h {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--mute);
    margin-bottom: 0.4rem;
  }
  ul,
  ol {
    margin: 0;
    padding-left: 1.2rem;
  }
  .tree ul ul {
    margin-top: 0.2rem;
    border-left: 2px solid var(--line-strong);
  }
  .n {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    padding: 0.05rem 0.35rem;
    border-radius: 4px;
    border: 1px solid var(--effect);
    background: var(--effect-soft);
  }
  .n.card {
    font-weight: 700;
  }
  .state {
    font-size: 0.74rem;
    color: var(--signal-ink, var(--signal));
  }
  .who {
    color: var(--ink-2);
    font-size: 0.78rem;
  }
  li.dead .n {
    border-style: dashed;
    border-color: var(--line-strong);
    background: none;
    color: var(--mute);
    text-decoration: line-through;
  }
  li.dead .state {
    color: var(--mute);
  }
  .log li.stale {
    color: var(--red);
  }
  .flag {
    margin-left: 0.35em;
    font-size: 0.76rem;
  }
  .empty {
    color: var(--mute);
    margin: 0;
  }
  .out {
    margin: 0.7rem 0 0;
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .bad {
    color: var(--red);
  }
</style>
