<!--
  Euclid's algorithm as geometry: cut the largest possible squares from an a × b rectangle, then repeat on the
  leftover strip. The side of the last square is gcd(a, b). Step through the cuts or show them all.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { euclidSteps, gcd } from '$lib/primes/arith';

  let a = $state(42);
  let b = $state(30);
  let shown = $state(99);

  const W = 560;
  const big = $derived(Math.max(a, b));
  const small = $derived(Math.min(a, b));
  const scale = $derived(Math.min(W / big, 300 / small));

  /** Every square cut, in order: position, side, and which step of the algorithm it belongs to. */
  const squares = $derived.by(() => {
    const out: { x: number; y: number; s: number; step: number }[] = [];
    let x = 0;
    let y = 0;
    let w = big; // width of the remaining rectangle
    let h = small; // height
    let step = 0;
    while (w > 0 && h > 0 && out.length < 400) {
      if (w >= h) {
        const k = Math.floor(w / h);
        for (let i = 0; i < k; i++) out.push({ x: x + i * h, y, s: h, step });
        x += k * h;
        w -= k * h;
      } else {
        const k = Math.floor(h / w);
        for (let i = 0; i < k; i++) out.push({ x, y: y + i * w, s: w, step });
        y += k * w;
        h -= k * w;
      }
      step++;
    }
    return out;
  });
  const steps = $derived(euclidSteps(big, small));
  const g = $derived(gcd(a, b));
  const visible = $derived(Math.min(shown, steps.length));
  const HUES = ['var(--series-1)', 'var(--series-2)', 'var(--series-3)', 'var(--series-4)', 'var(--series-5)', 'var(--series-6)', 'var(--series-7)', 'var(--series-8)'];
</script>

<Widget title="Euclid’s algorithm, cut into squares" subtitle="Cut as many b × b squares as fit from the a × b rectangle, then repeat on the strip that is left. The last square tiles everything before it." onreset={() => ((a = 42), (b = 30), (shown = 99))}>
  {#snippet controls()}
    <Slider label="a" bind:value={a} min={1} max={144} step={1} format={(v) => String(v)} oninput={() => (shown = 99)} />
    <Slider label="b" bind:value={b} min={1} max={144} step={1} format={(v) => String(v)} oninput={() => (shown = 99)} />
    <div class="btns">
      <Button size="sm" onclick={() => (shown = 0)}>Start over</Button>
      <Button size="sm" onclick={() => (shown = Math.min(steps.length, (shown >= steps.length ? 0 : shown) + 1))}>Next cut</Button>
    </div>
  {/snippet}
  <div class="wrap">
    <svg viewBox="-2 -2 {big * scale + 4} {small * scale + 4}" style:max-width="{big * scale + 4}px" role="img" aria-label="An {big} by {small} rectangle cut into squares; the smallest square has side {g}.">
      <rect class="outline" x="0" y="0" width={big * scale} height={small * scale} />
      {#each squares as sq, i (i)}
        {#if sq.step < visible}
          <rect class="sq" x={sq.x * scale} y={sq.y * scale} width={sq.s * scale} height={sq.s * scale} style:fill={HUES[sq.step % HUES.length]} />
        {/if}
      {/each}
    </svg>
  </div>
  <ol class="trace">
    {#each steps.slice(0, visible) as st, i (i)}
      <li style:--hue={HUES[i % HUES.length]}><span class="sw"></span>{st.a} = {st.q} × {st.b} + {st.r}{#if st.r === 0}<span class="done"> → gcd = {st.b}</span>{/if}</li>
    {/each}
  </ol>
  {#if visible === 0}<p class="hint">Press <em>Next cut</em> to cut the first squares.</p>{/if}
</Widget>

<style>
  .btns {
    display: flex;
    gap: 0.4rem;
  }
  .wrap {
    overflow-x: auto;
  }
  svg {
    display: block;
    width: 100%;
    height: auto;
  }
  .outline {
    fill: var(--pn);
    stroke: var(--fg);
    stroke-width: 1;
  }
  .sq {
    stroke: var(--surface);
    stroke-width: 1.5;
    opacity: 0.85;
  }
  .trace {
    list-style: none;
    padding: 0;
    margin: 0.75rem 0 0;
    font-family: var(--font-mono);
    font-size: 0.84rem;
    columns: 2 14rem;
  }
  .trace li {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.1rem 0;
  }
  .sw {
    width: 0.7rem;
    height: 0.7rem;
    background: var(--hue);
    opacity: 0.85;
    flex: none;
  }
  .done {
    color: var(--accent);
    font-weight: 600;
  }
  .hint {
    color: var(--mute);
    font-size: 0.85rem;
  }
</style>
