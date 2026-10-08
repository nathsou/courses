<!--
  The address-space map: one process's areas (the kernel's "VMAs"), drawn on a compressed address axis and
  listed as /proc/self/maps would. Grow the heap, mmap a block, shuffle the layout (ASLR), and probe any
  address to see what touching it would do.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { hex, bytes } from '$lib/mm/util/format';

  interface Area {
    start: number;
    end: number;
    perm: string;
    name: string;
    kind: 'text' | 'rodata' | 'data' | 'bss' | 'heap' | 'mmap' | 'lib' | 'stack' | 'guard';
    note: string;
    resident: number;
  }
  const PAGE = 4096;
  let seed = $state(0);
  let heapPages = $state(8);
  let mmaps = $state<number[]>([]);
  let probe = $state('0x10000');

  function rnd(k: number): number {
    // A deterministic shuffle of the layout, one value per (seed, k).
    if (!seed) return 0;
    let x = (seed * 2654435761 + k * 40503) >>> 0;
    x ^= x >>> 13;
    x = Math.imul(x, 0x5bd1e995) >>> 0;
    return (x % 4096) * PAGE * 16;
  }

  const areas = $derived.by<Area[]>(() => {
    const exe = 0x1_0000 + rnd(1);
    const out: Area[] = [
      { start: exe, end: exe + 3 * PAGE, perm: 'r-x', name: '/usr/bin/app', kind: 'text', note: 'The program’s machine code. Read-only and executable; shared between every process running this program.', resident: 3 },
      { start: exe + 3 * PAGE, end: exe + 4 * PAGE, perm: 'r--', name: '/usr/bin/app', kind: 'rodata', note: 'Constants and string literals. Read-only.', resident: 1 },
      { start: exe + 4 * PAGE, end: exe + 5 * PAGE, perm: 'rw-', name: '/usr/bin/app', kind: 'data', note: 'Initialised global variables, copied from the file. Private: a write makes a private copy (copy-on-write from the page cache).', resident: 1 },
      { start: exe + 5 * PAGE, end: exe + 7 * PAGE, perm: 'rw-', name: '', kind: 'bss', note: 'Zero-initialised globals (.bss): not stored in the file at all, just demand-zero pages.', resident: 1 },
    ];
    const heap = exe + 8 * PAGE + rnd(2);
    out.push({ start: heap, end: heap + heapPages * PAGE, perm: 'rw-', name: '[heap]', kind: 'heap', note: 'The heap, grown upwards by brk. malloc carves it into chunks (Part III).', resident: Math.min(heapPages, 5) });
    const top = 0x3f_ffff_f000 - rnd(3);
    const libBase = top - 0x100_0000 - rnd(4);
    out.push({ start: libBase, end: libBase + 40 * PAGE, perm: 'r-x', name: '/usr/lib/libc.so', kind: 'lib', note: 'The C library’s code, mapped from its file. The same frames are shared by every process that uses it.', resident: 12 });
    out.push({ start: libBase + 40 * PAGE, end: libBase + 42 * PAGE, perm: 'rw-', name: '/usr/lib/libc.so', kind: 'lib', note: 'The library’s writable data: private to this process.', resident: 2 });
    mmaps.forEach((n, i) => {
      const s = libBase - (i + 1) * 0x40_0000;
      out.push({ start: s, end: s + n * PAGE, perm: 'rw-', name: '', kind: 'mmap', note: 'An anonymous mapping, made by mmap. Large malloc requests often get one of their own, so that free can give them back to the kernel at once.', resident: 0 });
    });
    out.push({ start: top - 33 * PAGE, end: top - 32 * PAGE, perm: '---', name: '', kind: 'guard', note: 'A guard page: mapped with no permissions, so that running off the end of the stack faults instead of silently overwriting whatever lies below.', resident: 0 });
    out.push({ start: top - 32 * PAGE, end: top, perm: 'rw-', name: '[stack]', kind: 'stack', note: 'The main thread’s stack, growing downwards from the top (chapter 8).', resident: 3 });
    return out.sort((a, b) => a.start - b.start);
  });
  let selected = $state<Area | null>(null);

  const COLORS: Record<Area['kind'], string> = { text: 'var(--series-1)', rodata: 'var(--series-6)', data: 'var(--series-3)', bss: 'var(--series-5)', heap: 'var(--alloc)', mmap: 'var(--series-4)', lib: 'var(--series-8)', stack: 'var(--copper)', guard: 'var(--red)' };
  const probeResult = $derived.by(() => {
    const v = parseInt(probe.replace(/^0x/i, ''), 16);
    if (!Number.isFinite(v)) return 'Type an address in hexadecimal.';
    const a = areas.find((x) => v >= x.start && v < x.end);
    if (!a) return `${hex(v)} is in no area: touching it faults, and the kernel finds nothing to map. Segmentation fault.`;
    if (a.kind === 'guard') return `${hex(v)} is in the stack’s guard page: any access faults. Segmentation fault (a stack overflow, usually).`;
    return `${hex(v)} is in ${a.name || `an anonymous ${a.kind} area`} (${a.perm}). A read ${a.perm[0] === 'r' ? 'works' : 'faults'}; a write ${a.perm[1] === 'w' ? 'works' : 'faults (segmentation fault)'}; executing ${a.perm[2] === 'x' ? 'works' : 'faults'}. The first touch of a page that is not yet resident takes a page fault the kernel resolves.`;
  });
</script>

<Widget title="One process’s address space" kind="Map" n="7.1" caption="The areas of a small program, in address order. The axis is broken: the gaps between areas are gigabytes of unmapped addresses. Click an area for what it holds.">
  <div class="ctl ui">
    <button onclick={() => (heapPages += 4)}>brk: grow the heap by 16 KiB</button>
    <button onclick={() => (mmaps = [...mmaps, 64])}>mmap 256 KiB</button>
    <button onclick={() => (seed = seed + 1)}>Shuffle the layout (ASLR)</button>
    <button onclick={() => ((seed = 0), (heapPages = 8), (mmaps = []))}>Reset</button>
  </div>
  <div class="strip" role="list" aria-label="Areas from low to high addresses">
    {#each areas as a (a.start)}
      <button role="listitem" class="seg" class:sel={selected?.start === a.start} style:flex-grow={Math.log2((a.end - a.start) / PAGE + 1) + 1} style:--c={COLORS[a.kind]} onclick={() => (selected = a)} title="{a.name || a.kind} {hex(a.start)}–{hex(a.end)}">
        <span>{a.kind === 'guard' ? '✕' : a.name.split('/').at(-1) || a.kind}</span>
      </button>
    {/each}
  </div>
  <div class="axis mono"><span>low addresses</span><span>high addresses →</span></div>
  {#if selected}
    <p class="detail ui"><strong>{selected.name || selected.kind}</strong> · <span class="mono">{hex(selected.start)}–{hex(selected.end)}</span> · {bytes(selected.end - selected.start)} · {selected.perm} · {selected.resident} of {(selected.end - selected.start) / PAGE} pages resident<br />{selected.note}</p>
  {/if}
  <pre class="maps mono" aria-label="The same areas in the format of /proc/self/maps">{areas.map((a) => `${a.start.toString(16).padStart(10, '0')}-${a.end.toString(16).padStart(10, '0')} ${a.perm}p ${a.name}`).join('\n')}</pre>
  <form class="probe ui" onsubmit={(e) => e.preventDefault()}>
    <label>Probe an address: <input class="mono" bind:value={probe} /></label>
    <p>{probeResult}</p>
  </form>
</Widget>

<style>
  .ctl {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.8rem;
  }
  .ctl button {
    font: inherit;
    font-size: 0.8rem;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    border-radius: 99px;
    padding: 0.2rem 0.75rem;
    cursor: pointer;
  }
  .strip {
    display: flex;
    gap: 6px;
    height: 3.2rem;
  }
  .seg {
    flex-basis: 0;
    min-width: 1.6rem;
    border: 0;
    border-top: 4px solid var(--c);
    background: color-mix(in srgb, var(--c) 18%, var(--panel));
    cursor: pointer;
    font: inherit;
    font-family: var(--font-mono);
    font-size: 0.66rem;
    overflow: hidden;
    padding: 0.2rem;
    position: relative;
  }
  .seg + .seg::before {
    content: '≈';
    position: absolute;
    left: -6px;
    top: 50%;
  }
  .seg.sel {
    outline: 2px solid var(--amber);
  }
  .seg span {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .axis {
    display: flex;
    justify-content: space-between;
    font-size: 0.68rem;
    color: var(--mute);
    margin-top: 0.2rem;
  }
  .detail {
    font-size: 0.86rem;
    margin: 0.7rem 0;
    padding: 0.5rem 0.7rem;
    background: var(--pn);
    border-radius: var(--radius-sm);
  }
  .maps {
    font-size: 0.72rem;
    background: var(--pn);
    padding: 0.6rem 0.8rem;
    border-radius: var(--radius-sm);
    overflow-x: auto;
    margin: 0.7rem 0;
  }
  .probe {
    font-size: 0.86rem;
  }
  .probe input {
    font-family: var(--font-mono);
    border: 1px solid var(--line-strong);
    background: var(--panel);
    padding: 0.1rem 0.4rem;
    width: 11rem;
  }
  .probe p {
    margin: 0.4rem 0 0;
  }
</style>
