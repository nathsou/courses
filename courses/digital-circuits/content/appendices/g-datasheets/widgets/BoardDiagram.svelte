<!--
  The segment patterns of the hexadecimal digits that the course's boards show (the `digit` functions of Octet and
  of the RV32I board, in Chapter 31).

    ::board-diagram{part="segments"}    the seven-segment pattern of every hexadecimal digit
-->
<script lang="ts">
  import '../../a-reference/widgets/appendix.css';
  import Widget from '$lib/components/ui/Widget.svelte';
  import SevenSeg from '$lib/studio/chips/SevenSeg.svelte';
  /** Segments a (bit 0) to g (bit 6) of the digits 0 to F. */
  const HEX_SEGMENTS: readonly number[] = [0x3f, 0x06, 0x5b, 0x4f, 0x66, 0x6d, 0x7d, 0x07, 0x7f, 0x6f, 0x77, 0x7c, 0x39, 0x5e, 0x79, 0x71];

  let { part = 'segments', n, caption }: { part?: 'segments'; n?: string | number; caption?: string } = $props();
  void part;

  const hex = (v: number) => `0x${v.toString(16).padStart(2, '0')}`;
</script>

  <Widget title="Segment patterns" {n} kind="Reference" live={false} {caption}>
    <div class="grid">
      {#each HEX_SEGMENTS as v, d (d)}
        <div class="cell">
          <SevenSeg segments={v} size={40} label="hexadecimal digit {d.toString(16).toUpperCase()}" />
          <span class="d">{d.toString(16).toUpperCase()}</span>
          <code>{hex(v)}</code>
          <code class="bin">{v.toString(2).padStart(7, '0')}</code>
        </div>
      {/each}
    </div>
  </Widget>


<style>
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(6.5rem, 1fr));
    gap: 0.8rem 0.6rem;
    padding: 1rem 0.9rem;
  }
  .cell {
    display: grid;
    justify-items: center;
    gap: 0.15rem;
    font-family: var(--font-ui);
  }
  .d {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--fg);
  }
  code {
    font-size: 0.78rem;
    color: var(--ink-2);
  }
  .bin {
    color: var(--mute);
    font-size: 0.72rem;
  }
</style>
