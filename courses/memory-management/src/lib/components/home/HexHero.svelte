<!--
  The home page's hex dump: a tiny heap, 8 rows of 16 bytes, where an allocator keeps allocating and freeing
  chunks. Each chunk has an 8-byte header (grey, with its size) and a payload (filled); free chunks are hatched.
  It is decoration with meaning: the same encoding as every figure in the course. Static under reduced motion.
-->
<script lang="ts">
  import { onMount } from 'svelte';

  interface Chunk {
    at: number;
    size: number;
    free: boolean;
    tag: string;
  }
  const BYTES = 128;
  const NAMES = ['Point', 'Node', 'str', 'Vec', 'Map', 'buf', 'User', 'Task'];
  let chunks: Chunk[] = $state([
    { at: 0, size: 32, free: false, tag: 'Node' },
    { at: 32, size: 24, free: true, tag: '' },
    { at: 56, size: 40, free: false, tag: 'str' },
    { at: 96, size: 32, free: true, tag: '' },
  ]);
  let flash = $state(-1);
  let caption = $state('malloc(24) → 0x1008');
  let seed = 7;
  const rnd = (n: number) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed % n;
  };

  function step() {
    const used = chunks.filter((c) => !c.free);
    if (used.length > 2 && rnd(3) === 0) {
      const c = used[rnd(used.length)]!;
      c.free = true;
      c.tag = '';
      caption = `free(0x${(0x1000 + c.at + 8).toString(16)})`;
      flash = c.at;
    } else {
      const size = [16, 24, 32][rnd(3)]!;
      const i = chunks.findIndex((c) => c.free && c.size >= size);
      if (i < 0) {
        caption = `malloc(${size - 8}) → no fit: fragmentation!`;
        for (const c of chunks) if (!c.free && rnd(2) === 0) (c.free = true), (c.tag = '');
      } else {
        const c = chunks[i]!;
        if (c.size - size >= 16) {
          chunks.splice(i + 1, 0, { at: c.at + size, size: c.size - size, free: true, tag: '' });
          c.size = size;
        }
        c.free = false;
        c.tag = NAMES[rnd(NAMES.length)]!;
        caption = `malloc(${c.size - 8}) → 0x${(0x1000 + c.at + 8).toString(16)}`;
        flash = c.at;
      }
    }
    // Coalesce neighbouring free chunks, as a real allocator would.
    for (let i = 0; i + 1 < chunks.length; ) {
      if (chunks[i]!.free && chunks[i + 1]!.free) {
        chunks[i]!.size += chunks[i + 1]!.size;
        chunks.splice(i + 1, 1);
      } else i++;
    }
  }

  onMount(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(step, 1700);
    return () => clearInterval(t);
  });

  const owner = $derived.by(() => {
    const o: { chunk: Chunk; header: boolean; first: boolean }[] = [];
    for (const c of chunks) for (let b = 0; b < c.size; b++) o.push({ chunk: c, header: b < 8, first: b === 0 });
    return o;
  });
  const hex = (b: number) => {
    const o = owner[b];
    if (!o) return '00';
    if (o.chunk.free) return '··';
    if (o.header) return b % 8 === 0 ? (o.chunk.size | 1).toString(16).padStart(2, '0') : '00';
    return ((o.chunk.at * 7 + b * 31) & 0xff).toString(16).padStart(2, '0');
  };
</script>

<div class="hex" aria-hidden="true">
  {#each Array.from({ length: BYTES / 16 }, (_, r) => r) as r (r)}
    <div class="row">
      <span class="addr">{(0x1000 + r * 16).toString(16).padStart(6, '0')}</span>
      {#each Array.from({ length: 16 }, (_, k) => r * 16 + k) as b (b)}
        {@const o = owner[b]}
        <span class="byte" class:free={o?.chunk.free} class:hdr={o && !o.chunk.free && o.header} class:used={o && !o.chunk.free && !o.header} class:flash={o?.chunk.at === flash} class:gap={b % 8 === 7}>{hex(b)}</span>
      {/each}
      <span class="tags">
        {#each chunks.filter((c) => !c.free && c.at >= r * 16 && c.at < r * 16 + 16) as c (c.at)}<span>{c.tag}</span>{/each}
      </span>
    </div>
  {/each}
  <p class="caption">{caption}</p>
</div>

<style>
  .hex {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    line-height: 1.55;
    padding: 0.9rem 1rem;
    border-radius: 10px;
    background: light-dark(#fbf8f0, #0a0b0d);
    border: 1px solid var(--line-strong);
    box-shadow: var(--shadow-lg), inset 0 0 40px light-dark(transparent, rgb(255 181 71 / 0.05));
    color: var(--mute);
    width: max-content;
    max-width: 100%;
    overflow: hidden;
  }
  .row {
    display: flex;
    gap: 0.28em;
    white-space: nowrap;
  }
  .addr {
    color: var(--copper);
    margin-right: 0.5em;
  }
  .byte {
    padding: 0 0.08em;
    border-radius: 2px;
    transition: background 300ms, color 300ms;
  }
  .byte.gap {
    margin-right: 0.45em;
  }
  .byte.hdr {
    color: var(--fg);
    background: var(--meta-soft);
  }
  .byte.used {
    color: var(--alloc);
    background: var(--alloc-soft);
  }
  .byte.free {
    color: var(--garbage);
    background: repeating-linear-gradient(135deg, transparent 0 3px, color-mix(in srgb, var(--free) 30%, transparent) 3px 4px);
  }
  .byte.flash {
    box-shadow: 0 0 0 1px var(--amber);
    color: var(--amber);
  }
  .tags {
    margin-left: 0.6em;
    color: var(--amber);
    display: flex;
    gap: 0.5em;
    font-size: 0.68rem;
  }
  .caption {
    margin: 0.5rem 0 0;
    color: var(--amber);
    font-size: 0.78rem;
    min-height: 1.2em;
  }
  .caption::before {
    content: '› ';
    color: var(--mute);
  }
  @media (max-width: 520px) {
    .hex {
      font-size: 0.56rem;
    }
    .tags {
      display: none;
    }
  }
</style>
