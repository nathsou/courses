<!--
  Sanitiser goggles: every program in the zoo, run under every detector model. Each cell says whether the
  detector caught the error and where; click one to see the run, the report, and what the detector cost.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import CodeEditor from '$lib/exercise/CodeEditor.svelte';
  import { ZOO } from '$lib/mm/mote/zoo';
  import { DETECTORS, runUnder, type GoggleResult } from '$lib/mm/managers/detectors';

  const dets = DETECTORS.map((mk) => {
    const d = mk();
    return { id: d.id, label: d.label, blurb: d.blurb, memory: d.memory, mk };
  });
  const results: Record<string, Record<string, GoggleResult>> = {};
  for (const p of ZOO) {
    results[p.id] = {};
    for (const d of dets) results[p.id]![d.id] = runUnder(p.src, d.mk, p.error);
  }
  const score = (det: string) => ZOO.filter((p) => results[p.id]![det]!.caught).length;

  let row = $state('jump');
  let col = $state('redzones');
  const prog = $derived(ZOO.find((p) => p.id === row)!);
  const res = $derived(results[row]![col]!);
  const det = $derived(dets.find((d) => d.id === col)!);

  function cellText(r: GoggleResult, error: string) {
    if (r.caught) return error === 'leak' ? 'at exit' : `line ${r.report!.line}`;
    return 'missed';
  }
  function verdict(r: GoggleResult, error: string): string {
    if (r.caught && error === 'leak') return `Caught at exit: ${r.leaks.length} block${r.leaks.length === 1 ? '' : 's'} never freed.`;
    if (r.caught) return `Caught on line ${r.report!.line}, at the moment of the error.`;
    if (r.report) return `Stopped on line ${r.report.line}, but for a different reason.`;
    return 'Missed: the program ran to the end.';
  }
</script>

<Widget title="Sanitiser goggles" kind="Detectors" n="16.1" caption="Each row is a program from the zoo; each column, a simplified model of a family of detectors. Click a cell to see the run. The models are small enough to read in <code>src/lib/mm/managers/detectors.ts</code>; the real tools are described in the text.">
  <div class="table-scroll">
    <table class="ui">
      <thead>
        <tr>
          <th>Error</th>
          {#each dets as d (d.id)}<th title={d.blurb}>{d.label}</th>{/each}
        </tr>
      </thead>
      <tbody>
        {#each ZOO as p (p.id)}
          <tr>
            <th scope="row">{p.title}</th>
            {#each dets as d (d.id)}
              {@const r = results[p.id]![d.id]!}
              <td>
                <button class="cell" class:ok={r.caught} class:sel={row === p.id && col === d.id} onclick={() => ((row = p.id), (col = d.id))} aria-label="{p.title} under {d.label}: {cellText(r, p.error)}">
                  <span class="mark">{r.caught ? '✓' : '✗'}</span> {cellText(r, p.error)}
                </button>
              </td>
            {/each}
          </tr>
        {/each}
        <tr class="tot">
          <th scope="row">Caught</th>
          {#each dets as d (d.id)}<td class="mono">{score(d.id)} of {ZOO.length}</td>{/each}
        </tr>
      </tbody>
    </table>
  </div>

  <div class="detail">
    <div>
      <div class="lbl ui">{prog.title}, under {det.label.toLowerCase()}</div>
      <CodeEditor value={prog.src} lang="mote" readonly minLines={6} maxHeight="20rem" highlightLine={res.report?.line} label={prog.title} />
    </div>
    <div class="side ui">
      <p class="blurb">{det.blurb}</p>
      <p class="verdict" class:good={res.caught} class:bad={!res.caught}>{verdict(res, prog.error)}</p>
      {#if res.report}<pre class="report mono">{res.report.message}</pre>{/if}
      {#if prog.error === 'leak' && res.leaks.length}<pre class="report mono">{res.leaks.map((l) => `leak: ${l}`).join('\n')}</pre>{/if}
      <div class="lbl">Output</div>
      <pre class="out mono">{res.output.join('\n') || '(none)'}</pre>
      <dl class="cost">
        <dt>Memory cost</dt><dd>{det.memory}</dd>
        <dt>Checks on loads and stores</dt><dd class="mono">{res.checks}</dd>
      </dl>
    </div>
  </div>
</Widget>

<style>
  .table-scroll {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.8rem;
  }
  th,
  td {
    padding: 0.25rem 0.35rem;
    border-bottom: 1px solid var(--line);
    text-align: left;
    white-space: nowrap;
  }
  thead th {
    font-size: 0.72rem;
    color: var(--ink-2);
  }
  tbody th {
    font-weight: 600;
  }
  .cell {
    font: inherit;
    width: 100%;
    text-align: left;
    border: 1px solid transparent;
    border-radius: 5px;
    padding: 0.2rem 0.45rem;
    cursor: pointer;
    color: var(--uaf);
    background: color-mix(in srgb, var(--uaf) 7%, transparent);
  }
  .cell.ok {
    color: var(--green);
    background: color-mix(in srgb, var(--green) 10%, transparent);
  }
  .cell.sel {
    border-color: var(--copper);
    box-shadow: 0 0 0 1px var(--copper);
  }
  .mark {
    font-weight: 700;
  }
  tr.tot td {
    font-weight: 600;
    padding-left: 0.8rem;
  }
  .detail {
    display: grid;
    grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr);
    gap: 1rem;
    margin-top: 1rem;
  }
  @media (max-width: 760px) {
    .detail {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .lbl {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-2);
    margin-bottom: 0.3rem;
  }
  .side {
    font-size: 0.84rem;
  }
  .blurb {
    margin: 0 0 0.5rem;
    color: var(--ink-2);
  }
  .verdict {
    font-weight: 700;
    margin: 0 0 0.5rem;
  }
  .verdict.good {
    color: var(--green);
  }
  .verdict.bad {
    color: var(--uaf);
  }
  pre {
    margin: 0 0 0.6rem;
    padding: 0.45rem 0.6rem;
    border-radius: 5px;
    font-size: 0.74rem;
    white-space: pre-wrap;
    word-break: break-word;
  }
  .report {
    background: color-mix(in srgb, var(--uaf) 10%, transparent);
    border-left: 3px solid var(--uaf);
  }
  .out {
    background: var(--panel);
    border: 1px solid var(--line);
  }
  .cost {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.2rem 0.8rem;
    margin: 0;
    font-size: 0.8rem;
  }
  dt {
    color: var(--ink-2);
  }
  dd {
    margin: 0;
  }
</style>
