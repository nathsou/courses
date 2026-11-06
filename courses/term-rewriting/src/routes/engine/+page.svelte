<script lang="ts">
  import { onMount } from 'svelte';
  import { base } from '$app/paths';
  import { COURSE_TITLE, PARTS } from '$content/outline';
  import { ENGINE_MODULES } from '$lib/code/engine-modules';
  import { engineState } from '$lib/state/engine.svelte';

  onMount(() => engineState.load());
  const chapterOf = (slug: string) => PARTS.flatMap((p) => p.chapters).find((c) => c.slug === slug);
  let openCode = $state<string | null>(null);
  const yours = $derived(ENGINE_MODULES.filter((m) => engineState.isMine(m.id)).length);
</script>

<svelte:head>
  <title>Your engine — {COURSE_TITLE}</title>
  <meta name="description" content="The rewriting engine you have built in the course's exercises, module by module." />
</svelte:head>

<article class="article">
  <header class="head">
    <p class="eyebrow ui">Your engine</p>
    <h1>The engine you are building</h1>
    <p class="summary">
      Every “Build your engine” exercise implements a piece of a rewriting engine. Once your code passes its tests, it is kept here and
      later exercises that import from <code>engine</code> run on it, with the reference implementation filling in whatever you have not
      written yet. Switch a module off to use the reference instead (useful when a later exercise fails and you want to know whose bug it is).
      Everything is stored in this browser only.
    </p>
    <p class="count ui">{yours} of {ENGINE_MODULES.length} modules are yours.</p>
  </header>

  {#if ENGINE_MODULES.length === 0}
    <p>No engine exercises yet.</p>
  {:else}
    <ol class="mods">
      {#each ENGINE_MODULES as m (m.id)}
        {@const ch = chapterOf(m.chapter)}
        {@const passed = m.id in engineState.passed}
        <li class:mine={engineState.isMine(m.id)}>
          <div class="row">
            <div class="what">
              <span class="t">{m.title}</span>
              <span class="ch ui">{#if ch}<a href="{base}/chapters/{m.chapter}/">Chapter {ch.number}: {ch.title}</a>{/if}</span>
              <code class="provides">{m.provides.join(', ')}</code>
            </div>
            <div class="state ui">
              {#if passed}
                <label class="switch"><input type="checkbox" checked={engineState.isMine(m.id)} onchange={(e) => engineState.setMine(m.id, (e.currentTarget as HTMLInputElement).checked)} /> use mine</label>
                <button onclick={() => (openCode = openCode === m.id ? null : m.id)}>{openCode === m.id ? 'Hide' : 'Show'} code</button>
                <button onclick={() => confirm('Forget your code for this module? (Your draft in the chapter is kept.)') && engineState.forget(m.id)}>Forget</button>
              {:else}
                <span class="todo">reference (not written yet)</span>
              {/if}
            </div>
          </div>
          {#if openCode === m.id && passed}<pre class="code"><code>{engineState.passed[m.id]!.code}</code></pre>{/if}
        </li>
      {/each}
    </ol>
  {/if}
</article>

<style>
  .head {
    padding: 2.5rem 0 1rem;
  }
  .eyebrow {
    font-size: 0.78rem;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: var(--accent);
    font-weight: 700;
    margin: 0;
  }
  h1 {
    font-family: var(--font-display);
    margin: 0.3rem 0 0.6rem;
  }
  .summary {
    color: var(--ink-2);
  }
  .count {
    font-size: 0.9rem;
    color: var(--mute);
  }
  .mods {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .mods li {
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    padding: 0.6rem 0.8rem;
    background: var(--surface);
  }
  .mods li.mine {
    border-color: var(--nf);
    background: var(--nf-soft);
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    justify-content: space-between;
    align-items: center;
  }
  .what {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }
  .t {
    font-weight: 600;
  }
  .ch {
    font-size: 0.78rem;
  }
  .provides {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--ink-3);
    overflow-wrap: anywhere;
  }
  .state {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    font-size: 0.8rem;
    flex-wrap: wrap;
  }
  .state button {
    font: inherit;
    border: 1px solid var(--line-strong);
    background: var(--page);
    color: var(--ink);
    border-radius: var(--radius-sm);
    padding: 0.2rem 0.55rem;
    cursor: pointer;
  }
  .todo {
    color: var(--mute);
  }
  .code {
    margin: 0.6rem 0 0;
    padding: 0.6rem;
    background: var(--pn);
    font-family: var(--font-mono);
    font-size: 0.78rem;
    overflow-x: auto;
    border-radius: var(--radius-sm);
  }
</style>
