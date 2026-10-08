<!--
  The full-stack replay (chapter 28): one Mote program under a chosen memory manager, with every heap load and
  store the program and its allocator make replayed on the simulated machine: the toy kernel maps heap pages on
  first touch, the MMU translates through the TLB and page tables, and the caches decide what reaches DRAM. Every
  layer is drawn on one timeline, one statement per step. (The collectors' own marking reads are not replayed.)
  `:::full-stack{settings="manual,rc,mark-sweep"}` with a ```mote block inside.
-->
<script lang="ts">
  import Widget from '../ui/Widget.svelte';
  import CodeEditor from '$lib/exercise/CodeEditor.svelte';
  import { Vm, HEAP_BASE } from '$lib/mm/mote/vm';
  import { compile } from '$lib/mm/mote/compile';
  import { makeManager, SETTINGS, type Setting } from '$lib/mm/managers/managers';
  import { Kernel } from '$lib/mm/kernel/kernel';
  import { bytes } from '$lib/mm/util/format';

  let { code, settings = 'manual,rc,mark-sweep', title = 'Every layer at once', caption, n }: { code: string; settings?: string; title?: string; caption?: string; n?: string } = $props();

  const choices = $derived(settings.split(',').map((s) => s.trim() as Setting));
  let setting = $state<Setting>('manual');
  $effect(() => {
    if (!choices.includes(setting)) setting = choices[0]!;
  });

  interface Snap {
    ran?: number;
    live: number;
    liveBytes: number;
    heap: number;
    accesses: number;
    faults: number;
    tlbMisses: number;
    l1Misses: number;
    dram: number;
    cycles: number;
    allocated: number;
    freed: number;
  }

  const HEAP_BYTES = 1 << 18;
  const run = $derived.by(() => {
    const k = new Kernel(512);
    const proc = k.spawn();
    k.standardLayout(proc);
    proc.addVma({ start: HEAP_BASE, end: HEAP_BASE + HEAP_BYTES, perm: 'rw', kind: 'mmap', name: '[mote heap]' });
    const m = k.machine;
    let vm: Vm;
    try {
      vm = new Vm(compile(code), makeManager(setting, { heapBytes: HEAP_BYTES / 2, trigger: 8192 }), { heapBytes: HEAP_BYTES, oracle: false });
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e), snaps: [] as Snap[], vm: undefined };
    }
    vm.heap.trace = (addr, write) => {
      if (write) m.store64(addr, 0);
      else m.load64(addr);
    };
    const last = m.caches.caches.length - 1;
    const snap = (ran?: number): Snap => {
      let liveBytes = 0;
      for (const id of vm.byAddr.values()) liveBytes += vm.objects.get(id)!.words * 8;
      return {
        ran,
        live: vm.byAddr.size,
        liveBytes,
        heap: vm.heap.brk - vm.heap.base,
        accesses: m.stats.loads + m.stats.stores,
        faults: m.stats.faults,
        tlbMisses: m.tlb.stats.misses,
        l1Misses: m.caches.caches[0]!.stats.misses,
        dram: m.caches.caches[last]!.stats.misses,
        cycles: m.stats.cycles,
        allocated: vm.events.filter((e) => e.kind === 'alloc').length,
        freed: vm.events.filter((e) => e.kind === 'free').length,
      };
    };
    while (vm.frames.length && vm.top.fn.name === '$init' && vm.step());
    const snaps: Snap[] = [snap()];
    let guard = 0;
    while (vm.status !== 'done' && vm.status !== 'error' && guard++ < 6000) {
      const ran = vm.currentPos()?.line;
      vm.stepStatement();
      snaps.push(snap(ran));
    }
    return { error: '', snaps, vm };
  });

  let at = $state(0);
  $effect(() => {
    void run;
    at = run.snaps.length - 1;
  });
  const cur = $derived(run.snaps[Math.min(at, run.snaps.length - 1)]);
  const prev = $derived(at > 0 ? run.snaps[at - 1] : undefined);
  let playing = $state(false);
  let timer: ReturnType<typeof setInterval> | undefined;
  function play() {
    if (playing) {
      clearInterval(timer);
      playing = false;
      return;
    }
    if (at >= run.snaps.length - 1) at = 0;
    playing = true;
    const stride = Math.max(1, Math.round(run.snaps.length / 300));
    timer = setInterval(() => {
      if (at >= run.snaps.length - 1) {
        clearInterval(timer);
        playing = false;
      } else at = Math.min(run.snaps.length - 1, at + stride);
    }, 30);
  }
  $effect(() => () => clearInterval(timer));

  type Key = keyof Snap;
  const LAYERS: { key: Key; label: string; layer: string; per?: boolean; fmt: (v: number) => string; who: string }[] = [
    { key: 'live', label: 'Live objects', layer: 'objects', fmt: (v) => String(v), who: 'freed by the memory manager you chose' },
    { key: 'heap', label: 'Heap obtained', layer: 'chunks', fmt: bytes, who: 'the allocator never gives it back here' },
    { key: 'faults', label: 'Pages mapped', layer: 'pages', fmt: (v) => String(v), who: 'each first touch is a page fault; frames return when the process exits' },
    { key: 'tlbMisses', label: 'TLB misses', layer: 'pages', per: true, fmt: (v) => String(v), who: 'a miss costs a page-table walk' },
    { key: 'l1Misses', label: 'L1 misses', layer: 'frames', per: true, fmt: (v) => String(v), who: 'caches never free: they evict' },
    { key: 'dram', label: 'DRAM accesses', layer: 'dram', per: true, fmt: (v) => String(v), who: 'every miss in the last level goes to a DRAM row' },
  ];
  const W = 500;
  const H = 34;
  function spark(key: Key, per: boolean | undefined): string {
    const s = run.snaps;
    if (s.length < 2) return '';
    const vals: number[] = [];
    const bucket = Math.max(1, Math.ceil(s.length / W));
    for (let i = 0; i < s.length; i += bucket) {
      const j = Math.min(s.length - 1, i + bucket);
      vals.push(per ? (s[j]![key] as number) - (s[i]![key] as number) : (s[i]![key] as number));
    }
    const max = Math.max(1, ...vals);
    return vals.map((v, i) => `${i ? 'L' : 'M'}${((i / (vals.length - 1 || 1)) * W).toFixed(1)},${(H - (v / max) * (H - 2)).toFixed(1)}`).join('');
  }
  const cursorX = $derived((at / Math.max(1, run.snaps.length - 1)) * W);
  const delta = (k: Key) => (cur && prev ? (cur[k] as number) - (prev[k] as number) : 0);
</script>

<Widget {title} {caption} {n} kind="Full-stack replay">
  {#if run.error}
    <p class="bad ui">{run.error}</p>
  {:else if cur}
    <div class="cfg ui" role="radiogroup" aria-label="Memory manager">
      {#each choices as c (c)}
        <button role="radio" aria-checked={setting === c} class:on={setting === c} onclick={() => (setting = c)}>{SETTINGS.find((s) => s.id === c)?.label ?? c}</button>
      {/each}
    </div>
    <div class="grid">
      <div>
        <CodeEditor value={code} lang="mote" readonly minLines={6} maxHeight="26rem" highlightLine={cur.ran} label="The program" />
        <div class="ctl ui">
          <button class="primary" onclick={play}>{playing ? '❚❚ Pause' : '▶ Play'}</button>
          <input type="range" min="0" max={run.snaps.length - 1} bind:value={at} aria-label="Statement" />
        </div>
        <p class="now ui">Step {at} of {run.snaps.length - 1}{cur.ran ? `, line ${cur.ran}` : ''}: {delta('accesses')} memory access{delta('accesses') === 1 ? '' : 'es'}, {delta('cycles')} cycles{delta('allocated') ? `, ${delta('allocated')} allocated` : ''}{delta('freed') ? `, ${delta('freed')} freed` : ''}{delta('faults') ? `, ${delta('faults')} page fault${delta('faults') === 1 ? '' : 's'}` : ''}.</p>
      </div>
      <div class="layers ui">
        {#each LAYERS as l (l.key)}
          <div class="layer">
            <div class="lh"><span class="lname">{l.label}</span><span class="tag">{l.layer}</span><span class="val mono">{l.per ? `${delta(l.key)} this step · ${l.fmt(cur[l.key] as number)} total` : l.fmt(cur[l.key] as number)}</span></div>
            <svg viewBox="0 0 {W} {H}" preserveAspectRatio="none" class="spark" aria-hidden="true">
              <path d={spark(l.key, l.per)} class="line" />
              <line x1={cursorX} x2={cursorX} y1="0" y2={H} class="cursor" />
            </svg>
            <div class="who">{l.who}</div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</Widget>

<style>
  .cfg {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    font-size: 0.8rem;
    margin-bottom: 0.7rem;
  }
  button {
    font: inherit;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 99px;
    padding: 0.15rem 0.7rem;
    cursor: pointer;
  }
  button.on,
  button.primary {
    background: var(--copper);
    border-color: var(--copper);
    color: var(--on-accent);
    font-weight: 600;
  }
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 0.9fr) minmax(0, 1.1fr);
    gap: 1rem;
  }
  @media (max-width: 820px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .ctl {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    margin-top: 0.6rem;
  }
  .ctl input {
    flex: 1;
  }
  .now {
    font-size: 0.8rem;
    color: var(--ink-2);
    margin: 0.5rem 0 0;
  }
  .layers {
    display: grid;
    gap: 0.5rem;
  }
  .lh {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
    font-size: 0.8rem;
  }
  .lname {
    font-weight: 700;
  }
  .tag {
    font-size: 0.66rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--mute);
  }
  .val {
    margin-left: auto;
    font-size: 0.74rem;
  }
  .spark {
    width: 100%;
    height: 2.1rem;
    display: block;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 4px;
  }
  .line {
    fill: none;
    stroke: var(--copper);
    stroke-width: 1.4;
  }
  .cursor {
    stroke: var(--violet);
    stroke-width: 1.5;
  }
  .who {
    font-size: 0.7rem;
    color: var(--mute);
  }
  .bad {
    color: var(--uaf);
  }
</style>
