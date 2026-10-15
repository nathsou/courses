<!--
  The uncanny valley of server rendering. A small cost model of the page load: the same app, rendered on the client
  only, or rendered on the server and then hydrated. The constants are plausible round numbers, not measurements:
  the shape of the result is the lesson, not the milliseconds.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';

  let { n, title = 'Visible is not interactive', caption }: { n?: string | number; title?: string; caption?: string } = $props();

  const DEVICES: Record<string, { label: string; mbps: number; rtt: number; cpu: number }> = {
    laptop: { label: 'Laptop, fibre', mbps: 100, rtt: 20, cpu: 1 },
    phone: { label: 'Phone, 4G', mbps: 12, rtt: 70, cpu: 4 },
    slow: { label: 'Cheap phone, 3G', mbps: 1.6, rtt: 300, cpu: 6 },
  };
  let device = $state('phone');
  let js = $state(300); // KB, compressed
  let nodes = $state(3000);

  const d = $derived(DEVICES[device]!);
  const download = (kb: number) => (kb * 8) / d.mbps; // ms
  const htmlKB = $derived(nodes * 0.03);
  const execMs = $derived(js * 1.0 * d.cpu); // parse, compile, run the framework and app code
  const renderMs = $derived(nodes * 0.02 * d.cpu); // build the DOM from scratch
  const hydrateMs = $derived(nodes * 0.016 * d.cpu); // run the components again, walk the DOM, claim nodes, attach listeners

  interface Seg { label: string; ms: number; cls: string }
  const csr = $derived.by(() => {
    const segs: Seg[] = [
      { label: 'HTML shell', ms: d.rtt + download(2), cls: 'net' },
      { label: 'JavaScript download', ms: d.rtt + download(js), cls: 'net' },
      { label: 'JavaScript runs', ms: execMs, cls: 'cpu' },
      { label: 'Render', ms: renderMs, cls: 'cpu' },
    ];
    return { segs, paint: segs.reduce((a, s) => a + s.ms, 0), interactive: segs.reduce((a, s) => a + s.ms, 0) };
  });
  const ssr = $derived.by(() => {
    const htmlDone = d.rtt + download(htmlKB);
    const segs: Seg[] = [
      { label: 'HTML (with content)', ms: htmlDone, cls: 'net' },
      { label: 'JavaScript download', ms: d.rtt + download(js), cls: 'net' },
      { label: 'JavaScript runs', ms: execMs, cls: 'cpu' },
      { label: 'Hydrate', ms: hydrateMs, cls: 'cpu hyd' },
    ];
    return { segs, paint: htmlDone, interactive: segs.reduce((a, s) => a + s.ms, 0) };
  });
  const span = $derived(Math.max(csr.interactive, ssr.interactive) * 1.05);
  const pct = (ms: number) => `${(ms / span) * 100}%`;
  const fmt = (ms: number) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms)} ms`);
</script>

<Widget {title} {n} {caption} kind="Simulation" subtitle="A cost model of a page load, with plausible round numbers. Move the sliders and watch the gap between the two moments.">
  {#snippet controls()}
    <Segmented label="Device and network" bind:value={device} options={Object.entries(DEVICES).map(([value, p]) => ({ value, label: p.label }))} />
    <Slider label="JavaScript (KB, compressed)" bind:value={js} min={50} max={1200} step={10} format={(v) => v.toFixed(0)} />
    <Slider label="DOM nodes on the page" bind:value={nodes} min={200} max={12000} step={100} format={(v) => v.toFixed(0)} />
  {/snippet}

  {#each [{ name: 'Client rendering only', r: csr, ssr: false }, { name: 'Server rendering + hydration', r: ssr, ssr: true }] as row (row.name)}
    <div class="row">
      <div class="name ui">{row.name}</div>
      <div class="bar" role="img" aria-label="{row.name}: content visible at {fmt(row.r.paint)}, interactive at {fmt(row.r.interactive)}">
        {#each row.r.segs as s (s.label)}<span class="seg {s.cls}" style:width={pct(s.ms)} title="{s.label}: {fmt(s.ms)}"></span>{/each}
        {#if row.ssr && row.r.interactive > row.r.paint}
          <span class="valley" style:left={pct(row.r.paint)} style:width={pct(row.r.interactive - row.r.paint)}></span>
        {/if}
        {#if row.r.interactive - row.r.paint < 1}
          <span class="mark int" style:left={pct(row.r.interactive)}><i>visible and interactive {fmt(row.r.interactive)}</i></span>
        {:else}
          <span class="mark paint" style:left={pct(row.r.paint)}><i>visible {fmt(row.r.paint)}</i></span>
          <span class="mark int" style:left={pct(row.r.interactive)}><i>interactive {fmt(row.r.interactive)}</i></span>
        {/if}
      </div>
    </div>
  {/each}

  <ul class="legend ui">
    <li><span class="sw net"></span>network</li>
    <li><span class="sw cpu"></span>JavaScript running</li>
    <li><span class="sw hyd"></span>hydration</li>
    <li><span class="sw valley"></span>looks ready, is not</li>
  </ul>

  <p class="out ui" aria-live="polite">
    With server rendering the content is visible <b>{fmt(csr.paint - ssr.paint)} sooner</b>, but for <b>{fmt(ssr.interactive - ssr.paint)}</b> after that the page ignores taps. Interactivity itself arrives {ssr.interactive > csr.interactive ? `${fmt(ssr.interactive - csr.interactive)} later` : `${fmt(csr.interactive - ssr.interactive)} sooner`} than with client rendering alone: the JavaScript is the same, and hydration is about as much work as rendering it again.
  </p>
</Widget>

<style>
  .row {
    margin-bottom: 1.6rem;
  }
  .name {
    font-size: 0.82rem;
    font-weight: 600;
    margin-bottom: 0.2rem;
  }
  .bar {
    position: relative;
    height: 1.5rem;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--panel);
    display: flex;
    overflow: visible;
  }
  .seg {
    height: 100%;
    min-width: 1px;
  }
  .seg:first-child { border-radius: 5px 0 0 5px; }
  .net { background: var(--computed); opacity: 0.75; }
  .cpu { background: var(--effect); opacity: 0.85; }
  .cpu.hyd { background: var(--flash); }
  .valley {
    position: absolute;
    top: 0;
    height: 100%;
    background: repeating-linear-gradient(135deg, transparent 0 4px, color-mix(in srgb, var(--red) 40%, transparent) 4px 6px);
    pointer-events: none;
  }
  .mark {
    position: absolute;
    top: -4px;
    bottom: -4px;
    width: 0;
    border-left: 2px solid var(--fg);
  }
  .mark.paint { border-color: var(--signal); }
  .mark i {
    position: absolute;
    top: 100%;
    left: 0;
    transform: translateX(-50%);
    margin-top: 2px;
    font-style: normal;
    font-size: 0.7rem;
    white-space: nowrap;
    color: var(--ink-2);
    background: var(--bg);
    padding: 0 0.2rem;
  }
  .mark.int i { transform: translateX(-100%); }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 1rem;
    list-style: none;
    padding: 0;
    margin: 0.4rem 0;
    font-size: 0.76rem;
    color: var(--ink-2);
  }
  .sw {
    display: inline-block;
    width: 0.8rem;
    height: 0.8rem;
    border-radius: 2px;
    margin-right: 0.3rem;
    vertical-align: -2px;
  }
  .sw.hyd {
    background: var(--flash);
  }
  .sw.valley {
    position: static;
    background: repeating-linear-gradient(135deg, transparent 0 2px, color-mix(in srgb, var(--red) 55%, transparent) 2px 3px);
    border: 1px solid var(--red);
  }
  .out {
    font-size: 0.86rem;
    color: var(--ink-2);
    margin: 0.4rem 0 0;
  }
</style>
