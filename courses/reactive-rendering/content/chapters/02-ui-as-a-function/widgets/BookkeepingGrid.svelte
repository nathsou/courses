<!--
  The bookkeeping of updating the DOM by hand. Five things can happen to the Notes app and five pieces of the page
  depend on its state. Whoever writes the handlers must decide, for each pair, whether this action updates that piece.
  Tick the cells you think are needed, then run a scripted session and see which piece of the page goes stale first.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';

  let { n, title = 'The bookkeeping grid', caption }: { n?: string | number; title?: string; caption?: string } = $props();

  type Note = { id: number; text: string; done: boolean };
  type Action = 'add' | 'toggle' | 'rename' | 'remove' | 'clearDone';
  type Binding = 'list' | 'labels' | 'marks' | 'summary' | 'empty';

  const ACTIONS: { id: Action; label: string }[] = [
    { id: 'add', label: 'add a note' },
    { id: 'toggle', label: 'toggle a note' },
    { id: 'rename', label: 'rename a note' },
    { id: 'remove', label: 'remove a note' },
    { id: 'clearDone', label: 'clear done notes' },
  ];
  const BINDINGS: { id: Binding; label: string; hint: string }[] = [
    { id: 'list', label: 'which <li>s exist', hint: 'the list of items' },
    { id: 'labels', label: 'item text', hint: 'each note’s words' },
    { id: 'marks', label: 'item ✓ marks', hint: 'which notes show ✓' },
    { id: 'summary', label: '“N notes, M done”', hint: 'the summary line' },
    { id: 'empty', label: '“No notes yet”', hint: 'shown when the list is empty' },
  ];

  /** What each piece of the page shows, as a function of the state. */
  const expected: Record<Binding, (s: Note[]) => string> = {
    list: (s) => s.map((x) => x.id).join(','),
    labels: (s) => s.map((x) => x.text).join('|'),
    marks: (s) => s.map((x) => (x.done ? '✓' : '·')).join(''),
    summary: (s) => `${s.length} notes, ${s.filter((x) => x.done).length} done`,
    empty: (s) => (s.length === 0 ? 'No notes yet' : ''),
  };
  /** The truth: which bindings each action can change. */
  const TRUTH: Record<Action, Binding[]> = {
    add: ['list', 'labels', 'marks', 'summary', 'empty'],
    toggle: ['marks', 'summary'],
    rename: ['labels'],
    remove: ['list', 'summary', 'empty'],
    clearDone: ['list', 'summary', 'empty'],
  };
  const SESSION: Action[] = ['add', 'toggle', 'rename', 'add', 'remove', 'toggle', 'clearDone', 'remove', 'remove', 'add'];

  function step(s: Note[], a: Action, k: number): Note[] {
    switch (a) {
      case 'add': return [...s, { id: 100 + k, text: `note ${k}`, done: false }];
      case 'toggle': return s.map((x, i) => (i === 0 ? { ...x, done: !x.done } : x));
      case 'rename': return s.map((x, i) => (i === 0 ? { ...x, text: x.text + '!' } : x));
      case 'remove': return s.slice(1);
      case 'clearDone': return s.filter((x) => !x.done);
    }
  }

  // A plausible first attempt: a few cells forgotten.
  let grid = $state<Record<Action, Record<Binding, boolean>>>({
    add: { list: true, labels: true, marks: false, summary: true, empty: true },
    toggle: { list: false, labels: false, marks: true, summary: false, empty: false },
    rename: { list: false, labels: true, marks: false, summary: false, empty: false },
    remove: { list: true, labels: false, marks: false, summary: true, empty: false },
    clearDone: { list: true, labels: false, marks: false, summary: false, empty: true },
  });
  let log = $state<{ action: Action; stale: Binding[]; ok: boolean }[] | null>(null);

  const mustTick = Object.values(TRUTH).reduce((n, b) => n + b.length, 0);
  const wrongCells = $derived(
    ACTIONS.flatMap((a) => BINDINGS.filter((b) => grid[a.id][b.id] !== TRUTH[a.id].includes(b.id)).map((b) => `${a.id}/${b.id}`)),
  );

  function run() {
    let state: Note[] = [
      { id: 1, text: 'Buy milk', done: true },
      { id: 2, text: 'Write chapter', done: false },
    ];
    const shown: Record<Binding, string> = Object.fromEntries(BINDINGS.map((b) => [b.id, expected[b.id](state)])) as Record<Binding, string>;
    const out: { action: Action; stale: Binding[]; ok: boolean }[] = [];
    SESSION.forEach((a, k) => {
      if (a !== 'add' && state.length === 0) {
        out.push({ action: a, stale: [], ok: true }); // nothing to act on
        return;
      }
      state = step(state, a, k);
      for (const b of BINDINGS) if (grid[a][b.id]) shown[b.id] = expected[b.id](state);
      const stale = BINDINGS.filter((b) => shown[b.id] !== expected[b.id](state)).map((b) => b.id);
      out.push({ action: a, stale, ok: stale.length === 0 });
    });
    log = out;
  }
  function reveal() {
    for (const a of ACTIONS) for (const b of BINDINGS) grid[a.id][b.id] = TRUTH[a.id].includes(b.id);
    log = null;
  }
  const firstBad = $derived(log?.findIndex((l) => !l.ok) ?? -1);
  const badCount = $derived(log ? log.filter((l) => !l.ok).length : 0);
</script>

<Widget {title} {n} {caption} kind="Exercise" subtitle="Five actions, five pieces of page. Which handler must update which piece?">
  {#snippet controls()}
    <Button variant="primary" onclick={run}>Run a 10-action session</Button>
    <Button onclick={reveal}>Fill in the right answer</Button>
    <span class="count ui">{mustTick} of 25 cells need a tick</span>
  {/snippet}
  <div class="wrap">
    <table class="grid ui" aria-label="Which action updates which part of the page">
      <thead>
        <tr><th></th>{#each BINDINGS as b (b.id)}<th title={b.hint}>{b.label}</th>{/each}</tr>
      </thead>
      <tbody>
        {#each ACTIONS as a (a.id)}
          <tr>
            <th scope="row">when I {a.label}</th>
            {#each BINDINGS as b (b.id)}
              <td>
                <label class="cell"><input type="checkbox" bind:checked={grid[a.id][b.id]} onchange={() => (log = null)} /><span class="sr">update {b.label} when I {a.label}</span></label>
              </td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
    <div class="out ui" aria-live="polite">
      {#if !log}
        <p class="empty">Tick the cells, then run a session.</p>
      {:else if badCount === 0}
        <p class="good">✓ All 10 actions left the page consistent with the state.</p>
        {#if wrongCells.length}<p class="hint">…but this grid ticks {wrongCells.length} cells more than needed: harmless, but each one is an update that was not necessary.</p>{/if}
      {:else}
        <p class="bad">✗ The page went stale after action {firstBad + 1}: <b>{log[firstBad]!.action}</b>. Stale: {log[firstBad]!.stale.map((s) => BINDINGS.find((b) => b.id === s)!.label).join(', ')}.</p>
        <ol class="session">
          {#each log as l, i (i)}
            <li class:bad={!l.ok}>{i + 1}. {l.action}{#if !l.ok} — stale: {l.stale.join(', ')}{/if}</li>
          {/each}
        </ol>
      {/if}
    </div>
  </div>
</Widget>

<style>
  .wrap {
    display: grid;
    gap: 1rem;
  }
  .grid {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.82rem;
  }
  .grid th {
    text-transform: none;
    letter-spacing: 0;
    font-family: var(--font-ui);
    font-weight: 600;
    text-align: left;
    padding: 0.35rem 0.5rem;
    color: var(--ink-2);
  }
  .grid thead th {
    font-size: 0.72rem;
    vertical-align: bottom;
    text-align: center;
  }
  .grid tbody th {
    white-space: nowrap;
  }
  .grid td {
    text-align: center;
    border-top: 1px solid var(--line);
    padding: 0.2rem;
  }
  .cell {
    display: inline-grid;
    place-items: center;
    width: 2rem;
    height: 2rem;
    cursor: pointer;
  }
  .cell input {
    width: 1.1rem;
    height: 1.1rem;
    accent-color: var(--ink-blue);
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
  }
  .count {
    font-size: 0.8rem;
    color: var(--mute);
  }
  .out p {
    margin: 0 0 0.4rem;
    font-size: 0.88rem;
  }
  .good { color: var(--green); }
  .bad { color: var(--red); }
  .hint, .empty { color: var(--mute); }
  .session {
    margin: 0.3rem 0 0;
    padding: 0;
    list-style: none;
    font-family: var(--font-mono);
    font-size: 0.76rem;
    columns: 2 14rem;
  }
  .session li.bad { color: var(--red); }
  @media (max-width: 640px) {
    .grid thead th { font-size: 0.64rem; padding: 0.2rem; }
    .grid tbody th { white-space: normal; font-size: 0.74rem; }
  }
</style>
