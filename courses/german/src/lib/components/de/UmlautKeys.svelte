<script lang="ts">
  /** ä ö ü ß buttons for keyboards without them. Inserts at the cursor of the given input. */
  let { target, oninput }: { target: HTMLInputElement | HTMLTextAreaElement | undefined; oninput?: (value: string) => void } = $props();
  let upper = $state(false);
  const KEYS = ['ä', 'ö', 'ü', 'ß'];

  function insert(ch: string) {
    if (!target) return;
    const c = upper && ch !== 'ß' ? ch.toUpperCase() : ch;
    const start = target.selectionStart ?? target.value.length;
    const end = target.selectionEnd ?? start;
    target.value = target.value.slice(0, start) + c + target.value.slice(end);
    target.setSelectionRange(start + c.length, start + c.length);
    target.focus();
    oninput?.(target.value);
    upper = false;
  }
</script>

<span class="keys ui" role="group" aria-label="German letters">
  {#each KEYS as k (k)}
    <button type="button" tabindex="-1" onpointerdown={(e) => e.preventDefault()} onclick={() => insert(k)}>{upper && k !== 'ß' ? k.toUpperCase() : k}</button>
  {/each}
  <button type="button" tabindex="-1" class="shift" aria-pressed={upper} title="Capital Ä Ö Ü" onpointerdown={(e) => e.preventDefault()} onclick={() => (upper = !upper)}>⇧</button>
</span>

<style>
  .keys {
    display: inline-flex;
    gap: 0.25rem;
    flex-wrap: wrap;
  }
  button {
    min-width: 2rem;
    height: 2rem;
    border-radius: 7px;
    border: 1px solid var(--line-strong);
    border-bottom-width: 2px;
    background: var(--panel);
    color: var(--fg);
    font-size: 0.95rem;
    cursor: pointer;
  }
  button:hover {
    border-color: var(--accent);
  }
  .shift[aria-pressed='true'] {
    background: var(--accent-soft);
    border-color: var(--accent);
  }
</style>
