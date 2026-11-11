<!--
  A tour of the mistakes that synth's Weft compiler refuses, with its messages:

    ::diagnostics-tour{n="29.3" caption="…"}

  Pick a stop (or use Previous and Next): the broken program, the message synth prints for it, and a fixed
  version that synth accepts. The messages are synth's, recorded and checked by `tour.test.ts`.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { highlightWeftHtml } from '$lib/weft/highlight';
  import { MESSAGES, STOPS } from './tour';

  let { n, caption }: { n?: string | number; caption?: string } = $props();

  let index = $state(0);
  let fixed = $state(false);
  const stop = $derived(STOPS[index]!);
  const diag = $derived(MESSAGES[stop.id]?.broken ?? { text: '', errors: 0 });
  const shown = $derived(fixed ? stop.fixed : stop.broken);
  const fixedOk = $derived((MESSAGES[stop.id]?.fixed.errors ?? 1) === 0);

  function go(i: number) {
    index = (i + STOPS.length) % STOPS.length;
    fixed = false;
  }
  const lineClass = (l: string) => (/^(error|warning)/.test(l) ? 'head' : /^\s*= help/.test(l) ? 'help' : /^note/.test(l) ? 'nt' : /\^+/.test(l) && /\|/.test(l) ? 'caret' : '');
</script>

<Widget {n} title="A tour of the mistakes Weft will not let through" subtitle="Twelve programs that a looser language accepts" kind="Interactive" {caption} live={false} onreset={() => go(0)}>
  {#snippet controls()}
    <div class="nav ui" role="toolbar" aria-label="Choose a mistake">
      <button type="button" class="step" onclick={() => go(index - 1)} aria-label="Previous mistake">‹</button>
      <div class="chips" role="tablist" aria-label="Mistakes">
        {#each STOPS as s, i (s.id)}
          <button type="button" role="tab" aria-selected={i === index} class:on={i === index} onclick={() => go(i)} title={s.title}>{i + 1}</button>
        {/each}
      </div>
      <button type="button" class="step" onclick={() => go(index + 1)} aria-label="Next mistake">›</button>
    </div>
  {/snippet}

  <div class="tour">
    <h5 class="ui"><span class="num">{index + 1} of {STOPS.length}</span> {stop.title}</h5>

    <div class="grid">
      <div class="col">
        <div class="cap ui">
          <span>{fixed ? 'The fixed program' : 'The program'}</span>
          <button type="button" class="toggle" aria-pressed={fixed} onclick={() => (fixed = !fixed)}>{fixed ? 'Show the broken one' : 'Show the fix'}</button>
        </div>
        <figure class="code-block" aria-label={fixed ? 'Fixed Weft program' : 'Broken Weft program'}>{@html highlightWeftHtml(shown)}</figure>
      </div>

      <div class="col">
        <div class="cap ui">
          <span>What synth says</span>
          <span class="verdict" class:ok={fixed && fixedOk}>{fixed ? (fixedOk ? 'compiles' : 'does not compile') : `${diag.errors} error${diag.errors === 1 ? '' : 's'}`}</span>
        </div>
        {#if fixed}
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <pre class="msg ok" tabindex="0"><code>synth has nothing to say: no errors, no warnings.</code></pre>
        {:else}
          <!-- svelte-ignore a11y_no_noninteractive_tabindex -->
          <pre class="msg" tabindex="0"><code>{#each diag.text.split('\n') as l, i (i)}<span class={lineClass(l)}>{l}</span>{'\n'}{/each}</code></pre>
        {/if}
      </div>
    </div>

    <p class="why"><strong>Why it matters.</strong> {#each stop.why.split('`') as part, i (i)}{#if i % 2}<code>{part}</code>{:else}{part}{/if}{/each}</p>
  </div>
</Widget>

<style>
  .tour {
    display: grid;
    gap: 0.7rem;
    min-width: 0;
  }
  h5 {
    margin: 0;
    font-size: 0.95rem;
  }
  .num {
    display: inline-block;
    margin-right: 0.5rem;
    padding: 0 0.4rem;
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--ink-2);
  }
  .nav {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    flex: 1 1 100%;
    min-width: 0;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
  }
  .chips button,
  .step {
    min-width: 1.9rem;
    height: 1.9rem;
    padding: 0 0.4rem;
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    background: var(--panel);
    color: var(--fg);
    font: inherit;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    cursor: pointer;
  }
  .chips button.on {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--on-accent);
    font-weight: 600;
  }
  .chips button:hover:not(.on),
  .step:hover {
    border-color: var(--copper);
    color: var(--copper-ink);
  }
  .chips button:focus-visible,
  .step:focus-visible,
  .toggle:focus-visible {
    outline: 2px solid var(--focus);
    outline-offset: 2px;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.8rem;
    align-items: start;
  }
  @media (max-width: 46rem) {
    .grid {
      grid-template-columns: minmax(0, 1fr);
    }
  }
  .col {
    min-width: 0;
  }
  .cap {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.3rem;
    font-size: 0.78rem;
    font-weight: 600;
    color: var(--ink-2);
  }
  .toggle {
    height: 1.6rem;
    padding: 0 0.6rem;
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    background: var(--panel);
    color: var(--fg);
    font: inherit;
    font-size: 0.74rem;
    font-weight: 500;
    cursor: pointer;
  }
  .toggle:hover {
    border-color: var(--copper);
    color: var(--copper-ink);
  }
  .verdict {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--bad);
  }
  .verdict.ok {
    color: var(--ok);
  }
  figure.code-block {
    margin: 0;
  }
  figure.code-block :global(pre) {
    margin: 0;
    font-size: 0.76rem;
    overflow-x: auto;
  }
  .msg {
    margin: 0;
    padding: 0.6rem 0.75rem;
    background: var(--pn);
    border: 1px solid var(--line);
    border-radius: 8px;
    font-family: var(--font-mono);
    font-size: 0.74rem;
    line-height: 1.5;
    overflow-x: auto;
    white-space: pre;
    color: var(--fg);
  }
  .msg .head {
    color: var(--bad);
    font-weight: 700;
  }
  .msg .caret {
    color: var(--bad);
  }
  .msg .help {
    color: var(--ok);
  }
  .msg .nt {
    color: var(--ink-2);
  }
  .msg.ok {
    color: var(--ok);
  }
  .why {
    margin: 0;
    font-size: 0.86rem;
    line-height: 1.5;
    color: var(--ink-2);
  }
</style>
