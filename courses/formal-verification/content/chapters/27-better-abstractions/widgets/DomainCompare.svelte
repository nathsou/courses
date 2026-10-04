<!--
  Domain comparison: the states of a two-variable loop at its head (from seeded sample runs), and over them the box
  the interval analysis computes, the octagon the octagon analysis computes, and the convex hull of the states (the
  smallest polyhedron containing them). An assertion is a half-plane: a domain proves it when its shape lies inside.
  The octagon's invariant can be handed to the program verifier, which checks it.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import { parse } from '$lib/fv/vouch/syntax/parser';
  import { check } from '$lib/fv/vouch/check/checker';
  import { analyse, type Shown } from '$lib/fv/absint/analyse';
  import { NonRelational, IntervalValues, type StateDomain } from '$lib/fv/absint/domain';
  import { Octagons } from '$lib/fv/absint/octagon';
  import { checkInvariant, shownToVouch, type HandoffResult } from '$lib/fv/absint/handoff';
  import { Runner } from '$lib/fv/vouch/interp/exec';
  import { rng } from '$lib/fv/util/random';
  import type { Value } from '$lib/fv/vouch/interp/values';
  import { hull, insideAll, planesOf, region, type HalfPlane, type Pt } from './shapes';

  let { code, fn: fnName, x, y, assertion, plane, title, caption }: { code: string; fn: string; x: string; y: string; assertion: string; plane: HalfPlane; title?: string; caption?: string } = $props();

  let error = $state('');
  let boxState = $state.raw<Shown | undefined>();
  let octState = $state.raw<Shown | undefined>();
  let points = $state.raw<Pt[]>([]);
  let line = $state(0);
  let handoff = $state.raw<HandoffResult | undefined>();
  let checking = $state(false);
  let show = $state({ box: true, oct: true, hull: true });

  function run() {
    // svelte-ignore state_referenced_locally
    const src = code.replace(/\n$/, '');
    const p = parse(src);
    const c = check(p.program);
    const errs = [...p.diagnostics, ...c.diagnostics].filter((d) => d.severity === 'error');
    if (errs.length) return void (error = errs.map((e) => e.message).join(' '));
    const info = c.fns.get(fnName)!;
    const iv = analyse(c, info, new NonRelational(IntervalValues) as StateDomain<unknown>, src);
    const oc = analyse(c, info, new Octagons() as StateDomain<unknown>, src);
    const head = iv.points.find((q) => q.loopHead)!;
    line = head.line;
    boxState = head.state;
    octState = oc.points.find((q) => q.loopHead)!.state;
    // States at the loop head: entering the loop, and at the end of each iteration.
    const inside = iv.points.filter((q) => q.span.start > head.span.start && q.span.end <= head.span.end);
    const before = iv.points.filter((q) => q.span.end <= head.span.start).at(-1);
    const spans = [...(inside.length ? [inside.at(-1)!.span.start] : []), ...(before ? [before.span.start] : [])];
    const r = rng(27);
    const pts: Pt[] = [];
    for (let k = 0; k < 40; k++) {
      const args = info.params.map((prm): Value => (prm.ty.k === 'bool' ? r.chance(0.5) : BigInt(r.int(0, 13))));
      const res = new Runner(c, { fuel: 20_000, trace: 600 }).run(fnName, args);
      if (res.discarded) continue;
      for (const t of res.trace) {
        if (t.fn !== fnName || !spans.includes(t.span.start)) continue;
        const a = Number(t.vars[x]);
        const b = Number(t.vars[y]);
        if (Number.isFinite(a) && Number.isFinite(b)) pts.push([a, b]);
      }
    }
    points = pts;
  }
  untrack(run);

  const HUGE: [number, number, number, number] = [-1e6, -1e6, 1e6, 1e6];
  const shapes = $derived.by(() => {
    if (!boxState || !octState) return undefined;
    const box = planesOf(boxState.vars, [], x, y);
    const oct = planesOf(octState.vars, octState.relations, x, y);
    return {
      box: { poly: region(box.planes, HUGE), planes: box.planes },
      oct: { poly: region(oct.planes, HUGE), planes: oct.planes },
      hull: { poly: hull(points), planes: [] as HalfPlane[] },
    };
  });
  const view = $derived.by((): [number, number, number, number] => {
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const finite = (poly: Pt[]) => poly.filter((p) => Math.abs(p[0]) < 1e5 && Math.abs(p[1]) < 1e5);
    for (const p of [...finite(shapes?.box.poly ?? []), ...finite(shapes?.oct.poly ?? [])]) {
      xs.push(p[0]);
      ys.push(p[1]);
    }
    const x0 = Math.min(0, ...xs) - 2;
    const x1 = Math.max(4, ...xs) + 2;
    const y0 = Math.min(0, ...ys) - 2;
    const y1 = Math.max(4, ...ys) + 2;
    return [x0, y0, x1, y1];
  });
  const W = 420;
  const H = 320;
  const sx = (v: number) => 30 + ((v - view[0]) / (view[2] - view[0])) * (W - 40);
  const sy = (v: number) => H - 25 - ((v - view[1]) / (view[3] - view[1])) * (H - 35);
  const path = (poly: Pt[]) => (poly.length ? poly.map((p, i) => `${i ? 'L' : 'M'}${sx(p[0])} ${sy(p[1])}`).join(' ') + ' Z' : '');
  // The assertion's boundary line, a·x + b·y = c, across the view.
  const boundary = $derived.by(() => {
    const { a, b, c } = plane;
    const pts: Pt[] = [];
    if (b !== 0) for (const xv of [view[0], view[2]]) pts.push([xv, (c - a * xv) / b]);
    else for (const yv of [view[1], view[3]]) pts.push([c / a, yv]);
    return pts;
  });
  const unsafe = $derived(region([{ a: -plane.a, b: -plane.b, c: -plane.c - 1e-6 }], view));
  const proves = (k: 'box' | 'oct' | 'hull') => !!shapes && insideAll(shapes[k].poly, plane);

  function verifyOct() {
    if (!octState) return;
    checking = true;
    const inv = shownToVouch(octState);
    setTimeout(() => {
      handoff = checkInvariant(code.replace(/\n$/, ''), fnName, line, inv);
      checking = false;
    }, 30);
  }
</script>

<figure class="dc">
  {#if title}<h4 class="ui ttl">{title}</h4>{/if}
  {#if error}<p class="err ui">{error}</p>{/if}
  <div class="cols">
    <div class="src">{#each code.replace(/\n$/, '').split('\n') as l, i (i)}<div class="l"><code>{l || ' '}</code></div>{/each}</div>
    <div>
      <svg viewBox="0 0 {W} {H}" role="img" aria-label="States of ({x}, {y}) at the loop head, with the abstractions">
        <path d={path(unsafe)} class="unsafe" />
        {#if shapes}
          {#if show.box}<path d={path(region(shapes.box.planes, view))} class="box" />{/if}
          {#if show.oct}<path d={path(region(shapes.oct.planes, view))} class="oct" />{/if}
          {#if show.hull && shapes.hull.poly.length}<path d={path(shapes.hull.poly)} class="hullp" />{/if}
        {/if}
        <line x1={sx(boundary[0]![0])} y1={sy(boundary[0]![1])} x2={sx(boundary[1]![0])} y2={sy(boundary[1]![1])} class="bline" />
        {#each points as p, i (i)}<circle cx={sx(p[0])} cy={sy(p[1])} r="3" class="pt" />{/each}
        <line x1="30" y1={H - 25} x2={W - 10} y2={H - 25} class="axis" />
        <line x1="30" y1="10" x2="30" y2={H - 25} class="axis" />
        <text x={W - 12} y={H - 8} class="lab" text-anchor="end">{x}</text>
        <text x="8" y="16" class="lab">{y}</text>
        <text x={sx(Math.ceil(view[0] + 1))} y={H - 10} class="tick" text-anchor="middle">{Math.ceil(view[0] + 1)}</text>
        <text x={sx(Math.floor(view[2] - 1))} y={H - 10} class="tick" text-anchor="middle">{Math.floor(view[2] - 1)}</text>
      </svg>
      <p class="ui leg"><span class="sw unsafe-sw"></span> where <code>{assertion}</code> fails <span class="sw pt-sw"></span> states seen at the loop head (line {line})</p>
      <table class="ui">
        <thead><tr><th></th><th>domain</th><th>shape at the loop head</th><th>proves <code>{assertion}</code>?</th></tr></thead>
        <tbody>
          <tr><td><input type="checkbox" bind:checked={show.box} aria-label="Show the box" /></td><td><span class="sw box-sw"></span> intervals</td><td><code>{boxState ? Object.entries(boxState.vars).filter(([k]) => k === x || k === y).map(([k, v]) => `${k} ${v}`).join(', ') : ''}</code></td><td class:yes={proves('box')}>{proves('box') ? 'yes' : 'no'}</td></tr>
          <tr><td><input type="checkbox" bind:checked={show.oct} aria-label="Show the octagon" /></td><td><span class="sw oct-sw"></span> octagons</td><td><code>{octState ? octState.relations.join(', ') || '(no relations)' : ''}</code></td><td class:yes={proves('oct')}>{proves('oct') ? 'yes' : 'no'}</td></tr>
          <tr><td><input type="checkbox" bind:checked={show.hull} aria-label="Show the convex hull" /></td><td><span class="sw hull-sw"></span> polyhedra</td><td>the convex hull of the states seen</td><td class:yes={proves('hull')}>{proves('hull') ? 'yes' : 'no'}</td></tr>
        </tbody>
      </table>
      <div class="ho ui">
        <button type="button" onclick={verifyOct} disabled={checking}>{checking ? 'Verifying…' : 'Hand the octagon invariant to the verifier'}</button>
        {#if handoff}<p class:ok={handoff.status === 'verified'} class:bad={handoff.status !== 'verified'}>{handoff.status === 'verified' ? '✓' : '✗'} <code>invariant {shownToVouch(octState!)}</code>: {handoff.message}</p>{/if}
      </div>
    </div>
  </div>
  {#if caption}<figcaption>{caption}</figcaption>{/if}
</figure>

<style>
  .dc {
    margin: 1.8rem 0;
    padding: 0.9rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--pn);
  }
  .ttl {
    margin: 0 0 0.6rem;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-2);
  }
  .cols {
    display: grid;
    grid-template-columns: minmax(0, 0.8fr) minmax(0, 1.2fr);
    gap: 0.9rem;
  }
  @media (max-width: 860px) {
    .cols {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .src {
    margin: 0;
    padding: 0.5rem;
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--panel);
    overflow-x: auto;
  }
  .dc code {
    all: unset;
    font-family: var(--font-mono);
    font-size: 0.76rem;
    white-space: pre-wrap;
  }
  .src code {
    white-space: pre;
  }
  .l {
    line-height: 1.5;
  }
  svg {
    display: block;
    width: 100%;
    max-width: 460px;
    height: auto;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
  }
  .unsafe {
    fill: color-mix(in srgb, var(--pencil) 10%, transparent);
  }
  .bline {
    stroke: var(--pencil);
    stroke-dasharray: 5 3;
  }
  .box {
    fill: color-mix(in srgb, var(--gold) 12%, transparent);
    stroke: var(--gold);
    stroke-width: 1.5;
  }
  .oct {
    fill: color-mix(in srgb, var(--ink-blue) 14%, transparent);
    stroke: var(--ink-blue);
    stroke-width: 1.5;
  }
  .hullp {
    fill: color-mix(in srgb, var(--seal) 18%, transparent);
    stroke: var(--seal);
    stroke-width: 2;
  }
  .pt {
    fill: var(--fg);
  }
  .axis {
    stroke: var(--line-strong);
  }
  .lab,
  .tick {
    font-family: var(--font-mono);
    font-size: 11px;
    fill: var(--ink-2);
  }
  .leg {
    font-size: 0.76rem;
    color: var(--ink-2);
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
  }
  .sw {
    display: inline-block;
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 2px;
    vertical-align: -0.1rem;
  }
  .unsafe-sw {
    background: color-mix(in srgb, var(--pencil) 25%, transparent);
  }
  .pt-sw {
    background: var(--fg);
    border-radius: 50%;
    width: 0.5rem;
    height: 0.5rem;
  }
  .box-sw {
    border: 1.5px solid var(--gold);
  }
  .oct-sw {
    border: 1.5px solid var(--ink-blue);
  }
  .hull-sw {
    border: 2px solid var(--seal);
  }
  table {
    border-collapse: collapse;
    font-size: 0.8rem;
    margin-top: 0.5rem;
    width: 100%;
  }
  .dc th,
  .dc td {
    text-align: left;
    padding: 0.2rem 0.35rem;
    border-bottom: 1px solid var(--line);
    text-transform: none;
    letter-spacing: 0;
  }
  td.yes {
    color: var(--seal);
    font-weight: 700;
  }
  button {
    font-family: var(--font-ui);
    font-size: 0.8rem;
    padding: 0.22rem 0.65rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--ink-blue);
    background: var(--ink-blue);
    color: var(--on-accent);
    font-weight: 600;
    cursor: pointer;
    margin-top: 0.6rem;
  }
  .ho p {
    font-size: 0.8rem;
  }
  .ho .ok {
    color: var(--seal);
  }
  .ho .bad,
  .err {
    color: var(--pencil);
  }
  figcaption {
    margin-top: 0.6rem;
    font-family: var(--font-ui);
    font-size: 0.86rem;
    color: var(--ink-2);
  }
</style>
