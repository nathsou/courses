<!--
  A spreadsheet driven by the signals engine. Every cell is a signal holding its text; every formula cell is a computed
  that reads other cells; each cell on the screen is written by an effect. Edit a cell: the trace shows which computeds
  actually ran. Select a cell to see what it read and what read it. Nothing in the code lists dependencies.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { createEngine, type Computed, type Signal } from '$lib/rx/signals';
  import { compile } from '$lib/rx/formula';

  let { n, title = 'A spreadsheet is a signals program', caption }: { n?: string | number; title?: string; caption?: string } = $props();

  const COLS = ['A', 'B', 'C', 'D'];
  const ROWS = [1, 2, 3, 4, 5];
  const IDS = ROWS.flatMap((r) => COLS.map((c) => `${c}${r}`));

  const PRESETS: Record<string, { label: string; cells: Record<string, string> }> = {
    orders: {
      label: 'Orders',
      cells: {
        A1: 'Price', B1: 'Qty', C1: 'Total', D1: 'Tax 20%',
        A2: '4', B2: '3', C2: '=A2*B2', D2: '=C2*0.2',
        A3: '10', B3: '1', C3: '=A3*B3', D3: '=C3*0.2',
        A4: '2.5', B4: '8', C4: '=A4*B4', D4: '=C4*0.2',
        A5: 'Sum', C5: '=SUM(C2:C4)', D5: '=SUM(D2:D4)',
      },
    },
    branch: {
      label: 'A branch (IF)',
      cells: {
        A1: 'Switch', B1: '1', C1: 'Cheap', D1: 'Pricey',
        A2: 'Pick', B2: '=IF(B1>0, C3, D3)',
        A3: 'Values', C3: '5', D3: '500',
        A4: 'Doubled', B4: '=B2*2',
        A5: 'Unrelated', B5: '=C3+1',
      },
    },
    cycle: { label: 'A cycle', cells: { A1: '=B1+1', B1: '=A1+1', A2: '7', B2: '=A2*2' } },
  };

  let preset = $state('orders');
  let selected = $state('C2');
  let shown = $state<Record<string, string>>({});
  let raws = $state<Record<string, string>>({});
  let last = $state<{ edited: string; ran: string[]; formulas: number } | null>(null);
  let edges = $state<{ reads: string[]; readBy: string[] }>({ reads: [], readBy: [] });

  interface Cell { raw: Signal<string>; value: Computed<string | number>; stop: () => void }
  let engine = createEngine('colour');
  let cells: Record<string, Cell> = {};
  let byNode = new Map<number, string>();

  function build() {
    engine = createEngine('colour');
    engine.tracing = true;
    cells = {};
    byNode = new Map();
    const cur = PRESETS[preset]!.cells;
    for (const id of IDS) {
      const raw = engine.signal(cur[id] ?? '', { label: `${id}.text` });
      const value = engine.computed<string | number>(
        () => {
          try {
            return compile(raw.get())((ref) => (cells[ref] ? (cells[ref]!.value.get() as number | string) : 0));
          } catch (e) {
            const m = e instanceof Error ? e.message : String(e);
            return m.startsWith('Cycle') ? '#CYCLE' : m.startsWith('#') ? m : '#ERR';
          }
        },
        { label: id },
      );
      cells[id] = { raw, value, stop: () => {} };
      byNode.set(value.id, id);
    }
    for (const id of IDS) {
      cells[id]!.stop = engine.effect(() => {
        const v = cells[id]!.value.get();
        shown[id] = typeof v === 'number' ? String(Math.round(v * 1000) / 1000) : String(v);
      });
      raws[id] = cur[id] ?? '';
    }
    engine.trace.length = 0;
    last = null;
    inspect();
  }

  function inspect() {
    const g = engine.graph();
    const node = g.find((x) => x.id === cells[selected]?.value.id);
    const reads = (node?.sources ?? []).map((s) => byNode.get(s)).filter((x): x is string => !!x);
    const readBy = g.filter((x) => x.sources.includes(cells[selected]?.value.id ?? -1)).map((x) => byNode.get(x.id)).filter((x): x is string => !!x);
    edges = { reads, readBy };
  }

  function edit(id: string, text: string) {
    raws[id] = text;
    engine.trace.length = 0;
    cells[id]!.raw.set(text);
    const isFormula = (i: string) => raws[i]?.startsWith('=');
    const ran = [...new Set(engine.trace.filter((e) => e.type === 'run').map((e) => byNode.get(e.node)).filter((x): x is string => !!x && x !== id && !!isFormula(x)))];
    last = { edited: id, ran, formulas: IDS.filter((i) => i !== id && isFormula(i)).length };
    inspect();
  }
  function select(id: string) {
    selected = id;
    inspect();
  }
  build();
  let first = true;
  $effect(() => {
    preset;
    if (first) {
      first = false;
      return;
    }
    untrack(() => {
      for (const id of IDS) cells[id]?.stop();
      build();
    });
  });
  const role = (id: string) => (id === selected ? 'sel' : edges.reads.includes(id) ? 'reads' : edges.readBy.includes(id) ? 'readby' : '');
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="Edit a cell; the trace lists the formulas that actually re-ran. Select a cell to see its neighbours in the graph.">
  {#snippet controls()}
    <Segmented label="Sheet" bind:value={preset} options={Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label }))} />
  {/snippet}
  <div class="bar ui">
    <label for="fx"><b>{selected}</b></label>
    <input id="fx" value={raws[selected] ?? ''} onchange={(e) => edit(selected, e.currentTarget.value)} spellcheck="false" aria-label="Contents of {selected}" />
  </div>
  <div class="grid" role="grid" aria-label="Spreadsheet">
    <div class="corner"></div>
    {#each COLS as c (c)}<div class="colh ui">{c}</div>{/each}
    {#each ROWS as r (r)}
      <div class="rowh ui">{r}</div>
      {#each COLS as c (c)}
        {@const id = `${c}${r}`}
        <button type="button" class="cell {role(id)}" class:formula={raws[id]?.startsWith('=')} class:ran={last?.ran.includes(id)} class:err={shown[id]?.startsWith('#')} onclick={() => select(id)} aria-label="{id}: {shown[id]}" aria-pressed={selected === id}>{shown[id] ?? ''}</button>
      {/each}
    {/each}
  </div>
  <ul class="key ui">
    <li><span class="sw sel"></span>selected</li>
    <li><span class="sw reads"></span>read by the selected cell</li>
    <li><span class="sw readby"></span>reads the selected cell</li>
    <li><span class="sw ran"></span>formula re-ran after the last edit</li>
  </ul>
  <p class="out ui" aria-live="polite">
    {#if last}
      You edited <b>{last.edited}</b>. Of the {last.formulas} other formula{last.formulas === 1 ? '' : 's'}, <b>{last.ran.length}</b> re-ran{last.ran.length ? `: ${last.ran.join(', ')}` : ''}. Recalculating the whole sheet would have run {last.formulas === 1 ? 'it' : 'all of them'}.
    {:else}
      Change a number. Try changing B1 in the “A branch” sheet, then D3 and C3, and watch which formulas run.
    {/if}
  </p>
</Widget>

<style>
  .bar {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.6rem;
  }
  .bar b {
    display: inline-block;
    min-width: 2rem;
    text-align: center;
    font-family: var(--font-mono);
    padding: 0.2rem 0.4rem;
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    background: var(--pn);
  }
  .bar input {
    flex: 1;
    font-family: var(--font-mono);
    font-size: 0.86rem;
    padding: 0.3rem 0.5rem;
    border: 1px solid var(--line-strong);
    border-radius: 5px;
    background: var(--bg);
    color: var(--fg);
    min-width: 0;
  }
  .grid {
    display: grid;
    grid-template-columns: 2rem repeat(4, minmax(3.5rem, 1fr));
    gap: 1px;
    background: var(--line);
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    overflow: hidden;
  }
  .corner, .colh, .rowh {
    background: var(--pn);
    text-align: center;
    font-size: 0.72rem;
    color: var(--mute);
    padding: 0.3rem 0;
  }
  .cell {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    text-align: right;
    padding: 0.4rem 0.5rem;
    background: var(--panel);
    border: 0;
    color: var(--fg);
    cursor: pointer;
    min-height: 2.2rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .cell.formula { color: var(--computed); }
  .cell.err { color: var(--red); }
  .cell:focus-visible { outline: 2px solid var(--focus); outline-offset: -2px; }
  .cell.sel { outline: 2px solid var(--ink-blue); outline-offset: -2px; background: var(--ink-blue-soft); }
  .cell.reads { background: var(--signal-soft); }
  .cell.readby { background: var(--effect-soft); }
  .cell.ran { box-shadow: inset 0 0 0 3px var(--flash); }
  .key {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 1rem;
    list-style: none;
    padding: 0;
    margin: 0.6rem 0 0.3rem;
    font-size: 0.74rem;
    color: var(--ink-2);
  }
  .sw {
    display: inline-block;
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 2px;
    margin-right: 0.3rem;
    vertical-align: -2px;
    border: 1px solid var(--line-strong);
  }
  .sw.sel { background: var(--ink-blue-soft); border-color: var(--ink-blue); }
  .sw.reads { background: var(--signal-soft); }
  .sw.readby { background: var(--effect-soft); }
  .sw.ran { background: var(--panel); border: 2px solid var(--flash); }
  .out {
    margin: 0.3rem 0 0;
    font-size: 0.84rem;
    color: var(--ink-2);
  }
</style>
