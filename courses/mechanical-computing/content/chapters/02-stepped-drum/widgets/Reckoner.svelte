<!--
  The registers of a stepped-drum calculator: setting, result (on a shifting carriage) and turns counter.
  Three flavours: Leibniz (incomplete carry), arithmometer (additions only) and Curta (subtract by lifting the
  crank; the counter can be reversed for division). Given a goal, it becomes an exercise: the result,
  counter and number of turns are checked.
-->
<script lang="ts">
  import { after } from '$lib/util/after';
  import { onMount } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import ExerciseFrame from '$lib/components/exercise/ExerciseFrame.svelte';
  import { SteppedReckoner } from '$lib/mech/stepped';
  import { progress } from '$lib/state/progress.svelte';

  type Goal = { result?: number; counter?: number; maxTurns?: number; setting?: number };
  let {
    flavour = 'curta',
    id,
    title,
    prompt,
    goal,
    startResult = 0,
    startSetting = 0,
    hints = [],
    solution,
  }: { flavour?: 'leibniz' | 'arithmometer' | 'curta'; id?: string; title?: string; prompt?: string; goal?: Goal; startResult?: number; startSetting?: number; hints?: string[]; solution?: string } = $props();

  const dims = $derived(flavour === 'leibniz' ? { s: 8, r: 16, c: 8 } : flavour === 'arithmometer' ? { s: 6, r: 12, c: 7 } : { s: 8, r: 11, c: 6 });
  // svelte-ignore state_referenced_locally
  let m = $state.raw(new SteppedReckoner(dims.s, dims.r, dims.c, flavour === 'leibniz' ? 'leibniz' : 'complete'));
  let tick = $state(0);
  let lastCarries: number[] = $state([]);
  let reverse = $state(false);
  let done = $state(false);

  function reset() {
    m = new SteppedReckoner(dims.s, dims.r, dims.c, flavour === 'leibniz' ? 'leibniz' : 'complete');
    m.result = SteppedReckoner.toDigits(startResult, dims.r);
    m.set(startSetting);
    m.turns = 0;
    lastCarries = [];
    reverse = false;
    tick++;
  }
  // svelte-ignore state_referenced_locally
  reset();
  onMount(() => {
    if (id) done = progress.isSolved(id);
  });

  function turn(sub: boolean) {
    lastCarries = m.turn(sub, reverse ? sub : !sub);
    tick++;
    check();
  }
  function bump(j: number, d: number) {
    m.setting[j] = (m.setting[j]! + d + 10) % 10;
    tick++;
  }
  function shift(d: number) {
    m.moveTo(m.shift + d);
    tick++;
  }
  function clearRegs() {
    m.clear();
    m.turns = 0;
    lastCarries = [];
    tick++;
  }
  function complete(p: number) {
    m.completeCarry(p);
    tick++;
    check();
  }
  const ok = $derived.by(() => {
    void tick;
    if (!goal) return null;
    const checks: { label: string; pass: boolean }[] = [];
    if (goal.result !== undefined) checks.push({ label: `result register shows ${goal.result.toLocaleString('en-GB')}`, pass: m.resultValue === goal.result && m.pending.size === 0 });
    if (goal.counter !== undefined) checks.push({ label: `counter shows ${goal.counter.toLocaleString('en-GB')}`, pass: m.counterValue === goal.counter });
    if (goal.setting !== undefined) checks.push({ label: `setting is ${goal.setting.toLocaleString('en-GB')}`, pass: m.settingValue === goal.setting });
    if (goal.maxTurns !== undefined) checks.push({ label: `at most ${goal.maxTurns} turns (you have used ${m.turns})`, pass: m.turns <= goal.maxTurns });
    return checks;
  });
  function check() {
    if (id && ok && ok.every((c) => c.pass)) {
      progress.markSolved(id);
      done = true;
    }
  }
  const reg = (d: number[]) => [...d].reverse();
  const S = $derived(after(tick, reg(m.setting)));
  const R = $derived(after(tick, reg(m.result)));
  const C = $derived(after(tick, reg(m.counter)));
  const pending = $derived(after(tick, [...m.pending]));
  const name = $derived(flavour === 'leibniz' ? 'Leibniz’s reckoner' : flavour === 'arithmometer' ? 'An arithmometer' : 'A Curta');
</script>

{#snippet machine()}
  <div class="regs ui" class:curta={flavour === 'curta'}>
    <div class="row">
      <span class="lab">Result</span>
      <div class="digits result">
        {#each R as d, i (i)}
          {@const place = dims.r - 1 - i}
          <span class="cell" class:aligned={place >= m.shift && place < m.shift + dims.s} class:carry={lastCarries.includes(place)} class:pend={pending.includes(place)}>
            {d}
            {#if pending.includes(place)}<button class="pendbtn" onclick={() => complete(place)} aria-label="Complete the carry into place {place + 1}">↑</button>{/if}
          </span>
        {/each}
      </div>
    </div>
    <div class="row">
      <span class="lab">Counter</span>
      <div class="digits counter">
        {#each C as d, i (i)}<span class="cell" class:here={dims.c - 1 - i === m.shift}>{d}</span>{/each}
      </div>
    </div>
    <div class="row setting-row">
      <span class="lab">Setting</span>
      <div class="digits setting" style:margin-right="{m.shift * 1.9}rem">
        {#each S as d, i (i)}
          {@const j = dims.s - 1 - i}
          <span class="cell set">
            <button onclick={() => bump(j, 1)} aria-label="Increase setting digit {j + 1}">▲</button>
            <span class="num">{d}</span>
            <button onclick={() => bump(j, -1)} aria-label="Decrease setting digit {j + 1}">▼</button>
          </span>
        {/each}
      </div>
    </div>
    <div class="buttons">
      <button class="go" onclick={() => turn(false)}>{flavour === 'curta' ? 'Turn (crank down): add' : 'Turn the crank'}</button>
      {#if flavour === 'curta'}<button class="go sub" onclick={() => turn(true)}>Turn (crank lifted): subtract</button>{/if}
      <button onclick={() => shift(-1)} disabled={m.shift === 0} aria-label="Shift the carriage right">Carriage →</button>
      <button onclick={() => shift(1)} aria-label="Shift the carriage left">← Carriage</button>
      {#if flavour === 'curta'}<label class="rev"><input type="checkbox" bind:checked={reverse} /> reverse the counter</label>{/if}
      <button onclick={clearRegs}>Clear</button>
    </div>
    <p class="status">
      Shift {m.shift} · {after(tick, m.turns)} {m.turns === 1 ? 'turn' : 'turns'}{#if lastCarries.length}{' '}· last turn carried from {lastCarries.length} {lastCarries.length === 1 ? 'place' : 'places'}{/if}{#if pending.length} · <strong class="warn">{pending.length} carry {pending.length === 1 ? 'is' : 'carries are'} waiting: press ↑ to complete {pending.length === 1 ? 'it' : 'them'} by hand</strong>{/if}{#if m.wrapped && flavour === 'curta'} · <strong class="warn">the result went through zero</strong>{/if}
    </p>
    {#if ok}
      <ul class="checks">{#each ok as c (c.label)}<li class:pass={c.pass}>{c.pass ? '✓' : '○'} {c.label}</li>{/each}</ul>
    {/if}
  </div>
{/snippet}

{#if id}
  <ExerciseFrame {id} kind="Work the machine" {title} {prompt} {hints} {solution} completionLabel="Registers checked">
    {@render machine()}
    {#if done}<p class="ui ok">Registers checked: every condition above was met.</p>{/if}
    <button class="ui plain" onclick={reset}>Start again</button>
  </ExerciseFrame>
{:else}
  <Widget title={title ?? name} subtitle="Set a number with the ▲▼ keys, turn the crank, shift the carriage. The highlighted result digits are the ones the setting is lined up with." onreset={reset}>
    {@render machine()}
  </Widget>
{/if}

<style>
  .regs {
    font-size: 0.86rem;
  }
  .row {
    display: grid;
    grid-template-columns: 4.5rem 1fr;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.4rem;
  }
  .lab {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-3);
  }
  .digits {
    display: flex;
    gap: 0.15rem;
    justify-content: flex-end;
    overflow-x: auto;
    padding-bottom: 2px;
  }
  .cell {
    position: relative;
    display: inline-grid;
    place-items: center;
    width: 1.75rem;
    min-width: 1.75rem;
    height: 2rem;
    font-family: var(--font-mono);
    font-size: 1rem;
    font-weight: 600;
    border: 1px solid var(--line-strong);
    border-radius: 3px;
    background: var(--page);
  }
  .curta .result .cell {
    background: var(--ink);
    color: var(--page);
  }
  .result .cell.aligned {
    border-color: var(--brass);
    box-shadow: inset 0 -3px 0 var(--brass);
  }
  .cell.carry {
    outline: 2px solid var(--fx-red);
  }
  .cell.pend {
    outline: 2px dashed var(--bad);
  }
  .pendbtn {
    position: absolute;
    top: -0.9rem;
    left: 50%;
    transform: translateX(-50%);
    width: 1.4rem;
    height: 1.4rem;
    padding: 0;
    border-radius: 50%;
    border: 1px solid var(--bad);
    background: var(--bad-soft);
    color: var(--bad);
    cursor: pointer;
    font-size: 0.8rem;
    line-height: 1;
  }
  .counter .cell.here {
    background: var(--brass-soft);
  }
  .setting-row .digits {
    transition: margin-right 200ms;
  }
  .cell.set {
    height: auto;
    padding: 0.1rem 0;
    grid-template-rows: auto auto auto;
  }
  .cell.set button {
    border: 0;
    background: none;
    color: var(--accent);
    cursor: pointer;
    font-size: 0.66rem;
    padding: 0.15rem 0.3rem;
    min-height: 1.3rem;
  }
  .buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.6rem;
    align-items: center;
  }
  .buttons button,
  .plain {
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.65rem;
    cursor: pointer;
    min-height: 2rem;
    color: var(--ink);
    font-size: 0.84rem;
  }
  .buttons .go {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
  }
  .buttons .go.sub {
    background: var(--fx-red);
    border-color: var(--fx-red);
    color: var(--fx-cream);
  }
  .buttons button:disabled {
    opacity: 0.45;
  }
  .rev {
    display: inline-flex;
    gap: 0.3rem;
    align-items: center;
    font-size: 0.82rem;
  }
  .status {
    margin: 0.5rem 0 0;
    color: var(--ink-2);
    font-size: 0.8rem;
  }
  .warn {
    color: var(--bad);
  }
  .checks {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0;
    font-size: 0.84rem;
    color: var(--ink-2);
  }
  .checks .pass {
    color: var(--ok);
  }
  .ok {
    color: var(--ok);
    font-weight: 600;
  }
  .plain {
    margin-top: 0.4rem;
  }
</style>
