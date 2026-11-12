<!--
  The FPGA studio: a Weft design taken through synth's whole flow to a real iCE40 chip, in the browser, and
  every step shown.

    ::fpga-studio{design="counter" views="source,steps,chip,timing,bits,board" n="30.1" caption="…"}

  Views: `source` (the Weft, editable; Build runs the flow again), `steps` (what each step made of it, and how
  long it took), `chip` (the die as placed and routed; click a cell), `timing` (the critical path), `bits` (the
  configuration bits, tile by tile), `board` (the design running from its decoded bitstream), `place` and
  `route` (the annealer's and the router's progress, replayed).
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Tabs from '$lib/widgets/weft/Tabs.svelte';
  import WeftEditor from '$lib/weft/WeftEditor.svelte';
  import type { SourceFile } from '$lib/synth/api';
  import BitsPane from './BitsPane.svelte';
  import BoardPane from './BoardPane.svelte';
  import ChipView from './ChipView.svelte';
  import ReplayPane from './ReplayPane.svelte';
  import StepsPane from './StepsPane.svelte';
  import TimingPane from './TimingPane.svelte';
  import { describeCell } from './chipdraw';
  import { STUDIO_DESIGNS, studioFiles } from './designs';
  import type { Implementation } from './run';

  let {
    design = 'counter',
    views = 'source,steps,chip,timing,bits,board',
    tab: initial,
    title,
    subtitle,
    caption,
    n,
  }: {
    design?: string;
    views?: string;
    tab?: string;
    title?: string;
    subtitle?: string;
    caption?: string;
    n?: string | number;
  } = $props();

  const uid = $props.id();
  const d = untrack(() => STUDIO_DESIGNS[design]);
  const original = untrack(() => (d ? studioFiles(d) : []));
  // The file the reader edits is the design's own (the last one: a board's top module comes last).
  let files = $state<SourceFile[]>(original.map((f) => ({ ...f })));
  let editing = $state(untrack(() => Math.max(0, original.length - 1)));
  const wanted = untrack(() => views.split(',').map((v) => v.trim()).filter(Boolean));
  let tab = $state(untrack(() => initial ?? wanted.find((v) => v !== 'source') ?? 'chip'));
  let result = $state.raw<Implementation | undefined>();
  let building = $state(false);
  let progress = $state('');
  let error = $state('');
  let selected = $state<number | undefined>();
  let builtFrom = '';

  const LABEL: Record<string, string> = { source: 'Source', steps: 'Steps', chip: 'Chip', timing: 'Timing', bits: 'Bits', board: 'Board', place: 'Placement', route: 'Routing' };
  const panes = $derived(wanted.map((id) => ({ id, label: LABEL[id] ?? id })));

  async function build() {
    if (!d) return;
    const text = JSON.stringify(files);
    if (text === builtFrom && result) return;
    building = true;
    error = '';
    try {
      const [{ synthOn }, { implement }] = await Promise.all([import('$lib/synth/client'), import('./run')]);
      const synth = synthOn('run', (p) => (progress = `${p.step}${p.detail ? `: ${p.detail}` : ''}`));
      const r = await implement(synth, files, { target: d.target, top: d.top, trace: wanted.includes('place') || wanted.includes('route') });
      builtFrom = text;
      if (!r.ok) {
        const e = r.diagnostics.find((x) => x.severity === 'error');
        error = e ? (e.at ? `${e.at.file} line ${e.at.line}: ${e.message}` : e.message) : (r.error ?? 'synth failed');
      } else {
        result = r;
        selected = undefined;
      }
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      building = false;
      progress = '';
    }
  }

  onMount(() => {
    void build();
  });

  const cell = $derived(result?.chip && selected !== undefined ? result.chip.cells[selected] : undefined);
  const edited = $derived(JSON.stringify(files) !== JSON.stringify(original));
</script>

{#snippet controls()}
  <div class="bar ui" role="toolbar" aria-label="Flow">
    <button type="button" class="tool primary" onclick={build} disabled={building}>{building ? 'Building…' : edited ? 'Build again' : 'Build'}</button>
    <button type="button" class="tool" onclick={() => { files = original.map((f) => ({ ...f })); void build(); }} disabled={!edited || building}>Reset</button>
    <span class="status" role="status" aria-live="polite">{building ? progress || 'running synth…' : result ? `${result.target.name}: ${result.chip?.usage.lc} of ${result.chip?.usage.lc_total} logic cells, ${result.timing?.clocks[0] ? `${result.timing.clocks[0].fmax_mhz.toFixed(0)} MHz` : 'no clock'}` : ''}</span>
  </div>
{/snippet}

{#if !d}
  <p role="alert">Unknown design “{design}”.</p>
{:else}
  <Widget title={title ?? d.title} subtitle={subtitle ?? `Built by synth for the ${d.target.name}, in your browser`} {caption} {n} kind="FPGA studio" live={false} {controls}>
    <div class="studio">
      <Tabs tabs={panes} bind:value={tab} label="Views" idPrefix="{uid}-tab" />
      {#if error}<p class="err ui" role="alert">{error}</p>{/if}

      {#if tab === 'source'}
        <div class="pane" role="tabpanel" id="{uid}-tab-panel-source" aria-labelledby="{uid}-tab-source">
          {#if files.length > 1}
            <div class="files ui" role="tablist" aria-label="Files">
              {#each files as f, i (f.name)}
                <button type="button" role="tab" aria-selected={i === editing} class:on={i === editing} onclick={() => (editing = i)}>{f.name}</button>
              {/each}
            </div>
          {/if}
          {#key editing}
            <WeftEditor bind:doc={files[editing]!.text} file={files[editing]!.name} others={files.filter((_, i) => i !== editing)} top={d.top} maxLines={28} label="Weft source: {files[editing]!.name}" />
          {/key}
        </div>
      {:else if !result}
        <p class="note ui">{building ? `synth is building the design… ${progress}` : 'Press Build.'}</p>
      {:else if tab === 'steps'}
        <StepsPane {result} />
      {:else if tab === 'chip' && result.chip}
        <ChipView chip={result.chip} timing={result.timing?.clocks} bind:selected label="{d.title}, placed and routed on the {result.target.name}" />
        <p class="cell ui" aria-live="polite">
          {#if cell}<b><code>{cell.name.replace(/\$(lc|sb_io)$/, '')}</code></b> at tile ({cell.x}, {cell.y}){cell.bel === 'lc' ? `, logic cell ${cell.z}` : ''}: {describeCell(cell)}.{:else}Click a cell. Logic cells are copper (a flip-flop adds an amber end), pads blue; the critical path is outlined in red, and the nets it uses are red.{/if}
        </p>
      {:else if tab === 'timing' && result.timing}
        <TimingPane clocks={result.timing.clocks} />
      {:else if tab === 'bits' && result.bitstream}
        <BitsPane bitstream={result.bitstream} highlight={cell ? { x: cell.x, y: cell.y } : undefined} />
      {:else if tab === 'board'}
        <BoardPane {result} target={result.target} />
      {:else if (tab === 'place' || tab === 'route') && result.chip && result.trace}
        <ReplayPane chip={result.chip} trace={result.trace} mode={tab} />
      {/if}
    </div>
  </Widget>
{/if}

<style>
  .studio {
    display: grid;
    gap: 0.7rem;
    min-width: 0;
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.5rem;
    flex: 1 1 100%;
  }
  .tool {
    height: 1.9rem;
    padding: 0 0.75rem;
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    background: var(--panel);
    color: var(--fg);
    font: inherit;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
  }
  .tool:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .tool.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
  }
  .status {
    font-size: 0.78rem;
    color: var(--mute);
  }
  .pane {
    display: grid;
    gap: 0.4rem;
    min-width: 0;
  }
  .files {
    display: flex;
    gap: 0.25rem;
  }
  .files button {
    font: inherit;
    font-family: var(--font-mono);
    font-size: 0.76rem;
    padding: 0.15rem 0.5rem;
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
  }
  .files button.on {
    border-color: var(--accent);
    background: var(--copper-soft);
  }
  .err {
    color: var(--bad);
    margin: 0;
    font-size: 0.84rem;
  }
  .note,
  .cell {
    color: var(--ink-2);
    font-size: 0.82rem;
    margin: 0;
  }
</style>
