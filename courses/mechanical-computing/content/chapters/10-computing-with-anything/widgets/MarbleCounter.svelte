<!--
  A marble counter: a column of toggles, each a two-position flap. A marble dropped in at the top meets the
  first toggle: if it points one way, the toggle flips and sends the marble out (done); if the other, it flips
  back and lets the marble fall to the next toggle (a carry). The toggles count marbles in binary.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { onDestroy } from 'svelte';

  const N = 5;
  let bits = $state(Array(N).fill(0) as number[]);
  let count = $state(0);
  let ball: { level: number; out: boolean } | null = $state(null);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let queue = 0;

  function drop() {
    if (ball) {
      queue++;
      return;
    }
    count++;
    ball = { level: 0, out: false };
    step();
  }
  function step() {
    timer = setTimeout(() => {
      if (!ball) return;
      const k = ball.level;
      if (k >= N) {
        ball = null; // overflow: falls out of the bottom
        next();
        return;
      }
      if (bits[k] === 0) {
        bits[k] = 1;
        ball = { level: k, out: true };
        timer = setTimeout(() => {
          ball = null;
          next();
        }, 350);
      } else {
        bits[k] = 0;
        ball = { level: k + 1, out: false };
        step();
      }
    }, 320);
  }
  function next() {
    if (queue > 0) {
      queue--;
      drop();
    }
  }
  function reset() {
    clearTimeout(timer);
    queue = 0;
    ball = null;
    bits = Array(N).fill(0);
    count = 0;
  }
  onDestroy(() => clearTimeout(timer));
  const value = $derived(bits.reduce((a, b, i) => a + b * 2 ** i, 0));
</script>

<Widget title="A marble counter" subtitle="Each toggle is one bit. A marble that finds a toggle at 0 flips it to 1 and leaves; one that finds it at 1 flips it to 0 and falls to the next toggle: a carry." onreset={reset}>
  {#snippet controls()}
    <button class="go" onclick={drop}>Drop a marble</button>
    <button onclick={() => { for (let i = 0; i < 5; i++) drop(); }}>Drop five</button>
  {/snippet}
  <div class="wrap">
    <svg viewBox="0 0 180 {N * 52 + 30}" class="col" role="img" aria-label="A column of {N} toggles, each showing 0 or 1; the marble falls through them">
      {#each bits as b, k (k)}
        <g transform="translate(90 {30 + k * 52})">
          <rect x="-38" y="-20" width="76" height="40" rx="5" class="box" />
          <g transform="rotate({b ? 28 : -28})" class="flap"><rect x="-26" y="-3" width="52" height="6" rx="3" /></g>
          <circle r="4" class="pivot" />
          <text x="48" y="5" class="bit">{b}</text>
          <text x="-48" y="5" text-anchor="end" class="w">{2 ** k}</text>
        </g>
      {/each}
      {#if ball}
        <circle cx={ball.out ? 150 : 90} cy={30 + ball.level * 52 - (ball.out ? 0 : 26)} r="7" class="marble" />
      {/if}
    </svg>
    <div class="ro ui">
      <p>Marbles dropped: <strong class="num">{count}</strong></p>
      <p>Toggles, read upwards as binary: <strong class="num">{[...bits].reverse().join('')}</strong> = <strong class="num">{value}</strong></p>
      <p class="note">The top toggle is the 1s bit, the next the 2s, then 4s, 8s, 16s. After 31 marbles the next one carries all the way through and falls out of the bottom: overflow.</p>
    </div>
  </div>
</Widget>

<style>
  button {
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.8rem;
    cursor: pointer;
    min-height: 2rem;
    color: var(--ink);
  }
  .go {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
  }
  .wrap {
    display: grid;
    grid-template-columns: 11rem 1fr;
    gap: 1rem;
    align-items: start;
  }
  @media (max-width: 520px) {
    .wrap {
      grid-template-columns: 1fr;
    }
  }
  .col {
    width: 100%;
    background: var(--scene-bg);
    border-radius: var(--radius-sm);
  }
  .box {
    fill: var(--page);
    stroke: var(--line-strong);
  }
  .flap rect {
    fill: var(--brass);
    transition: transform 200ms;
  }
  .flap {
    transition: transform 200ms;
  }
  .pivot {
    fill: var(--ink);
  }
  .bit {
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 16px;
    fill: var(--ink);
  }
  .w {
    font-family: var(--font-mono);
    font-size: 10px;
    fill: var(--ink-3);
  }
  .marble {
    fill: var(--fx-blue);
    transition: cx 250ms, cy 250ms;
  }
  .ro p {
    margin: 0 0 0.4rem;
    font-size: 0.88rem;
  }
  .note {
    color: var(--ink-3);
    font-size: 0.8rem !important;
  }
</style>
