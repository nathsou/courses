<!--
  The byte explorer: lay out a C-style struct with each field at the next offset that is a multiple of its
  alignment, and see the padding the compiler inserts. Reorder fields to shrink it. Below: one value stored
  little-endian and big-endian.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';

  interface Ty {
    name: string;
    size: number;
    align: number;
  }
  const TYPES: Ty[] = [
    { name: 'bool', size: 1, align: 1 },
    { name: 'u8', size: 1, align: 1 },
    { name: 'char[3]', size: 3, align: 1 },
    { name: 'u16', size: 2, align: 2 },
    { name: 'u32', size: 4, align: 4 },
    { name: 'f32', size: 4, align: 4 },
    { name: 'u64', size: 8, align: 8 },
    { name: 'f64', size: 8, align: 8 },
    { name: 'pointer', size: 8, align: 8 },
  ];
  const ty = (n: string) => TYPES.find((t) => t.name === n)!;

  interface Field {
    name: string;
    type: string;
  }
  const PRESETS: Record<string, Field[]> = {
    'A careless order': [
      { name: 'active', type: 'bool' },
      { name: 'id', type: 'u64' },
      { name: 'flags', type: 'u8' },
      { name: 'score', type: 'f64' },
      { name: 'level', type: 'u16' },
      { name: 'next', type: 'pointer' },
    ],
    'A list node': [
      { name: 'value', type: 'u32' },
      { name: 'next', type: 'pointer' },
    ],
    'A malloc header': [
      { name: 'size', type: 'u64' },
      { name: 'in_use', type: 'bool' },
    ],
  };
  let fields = $state<Field[]>(PRESETS['A careless order']!.map((f) => ({ ...f })));

  const layout = $derived.by(() => {
    let off = 0;
    let maxAlign = 1;
    const placed: { f: Field; off: number; size: number; pad: number }[] = [];
    for (const f of fields) {
      const t = ty(f.type);
      const at = Math.ceil(off / t.align) * t.align;
      placed.push({ f, off: at, size: t.size, pad: at - off });
      off = at + t.size;
      maxAlign = Math.max(maxAlign, t.align);
    }
    const size = Math.ceil(off / maxAlign) * maxAlign;
    return { placed, size, align: maxAlign, tail: size - off, data: fields.reduce((n, f) => n + ty(f.type).size, 0) };
  });
  const best = $derived.by(() => {
    const sorted = [...fields].sort((a, b) => ty(b.type).align - ty(a.type).align);
    let off = 0;
    let al = 1;
    for (const f of sorted) {
      const t = ty(f.type);
      off = Math.ceil(off / t.align) * t.align + t.size;
      al = Math.max(al, t.align);
    }
    return Math.ceil(off / al) * al;
  });
  /** byte → owning field index, or -1 for padding. */
  const owner = $derived.by(() => {
    const o: number[] = Array(layout.size).fill(-1);
    layout.placed.forEach((p, i) => {
      for (let k = 0; k < p.size; k++) o[p.off + k] = i;
    });
    return o;
  });
  let hoverField = $state(-1);

  function move(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= fields.length) return;
    const f = [...fields];
    [f[i], f[j]] = [f[j]!, f[i]!];
    fields = f;
  }
  function sortByAlign() {
    fields = [...fields].sort((a, b) => ty(b.type).align - ty(a.type).align);
  }
  function add() {
    fields = [...fields, { name: `f${fields.length}`, type: 'u8' }];
  }

  // Endianness.
  let value = $state(0x12345678);
  const be = $derived([24, 16, 8, 0].map((s) => (value >>> s) & 0xff));
  const le = $derived([...be].reverse());
  const hx = (b: number) => b.toString(16).padStart(2, '0');
</script>

<Widget title="Laying out a struct" kind="Byte explorer" n="1.1" caption="Each field goes at the next offset that is a multiple of its alignment; the struct’s size is rounded up to a multiple of its largest alignment, so that arrays of it stay aligned. Hatched bytes are padding: memory you pay for and never use.">
  <div class="presets ui">
    {#each Object.keys(PRESETS) as p (p)}
      <button onclick={() => (fields = PRESETS[p]!.map((f) => ({ ...f })))}>{p}</button>
    {/each}
  </div>
  <div class="grid">
    <ol class="fields ui">
      {#each fields as f, i (i)}
        <li class:hl={hoverField === i} style:--c="var(--series-{(i % 8) + 1})" onmouseenter={() => (hoverField = i)} onmouseleave={() => (hoverField = -1)}>
          <span class="sw"></span>
          <input aria-label="Field name" bind:value={f.name} />
          <select aria-label="Type of {f.name}" bind:value={f.type}>
            {#each TYPES as t (t.name)}<option value={t.name}>{t.name}</option>{/each}
          </select>
          <span class="off mono">@{layout.placed[i]?.off}</span>
          <button aria-label="Move {f.name} up" onclick={() => move(i, -1)} disabled={i === 0}>↑</button>
          <button aria-label="Move {f.name} down" onclick={() => move(i, 1)} disabled={i === fields.length - 1}>↓</button>
          <button aria-label="Remove {f.name}" onclick={() => (fields = fields.filter((_, k) => k !== i))} disabled={fields.length < 2}>✕</button>
        </li>
      {/each}
      <li class="addrow"><button onclick={add} disabled={fields.length >= 10}>+ field</button> <button onclick={sortByAlign}>Sort by alignment</button></li>
    </ol>
    <div class="bytes" role="img" aria-label="Memory layout: {layout.size} bytes, of which {layout.size - layout.data} are padding">
      {#each Array.from({ length: Math.ceil(layout.size / 8) }, (_, r) => r) as r (r)}
        <div class="row">
          <span class="ofs mono">+{r * 8}</span>
          {#each Array.from({ length: 8 }, (_, c) => r * 8 + c) as b (b)}
            {@const o = owner[b] ?? -2}
            <span class="byte" class:pad={o === -1} class:out={o === -2} class:hl={o === hoverField && o >= 0} style:--c={o >= 0 ? `var(--series-${(o % 8) + 1})` : undefined}>{o >= 0 ? (layout.placed[o]!.off === b ? fields[o]!.name.slice(0, 6) : '') : o === -1 ? 'pad' : ''}</span>
          {/each}
        </div>
      {/each}
    </div>
  </div>
  <div class="meter ui">
    <div><strong>{layout.size}</strong> bytes <span class="dim">(alignment {layout.align})</span></div>
    <div>data <strong>{layout.data}</strong>, padding <strong class:bad={layout.size - layout.data > 0}>{layout.size - layout.data}</strong> ({Math.round((100 * (layout.size - layout.data)) / Math.max(1, layout.size))} %)</div>
    <div>{#if best < layout.size}<span class="vchip maybe">reordering could make it {best} bytes</span>{:else}<span class="vchip ok">✓ as small as this order of types allows</span>{/if}</div>
  </div>

  <div class="endian">
    <h5 class="ui">One value, two byte orders</h5>
    <label class="ui">A 32-bit value: 0x<input class="mono" value={value.toString(16)} oninput={(e) => {
      const v = parseInt((e.target as HTMLInputElement).value, 16);
      if (Number.isFinite(v)) value = v >>> 0;
    }} maxlength="8" /></label>
    <div class="orders mono">
      <div><span class="ui lab">little-endian (RISC-V, x86, Arm)</span>{#each le as b, i (i)}<span class="eb"><small>+{i}</small>{hx(b)}</span>{/each}</div>
      <div><span class="ui lab">big-endian (network order)</span>{#each be as b, i (i)}<span class="eb"><small>+{i}</small>{hx(b)}</span>{/each}</div>
    </div>
  </div>
</Widget>

<style>
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.7rem;
  }
  .presets button,
  .addrow button {
    border: 1px solid var(--line-strong);
    background: var(--panel);
    border-radius: 99px;
    padding: 0.15rem 0.7rem;
    font-size: 0.8rem;
    cursor: pointer;
  }
  .grid {
    display: grid;
    grid-template-columns: minmax(0, 22rem) minmax(0, 1fr);
    gap: 1rem;
  }
  @media (max-width: 760px) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .fields {
    list-style: none;
    margin: 0;
    padding: 0;
    font-size: 0.82rem;
  }
  .fields li {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.18rem 0.2rem;
    border-radius: 4px;
  }
  .fields li.hl {
    background: var(--amber-soft);
  }
  .sw {
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 2px;
    background: var(--c);
    flex: none;
  }
  .fields input {
    width: 5.5rem;
    min-width: 0;
    font: inherit;
    font-family: var(--font-mono);
    border: 1px solid var(--line);
    background: var(--panel);
    border-radius: 3px;
    padding: 0.1rem 0.3rem;
  }
  .fields select {
    font: inherit;
    border: 1px solid var(--line);
    background: var(--panel);
    border-radius: 3px;
  }
  .fields li > button {
    border: 0;
    background: none;
    cursor: pointer;
    padding: 0 0.2rem;
    color: var(--ink-2);
  }
  .fields button:disabled {
    opacity: 0.3;
  }
  .off {
    color: var(--copper);
    width: 2.5rem;
    font-size: 0.75rem;
  }
  .addrow {
    margin-top: 0.4rem;
  }
  .bytes {
    font-family: var(--font-mono);
    font-size: 0.66rem;
  }
  .row {
    display: grid;
    grid-template-columns: 2.4rem repeat(8, minmax(0, 1fr));
    gap: 2px;
    margin-bottom: 2px;
  }
  .ofs {
    color: var(--mute);
    align-self: center;
  }
  .byte {
    height: 1.9rem;
    display: flex;
    align-items: center;
    padding-left: 0.2rem;
    background: color-mix(in srgb, var(--c) 30%, var(--panel));
    border-top: 3px solid var(--c);
    overflow: hidden;
    white-space: nowrap;
    color: var(--fg);
    transition: background 200ms;
  }
  .byte.hl {
    background: color-mix(in srgb, var(--c) 60%, var(--panel));
  }
  .byte.pad {
    background: repeating-linear-gradient(135deg, transparent 0 4px, color-mix(in srgb, var(--free) 35%, transparent) 4px 5px);
    border-top: 3px dashed var(--free);
    color: var(--mute);
  }
  .byte.out {
    background: none;
    border: 0;
  }
  .meter {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 1.6rem;
    align-items: center;
    margin: 0.9rem 0 0.4rem;
    font-size: 0.9rem;
  }
  .dim {
    color: var(--mute);
  }
  .bad {
    color: var(--leak);
  }
  .endian {
    margin-top: 1rem;
    padding-top: 0.8rem;
    border-top: 1px dashed var(--line);
  }
  h5 {
    margin: 0 0 0.4rem;
    font-size: 0.86rem;
  }
  .endian label {
    font-size: 0.85rem;
  }
  .endian input {
    width: 6rem;
    font-family: var(--font-mono);
    border: 1px solid var(--line-strong);
    background: var(--panel);
    padding: 0.1rem 0.3rem;
  }
  .orders > div {
    display: flex;
    align-items: center;
    gap: 3px;
    margin-top: 0.4rem;
    flex-wrap: wrap;
  }
  .lab {
    width: 14rem;
    font-size: 0.78rem;
    color: var(--ink-2);
  }
  .eb {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    padding: 0.15rem 0.5rem;
    background: var(--alloc-soft);
    border-radius: 3px;
    font-size: 0.85rem;
  }
  .eb small {
    font-size: 0.6rem;
    color: var(--mute);
  }
</style>
