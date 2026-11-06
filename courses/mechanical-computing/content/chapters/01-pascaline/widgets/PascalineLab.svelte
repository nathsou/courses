<!-- The Pascaline, opened up: dial numbers in, watch the sautoirs carry, and read either row of windows. -->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import MachineView from '$lib/gl/MachineView.svelte';
  import { ACCOUNTING, Pascaline, livres } from '$lib/mech/pascaline';
  import { pascalineModel, type PascalineView } from '$lib/models/pascaline';

  let { accounting = false, wheels = 6, start = 0, title = 'The Pascaline, opened up', complements = false }: { accounting?: boolean; wheels?: number; start?: number; title?: string; complements?: boolean } = $props();

  const radices = $derived(accounting ? ACCOUNTING.slice(0, wheels) : Array.from({ length: wheels }, () => 10));
  // svelte-ignore state_referenced_locally
  const machine = new Pascaline(radices);
  // svelte-ignore state_referenced_locally
  machine.set(start);
  // svelte-ignore state_referenced_locally
  const model = pascalineModel(radices);
  // svelte-ignore state_referenced_locally
  const view: PascalineView = $state.raw({ machine, row: complements ? 'complement' : 'direct' });
  // svelte-ignore state_referenced_locally
  let row: 'direct' | 'complement' = $state(complements ? 'complement' : 'direct');
  let tick = $state(0);
  let entry = $state('');
  let speed = $state(1);
  let mv: { wake(): void } | undefined = $state();

  function changed() {
    tick++;
    mv?.wake();
  }
  function animate(dt: number) {
    const moving = machine.update(dt);
    tick++;
    return moving;
  }
  function add() {
    const v = Number(entry.replace(/[\s,_]/g, ''));
    if (!Number.isFinite(v) || v <= 0) return;
    machine.add(Math.min(v, machine.capacity));
    entry = '';
    changed();
  }
  function setRow(r: 'direct' | 'complement') {
    row = r;
    view.row = r;
    changed();
  }

  const digits = $derived((tick, [...machine.digits].reverse()));
  const comps = $derived((tick, machine.complementDigits().reverse()));
  const carries = $derived((tick, machine.carries));
  const recent = $derived(
    (tick,
    machine.events
      .slice(-60)
      .filter((e) => e.kind !== 'step')
      .slice(-4)
      .map((e) => (e.kind === 'carry' ? `carry: wheel ${e.from + 1} → wheel ${e.from + 2}` : 'overflow: the carry fell off the last wheel'))),
  );
  const shown = $derived((tick, row === 'direct' ? machine.value() : machine.complement()));
  const placeName = (k: number) => (accounting ? (['deniers', 'sols', 'livres'][k] ?? `${10 ** (k - 2)} livres`) : k === 0 ? 'units' : `${10 ** k}s`);
  const money = $derived((tick, livres(shown)));

  $effect(() => {
    machine.speed = speed;
  });
</script>

<Widget {title} subtitle="Dial a number, then watch the carries: each sautoir is lifted as its wheel climbs to 9 and falls at 9 → 0." onreset={() => { machine.set(start); changed(); }}>
  {#snippet controls()}
    <form class="entry" onsubmit={(e) => { e.preventDefault(); add(); }}>
      <label>Add <input inputmode="numeric" placeholder={accounting ? 'deniers' : 'e.g. 487'} bind:value={entry} size="8" aria-label="Number to add" /></label>
      <button type="submit" disabled={!entry}>Dial it in</button>
    </form>
    <div class="row">
      <button onclick={() => { machine.dial(0, 1); changed(); }}>+1 on the {accounting ? 'deniers' : 'units'}</button>
      <button onclick={() => { machine.set(machine.capacity); changed(); }}>Set all to {accounting ? 'their last digits' : '9'}</button>
    </div>
    <div class="seg" role="group" aria-label="Windows">
      <button class:on={row === 'direct'} aria-pressed={row === 'direct'} onclick={() => setRow('direct')}>Digits</button>
      <button class:on={row === 'complement'} aria-pressed={row === 'complement'} onclick={() => setRow('complement')}>Complements</button>
    </div>
    <label class="speed">Speed
      <select bind:value={speed} aria-label="Animation speed">
        <option value={0.25}>slow motion</option>
        <option value={1}>real time</option>
        <option value={4}>fast</option>
      </select>
    </label>
  {/snippet}
  <MachineView bind:this={mv} {model} data={view} {animate} label="A Pascaline with {wheels} wheels" height="21rem">
    {#snippet readout()}
      <div class="windows" aria-label="The windows">
        {#each digits as d, i (i)}
          {@const k = digits.length - 1 - i}
          <div class="win" title={placeName(k)}>
            <span class="c" class:dim={row === 'direct'}>{comps[i]}</span>
            <span class="d" class:dim={row === 'complement'}>{d}</span>
          </div>
        {/each}
        <div class="value">
          {#if accounting}
            <strong>{money.l} livres {money.s} sols {money.d} deniers</strong>
          {:else}
            <strong>{shown.toLocaleString('en-GB')}</strong>
          {/if}
          <span>{row === 'direct' ? 'in the digit row' : 'in the complement row'} · {carries} {carries === 1 ? 'carry' : 'carries'} so far</span>
        </div>
      </div>
      {#if recent.length}<ul class="log">{#each recent as r, i (i)}<li>{r}</li>{/each}</ul>{/if}
    {/snippet}
  </MachineView>
</Widget>

<style>
  .entry,
  .row {
    display: flex;
    gap: 0.4rem;
    align-items: center;
    flex-wrap: wrap;
  }
  input,
  select {
    font: inherit;
    padding: 0.25rem 0.4rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--surface);
    color: var(--ink);
  }
  button {
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.65rem;
    cursor: pointer;
    font-size: 0.84rem;
    min-height: 2rem;
  }
  button:hover:not(:disabled) {
    background: var(--accent-soft);
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .seg {
    display: inline-flex;
  }
  .seg button {
    border-radius: 0;
  }
  .seg button:first-child {
    border-radius: var(--radius-sm) 0 0 var(--radius-sm);
  }
  .seg button:last-child {
    border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
    border-left: 0;
  }
  .seg button.on {
    background: var(--accent);
    color: var(--on-accent);
    border-color: var(--accent);
  }
  .speed {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.84rem;
  }
  .windows {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    align-items: center;
  }
  .win {
    display: grid;
    grid-template-rows: 1fr 1fr;
    width: 2.2rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--surface);
    text-align: center;
    font-family: var(--font-mono);
    font-variant-numeric: tabular-nums;
  }
  .win span {
    padding: 0.1rem 0;
  }
  .win .c {
    border-bottom: 1px solid var(--line);
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .win .d {
    font-size: 1.15rem;
    font-weight: 600;
  }
  .win .dim {
    opacity: 0.3;
  }
  .value {
    display: flex;
    flex-direction: column;
    margin-left: 0.6rem;
    line-height: 1.3;
  }
  .value strong {
    font-family: var(--font-mono);
    font-size: 1.1rem;
  }
  .value span {
    font-size: 0.78rem;
    color: var(--ink-3);
  }
  .log {
    list-style: none;
    margin: 0.5rem 0 0;
    padding: 0;
    font-size: 0.78rem;
    color: var(--ink-2);
    font-family: var(--font-mono);
  }
</style>
