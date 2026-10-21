<!--
  The Tonnetz: pitch classes on a lattice, fifths running across, major thirds up to the right, minor thirds up to
  the left. Every triangle is a triad (pointing up: major; pointing down: minor), and the three neo-Riemannian moves
  P, L and R flip a triad across one of its edges onto a neighbour that shares two notes.
-->
<script lang="ts">
  import { audio } from '$lib/audio/engine.svelte';
  import { settings } from '$lib/state/settings.svelte';
  import { noteName } from '$lib/music/names';
  import { mod, spell } from '$lib/music/pitch';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  let { title = 'The Tonnetz', start = 'C' }: { title?: string; start?: string } = $props();

  type Triad = { root: number; major: boolean };
  /** Lattice coordinates: pitch class at (i, j) is 7i + 4j. A major triad at (i, j) is (i,j), (i+1,j), (i,j+1); a minor triad is (i,j), (i+1,j), (i+1,j−1). */
  type Tri = { i: number; j: number; major: boolean };

  const COLS = 9;
  const ROWS = 5;
  const W = 56;
  const H = W * 0.866;
  const pcAt = (i: number, j: number) => mod(7 * i + 4 * j, 12);
  const px = (i: number, j: number) => 28 + i * W + j * (W / 2);
  const py = (j: number) => 20 + (ROWS - 1 - j) * H;

  const START: Record<string, number> = { C: 0, G: 7, D: 2, A: 9, E: 4, F: 5 };
  const triOf = (t: Tri): Triad => (t.major ? { root: pcAt(t.i, t.j), major: true } : { root: pcAt(t.i, t.j), major: false });
  const pts = (t: Tri): [number, number][] =>
    t.major
      ? [[t.i, t.j], [t.i + 1, t.j], [t.i, t.j + 1]]
      : [[t.i, t.j], [t.i + 1, t.j], [t.i + 1, t.j - 1]];
  const centroid = (t: Tri) => {
    const p = pts(t);
    return [p.reduce((s, [i, j]) => s + px(i, j), 0) / 3, p.reduce((s, [, j]) => s + py(j), 0) / 3] as const;
  };
  // Minor triad (i, j): root 7i+4j, then +3 (i+1, j−1) and +7 (i+1, j): the root is the left vertex.
  const allTris: Tri[] = [];
  for (let i = 0; i < COLS - 1; i++)
    for (let j = 0; j < ROWS; j++) {
      if (j + 1 < ROWS && px(i, j + 1) <= px(COLS - 1, 0) + W) allTris.push({ i, j, major: true });
      if (j - 1 >= 0) allTris.push({ i, j, major: false });
    }
  const visible = allTris.filter((t) => {
    const [cx] = centroid(t);
    return cx > 20 && cx < px(COLS - 1, 0) + 10;
  });

  let current: Tri = $state({ i: 2, j: 1, major: true });
  let path: Tri[] = $state([]);
  $effect.pre(() => {
    const r = START[start] ?? 0;
    current = visible.find((t) => t.major && pcAt(t.i, t.j) === r && t.i >= 2) ?? visible[0]!;
    path = [current];
  });

  const name = (t: Triad) => noteName(spell(60 + t.root, 0), settings.nameOptions) + (t.major ? '' : 'm');

  function play(t: Triad) {
    audio.start();
    const base = 57 + mod(t.root - 57, 12);
    const ns = [base, base + (t.major ? 4 : 3), base + 7];
    audio.playSequence(ns.map((m) => ({ midi: m, time: 0, duration: 1.4, velocity: 70 })));
  }

  /** The triad reached by P, L or R, and the triangle for it that lies next to the current one. */
  function move(op: 'P' | 'L' | 'R') {
    const t = triOf(current);
    let next: Triad;
    if (t.major) next = op === 'P' ? { root: t.root, major: false } : op === 'L' ? { root: mod(t.root + 4, 12), major: false } : { root: mod(t.root + 9, 12), major: false };
    else next = op === 'P' ? { root: t.root, major: true } : op === 'L' ? { root: mod(t.root + 8, 12), major: true } : { root: mod(t.root + 3, 12), major: true };
    const [cx, cy] = centroid(current);
    const cands = visible.filter((v) => v.major === next.major && pcAt(v.i, v.j) === next.root);
    if (!cands.length) return;
    const best = cands.sort((a, b) => Math.hypot(centroid(a)[0] - cx, centroid(a)[1] - cy) - Math.hypot(centroid(b)[0] - cx, centroid(b)[1] - cy))[0]!;
    current = best;
    path = [...path.slice(-11), best];
    play(next);
  }
  function choose(t: Tri) {
    current = t;
    path = [...path.slice(-11), t];
    play(triOf(t));
  }
  function reset() {
    path = [current];
  }
  const sameTri = (a: Tri, b: Tri) => a.i === b.i && a.j === b.j && a.major === b.major;
</script>

<Widget {title} subtitle="Click a triangle to hear its triad, or move with P, L and R. Each move keeps two notes and moves one." onreset={reset}>
  {#snippet controls()}
    <button class="op" onclick={() => move('P')} title="Parallel: C ↔ Cm"><strong>P</strong> parallel</button>
    <button class="op" onclick={() => move('L')} title="Leading-tone exchange: C ↔ Em"><strong>L</strong> leading-tone</button>
    <button class="op" onclick={() => move('R')} title="Relative: C ↔ Am"><strong>R</strong> relative</button>
    <button class="op" onclick={() => play(triOf(current))}><Icon name="play" size={14} /> {name(triOf(current))}</button>
  {/snippet}
  <div class="tz">
    <svg viewBox="0 0 {px(COLS - 1, 0) + 40} {py(0) + 22}" role="img" aria-label="Tonnetz lattice; current triad {name(triOf(current))}">
      {#each visible as t (`${t.i},${t.j},${t.major}`)}
        {@const p = pts(t)}
        <polygon
          points={p.map(([i, j]) => `${px(i, j)},${py(j)}`).join(' ')}
          class:major={t.major}
          class:minor={!t.major}
          class:current={sameTri(t, current)}
          class:visited={path.some((v) => sameTri(v, t))}
          role="button"
          tabindex="-1"
          aria-label={name(triOf(t))}
          onclick={() => choose(t)}
          onkeydown={(e) => e.key === 'Enter' && choose(t)}
        />
      {/each}
      {#if path.length > 1}
        <polyline points={path.map((t) => centroid(t).join(',')).join(' ')} class="path" />
      {/if}
      {#each Array.from({ length: COLS }, (_, i) => i) as i (i)}
        {#each Array.from({ length: ROWS }, (_, j) => j) as j (j)}
          {#if px(i, j) < px(COLS - 1, 0) + 30}
            <circle cx={px(i, j)} cy={py(j)} r="12" class="node" />
            <text x={px(i, j)} y={py(j) + 4} class="pc">{noteName(spell(60 + pcAt(i, j), 0), settings.nameOptions)}</text>
          {/if}
        {/each}
      {/each}
    </svg>
    <p class="trail">{path.map((t) => name(triOf(t))).join(' → ')}</p>
  </div>
</Widget>

<style>
  .tz {
    padding: 0.6rem 1rem 0.9rem;
  }
  svg {
    width: 100%;
    height: auto;
  }
  polygon {
    stroke: var(--line);
    stroke-width: 1;
    cursor: pointer;
  }
  polygon.major {
    fill: color-mix(in srgb, var(--fn-t) 14%, transparent);
  }
  polygon.minor {
    fill: color-mix(in srgb, var(--fn-pd) 12%, transparent);
  }
  polygon.visited {
    fill: color-mix(in srgb, var(--accent) 22%, transparent);
  }
  polygon.current {
    fill: color-mix(in srgb, var(--accent) 55%, transparent);
  }
  .path {
    fill: none;
    stroke: var(--accent-ink);
    stroke-width: 2;
    stroke-dasharray: 4 3;
    pointer-events: none;
  }
  .node {
    fill: var(--surface);
    stroke: var(--line-strong);
    pointer-events: none;
  }
  .pc {
    font: 600 11px var(--font-ui);
    text-anchor: middle;
    fill: var(--ink);
    pointer-events: none;
  }
  .trail {
    margin: 0.4rem 0 0;
    font-size: 0.9rem;
    color: var(--ink-2);
  }
  .op {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.25rem 0.7rem;
    cursor: pointer;
  }
</style>
