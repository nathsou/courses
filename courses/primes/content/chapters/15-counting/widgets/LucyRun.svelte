<!--
  Count π(x) for x up to 10^13 with the O(x^(3/4)) algorithm of this chapter, timed in your browser, and compare with
  the known values. The table it maintains has only about 2√x entries.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Slider from '$lib/components/ui/Slider.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { primePi, PI_POWERS_OF_TEN } from '$lib/primes/count';

  let logx = $state(9);
  let result = $state<{ x: number; pi: number; ms: number } | null>(null);
  let running = $state(false);

  const x = $derived(Math.round(10 ** logx));
  async function run() {
    running = true;
    await new Promise((r) => setTimeout(r, 20));
    const t = performance.now();
    const pi = primePi(x);
    result = { x, pi, ms: performance.now() - t };
    running = false;
  }
  const known = $derived(result && Number.isInteger(Math.log10(result.x)) ? PI_POWERS_OF_TEN[Math.round(Math.log10(result.x))] : undefined);
  const fmt = (v: number) => v.toLocaleString('en-GB');
</script>

<Widget title="Counting primes without listing them" subtitle="The algorithm keeps one number for each distinct value of ⌊x/n⌋ (about 2√x of them) and updates them prime by prime.">
  {#snippet controls()}
    <Slider label="x = 10^k" bind:value={logx} min={4} max={13} step={0.5} format={(v) => `10^${v}`} oninput={() => (result = null)} />
    <Button variant="primary" onclick={run} disabled={running}>{running ? 'Counting…' : 'Count'}</Button>
  {/snippet}
  {#if result}
    <p class="out">
      π({fmt(result.x)}) = <strong>{fmt(result.pi)}</strong> in {result.ms < 1 ? '<1' : result.ms.toFixed(0)} ms, using a table of about {fmt(Math.round(2 * Math.sqrt(result.x)))} numbers.
      {#if known !== undefined}{known === BigInt(result.pi) ? '✓ matches the published value.' : `✗ published value ${known}`}{/if}
    </p>
    <p class="mute">A sieve would need {fmt(result.x)} bits of memory, and about {fmt(Math.round(result.x * Math.log(Math.log(result.x))))} crossings.</p>
  {:else}
    <p class="hint">Choose x and press <em>Count</em>. 10¹³ takes several seconds.</p>
  {/if}
</Widget>

<style>
  .out {
    margin: 0;
    font-size: 0.9rem;
  }
  .mute,
  .hint {
    color: var(--mute);
    font-size: 0.84rem;
  }
</style>
