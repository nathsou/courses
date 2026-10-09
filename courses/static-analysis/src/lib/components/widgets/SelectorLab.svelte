<!--
  Type an ESLint selector and see which nodes it matches, in the order a rule's listener would be called. The
  matching is done by the real ESLint (its esquery engine), on a tree from typescript-eslint.
  `:::selector-lab{selector="CallExpression"}` with a code block.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import CodeEditor, { type EditorMark } from '$lib/editor/CodeEditor.svelte';
  import { selectRemote } from '$lib/sa/runtime/client';
  import type { SelectResult } from '$lib/sa/runtime/select';

  let { code, selector: initialSelector = 'CallExpression', presets = '', n, caption, title = 'Selector lab' }: { code: string; selector?: string; presets?: string; n?: string; caption?: string; title?: string } = $props();

  // svelte-ignore state_referenced_locally
  let source = $state(code);
  // svelte-ignore state_referenced_locally
  let selector = $state(initialSelector);
  let result = $state<SelectResult | null>(null);
  let active = $state<number | null>(null);
  let editor = $state<CodeEditor | undefined>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let token = 0;

  $effect(() => {
    const s = selector;
    const c = source;
    clearTimeout(timer);
    timer = setTimeout(async () => {
      const mine = ++token;
      try {
        const r = await selectRemote(c, s);
        if (mine === token) result = r;
      } catch (e) {
        if (mine === token) result = { matches: [], error: e instanceof Error ? e.message : String(e) };
      }
    }, 250);
    return () => clearTimeout(timer);
  });

  const marks = $derived<EditorMark[]>((result?.matches ?? []).map((m, i) => ({ from: m.range[0], to: m.range[1], kind: i === active ? 'ok' : 'info', message: `${i + 1}. ${m.type}` })));
  const presetList = $derived(presets ? presets.split('|').map((p) => p.trim()).filter(Boolean) : []);
  const label = (m: SelectResult['matches'][number]) => {
    const t = source.slice(m.range[0], m.range[1]).replace(/\s+/g, ' ');
    return t.length > 48 ? `${t.slice(0, 47)}…` : t;
  };
</script>

<Widget {title} subtitle="The nodes a listener keyed by this selector is called on, in order." {n} {caption} onreset={() => { selector = initialSelector; editor?.setValue(code); }}>
  <div class="lab ui">
    <label class="sel">
      <span>Selector</span>
      <input type="text" bind:value={selector} spellcheck="false" autocomplete="off" aria-describedby="sel-status" />
    </label>
    {#if presetList.length}
      <div class="presets" role="group" aria-label="Example selectors">
        {#each presetList as p (p)}<button class:on={p === selector} onclick={() => (selector = p)}><code>{p}</code></button>{/each}
      </div>
    {/if}
    <div class="cols">
      <CodeEditor bind:this={editor} value={source} {marks} minLines={6} label="Code" onchange={(c) => (source = c)} />
      <div class="out" id="sel-status" aria-live="polite">
        {#if result?.error}
          <p class="err">{result.error}</p>
        {:else if result}
          <p class="count">{result.matches.length} match{result.matches.length === 1 ? '' : 'es'}</p>
          <ol>
            {#each result.matches as m, i (i)}
              <li><button class:on={active === i} onclick={() => { active = i; editor?.reveal(m.range[0], m.range[1]); }}><span class="t">{m.type}</span> <code>{label(m)}</code></button></li>
            {/each}
          </ol>
        {:else}
          <p class="count">Loading the parser…</p>
        {/if}
      </div>
    </div>
  </div>
</Widget>

<style>
  .sel {
    display: flex;
    gap: 0.6rem;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  .sel span {
    font-weight: 700;
    font-size: 0.85rem;
  }
  .sel input {
    flex: 1;
    min-width: 0;
    font-family: var(--font-mono);
    font-size: 0.9rem;
    padding: 0.35rem 0.55rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--panel);
    color: var(--fg);
  }
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-bottom: 0.6rem;
  }
  .presets button {
    border: 1px solid var(--line);
    background: var(--pn);
    border-radius: 3px;
    padding: 0.05rem 0.4rem;
    cursor: pointer;
    font-size: 0.78rem;
  }
  .presets button.on {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .presets code {
    background: none;
    padding: 0;
  }
  .cols {
    display: grid;
    grid-template-columns: minmax(0, 1.3fr) minmax(0, 1fr);
    gap: 0.7rem;
  }
  @media (max-width: 720px) {
    .cols {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .out {
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--panel);
    padding: 0.4rem 0.6rem;
    max-height: 20rem;
    overflow: auto;
    font-size: 0.82rem;
  }
  .count {
    margin: 0 0 0.3rem;
    color: var(--mute);
  }
  .err {
    color: var(--bad);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    white-space: pre-wrap;
  }
  ol {
    margin: 0;
    padding-left: 1.4rem;
  }
  ol button {
    border: 0;
    background: none;
    cursor: pointer;
    text-align: left;
    padding: 0.05rem 0.2rem;
    border-radius: 3px;
    font-size: 0.8rem;
  }
  ol button.on {
    background: var(--ok-soft);
  }
  .t {
    color: var(--code-type);
    font-weight: 700;
    font-family: var(--font-mono);
    font-size: 0.75rem;
  }
  ol code {
    background: none;
    padding: 0;
    font-size: 0.76rem;
  }
</style>
