<!--
  The engine room (PLAN §5): one system or function under every engine that applies, side by side. Each row is one
  engine with its badge, its time and its statistics; open a badge for the certificate and the TCB meter. The point
  is the badge ladder on a single example: the same question, answered with different strength.

  Usage: :::engine-room{title="…" bound=10} with a ```vouch block inside (its last system, or last function).
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import VouchEditor from './VouchEditor.svelte';
  import Badge from './Badge.svelte';
  import { runEngineRoom } from '$lib/components/induction/client';
  import type { RoomResult } from '$lib/fv/verify/engineroom';

  let { code, title, caption, bound, decl }: { code: string; title?: string; caption?: string; bound?: number; decl?: string } = $props();

  // svelte-ignore state_referenced_locally
  let source = $state(code.replace(/\n$/, ''));
  let engines = $state<string[]>([]);
  let target = $state<{ decl: string; kind: 'system' | 'fn' } | undefined>();
  let results = $state<Record<string, RoomResult>>({});
  let running = $state(false);
  let error = $state('');
  let cancel: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;

  function run() {
    cancel?.();
    running = true;
    error = '';
    results = {};
    cancel = runEngineRoom({ source, decl, timeout: 6000, bound }, (e) => {
      if (e.kind === 'start') {
        engines = e.engines;
        target = { decl: e.decl, kind: e.target };
      } else if (e.kind === 'result') results = { ...results, [e.result.engine]: e.result };
      else if (e.kind === 'error') error = e.message;
      else running = false;
    });
  }
  onMount(() => {
    run();
    return () => cancel?.();
  });

  function changed(src: string) {
    source = src;
    clearTimeout(timer);
    timer = setTimeout(run, 900);
  }

  const fmt = (ms: number) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`);
</script>

<figure class="er">
  {#if title}<h4 class="ui ttl">{title}</h4>{/if}
  <VouchEditor value={source} name="engine-room" minLines={6} maxHeight="20rem" lsp={false} onchange={changed} />
  <div class="bar ui">
    <button type="button" class="go" onclick={run} disabled={running}>{running ? 'Running…' : 'Run every engine'}</button>
    {#if target}<span class="tgt">{target.kind === 'system' ? 'System' : 'Function'} <code>{target.decl}</code>: {engines.length} engines, each with its own time budget.</span>{/if}
  </div>
  {#if error}<p class="err ui">{error}</p>{/if}
  <ol class="rows">
    {#each engines as name (name)}
      {@const r = results[name]}
      <li>
        <div class="head ui">
          <span class="ename">{name}</span>
          <span class="ms">{r ? fmt(r.ms) : running ? '…' : ''}</span>
        </div>
        {#if r}
          <div class="vs">{#each r.verdicts as v, i (i)}<Badge verdict={v} compact />{/each}</div>
        {:else if running}
          <p class="wait ui">waiting</p>
        {/if}
      </li>
    {/each}
  </ol>
  {#if caption}<figcaption>{caption}</figcaption>{/if}
</figure>

<style>
  .er {
    margin: 1.8rem 0;
    padding: 0.9rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--pn);
  }
  .ttl {
    margin: 0 0 0.6rem;
    font-size: 0.8rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--ink-2);
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
    margin: 0.6rem 0;
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .go {
    font-family: var(--font-ui);
    font-size: 0.8rem;
    font-weight: 600;
    padding: 0.25rem 0.75rem;
    border-radius: var(--radius-sm);
    border: 1px solid var(--ink-blue);
    background: var(--ink-blue);
    color: var(--on-accent);
    cursor: pointer;
  }
  .go:disabled {
    opacity: 0.7;
    cursor: progress;
  }
  .tgt code {
    font-family: var(--font-mono);
    font-size: 0.78rem;
  }
  .err {
    color: var(--pencil);
    font-size: 0.84rem;
  }
  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.5rem;
  }
  li {
    display: grid;
    grid-template-columns: 11rem minmax(0, 1fr);
    gap: 0.6rem;
    align-items: start;
    padding-top: 0.5rem;
    border-top: 1px solid var(--line);
  }
  @media (max-width: 640px) {
    li {
      grid-template-columns: minmax(0, 1fr);
      gap: 0.3rem;
    }
  }
  .head {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.84rem;
  }
  .ename {
    font-weight: 600;
  }
  .ms {
    color: var(--mute);
    font-variant-numeric: tabular-nums;
  }
  .vs {
    display: grid;
    gap: 0.3rem;
  }
  .wait {
    margin: 0;
    font-size: 0.8rem;
    color: var(--mute);
  }
  figcaption {
    margin-top: 0.6rem;
    font-family: var(--font-ui);
    font-size: 0.86rem;
    color: var(--ink-2);
  }
</style>
