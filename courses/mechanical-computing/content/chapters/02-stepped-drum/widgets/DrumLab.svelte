<!-- One digit of Leibniz's stepped drum in 3D: slide the pinion, turn the crank, watch the dial. -->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import MachineView from '$lib/gl/MachineView.svelte';
  import { TAU } from '$lib/gl/math';
  import { pinionSteps, steppedDrumModel, type DrumView } from '$lib/models/steppedDrum';
  import { engagedTeeth } from '$lib/mech/stepped';

  const model = steppedDrumModel();
  const view: DrumView = $state.raw({ crank: 0, setting: 3, slide: 3, base: 0 });
  let setting = $state(3);
  let target = 0; // crank angle to reach
  let digit = $state(0);
  let carries = $state(0);
  let turns = $state(0);
  let busy = $state(false);
  let mv: { wake(): void } | undefined = $state();

  function animate(dt: number): boolean {
    let moving = false;
    if (Math.abs(view.slide - setting) > 1e-3) {
      const d = setting - view.slide;
      view.slide += Math.sign(d) * Math.min(Math.abs(d), dt * 0.012);
      moving = true;
    } else view.slide = setting;
    if (view.crank < target) {
      view.crank = Math.min(target, view.crank + dt * 0.0045);
      moving = true;
      if (view.crank >= target) finishTurn();
    }
    busy = moving;
    return moving;
  }

  function finishTurn() {
    const total = view.base + pinionSteps(view.crank, view.setting);
    carries += Math.floor(total / 10) - Math.floor(digit / 10);
    digit = Math.round(total) % 10;
    // Re-base so that the dial keeps its reading when the setting changes.
    view.base = digit;
    view.crank = 0;
    target = 0;
    turns++;
  }

  function turn(n = 1) {
    if (busy) return;
    view.setting = setting;
    target = view.crank + n * TAU;
    busy = true;
    mv?.wake();
  }
  function setSetting(s: number) {
    if (busy && view.crank < target) return;
    setting = s;
    view.setting = s;
    mv?.wake();
  }
  const teeth = $derived(engagedTeeth(setting));
</script>

<Widget title="A stepped drum" subtitle="Slide the pinion along the drum to choose a digit, then turn the crank: the pinion meets that many teeth, and the dial moves on by that many." onreset={() => { view.base = 0; view.crank = 0; target = 0; digit = 0; carries = 0; turns = 0; mv?.wake(); }}>
  {#snippet controls()}
    <label class="slider">Setting <input type="range" min="0" max="9" step="1" value={setting} oninput={(e) => setSetting(+(e.currentTarget as HTMLInputElement).value)} disabled={busy && view.crank > 0} /> <strong class="num">{setting}</strong></label>
    <button class="go" onclick={() => turn(1)} disabled={busy}>Turn the crank</button>
    <button onclick={() => turn(3)} disabled={busy}>Turn three times</button>
  {/snippet}
  <MachineView bind:this={mv} {model} data={view} {animate} label="A stepped drum, its sliding pinion and result dial" height="20rem">
    {#snippet readout()}
      <p class="ro">
        The pinion meets {teeth.length} {teeth.length === 1 ? 'tooth' : 'teeth'}{#if teeth.length}{' '}(the {teeth.length === 9 ? 'nine' : `${teeth.length} longest`}){/if}. Dial: <strong class="num">{digit}</strong> after {turns} {turns === 1 ? 'turn' : 'turns'}{#if carries}; it has passed 9 → 0 {carries} {carries === 1 ? 'time' : 'times'}, each a carry for the next place{/if}.
      </p>
    {/snippet}
  </MachineView>
</Widget>

<style>
  .slider {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.88rem;
  }
  .slider input {
    width: 10rem;
  }
  button {
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.75rem;
    cursor: pointer;
    min-height: 2rem;
    color: var(--ink);
  }
  .go {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
  }
  button:disabled {
    opacity: 0.5;
  }
  .ro {
    margin: 0;
  }
</style>
