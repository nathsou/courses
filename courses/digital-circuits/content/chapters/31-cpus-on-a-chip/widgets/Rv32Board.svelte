<!--
  The RV32I core on a real iCE40: the Weft core (content/designs/rv32i.weft) inside the board's wrapper
  (designs/rv32-board.weft), with the program in a ROM made of logic, fitted by synth on an HX8K with the register
  file in flip-flops or in block RAM, and run from the chip decoded from its bits.

    ::rv32-board{n="31.4" caption="…"}
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
  import { assemble, type Rv32Program } from '$lib/sim/cpu/rv32i';
  import type { Synth } from '$lib/synth/api';
  import BoardFace from './BoardFace.svelte';
  import { BoardRun, SPEEDS, type Speed } from './board-run.svelte';
  import { fitRv32, type Fit } from './chip';
  import { RV32_BOARD_PROGRAMS } from './programs';
  import { RV32_ROM_WORDS, rv32BoardFiles, type Registers } from './rv32-board';

  let { n, caption }: { n?: string | number; caption?: string } = $props();

  const uid = $props.id();
  let synthRun: Synth | undefined;
  let synthSim: Synth | undefined;
  const board = new BoardRun(() => synthSim!);

  let text = $state(RV32_BOARD_PROGRAMS[0]!.source);
  const program = $derived<Rv32Program>(assemble(text));
  let registers = $state<Registers>('flip-flops');
  let fit = $state.raw<Fit | null>(null);
  let fitted = $state<{ text: string; registers: Registers } | null>(null);
  let busy = $state('');
  let message = $state('');
  let error = $state('');
  let tab = $state('board');
  let file = $state(2);
  let selected = $state<number | undefined>();

  const errors = $derived(program.diagnostics.filter((d) => d.severity === 'error'));
  const tooLong = $derived(program.instructions > RV32_ROM_WORDS);
  const stale = $derived(!fitted || fitted.text !== text || fitted.registers !== registers);
  const files = $derived(rv32BoardFiles(fitted ? assemble(fitted.text) : program));

  async function fitNow() {
    if (!synthRun || errors.length || tooLong) return;
    busy = `synth is fitting the core with its registers in ${registers} on the iCE40 HX8K…`;
    error = '';
    try {
      const f = await fitRv32(synthRun, program, registers);
      fit = f;
      fitted = { text, registers };
      const u = f.result.chip!.usage;
      message = `Fitted in ${(f.ms / 1000).toFixed(1)} s, registers in ${registers}: ${u.lc.toLocaleString('en-GB')} logic cells, ${u.ram} block RAMs, ${f.result.timing!.clocks[0]!.fmax_mhz.toFixed(1)} MHz.`;
      await board.attach(f);
      tab = 'board';
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      busy = '';
    }
  }

  onMount(async () => {
    const { synthOn } = await import('$lib/synth/client');
    synthRun = synthOn('run', (p) => busy && (busy = `synth: ${p.step}${p.detail ? `, ${p.detail}` : ''}…`));
    synthSim = synthOn('sim');
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

<Widget {n} title="The RV32I core on the iCE40" subtitle="A real instruction set, fitted by synth and run from its bits" {caption} kind="FPGA board">
  {#snippet controls()}
    <div class="ctl ui">
      <Segmented label="Register file" size="sm" bind:value={registers} options={[{ value: 'flip-flops', label: 'Flip-flops' }, { value: 'block RAM', label: 'Block RAM' }]} />
      <Button size="sm" variant="primary" onclick={fitNow} disabled={!!busy || errors.length > 0 || tooLong || !stale}>{fitted ? 'Fit again' : 'Fit'}</Button>
    </div>
  {/snippet}

  <div class="rb">
    <p class="status ui" role="status" aria-live="polite">
      {#if busy}{busy}{:else if error}<span class="err">{error}</span>{:else if fit}{message}{stale ? ' The program or the register file has changed since: fit again.' : ''}{:else}Press Fit: with the register file in flip-flops it takes about twenty seconds, in block RAM about five.{/if}
    </p>
    <Tabs tabs={TABS} bind:value={tab} label="Views" idPrefix="{uid}-tab" />

    {#if tab === 'board'}
      <div class="pane">
        <BoardFace leds={board.values.led ?? 0} {digits} bind:switches={board.switches} bind:buttons={board.buttons} trap={board.values.trap ?? 0} />
        <div class="run ui">
          <Button size="sm" variant="primary" onclick={() => (board.running ? board.pause() : board.play())} disabled={!board.ready}>{board.running ? 'Pause' : 'Run'}</Button>
          <Button size="sm" onclick={() => board.step(1)} disabled={!board.ready || board.running}>Step</Button>
          <Button size="sm" onclick={() => board.powerCycle()} disabled={!board.ready}>Power off and on</Button>
          <Segmented label="Speed" size="sm" value={board.speed} onchange={(v: Speed) => (board.speed = v)} options={(Object.keys(SPEEDS) as Speed[]).map((s) => ({ value: s, label: SPEEDS[s].label }))} />
          <span class="cyc">cycle {board.cycle.toLocaleString('en-GB')}</span>
        </div>
        <p class="note ui">{RV32_BOARD_PROGRAMS[0]!.note} The left digits show the program counter (its low byte), the right ones the HEX register. The core has no reset button.</p>
      </div>
    {:else if tab === 'program'}
      <div class="pane">
        <label class="ui" for="{uid}-asm">Assembly (RV32I, as Chapter 23’s assembler reads it)</label>
        <textarea id="{uid}-asm" bind:value={text} spellcheck="false" rows="16"></textarea>
        {#if errors.length}
          <ul class="errs ui">{#each errors as e, i (i)}<li>line {e.line}: {e.message}</li>{/each}</ul>
        {:else if tooLong}
          <p class="errs ui">The ROM holds {RV32_ROM_WORDS} instructions; this program has {program.instructions}.</p>
        {:else}
          <p class="note ui">{program.instructions} instructions. The program is a ROM made of logic, so a new program means a new fit.</p>
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
      <ChipView chip={fit.result.chip!} timing={fit.result.timing?.clocks} bind:selected label="The RV32I core, placed and routed on the iCE40 HX8K" />
    {:else if tab === 'steps' && fit}
      <StepsPane result={fit.result} />
    {:else}
      <p class="note ui">Fit the core first.</p>
    {/if}
  </div>
</Widget>

<style>
  .rb {
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
  .status,
  .note {
    margin: 0;
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .err,
  .errs {
    color: var(--bad);
    font-size: 0.8rem;
    margin: 0;
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
