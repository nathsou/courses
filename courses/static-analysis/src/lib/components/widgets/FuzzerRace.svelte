<!--
  Five test generators race on the same function: random inputs, coverage-guided fuzzing with and without a
  dictionary of the program's constants, concolic testing, and a hybrid. The chart shows branch coverage against
  the number of executions (log scale); a dot marks the execution that found the bug. Seeds are fixed, so the race
  is the same for every reader. `:::fuzzer-race` with a ```js block.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import CodeEditor from '$lib/editor/CodeEditor.svelte';
  import { CfgError } from '$lib/sa/flow/cfg';
  import { race, type RaceResult } from '$lib/sa/symex/fuzz';

  let {
    code,
    budget = '20000',
    n,
    caption,
    title = 'Fuzzer race',
    subtitle = 'Branch coverage against executions, on a log scale. A dot marks the bug.',
  }: { code: string; budget?: string; n?: string; caption?: string; title?: string; subtitle?: string } = $props();

  // svelte-ignore state_referenced_locally
  let source = $state(code);
  // svelte-ignore state_referenced_locally
  let ran = $state(code);
  const result = $derived.by(() => {
    try {
      return { r: race(ran, { budget: Number(budget) || 20000 }) };
    } catch (e) {
      return { error: e instanceof CfgError ? e.message : String(e) };
    }
  });

  const COLOURS = ['#8a8f98', '#2f6fb0', '#3f8f4f', '#b0592f', '#8a4fb0'];
  const W = 560;
  const H = 220;
  const L = 36;
  const B = 26;
  const maxExec = $derived(Math.max(10, ...(result.r?.results.map((x) => x.executions) ?? [10])));
  const xOf = (e: number) => L + (Math.log10(Math.max(1, e)) / Math.log10(maxExec)) * (W - L - 10);
  const yOf = (c: number) => H - B - (c / Math.max(1, result.r?.total ?? 1)) * (H - B - 10);
  const line = (x: RaceResult) => {
    const pts = x.progress.map(([e, c]) => [xOf(e), yOf(c)] as const);
    let d = `M${xOf(1)},${yOf(0)}`;
    let prevY = yOf(0);
    for (const [px, py] of pts) {
      d += ` L${px},${prevY} L${px},${py}`;
      prevY = py;
    }
    return `${d} L${xOf(x.executions)},${prevY}`;
  };
  const ticks = $derived([1, 10, 100, 1000, 10000, 100000].filter((t) => t <= maxExec));
  const fmt = (input: Record<string, number>) => Object.entries(input).map(([k, v]) => `${k} = ${v}`).join(', ');
</script>

<Widget {title} {subtitle} {n} {caption} onreset={() => { source = code; ran = code; }}>
  <div class="fr">
    <CodeEditor value={source} lang="js" minLines={8} label="Target" onchange={(c) => (source = c)} />
    <div class="ui">
      <button class="go" onclick={() => (ran = source)} disabled={ran === source}>{ran === source ? 'Race finished' : 'Run the race on the edited code'}</button>
      {#if result.error}
        <p class="err">{result.error}</p>
      {:else if result.r}
        <svg viewBox="0 0 {W} {H}" role="img" aria-label="Coverage against executions">
          <line x1={L} y1={H - B} x2={W - 10} y2={H - B} class="axis" />
          <line x1={L} y1={10} x2={L} y2={H - B} class="axis" />
          {#each ticks as t (t)}<text x={xOf(t)} y={H - 8} text-anchor="middle" class="tick">{t >= 1000 ? `${t / 1000}k` : t}</text>{/each}
          {#each Array.from({ length: result.r.total + 1 }, (_, i) => i) as c (c)}<text x={L - 6} y={yOf(c) + 3} text-anchor="end" class="tick">{c}</text>{/each}
          {#each result.r.results as x, i (x.name)}
            <path d={line(x)} class="run" style:stroke={COLOURS[i]} />
            {#if x.bug}<circle cx={xOf(x.bug.execution)} cy={yOf(x.covered)} r="5" style:fill={COLOURS[i]} class="bug" />{/if}
          {/each}
        </svg>
        <table>
          <thead><tr><th scope="col">Strategy</th><th scope="col">Branches</th><th scope="col">Executions</th><th scope="col">Bug</th></tr></thead>
          <tbody>
            {#each result.r.results as x, i (x.name)}
              <tr>
                <td><span class="sw" style:background={COLOURS[i]}></span>{x.name}</td>
                <td>{x.covered} / {result.r.total}</td>
                <td>{x.executions}{x.solverQueries ? ` (+${x.solverQueries} solver queries)` : ''}</td>
                <td>{#if x.bug}<span class="found">found at execution {x.bug.execution}, <code>{fmt(x.bug.input)}</code></span>{:else}<span class="none">not found</span>{/if}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      {/if}
    </div>
  </div>
</Widget>

<style>
  .fr {
    display: grid;
    gap: 0.6rem;
  }
  .fr > :global(*) {
    min-width: 0;
  }
  .go {
    font: inherit;
    font-size: 0.82rem;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 6px;
    padding: 0.2rem 0.7rem;
    cursor: pointer;
  }
  .go:disabled {
    opacity: 0.6;
    cursor: default;
  }
  svg {
    width: 100%;
    max-width: 640px;
    height: auto;
    display: block;
    margin: 0.5rem 0;
  }
  .axis {
    stroke: var(--line-strong);
  }
  .tick {
    font-size: 10px;
    fill: var(--ink-2);
  }
  .run {
    fill: none;
    stroke-width: 2;
  }
  .bug {
    stroke: var(--panel);
    stroke-width: 1.5;
  }
  table {
    border-collapse: collapse;
    font-size: 0.82rem;
    width: 100%;
  }
  th,
  td {
    text-align: left;
    padding: 0.25rem 0.4rem;
    border-bottom: 1px solid var(--line);
    text-transform: none;
    letter-spacing: normal;
    vertical-align: top;
  }
  .sw {
    display: inline-block;
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 2px;
    margin-right: 0.35rem;
    vertical-align: middle;
  }
  .found {
    color: var(--bad);
  }
  .none {
    color: var(--ink-2);
  }
  .err {
    color: var(--bad);
  }
</style>
