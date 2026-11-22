<!--
  How many connections a die can have, by packaging method: wires bonded to pads around the edge, solder bumps
  over the whole face (flip chip), micro-bumps to a neighbouring die on an interposer, or copper pads bonded
  directly to another die (hybrid bonding). Pitches are typical round figures, not any one product's.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';

  const METHODS = [
    { id: 'wire', name: 'Wire bonds', pitch: 50, where: 'edge', note: 'gold or copper wires from pads around the die’s edge to the package' },
    { id: 'flip', name: 'Flip-chip bumps', pitch: 150, where: 'area', note: 'solder balls over the whole face, die mounted upside down' },
    { id: 'micro', name: 'Micro-bumps', pitch: 40, where: 'area', note: 'die to die, through a silicon interposer or bridge' },
    { id: 'hybrid', name: 'Hybrid bonding', pitch: 9, where: 'area', note: 'copper pads fused directly to another die’s, no solder' },
  ];
  let side = $state(10);
  const count = (m: (typeof METHODS)[number]) => (m.where === 'edge' ? Math.floor((4 * side * 1000) / m.pitch) : Math.floor(((side * 1000) / m.pitch) ** 2));
  const max = $derived(Math.max(...METHODS.map(count)));
  const fmt = (n: number) => n.toLocaleString('en-GB');
</script>

<Widget title="How many connections?" subtitle="A square die can be connected around its edge or across its whole face, at very different pitches. The bars are on a logarithmic scale.">
  {#snippet controls()}
    <Slider bind:value={side} min={2} max={30} step={0.5} label="Die side" format={(v) => `${v} mm`} />
  {/snippet}
  <div class="rows ui">
    {#each METHODS as m (m.id)}
      <div class="row">
        <div class="name"><strong>{m.name}</strong><span>{m.pitch} µm pitch, {m.where === 'edge' ? 'edge only' : 'whole face'}: {m.note}</span></div>
        <div class="track"><span style:width="{(Math.log10(count(m)) / Math.log10(max)) * 100}%"></span></div>
        <div class="n num">{fmt(count(m))}</div>
      </div>
    {/each}
  </div>
</Widget>

<style>
  .rows {
    display: grid;
    gap: 0.7rem;
  }
  .row {
    display: grid;
    grid-template-columns: minmax(10rem, 1.4fr) minmax(6rem, 1fr) 6rem;
    gap: 0.8rem;
    align-items: center;
    font-size: 0.82rem;
  }
  @media (max-width: 560px) {
    .row {
      grid-template-columns: 1fr 5.5rem;
    }
    .track {
      grid-column: 1 / -1;
      grid-row: 2;
    }
  }
  .name {
    display: flex;
    flex-direction: column;
  }
  .name span {
    color: var(--ink-3);
    font-size: 0.76rem;
  }
  .track {
    height: 0.9rem;
    background: var(--surface-2);
    border-radius: 2px;
    overflow: hidden;
  }
  .track span {
    display: block;
    height: 100%;
    background: var(--m-metal);
  }
  .n {
    text-align: right;
    font-family: var(--font-mono);
    font-weight: 600;
  }
</style>
