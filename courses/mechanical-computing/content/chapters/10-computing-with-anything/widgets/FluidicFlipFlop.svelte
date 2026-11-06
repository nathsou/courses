<!--
  A fluidic flip-flop: a jet of air or water clings to whichever wall it is nearest (the Coandă effect), and
  stays there; a puff from a control port pushes it over to the other wall, where it stays. A memory with no
  moving parts.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  let side: 'L' | 'R' = $state('L');
  let puff: 'L' | 'R' | null = $state(null);
  function control(from: 'L' | 'R') {
    puff = from;
    setTimeout(() => (puff = null), 300);
    side = from === 'L' ? 'R' : 'L';
  }
</script>

<Widget title="A fluidic flip-flop" subtitle="The supply jet enters at the bottom and clings to one wall. A short puff from a control port pushes it to the other side, where it stays after the puff stops: one bit, stored in a flow.">
  {#snippet controls()}
    <button onclick={() => control('L')}>Puff from the left control</button>
    <button onclick={() => control('R')}>Puff from the right control</button>
  {/snippet}
  <svg viewBox="0 0 240 200" class="ff" role="img" aria-label="The jet flows out of the {side === 'L' ? 'left' : 'right'} output">
    <path d="M110 200 V 140 L 40 20 H 10 M130 200 V 140 L 200 20 H 230 M120 60 L 80 20 M120 60 L 160 20" class="wall" />
    <path d="M60 160 H 110 M180 160 H 130" class="wall" />
    <path d={side === 'L' ? 'M120 200 C 120 150, 100 120, 60 20' : 'M120 200 C 120 150, 140 120, 180 20'} class="jet" />
    {#if puff}<path d={puff === 'L' ? 'M62 160 H 112' : 'M178 160 H 128'} class="puff" />{/if}
    <text x="40" y="14" class="lab" class:on={side === 'L'}>output 0</text>
    <text x="168" y="14" class="lab" class:on={side === 'R'}>output 1</text>
    <text x="46" y="176" class="lab">control L</text>
    <text x="150" y="176" class="lab">control R</text>
    <text x="102" y="196" class="lab">supply</text>
  </svg>
</Widget>

<style>
  button {
    border: 1px solid var(--line-strong);
    background: var(--surface);
    border-radius: var(--radius-sm);
    padding: 0.28rem 0.7rem;
    min-height: 2rem;
    cursor: pointer;
    color: var(--ink);
  }
  .ff {
    width: 100%;
    max-width: 22rem;
    display: block;
    margin: 0 auto;
    background: var(--scene-bg);
    border-radius: var(--radius-sm);
  }
  .wall {
    fill: none;
    stroke: var(--ink-2);
    stroke-width: 3;
  }
  .jet {
    fill: none;
    stroke: color-mix(in srgb, var(--fx-blue) 70%, transparent);
    stroke-width: 12;
    stroke-linecap: round;
    transition: d 300ms;
  }
  .puff {
    stroke: var(--fx-red);
    stroke-width: 6;
  }
  .lab {
    font-size: 9px;
    fill: var(--ink-3);
  }
  .lab.on {
    fill: var(--accent);
    font-weight: 700;
  }
</style>
