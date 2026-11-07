<!-- Two of the Z1's switching elements in 3D: set the control plates, run a clock cycle, see whether the output plate moves. -->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import MachineView from '$lib/gl/MachineView.svelte';
  import { z1Model, type Z1View } from '$lib/models/z1';

  let { invert = false }: { invert?: boolean } = $props();
  const model = z1Model();
  // svelte-ignore state_referenced_locally
  const view: Z1View = $state.raw({ phase: 0, a: 1, b: 0, invertB: invert });
  let A = $state(true);
  let B = $state(false);
  // svelte-ignore state_referenced_locally
  let inv = $state(invert);
  let cycling = false;
  let moved: boolean | null = $state(null);
  let mv: { wake(): void } | undefined = $state();
  function animate(dt: number) {
    let moving = false;
    for (const k of ['a', 'b'] as const) {
      const target = (k === 'a' ? A : B) ? 1 : 0;
      if (Math.abs(view[k] - target) > 1e-3) {
        view[k] += Math.sign(target - view[k]) * Math.min(Math.abs(target - view[k]), dt * 0.004);
        moving = true;
      } else view[k] = target;
    }
    if (cycling) {
      view.phase = Math.min(1, view.phase + dt / 1600);
      if (view.phase >= 1) {
        cycling = false;
        view.phase = 0;
      }
      moving = true;
    }
    return moving;
  }
  function cycle() {
    if (cycling) return;
    moved = A && (inv ? !B : B);
    cycling = true;
    mv?.wake();
  }
  $effect(() => {
    void A;
    void B;
    view.invertB = inv;
    moved = null;
    mv?.wake();
  });
</script>

<Widget title="Binary in sheet metal" subtitle="Two switching elements in series. Set A and B (the blue control plates), then run one clock cycle: the output plate moves only if both pins are where the pushers reach." onreset={() => { A = true; B = false; inv = false; }}>
  {#snippet controls()}
    <label class="chk"><input type="checkbox" bind:checked={A} /> A = {A ? 1 : 0}</label>
    <label class="chk"><input type="checkbox" bind:checked={B} /> B = {B ? 1 : 0}</label>
    <label class="chk"><input type="checkbox" bind:checked={inv} /> second pusher at the 0 position (invert B)</label>
    <button class="go" onclick={cycle}>Run a clock cycle</button>
  {/snippet}
  <MachineView bind:this={mv} {model} data={view} {animate} label="Two plate-and-pin switching elements in series" height="20rem">
    {#snippet readout()}
      <p class="ro">This pair computes <strong>{inv ? 'A AND NOT B' : 'A AND B'}</strong>.{' '}{#if moved !== null} With A = {A ? 1 : 0} and B = {B ? 1 : 0}, the output plate {moved ? 'moves: 1' : 'stays: 0'}.{/if}</p>
    {/snippet}
  </MachineView>
</Widget>

<style>
  label {
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
    font-size: 0.86rem;
  }
  button {
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--on-accent);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.9rem;
    font-weight: 600;
    cursor: pointer;
    min-height: 2rem;
  }
  .ro {
    margin: 0;
  }
</style>
