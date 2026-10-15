<!--
  Prime races. For q = 4: π(x; 4, 3) − π(x; 4, 1); for q = 3: π(x; 3, 2) − π(x; 3, 1); for q = 8: the non-residue
  classes against 1. Plotted in units of √x/log x, where the bias predicted by the squares is +1 (for q = 4 and 3).
  Red stretches: x where the usual leader is behind.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Toggle from '$lib/components/ui/Toggle.svelte';
  import Plot from '$lib/charts/Plot.svelte';
  import { sieve } from '$lib/primes/sieve';

  const N = 10_000_000;
  const flags = sieve(N);
  let race = $state<'4' | '3'>('4');
  let normalise = $state(true);
  let range = $state<'all' | 'first'>('all');

  const data = $derived.by(() => {
    const q = race === '4' ? 4 : 3;
    const lead = q === 4 ? 3 : 2;
    const trail = 1;
    let a = 0;
    let b = 0;
    const pts: [number, number][] = [];
    const behind: [number, number][] = [];
    let start: number | null = null;
    let next = 10;
    let lastSign = 1;
    for (let n = 2; n <= N; n++) {
      if (flags[n]) {
        if (n % q === lead) a++;
        else if (n % q === trail) b++;
        const s = a - b;
        if (s < 0 && start === null) start = n;
        if (s >= 0 && start !== null) {
          behind.push([start, n]);
          start = null;
        }
        // Sample densely around sign changes and log-spaced otherwise.
        if (n >= next || (s < 0) !== (lastSign < 0)) {
          pts.push([n, s]);
          next = Math.ceil(n * 1.004);
        }
        lastSign = s;
      }
    }
    return { pts, behind, q, lead, trail };
  });
  const xMin = $derived(range === 'first' ? 26_000 : 10);
  const xMax = $derived(range === 'first' ? 700_000 : N);
  const y = (x: number, s: number) => (normalise ? (s * Math.log(x)) / Math.sqrt(x) : s);
  const shown = $derived(data.pts.filter(([x]) => x >= xMin && x <= xMax).map(([x, s]) => [x, y(x, s)] as [number, number]));
  const yLim = $derived(Math.max(...shown.map((p) => Math.abs(p[1])), 1) * 1.1);
  const changes = $derived(data.behind.length);
</script>

<Widget title="Prime races" subtitle="The difference between the number of primes in two residue classes up to x. Primes that are not squares modulo q (3 mod 4, 2 mod 3) almost always lead. Red: where they are behind." onreset={() => ((race = '4'), (normalise = true), (range = 'all'))}>
  {#snippet controls()}
    <Segmented label="Race" bind:value={race} options={[{ value: '4', label: '3 vs 1 mod 4' }, { value: '3', label: '2 vs 1 mod 3' }]} size="sm" />
    {#if race === '4'}<Segmented label="Range" bind:value={range} options={[{ value: 'all', label: 'up to 10⁷' }, { value: 'first', label: 'near the first reversals' }]} size="sm" />{/if}
    <Toggle bind:checked={normalise} label="divide by √x/log x" />
  {/snippet}
  <Plot x={{ domain: [xMin, xMax], type: range === 'first' && race === '4' ? 'linear' : 'log', label: 'x' }} y={{ domain: [-yLim, yLim], label: normalise ? 'difference ÷ (√x/log x)' : 'difference' }} height={260} label="Prime race modulo {data.q}.">
    {#snippet marks({ sx, sy })}
      {#each data.behind.filter(([a, b]) => b >= xMin && a <= xMax) as [a, b] (a)}
        <rect x={sx(Math.max(a, xMin))} y={sy(yLim)} width={Math.max(1.5, sx(Math.min(b, xMax)) - sx(Math.max(a, xMin)))} height={sy(-yLim) - sy(yLim)} class="behind" />
      {/each}
      <line class="zero" x1={sx(xMin)} x2={sx(xMax)} y1={sy(0)} y2={sy(0)} />
      {#if normalise}<line class="bias" x1={sx(xMin)} x2={sx(xMax)} y1={sy(1)} y2={sy(1)} />{/if}
      <path class="race" d={'M' + shown.map(([a, b]) => `${sx(a).toFixed(1)},${sy(b).toFixed(1)}`).join('L')} />
    {/snippet}
  </Plot>
  <p class="out" aria-live="polite">
    {#if race === '4'}
      Up to 10⁷ the class 1 mod 4 is ahead on {changes} separate stretches; the first begins at x = 26,861 (Leech, 1957). The dashed line is the predicted bias +1.
    {:else}
      Up to 10⁷ the class 2 mod 3 is never behind. The first reversal is at x = 608,981,813,029 (Bays and Hudson, 1978).
    {/if}
  </p>
</Widget>

<style>
  .behind {
    fill: color-mix(in srgb, var(--prime) 22%, transparent);
  }
  .zero {
    stroke: var(--fg);
  }
  .bias {
    stroke: var(--fg);
    stroke-dasharray: 4 3;
  }
  .race {
    fill: none;
    stroke: var(--fx-blue);
    stroke-width: 1.2;
  }
  .out {
    margin: 0.4rem 0 0;
    font-size: 0.86rem;
  }
</style>
