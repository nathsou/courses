<!--
  The decade counter's RTL beside the hardware it describes: a 4-bit register, an incrementer, a comparator,
  three multiplexers and an AND gate. Select a line of code to light up its hardware (or a block to light up its
  line); set en and rst and press the clock to step the circuit, with every bus showing its value.
-->
<script lang="ts">
  import { highlightHdl } from '$lib/eda/highlight';

  const LINES: { code: string; blocks: string[] }[] = [
    { code: 'input en', blocks: ['en', 'mux2', 'and'] },
    { code: 'input rst', blocks: ['rst', 'mux3'] },
    { code: 'reg q: 4 = 0', blocks: ['reg'] },
    { code: 'output tc = en && q == 9', blocks: ['cmp', 'and', 'tc'] },
    { code: 'output digit: 4 = q', blocks: ['digit'] },
    { code: 'q <= rst ? 0 : !en ? q : q == 9 ? 0 : q + 1', blocks: ['inc', 'cmp', 'mux1', 'mux2', 'mux3', 'dbus'] },
  ];

  let sel = $state<number | null>(5);
  let q = $state(7);
  let en = $state(1);
  let rst = $state(0);
  let cycle = $state(0);

  const inc = $derived((q + 1) & 15);
  const is9 = $derived(q === 9 ? 1 : 0);
  const m1 = $derived(is9 ? 0 : inc);
  const m2 = $derived(en ? m1 : q);
  const d = $derived(rst ? 0 : m2);
  const tc = $derived(en && is9 ? 1 : 0);
  const lit = $derived(new Set(sel === null ? [] : LINES[sel]!.blocks));
  const on = (b: string) => lit.has(b);
  function pickBlock(b: string) {
    const i = LINES.findIndex((l) => l.blocks.includes(b));
    sel = i >= 0 ? i : null;
  }
  function clock() {
    q = d;
    cycle++;
  }
</script>

<figure class="widget-like wide ui">
  <header>
    <span class="kind">Interactive</span>
    <h4>Every line is hardware</h4>
    <p class="sub">Select a line of the design to see the hardware it describes. Set the inputs and press the clock: the register takes the value on its D input, and everything else follows at once.</p>
  </header>
  <div class="body">
    <ol class="code" aria-label="The decade counter, line by line">
      {#each LINES as l, i (i)}
        <li><button class:sel={sel === i} onclick={() => (sel = sel === i ? null : i)} aria-pressed={sel === i}><code>{@html highlightHdl(l.code)}</code></button></li>
      {/each}
    </ol>
    <div class="scroll">
      <svg viewBox="0 0 560 318" role="img" aria-label="Block diagram: q = {q}, next value {d}, tc = {tc}">
        <!-- the next value, back to the register's D input -->
        <path d="M456,115 L540,115 L540,284 L20,284 L20,155 L40,155" class="bus" class:lit={on('dbus')} />
        <text x="536" y="108" class="v" text-anchor="end">D = {d}</text>
        <!-- register -->
        <g class="blk" class:lit={on('reg')} onclick={() => pickBlock('reg')} role="presentation">
          <rect x="40" y="120" width="74" height="70" rx="3" />
          <text x="77" y="148" class="t">q</text>
          <text x="77" y="164" class="s">4 flip-flops</text>
          <path d="M40,176 L50,182 L40,188" class="clk" />
        </g>
        <text x="77" y="208" class="v big">{q}</text>
        <!-- q, to everything that reads it -->
        <path d="M114,155 L140,155 M140,40 L140,268 M140,70 L170,70 M140,200 L170,200 M140,268 L352,268 L352,140 L360,140" class="bus" />
        <path d="M140,40 L160,40" class="bus" class:lit={on('digit')} />
        <text x="164" y="44" class="v">digit = {q}</text>
        <!-- incrementer -->
        <g class="blk" class:lit={on('inc')} onclick={() => pickBlock('inc')} role="presentation">
          <rect x="170" y="52" width="56" height="36" rx="3" /><text x="198" y="75" class="t">+ 1</text>
        </g>
        <path d="M226,70 L256,70 L256,92 L280,92" class="bus" /><text x="230" y="64" class="v">{inc}</text>
        <!-- comparator -->
        <g class="blk" class:lit={on('cmp')} onclick={() => pickBlock('cmp')} role="presentation">
          <rect x="170" y="182" width="56" height="36" rx="3" /><text x="198" y="205" class="t">= 9</text>
        </g>
        <path d="M226,200 L250,200 M238,200 L238,124 L293,124 L293,108" class="wire" class:lit={on('cmp')} /><text x="230" y="194" class="v">{is9}</text>
        <!-- multiplexer 1: q == 9 ? 0 : q + 1 -->
        <g class="blk" class:lit={on('mux1')} onclick={() => pickBlock('mux1')} role="presentation">
          <path d="M280,40 L306,50 L306,100 L280,110 Z" />
          <text x="293" y="79" class="m">1</text>
        </g>
        <path d="M268,58 L280,58" class="wire" /><text x="264" y="62" class="s r">0</text>
        <path d="M306,75 L330,75 L330,90 L360,90" class="bus" /><text x="310" y="68" class="v">{m1}</text>
        <!-- multiplexer 2: en ? … : q -->
        <g class="blk" class:lit={on('mux2')} onclick={() => pickBlock('mux2')} role="presentation">
          <path d="M360,70 L386,80 L386,150 L360,160 Z" />
          <text x="373" y="119" class="m">2</text>
        </g>
        <path d="M373,155 L373,300" class="wire" class:lit={on('en')} />
        <path d="M386,115 L408,115 L408,125 L430,125" class="bus" /><text x="390" y="108" class="v">{m2}</text>
        <!-- multiplexer 3: rst ? 0 : … -->
        <g class="blk" class:lit={on('mux3')} onclick={() => pickBlock('mux3')} role="presentation">
          <path d="M430,80 L456,90 L456,140 L430,150 Z" />
          <text x="443" y="119" class="m">3</text>
        </g>
        <path d="M418,98 L430,98" class="wire" /><text x="414" y="102" class="s r">0</text>
        <path d="M443,145 L443,300" class="wire" class:lit={on('rst')} />
        <!-- terminal count -->
        <g class="blk" class:lit={on('and')} onclick={() => pickBlock('and')} role="presentation">
          <path d="M250,190 L268,190 Q286,190 286,208 Q286,226 268,226 L250,226 Z" />
        </g>
        <path d="M373,244 L240,244 L240,218 L250,218" class="wire" class:lit={on('en')} />
        <path d="M286,208 L290,208" class="wire" class:lit={on('tc')} /><text x="292" y="212" class="v">tc = {tc}</text>
        <!-- inputs -->
        <text x="373" y="314" class="v c" class:hot={on('en')}>en = {en}</text>
        <text x="443" y="314" class="v c" class:hot={on('rst')}>rst = {rst}</text>
      </svg>
    </div>
    <div class="ctl">
      <button class:on={en === 1} onclick={() => (en ^= 1)} aria-pressed={en === 1}>en = {en}</button>
      <button class:on={rst === 1} onclick={() => (rst ^= 1)} aria-pressed={rst === 1}>rst = {rst}</button>
      <button class="go" onclick={clock}>Clock edge ↑</button>
      <span class="cyc">cycles: {cycle}</span>
    </div>
  </div>
</figure>

<style>
  .widget-like {
    margin: 2.25rem 0;
    background: var(--chart-surface);
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  header {
    padding: 0.85rem 1.15rem 0.6rem;
    background: var(--pn);
    border-bottom: 1px solid var(--line-strong);
  }
  .kind {
    font-family: var(--font-mono);
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.14em;
    color: var(--ink-2);
  }
  h4 {
    margin: 0.2rem 0 0 !important;
    font-family: var(--font-display) !important;
    font-size: 1.2rem !important;
    font-weight: 600 !important;
    border: 0 !important;
    padding: 0 !important;
  }
  .sub {
    margin: 0.3rem 0 0;
    font-size: 0.86rem;
    color: var(--ink-2);
  }
  .body {
    padding: 1rem 1.15rem 1.1rem;
  }
  .code {
    list-style: none;
    margin: 0 0 0.8rem;
    padding: 0;
    display: grid;
    gap: 2px;
  }
  .code button {
    width: 100%;
    text-align: left;
    border: 1px solid transparent;
    background: var(--surface-2);
    border-radius: 3px;
    padding: 0.2rem 0.5rem;
    cursor: pointer;
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--ink);
  }
  .code button.sel {
    border-color: var(--ac);
    background: var(--term-hl);
  }
  .code :global(.kw) {
    color: var(--accent);
    font-weight: 600;
  }
  .code :global(.num) {
    color: var(--series-3);
  }
  .scroll {
    overflow-x: auto;
  }
  svg {
    width: 100%;
    min-width: 30rem;
    height: auto;
    display: block;
  }
  .blk {
    cursor: pointer;
  }
  .blk rect,
  .blk path {
    fill: var(--surface);
    stroke: var(--ink-2);
    stroke-width: 1.5;
  }
  .blk.lit rect,
  .blk.lit path {
    fill: var(--term-hl-strong);
    stroke: var(--ac);
    stroke-width: 2.5;
  }
  .clk {
    fill: none !important;
  }
  .bus {
    fill: none;
    stroke: var(--ink-2);
    stroke-width: 3;
  }
  .wire {
    fill: none;
    stroke: var(--ink-3);
    stroke-width: 1.5;
  }
  .bus.lit,
  .wire.lit {
    stroke: var(--ac);
  }
  .t {
    font-size: 15px;
    font-weight: 700;
    text-anchor: middle;
    fill: var(--ink);
  }
  .s {
    font-size: 11px;
    text-anchor: middle;
    fill: var(--ink-2);
  }
  .s.r {
    text-anchor: end;
  }
  .m {
    font-size: 10px;
    text-anchor: middle;
    fill: var(--ink-3);
  }
  .v {
    font-family: var(--font-mono);
    font-size: 12px;
    fill: var(--accent);
    font-weight: 600;
  }
  .v.big {
    font-size: 16px;
    text-anchor: middle;
  }
  .v.c {
    text-anchor: middle;
  }
  .v.hot {
    fill: var(--ac);
  }
  .ctl {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
    margin-top: 0.6rem;
    font-size: 0.84rem;
  }
  .ctl button {
    font-family: var(--font-mono);
    border: 1px solid var(--line-strong);
    background: var(--surface);
    color: var(--ink);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.8rem;
    cursor: pointer;
    min-height: 2.2rem;
  }
  .ctl button.on {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
  }
  .ctl button.go {
    font-family: var(--font-ui);
    font-weight: 700;
    border-color: var(--ac);
  }
  .cyc {
    color: var(--ink-3);
  }
</style>
