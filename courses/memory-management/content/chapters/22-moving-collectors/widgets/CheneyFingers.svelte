<!--
  Cheney's fingers: a semispace copying collection, step by step. From-space holds live objects scattered among
  garbage; to-space starts empty. Copying an object leaves a forwarding address behind; the scan finger walks
  through to-space fixing pointers, copying each object it finds for the first time to the free finger. When the
  fingers meet, the collection is over. The objects that survive end up next to each other, in breadth-first
  order.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';

  interface Obj {
    name: string;
    fields: (string | null)[];
    live?: boolean;
  }
  // From-space, in address order: live objects (A to F) scattered among garbage (x).
  const FROM: Obj[] = [
    { name: 'x1', fields: [null, null] },
    { name: 'C', fields: ['E', null] },
    { name: 'x2', fields: ['C', null] },
    { name: 'A', fields: ['B', 'C'] },
    { name: 'x3', fields: [null, null] },
    { name: 'E', fields: ['A', null] },
    { name: 'B', fields: ['D', null] },
    { name: 'x4', fields: ['x3', null] },
    { name: 'D', fields: [null, 'F'] },
    { name: 'x5', fields: [null, null] },
    { name: 'F', fields: ['D', null] },
  ];
  const ROOTS = ['A', 'F'];
  const SIZE = 24; // bytes per object
  const FROM_BASE = 0x1000;
  const TO_BASE = 0x2000;
  const fromAddr = (name: string) => FROM_BASE + FROM.findIndex((o) => o.name === name) * SIZE;

  interface State {
    to: { name: string; fields: (string | null)[]; fixed: boolean[] }[];
    forwarded: Map<string, number>;
    scan: number;
    roots: (string | null)[];
    text: string;
    hot?: { space: 'from' | 'to'; name: string };
  }

  const states = (() => {
    const out: State[] = [];
    const to: State['to'] = [];
    const fwd = new Map<string, number>();
    const roots: (string | null)[] = [...ROOTS];
    const rootFixed = [false, false];
    let scan = 0;
    const copy = (name: string) => {
      const o = FROM.find((x) => x.name === name)!;
      to.push({ name, fields: [...o.fields], fixed: o.fields.map(() => false) });
      fwd.set(name, to.length - 1);
    };
    const snap = (text: string, hot?: State['hot']) => out.push({ to: to.map((t) => ({ ...t, fields: [...t.fields], fixed: [...t.fixed] })), forwarded: new Map(fwd), scan, roots: roots.map((r, i) => (rootFixed[i] ? `→${r}` : r)), text, hot });
    snap('Before: the live objects A to F are scattered through from-space among garbage (x). To-space is empty; the scan finger and the free finger both point at its start.');
    ROOTS.forEach((r, i) => {
      copy(r);
      rootFixed[i] = true;
      snap(`Evacuate the root ${r}: copy it to the free finger, leave its new address in its old body as a forwarding pointer, and point the root at the copy. The free finger moves past it.`, { space: 'to', name: r });
    });
    while (scan < to.length) {
      const t = to[scan]!;
      const notes: string[] = [];
      t.fields.forEach((f, i) => {
        if (!f) return;
        if (fwd.has(f)) notes.push(`${f} was already copied: follow its forwarding pointer`);
        else {
          copy(f);
          notes.push(`${f} is copied to the free finger`);
        }
        t.fixed[i] = true;
      });
      scan++;
      snap(`Scan ${t.name}: ${notes.length ? notes.join('; ') : 'it has no pointers'}${notes.length ? ', and each field now points into to-space' : ''}. The scan finger moves past ${t.name}.`, { space: 'to', name: t.name });
    }
    snap('The scan finger has caught up with the free finger: every copied object has been scanned, so everything reachable has been copied. From-space, garbage and forwarding pointers alike, is now free in one step. The survivors sit together, and the next allocation is a bump of the free finger.');
    return out;
  })();

  let step = $state(0);
  const s = $derived(states[step]!);
  const last = $derived(step === states.length - 1);
  let timer: ReturnType<typeof setInterval> | undefined;
  function play() {
    clearInterval(timer);
    if (last) step = 0;
    timer = setInterval(() => {
      if (step >= states.length - 1) clearInterval(timer);
      else step++;
    }, 1100);
  }
  $effect(() => () => clearInterval(timer));
  const hex = (n: number) => `0x${n.toString(16)}`;
  const toAddr = (i: number) => TO_BASE + i * SIZE;
</script>

<Widget title="Cheney’s fingers" kind="Step through" n="22.1" caption="Each box is an object with two pointer fields. In to-space, a field shown with an arrow has been fixed to point into to-space; the others still hold from-space addresses. Grey boxes in from-space have been copied and hold a forwarding address.">
  <div class="ctl ui">
    <button class="primary" onclick={play}>{last ? '↺ Replay' : '▶ Play'}</button>
    <button onclick={() => (step = Math.max(0, step - 1))} disabled={step === 0} aria-label="Step back">◀</button>
    <button onclick={() => (step = Math.min(states.length - 1, step + 1))} disabled={last} aria-label="Step forward">▶</button>
    <span class="roots mono">roots: {s.roots.map((r, i) => `${i ? 'r2' : 'r1'} = ${r}`).join(', ')}</span>
  </div>
  <p class="text ui" aria-live="polite">{s.text}</p>
  <div class="space">
    <div class="lbl ui">from-space</div>
    <div class="strip">
      {#each FROM as o (o.name)}
        {@const f = s.forwarded.get(o.name)}
        <div class="obj" class:garbage={o.name.startsWith('x')} class:fwd={f !== undefined} class:dead={last}>
          <div class="addr mono">{hex(fromAddr(o.name))}</div>
          <div class="nm">{o.name}</div>
          {#if f !== undefined}<div class="fw mono">⇒ {hex(toAddr(f))}</div>{:else}<div class="fs mono">{o.fields.map((x) => x ?? '·').join(' ')}</div>{/if}
        </div>
      {/each}
    </div>
  </div>
  <div class="space">
    <div class="lbl ui">to-space</div>
    <div class="strip to">
      {#each Array(FROM.length) as _, i (i)}
        {@const t = s.to[i]}
        <div class="obj" class:empty={!t} class:scanned={t && i < s.scan} class:hot={t && s.hot?.name === t.name}>
          <div class="addr mono">{hex(toAddr(i))}</div>
          {#if t}
            <div class="nm">{t.name}</div>
            <div class="fs mono">{t.fields.map((x, k) => (x ? (t.fixed[k] ? `→${x}` : x) : '·')).join(' ')}</div>
          {/if}
          {#if i === s.scan}<div class="finger scan">scan</div>{/if}
          {#if i === s.to.length}<div class="finger free" class:both={i === s.scan}>free</div>{/if}
        </div>
      {/each}
    </div>
  </div>
</Widget>

<style>
  .ctl {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.82rem;
  }
  button {
    font: inherit;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
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
    cursor: default;
  }
  .roots {
    margin-left: auto;
    font-size: 0.78rem;
    color: var(--ink-2);
  }
  .text {
    min-height: 3.6rem;
    font-size: 0.9rem;
    margin: 0.6rem 0;
  }
  .space {
    margin-top: 0.6rem;
    overflow-x: auto;
  }
  .lbl {
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--ink-2);
    margin-bottom: 0.25rem;
  }
  .strip {
    display: grid;
    grid-template-columns: repeat(11, minmax(3.6rem, 1fr));
    gap: 3px;
    padding-bottom: 1.3rem;
  }
  .obj {
    position: relative;
    border: 1.5px solid var(--alloc);
    border-radius: 5px;
    padding: 0.2rem 0.3rem;
    min-height: 3.4rem;
    background: color-mix(in srgb, var(--alloc) 10%, var(--panel));
    font-size: 0.72rem;
    transition: all 0.3s;
  }
  .obj .addr {
    font-size: 0.6rem;
    color: var(--ink-2);
  }
  .obj .nm {
    font-weight: 700;
    font-size: 0.85rem;
  }
  .obj .fs,
  .obj .fw {
    font-size: 0.66rem;
  }
  .obj .fw {
    color: var(--meta);
  }
  .obj.garbage {
    border-style: dashed;
    border-color: var(--garbage);
    background: transparent;
    color: var(--mute);
  }
  .obj.fwd {
    background: color-mix(in srgb, var(--mute) 18%, var(--panel));
    border-color: var(--mute);
  }
  .obj.dead {
    opacity: 0.35;
  }
  .obj.empty {
    border: 1px dashed var(--line);
    background: transparent;
  }
  .obj.scanned {
    border-color: var(--green);
    background: color-mix(in srgb, var(--green) 12%, var(--panel));
  }
  .obj.hot {
    box-shadow: 0 0 0 2px var(--copper);
  }
  .finger {
    position: absolute;
    bottom: -1.25rem;
    left: 0;
    font-size: 0.66rem;
    font-weight: 700;
    font-family: var(--font-ui);
    padding: 0 0.3rem;
    border-radius: 3px;
    color: var(--on-accent);
  }
  .finger.scan {
    background: var(--violet);
  }
  .finger.free {
    background: var(--copper);
  }
  .finger.free.both {
    left: 2.4rem;
  }
</style>
