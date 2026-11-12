<!--
  A cosmic ray in the configuration memory of an iCE40. synth builds an XOR gate (one logic cell, three pads)
  for an HX1K; strike a bit of the tiles it uses and synth decodes the flipped bitstream back into cells and runs
  them for the four input pairs. The census, which flips every bit of those tiles in turn, was run with synth
  and recorded (upset.test.ts checks it); Show the census marks the bits that break the gate.

    ::upset-census{n="28.5" caption="…"}
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { buildXor, CENSUS, EXPECTED, meaning, outputs, ray, type BitMeaning, type Built } from './upset';

  let { n, caption }: { n?: string | number; caption?: string } = $props();

  let built = $state.raw<Built | undefined>();
  let error = $state('');
  let rays = $state(0);
  let broken = $state(0);
  let busy = $state(false);
  let showCensus = $state(false);
  let last = $state<{ at: [number, number, number]; what: BitMeaning; got: string } | undefined>();
  let synth: import('$lib/synth/api').Synth | undefined;

  const critical = new Set(CENSUS.critical.map((c) => c.join(',')));
  const KIND: Record<string, string> = { cell: 'a bit of the logic cell (its LUT)', route: 'a routing switch', buf: 'a buffer onto a cell or pad input', io: 'a pad setting', none: 'a bit the design leaves at 0' };

  onMount(async () => {
    try {
      const { synthOn } = await import('$lib/synth/client');
      synth = synthOn('sim');
      built = await buildXor(synthOn('run'));
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  });

  async function strike(at = built && ray(rays, built)) {
    if (!built || !synth || !at || busy) return;
    busy = true;
    try {
      const got = await outputs(synth, built, [at]);
      rays++;
      if (got !== EXPECTED) broken++;
      last = { at, what: meaning(built.result.bitstream!, at[0], at[1], at[2]), got };
    } finally {
      busy = false;
    }
  }

  const isSet = (x: number, y: number, i: number) => !!built?.result.bitstream?.tiles.find((t) => t.x === x && t.y === y)?.set.includes(i);
  const table = (s: string) => ['00', '01', '10', '11'].map((ab, i) => `${ab}→${s[i] ?? '?'}`).join(' ');
</script>

<Widget {n} title="A cosmic ray in the configuration" subtitle="An XOR gate on an iCE40 HX1K, and one flipped bit at a time" {caption} onreset={() => ((rays = 0), (broken = 0), (last = undefined), (showCensus = false))}>
  {#snippet controls()}
    <div class="ctl ui">
      <Button size="sm" onclick={() => strike()} disabled={!built || busy}>{busy ? 'Simulating…' : 'Strike at random'}</Button>
      <Button size="sm" onclick={() => (showCensus = !showCensus)} disabled={!built}>{showCensus ? 'Hide the census' : 'Show the census'}</Button>
      <span class="count">rays: <b>{rays}</b>, circuit broken by <b>{broken}</b></span>
    </div>
  {/snippet}

  <div class="up">
    {#if error}
      <p class="err ui">{error}</p>
    {:else if !built}
      <p class="note ui">synth is building the XOR gate…</p>
    {:else}
      <p class="note ui">The gate uses {built.tiles.length} tiles: {built.tiles.map((t) => `${t.kind} (${t.x}, ${t.y})`).join(', ')}, {built.total.toLocaleString('en-GB')} configuration bits in all, of which {built.tiles.reduce((s, t) => s + (built!.result.bitstream!.tiles.find((u) => u.x === t.x && u.y === t.y)?.set.length ?? 0), 0)} are set. Click a bit to strike it.</p>
      <div class="tiles">
        {#each built.tiles as t (`${t.x},${t.y}`)}
          <figure>
            <figcaption class="ui">{t.kind} tile ({t.x}, {t.y})</figcaption>
            <div class="grid" style:--w={t.w}>
              {#each Array.from({ length: 16 * t.w }, (_, i) => i) as i (i)}
                <button
                  type="button"
                  class="bit"
                  class:set={isSet(t.x, t.y, i)}
                  class:crit={showCensus && critical.has(`${t.x},${t.y},${i}`)}
                  class:hit={last && last.at[0] === t.x && last.at[1] === t.y && last.at[2] === i}
                  aria-label="Strike bit {i} of tile ({t.x}, {t.y})"
                  onclick={() => strike([t.x, t.y, i])}
                ></button>
              {/each}
            </div>
          </figure>
        {/each}
      </div>
      <div class="out ui" aria-live="polite">
        {#if last}
          <p>Bit B{Math.floor(last.at[2] / (built.tiles.find((t) => t.x === last!.at[0] && t.y === last!.at[1])?.w ?? 1))}[{last.at[2] % (built.tiles.find((t) => t.x === last!.at[0] && t.y === last!.at[1])?.w ?? 1)}] of tile ({last.at[0]}, {last.at[1]}) flipped from {last.what.set ? 1 : 0} to {last.what.set ? 0 : 1}: {KIND[last.what.kind] ?? last.what.kind}{last.what.kind !== 'none' ? `, ${last.what.name}` : ''}.</p>
          <p class:bad={last.got !== EXPECTED} class:good={last.got === EXPECTED}>{last.got === EXPECTED ? 'Harmless' : 'Broken'}: a b → y is {table(last.got)} (an XOR gives {table(EXPECTED)}).</p>
        {:else}
          <p>Strike a bit: synth decodes the flipped bitstream into cells and runs them for the four input pairs.</p>
        {/if}
        {#if showCensus}
          <p>The census flipped all {CENSUS.total.toLocaleString('en-GB')} bits of these tiles, one at a time: <b>{CENSUS.critical.length}</b> of them ({((100 * CENSUS.critical.length) / CENSUS.total).toFixed(1)} %), outlined in red, break the gate.</p>
        {/if}
      </div>
    {/if}
  </div>
</Widget>

<style>
  .up {
    display: grid;
    gap: 0.6rem;
    padding: 0.8rem 1rem 1rem;
  }
  .ctl {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
  }
  .count {
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .note,
  .err {
    margin: 0;
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .err {
    color: var(--bad);
  }
  .tiles {
    display: flex;
    flex-wrap: wrap;
    gap: 0.8rem;
    align-items: flex-start;
  }
  figure {
    margin: 0;
  }
  figcaption {
    font-size: 0.72rem;
    color: var(--mute);
    margin-bottom: 0.2rem;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(var(--w), 8px);
    gap: 1px;
  }
  .bit {
    width: 8px;
    height: 8px;
    padding: 0;
    border: none;
    border-radius: 1px;
    background: var(--surface-2, var(--line));
    cursor: pointer;
  }
  .bit.set {
    background: var(--accent);
  }
  .bit.crit {
    outline: 1.5px solid var(--bad);
    outline-offset: 0;
  }
  .bit.hit {
    background: var(--sig-high);
    outline: 2px solid var(--focus);
  }
  .bit:focus-visible {
    outline: 2px solid var(--focus);
  }
  .out p {
    margin: 0.2rem 0;
    font-size: 0.84rem;
  }
  .good {
    color: var(--ok);
  }
  .bad {
    color: var(--bad);
    font-weight: 600;
  }
  b {
    font-family: var(--font-mono);
  }
</style>
