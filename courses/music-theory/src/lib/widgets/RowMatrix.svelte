<!--
  The twelve-tone matrix of a row: primes across, inversions down, retrogrades and retrograde-inversions read
  backwards. Click a row or column label to hear that form. Pitch classes can be shown as integers or note names.
-->
<script lang="ts">
  import { audio } from '$lib/audio/engine.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { noteName } from '$lib/music/names';
  import { spell } from '$lib/music/pitch';
  import { isRow, matrix } from '$lib/music/pcset';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';

  let { title = 'The twelve-tone matrix', row = '0,11,7,8,3,1,2,10,6,5,4,9' }: { title?: string; row?: string } = $props();

  const r = $derived(row.split(',').map((x) => Number(x.trim())));
  const m = $derived(isRow(r) ? matrix(r) : []);
  let show: 'names' | 'numbers' = $state('names');
  const label = (pc: number) => (show === 'numbers' ? String(pc) : noteName(spell(60 + pc, 0), settings.nameOptions));
  let lit: number[][] = $state([]);

  function play(seq: number[], cells: number[][]) {
    audio.start();
    audio.playSequence(seq.map((pc, i) => ({ midi: 60 + pc, time: i * 0.28, duration: 0.26, velocity: 72 })), (n, on) => {
      const i = seq.findIndex((pc, k) => 60 + pc === n.midi && Math.abs(k * 0.28 - n.time) < 0.01);
      lit = on && i >= 0 ? [cells[i]!] : [];
    });
  }
  const P = (k: number) => play(m[k]!, m[k]!.map((_, c) => [k, c]));
  const R = (k: number) => play([...m[k]!].reverse(), m[k]!.map((_, c) => [k, 11 - c]));
  const I = (c: number) => play(m.map((rw) => rw[c]!), m.map((_, k) => [k, c]));
  const RI = (c: number) => play(m.map((rw) => rw[c]!).reverse(), m.map((_, k) => [11 - k, c]));
  const isLit = (k: number, c: number) => lit.some(([a, b]) => a === k && b === c);
</script>

<Widget {title} subtitle="Read across for the primes (P), backwards for the retrogrades (R), down for the inversions (I), up for the retrograde-inversions (RI). Click a label to hear the form.">
  {#snippet controls()}
    <Segmented options={[{ value: 'names', label: 'Note names' }, { value: 'numbers', label: 'Integers' }]} value={show} label="Show" onchange={(v) => (show = v as 'names' | 'numbers')} size="sm" />
  {/snippet}
  <div class="rm ui">
    {#if m.length}
      <table>
        <thead>
          <tr>
            <th></th>
            {#each m[0]! as pc, c (c)}<th><button onclick={() => I(c)}>I{pc}</button></th>{/each}
            <th></th>
          </tr>
        </thead>
        <tbody>
          {#each m as rw, k (k)}
            <tr>
              <th><button onclick={() => P(k)}>P{rw[0]}</button></th>
              {#each rw as pc, c (c)}<td class:diag={c === k} class:lit={isLit(k, c)}>{label(pc)}</td>{/each}
              <th><button onclick={() => R(k)}>R{rw[0]}</button></th>
            </tr>
          {/each}
        </tbody>
        <tfoot>
          <tr>
            <th></th>
            {#each m[0]! as pc, c (c)}<th><button onclick={() => RI(c)}>RI{pc}</button></th>{/each}
            <th></th>
          </tr>
        </tfoot>
      </table>
    {:else}
      <p>Not a twelve-tone row.</p>
    {/if}
  </div>
</Widget>

<style>
  .rm {
    padding: 0.6rem 0.8rem 0.9rem;
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    font-size: 0.82rem;
    margin: 0 auto;
    font-variant-numeric: tabular-nums;
  }
  td {
    width: 2.1rem;
    height: 1.7rem;
    text-align: center;
    border: 1px solid var(--line);
  }
  td.diag {
    background: var(--accent-soft);
  }
  td.lit {
    background: var(--accent);
    color: var(--on-accent);
  }
  th button {
    border: 0;
    background: none;
    color: var(--accent-ink);
    font: 600 0.74rem var(--font-ui);
    cursor: pointer;
    padding: 0.1rem 0.15rem;
  }
</style>
