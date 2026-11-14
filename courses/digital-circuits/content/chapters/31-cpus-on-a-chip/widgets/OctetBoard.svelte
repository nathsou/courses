<!--
  Octet on a real iCE40, from your own assembly. synth fits the Weft Octet (designs/octet.weft) on an HX8K once. A
  program is then written in assembly, assembled to bytes, and put into the block RAMs' initial contents in the
  bitstream itself, with no new fit (synth's bram_load, what IceStorm's icebram does); the board runs the chip decoded
  from the bits.

    ::octet-board{n="31.2" caption="…"}
-->
<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import Tabs from '$lib/widgets/weft/Tabs.svelte';
  import ChipView from '$lib/studio/ice40/ChipView.svelte';
  import StepsPane from '$lib/studio/ice40/StepsPane.svelte';
  import { highlightWeftHtml } from '$lib/weft/highlight';
  import { assemble, type OctetProgram } from '$lib/sim/cpu/octet';
  import type { Synth } from '$lib/synth/api';
  import BoardFace from './BoardFace.svelte';
  import { BoardRun, SPEEDS, type Speed } from './board-run.svelte';
  import { fitOctet, loadOctet, octetRams, type Fit } from './chip';
  import { octetFiles } from './octet-weft';
  import { OCTET_BOARD_PROGRAMS, defaultOctetProgram } from './programs';

  let { n, caption }: { n?: string | number; caption?: string } = $props();

  const uid = $props.id();
  let synthRun: Synth | undefined;
  let synthSim: Synth | undefined;
  const board = new BoardRun(() => synthSim!);

  let choice = $state(defaultOctetProgram.id);
  let text = $state(defaultOctetProgram.source);
  const program = $derived<OctetProgram>(assemble(text));
  let fit = $state.raw<Fit | null>(null);
  let inChip = $state(defaultOctetProgram.source);
  let inChipTitle = $state(defaultOctetProgram.title);
  let busy = $state('');
  let message = $state('');
  let error = $state('');
  let tab = $state('board');
  let file = $state(2);
  let selected = $state<number | undefined>();

  const errors = $derived(program.diagnostics.filter((d) => d.severity === 'error'));
  const edited = $derived(!!fit && !errors.length && text !== inChip);
  const note = $derived(OCTET_BOARD_PROGRAMS.find((p) => p.id === choice)?.note ?? 'Your own program.');
  const files = $derived(octetFiles(assemble(inChip).image));
  const listing = $derived(
    program.listing
      .filter((l) => l.bytes.length)
      .map((l) => `${(l.address ?? 0).toString(16).toUpperCase().padStart(2, '0')}  ${l.bytes.map((b) => b.toString(16).toUpperCase().padStart(2, '0')).join(' ').padEnd(5)}  ${l.source.trim()}`)
      .join('\n'),
  );
  const summary = $derived(fit ? `${fit.result.chip!.usage.lc} logic cells, ${fit.result.chip!.usage.ram} block RAMs, ${fit.result.timing!.clocks[0]!.fmax_mhz.toFixed(1)} MHz` : '');

  async function fitNow(source: string, title: string) {
    if (!synthRun) return;
    busy = 'synth is fitting Octet on the iCE40 HX8K…';
    error = '';
    try {
      const p = assemble(source);
      if (p.diagnostics.some((d) => d.severity === 'error')) throw new Error('the program does not assemble');
      const f = await fitOctet(synthRun, p.image);
      fit = f;
      inChip = source;
      inChipTitle = title;
      message = `Fitted in ${(f.ms / 1000).toFixed(1)} s: ${f.result.chip!.usage.lc} logic cells, ${f.result.chip!.usage.ram} block RAMs, ${f.result.timing!.clocks[0]!.fmax_mhz.toFixed(1)} MHz.`;
      await board.attach(f);
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      busy = '';
    }
  }

  async function load() {
    if (!fit || !synthRun || errors.length) return;
    busy = 'Loading the program into the block RAMs…';
    error = '';
    try {
      const r = await loadOctet(synthRun, fit, program.image);
      fit = r.fit;
      inChip = text;
      inChipTitle = OCTET_BOARD_PROGRAMS.find((p) => p.id === choice && p.source === text)?.title ?? 'your program';
      message = `Loaded in ${Math.max(1, Math.round(r.ms))} ms: ${r.changed} configuration bit${r.changed === 1 ? '' : 's'} changed, all in the ${octetRams(r.fit).length} block RAMs. No new fit.`;
      await board.attach(r.fit);
      tab = 'board';
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      busy = '';
    }
  }

  function pick(id: string) {
    choice = id;
    const p = OCTET_BOARD_PROGRAMS.find((x) => x.id === id);
    if (p) text = p.source;
  }

  onMount(async () => {
    const { synthOn } = await import('$lib/synth/client');
    synthRun = synthOn('run', (p) => busy && (busy = `synth: ${p.step}${p.detail ? `, ${p.detail}` : ''}…`));
    synthSim = synthOn('sim');
    await fitNow(defaultOctetProgram.source, defaultOctetProgram.title);
  });
  onDestroy(() => void board.detach());

  const TABS = [
    { id: 'board', label: 'Board' },
    { id: 'program', label: 'Assembly' },
    { id: 'source', label: 'Source' },
    { id: 'chip', label: 'Chip' },
    { id: 'steps', label: 'Steps' },
  ];
  const digits = $derived([board.values.seg3 ?? 0, board.values.seg2 ?? 0, board.values.seg1 ?? 0, board.values.seg0 ?? 0]);
</script>

<Widget {n} title="Octet on the iCE40" subtitle="Your assembly, in the block RAMs of a real bitstream, run from the bits" {caption} kind="FPGA board">
  {#snippet controls()}
    <div class="ctl ui">
      <label class="pick">Program
        <select value={choice} onchange={(e) => pick((e.currentTarget as HTMLSelectElement).value)}>
          {#each OCTET_BOARD_PROGRAMS as p (p.id)}<option value={p.id}>{p.title}</option>{/each}
        </select>
      </label>
      <Button size="sm" variant="primary" onclick={load} disabled={!edited || !!busy}>Load into the chip</Button>
      <Button size="sm" onclick={() => fitNow(text, inChipTitle)} disabled={!fit || !!busy || errors.length > 0}>Fit again</Button>
    </div>
  {/snippet}

  <div class="ob">
    <p class="status ui" role="status" aria-live="polite">
      {#if busy}{busy}{:else if error}<span class="err">{error}</span>{:else if fit}In the chip: <b>{inChipTitle}</b>. {message}{:else}…{/if}
    </p>
    <Tabs tabs={TABS} bind:value={tab} label="Views" idPrefix="{uid}-tab" />

    {#if tab === 'board'}
      <div class="pane">
        <BoardFace leds={board.values.led ?? 0} {digits} bind:switches={board.switches} bind:buttons={board.buttons} console={board.console} halted={!!board.values.halted} />
        <div class="run ui">
          <Button size="sm" variant="primary" onclick={() => (board.running ? board.pause() : board.play())} disabled={!board.ready}>{board.running ? 'Pause' : 'Run'}</Button>
          <Button size="sm" onclick={() => board.step(1)} disabled={!board.ready || board.running}>Step</Button>
          <Button size="sm" onclick={() => board.reset()} disabled={!board.ready}>Reset</Button>
          <Segmented label="Speed" size="sm" value={board.speed} onchange={(v: Speed) => (board.speed = v)} options={(Object.keys(SPEEDS) as Speed[]).map((s) => ({ value: s, label: SPEEDS[s].label }))} />
          <span class="cyc">cycle {board.cycle.toLocaleString('en-GB')}</span>
        </div>
        <p class="note ui">{note} The left digits show the program counter, the right ones the HEX register. Everything you see is computed by the chip decoded from its bits.</p>
      </div>
    {:else if tab === 'program'}
      <div class="pane prog">
        <label class="ui" for="{uid}-asm">Assembly (Chapter 23’s Octet assembly)</label>
        <textarea id="{uid}-asm" bind:value={text} spellcheck="false" rows="16"></textarea>
        {#if errors.length}
          <ul class="errs ui">{#each errors as e, i (i)}<li>line {e.line}: {e.message}</li>{/each}</ul>
        {:else}
          <pre class="listing" aria-label="The assembled bytes">{listing}</pre>
        {/if}
      </div>
    {:else if tab === 'source'}
      <div class="pane">
        <div class="files ui" role="tablist" aria-label="Files">
          {#each files as f, i (f.name)}<button type="button" role="tab" aria-selected={i === file} class:on={i === file} onclick={() => (file = i)}>{f.name}</button>{/each}
        </div>
        <pre class="src">{@html highlightWeftHtml(files[file]!.text)}</pre>
      </div>
    {:else if tab === 'chip' && fit}
      <div class="pane">
        <ChipView chip={fit.result.chip!} timing={fit.result.timing?.clocks} bind:selected label="Octet, placed and routed on the iCE40 HX8K" />
        <p class="note ui">{summary}. The two block RAMs that hold the memory are in the RAM columns; click a cell to select it and its nets.</p>
      </div>
    {:else if tab === 'steps' && fit}
      <StepsPane result={fit.result} />
    {/if}
  </div>
</Widget>

<style>
  .ob {
    display: grid;
    gap: 0.6rem;
    padding: 0.8rem 1rem 1rem;
    min-width: 0;
  }
  .ctl {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.6rem;
  }
  .pick {
    font-size: 0.8rem;
    display: flex;
    gap: 0.35rem;
    align-items: center;
  }
  select {
    font: inherit;
    font-size: 0.8rem;
  }
  .status,
  .note {
    margin: 0;
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .err {
    color: var(--bad);
  }
  .pane {
    display: grid;
    gap: 0.5rem;
    min-width: 0;
  }
  .run {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    align-items: center;
  }
  .cyc {
    font-size: 0.78rem;
    color: var(--mute);
    font-variant-numeric: tabular-nums;
  }
  textarea {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    width: 100%;
    box-sizing: border-box;
    padding: 0.5rem;
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    background: var(--panel);
    color: var(--fg);
  }
  .listing,
  .src {
    margin: 0;
    font-size: 0.76rem;
    max-height: 22rem;
    overflow: auto;
    padding: 0.5rem;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--panel);
  }
  .errs {
    margin: 0;
    color: var(--bad);
    font-size: 0.8rem;
  }
  .files {
    display: flex;
    gap: 0.25rem;
    flex-wrap: wrap;
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
</style>
