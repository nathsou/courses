<!--
  A mapped netlist drawn as a levelised schematic: inputs and flip-flop outputs on the left, each cell in the
  column of its logic depth, flip-flop inputs and outputs on the right. Cells are ordered within a column by the
  average position of their inputs, to reduce crossings. Optional: highlighted cells and nets, labels on nets,
  and a click handler on cells.
-->
<script lang="ts">
  import { levels, type Netlist } from '$lib/eda/techmap';

  let {
    netlist,
    hot = new Set<string>(),
    hotNets = new Set<string>(),
    netLabel,
    cellLabel,
    oncell,
    selected,
  }: {
    netlist: Netlist;
    hot?: Set<string>;
    hotNets?: Set<string>;
    netLabel?: (net: string) => string | undefined;
    cellLabel?: (id: string) => string | undefined;
    oncell?: (id: string) => void;
    selected?: string;
  } = $props();

  const COL = 86;
  const ROW = 40;
  const layout = $derived.by(() => {
    const lv = levels(netlist);
    const sources = [...netlist.inputs, ...netlist.flops.map((f) => f.q)];
    const ypos = new Map<string, number>();
    sources.forEach((n, i) => ypos.set(n, i));
    const depth = Math.max(1, ...netlist.instances.map((i) => lv.get(i.out) ?? 1));
    const cols: string[][] = Array.from({ length: depth }, () => []);
    for (const inst of netlist.instances) cols[(lv.get(inst.out) ?? 1) - 1]!.push(inst.id);
    const byId = new Map(netlist.instances.map((i) => [i.id, i]));
    for (const col of cols) {
      const bary = (id: string) => {
        const ins = byId.get(id)!.ins.filter((n) => ypos.has(n));
        return ins.length ? ins.reduce((s, n) => s + ypos.get(n)!, 0) / ins.length : 0;
      };
      col.sort((a, b) => bary(a) - bary(b));
      col.forEach((id, i) => ypos.set(byId.get(id)!.out, i));
    }
    const rows = Math.max(sources.length, ...cols.map((c) => c.length), netlist.flops.length + netlist.outputs.length);
    const H = rows * ROW + 30;
    const cellPos = new Map<string, { x: number; y: number }>();
    const netPos = new Map<string, { x: number; y: number }>();
    const colY = (i: number, n: number) => 20 + ((i + 0.5) * (H - 30)) / n;
    sources.forEach((n, i) => netPos.set(n, { x: 70, y: colY(i, sources.length) }));
    cols.forEach((col, c) =>
      col.forEach((id, i) => {
        const p = { x: 110 + c * COL, y: colY(i, col.length) };
        cellPos.set(id, p);
        netPos.set(byId.get(id)!.out, { x: p.x + 52, y: p.y });
      }),
    );
    for (const k of ['0', '1']) netPos.set(k, { x: 70, y: H - 8 });
    const sinks = [...netlist.flops.map((f) => ({ name: `${f.id.replace('R_', '')}′`, net: f.d, kind: 'D' })), ...netlist.outputs.filter((o) => !sources.includes(o.net)).map((o) => ({ name: o.name, net: o.net, kind: 'out' }))];
    const xr = 110 + depth * COL + 20;
    const sinkPos = sinks.map((s, i) => ({ ...s, x: xr, y: colY(i, sinks.length) }));
    return { cols, cellPos, netPos, sinkPos, W: xr + 80, H, sources, byId };
  });
  const short = (n: string) => n;
</script>

<div class="nlv">
  <svg viewBox="0 0 {layout.W} {layout.H}" width={layout.W} height={layout.H} role="img" aria-label="Netlist with {netlist.instances.length} cells">
    {#each netlist.instances as inst (inst.id)}
      {@const p = layout.cellPos.get(inst.id)!}
      {#each inst.ins as n, k (k)}
        {@const s = layout.netPos.get(n)}
        {#if s}
          {@const py = p.y - 8 + (16 * (k + 0.5)) / inst.ins.length}
          <path d="M{s.x},{s.y} C{s.x + 24},{s.y} {p.x - 24},{py} {p.x},{py}" class="w" class:hot={hotNets.has(n) && hot.has(inst.id)} />
        {/if}
      {/each}
    {/each}
    {#each layout.sinkPos as s (s.name)}
      {@const from = layout.netPos.get(s.net)}
      {#if from}<path d="M{from.x},{from.y} C{from.x + 30},{from.y} {s.x - 30},{s.y} {s.x},{s.y}" class="w" class:hot={hotNets.has(s.net)} />{/if}
    {/each}
    {#each layout.sources as n (n)}
      {@const p = layout.netPos.get(n)!}
      <text x={p.x - 4} y={p.y + 4} class="io r">{short(n)}</text>
      <circle cx={p.x} cy={p.y} r="2.5" class="dot" />
      {#if netLabel?.(n)}<text x={p.x + 5} y={p.y - 5} class="lab">{netLabel(n)}</text>{/if}
    {/each}
    {#each netlist.instances as inst (inst.id)}
      {@const p = layout.cellPos.get(inst.id)!}
      <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
      <g class="cell" class:hot={hot.has(inst.id)} class:sel={selected === inst.id} onclick={() => oncell?.(inst.id)} role={oncell ? 'button' : undefined} tabindex={oncell ? 0 : undefined} onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && oncell?.(inst.id)} aria-label={oncell ? `${inst.cell} ${inst.id}` : undefined}>
        <rect x={p.x} y={p.y - 12} width="52" height="24" rx="3" />
        <text x={p.x + 26} y={p.y + 4} class="nm">{inst.cell}</text>
      </g>
      {#if cellLabel?.(inst.id)}<text x={p.x + 26} y={p.y - 15} class="lab c">{cellLabel(inst.id)}</text>{/if}
      {#if netLabel?.(inst.out)}<text x={p.x + 55} y={p.y - 5} class="lab">{netLabel(inst.out)}</text>{/if}
    {/each}
    {#each layout.sinkPos as s (s.name)}
      <circle cx={s.x} cy={s.y} r="2.5" class="dot" />
      <text x={s.x + 5} y={s.y + 4} class="io">{s.name}</text>
    {/each}
  </svg>
</div>

<style>
  .nlv {
    overflow-x: auto;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--page);
  }
  svg {
    display: block;
    font-family: var(--font-ui);
  }
  .w {
    fill: none;
    stroke: var(--line-strong);
    stroke-width: 1.2;
  }
  .w.hot {
    stroke: var(--bad);
    stroke-width: 2.4;
  }
  .cell rect {
    fill: var(--surface);
    stroke: var(--ink-2);
    stroke-width: 1.3;
  }
  .cell[role='button'] {
    cursor: pointer;
  }
  .cell.hot rect {
    fill: var(--bad-soft);
    stroke: var(--bad);
    stroke-width: 2;
  }
  .cell.sel rect {
    stroke: var(--ac);
    stroke-width: 3;
  }
  .nm {
    font-size: 10px;
    font-weight: 700;
    text-anchor: middle;
    fill: var(--ink);
  }
  .io {
    font-family: var(--font-mono);
    font-size: 10px;
    fill: var(--ink-2);
  }
  .io.r {
    text-anchor: end;
  }
  .dot {
    fill: var(--ink-2);
  }
  .lab {
    font-family: var(--font-mono);
    font-size: 9px;
    fill: var(--accent);
  }
  .lab.c {
    text-anchor: middle;
  }
</style>
