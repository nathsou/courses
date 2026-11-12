<!-- What each step of synth's flow made of the design, and how long it took. -->
<script lang="ts">
  import CostPanel from '$lib/widgets/weft/CostPanel.svelte';
  import type { RunResult } from '$lib/synth/api';

  let { result }: { result: RunResult } = $props();

  const packed = $derived(result.stages.find((s) => s.id === 'packed')?.stats ?? {});
  const placeLine = $derived(result.log.find((l) => l.startsWith('placement:')));
  const routeLine = $derived(result.log.find((l) => l.startsWith('routing:')));
  /** A placement that did not route, and was placed again. */
  const retry = $derived(result.log.find((l) => l.startsWith('routing congestion not resolved')));
  const total = $derived(result.times.reduce((s, [, ms]) => s + ms, 0));
</script>

<div class="steps ui">
  <CostPanel stages={result.stages} />
  <ol class="rest">
    <li><h5>Packed into logic cells</h5><p><b>{packed.ICESTORM_LC ?? 0}</b> logic cells, <b>{packed.SB_IO ?? 0}</b> pads{#if packed.SB_GB}, <b>{packed.SB_GB}</b> global buffers{/if}{#if packed.ICESTORM_RAM}, <b>{packed.ICESTORM_RAM}</b> block RAMs{/if}</p></li>
    {#if placeLine}<li><h5>Placed</h5><p>{placeLine.replace(/^placement: /, '')}</p></li>{/if}
    {#if retry}<li><h5>Placed again</h5><p>The first placement did not route: {retry.replace(/^routing congestion not resolved: /, '').replace(/;.*?placing again/, ', so synth placed again')}.</p></li>{/if}
    {#if routeLine}<li><h5>Routed</h5><p>{routeLine.replace(/^routing: /, '')}</p></li>{/if}
    {#if result.timing?.clocks.length}
      {@const c = result.timing.clocks[0]!}
      <li><h5>Timed</h5><p>clock <code>{c.clock}</code>: <b>{c.fmax_mhz.toFixed(1)}</b> MHz at most{#if c.target_mhz}, against a target of {c.target_mhz} MHz ({c.met ? 'met' : 'missed'}){/if}</p></li>
    {/if}
    {#if result.bitstream}<li><h5>Bitstream</h5><p><b>{result.bitstream.set_bits.toLocaleString('en-GB')}</b> of {result.bitstream.tile_bits.toLocaleString('en-GB')} configuration bits set, in a file of {result.bitstream.bytes.toLocaleString('en-GB')} bytes</p></li>{/if}
  </ol>
  <p class="times">synth took {total < 1000 ? `${Math.round(total)} ms` : `${(total / 1000).toFixed(1)} s`} in your browser: {result.times.map(([k, ms]) => `${k} ${ms < 1 ? '<1' : Math.round(ms)} ms`).join(', ')}.</p>
</div>

<style>
  .steps {
    display: grid;
    gap: 0.45rem;
    font-size: 0.84rem;
  }
  .rest {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.45rem;
  }
  li {
    border-left: 3px solid var(--line-strong);
    padding: 0.15rem 0 0.15rem 0.65rem;
  }
  h5 {
    margin: 0;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--mute);
  }
  p {
    margin: 0.1rem 0 0;
    color: var(--ink-2);
  }
  b {
    font-family: var(--font-mono);
    color: var(--fg);
  }
  .times {
    font-size: 0.76rem;
    color: var(--mute);
  }
</style>
