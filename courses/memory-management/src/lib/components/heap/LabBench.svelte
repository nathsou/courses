<!--
  The lab bench (PLAN §7, chapter 14 and /lab): the reader's allocator in an editor, every trace in the bank run
  against it in a worker (so an infinite loop can be stopped), each under a memory limit, scored with the malloc
  lab's performance index, and placed on a leaderboard with the reference allocators.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Widget from '../ui/Widget.svelte';
  import CodeEditor from '$lib/exercise/CodeEditor.svelte';
  import { impls } from '$lib/state/impl.svelte';
  import { REFERENCE } from '$lib/mm/heap/allocators';
  import { TRACE_BANK } from '$lib/mm/trace/trace';
  import { runTrace } from '$lib/mm/check/checker';
  import { BENCH_TESTS, benchCapacity, benchRow, benchScore, type BenchRow } from '$lib/mm/check/bench';
  import type { StorageViolation } from '$lib/mm/check/storage';
  import { IMPLICIT_TEMPLATE, BLANK_TEMPLATE } from './labTemplates';

  let { n = '14.1', full = false }: { n?: string; full?: boolean } = $props();

  const DRAFT = 'memory-management:lab-draft';
  const BEST = 'memory-management:lab-best';
  const store = {
    get(k: string): string | null {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    },
    set(k: string, v: string) {
      try {
        localStorage.setItem(k, v);
      } catch {
        /* not remembered */
      }
    },
  };

  let editor = $state<CodeEditor | undefined>();
  let code = $state(IMPLICIT_TEMPLATE);
  let mine = $state<string | undefined>();
  let running = $state(false);
  let rows = $state<BenchRow[] | null>(null);
  let error = $state('');
  let storage = $state<StorageViolation[]>([]);
  let ranAt = $state('');
  let best = $state<number | null>(null);
  let saved = $state(false);
  let refs = $state<{ id: string; label: string; score: number }[]>([]);

  onMount(() => {
    impls.load();
    mine = impls.get('allocator');
    const draft = store.get(DRAFT);
    const start = draft ?? mine ?? IMPLICIT_TEMPLATE;
    code = start;
    editor?.setValue(start);
    const b = store.get(BEST);
    if (b) best = Number(b);
    void scoreReferences();
  });

  async function scoreReferences() {
    const out: typeof refs = [];
    for (const a of REFERENCE) {
      const rs: BenchRow[] = [];
      for (const t of TRACE_BANK) {
        await new Promise((r) => setTimeout(r, 0));
        rs.push(benchRow(t.id, t.name, runTrace(a.make, t.ops, { cache: true, capacity: benchCapacity(t.ops) })));
      }
      out.push({ id: a.id, label: a.label, score: benchScore(rs) });
      refs = [...out];
    }
  }

  function load(which: 'mine' | 'implicit' | 'blank') {
    const c = which === 'mine' ? mine! : which === 'implicit' ? IMPLICIT_TEMPLATE : BLANK_TEMPLATE;
    code = c;
    editor?.setValue(c);
    store.set(DRAFT, c);
    rows = null;
  }

  async function run() {
    if (running) return;
    running = true;
    error = '';
    storage = [];
    saved = false;
    const submitted = code;
    store.set(DRAFT, submitted);
    const { runExercise } = await import('$lib/exercise/runner');
    const r = await runExercise({ id: 'lab', code: submitted, tests: BENCH_TESTS, storage: true }, 60_000);
    running = false;
    ranAt = submitted;
    storage = r.storage ?? [];
    const parsed = r.logs.filter((l) => l.startsWith('@@')).map((l) => JSON.parse(l.slice(2)) as BenchRow);
    if (!r.ok || r.results.some((t) => !t.passed)) {
      error = r.error ?? r.results.find((t) => !t.passed)?.error ?? 'The bench did not finish.';
    }
    rows = parsed.length ? parsed : null;
    if (rows && rows.length === TRACE_BANK.length) {
      const s = benchScore(rows);
      if (best === null || s > best) {
        best = s;
        store.set(BEST, String(s));
      }
    }
  }

  const score = $derived(rows ? benchScore(rows) : null);
  const allPass = $derived(!!rows && rows.length === TRACE_BANK.length && rows.every((r) => r.ok));
  const stale = $derived(!!rows && ranAt !== code);
  const board = $derived.by(() => {
    const list = refs.map((r) => ({ ...r, you: false }));
    if (score !== null) list.push({ id: 'you', label: 'Your allocator', score, you: true });
    return list.sort((a, b) => b.score - a.score);
  });
  const verdict = $derived.by(() => {
    if (score === null || refs.length < REFERENCE.length) return '';
    const beaten = refs.filter((r) => r.score < score).length;
    const seg = refs.find((r) => r.id === 'segregated')!;
    if (!allPass) return 'Fix the failing traces first: a trace that fails scores zero.';
    if (score > seg.score + 10) return 'Well clear of segregated fits. That is a serious allocator.';
    if (score > seg.score) return 'You beat segregated fits, the design glibc’s malloc descends from.';
    if (beaten >= refs.length / 2) return `You beat ${beaten} of the ${refs.length} reference allocators. Segregated fits is the one to catch.`;
    return `You beat ${beaten} of the ${refs.length} reference allocators. Look at the column that drags your score down.`;
  });

  function useIt() {
    impls.save('allocator', code);
    mine = code;
    saved = true;
  }

  const pct = (x: number) => `${Math.round(x * 100)}%`;
</script>

<Widget title="The lab bench" kind="Workbench" {n} caption="Your allocator runs every trace in a separate worker, through the heap checker, with the heap limited to four times the trace’s peak live data. Each trace scores 60% for utilisation and 40% for throughput (full marks at 60 cycles per operation or fewer); a failing trace scores zero.">
  <div class="top ui">
    <span class="lbl">Start from</span>
    <button onclick={() => load('implicit')}>The implicit list (chapter 10)</button>
    <button onclick={() => load('mine')} disabled={!mine} title={mine ? 'The allocator you saved' : 'Pass the implicit-list exercise in chapter 10, or save one here'}>My saved allocator</button>
    <button onclick={() => load('blank')}>A blank page</button>
  </div>
  <div class="editor" class:full>
    <CodeEditor bind:this={editor} value={code} onchange={(c) => (code = c)} onrun={run} label="Your allocator" minLines={full ? 30 : 16} />
  </div>
  <div class="actions ui">
    <button class="run" onclick={run} disabled={running}>{running ? 'Running the bench…' : '▶ Run the bench'}</button>
    <span class="kbd">or Ctrl/⌘ + Enter</span>
    {#if allPass && !stale}
      <button onclick={useIt} disabled={saved}>{saved ? 'Saved: the figures will offer it' : 'Use this allocator in the figures'}</button>
    {/if}
  </div>

  {#if storage.length}
    <div class="err ui" role="alert"><strong>Storage rule.</strong> Bookkeeping must live in the heap. {#each storage as v, i (i)}<span class="mono">line {v.line}: {v.message}</span>{/each}</div>
  {:else if error && !rows}
    <div class="err ui" role="alert"><strong>The bench could not run.</strong> <span class="mono">{error}</span></div>
  {/if}

  {#if rows}
    <div class="results" class:stale>
      {#if stale}<p class="stale-note ui">You have edited the code since this run.</p>{/if}
      <div class="score">
        <div class="big mono">{score!.toFixed(1)}</div>
        <div class="ui">
          <div class="lbl">Performance index</div>
          {#if best !== null}<div class="pb">Personal best {best.toFixed(1)}</div>{/if}
          <p class="verdict">{verdict}</p>
        </div>
      </div>
      <div class="table-scroll">
        <table class="ui">
          <thead><tr><th>Trace</th><th></th><th>Utilisation</th><th>Cycles / op</th><th>Score</th></tr></thead>
          <tbody>
            {#each rows as r (r.id)}
              <tr class:fail={!r.ok}>
                <th scope="row">{r.name}</th>
                <td>{r.ok ? '✓' : '✗'}</td>
                <td class="mono">{r.ok ? pct(r.utilisation) : '—'}</td>
                <td class="mono">{r.ok ? Math.round(r.cycles) : '—'}</td>
                <td class="mono">{r.index.toFixed(0)}</td>
              </tr>
              {#if r.failure}<tr class="why"><td colspan="5">{r.failure}</td></tr>{/if}
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <div class="board">
    <div class="lbl ui">Leaderboard</div>
    {#if !refs.length}<p class="ui mute">Scoring the reference allocators…</p>{/if}
    {#each board as b (b.id)}
      <div class="bar-row ui" class:you={b.you}>
        <span class="name">{b.label}</span>
        <span class="track"><span class="fill" style:width="{Math.max(1, b.score)}%"></span></span>
        <span class="mono val">{b.score.toFixed(1)}</span>
      </div>
    {/each}
  </div>
</Widget>

<style>
  .top,
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.8rem;
  }
  .top {
    margin-bottom: 0.6rem;
  }
  .lbl {
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-2);
  }
  button {
    font: inherit;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 99px;
    padding: 0.2rem 0.75rem;
    cursor: pointer;
  }
  button:disabled {
    opacity: 0.55;
    cursor: default;
  }
  button.run {
    background: var(--copper);
    border-color: var(--copper);
    color: var(--on-accent);
    font-weight: 600;
    padding: 0.35rem 1rem;
  }
  .kbd {
    color: var(--mute);
    font-size: 0.74rem;
  }
  .actions {
    margin-top: 0.6rem;
  }
  .editor.full :global(.cm-editor) {
    max-height: 70vh;
  }
  .err {
    margin-top: 0.7rem;
    padding: 0.6rem 0.8rem;
    border-left: 3px solid var(--uaf);
    background: color-mix(in srgb, var(--uaf) 8%, transparent);
    font-size: 0.82rem;
    display: grid;
    gap: 0.2rem;
  }
  .results {
    margin-top: 1rem;
    transition: opacity 0.2s;
  }
  .results.stale {
    opacity: 0.6;
  }
  .stale-note {
    font-size: 0.78rem;
    color: var(--mute);
    margin: 0 0 0.4rem;
  }
  .score {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 0.6rem;
  }
  .big {
    font-size: 2.6rem;
    font-weight: 600;
    color: var(--copper);
    line-height: 1;
  }
  .pb {
    font-size: 0.78rem;
    color: var(--mute);
  }
  .verdict {
    margin: 0.2rem 0 0;
    font-size: 0.86rem;
  }
  .table-scroll {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.8rem;
  }
  th,
  td {
    padding: 0.3rem 0.5rem;
    border-bottom: 1px solid var(--line);
    text-align: left;
  }
  thead th {
    font-size: 0.72rem;
    color: var(--ink-2);
  }
  tbody th {
    font-weight: 600;
  }
  tr.fail td,
  tr.fail th {
    color: var(--uaf);
  }
  tr.why td {
    font-size: 0.76rem;
    color: var(--ink-2);
    border-bottom: 1px solid var(--line);
    padding-top: 0;
  }
  .board {
    margin-top: 1.1rem;
    display: grid;
    gap: 0.3rem;
  }
  .mute {
    color: var(--mute);
    font-size: 0.8rem;
  }
  .bar-row {
    display: grid;
    grid-template-columns: minmax(8rem, 14rem) 1fr 3rem;
    gap: 0.6rem;
    align-items: center;
    font-size: 0.8rem;
  }
  .bar-row .name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .track {
    height: 0.7rem;
    background: var(--line);
    border-radius: 99px;
    overflow: hidden;
  }
  .fill {
    display: block;
    height: 100%;
    background: var(--alloc);
    border-radius: 99px;
    transition: width 0.5s ease;
  }
  .bar-row.you .fill {
    background: var(--copper);
  }
  .bar-row.you .name {
    color: var(--copper);
    font-weight: 700;
  }
  .val {
    text-align: right;
  }
  @media (max-width: 520px) {
    .bar-row {
      grid-template-columns: 7rem 1fr 2.6rem;
    }
  }
</style>
