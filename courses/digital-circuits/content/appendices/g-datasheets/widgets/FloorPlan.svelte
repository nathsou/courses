<!--
  The two iCE40 dies of the course to scale, as synth's chip database has them: the I/O ring, the logic tiles and
  the block RAM columns (a block RAM is two tiles high). synth builds a one-gate design for each part when the
  figure appears, and the drawing is its die.

    ::floor-plan{n="G.14" caption="…"}
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import type { Chip } from '$lib/synth/api';
  import { run } from '$lib/synth/api';
  import { tileKind } from '$lib/studio/ice40/chipdraw';

  let { n, caption }: { n?: string | number; caption?: string } = $props();

  const PARTS = [
    { part: 'hx1k', package: 'vq100', name: 'iCE40 HX1K', px: 16 },
    { part: 'hx8k', package: 'ct256', name: 'iCE40 HX8K', px: 8 },
  ] as const;
  let chips = $state.raw<(Chip | undefined)[]>([]);
  let error = $state('');

  onMount(async () => {
    try {
      const { synthOn } = await import('$lib/synth/client');
      const synth = synthOn('run');
      const out: Chip[] = [];
      for (const p of PARTS) {
        const r = await run(synth, { files: [{ name: 'one.weft', text: 'module one(in a: bool, out y: bool) {\n    y = !a;\n}\n' }], part: p.part, package: p.package, pins: '' });
        if (!r.chip) throw new Error(r.error ?? 'synth failed');
        out.push(r.chip);
      }
      chips = out;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  });

  function tiles(c: Chip) {
    const out: { x: number; y: number; kind: string }[] = [];
    for (let y = 0; y < c.gh; y++) for (let x = 0; x < c.gw; x++) out.push({ x, y: c.gh - 1 - y, kind: tileKind(c, x, y) });
    return out;
  }
  const count = (c: Chip, k: string) => tiles(c).filter((t) => t.kind.startsWith(k)).length;
</script>

<Widget title="iCE40 floorplans" {n} kind="Diagram" live={false} {caption}>
  {#snippet controls()}
    <ul class="legend" aria-label="Key">
      <li><span class="k logic"></span>logic tile (8 cells)</li>
      <li><span class="k ram"></span>block RAM tile (a block is two tiles, 4 Kbit)</li>
      <li><span class="k io"></span>I/O tile (pads)</li>
    </ul>
  {/snippet}
  <div class="plans">
    {#if error}
      <p class="ui">{error}</p>
    {:else if !chips.length}
      <p class="ui">synth is reading the two dies…</p>
    {:else}
      {#each PARTS as p, i (p.part)}
        {@const c = chips[i]!}
        <figure>
          <svg viewBox="0 0 {c.gw * p.px} {c.gh * p.px}" width={c.gw * p.px} height={c.gh * p.px} role="img" aria-label="{p.name}: {c.gw} by {c.gh} tiles, {count(c, 'logic')} logic tiles ({c.usage.lc_total} cells), {c.usage.ram_total} block RAMs">
            {#each tiles(c) as t (`${t.x},${t.y}`)}
              {#if t.kind !== 'corner'}
                <rect class="tile {t.kind === 'logic' ? 'logic' : t.kind === 'io' ? 'io' : 'ram'}" x={t.x * p.px + 0.5} y={t.y * p.px + 0.5} width={p.px - 1} height={p.px - 1} rx={p.px > 12 ? 2 : 1} />
              {/if}
            {/each}
          </svg>
          <figcaption>
            <strong>{p.name}</strong>
            <span>{c.gw} × {c.gh} tiles, {c.usage.lc_total.toLocaleString('en-GB')} logic cells</span>
          </figcaption>
        </figure>
      {/each}
    {/if}
  </div>
</Widget>

<style>
  .plans {
    display: flex;
    flex-wrap: wrap;
    align-items: end;
    justify-content: center;
    gap: 1.4rem 2rem;
    padding: 1rem 0.8rem;
  }
  figure {
    margin: 0;
    display: grid;
    gap: 0.4rem;
    justify-items: center;
    max-width: 100%;
  }
  svg {
    max-width: 100%;
    height: auto;
  }
  figcaption {
    font-family: var(--font-ui);
    font-size: 0.8rem;
    color: var(--ink-2);
    display: grid;
    text-align: center;
  }
  .tile.logic,
  .k.logic {
    fill: var(--copper-soft);
    stroke: var(--copper);
    stroke-width: 0.8;
  }
  .tile.ram,
  .k.ram {
    fill: var(--ok-soft);
    stroke: var(--phosphor);
    stroke-width: 0.8;
  }
  .tile.io,
  .k.io {
    fill: var(--panel);
    stroke: var(--series-1);
    stroke-width: 0.8;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 1.2rem;
    margin: 0;
    padding: 0.2rem 0.9rem;
    list-style: none;
    font-family: var(--font-ui);
    font-size: 0.78rem;
    color: var(--ink-2);
  }
  .k {
    display: inline-block;
    width: 0.8rem;
    height: 0.8rem;
    margin-right: 0.4rem;
    vertical-align: -0.1rem;
    border-radius: 2px;
    border: 1px solid;
  }
  .k.logic {
    background: var(--copper-soft);
    border-color: var(--copper);
  }
  .k.ram {
    background: var(--ok-soft);
    border-color: var(--phosphor);
  }
  .k.io {
    background: var(--panel);
    border-color: var(--series-1);
  }
</style>
