<!--
  The board the two CPUs run on, as Chapter 23's board has it: eight LEDs, four hexadecimal digits (seven segments
  each, bit 0 is segment a), eight switches and four buttons, and, for Octet, a console line and a halted lamp. The
  values come from the chip decoded from its bits; the switches and buttons are the reader's.
-->
<script lang="ts">
  let {
    leds = 0,
    digits = [0, 0, 0, 0],
    switches = $bindable(0),
    buttons = $bindable(0),
    console,
    halted,
    trap,
  }: {
    leds?: number;
    /** The four digits' segments, left to right. */
    digits?: number[];
    switches?: number;
    buttons?: number;
    console?: string;
    halted?: boolean;
    trap?: number;
  } = $props();

  // Segments a to g of a digit, as strokes in a 10 × 18 box.
  const SEG: [number, number, number, number][] = [
    [2, 1, 8, 1],
    [9, 2, 9, 8],
    [9, 10, 9, 16],
    [2, 17, 8, 17],
    [1, 10, 1, 16],
    [1, 2, 1, 8],
    [2, 9, 8, 9],
  ];
  const TRAPS = ['', 'illegal instruction', 'ecall', 'ebreak'];
  const bit = (v: number, i: number) => (v >> i) & 1;
</script>

<div class="board ui">
  <div class="row">
    <div class="leds" role="img" aria-label="LEDs: {leds.toString(2).padStart(8, '0')}">
      {#each [7, 6, 5, 4, 3, 2, 1, 0] as i (i)}
        <span class="led" class:on={bit(leds, i)}></span>
      {/each}
    </div>
    <div class="digits" role="img" aria-label="Digits">
      {#each digits as d, k (k)}
        <svg viewBox="-1 -1 12 20" class="digit" aria-hidden="true">
          {#each SEG as s, i (i)}
            <line x1={s[0]} y1={s[1]} x2={s[2]} y2={s[3]} class:on={bit(d, i)} />
          {/each}
        </svg>
        {#if k === 1}<span class="gap"></span>{/if}
      {/each}
    </div>
    {#if halted !== undefined}<span class="lamp" class:on={halted}>halted</span>{/if}
    {#if trap !== undefined}<span class="lamp" class:on={trap !== 0}>{trap ? `trap: ${TRAPS[trap] ?? trap}` : 'trap'}</span>{/if}
  </div>
  <div class="row">
    <div class="switches" role="group" aria-label="Switches">
      {#each [7, 6, 5, 4, 3, 2, 1, 0] as i (i)}
        <button type="button" class="sw" class:on={bit(switches, i)} aria-pressed={!!bit(switches, i)} aria-label="Switch {i}" onclick={() => (switches ^= 1 << i)}><i></i></button>
      {/each}
    </div>
    <div class="buttons" role="group" aria-label="Buttons (hold)">
      {#each [3, 2, 1, 0] as i (i)}
        <button
          type="button"
          class="btn"
          class:on={bit(buttons, i)}
          aria-pressed={!!bit(buttons, i)}
          onpointerdown={() => (buttons |= 1 << i)}
          onpointerup={() => (buttons &= ~(1 << i))}
          onpointerleave={() => (buttons &= ~(1 << i))}
          onkeydown={(e) => (e.key === ' ' || e.key === 'Enter') && (buttons |= 1 << i)}
          onkeyup={() => (buttons &= ~(1 << i))}>BTN{i}</button
        >
      {/each}
    </div>
  </div>
  {#if console !== undefined}
    <pre class="console" aria-label="Console" aria-live="polite">{console || ' '}</pre>
  {/if}
</div>

<style>
  .board {
    display: grid;
    gap: 0.7rem;
    padding: 0.8rem 0.9rem;
    border: 1px solid var(--line-strong);
    border-radius: 10px;
    background: color-mix(in srgb, var(--sig-low, #2a5d3a) 18%, var(--panel));
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.8rem 1.2rem;
  }
  .leds,
  .switches,
  .buttons {
    display: flex;
    gap: 0.3rem;
  }
  .led {
    width: 0.9rem;
    height: 0.9rem;
    border-radius: 50%;
    background: color-mix(in srgb, var(--bad) 18%, var(--surface-2, var(--line)));
    border: 1px solid var(--line-strong);
  }
  .led.on {
    background: var(--bad);
    box-shadow: 0 0 6px var(--bad);
  }
  .digits {
    display: flex;
    gap: 0.2rem;
    padding: 0.25rem 0.4rem;
    border-radius: 4px;
    background: #1c1c1c;
  }
  .gap {
    width: 0.4rem;
  }
  .digit {
    width: 1.1rem;
    height: 2rem;
  }
  .digit line {
    stroke: #3a1d1d;
    stroke-width: 1.6;
    stroke-linecap: round;
  }
  .digit line.on {
    stroke: #ff4a3d;
  }
  .lamp {
    font-size: 0.72rem;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;
    border: 1px solid var(--line-strong);
    color: var(--mute);
  }
  .lamp.on {
    background: var(--sig-high);
    color: var(--fg);
    border-color: var(--sig-high);
  }
  .sw {
    width: 1.1rem;
    height: 1.9rem;
    padding: 2px;
    border: 1px solid var(--line-strong);
    border-radius: 3px;
    background: var(--panel);
    cursor: pointer;
    display: flex;
    align-items: flex-end;
  }
  .sw i {
    display: block;
    width: 100%;
    height: 45%;
    border-radius: 2px;
    background: var(--mute);
  }
  .sw.on {
    align-items: flex-start;
  }
  .sw.on i {
    background: var(--accent);
  }
  .btn {
    font: inherit;
    font-size: 0.68rem;
    padding: 0.35rem 0.45rem;
    border: 1px solid var(--line-strong);
    border-radius: 50%;
    min-width: 2.6rem;
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
    touch-action: none;
  }
  .btn.on {
    background: var(--accent);
    color: var(--on-accent);
  }
  .console {
    margin: 0;
    padding: 0.35rem 0.5rem;
    font-size: 0.78rem;
    background: #1c1c1c;
    color: #d9f5d0;
    border-radius: 4px;
    min-height: 1.4rem;
    white-space: pre-wrap;
  }
</style>
