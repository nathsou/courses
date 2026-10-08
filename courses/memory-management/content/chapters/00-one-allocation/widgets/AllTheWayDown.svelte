<!--
  Chapter 0's flagship: one allocation followed through every layer. Everything shown is computed: the Mote VM
  allocates the Point with the size-class allocator, the toy kernel maps the heap page on first touch (a real
  demand-zero page fault), the Sv39 walker translates the address, and the cache and DRAM figures locate the
  physical address. Step down with the buttons or the arrow keys.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { Vm, HEAP_BASE } from '$lib/mm/mote/vm';
  import { ManualManager } from '$lib/mm/managers/managers';
  import { Kernel } from '$lib/mm/kernel/kernel';
  import { walk, splitVa, flagString, LEVEL_NAME } from '$lib/mm/machine/sv39';
  import { PAGE_SIZE } from '$lib/mm/machine/phys';
  import { TEACHING_MACHINE } from '$lib/mm/machine/cost';
  import { Cache } from '$lib/mm/machine/cache';
  import { hex, bin } from '$lib/mm/util/format';

  const SRC = `struct Point { x: int, y: int }

fn main() {
  let p = new Point { x: 1, y: 2 }
  print(p.x + p.y)
}`;

  // 1. The program: run it and find the Point.
  const vm = new Vm(SRC, new ManualManager(), { heapBytes: 1 << 16 }).run();
  const rec = [...vm.objects.values()][0]!;
  const obj = rec.addr;
  const words = [0, 1, 2, 3].map((i) => vm.heap.peek(obj + i * 8));
  const pageBase = obj - ((obj - HEAP_BASE) % 4096);
  const slot = (obj - pageBase - 16) / 32;

  // 2. The kernel: a process whose heap VMA covers the VM's heap; the first store faults the page in.
  const k = new Kernel(512);
  const proc = k.spawn();
  k.standardLayout(proc);
  proc.addVma({ start: HEAP_BASE, end: HEAP_BASE + (1 << 16), perm: 'rw', kind: 'mmap', name: '[mote heap]' });
  k.machine.store64(obj, words[0]!);
  const fault = k.events.find((e) => e.kind === 'fault');
  const w = walk(k.machine.phys, proc.root, obj, { access: 'r', user: true, update: false });
  const pa = w.pa!;
  const parts = splitVa(obj);
  const frame = Math.floor(pa / PAGE_SIZE);

  // 3. Caches and DRAM.
  const l1 = new Cache(TEACHING_MACHINE.caches[0]!);
  const where = l1.locate(pa);
  const bank = Math.floor(pa / 8192) % 8;
  const row = Math.floor(pa / 65536);
  const column = Math.floor(pa / 8) % 1024;

  const LEVELS = [
    { id: 'source', name: 'Your code', who: 'You wrote new. You did not write free: who will?' },
    { id: 'object', name: 'The object', who: 'The language runtime decides when an object dies.' },
    { id: 'chunk', name: 'The chunk', who: 'malloc frees a chunk when it is told to.' },
    { id: 'page', name: 'The page', who: 'The kernel frees a page’s frame when the last mapping goes.' },
    { id: 'walk', name: 'The page walk', who: 'Page tables are freed with the address space.' },
    { id: 'frame', name: 'Frame and cache line', who: 'Caches never free: they evict, and copy back what changed.' },
    { id: 'dram', name: 'The DRAM row', who: 'The hardware never frees anything. It forgets, unless refreshed.' },
  ];
  let level = $state(0);
  const go = (d: number) => (level = Math.max(0, Math.min(LEVELS.length - 1, level + d)));
  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') go(-1);
    else return;
    e.preventDefault();
  }
  const vaBits = bin(obj, 39);
</script>

<Widget title="One allocation, all the way down" kind="Zoom" n="0.1" caption="Every number here is computed by the course’s simulator: the VM allocated the Point, the kernel took a page fault to map its page, and the MMU walked three levels of Sv39 page tables to find its frame. The DRAM mapping is a simplified one; real memory controllers scramble the bits.">
  <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
  <div class="zoom" tabindex="0" role="group" aria-label="Zoom levels: use the arrow keys" onkeydown={onKey}>
    <ol class="gauge ui">
      {#each LEVELS as l, i (l.id)}
        <li class:on={i === level} class:past={i < level}>
          <button onclick={() => (level = i)} aria-current={i === level ? 'step' : undefined}><span class="d">{i}</span> {l.name}</button>
        </li>
      {/each}
    </ol>
    <div class="stage">
      {#key level}
        <div class="card">
          {#if level === 0}
            <pre class="code"><span class="dim">struct Point &#123; x: int, y: int &#125;</span>

fn main() &#123;
  <mark>let p = new Point &#123; x: 1, y: 2 &#125;</mark>
  print(p.x + p.y)
&#125;</pre>
            <p>One line asks for memory. The program prints <code>{vm.output[0]}</code>. Let’s follow the Point down.</p>
          {:else if level === 1}
            <p>The Mote runtime lays the Point out as four 8-byte words at <code>{hex(obj)}</code>:</p>
            <div class="words mono">
              {#each ['header', 'aux', 'x', 'y'] as label, i (label)}
                <div class="word" class:meta={i < 2}><span class="addr">{hex(obj + i * 8)}</span><span class="val">{i === 0 ? `type ${words[0]! / 16} (Point)` : words[i]}</span><span class="lab">{label}</span></div>
              {/each}
            </div>
            <p>The header says what it is; the <em>aux</em> word is spare room a memory manager can use (for a reference count, a mark, a forwarding address). <code>p</code> itself is just the number {hex(obj)}.</p>
          {:else if level === 2}
            <p>Those 32 bytes came from <code>malloc(32)</code>. This allocator rounds every request up to a <em>size class</em> and carves whole 4 KiB pages into equal slots:</p>
            <div class="slots">
              <div class="slot hdr">page header</div>
              {#each Array.from({ length: 10 }, (_, i) => i) as i (i)}
                <div class="slot" class:me={i === slot} class:free={i !== slot}>{i === slot ? 'Point' : 'free'}</div>
              {/each}
              <div class="slot more">… {Math.floor((4096 - 16) / 32) - 10} more</div>
            </div>
            <p>The Point is slot {slot} of the 32-byte page that starts at <code>{hex(pageBase)}</code>. Free slots form a linked list threaded through their own first words: the bookkeeping lives in the heap.</p>
          {:else if level === 3}
            <p><code>{hex(obj)}</code> is a <em>virtual</em> address. The MMU splits its 39 bits into three 9-bit indices and a 12-bit offset:</p>
            <div class="bits mono">
              <span class="b v2" title="VPN[2]">{vaBits.slice(0, 9)}</span><span class="b v1" title="VPN[1]">{vaBits.slice(9, 18)}</span><span class="b v0" title="VPN[0]">{vaBits.slice(18, 27)}</span><span class="b off" title="offset">{vaBits.slice(27)}</span>
            </div>
            <div class="bits-l ui"><span class="v2">VPN[2] = {parts.vpn[2]}</span><span class="v1">VPN[1] = {parts.vpn[1]}</span><span class="v0">VPN[0] = {parts.vpn[0]}</span><span class="off">offset = {hex(parts.offset)}</span></div>
            <p>The first time the program touched this page, nothing was there: the MMU raised a <strong>{fault?.kind === 'fault' ? 'page fault' : 'fault'}</strong> and the kernel {fault?.kind === 'fault' ? `found a free frame (${fault.frame}), zeroed it and mapped it (“${fault.resolution}”)` : 'mapped it'}. Then the store was retried.</p>
          {:else if level === 4}
            <p>Each index picks one 8-byte entry in one 4 KiB table. Three reads of memory, before the real one:</p>
            <ol class="walk mono">
              {#each w.steps as s (s.level)}
                <li><span class="lv">level {s.level}</span> table {hex(s.table)} [{s.index}] → <span class="pte">PPN {hex(s.pte.ppn)} {flagString(s.pte.flags)}</span> <span class="note">{s.note}</span></li>
              {/each}
            </ol>
            <p>The leaf names frame <strong>{frame}</strong>, a {LEVEL_NAME[w.level ?? 0]}. The TLB will remember this translation, so the next access skips the walk.</p>
          {:else if level === 5}
            <p>Physical address: frame {frame} × 4096 + offset {hex(parts.offset)} = <code>{hex(pa)}</code>.</p>
            <p>The CPU never fetches one word: it fetches the whole 64-byte <em>line</em> around it into the L1 cache, set <strong>{where.set}</strong> of {l1.sets}, tag <code>{hex(where.tag)}</code>. The Point’s x and y ride along together, which is why keeping related data close is fast.</p>
            <div class="line mono">
              {#each Array.from({ length: 8 }, (_, i) => i) as i (i)}
                <span class="lw" class:me={Math.floor(where.offset / 8) <= i && i < Math.floor(where.offset / 8) + 4}>{i * 8}</span>
              {/each}
            </div>
          {:else}
            <p>Finally, the line lives in DRAM: bank <strong>{bank}</strong>, row <strong>{row}</strong>, column {column}. Each bit is a charge on a tiny capacitor that leaks away in milliseconds unless the row is refreshed.</p>
            <div class="dram">
              {#each Array.from({ length: 8 }, (_, r) => r) as r (r)}
                <div class="drow" class:lit={r === row % 8}>
                  {#each Array.from({ length: 24 }, (_, c) => c) as c (c)}<i class:one={(r * 7 + c * 13 + row) % 3 === 0}></i>{/each}
                </div>
              {/each}
            </div>
            <p class="note-small">That is the bottom. Every layer above handed out memory; only some of them will ever take it back.</p>
          {/if}
          <p class="who ui"><span class="label-caps">Who frees it?</span> {LEVELS[level]!.who}</p>
        </div>
      {/key}
      <div class="nav ui">
        <button onclick={() => go(-1)} disabled={level === 0}>↑ Up a layer</button>
        <span class="pos">{level + 1} / {LEVELS.length}</span>
        <button class="down" onclick={() => go(1)} disabled={level === LEVELS.length - 1}>Down a layer ↓</button>
      </div>
    </div>
  </div>
</Widget>

<style>
  .zoom {
    display: grid;
    grid-template-columns: 12rem minmax(0, 1fr);
    gap: 1rem;
    outline: none;
  }
  @media (max-width: 640px) {
    .zoom {
      grid-template-columns: minmax(0, 1fr);
    }
    .gauge {
      display: flex;
      overflow-x: auto;
    }
    .gauge li::before {
      display: none;
    }
  }
  .gauge {
    list-style: none;
    margin: 0;
    padding: 0;
    position: relative;
  }
  .gauge li {
    position: relative;
  }
  .gauge li::before {
    content: '';
    position: absolute;
    left: 0.72rem;
    top: 1.6rem;
    bottom: -0.3rem;
    width: 2px;
    background: var(--line);
  }
  .gauge li:last-child::before {
    display: none;
  }
  .gauge li.past::before {
    background: var(--copper);
  }
  .gauge button {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: 0;
    padding: 0.3rem 0.2rem;
    cursor: pointer;
    font-size: 0.82rem;
    color: var(--ink-2);
    text-align: left;
    white-space: nowrap;
  }
  .d {
    display: inline-grid;
    place-items: center;
    width: 1.5rem;
    height: 1.5rem;
    border-radius: 50%;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    font-family: var(--font-mono);
    font-size: 0.72rem;
    position: relative;
    z-index: 1;
  }
  .past .d {
    border-color: var(--copper);
    color: var(--copper);
  }
  .on button {
    color: var(--fg);
    font-weight: 700;
  }
  .on .d {
    background: var(--amber);
    border-color: var(--amber);
    color: var(--on-accent);
    box-shadow: 0 0 0 4px var(--amber-soft);
  }
  .stage {
    min-width: 0;
  }
  .card {
    min-height: 17rem;
    animation: drop 300ms ease-out;
  }
  @keyframes drop {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
  }
  .card p {
    margin: 0 0 0.7rem;
    font-size: 0.98rem;
  }
  .code {
    font-family: var(--font-mono);
    font-size: 0.84rem;
    background: var(--pn);
    padding: 0.7rem 0.9rem;
    border-radius: var(--radius-sm);
    overflow-x: auto;
  }
  .code mark {
    background: var(--amber-soft);
    color: inherit;
    box-shadow: inset 3px 0 0 var(--amber);
  }
  .dim {
    color: var(--mute);
  }
  .words {
    display: grid;
    gap: 2px;
    margin: 0.4rem 0 0.8rem;
    max-width: 28rem;
  }
  .word {
    display: grid;
    grid-template-columns: 6.5rem 1fr 4rem;
    gap: 0.6rem;
    padding: 0.3rem 0.6rem;
    background: var(--alloc-soft);
    border-left: 3px solid var(--alloc);
    font-size: 0.8rem;
  }
  .word.meta {
    background: var(--meta-soft);
    border-left-color: var(--meta);
  }
  .addr {
    color: var(--copper);
  }
  .lab {
    color: var(--mute);
    text-align: right;
  }
  .slots {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin: 0.4rem 0 0.8rem;
    font-family: var(--font-mono);
    font-size: 0.7rem;
  }
  .slot {
    padding: 0.35rem 0.45rem;
    border-radius: 3px;
    min-width: 3rem;
    text-align: center;
  }
  .slot.hdr {
    background: var(--meta-soft);
    border: 1px solid var(--meta);
  }
  .slot.free {
    border: 1px dashed var(--free);
    color: var(--mute);
    background: repeating-linear-gradient(135deg, transparent 0 4px, color-mix(in srgb, var(--free) 18%, transparent) 4px 5px);
  }
  .slot.me {
    background: var(--alloc);
    color: var(--on-accent);
    font-weight: 700;
    box-shadow: 0 0 0 3px var(--amber-soft);
  }
  .slot.more {
    color: var(--mute);
  }
  .bits {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    font-size: 0.82rem;
    margin: 0.4rem 0 0.2rem;
  }
  .b {
    padding: 0.2rem 0.35rem;
    border-radius: 3px;
    letter-spacing: 0.04em;
  }
  .v2 {
    background: color-mix(in srgb, var(--series-1) 18%, transparent);
    color: var(--series-1);
  }
  .v1 {
    background: color-mix(in srgb, var(--series-6) 18%, transparent);
    color: var(--series-6);
  }
  .v0 {
    background: color-mix(in srgb, var(--series-4) 18%, transparent);
    color: var(--series-4);
  }
  .off {
    background: color-mix(in srgb, var(--series-5) 18%, transparent);
    color: var(--series-5);
  }
  .bits-l {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1rem;
    font-size: 0.78rem;
    margin-bottom: 0.8rem;
  }
  .bits-l span {
    background: none;
  }
  .walk {
    font-size: 0.78rem;
    padding-left: 1.2rem;
    margin: 0.3rem 0 0.8rem;
  }
  .walk li {
    margin-bottom: 0.25rem;
    overflow-wrap: anywhere;
  }
  .lv {
    color: var(--copper);
  }
  .pte {
    color: var(--page-c);
  }
  .note {
    color: var(--mute);
  }
  .line {
    display: flex;
    gap: 2px;
    margin: 0.3rem 0 0.8rem;
    font-size: 0.7rem;
  }
  .lw {
    flex: 1;
    text-align: center;
    padding: 0.4rem 0;
    background: var(--pn);
    border-radius: 2px;
    color: var(--mute);
  }
  .lw.me {
    background: var(--alloc);
    color: var(--on-accent);
  }
  .dram {
    display: grid;
    gap: 3px;
    margin: 0.4rem 0 0.8rem;
    max-width: 30rem;
  }
  .drow {
    display: grid;
    grid-template-columns: repeat(24, 1fr);
    gap: 3px;
    padding: 2px;
    border-radius: 3px;
  }
  .drow.lit {
    background: var(--amber-soft);
    box-shadow: 0 0 0 1px var(--amber);
  }
  .drow i {
    aspect-ratio: 1;
    border-radius: 50%;
    border: 1px solid var(--line-strong);
  }
  .drow i.one {
    background: var(--meta);
  }
  .drow.lit i.one {
    background: var(--amber);
    border-color: var(--amber);
    box-shadow: 0 0 4px var(--amber-glow);
  }
  .who {
    margin-top: 1rem !important;
    padding: 0.5rem 0.8rem;
    border: 1px dashed var(--copper);
    border-radius: var(--radius-sm);
    background: var(--copper-soft);
    font-size: 0.86rem !important;
  }
  .who .label-caps {
    color: var(--copper);
    margin-right: 0.4rem;
  }
  .nav {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    margin-top: 0.8rem;
  }
  .nav button {
    padding: 0.35rem 0.8rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--line-strong);
    background: var(--panel);
    cursor: pointer;
    font-weight: 600;
  }
  .nav .down {
    background: var(--copper);
    border-color: var(--copper);
    color: var(--on-accent);
  }
  .nav button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  .pos {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--mute);
  }
  .note-small {
    font-size: 0.9rem;
    color: var(--ink-2);
  }
</style>
