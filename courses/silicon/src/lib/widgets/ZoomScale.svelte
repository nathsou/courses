<!--
  Powers of ten, from a wafer to its atoms: seven nested views (wafer, die, logic block, rows of standard cells,
  one inverter cell, the nMOS transistor's gate, the crystal under it), each drawn around the centre of the one
  before and cross-fading as the field of view shrinks. Each view repeats, at its own scale, what the one before
  shows at its centre, so the cross-fades line up. The drawings are schematic; the scale bar is not.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { rng } from '$lib/eda/sim';
  import { INVERTER_LAYOUT } from '$lib/eda/layout';

  const LEVELS = [
    { size: 0.3, text: 'A 300 mm wafer, holding hundreds of dies.' },
    { size: 0.02, text: 'One die, about 20 mm across: processor cores, caches, and a ring of connections around the edge.' },
    { size: 1e-3, text: 'A block of logic a millimetre across: tens of thousands of standard cells, crossed by wires and power straps.' },
    { size: 2e-5, text: 'Standard cells, side by side in rows, sharing supply rails. The highlighted one is an inverter.' },
    { size: 6e-7, text: 'One inverter cell: active silicon (green), the gate (red), contacts and the first layer of metal (blue).' },
    { size: 1e-7, text: 'The nMOS transistor: where the gate crosses the active silicon. Its channel, under the gate, is about 27 nm long.' },
    { size: 3e-9, text: 'Beneath the gate, the crystal itself: silicon atoms about a quarter of a nanometre apart, so the channel is roughly a hundred atoms long.' },
  ];
  const MAX = 0.4;
  const MIN = 2e-9;
  let t = $state(0); // 0 = widest, 1 = narrowest, on a log scale
  const field = $derived(Math.exp(Math.log(MAX) + t * (Math.log(MIN) - Math.log(MAX))));
  const kOf = (i: number) => LEVELS[i]!.size / field;
  // A view fades in as it grows from 8 % to 40 % of the field, on top of the one before, and is dropped once the
  // next view covers the whole field.
  const opacity = (i: number) => {
    const lk = Math.log10(kOf(i));
    if (lk < -1.1) return 0;
    if (i < LEVELS.length - 1 && kOf(i + 1) > 1.05) return 0;
    return Math.min(1, (lk + 1.1) / 0.7);
  };
  const labels = $derived(Math.max(0, Math.min(1, (Math.log10(kOf(5)) + 0.35) / 0.3)));
  const current = $derived(LEVELS.reduce((best, _, i) => (Math.abs(Math.log10(kOf(i))) < Math.abs(Math.log10(kOf(best))) ? i : best), 0));
  const fmtLen = (m: number) => (m >= 1e-3 ? `${(m * 1e3).toPrecision(3)} mm` : m >= 1e-6 ? `${(m * 1e6).toPrecision(3)} µm` : `${(m * 1e9).toPrecision(3)} nm`);
  const ratio = (i: number) => LEVELS[i + 1]!.size / LEVELS[i]!.size;

  // Level 0: dies on a grid centred on the wafer.
  const r = rng(11);
  const dies = (() => {
    const s = 100 * ratio(0);
    const out: [number, number][] = [];
    for (let i = -8; i <= 8; i++)
      for (let j = -8; j <= 8; j++) {
        const x = 50 + (i - 0.5) * s;
        const y = 50 + (j - 0.5) * s;
        const corners = [[x, y], [x + s, y], [x, y + s], [x + s, y + s]] as const;
        if (corners.every(([a, b]) => Math.hypot(a - 50, b - 50) < 47)) out.push([x, y]);
      }
    return { s, out };
  })();
  const INSET = 3; // the scribe line around each die, in per cent of the die pitch
  const blockSize = 100 * ratio(1);

  // Level 2: power straps, two memory macros, and some long routes.
  const straps = Array.from({ length: 10 }, (_, k) => 5 + k * 10);
  const routes = Array.from({ length: 36 }, () => {
    const horizontal = r() < 0.6;
    const a = r() * 100;
    const b0 = r() * 70;
    return { horizontal, a, b0, b1: b0 + 8 + r() * 30 };
  });

  // Levels 3 and 4: the inverter, 32λ × 44λ, centred on its nMOS gate (15λ, 30λ).
  const L = INVERTER_LAYOUT;
  const LAMBDA = 100 / L.h; // level-4 units per λ: the cell is as tall as the view
  const toL4 = (x: number, y: number) => [50 + (x - 15) * LAMBDA, 50 + (y - 30) * LAMBDA] as const;
  const lay = L.rects
    .filter((x) => x.id !== 'nwell')
    .map((x) => {
      const [X, Y] = toL4(x.x0, x.y0);
      return { ...x, X, Y, W: (x.x1 - x.x0) * LAMBDA, H: (x.y1 - x.y0) * LAMBDA };
    });
  const inside = lay.filter((x) => !x.id.endsWith('-rail'));
  const [cellX, cellY] = toL4(0, 0);
  const cellW = L.w * LAMBDA;
  const wellY1 = toL4(0, 20)[1];
  const rails = lay.filter((x) => x.id.endsWith('-rail'));
  // The same cell in level-3 units, and rows of cells aligned with it.
  const s3 = ratio(3);
  const inv3 = { x: 50 + (cellX - 50) * s3, y: 50 + (cellY - 50) * s3, w: cellW * s3, h: 100 * s3 };
  const rows = Array.from({ length: 36 }, (_, m) => {
    const y = inv3.y + (m - 17) * inv3.h;
    const cells: { x: number; w: number; inv: boolean }[] = [];
    const width = () => inv3.w * (0.6 + Math.floor(r() * 5) * 0.45);
    if (m === 17) {
      cells.push({ x: inv3.x, w: inv3.w, inv: true });
      for (let x = inv3.x; x > 0; ) {
        const w = width();
        cells.push({ x: x - w, w, inv: false });
        x -= w;
      }
      for (let x = inv3.x + inv3.w; x < 100; ) {
        const w = width();
        cells.push({ x, w, inv: false });
        x += w;
      }
    } else {
      for (let x = -r() * 3; x < 100; ) {
        const w = width();
        cells.push({ x, w, inv: false });
        x += w;
      }
    }
    return { y, cells };
  }).filter((row) => row.y < 100 && row.y + inv3.h > 0);
  const railInset = (rails[0]!.Y - cellY) * s3;
  const railH = rails[0]!.H * s3;

  // Level 6: a square lattice of atoms 0.235 nm apart (the bond length in silicon), drawn as a pattern.
  const d6 = (100 * 0.235e-9) / LEVELS[6]!.size;
  const gate = lay.find((x) => x.id === 'gate')!;
  const nact = lay.find((x) => x.id === 'n-active')!;
  const zoomAbout = (k: number) => `translate(50 50) scale(${k}) translate(-50 -50)`;

  let playing = $state(false);
  let raf = 0;
  function play() {
    if (playing) {
      playing = false;
      cancelAnimationFrame(raf);
      return;
    }
    playing = true;
    if (t >= 0.999) t = 0;
    let last = performance.now();
    const tick = (now: number) => {
      t = Math.min(1, t + (now - last) / 16000);
      last = now;
      if (t < 1 && playing) raf = requestAnimationFrame(tick);
      else playing = false;
    };
    raf = requestAnimationFrame(tick);
  }
  onMount(() => () => cancelAnimationFrame(raf));
  const bar = $derived.by(() => {
    // A scale bar of a round length, about a fifth of the view.
    const target = field / 5;
    const p = 10 ** Math.floor(Math.log10(target));
    const len = [1, 2, 5].map((m) => m * p).filter((x) => x <= target).at(-1) ?? p;
    return { len, frac: len / field };
  });
</script>

<div class="zoom ui">
  <svg viewBox="0 0 100 100" role="img" aria-label="Field of view {fmtLen(field)}. {LEVELS[current]!.text}">
    <defs>
      <clipPath id="zoom-box"><rect width="100" height="100" /></clipPath>
      <pattern id="zoom-lattice" patternUnits="userSpaceOnUse" x={50 - d6 / 2} y={50 - d6 / 2} width={d6} height={d6}>
        <line x1="0" x2={d6} y1={d6 / 2} y2={d6 / 2} class="bond" />
        <line x1={d6 / 2} x2={d6 / 2} y1="0" y2={d6} class="bond" />
        <circle cx={d6 / 2} cy={d6 / 2} r={d6 * 0.24} class="atom" />
      </pattern>
    </defs>
    <rect width="100" height="100" class="bg" />
    {#each LEVELS as _, i (i)}
      {@const k = kOf(i)}
      {@const o = opacity(i)}
      {#if o > 0}
        <g transform={zoomAbout(k)} opacity={o} clip-path={i < LEVELS.length - 1 ? 'url(#zoom-box)' : undefined}>
          {#if i === 0}
            <circle cx="50" cy="50" r="49" class="wafer" />
            {#each dies.out as [x, y], n (n)}
              <rect x={x + (dies.s * INSET) / 100} y={y + (dies.s * INSET) / 100} width={(dies.s * (100 - 2 * INSET)) / 100} height={(dies.s * (100 - 2 * INSET)) / 100} class="die" class:centre={Math.abs(x + dies.s / 2 - 50) < 0.01 && Math.abs(y + dies.s / 2 - 50) < 0.01} />
            {/each}
          {:else if i === 1}
            <rect width="100" height="100" class="wafer-flat" />
            <rect x={INSET} y={INSET} width={100 - 2 * INSET} height={100 - 2 * INSET} class="die" />
            {#each Array.from({ length: 22 }) as _, n (n)}
              <rect x={7 + n * 4} y="4.5" width="2" height="2" class="pad" /><rect x={7 + n * 4} y="93.5" width="2" height="2" class="pad" />
              <rect x="4.5" y={7 + n * 4} width="2" height="2" class="pad" /><rect x="93.5" y={7 + n * 4} width="2" height="2" class="pad" />
            {/each}
            {#each [[10, 10], [55, 10], [10, 55], [55, 55]] as [x, y], n (n)}<rect {x} {y} width="35" height="35" class="core" />{/each}
            {#each Array.from({ length: 6 }) as _, n (n)}<rect x={10 + n * 13.6} y="47.8" width="11" height="2" class="cache" />{/each}
            <rect x={50 - blockSize / 2} y={50 - blockSize / 2} width={blockSize} height={blockSize} class="logic" />
          {:else if i === 2}
            <rect width="100" height="100" class="logic" />
            <rect x="4" y="8" width="30" height="22" class="macro" /><rect x="66" y="64" width="28" height="26" class="macro" />
            {#each routes as w, n (n)}
              {#if w.horizontal}<line x1={w.b0} x2={w.b1} y1={w.a} y2={w.a} class="route" />{:else}<line y1={w.b0} y2={w.b1} x1={w.a} x2={w.a} class="route v" />{/if}
            {/each}
            {#each straps as s (s)}<line x1={s} x2={s} y1="0" y2="100" class="strap" /><line y1={s} y2={s} x1="0" x2="100" class="strap" />{/each}
          {:else if i === 3}
            <rect width="100" height="100" class="logic" />
            {#each rows as row (row.y)}
              {#each row.cells as c, n (n)}<rect x={c.x} y={row.y} width={c.w} height={inv3.h} class="cell" class:inv={c.inv} />{/each}
              <rect x="0" y={row.y + railInset} width="100" height={railH} class="rail" />
              <rect x="0" y={row.y + inv3.h - railInset - railH} width="100" height={railH} class="rail" />
            {/each}
          {:else if i === 4}
            <rect width="100" height="100" class="cell flat" />
            <rect x={cellX} y={cellY} width={cellW} height="100" class="pale" />
            <rect x={cellX} y={cellY} width={cellW} height={wellY1 - cellY} class="ly nwell" />
            {#each [-100, 0, 100] as dy (dy)}
              {#each rails as rl (rl.id)}<rect x="0" y={rl.Y + dy} width="100" height={rl.H} class="ly metal1" />{/each}
              <line x1="0" x2="100" y1={cellY + dy} y2={cellY + dy} class="edge" />
            {/each}
            <line x1={cellX} x2={cellX} y1={cellY} y2={cellY + 100} class="edge" /><line x1={cellX + cellW} x2={cellX + cellW} y1={cellY} y2={cellY + 100} class="edge" />
            {#each inside as x (x.id)}<rect x={x.X} y={x.Y} width={x.W} height={x.H} class="ly {x.layer}" />{/each}
          {:else if i === 5}
            <rect width="100" height="100" class="pale" />
            <g transform={zoomAbout(1 / ratio(4))}>
              {#each inside as x (x.id)}<rect x={x.X} y={x.Y} width={x.W} height={x.H} class="ly {x.layer}" />{/each}
            </g>
            <g opacity={labels}>
              <text x="20" y="52" class="lbl c">source</text>
              <text x="80" y="52" class="lbl c">drain</text>
              <text x="50" y="6.5" class="lbl c">gate</text>
              <text x="80" y="97.5" class="lbl c">field oxide</text>
            </g>
          {:else}
            <rect x="-600" y="-600" width="1300" height="1300" class="pale" />
            <g transform={zoomAbout(1 / (ratio(4) * ratio(5)))}>
              <rect x={nact.X} y={nact.Y} width={nact.W} height={nact.H} class="ly active" />
              <rect x={gate.X} y={gate.Y} width={gate.W} height={gate.H} class="ly poly" />
            </g>
            <rect x="-600" y="-600" width="1300" height="1300" fill="url(#zoom-lattice)" />
          {/if}
        </g>
      {/if}
    {/each}
    <g transform="translate(5 92)">
      <rect x="-1.5" y="-5" width={bar.frac * 100 + 3} height="7.5" class="barbg" rx="1" />
      <line x1="0" x2={bar.frac * 100} y1="0" y2="0" class="bar" />
      <text x="0" y="-1.6" class="bart">{fmtLen(bar.len)}</text>
    </g>
  </svg>
  <div class="ctl">
    <button class="go" onclick={play}>{playing ? 'Pause' : t >= 0.999 ? 'Again' : 'Zoom in'}</button>
    <label class="sl">
      <span class="visually-hidden">Field of view</span>
      <input type="range" min="0" max="1" step="0.004" bind:value={t} oninput={() => (playing = false)} aria-valuetext="{fmtLen(field)} across" />
    </label>
    <span class="fov">{fmtLen(field)} across</span>
  </div>
  <p class="txt" aria-live="polite">{LEVELS[current]!.text}</p>
</div>

<style>
  .zoom {
    --z-die: color-mix(in srgb, var(--series-5) 55%, var(--m-si));
    --z-logic: color-mix(in srgb, var(--ac) 50%, var(--z-die));
    --z-pale: color-mix(in srgb, var(--z-logic) 22%, var(--surface));
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--surface);
    box-shadow: var(--shadow);
    overflow: hidden;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .bg {
    fill: var(--page);
  }
  .wafer {
    fill: var(--m-si);
    stroke: var(--ink-3);
    stroke-width: 0.4;
  }
  .wafer-flat {
    fill: var(--m-si);
  }
  .die {
    fill: var(--z-die);
  }
  .die.centre {
    stroke: var(--ac);
    stroke-width: 0.5;
  }
  .pad {
    fill: var(--m-metal);
  }
  .core {
    fill: var(--series-1);
    opacity: 0.45;
  }
  .cache,
  .macro {
    fill: var(--series-4);
    opacity: 0.6;
  }
  .logic {
    fill: var(--z-logic);
  }
  .route {
    stroke: var(--m-metal1);
    stroke-width: 0.35;
    opacity: 0.7;
  }
  .route.v {
    stroke: var(--m-metal2);
  }
  .strap {
    stroke: var(--m-metal);
    stroke-width: 0.9;
    opacity: 0.8;
  }
  .cell {
    fill: var(--z-logic);
    stroke: var(--ink-3);
    stroke-width: 0.06;
  }
  .cell.flat {
    stroke: none;
  }
  .cell.inv,
  .pale {
    fill: var(--z-pale);
  }
  .rail {
    fill: var(--m-metal1);
    opacity: 0.45;
  }
  .edge {
    stroke: var(--ink-3);
    stroke-width: 0.3;
    stroke-dasharray: 1.5 1;
  }
  .ly.nwell {
    fill: var(--m-well);
    opacity: 0.25;
  }
  .ly.active {
    fill: var(--m-active);
    opacity: 0.7;
  }
  .ly.poly {
    fill: var(--m-poly);
    opacity: 0.85;
  }
  .ly.contact {
    fill: var(--m-contact);
  }
  .ly.metal1 {
    fill: var(--m-metal1);
    opacity: 0.45;
  }
  .lbl {
    font-size: 4.6px;
    fill: var(--ink);
    font-family: var(--font-ui);
    font-weight: 600;
  }
  .lbl.c {
    text-anchor: middle;
  }
  .bond {
    stroke: var(--ink-2);
    stroke-width: 0.7;
    opacity: 0.7;
  }
  .atom {
    fill: var(--m-si);
    stroke: var(--ink-2);
    stroke-width: 0.35;
  }
  .barbg {
    fill: var(--surface);
    opacity: 0.85;
  }
  .bar {
    stroke: var(--ink);
    stroke-width: 1;
  }
  .bart {
    font-size: 3.4px;
    fill: var(--ink);
    font-family: var(--font-mono);
  }
  .ctl {
    display: flex;
    align-items: center;
    gap: 0.7rem;
    padding: 0.6rem 0.8rem 0;
    font-size: 0.84rem;
  }
  .go {
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--on-accent);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.9rem;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    min-height: 2.2rem;
    min-width: 5.5rem;
  }
  .sl {
    flex: 1;
    display: flex;
  }
  .sl input {
    width: 100%;
    accent-color: var(--ac);
  }
  .fov {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--ink-2);
    min-width: 7rem;
    text-align: right;
  }
  .txt {
    margin: 0.4rem 0.8rem 0.8rem;
    font-size: 0.86rem;
    color: var(--ink-2);
    min-height: 4em;
  }
</style>
