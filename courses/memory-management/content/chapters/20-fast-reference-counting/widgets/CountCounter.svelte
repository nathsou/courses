<!--
  The count counter: one Mote program runs under reference counting while every pointer write is logged. From the
  log, the figure counts the reference-count updates each scheme would make: naive (every write, to variables and
  fields, plus releasing locals at each return), deferred (fields only), deferred and coalesced (per field, only
  the first old value and the last new one in each epoch), and how many of the naive updates would have to be
  atomic with and without biasing. Decrements made while freeing objects are the same in every scheme and are
  left out.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { Vm, type Frame } from '$lib/mm/mote/vm';
  import { RcManager } from '$lib/mm/managers/managers';
  import { PROGRAMS } from '$lib/mm/mote/programs';

  interface Store {
    /** The object and field written (or the variable's address), so that reused memory is not confused. */
    slot: string;
    old: number;
    value: number;
    heap: boolean;
    stmt: number;
  }

  class LoggingRc extends RcManager {
    log: Store[] = [];
    frameReleases = 0;
    stmt = 0;
    onStatement(): void {
      this.stmt++;
      super.onStatement();
    }
    onStore(slot: number, old: number, value: number, holder: number, weak: boolean): void {
      if (!weak && old !== value) this.log.push({ slot: holder ? `${this.vm.byAddr.get(holder)}:${slot - holder}` : `v${slot}`, old, value, heap: holder !== 0, stmt: this.stmt });
      super.onStore(slot, old, value, holder, weak);
    }
    onFrameExit(f: Frame): void {
      f.fn.locals.forEach((l, i) => {
        if (l.ptr && this.vm.stack.peek(this.vm.slotAddr(f, i))) this.frameReleases++;
      });
      super.onFrameExit(f);
    }
  }

  const CURSOR = `struct Node { value: int, next: Node? }
struct Cursor { at: Node? }

fn main() {
  var list: Node? = null
  for i in 0..50 {
    list = new Node { value: i, next: list }
  }
  let c = new Cursor { at: null }
  var total = 0
  for round in 0..10 {
    c.at = list
    while c.at != null {
      total = total + c.at.value
      c.at = c.at.next
    }
  }
  print(total)
}`;
  const SOURCES: Record<string, { name: string; src: string }> = {
    list: { name: 'Build and sum a list', src: PROGRAMS.list },
    cursor: { name: 'A cursor walking a list', src: CURSOR },
    churn: { name: 'Short-lived pairs', src: PROGRAMS.churn },
    trees: { name: 'Binary trees', src: PROGRAMS.trees },
  };
  let program = $state('list');
  let epoch = $state(20);

  const run = $derived.by(() => {
    const m = new LoggingRc();
    const vm = new Vm(SOURCES[program]!.src, m, { heapBytes: 1 << 20, oracle: false });
    vm.run();
    return { log: m.log, frameReleases: m.frameReleases, statements: m.stmt };
  });
  const ups = (s: Store) => (s.old ? 1 : 0) + (s.value ? 1 : 0);
  const naive = $derived(run.log.reduce((n, s) => n + ups(s), 0) + run.frameReleases);
  const deferred = $derived(run.log.filter((s) => s.heap).reduce((n, s) => n + ups(s), 0));
  const coalesced = $derived.by(() => {
    const first = new Map<string, Store>();
    const last = new Map<string, Store>();
    for (const s of run.log) {
      if (!s.heap) continue;
      const k = `${Math.floor(s.stmt / epoch)}:${s.slot}`;
      if (!first.has(k)) first.set(k, s);
      last.set(k, s);
    }
    let n = 0;
    for (const [k, f] of first) {
      const l = last.get(k)!;
      if (f.old !== l.value) n += (f.old ? 1 : 0) + (l.value ? 1 : 0);
    }
    return n;
  });
  const rows = $derived([
    { name: 'Naive', n: naive, note: 'every pointer write, to variables and fields, and every local released at a return' },
    { name: 'Deferred', n: deferred, note: 'writes to fields only; variables are not counted (the stack is scanned now and then instead)' },
    { name: 'Deferred and coalesced', n: coalesced, note: `per field, only the first old value and the last new one in each epoch of ${epoch} statements` },
  ]);
  const max = $derived(Math.max(1, naive));
</script>

<Widget title="The count counter" kind="Compare" n="20.1" caption="Count updates for one run of each program under three schemes. Decrements made while freeing objects (a cascade) are the same in every scheme and are not shown.">
  <div class="cfg ui" role="radiogroup" aria-label="Program">
    {#each Object.keys(SOURCES) as p (p)}
      <button role="radio" aria-checked={program === p} class:on={program === p} onclick={() => (program = p)}>{SOURCES[p]!.name}</button>
    {/each}
  </div>
  <div class="bars ui">
    {#each rows as r (r.name)}
      <div class="row">
        <div class="name">{r.name}</div>
        <div class="track"><span class="fill" style:width="{(100 * r.n) / max}%"></span></div>
        <div class="val mono">{r.n.toLocaleString('en-GB')}</div>
        <div class="note">{r.note}</div>
      </div>
    {/each}
  </div>
  <label class="ep ui">Coalescing epoch <strong>{epoch}</strong> statements <input type="range" min="1" max="200" bind:value={epoch} /></label>
  <div class="atomic ui">
    <div><strong>If the program had several threads</strong>, each naive update would need an atomic instruction, because another thread might update the same count at the same moment: <span class="mono">{naive.toLocaleString('en-GB')}</span> atomic updates.</div>
    <div><strong>With biased counting</strong>, the thread that created an object updates its own count with ordinary instructions, and only other threads pay for atomics. In this single-threaded run, that is <span class="mono">0</span> atomic updates.</div>
  </div>
  <details class="src ui"><summary>The program</summary><pre class="mono">{SOURCES[program]!.src}</pre></details>
  <p class="foot ui">{run.statements.toLocaleString('en-GB')} statements ran; {run.log.length.toLocaleString('en-GB')} pointer writes changed a pointer.</p>
</Widget>

<style>
  .cfg {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    font-size: 0.8rem;
  }
  .cfg button {
    font: inherit;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 99px;
    padding: 0.15rem 0.7rem;
    cursor: pointer;
  }
  .cfg button.on {
    background: var(--copper);
    border-color: var(--copper);
    color: var(--on-accent);
    font-weight: 600;
  }
  .bars {
    margin-top: 0.9rem;
    display: grid;
    gap: 0.55rem;
  }
  .row {
    display: grid;
    grid-template-columns: 11rem 1fr 4.5rem;
    gap: 0.2rem 0.7rem;
    align-items: center;
    font-size: 0.84rem;
  }
  .name {
    font-weight: 600;
  }
  .track {
    height: 0.9rem;
    background: var(--line);
    border-radius: 99px;
    overflow: hidden;
  }
  .fill {
    display: block;
    height: 100%;
    background: var(--copper);
    transition: width 0.4s ease;
  }
  .val {
    text-align: right;
  }
  .note {
    grid-column: 2 / 4;
    font-size: 0.74rem;
    color: var(--ink-2);
  }
  @media (max-width: 560px) {
    .row {
      grid-template-columns: 1fr 4rem;
    }
    .name {
      grid-column: 1 / 3;
    }
    .note {
      grid-column: 1 / 3;
    }
  }
  .ep {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-top: 0.8rem;
    font-size: 0.82rem;
  }
  .atomic {
    margin-top: 0.8rem;
    display: grid;
    gap: 0.4rem;
    font-size: 0.82rem;
    padding: 0.6rem 0.75rem;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 6px;
  }
  .src {
    margin-top: 0.6rem;
    font-size: 0.8rem;
  }
  .src pre {
    font-size: 0.74rem;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 0.5rem 0.7rem;
    overflow-x: auto;
  }
  .foot {
    font-size: 0.74rem;
    color: var(--mute);
    margin: 0.6rem 0 0;
  }
</style>
