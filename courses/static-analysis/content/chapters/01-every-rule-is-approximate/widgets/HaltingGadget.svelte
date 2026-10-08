<!--
  The diagonal argument as a machine you can poke. Someone hands you `halts`, an analyser that answers "does this
  program stop on this input?". You pick what it answers about `contrary(contrary)`; the gadget runs `contrary` and
  shows that whatever it answered was wrong.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';

  let { n, caption }: { n?: string; caption?: string } = $props();
  let answer = $state<'halts' | 'loops' | null>(null);
  let step = $state(0);
  let timer: ReturnType<typeof setInterval> | undefined;

  function choose(a: 'halts' | 'loops') {
    answer = a;
    step = 0;
    clearInterval(timer);
    timer = setInterval(() => {
      step++;
      if (step >= 4) clearInterval(timer);
    }, 650);
  }

  const lines = [
    { t: 'function contrary(program) {', i: 0 },
    { t: 'if (halts(program, program)) {', i: 1 },
    { t: 'while (true) {}   // loop forever', i: 2 },
    { t: '}', i: 1 },
    { t: "return 'done';", i: 1 },
    { t: '}', i: 0 },
  ];
  // Which source line is "current" at each animation step.
  const current = $derived(answer === null ? -1 : [1, 1, answer === 'halts' ? 2 : 4, answer === 'halts' ? 2 : 4, answer === 'halts' ? 2 : 4][Math.min(step, 4)]!);
  const done = $derived(answer !== null && step >= 3);
</script>

<Widget title="The impossible analyser" subtitle="Whatever halts answers about contrary(contrary), contrary does the opposite." {n} {caption} onreset={() => { answer = null; step = 0; clearInterval(timer); }}>
  <div class="gadget">
    <div class="code" aria-label="The program contrary">
      {#each lines as l, k (k)}
        <div class="line" class:current={current === k} style:padding-left="{l.i * 1.4 + 0.6}rem"><code>{l.t}</code></div>
      {/each}
      <div class="call"><code>contrary(contrary);</code> <span class="q">does this stop?</span></div>
    </div>
    <div class="panel ui">
      <p class="ask">You have been given <code>halts(program, input)</code>, which always answers correctly. What does it say about <code>contrary</code> run on itself?</p>
      <div class="buttons" role="group" aria-label="The oracle's answer">
        <button aria-pressed={answer === 'halts'} onclick={() => choose('halts')}>“It halts”</button>
        <button aria-pressed={answer === 'loops'} onclick={() => choose('loops')}>“It loops forever”</button>
      </div>
      {#if answer}
        <ol class="trace" aria-live="polite">
          <li class:shown={step >= 0}><code>halts(contrary, contrary)</code> returns <strong>{answer === 'halts' ? 'true' : 'false'}</strong>.</li>
          <li class:shown={step >= 1}>{answer === 'halts' ? 'So contrary enters the if, and loops forever.' : 'So contrary skips the if, and returns.'}</li>
          <li class:shown={step >= 2}>{answer === 'halts' ? 'contrary(contrary) never stops.' : 'contrary(contrary) stops.'}</li>
        </ol>
        {#if done}
          <p class="verdict">✗ <code>halts</code> said “{answer === 'halts' ? 'it halts' : 'it loops'}”, and it {answer === 'halts' ? 'loops' : 'halts'}. The other answer fails the same way. No correct <code>halts</code> can exist.</p>
        {/if}
      {/if}
    </div>
  </div>
</Widget>

<style>
  .gadget {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 1rem;
    align-items: start;
  }
  @media (max-width: 700px) {
    .gadget {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .code {
    background: var(--pn);
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    padding: 0.6rem 0;
    font-size: 0.85rem;
    overflow-x: auto;
  }
  .line {
    padding: 0.08rem 0.6rem;
    white-space: pre;
    transition: background 200ms;
  }
  .line.current {
    background: var(--amber-soft);
    box-shadow: inset 3px 0 0 var(--amber);
  }
  .line code,
  .call code {
    background: none;
    border: 0;
    padding: 0;
    font-size: inherit;
  }
  .call {
    margin-top: 0.6rem;
    padding: 0.35rem 0.6rem 0;
    border-top: 1px dashed var(--line-strong);
  }
  .q {
    font-family: var(--font-ui);
    color: var(--mute);
    font-size: 0.8rem;
  }
  .ask {
    margin: 0 0 0.6rem;
    font-size: 0.9rem;
  }
  .buttons {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  .buttons button {
    border: 1px solid var(--line-strong);
    background: var(--panel);
    border-radius: var(--radius-sm);
    padding: 0.3rem 0.8rem;
    cursor: pointer;
    font-weight: 600;
  }
  .buttons button[aria-pressed='true'] {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .trace {
    margin: 0.8rem 0 0;
    padding-left: 1.2rem;
    font-size: 0.88rem;
  }
  .trace li {
    opacity: 0;
    transition: opacity 300ms;
  }
  .trace li.shown {
    opacity: 1;
  }
  .verdict {
    margin: 0.7rem 0 0;
    padding: 0.45rem 0.7rem;
    background: var(--bad-soft);
    border-left: 3px solid var(--bad);
    border-radius: 3px;
    font-size: 0.88rem;
  }
  @media (prefers-reduced-motion: reduce) {
    .trace li,
    .line {
      transition: none;
    }
  }
</style>
