<script lang="ts">
  /**
   * How one character is built: 饭 = 饣 food (meaning) + 反 fǎn (sound); or, for pictures and
   * ideas, the parts and the story behind them.
   */
  import { build } from '$lib/zh/components';

  let { ch, head = true, compact = false }: { ch: string; head?: boolean; compact?: boolean } = $props();
  /** In compact lists, "food (side form of 食)" becomes "food". */
  const short = (g: string) => (compact ? g.replace(/\s*\([^)]*\)/g, '') : g);
  const b = $derived(build(ch));
  /** The origin line, with any Chinese in the font for Chinese. */
  const hint = $derived(b?.hint ? b.hint.split(/(\p{Script=Han}+)/u) : []);
  const label = (role: string | null) => (role === 'meaning' ? 'meaning' : role === 'sound' ? 'sound' : '');
</script>

{#if b}
  <span class="build">
    {#if head}<span class="zh-font ch" lang="zh-CN">{ch}</span><span class="eq">{b.parts.length ? '=' : ':'}</span>{/if}
    {#each b.parts as p, i (i)}
      {#if i > 0}<span class="plus">+</span>{/if}
      <span class="part" class:sound={p.role === 'sound'} class:meaning={p.role === 'meaning'}>
        <span class="zh-font" lang="zh-CN">{p.ch}</span>
        {#if p.role === 'sound'}<span class="py">{p.py}</span>{:else}<span class="g">{short(p.gloss)}</span>{/if}
        {#if p.role}<span class="role">{label(p.role)}</span>{/if}
      </span>
    {/each}
    {#if hint.length}
      <span class="hint" class:own={b.parts.length > 0}>{#if b.kind === 'pictographic' && !b.parts.length}{'A picture: '}{/if}{#each hint as bit, i (i)}{#if i % 2}<span class="zh-font" lang="zh-CN">{bit}</span>{:else}{bit}{/if}{/each}</span>
    {/if}
  </span>
{/if}

<style>
  .build {
    display: inline-flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.15rem 0.35rem;
    line-height: 1.5;
  }
  .ch {
    font-size: 1.15em;
  }
  .eq,
  .plus {
    color: var(--mute);
  }
  .part {
    display: inline-flex;
    align-items: baseline;
    gap: 0.25rem;
  }
  .part .zh-font {
    font-size: 1.1em;
  }
  .py {
    font-family: var(--font-py);
  }
  .g {
    color: var(--ink-2);
  }
  .role {
    font-size: 0.72em;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0 0.3em;
    border-radius: 4px;
    background: var(--pn);
    color: var(--mute);
  }
  .meaning .role {
    background: var(--accent-soft);
    color: var(--accent-ink);
  }
  .hint.own {
    flex-basis: 100%;
  }
  .hint {
    color: var(--ink-2);
    font-style: italic;
  }
</style>
