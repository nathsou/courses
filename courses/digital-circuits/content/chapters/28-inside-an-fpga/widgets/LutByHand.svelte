<!--
  One logic cell of a real iCE40, programmed by hand. synth builds an XOR gate for an HX1K (one logic cell, three
  pads) and the reader rewrites its truth table: the 16 entries are 16 bits of the cell's tile, and the widget
  flips the ones that differ from what synth wrote. synth then decodes the edited bitstream back into cells and
  runs them for the four input pairs, so the check is what the bits do, not what the reader meant.

    ::lut-by-hand{n="28.6" caption="…"}
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { buildXor } from './upset';
  import { GOALS, HandExpressionError, flipsFor, handCell, hex, onChip, reachable, tableFromExpression, type HandCell } from './byhand';

  let { n, caption }: { n?: string | number; caption?: string } = $props();

  let hc = $state.raw<HandCell | undefined>();
  let error = $state('');
  let table = $state(0);
  let goal = $state('xor');
  let expr = $state('');
  let exprError = $state('');
  let got = $state('');
  let running = $state(false);
  let synth: import('$lib/synth/api').Synth | undefined;
  let ticket = 0;

  onMount(async () => {
    try {
      const { synthOn } = await import('$lib/synth/client');
      synth = synthOn('sim');
      hc = handCell(await buildXor(synthOn('run')));
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  });

  // Run the edited bitstream whenever the table changes; only the latest answer is kept.
  $effect(() => {
    const t = table;
    if (!hc || !synth) return;
    const mine = ++ticket;
    running = true;
    const timer = setTimeout(async () => {
      try {
        const out = await onChip(synth!, hc!, t);
        if (mine === ticket) got = out;
      } catch (e) {
        if (mine === ticket) got = `error: ${e instanceof Error ? e.message : String(e)}`;
      } finally {
        if (mine === ticket) running = false;
      }
    }, 120);
    return () => clearTimeout(timer);
  });

  const want = $derived(GOALS.find((g) => g.id === goal)!.want);
  const reached = $derived(!running && got === want);
  const flips = $derived(hc ? flipsFor(hc, table) : []);
  const lutBits = $derived(new Map((hc?.cell.lut_bits ?? []).map((b, i) => [b, i])));
  const tileSet = $derived(new Set(hc?.built.result.bitstream?.tiles.find((t) => t.x === hc!.tile.x && t.y === hc!.tile.y)?.set ?? []));

  /** Whether tile bit i is 1 once the reader's table is written. */
  function bitOn(i: number): boolean {
    const e = lutBits.get(i);
    return e === undefined ? tileSet.has(i) : !!((table >> e) & 1);
  }

  function toggle(r: number) {
    table ^= 1 << r;
  }

  function typed() {
    if (!hc) return;
    try {
      table = tableFromExpression(hc, expr);
      exprError = '';
    } catch (e) {
      exprError = e instanceof HandExpressionError ? e.message : String(e);
    }
  }

  const inputName = (p: string | null) => p ?? '0';
  const pairs = ['00', '01', '10', '11'];
  const ROWS = Array.from({ length: 16 }, (_, r) => r);
</script>

<Widget
  {n}
  title="Program a logic cell by hand"
  subtitle="The XOR gate’s logic cell on an iCE40 HX1K: write its 16 bits, and synth runs the bitstream"
  {caption}
  onreset={() => ((table = 0), (expr = ''), (exprError = ''), (goal = 'xor'))}
>
  {#snippet controls()}
    <div class="ctl ui">
      <span class="lbl">Goal: y =</span>
      {#each GOALS as g (g.id)}
        <button type="button" class="goal" class:on={goal === g.id} aria-pressed={goal === g.id} onclick={() => (goal = g.id)}>{g.label}</button>
      {/each}
    </div>
  {/snippet}

  <div class="hand">
    {#if error}
      <p class="err ui">{error}</p>
    {:else if !hc}
      <p class="note ui">synth is building the XOR gate, to borrow its logic cell…</p>
    {:else}
      <p class="note ui">
        The cell is logic cell {hc.cell.z} of tile ({hc.tile.x}, {hc.tile.y}). synth routed pad <b>a</b> to its input I{hc.inputs.indexOf('a')}, pad <b>b</b> to I{hc.inputs.indexOf('b')}, and its output to pad <b>y</b>;
        {hc.inputs.filter((p) => p === null).length === 2 ? 'the other two inputs are not connected, and read 0' : 'the unconnected inputs read 0'}. The table starts empty: every bit is yours.
      </p>
      <div class="cols">
        <div class="tt" role="group" aria-label="The truth table: 16 stored bits">
          <table class="ui">
            <thead>
              <tr>
                {#each [3, 2, 1, 0] as k (k)}<th scope="col">I{k}<span class="who">{inputName(hc.inputs[k]!)}</span></th>{/each}
                <th scope="col">stored</th>
              </tr>
            </thead>
            <tbody>
              {#each ROWS as r (r)}
                <tr class:unread={!reachable(hc, r)}>
                  {#each [3, 2, 1, 0] as k (k)}<td>{(r >> k) & 1}</td>{/each}
                  <td>
                    <button type="button" class="bit" class:one={(table >> r) & 1} aria-pressed={!!((table >> r) & 1)} aria-label="Entry {r}: {(table >> r) & 1}{reachable(hc, r) ? '' : ' (never read)'}" onclick={() => toggle(r)}>{(table >> r) & 1}</button>
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
          <p class="hint ui">Greyed rows have an unconnected input at 1: the chip never reads them.</p>
        </div>

        <div class="side">
          <form class="expr ui" onsubmit={(e) => (e.preventDefault(), typed())}>
            <label for="byhand-expr">Or type a function of a and b</label>
            <div class="row">
              <input id="byhand-expr" type="text" bind:value={expr} placeholder="a ^ b" spellcheck="false" autocomplete="off" />
              <Button size="sm" type="submit">Write it</Button>
            </div>
            {#if exprError}<p class="err">{exprError}</p>{/if}
          </form>
          <p class="ui hexline">Table <b>{hex(table)}</b>; {flips.length} bit{flips.length === 1 ? '' : 's'} of synth’s bitstream flipped. synth wrote {hex(hc.table)}.</p>

          <figure class="tile">
            <figcaption class="ui">Tile ({hc.tile.x}, {hc.tile.y}): 16 rows of {hc.tile.w} bits. The cell’s 16 table bits are outlined.</figcaption>
            <div class="grid" style:--w={hc.tile.w}>
              {#each Array.from({ length: 16 * hc.tile.w }, (_, i) => i) as i (i)}
                <span class="tb" class:on={bitOn(i)} class:lut={lutBits.has(i)} title={lutBits.has(i) ? `entry ${lutBits.get(i)} of the table` : undefined}></span>
              {/each}
            </div>
          </figure>

          <div class="run ui" aria-live="polite">
            <table>
              <thead><tr><th scope="col">a b</th><th scope="col">y on the chip</th><th scope="col">goal</th></tr></thead>
              <tbody>
                {#each pairs as ab, i (ab)}
                  <tr class:bad={got[i] !== undefined && got[i] !== want[i]}>
                    <td>{ab[0]} {ab[1]}</td>
                    <td>{running ? '…' : (got[i] ?? '?')}</td>
                    <td>{want[i]}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
            <p class:good={reached} class="verdict">
              {#if running}synth is decoding the bitstream and running it…{:else if got.startsWith('error')}{got}{:else if reached}Goal reached: the bits make y = {GOALS.find((g) => g.id === goal)!.label}.{:else}Not yet: the rows in red differ from the goal.{/if}
            </p>
          </div>
        </div>
      </div>
    {/if}
  </div>
</Widget>

<style>
  .hand {
    display: grid;
    gap: 0.6rem;
    padding: 0.8rem 1rem 1rem;
  }
  .ctl {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
  }
  .lbl {
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .goal {
    font: inherit;
    font-size: 0.76rem;
    padding: 0.15rem 0.5rem;
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
  }
  .goal.on {
    border-color: var(--accent);
    background: var(--copper-soft);
  }
  .note,
  .err,
  .hint,
  .hexline {
    margin: 0;
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .hint {
    font-size: 0.74rem;
    color: var(--mute);
    margin-top: 0.2rem;
  }
  .err {
    color: var(--bad);
  }
  .cols {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    align-items: flex-start;
  }
  .side {
    display: grid;
    gap: 0.6rem;
    flex: 1 1 18rem;
    min-width: 0;
  }
  table {
    border-collapse: collapse;
    font-size: 0.78rem;
    font-family: var(--font-mono);
  }
  th,
  td {
    padding: 0.05rem 0.45rem;
    text-align: center;
  }
  th {
    font-weight: 600;
    border-bottom: 1px solid var(--line);
  }
  .who {
    display: block;
    font-weight: 400;
    color: var(--accent);
    text-transform: none;
  }
  tr.unread td {
    color: var(--mute);
    opacity: 0.55;
  }
  .bit {
    width: 1.6rem;
    font: inherit;
    border: 1px solid var(--line-strong);
    border-radius: 3px;
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
  }
  .bit.one {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }
  .expr label {
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .expr .row {
    display: flex;
    gap: 0.4rem;
    margin-top: 0.2rem;
  }
  .expr input {
    flex: 1;
    min-width: 0;
    font-family: var(--font-mono);
    font-size: 0.82rem;
    padding: 0.2rem 0.4rem;
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    background: var(--panel);
    color: var(--fg);
  }
  .tile {
    margin: 0;
    min-width: 0;
    overflow-x: auto;
  }
  figcaption {
    font-size: 0.72rem;
    color: var(--mute);
    margin-bottom: 0.2rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(var(--w), 6px);
    gap: 1px;
  }
  .tb {
    width: 6px;
    height: 6px;
    border-radius: 1px;
    background: var(--surface-2, var(--line));
  }
  .tb.on {
    background: var(--accent);
  }
  .tb.lut {
    outline: 1.5px solid var(--focus);
  }
  .run tr.bad td {
    color: var(--bad);
    font-weight: 600;
  }
  .verdict {
    margin: 0.3rem 0 0;
    font-size: 0.84rem;
  }
  .good {
    color: var(--ok);
    font-weight: 600;
  }
  b {
    font-family: var(--font-mono);
  }
</style>
