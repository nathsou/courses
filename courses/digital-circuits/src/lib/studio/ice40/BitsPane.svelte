<!--
  The configuration bits of the used tiles, as synth's bitstream view reads them back: pick a tile and see its
  grid of bits (each tile has 16 rows; a logic tile 54 columns), coloured by what they configure: a logic
  cell (its LUT, carry and flip-flop), a routing switch, or a buffer onto a cell's input. Hover a bit for its
  meaning.
-->
<script lang="ts">
  import type { Bitstream, BitstreamTile } from '$lib/synth/api';

  let { bitstream, highlight }: { bitstream: Bitstream; highlight?: { x: number; y: number } } = $props();

  const tiles = $derived([...bitstream.tiles].sort((a, b) => b.set.length - a.set.length));
  let chosen = $state<BitstreamTile | undefined>();
  $effect(() => {
    const h = highlight;
    if (h) chosen = bitstream.tiles.find((t) => t.x === h.x && t.y === h.y) ?? chosen;
  });
  const tile = $derived(chosen && bitstream.tiles.includes(chosen) ? chosen : tiles[0]);
  const meaning = $derived.by(() => {
    const m = new Map<number, { n: string; k: string }>();
    for (const f of tile?.f ?? []) for (const b of f.b) m.set(b, f);
    return m;
  });
  let over = $state<number | undefined>();
  const KIND: Record<string, string> = { cfg: 'cell', route: 'routing switch', buf: 'input buffer' };
  const kindLabel = (t: BitstreamTile) => (t.k === 1 ? 'I/O' : t.k === 2 ? 'logic' : 'RAM');
</script>

<div class="bits ui">
  <p class="sum"><b>{bitstream.set_bits.toLocaleString('en-GB')}</b> bits set, of {bitstream.tile_bits.toLocaleString('en-GB')} in the tiles; {bitstream.tiles.length} tiles have any.</p>
  <div class="pick" role="listbox" aria-label="Tiles with bits set">
    {#each tiles as t (`${t.x},${t.y}`)}
      <button type="button" role="option" aria-selected={t === tile} class:on={t === tile} onclick={() => (chosen = t)}>{kindLabel(t)} ({t.x}, {t.y}) <small>{t.set.length}</small></button>
    {/each}
  </div>
  {#if tile}
    <div class="grid" style:--w={tile.w} role="img" aria-label="Tile ({tile.x}, {tile.y}): {tile.set.length} of {tile.w * 16} bits set">
      {#each Array.from({ length: 16 * tile.w }, (_, i) => i) as i (i)}
        {@const m = meaning.get(i)}
        <span class="bit {m?.k ?? ''}" class:set={tile.set.includes(i)} class:over={over !== undefined && m !== undefined && meaning.get(over) === m} onmouseenter={() => (over = i)} onmouseleave={() => (over = undefined)}></span>
      {/each}
    </div>
    <p class="what">{#if over !== undefined}bit B{Math.floor(over / tile.w)}[{over % tile.w}]{#if meaning.get(over)}: {KIND[meaning.get(over)!.k] ?? meaning.get(over)!.k}, <code>{meaning.get(over)!.n}</code>{:else}: not set{/if}{:else}Hover a bit. Rows are B0 to B15, as IceStorm numbers them.{/if}</p>
    <ul class="fields">
      {#each tile.f as f, i (i)}
        <li class={f.k}><span class="k">{KIND[f.k] ?? f.k}</span> <code>{f.n}</code> <small>{f.b.length} bit{f.b.length === 1 ? '' : 's'}</small></li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .bits {
    display: grid;
    gap: 0.5rem;
    font-size: 0.82rem;
    min-width: 0;
  }
  .sum,
  .what {
    margin: 0;
    color: var(--ink-2);
  }
  b {
    font-family: var(--font-mono);
    color: var(--fg);
  }
  .pick {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
    max-height: 5.5rem;
    overflow: auto;
  }
  .pick button {
    font: inherit;
    font-size: 0.74rem;
    padding: 0.1rem 0.4rem;
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
  }
  .pick button.on {
    border-color: var(--accent);
    background: var(--copper-soft);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(var(--w), minmax(0, 1fr));
    gap: 1px;
    max-width: calc(var(--w) * 11px);
  }
  .bit {
    aspect-ratio: 1;
    background: var(--surface-2, var(--line));
    border-radius: 1px;
  }
  .bit.set {
    background: var(--mute);
  }
  .bit.set.cfg {
    background: var(--accent);
  }
  .bit.set.route {
    background: var(--sig-current);
  }
  .bit.set.buf {
    background: var(--sig-high);
  }
  .bit.over {
    outline: 2px solid var(--focus);
  }
  .fields {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 12rem;
    overflow: auto;
    display: grid;
    gap: 0.1rem;
    font-size: 0.76rem;
  }
  .fields .k {
    display: inline-block;
    min-width: 7.5rem;
    color: var(--mute);
  }
  .fields li.cfg .k {
    color: var(--accent-ink, var(--accent));
  }
</style>
