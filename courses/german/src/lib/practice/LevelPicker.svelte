<script lang="ts">
  /** "Words up to A2": which levels a practice game draws from. */
  import { LEVELS, type Level } from '$lib/de/lexicon';
  let { value = $bindable('A1'), label = 'Up to' }: { value?: Level; label?: string } = $props();
</script>

<div class="lp ui" role="radiogroup" aria-label="{label} level">
  <span>{label}</span>
  {#each LEVELS as l (l)}
    <button role="radio" aria-checked={value === l} class:on={value === l} onclick={() => (value = l)}>{l}</button>
  {/each}
</div>

<style>
  .lp {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8rem;
    color: var(--mute);
  }
  button {
    border: 1px solid var(--line-strong);
    background: var(--panel);
    border-radius: 999px;
    padding: 0.15rem 0.6rem;
    font-size: 0.78rem;
    font-weight: 650;
    color: var(--mute);
    cursor: pointer;
  }
  button.on {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
  }
</style>
