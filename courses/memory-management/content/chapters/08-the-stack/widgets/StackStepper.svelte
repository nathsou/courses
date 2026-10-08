<!--
  The stack stepper: a Mote program runs on the course VM, whose frames live in a simulated stack that grows
  downwards. Step one statement or one instruction at a time and watch frames being pushed (a call moves the
  stack pointer down by the frame's size) and popped (a return moves it back: freeing is one subtraction).
  `:::stack-stepper{stack=…}` with a ```mote block inside.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import CodeEditor from '$lib/exercise/CodeEditor.svelte';
  import { Vm, STACK_TOP } from '$lib/mm/mote/vm';
  import { compile, retDecode } from '$lib/mm/mote/compile';
  import { ManualManager } from '$lib/mm/managers/managers';
  import { hex } from '$lib/mm/util/format';

  let { code, stack = 4096, title = 'Frames on the stack', caption, n }: { code: string; stack?: number; title?: string; caption?: string; n?: string } = $props();

  const compiled = $derived(compile(code));
  let vm = $state.raw<Vm>(undefined!);
  let tick = $state(0);
  let changed = $state(new Set<number>());

  function reset() {
    vm = new Vm(compiled, new ManualManager(), { stackBytes: stack, oracle: false });
    // Run the start-up code (global initialisers) so that stepping begins in main.
    while (vm.frames.length && vm.top.fn.name === '$init' && vm.step());
    vm.stack.dirty = new Set();
    changed = new Set();
    tick++;
  }
  reset();

  function stepWith(f: () => unknown) {
    vm.stack.dirty = new Set();
    f();
    changed = vm.stack.dirty;
    tick++;
  }
  const stepStmt = () => stepWith(() => vm.stepStatement());
  const stepIns = () => stepWith(() => vm.step());
  function toEnd() {
    stepWith(() => vm.run(100000));
  }

  interface Word {
    addr: number;
    label: string;
    value: string;
    kind: 'hdr' | 'local' | 'op' | 'free';
  }
  interface FrameView {
    name: string;
    fp: number;
    words: Word[];
    current: boolean;
  }
  const view = $derived.by(() => {
    void tick;
    const frames: FrameView[] = vm.frames.map((f, k) => {
      const words: Word[] = [];
      const ret = vm.stack.peek(f.fp);
      const r = retDecode(ret);
      const caller = vm.c.fns[r.fn]?.name ?? '?';
      words.push({ addr: f.fp, label: 'return address', value: ret ? `${hex(ret)} (in ${caller === '$init' ? 'start-up' : caller})` : 'none', kind: 'hdr' });
      words.push({ addr: f.fp + 8, label: 'caller’s frame', value: hex(vm.stack.peek(f.fp + 8)), kind: 'hdr' });
      f.fn.locals.forEach((l, i) => {
        if (l.name.startsWith('$')) return;
        const v = vm.stack.peek(vm.slotAddr(f, i));
        words.push({ addr: vm.slotAddr(f, i), label: l.name, value: l.ptr ? (v ? hex(v) : 'null') : String(v), kind: 'local' });
      });
      for (let d = 0; d < f.depth; d++) words.push({ addr: vm.opAddr(f, d), label: `temp ${d}`, value: String(vm.stack.peek(vm.opAddr(f, d))), kind: 'op' });
      return { name: f.fn.name, fp: f.fp, words: words.reverse(), current: k === vm.frames.length - 1 };
    });
    return frames;
  });
  const sp = $derived.by(() => {
    void tick;
    return vm.frames.length ? vm.top.fp : STACK_TOP;
  });
  const line = $derived.by(() => {
    void tick;
    return vm.currentPos()?.line;
  });
  const used = $derived(STACK_TOP - sp);
</script>

<Widget {title} {caption} {n} kind="Stack stepper">
  <div class="grid">
    <div class="left">
      <CodeEditor value={code} lang="mote" readonly minLines={6} maxHeight="22rem" highlightLine={vm.status === 'done' ? undefined : line} label="The program" />
      <div class="ctl ui">
        <button class="primary" onclick={stepStmt} disabled={vm.status === 'done' || vm.status === 'error'}>Step a statement</button>
        <button onclick={stepIns} disabled={vm.status === 'done' || vm.status === 'error'}>One instruction</button>
        <button onclick={toEnd} disabled={vm.status === 'done' || vm.status === 'error'}>Run to the end</button>
        <button onclick={reset}>Reset</button>
      </div>
      <p class="status ui">
        {#if vm.status === 'error'}<span class="bad">✗ {vm.error?.message}</span>
        {:else if vm.status === 'done'}<span class="ok">✓ finished. Output: {vm.output.join(' · ') || '(none)'}</span>
        {:else}{vm.frames.length} frame{vm.frames.length === 1 ? '' : 's'} · stack pointer <span class="mono">{hex(sp)}</span> · {used} of {stack} bytes used{vm.output.length ? ` · output: ${vm.output.join(' · ')}` : ''}{/if}
      </p>
      <div class="meter" aria-hidden="true"><i style:width="{Math.min(100, (100 * used) / stack)}%" class:hot={used / stack > 0.8}></i></div>
    </div>
    <div class="stack mono" aria-label="The stack, highest addresses first">
      <div class="top-label ui">↑ higher addresses (the stack starts here)</div>
      {#each view as f (f.fp)}
        <div class="frame" class:current={f.current}>
          <div class="fname ui">{f.name}<span class="fp">frame at {hex(f.fp)}</span></div>
          {#each f.words as w (w.addr)}
            <div class="word {w.kind}" class:changed={changed.has(w.addr)}><span class="a">{hex(w.addr)}</span><span class="l">{w.label}</span><span class="v">{w.value}</span></div>
          {/each}
        </div>
      {/each}
      <div class="sp ui">← stack pointer: everything below is free</div>
    </div>
  </div>
</Widget>

<style>
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 1rem;
  }
  @media (max-width: 760px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .ctl {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.6rem;
  }
  button {
    font: inherit;
    font-size: 0.8rem;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    border-radius: 99px;
    padding: 0.2rem 0.75rem;
    cursor: pointer;
  }
  button.primary {
    background: var(--copper);
    border-color: var(--copper);
    color: var(--on-accent);
    font-weight: 600;
  }
  button:disabled {
    opacity: 0.45;
  }
  .status {
    font-size: 0.82rem;
    margin: 0.6rem 0 0.3rem;
  }
  .bad {
    color: var(--bad);
  }
  .ok {
    color: var(--ok);
  }
  .meter {
    height: 6px;
    background: var(--pn);
    border-radius: 3px;
    overflow: hidden;
  }
  .meter i {
    display: block;
    height: 100%;
    background: var(--copper);
    transition: width 200ms;
  }
  .meter i.hot {
    background: var(--red);
  }
  .stack {
    font-size: 0.72rem;
    max-height: 30rem;
    overflow-y: auto;
  }
  .top-label,
  .sp {
    font-size: 0.72rem;
    color: var(--mute);
    margin: 0.2rem 0;
  }
  .sp {
    color: var(--copper);
    font-weight: 600;
  }
  .frame {
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    margin-bottom: 4px;
    background: var(--panel);
    animation: push 250ms ease-out;
  }
  @keyframes push {
    from {
      transform: translateY(-6px);
      opacity: 0;
    }
  }
  .frame.current {
    border-color: var(--amber);
    box-shadow: 0 0 0 2px var(--amber-soft);
  }
  .fname {
    display: flex;
    justify-content: space-between;
    padding: 0.2rem 0.5rem;
    background: var(--pn);
    font-weight: 700;
    font-size: 0.78rem;
  }
  .fp {
    font-weight: 400;
    color: var(--mute);
    font-size: 0.7rem;
  }
  .word {
    display: grid;
    grid-template-columns: 6.6rem 6rem minmax(0, 1fr);
    gap: 0.4rem;
    padding: 0.1rem 0.5rem;
    border-top: 1px solid var(--line);
    transition: background 400ms;
  }
  .word .a {
    color: var(--mute);
  }
  .word.hdr {
    background: var(--meta-soft);
  }
  .word.op .l {
    color: var(--mute);
  }
  .word .v {
    overflow-wrap: anywhere;
  }
  .word.changed {
    background: var(--amber-soft);
  }
  .word.changed .v {
    color: var(--copper);
    font-weight: 700;
  }
</style>
