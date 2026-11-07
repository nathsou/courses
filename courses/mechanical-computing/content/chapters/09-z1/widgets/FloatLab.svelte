<!-- A Z1-style binary floating-point word: type a number, see its sign, exponent and mantissa bits. -->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { decode, encode, exponentBits, FRACTION_BITS } from '$lib/mech/z1';

  let text = $state('3.25');
  const x = $derived(Number(text.replace(',', '.').replace('−', '-')));
  const f = $derived(Number.isFinite(x) && x !== 0 ? encode(x) : null);
  const back = $derived(f ? decode(f) : null);
</script>

<Widget title="A floating-point word" subtitle="A sign bit, a 7-bit exponent (two’s complement) and a 16-bit fraction whose leading 1 is not stored: value = ± 1.fraction × 2^exponent.">
  {#snippet controls()}
    <label>Number <input bind:value={text} inputmode="decimal" aria-label="Number to encode" /></label>
  {/snippet}
  {#if f}
    <div class="word ui" aria-label="The bits of the word">
      <span class="field s"><span class="b">{f.sign}</span><span class="k">sign</span></span>
      <span class="field e">{#each exponentBits(f.exponent) as b, i (i)}<span class="b">{b}</span>{/each}<span class="k">exponent = {f.exponent}</span></span>
      <span class="field m"><span class="b hidden" title="not stored">1.</span>{#each f.fraction as b, i (i)}<span class="b">{b}</span>{/each}<span class="k">fraction ({FRACTION_BITS} bits)</span></span>
    </div>
    <p class="ui ro">Stored value: <strong class="num">{back}</strong>{#if back !== x} (rounded: the error is {Math.abs((back! - x) / x).toExponential(1)} of the number){/if}</p>
  {:else}
    <p class="ui ro">Type a non-zero number between about 10⁻¹⁹ and 10¹⁹.</p>
  {/if}
</Widget>

<style>
  label {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.86rem;
  }
  input {
    font: inherit;
    font-family: var(--font-mono);
    width: 9rem;
    padding: 0.25rem 0.4rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--page);
    color: var(--ink);
  }
  .word {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    font-family: var(--font-mono);
  }
  .field {
    display: inline-flex;
    flex-wrap: wrap;
    position: relative;
    padding-bottom: 1.1rem;
    gap: 1px;
  }
  .b {
    display: inline-grid;
    place-items: center;
    width: 1.25rem;
    height: 1.6rem;
    border: 1px solid var(--line-strong);
    background: var(--page);
    font-size: 0.86rem;
  }
  .s .b {
    background: var(--brass-soft);
  }
  .e .b {
    background: var(--accent-soft);
  }
  .hidden {
    border-style: dashed;
    color: var(--ink-3);
    width: 1.6rem;
  }
  .k {
    position: absolute;
    left: 0;
    bottom: 0;
    font-size: 0.68rem;
    color: var(--ink-3);
    white-space: nowrap;
  }
  .ro {
    font-size: 0.86rem;
    margin: 0.3rem 0 0;
  }
</style>
