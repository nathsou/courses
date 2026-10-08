<!--
  The stack-map viewer: Mote's compiler records, at every safepoint (every instruction where a collection can
  happen: allocations, calls, explicit gc() and loop back-edges), which slots of the frame hold pointers. Pick a
  function and a safepoint to see the frame the collector would scan there, slot by slot.
  `:::stack-map-viewer{n="24.1"}` with a ```mote block inside.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import CodeEditor from '$lib/exercise/CodeEditor.svelte';
  import { compile, disassemble } from '$lib/mm/mote/compile';

  let { code, title = 'Stack maps', caption, n }: { code: string; title?: string; caption?: string; n?: string } = $props();

  const c = $derived(compile(code));
  const fns = $derived(c.fns.filter((f) => !f.name.startsWith('$')));
  let fnName = $state('');
  const fn = $derived(fns.find((f) => f.name === fnName) ?? fns.find((f) => f.maps.size) ?? fns[0]!);
  let pc = $state(-1);
  const safepoints = $derived([...fn.maps.keys()].sort((a, b) => a - b));
  const sel = $derived(fn.maps.has(pc) ? pc : (safepoints[0] ?? -1));
  const map = $derived(fn.maps.get(sel));
  const dis = $derived(disassemble(c, fn));

  const WHY: Record<string, string> = {
    NEW: 'allocating may run the collector',
    NEWARR: 'allocating may run the collector',
    CALL: 'the callee may allocate',
    CALLV: 'the callee may allocate',
    GC: 'an explicit collection',
    JMP: 'a loop’s back-edge, so that a long loop can be interrupted',
  };

  interface Slot {
    label: string;
    kind: 'hdr' | 'ptr' | 'int';
  }
  const frame = $derived.by<Slot[]>(() => {
    const out: Slot[] = [
      { label: 'return address', kind: 'hdr' },
      { label: 'caller’s frame', kind: 'hdr' },
    ];
    fn.locals.forEach((l) => out.push({ label: l.name.startsWith('$') ? `${l.name.slice(1).replace(/\d+$/, '')} (hidden)` : l.name, kind: l.ptr ? 'ptr' : 'int' }));
    if (map) for (let d = 0; d < map.depth; d++) out.push({ label: `temporary ${d}`, kind: map.stack.includes(d) ? 'ptr' : 'int' });
    return out;
  });
  const ptrs = $derived(frame.filter((s) => s.kind === 'ptr').length);
</script>

<Widget {title} {caption} {n} kind="Stack maps">
  <div class="tabs ui" role="tablist">
    {#each fns as f (f.name)}
      <button role="tab" aria-selected={f === fn} class:on={f === fn} onclick={() => ((fnName = f.name), (pc = -1))}>{f.name}</button>
    {/each}
  </div>
  <div class="grid">
    <div><CodeEditor value={code} lang="mote" readonly minLines={6} maxHeight="20rem" highlightLine={map ? fn.code[sel]?.pos.line : undefined} label="The program" /></div>
    <div class="dis mono" role="listbox" aria-label="Instructions of {fn.name}">
      {#each dis as line, i (i)}
        {@const sp = fn.maps.has(i)}
        <button class="ins" class:sp class:on={i === sel} disabled={!sp} onclick={() => (pc = i)} role="option" aria-selected={i === sel}>
          <span class="dot">{sp ? '●' : ''}</span>{line}
        </button>
      {/each}
    </div>
    <div class="frame ui">
      {#if map}
        <p class="why"><strong>Safepoint at {sel}</strong> ({fn.code[sel]!.op}): {WHY[fn.code[sel]!.op] ?? 'a collection may happen here'}. The collector scans {ptrs} slot{ptrs === 1 ? '' : 's'} of this frame and skips the rest.</p>
        <div class="slots">
          {#each frame as s, i (i)}
            <div class="slot {s.kind}"><span>{s.label}</span><span class="k">{s.kind === 'ptr' ? 'pointer: scan' : s.kind === 'int' ? 'not a pointer' : ''}</span></div>
          {/each}
        </div>
      {:else}
        <p class="why">This function has no safepoints: it cannot allocate or call, so no collection can happen while it runs.</p>
      {/if}
    </div>
  </div>
</Widget>

<style>
  .tabs {
    display: flex;
    gap: 0.3rem;
    margin-bottom: 0.6rem;
    font-size: 0.8rem;
  }
  .tabs button {
    font: inherit;
    font-family: var(--font-mono);
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 99px;
    padding: 0.1rem 0.7rem;
    cursor: pointer;
  }
  .tabs button.on {
    background: var(--copper);
    border-color: var(--copper);
    color: var(--on-accent);
  }
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 1fr);
    gap: 0.8rem;
    align-items: start;
  }
  @media (max-width: 860px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .dis {
    display: grid;
    font-size: 0.72rem;
    max-height: 22rem;
    overflow: auto;
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 0.3rem 0;
    background: var(--panel);
  }
  .ins {
    font: inherit;
    text-align: left;
    white-space: pre;
    border: 0;
    background: transparent;
    color: var(--ink-2);
    padding: 0 0.4rem;
    cursor: default;
  }
  .ins.sp {
    color: var(--fg);
    cursor: pointer;
  }
  .ins.sp:hover {
    background: color-mix(in srgb, var(--copper) 10%, transparent);
  }
  .ins.on {
    background: color-mix(in srgb, var(--copper) 22%, transparent);
  }
  .dot {
    display: inline-block;
    width: 1em;
    color: var(--copper);
  }
  .why {
    font-size: 0.84rem;
    margin: 0 0 0.6rem;
  }
  .slots {
    display: grid;
    gap: 2px;
    font-size: 0.78rem;
  }
  .slot {
    display: flex;
    justify-content: space-between;
    gap: 0.6rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    border: 1px solid var(--line);
  }
  .slot.hdr {
    color: var(--mute);
  }
  .slot.ptr {
    background: color-mix(in srgb, var(--pointer) 14%, var(--panel));
    border-color: var(--pointer);
    font-weight: 600;
  }
  .slot .k {
    font-size: 0.7rem;
    color: var(--ink-2);
    font-weight: 400;
  }
</style>
