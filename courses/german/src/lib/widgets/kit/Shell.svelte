<script lang="ts">
  /**
   * The frame shared by the grammar widgets: a small uppercase label like the exercise frames,
   * optional tabs (Explore / Table / Quiz…), and the body.
   */
  import type { Snippet } from 'svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  let {
    label,
    icon = 'sparkle',
    title,
    tabs = [],
    tab = $bindable(0),
    children,
  }: { label: string; icon?: string; title?: string; tabs?: string[]; tab?: number; children: Snippet } = $props();

  const uid = $props.id();

  function key(e: KeyboardEvent) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    e.preventDefault();
    tab = (tab + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length;
    (document.getElementById(`${uid}-t${tab}`) as HTMLElement | null)?.focus();
  }
</script>

<figure class="widget card" aria-label={title ? `${label}: ${title}` : label}>
  <header class="ui">
    <span class="kind"><Icon name={icon} size={15} />{label}</span>
    {#if title}<span class="title">{title}</span>{/if}
    {#if tabs.length}
      <!-- svelte-ignore a11y_interactive_supports_focus -->
      <div class="tabs" role="tablist" aria-label="{label} views" onkeydown={key}>
        {#each tabs as t, i (t)}
          <button id="{uid}-t{i}" role="tab" type="button" aria-selected={tab === i} aria-controls="{uid}-panel" tabindex={tab === i ? 0 : -1} class:on={tab === i} onclick={() => (tab = i)}>{t}</button>
        {/each}
      </div>
    {/if}
  </header>
  <div class="body" id="{uid}-panel" role={tabs.length ? 'tabpanel' : undefined}>
    {@render children()}
  </div>
</figure>

<style>
  .widget {
    margin: 1.8rem 0;
    overflow: hidden;
    border-color: var(--line-strong);
    min-width: 0;
  }
  header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.7rem;
    padding: 0.55rem 1.1rem;
    background: var(--pn);
    border-bottom: 1px solid var(--line);
    font-size: 0.82rem;
  }
  .kind {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 700;
    color: var(--accent-ink);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    font-size: 0.72rem;
  }
  .title {
    font-weight: 600;
    color: var(--ink-2);
  }
  .tabs {
    margin-left: auto;
    display: inline-flex;
    flex-wrap: wrap;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    padding: 2px;
    background: var(--panel);
  }
  .tabs button {
    border: none;
    background: none;
    border-radius: 999px;
    padding: 0.22rem 0.75rem;
    font-weight: 600;
    font-size: 0.8rem;
    cursor: pointer;
    color: var(--mute);
  }
  .tabs button.on {
    background: var(--fg);
    color: var(--bg);
  }
  .body {
    padding: 1rem 1.1rem 1.1rem;
  }
  @media (max-width: 420px) {
    header {
      padding: 0.55rem 0.8rem;
    }
    .tabs {
      margin-left: 0;
    }
    .body {
      padding: 0.9rem 0.8rem 1rem;
    }
  }
</style>
