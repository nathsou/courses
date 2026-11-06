<!-- Ripple carry against Babbage's anticipating carriage, on two numbers you choose. -->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { carries, digitsOf } from '$lib/mech/carry';

  let a = $state('49999987');
  let b = $state('50000013');
  const N = 10;
  const clean = (s: string) => (/^\d{1,10}$/.test(s.trim()) ? BigInt(s.trim()) : 0n);
  const t = $derived(carries(digitsOf(clean(a), N), digitsOf(clean(b), N)));
  const rev = <T,>(x: T[]) => [...x].reverse();
  const presets: [string, string][] = [['49999987', '50000013'], ['99999999', '1'], ['12345678', '11111111'], ['45454545', '54545455']];
</script>

<Widget title="Ripple against anticipation" subtitle="Add two numbers digit by digit. Then compare: a ripple makes the carries one place at a time; the anticipating carriage finds every carry at once from the warnings and the 9s.">
  {#snippet controls()}
    <label>a <input bind:value={a} inputmode="numeric" size="10" aria-label="First number" /></label>
    <label>b <input bind:value={b} inputmode="numeric" size="10" aria-label="Second number" /></label>
    <span class="presets">{#each presets as [x, y] (x + y)}<button onclick={() => { a = x; b = y; }}>{x} + {y}</button>{/each}</span>
  {/snippet}
  <div class="scroll">
    <table class="ui">
      <tbody>
        <tr><th>a</th>{#each rev(digitsOf(clean(a), N)) as d, i (i)}<td>{d}</td>{/each}</tr>
        <tr><th>b</th>{#each rev(digitsOf(clean(b), N)) as d, i (i)}<td>{d}</td>{/each}</tr>
        <tr class="sep"><th>digits added</th>{#each rev(t.added) as d, i (i)}<td>{d}</td>{/each}</tr>
        <tr><th>warning (made a carry)</th>{#each rev(t.warnings) as w, i (i)}<td class="flag">{w ? '▲' : ''}</td>{/each}</tr>
        <tr><th>shows 9 (passes one on)</th>{#each rev(t.nines) as w, i (i)}<td class="nine">{w ? '9' : ''}</td>{/each}</tr>
        <tr><th>receives a carry</th>{#each rev(t.receives) as w, i (i)}<td class="rec">{w ? '+1' : ''}</td>{/each}</tr>
        <tr class="sep res"><th>sum</th>{#each rev(t.result) as d, i (i)}<td>{d}</td>{/each}</tr>
      </tbody>
    </table>
  </div>
  <div class="compare">
    <div><span class="k">Ripple</span><strong>{t.rippleSteps}</strong> carry {t.rippleSteps === 1 ? 'step' : 'steps'} after the addition: one per place in the longest chain.</div>
    <div><span class="k">Anticipating carriage</span><strong>{t.warnings.some(Boolean) ? 1 : 0}</strong> carry step, whatever the numbers: a place gets +1 if, below it, a warning is followed by nothing but 9s.</div>
  </div>
</Widget>

<style>
  label {
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
    font-size: 0.86rem;
  }
  input {
    font: inherit;
    font-family: var(--font-mono);
    padding: 0.25rem 0.4rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--page);
    color: var(--ink);
    width: 8.5rem;
  }
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .presets button {
    font-family: var(--font-mono);
    font-size: 0.74rem;
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.2rem 0.45rem;
    cursor: pointer;
    color: var(--ink);
    min-height: 1.8rem;
  }
  .scroll {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    font-size: 0.84rem;
  }
  th {
    text-align: left;
    font-weight: 500;
    color: var(--ink-3);
    padding: 0.15rem 0.7rem 0.15rem 0;
    white-space: nowrap;
    font-size: 0.76rem;
  }
  td {
    width: 1.7rem;
    min-width: 1.7rem;
    text-align: center;
    font-family: var(--font-mono);
    padding: 0.15rem 0;
  }
  .sep td,
  .sep th {
    border-top: 1px solid var(--line-strong);
  }
  .res td {
    font-weight: 700;
    font-size: 1rem;
  }
  .flag {
    color: var(--fx-red);
  }
  .nine {
    color: var(--brass);
  }
  .rec {
    color: var(--ok);
    font-weight: 700;
  }
  .compare {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: 0.6rem 1.2rem;
    margin-top: 0.8rem;
    font-size: 0.86rem;
  }
  .k {
    display: block;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--ink-3);
  }
  .compare strong {
    font-family: var(--font-mono);
    font-size: 1.4rem;
    margin-right: 0.3rem;
  }
</style>
