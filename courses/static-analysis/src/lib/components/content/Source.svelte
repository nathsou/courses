<!--
  A reference into SonarJS at the pinned commit. Inline (`:source[label]{path=… symbol=…}`) it is a link chip;
  as a block (`::source{path=… symbol=… note="…"}`) it is a small card. `npm run check:sources` verifies every
  path and symbol against the commit.
-->
<script lang="ts">
  import { SONARJS_COMMIT, SONARJS_SHORT } from '$content/outline';

  let { path, symbol, line, note, title, inline = false, children }: { path: string; symbol?: string; line?: number; note?: string; title?: string; inline?: boolean; children?: import('svelte').Snippet } = $props();

  const href = $derived(`https://github.com/SonarSource/SonarJS/blob/${SONARJS_COMMIT}/${path}${line ? `#L${line}` : ''}`);
  const file = $derived(path.split('/').slice(-2).join('/'));
</script>

{#if inline}
  <a class="src-inline" {href} target="_blank" rel="noopener" title="SonarJS at {SONARJS_SHORT}: {path}{symbol ? ` (${symbol})` : ''}">{#if children}{@render children()}{:else}<code>{symbol ?? file}</code>{/if}<span class="arrow" aria-hidden="true">↗</span></a>
{:else}
  <aside class="src-card ui">
    <span class="badge">SonarJS · {SONARJS_SHORT}</span>
    <a {href} target="_blank" rel="noopener"><code>{path}</code></a>{#if symbol}<span class="sym">→ <code>{symbol}</code></span>{/if}
    {#if title || note}<p class="note">{#if title}<strong>{title}.</strong> {/if}{note ?? ''}</p>{/if}
    {#if children}<div class="body">{@render children()}</div>{/if}
  </aside>
{/if}

<style>
  .src-inline {
    text-decoration: none;
    border-bottom: 1px dotted var(--accent);
    white-space: nowrap;
  }
  .src-inline code {
    font-size: 0.86em;
  }
  .arrow {
    font-size: 0.75em;
    margin-left: 0.1em;
    color: var(--accent);
  }
  .src-card {
    margin: 1.2rem 0;
    padding: 0.55rem 0.85rem;
    border: 1px solid var(--line);
    border-left: 3px solid var(--accent);
    border-radius: var(--radius-sm);
    background: var(--surface);
    font-size: 0.86rem;
    overflow-wrap: anywhere;
  }
  .badge {
    display: inline-block;
    font-family: var(--font-mono);
    font-size: 0.66rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    font-weight: 700;
    color: var(--accent-ink);
    margin-right: 0.5rem;
  }
  .sym {
    margin-left: 0.4rem;
    color: var(--mute);
  }
  .note {
    margin: 0.3rem 0 0;
    color: var(--ink-2);
  }
  .body :global(p) {
    margin: 0.4rem 0 0;
  }
</style>
