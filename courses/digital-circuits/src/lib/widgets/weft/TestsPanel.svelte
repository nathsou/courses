<!-- The results of a design's tests: pass or fail, with the failing `expect`, the values it read and the waveform. -->
<script lang="ts">
  import type { TestRun, TestResult } from '$lib/weft/testbench';
  import { showValue } from '$lib/weft/testbench';
  import Waveform from './Waveform.svelte';

  let { run, running = false, onreveal }: {
    run: TestRun | undefined;
    running?: boolean;
    /** Jump to a line of the tests. */
    onreveal?: (line: number) => void;
  } = $props();

  const results = $derived(run?.results ?? []);
  const passed = $derived(results.filter((t) => t.pass).length);

  /** The waveform of a test: the data ports, up to the failure (the last 12 rows). */
  function wave(t: TestResult) {
    const end = t.failed ? t.trace.findLastIndex((r) => r.line <= t.failed!.line && r.cycle <= t.failed!.cycle) + 1 : t.trace.length;
    const rows = t.trace.slice(Math.max(0, end - 12), Math.max(end, 1));
    const ports = t.ports.filter((p) => !p.clock && !p.added);
    return {
      cycles: rows.map((r) => r.cycle),
      signals: ports.map((p) => ({ name: p.name, width: p.width, values: rows.map((r) => r.values[p.name] ?? 0n) })),
      marker: t.failed ? rows.length - 1 : undefined,
    };
  }
</script>

<div class="tests ui" aria-live="polite">
  {#if running}
    <p class="note">Running the tests…</p>
  {:else if !run}
    <p class="note">Press <strong>Run tests</strong> to run this design's tests on synth's simulator.</p>
  {:else if !run.ok}
    <p class="sum bad">The tests did not run: {run.error}</p>
  {:else if results.length === 0}
    <p class="note">There are no tests.</p>
  {:else}
    <p class="sum" class:bad={passed < results.length}>{passed} of {results.length} {results.length === 1 ? 'test' : 'tests'} passed</p>
    <ul>
      {#each results as t (t.name)}
        <li class:ok={t.pass}>
          <div class="head">
            <span class="badge">{t.pass ? 'pass' : 'fail'}</span>
            <span class="tname">{t.name}</span>
            <span class="cyc">{t.trace.at(-1)?.cycle ?? 0} cycles</span>
          </div>
          {#if t.error}
            <div class="fail"><p>{t.error}</p></div>
          {:else if t.failed}
            {@const f = t.failed}
            <div class="fail">
              <p>
                <button type="button" class="link" onclick={() => onreveal?.(f.line)}>line {f.line}</button>
                <code>expect {f.text}</code> failed at cycle {f.cycle}
              </p>
              {#if Object.keys(f.values).length}
                <p class="vals">{#each Object.entries(f.values) as [k, v] (k)}<span><b>{k}</b> = {showValue(v, t.ports.find((p) => p.name === k)?.width)}</span>{/each}</p>
              {/if}
              {#if wave(t).cycles.length > 1}
                {@const w = wave(t)}
                <div class="wv"><Waveform signals={w.signals} cycles={w.cycles} marker={w.marker} label="Waveform of “{t.name}” up to the failure" /></div>
              {/if}
            </div>
          {/if}
        </li>
      {/each}
    </ul>
  {/if}
</div>
<style>
  .tests {
    font-size: 0.86rem;
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.5rem;
  }
  .note {
    color: var(--mute);
    margin: 0.4rem 0;
  }
  .sum {
    margin: 0;
    font-weight: 600;
    color: var(--ok);
  }
  .sum.bad {
    color: var(--bad);
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.5rem;
  }
  li {
    border: 1px solid var(--line);
    border-left: 4px solid var(--bad);
    border-radius: 6px;
    padding: 0.5rem 0.7rem;
    background: var(--panel);
  }
  li.ok {
    border-left-color: var(--ok);
  }
  .head {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .badge {
    font-family: var(--font-mono);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.05rem 0.4rem;
    border-radius: 3px;
    background: var(--bad-soft);
    color: var(--bad);
  }
  .ok .badge {
    background: var(--ok-soft);
    color: var(--ok);
  }
  .tname {
    font-weight: 500;
  }
  .cyc {
    margin-left: auto;
    color: var(--mute);
    font-family: var(--font-mono);
    font-size: 0.72rem;
  }
  .fail {
    margin-top: 0.4rem;
    display: grid;
    gap: 0.3rem;
  }
  .fail p {
    margin: 0;
  }
  .link {
    border: 0;
    background: none;
    padding: 0;
    font: inherit;
    font-family: var(--font-mono);
    color: var(--copper-ink);
    text-decoration: underline;
    cursor: pointer;
  }
  .vals {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 0.9rem;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--ink-2);
  }
  .wv {
    overflow-x: auto;
    padding: 0.2rem 0;
  }
</style>
