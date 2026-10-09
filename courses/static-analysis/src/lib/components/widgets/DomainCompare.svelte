<!--
  Several abstract interpreters on the same function, check by check: which divisions and assertions each one
  proves, and the fact it had before each check. `:::domain-compare{analyses="intervals,parity,reduced"}` with a ```js block.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import CodeEditor from '$lib/editor/CodeEditor.svelte';
  import { buildCfg, CfgError, type Cfg } from '$lib/sa/flow/cfg';
  import { solve } from '$lib/sa/flow/dataflow';
  import type { Check } from '$lib/sa/absint/checks';
  import { DOMAIN_ANALYSES } from '$lib/sa/absint/registry';

  let {
    code,
    analyses = 'intervals,parity,product,reduced',
    n,
    caption,
    title = 'Domains compared',
    subtitle = 'Each row is an analysis, each column a check. Click a cell to see what the analysis knew there.',
  }: { code: string; analyses?: string; n?: string; caption?: string; title?: string; subtitle?: string } = $props();

  // svelte-ignore state_referenced_locally
  let source = $state(code);
  let picked = $state<{ row: string; key: string } | null>(null);
  const keys = $derived(analyses.split(',').map((s) => s.trim()).filter((k) => k in DOMAIN_ANALYSES));

  const result = $derived.by((): { cfg?: Cfg; error?: string; rows?: { key: string; label: string; checks: Map<string, Check>; facts: unknown[]; truncated: boolean }[]; columns?: Check[] } => {
    let cfg: Cfg;
    try {
      cfg = buildCfg(source);
    } catch (e) {
      return { error: e instanceof CfgError ? e.message : String(e) };
    }
    const columns = new Map<string, Check>();
    const rows = keys.map((key) => {
      const { label, analysis } = DOMAIN_ANALYSES[key]!;
      const r = solve(cfg, analysis, { narrowRounds: 2, maxSteps: 2000 });
      const checks = new Map<string, Check>();
      if (!r.truncated) for (const node of cfg.nodes) for (const c of analysis.checks(node, r.input[node.id], cfg)) checks.set(c.key, c);
      // Every check of the function, whichever analysis found it reachable.
      for (const node of cfg.nodes) for (const c of analysis.checks(node, analysis.boundary(cfg), cfg)) if (!columns.has(c.key)) columns.set(c.key, c);
      for (const c of checks.values()) if (!columns.has(c.key)) columns.set(c.key, c);
      return { key, label, checks, facts: r.input, truncated: r.truncated };
    });
    const order = (c: Check) => cfg.nodes[c.node]?.range?.[0] ?? 0;
    return { cfg, rows, columns: [...columns.values()].sort((a, b) => order(a) - order(b) || a.key.localeCompare(b.key)) };
  });

  const lineOf = (cfg: Cfg, node: number) => {
    const at = cfg.nodes[node]?.range?.[0] ?? 0;
    return source.slice(0, at).split('\n').length;
  };
  const selected = $derived.by(() => {
    if (!picked || !result.rows || !result.cfg) return undefined;
    const row = result.rows.find((r) => r.key === picked!.row);
    const column = result.columns?.find((c) => c.key === picked!.key);
    if (!row || !column) return undefined;
    const { analysis } = DOMAIN_ANALYSES[row.key]!;
    return { row, column, check: row.checks.get(column.key), fact: analysis.lattice.format(row.facts[column.node], result.cfg) };
  });
</script>

<Widget {title} {subtitle} {n} {caption} onreset={() => { source = code; picked = null; }}>
  <div class="dc">
    <CodeEditor value={source} lang="js" minLines={6} label="Function" onchange={(c) => { source = c; picked = null; }} highlight={selected && result.cfg?.nodes[selected.column.node]?.range ? { from: result.cfg.nodes[selected.column.node]!.range![0], to: result.cfg.nodes[selected.column.node]!.range![1] } : null} />
    <div class="ui">
      {#if result.error}
        <p class="err">{result.error}</p>
      {:else if result.rows && result.columns && result.cfg}
        {#if result.columns.length === 0}
          <p class="note">This function has no division and no assertion to check.</p>
        {:else}
          <div class="scroll">
            <table>
              <thead>
                <tr>
                  <th scope="col">Analysis</th>
                  {#each result.columns as c (c.key)}<th scope="col"><span class="kind">line {lineOf(result.cfg, c.node)} · {c.kind === 'division' ? 'divisor' : 'assert'}</span><code>{c.label}</code></th>{/each}
                </tr>
              </thead>
              <tbody>
                {#each result.rows as row (row.key)}
                  <tr>
                    <th scope="row">{row.label}</th>
                    {#each result.columns as c (c.key)}
                      {@const check = row.checks.get(c.key)}
                      {@const proven = !row.truncated && (!check || check.proven)}
                      <td>
                        <button class:ok={proven} class:bad={!proven} class:on={picked?.row === row.key && picked?.key === c.key} onclick={() => (picked = picked?.row === row.key && picked?.key === c.key ? null : { row: row.key, key: c.key })} aria-label="{row.label}, {c.label}: {proven ? 'proven' : 'alarm'}">
                          {proven ? '✓ proven' : '⚠ alarm'}
                        </button>
                      </td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          {#if selected}
            <div class="detail" aria-live="polite">
              <p><strong>{selected.row.label}</strong>, before line {lineOf(result.cfg, selected.column.node)}: <code>{selected.fact}</code></p>
              <p>
                {#if selected.row.truncated}No fixpoint within the step limit.
                {:else if !selected.check}The analysis finds this point unreachable, so the check holds vacuously.
                {:else}{selected.column.kind === 'division' ? 'The divisor' : 'The assertion'} {selected.check.detail}.{/if}
              </p>
            </div>
          {/if}
        {/if}
      {/if}
    </div>
  </div>
</Widget>

<style>
  .dc {
    display: grid;
    gap: 0.7rem;
  }
  .dc > :global(*) {
    min-width: 0;
  }
  .scroll {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    font-size: 0.84rem;
    width: 100%;
  }
  th {
    text-transform: none;
    letter-spacing: normal;
  }
  th,
  td {
    border-bottom: 1px solid var(--line);
    padding: 0.3rem 0.45rem;
    text-align: left;
    vertical-align: middle;
  }
  thead th {
    font-weight: 600;
    vertical-align: bottom;
  }
  thead th code {
    display: block;
    font-size: 0.78rem;
  }
  .kind {
    display: block;
    font-size: 0.72rem;
    font-weight: 400;
    color: var(--ink-2);
  }
  tbody th {
    font-weight: 500;
    min-width: 7rem;
  }
  td button {
    font: inherit;
    font-size: 0.8rem;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    border-radius: 999px;
    padding: 0.1rem 0.6rem;
    cursor: pointer;
    white-space: nowrap;
  }
  td button.ok {
    color: var(--ok);
  }
  td button.bad {
    color: var(--maybe);
  }
  td button.on {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }
  .detail {
    margin-top: 0.5rem;
    font-size: 0.86rem;
  }
  .detail p {
    margin: 0.2rem 0;
  }
  .detail code {
    overflow-wrap: anywhere;
  }
  .note {
    color: var(--ink-2);
    font-size: 0.86rem;
  }
  .err {
    color: var(--bad);
  }
</style>
