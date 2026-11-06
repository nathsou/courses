<!-- A barrel of the mill in 3D: step through a microprogram row by row and watch which levers its studs lift. -->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import MachineView from '$lib/gl/MachineView.svelte';
  import { barrelModel, leverLift, type BarrelView } from '$lib/models/barrel';
  import { LEVERS, MICROPROGRAMS } from '$lib/mech/carry';

  let { program = 'add' }: { program?: 'add' | 'multiply' } = $props();
  // svelte-ignore state_referenced_locally
  const rows = MICROPROGRAMS[program]!.rows;
  // svelte-ignore state_referenced_locally
  const model = barrelModel(rows, `barrel-${program}`);
  const view: BarrelView = $state.raw({ pos: 0 });
  let row = $state(0);
  let target = 0;
  let digitsLeft = $state(3); // multiplier digits still to do (for the loop)
  let log: string[] = $state([]);
  let mv: { wake(): void } | undefined = $state();
  let tick = $state(0);

  function animate(dt: number) {
    const d = target - view.pos;
    if (Math.abs(d) < 1e-3) {
      view.pos = target;
      return false;
    }
    view.pos += Math.sign(d) * Math.min(Math.abs(d), dt * 0.004);
    tick++;
    return true;
  }
  function step() {
    const r = rows[row]!;
    let next = row + 1;
    if (r.repeatTo !== undefined) {
      digitsLeft--;
      if (digitsLeft > 0) next = r.repeatTo;
      log = [...log, digitsLeft > 0 ? `Row ${row + 1}: ${digitsLeft} multiplier ${digitsLeft === 1 ? 'digit' : 'digits'} left, so the barrel steps back to row ${r.repeatTo + 1}.` : `Row ${row + 1}: no digits left; the barrel goes on.`].slice(-4);
    }
    if (next >= rows.length) {
      next = 0;
      digitsLeft = 3;
      log = [...log, 'The operation is complete; the barrel returns to row 1 for the next card.'].slice(-4);
    }
    // Turn forwards or backwards to the next row (the shortest way round).
    let d = next - row;
    if (d < -rows.length / 2) d += rows.length;
    target = view.pos + d;
    row = next;
    mv?.wake();
  }
  const active = $derived((tick, row, LEVERS.map((_, c) => leverLift(rows, c, row) > 0.5)));
</script>

<Widget title="A barrel: the microprogram for {MICROPROGRAMS[program]!.label.toLowerCase()}" subtitle="Each row of studs is one step. Press Step: the barrel turns one row and the studs at the top lift their levers. Tap a lever to name it." onreset={() => { row = 0; target = 0; view.pos = 0; digitsLeft = 3; log = []; mv?.wake(); }}>
  {#snippet controls()}
    <button class="go" onclick={step}>Step</button>
    <span class="now">Row {row + 1} of {rows.length}</span>
  {/snippet}
  <MachineView bind:this={mv} {model} data={view} {animate} label="A studded barrel with eight levers resting on it" height="19rem">
    {#snippet readout()}
      <p class="note"><strong>Row {row + 1}:</strong> {rows[row]!.note}</p>
      <ol class="levers">
        {#each LEVERS as l, c (c)}<li class:on={active[c]}>{l}</li>{/each}
      </ol>
      {#if log.length}<ul class="log">{#each log as e, i (i)}<li>{e}</li>{/each}</ul>{/if}
    {/snippet}
  </MachineView>
</Widget>

<style>
  button {
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--on-accent);
    border-radius: var(--radius-sm);
    padding: 0.3rem 1rem;
    cursor: pointer;
    min-height: 2rem;
    font-weight: 600;
  }
  .now {
    font-size: 0.86rem;
    color: var(--ink-2);
  }
  .note {
    margin: 0 0 0.4rem;
  }
  .levers {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
    gap: 0.2rem 0.8rem;
    margin: 0;
    padding-left: 1.4rem;
    font-size: 0.8rem;
    color: var(--ink-3);
  }
  .levers .on {
    color: var(--ink);
    font-weight: 700;
  }
  .levers .on::marker {
    color: var(--fx-red);
  }
  .log {
    margin: 0.4rem 0 0;
    padding-left: 1.1rem;
    font-size: 0.8rem;
    color: var(--ink-2);
  }
</style>
