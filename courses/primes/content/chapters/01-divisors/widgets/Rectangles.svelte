<!--
  Arrange n counters into rectangles. Every way to write n = a × b (a ≤ b) is a rectangle with a rows;
  a prime has only the single row 1 × n.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';

  let n = $state(12);

  const shapes = $derived.by(() => {
    const out: [number, number][] = [];
    for (let a = 1; a * a <= n; a++) if (n % a === 0) out.push([a, n / a]);
    return out;
  });
  const verdict = $derived(n === 1 ? 'one' : shapes.length === 1 ? 'prime' : 'composite');
  const dot = $derived(n > 36 ? 7 : n > 20 ? 9 : 11);
</script>

<Widget title="Numbers as rectangles" subtitle="Lay out n counters in a rectangle with whole rows. Which numbers allow only a single row?" onreset={() => (n = 12)}>
  {#snippet controls()}
    <Slider label="n" bind:value={n} min={1} max={48} step={1} format={(v) => String(v)} />
  {/snippet}
  <div class="shapes">
    {#each shapes as [a, b] (a)}
      <figure>
        <svg width={b * dot + 4} height={a * dot + 4} viewBox="0 0 {b * dot + 4} {a * dot + 4}" aria-hidden="true">
          {#each Array.from({ length: a }) as _, r (r)}
            {#each Array.from({ length: b }) as _, c (c)}
              <circle cx={2 + dot / 2 + c * dot} cy={2 + dot / 2 + r * dot} r={dot * 0.36} class:prime={verdict === 'prime'} />
            {/each}
          {/each}
        </svg>
        <figcaption>{a} × {b}</figcaption>
      </figure>
    {/each}
  </div>
  <p class="verdict" aria-live="polite">
    {#if verdict === 'one'}
      <strong>1</strong> is a single counter: one row, one column. It is neither prime nor composite.
    {:else if verdict === 'prime'}
      <strong>{n}</strong> can only be laid out as a single row, 1 × {n}. It is <strong class="p">prime</strong>.
    {:else}
      <strong>{n}</strong> fits {shapes.length} rectangles, so it is <strong>composite</strong>: {n} = {shapes[1]![0]} × {shapes[1]![1]}.
    {/if}
  </p>
</Widget>

<style>
  .shapes {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem 1.5rem;
    align-items: flex-end;
    min-height: 4rem;
    overflow-x: auto;
  }
  figure {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.3rem;
  }
  svg {
    display: block;
    max-width: 100%;
  }
  circle {
    fill: var(--fx-blue);
  }
  circle.prime {
    fill: var(--prime);
  }
  figcaption {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--mute);
  }
  .verdict {
    margin: 0.9rem 0 0;
  }
  .p {
    color: var(--accent);
  }
</style>
