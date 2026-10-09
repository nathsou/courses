<!--
  Follow the issue: a pipeline as a sequence of stages, each with the process it runs in, what happens there, a
  link into SonarJS at the pinned commit, and the shape of the data that crosses into the next stage.
  `:::follow-issue` with a ```yaml block: `stages: [{ lane, title, text, path?, symbol?, shape?, lang? }]`.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { SONARJS_COMMIT, SONARJS_SHORT } from '$content/outline';

  interface Stage {
    lane: string;
    title: string;
    text: string;
    path?: string;
    symbol?: string;
    shape?: string;
    lang?: string;
  }
  let { data, n, caption, title = 'Follow the issue' }: { data: { stages: Stage[]; subtitle?: string }; n?: string; caption?: string; title?: string } = $props();

  let i = $state(0);
  const stages = $derived(data.stages);
  const stage = $derived(stages[i]!);
  const lanes = $derived([...new Set(stages.map((s) => s.lane))]);
  const laneIndex = (lane: string) => lanes.indexOf(lane);

  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  /** Plain text with `code` spans and **bold**. */
  const rich = (s: string) =>
    escape(s)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  const href = (s: Stage) => `https://github.com/SonarSource/SonarJS/blob/${SONARJS_COMMIT}/${s.path}`;
</script>

<Widget {title} subtitle={data.subtitle ?? 'Step through the stages; each shows where it runs and the data it hands on.'} {n} {caption} onreset={() => (i = 0)}>
  <div class="fi ui">
    <ol class="track" aria-label="Stages">
      {#each stages as s, k (k)}
        <li>
          <button class:on={k === i} class:done={k < i} style:--lane="var(--lane-{laneIndex(s.lane) % 5})" onclick={() => (i = k)} aria-current={k === i ? 'step' : undefined} title={s.title}>
            <span class="num">{k + 1}</span>
          </button>
        </li>
      {/each}
    </ol>
    <div class="legend">
      {#each lanes as l, k (l)}<span class="lane" style:--lane="var(--lane-{k % 5})">{l}</span>{/each}
    </div>
    <section class="panel" style:--lane="var(--lane-{laneIndex(stage.lane) % 5})" aria-live="polite">
      <p class="where"><span class="lane-chip">{stage.lane}</span> Stage {i + 1} of {stages.length}</p>
      <h4>{stage.title}</h4>
      <p class="text">{@html rich(stage.text)}</p>
      {#if stage.path}
        <p class="src"><a href={href(stage)} target="_blank" rel="noopener"><code>{stage.path}</code>{#if stage.symbol} → <code>{stage.symbol}</code>{/if}</a> <span class="pin">SonarJS · {SONARJS_SHORT}</span></p>
      {/if}
      {#if stage.shape}
        <p class="shape-label">What crosses to the next stage{stage.lang ? ` (${stage.lang})` : ''}:</p>
        <pre class="shape">{stage.shape.trimEnd()}</pre>
      {/if}
      <div class="nav">
        <button onclick={() => (i = Math.max(0, i - 1))} disabled={i === 0}>← Previous</button>
        <button class="primary" onclick={() => (i = Math.min(stages.length - 1, i + 1))} disabled={i === stages.length - 1}>Next →</button>
      </div>
    </section>
  </div>
</Widget>

<style>
  .fi {
    --lane-0: #3b6fb6;
    --lane-1: #2f8a5b;
    --lane-2: #b4762a;
    --lane-3: #8a4fb0;
    --lane-4: #b0484f;
    display: grid;
    gap: 0.6rem;
  }
  .track {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    align-items: center;
  }
  .track button {
    width: 2rem;
    height: 2rem;
    border-radius: 50%;
    border: 2px solid var(--lane);
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
    font: inherit;
    font-size: 0.8rem;
    font-weight: 700;
  }
  .track button.done {
    background: color-mix(in srgb, var(--lane) 25%, var(--panel));
  }
  .track button.on {
    background: var(--lane);
    color: #fff;
  }
  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem 0.9rem;
    font-size: 0.78rem;
    color: var(--mute);
  }
  .lane::before {
    content: '';
    display: inline-block;
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 50%;
    background: var(--lane);
    margin-right: 0.3rem;
    vertical-align: -0.05rem;
  }
  .panel {
    border-left: 4px solid var(--lane);
    padding: 0.2rem 0 0.2rem 0.9rem;
  }
  .where {
    margin: 0;
    font-size: 0.78rem;
    color: var(--mute);
  }
  .lane-chip {
    color: var(--lane);
    font-weight: 700;
    margin-right: 0.4rem;
  }
  h4 {
    margin: 0.2rem 0 0.3rem;
    font-size: 1.05rem;
  }
  .text {
    margin: 0 0 0.4rem;
    font-size: 0.92rem;
    line-height: 1.5;
  }
  .src {
    font-size: 0.8rem;
    margin: 0 0 0.4rem;
  }
  .pin {
    color: var(--mute);
    font-size: 0.72rem;
    margin-left: 0.3rem;
  }
  .shape-label {
    font-size: 0.78rem;
    color: var(--mute);
    margin: 0.3rem 0 0.15rem;
  }
  .shape {
    margin: 0;
    font-family: var(--font-mono);
    font-size: 0.76rem;
    background: var(--pn);
    border-radius: 6px;
    padding: 0.6rem 0.7rem;
    overflow: auto;
    max-height: 22rem;
  }
  .nav {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.6rem;
  }
  .nav button {
    font: inherit;
    font-size: 0.82rem;
    padding: 0.25rem 0.8rem;
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
  }
  .nav button.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-fg, #fff);
  }
  .nav button:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
