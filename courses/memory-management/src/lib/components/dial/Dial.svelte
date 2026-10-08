<!--
  The memory-manager dial (PLAN §3, through-line 1). One Mote program, run under the memory manager the dial
  points at. Two charts: bytes held over time against the two oracles (bytes reachable, bytes that will be used
  again), and one lifetime bar per object. Used as `:::dial{settings="manual,rc,mark-sweep" title="…"}` with a
  ```mote block inside.
-->
<script lang="ts">
  import Widget from '../ui/Widget.svelte';
  import CodeEditor from '$lib/exercise/CodeEditor.svelte';
  import LifetimeChart from './LifetimeChart.svelte';
  import MemoryChart from './MemoryChart.svelte';
  import { bars, curves, drag, type Bar } from './lifetime';
  import { Vm } from '$lib/mm/mote/vm';
  import { compile } from '$lib/mm/mote/compile';
  import { makeManager, SETTINGS, type Setting, type ManagerStats } from '$lib/mm/managers/managers';
  import { num } from '$lib/mm/util/format';

  let {
    code,
    title = 'The memory-manager dial',
    caption,
    settings = 'manual,ownership,rc,mark-sweep,copying,generational',
    start,
    heapBytes = 1 << 16,
    trigger = 4096,
    nursery = 2048,
    editable = false,
    showCode = true,
    n,
  }: {
    code: string;
    title?: string;
    caption?: string;
    settings?: string;
    start?: Setting;
    heapBytes?: number;
    trigger?: number;
    nursery?: number;
    editable?: boolean;
    showCode?: boolean;
    n?: string;
  } = $props();

  const choices = $derived(settings.split(',').map((s) => SETTINGS.find((x) => x.id === s.trim())!).filter(Boolean));
  let setting = $state<Setting>(start ?? (settings.split(',')[0]!.trim() as Setting));
  let src = $state(code);

  interface Result {
    vm: Vm;
    bars: Bar[];
    stats: ManagerStats;
    end: number;
  }

  function runWith(s: Setting, text: string): Result | string {
    try {
      const c = compile(text);
      const m = makeManager(s, { heapBytes, trigger, nurseryBytes: nursery });
      const vm = new Vm(c, m, { heapBytes: heapBytes * 2 }).run(300_000);
      return { vm, bars: bars(vm), stats: m.stats, end: vm.time };
    } catch (e) {
      return e instanceof Error ? e.message : String(e);
    }
  }

  const outcome = $derived(runWith(setting, src));
  const result = $derived(typeof outcome === 'string' ? undefined : outcome);
  const compileError = $derived(typeof outcome === 'string' ? outcome : '');
  const summary = $derived(result?.vm.summary());
  const cv = $derived(result ? curves(result.bars, result.end) : undefined);

  // The knob: settings placed on an arc; the pointer rotates to the selected one.
  const angleOf = (i: number, n: number) => (n === 1 ? 0 : -70 + (140 * i) / (n - 1));
  const knob = $derived(angleOf(Math.max(0, choices.findIndex((c) => c.id === setting)), choices.length));

  function onKey(e: KeyboardEvent) {
    const i = choices.findIndex((c) => c.id === setting);
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') setting = choices[(i + 1) % choices.length]!.id;
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') setting = choices[(i - 1 + choices.length) % choices.length]!.id;
    else return;
    e.preventDefault();
  }
</script>

<Widget {title} {caption} {n} kind="The dial">
  <div class="dial-wrap ui">
    <svg class="knob" viewBox="-110 -105 220 120" aria-hidden="true">
      <path class="arc" d="M-94 -34 A100 100 0 0 1 94 -34" />
      {#each choices as c, i (c.id)}
        {@const a = ((angleOf(i, choices.length) - 90) * Math.PI) / 180}
        <circle class="tick" class:on={c.id === setting} cx={Math.cos(a) * 82} cy={Math.sin(a) * 82} r="3.2" />
      {/each}
      <g transform="rotate({knob})" class="pointer">
        <line x1="0" y1="0" x2="0" y2="-66" />
        <circle cx="0" cy="-66" r="5" />
      </g>
      <circle class="hub" cx="0" cy="0" r="16" />
      <ellipse class="core" cx="0" cy="0" rx="9" ry="4.6" transform="rotate(-38)" />
    </svg>
    <div class="settings" role="radiogroup" aria-label="Memory manager" tabindex="-1" onkeydown={onKey}>
      {#each choices as c (c.id)}
        <button role="radio" aria-checked={c.id === setting} tabindex={c.id === setting ? 0 : -1} class:on={c.id === setting} onclick={() => (setting = c.id)} title={c.blurb}>{c.label}</button>
      {/each}
    </div>
    <p class="blurb">{choices.find((c) => c.id === setting)?.blurb}</p>
  </div>

  {#if showCode}
    <details class="code" open={editable}>
      <summary class="ui">The program{editable ? ' (edit it: the dial reruns it)' : ''}</summary>
      <CodeEditor value={src} lang="mote" readonly={!editable} minLines={4} maxHeight="20rem" label="Mote program" onchange={(c) => (src = c)} />
    </details>
  {/if}

  {#if compileError}
    <p class="err ui">✗ {compileError}</p>
  {:else if result && summary && cv}
    <div class="badges ui">
      <span class="vchip info">{num(summary.allocated)} objects</span>
      <span class="vchip info">{num(summary.freed)} freed</span>
      {#if summary.leaked}<span class="vchip bad" title="Never freed, and unreachable when the program ended">⟶ {num(summary.leaked)} leaked</span>{/if}
      {#if summary.uaf}<span class="vchip bad">✗ {summary.uaf} use-after-free</span>{/if}
      {#if summary.doubleFree}<span class="vchip bad">✗ {summary.doubleFree} double free</span>{/if}
      {#if summary.unsafeFrees}<span class="vchip bad">✗ {summary.unsafeFrees} freed while still in use</span>{:else if summary.freed}<span class="vchip ok" title="The oracle checked every free against the object's last use">✓ every free was safe on this run</span>{/if}
      {#if result.stats.collections}<span class="vchip maybe">{result.stats.collections} collection{result.stats.collections === 1 ? '' : 's'}</span>{/if}
      <span class="vchip info" title="Average steps between an object's last use and its free (or the end)">drag ≈ {num(drag(result.bars, result.end))} steps</span>
    </div>
    {#if result.vm.error}<p class="err ui">✗ The program stopped: {result.vm.error.message}</p>{/if}
    <MemoryChart curves={cv} end={result.end} gcs={result.vm.events.filter((e) => e.kind === 'gc').map((e) => e.t)} />
    <LifetimeChart bars={result.bars} end={result.end} />
    {#if result.vm.output.length}
      <div class="out ui"><span class="label-caps">Output</span><pre>{result.vm.output.slice(-6).join('\n')}</pre></div>
    {/if}
  {/if}
</Widget>

<style>
  .dial-wrap {
    display: grid;
    grid-template-columns: 9rem minmax(0, 1fr);
    grid-template-rows: auto auto;
    gap: 0.2rem 1rem;
    align-items: center;
    padding: 0.4rem 0.2rem 0.8rem;
  }
  .knob {
    grid-row: 1 / span 2;
    width: 9rem;
  }
  .arc {
    fill: none;
    stroke: var(--line-strong);
    stroke-width: 1.5;
    stroke-dasharray: 2 4;
  }
  .tick {
    fill: var(--panel);
    stroke: var(--meta);
    stroke-width: 1.4;
    transition: fill 200ms;
  }
  .tick.on {
    fill: var(--amber);
    stroke: var(--amber);
  }
  .pointer {
    transition: transform 380ms cubic-bezier(0.3, 1.5, 0.5, 1);
  }
  .pointer line {
    stroke: var(--copper);
    stroke-width: 3;
    stroke-linecap: round;
  }
  .pointer circle {
    fill: var(--copper);
  }
  .hub {
    fill: var(--pn);
    stroke: var(--line-strong);
  }
  .core {
    fill: none;
    stroke: var(--amber);
    stroke-width: 2.6;
  }
  .settings {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .settings button {
    border: 1px solid var(--line-strong);
    background: var(--panel);
    border-radius: 99px;
    padding: 0.2rem 0.7rem;
    font-size: 0.82rem;
    cursor: pointer;
  }
  .settings button.on {
    background: var(--copper);
    border-color: var(--copper);
    color: var(--on-accent);
    font-weight: 600;
  }
  .blurb {
    margin: 0;
    font-size: 0.86rem;
    color: var(--ink-2);
  }
  @media (max-width: 560px) {
    .dial-wrap {
      grid-template-columns: minmax(0, 1fr);
    }
    .knob {
      grid-row: auto;
      width: 7rem;
      justify-self: center;
    }
  }
  .code summary {
    cursor: pointer;
    font-size: 0.82rem;
    color: var(--ink-2);
    margin-bottom: 0.4rem;
  }
  .badges {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin: 0.8rem 0 0.4rem;
    font-size: 0.9rem;
  }
  .err {
    color: var(--bad);
    font-size: 0.86rem;
  }
  .out pre {
    margin: 0.2rem 0 0;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    background: var(--pn);
    padding: 0.4rem 0.6rem;
    border-radius: var(--radius-sm);
    white-space: pre-wrap;
  }
  .out {
    margin-top: 0.6rem;
  }
</style>
