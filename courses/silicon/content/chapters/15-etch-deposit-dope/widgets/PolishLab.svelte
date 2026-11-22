<!--
  Polishing flat: insulator deposited over a layer of wires follows their steps; chemical-mechanical polishing
  removes the steps, but how fast depends on the density of wires around each point (a pattern-density model).
  Polish, add dummy fill, and try to bring the whole strip within lithography's depth of focus without polishing
  through to the wires.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import { progress } from '$lib/state/progress.svelte';
  import { COVER, REGIONS, STEP, STRIP, effectiveDensity, heightRange, pattern, polished } from '$lib/fab/cmp';

  const DOF = 100; // nm
  const PERIOD = 300; // µm, the drawn pitch of the wires (real wires are thousands of times finer)
  let removed = $state(0);
  let fill = $state(false);
  let mounted = $state(false);
  onMount(() => {
    progress.load();
    mounted = true;
  });

  const profile = $derived(effectiveDensity(REGIONS, fill));
  const wires = $derived(pattern(REGIONS, fill, PERIOD));
  const W = 960;
  const COLS = 960;
  const xOf = (um: number) => (um / STRIP) * W;
  const WIRE_TOP = -COVER; // nm, relative to the insulator's top over the wires before polishing
  const WIRE_BOTTOM = -COVER - STEP;
  const yOf = (z: number) => 10 + ((60 - z) / (60 - (WIRE_BOTTOM - 120))) * 190;
  // Which columns lie over a wire, and the surface height of each column.
  const surface = $derived.by(() => {
    const over = new Array<boolean>(COLS).fill(false);
    for (const w of wires) for (let c = Math.floor(xOf(w.from)); c < Math.ceil(xOf(w.to)) && c < COLS; c++) over[c] = true;
    return over.map((o, c) => {
      const rho = profile[Math.min(profile.length - 1, Math.floor((c / COLS) * profile.length))]!.rho;
      const h = polished(rho, removed);
      return { over: o, z: o ? h.up : h.down };
    });
  });
  const range = $derived(heightRange(profile, removed));
  const hi = $derived(Math.max(...surface.map((s) => s.z)));
  const lo = $derived(Math.min(...surface.map((s) => s.z)));
  const mid = $derived((hi + lo) / 2);
  const left = $derived(Math.min(...surface.filter((s) => s.over).map((s) => s.z)) - WIRE_TOP);
  const exposed = $derived(left < 0);
  const flat = $derived(range <= DOF && !exposed);
  $effect(() => {
    if (flat && mounted) progress.markSolved('deposit/cmp-flat');
  });
  // The surface as runs of columns, each in focus or not, for drawing.
  const runs = $derived.by(() => {
    const out: { d: string; ok: boolean }[] = [];
    let cur: { pts: string[]; ok: boolean } | null = null;
    surface.forEach((s, c) => {
      const ok = Math.abs(s.z - mid) <= DOF / 2 + 1e-6;
      const p = `${c * (W / COLS)} ${yOf(s.z).toFixed(2)}`;
      const q = `${(c + 1) * (W / COLS)} ${yOf(s.z).toFixed(2)}`;
      if (!cur || cur.ok !== ok) {
        if (cur) out.push({ d: 'M' + cur.pts.join('L'), ok: cur.ok });
        cur = { pts: cur ? [cur.pts.at(-1)!, p, q] : [p, q], ok };
      } else cur.pts.push(p, q);
    });
    if (cur) out.push({ d: 'M' + (cur as { pts: string[] }).pts.join('L'), ok: (cur as { ok: boolean }).ok });
    return out;
  });
  const insulator = $derived(`M0 ${yOf(WIRE_BOTTOM)}` + surface.map((s, c) => `L${c * (W / COLS)} ${yOf(s.z).toFixed(2)}L${(c + 1) * (W / COLS)} ${yOf(s.z).toFixed(2)}`).join('') + `L${W} ${yOf(WIRE_BOTTOM)}Z`);
</script>

<Widget title="Polishing flat" subtitle="Insulator deposited over a layer of wires follows their steps. Polish it, and try to bring the whole strip within the depth of focus of the next lithography step (100 nm) without polishing through to the wires.">
  {#snippet controls()}
    <Slider bind:value={removed} min={0} max={500} step={5} label="Polished away" format={(v) => `${v} nm`} />
    <Toggle bind:checked={fill} label="Dummy fill" />
  {/snippet}
  <div class="regions ui" style:grid-template-columns={REGIONS.map((r) => `${r.to - r.from}fr`).join(' ')} aria-hidden="true">
    {#each REGIONS as r (r.name)}<div><strong>{r.name}</strong><span>{Math.round(r.density * 100)} % wires{fill && r.density < 0.4 ? ' + fill' : ''}</span></div>{/each}
  </div>
  <svg viewBox="0 0 {W} 210" preserveAspectRatio="none" class="xs" role="img" aria-label="Cross-section of a 24 mm strip after polishing {removed} nm: the surface varies by {range.toFixed(0)} nm">
    {#each REGIONS.slice(1) as r (r.name)}<line x1={xOf(r.from)} x2={xOf(r.from)} y1="0" y2="210" class="div" />{/each}
    <rect x="0" y={yOf(WIRE_BOTTOM)} width={W} height={210 - yOf(WIRE_BOTTOM)} class="under" />
    <path d={insulator} class="ins" />
    {#each wires as w, i (i)}
      {@const top = Math.max(yOf(WIRE_TOP), yOf(Math.min(...surface.slice(Math.floor(xOf(w.from)), Math.max(Math.floor(xOf(w.from)) + 1, Math.ceil(xOf(w.to)))).map((s) => s.z))))}
      <rect x={xOf(w.from)} y={top} width={Math.max(1, xOf(w.to) - xOf(w.from))} height={yOf(WIRE_BOTTOM) - top} class="wire" class:dummy={w.dummy} />
    {/each}
    <rect x="0" y={yOf(mid + DOF / 2)} width={W} height={yOf(mid - DOF / 2) - yOf(mid + DOF / 2)} class="band" />
    {#each runs as r, i (i)}<path d={r.d} class="surf" class:out={!r.ok} />{/each}
  </svg>
  <p class="key ui"><span><span class="sw wire"></span>wires</span> <span><span class="sw dummy"></span>dummy fill</span> <span><span class="sw ins"></span>insulator</span> <span><span class="sw band"></span>depth of focus</span> <span><span class="sw out"></span>surface out of focus</span> <span>Wires drawn far wider than they are; heights exaggerated thousands of times.</span></p>
  <dl class="nums ui">
    <div><dt>Surface height range across the strip</dt><dd class:bad={range > DOF}>{range.toFixed(0)} nm</dd></div>
    <div><dt>Depth of focus</dt><dd>{DOF} nm</dd></div>
    <div><dt>Insulator left over the wires</dt><dd class:bad={exposed}>{exposed ? 'none: wires exposed' : `${left.toFixed(0)} nm at least`}</dd></div>
  </dl>
  <p class="verdict ui" class:ok={flat} aria-live="polite">
    {#if flat}Flat enough: the whole strip lies within the depth of focus, with insulator still covering every wire.
    {:else if exposed}Polished too far: the insulator over some wires is gone.
    {:else if removed === 0}Unpolished, the surface keeps every step of the wires below it.
    {:else}Not yet: {range > DOF && Math.abs(range - heightRange(profile, 1000)) < 1 ? 'the local steps are gone, but regions with fewer wires polished lower than dense ones. More polishing will not change that.' : 'some steps remain.'}{/if}
    {#if mounted && progress.isSolved('deposit/cmp-flat') && !flat} (Solved before ✓){/if}
  </p>
</Widget>

<style>
  .xs {
    width: 100%;
    height: clamp(10rem, 28vw, 15rem);
    display: block;
  }
  .xs :global(*) {
    vector-effect: non-scaling-stroke;
  }
  .regions {
    display: grid;
    gap: 0.3rem;
    margin-bottom: 0.3rem;
    font-size: 0.78rem;
    text-align: center;
    line-height: 1.25;
  }
  .regions span {
    display: block;
    color: var(--ink-3);
    font-size: 0.72rem;
  }
  .div {
    stroke: var(--line);
    stroke-dasharray: 3 4;
  }
  .under {
    fill: var(--m-oxide);
    opacity: 0.6;
  }
  .ins {
    fill: var(--m-oxide);
    stroke: none;
  }
  .wire {
    fill: var(--m-metal);
  }
  .wire.dummy {
    fill: var(--m-metal);
    opacity: 0.45;
  }
  .band {
    fill: var(--ok);
    opacity: 0.12;
  }
  .surf {
    fill: none;
    stroke: var(--ok);
    stroke-width: 2.5;
  }
  .surf.out {
    stroke: var(--bad);
  }
  .key {
    font-size: 0.76rem;
    color: var(--ink-3);
    margin: 0.4rem 0 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem 0.5rem;
  }
  .sw {
    display: inline-block;
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 2px;
    vertical-align: -0.1rem;
    margin-right: 0.25rem;
  }
  .sw.wire {
    background: var(--m-metal);
  }
  .sw.dummy {
    background: var(--m-metal);
    opacity: 0.45;
  }
  .sw.ins {
    background: var(--m-oxide);
    border: 1px solid var(--m-oxide-edge);
  }
  .sw.out {
    background: var(--bad);
  }
  .sw.band {
    background: var(--ok);
    opacity: 0.3;
  }
  .nums {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(11rem, 1fr));
    gap: 0.4rem 1rem;
    margin: 0.6rem 0 0;
    font-size: 0.82rem;
  }
  .nums dt {
    color: var(--ink-3);
  }
  .nums dd {
    margin: 0;
    font-family: var(--font-mono);
    font-weight: 600;
  }
  .nums dd.bad {
    color: var(--bad);
  }
  .verdict {
    font-size: 0.86rem;
    margin: 0.6rem 0 0;
  }
  .verdict.ok {
    color: var(--ok);
    font-weight: 600;
  }
</style>
