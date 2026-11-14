<!--
  Run the chip from its bits. synth builds the 4-bit counter of Chapter 29 for an iCE40 HX1K; the decoded bitstream
  runs beside the RTL simulator, both in synth. Flip bits of the logic cells' truth tables and see whether the two
  still agree.

    ::corrupt-bits{n="30.6" caption="…"}
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import { lutExpression } from '$lib/widgets/lut/lut';
  import type { Synth } from '$lib/synth/api';
  import { compare, flipsFor, onChip, reachable, rtl, setup, type Comparison, type LutCell, type Setup, type Stimulus, type Trace } from './corrupt';

  let { n, caption }: { n?: string | number; caption?: string } = $props();

  const CYCLES = 20;
  let s = $state.raw<Setup | null>(null);
  let tables = $state.raw<Map<number, number>>(new Map());
  let stimulus = $state<Stimulus>('held');
  let error = $state('');
  let reference = $state.raw<Trace | null>(null);
  let chip = $state.raw<Trace | null>(null);
  let running = $state(false);
  let synth: Synth | undefined;
  let ticket = 0;

  onMount(async () => {
    try {
      const { synthOn } = await import('$lib/synth/client');
      synth = synthOn('sim');
      s = await setup(synthOn('run'));
      tables = new Map(s.cells.map((c) => [c.index, c.table]));
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  });

  // Run the source and the chip whenever the bits or the stimulus change; only the latest answer is kept.
  $effect(() => {
    const t = tables;
    const st = stimulus;
    if (!s || !synth) return;
    const mine = ++ticket;
    running = true;
    const timer = setTimeout(async () => {
      try {
        const [a, b] = await Promise.all([rtl(synth!, st, CYCLES), onChip(synth!, s!, flipsFor(s!, t), st, CYCLES)]);
        if (mine === ticket) ((reference = a), (chip = b));
      } catch (e) {
        if (mine === ticket) error = e instanceof Error ? e.message : String(e);
      } finally {
        if (mine === ticket) running = false;
      }
    }, 100);
    return () => clearTimeout(timer);
  });

  const result = $derived<Comparison | null>(reference && chip ? compare(reference, chip) : null);
  const flipped = $derived(s ? flipsFor(s, tables).length : 0);

  const table = (c: LutCell) => tables.get(c.index) ?? c.table;
  function flip(c: LutCell, r: number) {
    tables = new Map(tables).set(c.index, table(c) ^ (1 << r));
  }
  function invert(c: LutCell) {
    tables = new Map(tables).set(c.index, table(c) ^ 0xffff);
  }
  function restore() {
    if (s) tables = new Map(s.cells.map((c) => [c.index, c.table]));
  }
  /** What the cell computes, with its unconnected inputs at 0. */
  function expression(c: LutCell): string {
    const t = table(c);
    let seen = 0;
    for (let r = 0; r < 16; r++) {
      const read = c.inputs.reduce((acc, p, k) => (p === null ? acc & ~(1 << k) : acc), r);
      if ((t >> read) & 1) seen |= 1 << r;
    }
    return lutExpression(seen, c.inputs.map((p, k) => p ?? `I${k}`));
  }
  const hex = (v: number) => v.toString(16);
</script>

<Widget {n} title="Corrupt the bitstream" subtitle="The chip runs its bits, not your source" {caption} kind="Chip vs RTL" onreset={() => (restore(), (stimulus = 'held'))}>
  {#snippet controls()}
    <Segmented label="Stimulus" value={stimulus} onchange={(v) => (stimulus = v)} options={[{ value: 'held', label: 'Enable held high' }, { value: 'varied', label: 'Enable low every third cycle' }]} size="sm" />
    <Button size="sm" onclick={restore} disabled={flipped === 0}>Restore the bits</Button>
  {/snippet}

  <div class="cb">
    {#if error}
      <p class="err ui" role="alert">{error}</p>
    {:else if !s}
      <p class="wait ui">synth is building the counter for an iCE40 HX1K. Its logic cells will appear here, each with the 16 bits of its lookup table, and the chip will run beside the RTL simulator.</p>
    {:else}
      <p class="lead ui">The two rows show the count after each clock (<code>clear</code> low), on the RTL simulator and on the chip decoded from the bits. Each box under them is one logic cell of the counter as synth built it, and each square one bit of its truth table (entry number in the corner; faded entries are never read, because an unconnected input reads 0): click a bit to flip it.</p>
      {#if reference && chip && result}
        <div class="runs" aria-label="The count after each clock, on the RTL simulator and on the chip">
          <div class="row"><span class="rl ui">RTL</span>{#each reference.count as v, i (i)}<span class="v">{hex(v)}</span>{/each}</div>
          <div class="row"><span class="rl ui">chip</span>{#each chip.count as v, i (i)}<span class="v" class:bad={v !== reference.count[i] || chip.wrapped[i] !== reference.wrapped[i]}>{hex(v)}</span>{/each}</div>
        </div>
        <div class="verdict ui" class:bad={result.first > 0} role="status">
          {#if running}
            synth is running the source and the chip…
          {:else if result.first}
            <b>Mismatch</b> on {result.outputs.join(' and ')}, first at clock {result.first}: the chip and the source disagree.
          {:else}
            <b>The chip agrees with the RTL simulator</b> (count and wrapped after each of {CYCLES} clocks){flipped ? `, although you flipped ${flipped} bit${flipped === 1 ? '' : 's'}: nothing in this run read them` : ''}.
          {/if}
        </div>
      {/if}
      <div class="cells">
        {#each s.cells as c (c.index)}
          <div class="cell">
            <div class="ch ui"><b>{c.label}</b><span>tile ({c.x}, {c.y}) cell {c.z}{c.ff ? ', flip-flop' : ''}{c.drives.length ? ` → ${c.drives.join(', ')}` : ''}</span></div>
            <div class="ins ui">{#each c.inputs as p, k (k)}<span>I{k}: {p ?? '–'}</span>{/each}</div>
            <div class="grid" role="group" aria-label="Truth table of {c.label}">
              {#each Array.from({ length: 16 }, (_, r) => r) as r (r)}
                {@const one = (table(c) >> r) & 1}
                <button
                  type="button"
                  class:one={one === 1}
                  class:hit={((table(c) ^ c.table) >> r) & 1}
                  class:unread={!reachable(c, r)}
                  aria-pressed={one === 1}
                  aria-label="{c.label} table entry {r}, now {one}{reachable(c, r) ? '' : ' (never read)'}"
                  onclick={() => flip(c, r)}
                ><i>{r}</i>{one}</button>
              {/each}
            </div>
            <div class="fn ui"><code>{expression(c)}</code> <button type="button" class="inv" onclick={() => invert(c)} title="Flip all 16 bits of this table">Invert</button></div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</Widget>

<style>
  .cb {
    display: grid;
    gap: 0.65rem;
    padding: 0.8rem 1rem 1rem;
  }
  .lead,
  .wait {
    margin: 0;
    font-size: 0.84rem;
    color: var(--ink-2);
  }
  .err {
    color: var(--bad);
  }
  .cells {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
    gap: 0.6rem;
  }
  .cell {
    border: 1px solid var(--line);
    border-radius: 7px;
    padding: 0.4rem 0.5rem 0.5rem;
    background: var(--panel);
    display: grid;
    gap: 0.3rem;
    min-width: 0;
    align-content: start;
  }
  .ch {
    display: flex;
    flex-direction: column;
    line-height: 1.2;
  }
  .ch b {
    font: 600 0.82rem var(--font-mono);
    color: var(--fg);
  }
  .ch span {
    font-size: 0.66rem;
    color: var(--mute);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 2px;
  }
  .grid button {
    position: relative;
    aspect-ratio: 1;
    min-height: 1.5rem;
    min-width: 0;
    border: 1px solid var(--line-strong);
    border-radius: 3px;
    background: var(--pn);
    color: var(--mute);
    font: 600 0.78rem var(--font-mono);
    cursor: pointer;
    padding: 0;
  }
  .grid button.one {
    background: color-mix(in srgb, var(--sig-high) 30%, var(--panel));
    border-color: var(--sig-high);
    color: var(--fg);
  }
  .grid button.hit {
    outline: 2px solid var(--bad);
    outline-offset: 1px;
  }
  .grid button.unread {
    opacity: 0.4;
  }
  .ins {
    display: grid;
    grid-template-columns: 1fr 1fr;
    font-family: var(--font-mono);
    font-size: 0.64rem;
    color: var(--mute);
    overflow-wrap: anywhere;
  }
  .grid i {
    position: absolute;
    top: 1px;
    left: 2px;
    font: 400 0.5rem var(--font-mono);
    font-style: normal;
    color: var(--mute);
  }
  .fn {
    font-size: 0.72rem;
    color: var(--mute);
    overflow-wrap: anywhere;
  }
  .fn code {
    font-family: var(--font-mono);
  }
  .inv {
    font: 600 0.68rem var(--font-ui);
    padding: 0.1rem 0.4rem;
    margin-left: 0.3rem;
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    background: var(--panel);
    color: var(--ink-2);
    cursor: pointer;
  }
  .inv:hover {
    border-color: var(--copper);
  }
  .runs {
    display: grid;
    gap: 0.2rem;
    overflow-x: auto;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 2px;
  }
  .rl {
    width: 2.6rem;
    flex: none;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--mute);
  }
  .v {
    width: 1.35rem;
    flex: none;
    text-align: center;
    font: 600 0.82rem var(--font-mono);
    padding: 0.1rem 0;
    border-radius: 3px;
    background: var(--pn);
    color: var(--fg);
  }
  .v.bad {
    background: var(--bad-soft);
    color: var(--bad);
    outline: 1px solid var(--bad);
  }
  .verdict {
    font-size: 0.84rem;
    padding: 0.45rem 0.7rem;
    border-radius: 6px;
    border-left: 3px solid var(--ok);
    background: var(--ok-soft);
    color: var(--ink-2);
  }
  .verdict.bad {
    border-color: var(--bad);
    background: var(--bad-soft);
  }
  .verdict b {
    color: var(--fg);
  }
</style>
