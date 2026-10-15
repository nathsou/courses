<!--
  Find the bug: a short program, shown line by line. Click the line where things go wrong and, when the exercise
  asks, say what kind of error it is. Wrong picks get the author's note for that line when there is one.
  Spec: { id, title, prompt, code, lang?, lineHtml (added by the compiler), answer: { line | lines, kind? },
          kinds?: [{ id, label }], notes?: { [line]: text }, explain?, hints? }
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { progress } from '$lib/state/progress.svelte';
  import ExerciseFrame from './ExerciseFrame.svelte';
  import Verdict from './parts/Verdict.svelte';
  import type { ExerciseBase } from './types';

  interface Spec extends ExerciseBase {
    code: string;
    lineHtml?: string[];
    answer: { line?: number; lines?: number[]; kind?: string };
    kinds?: { id: string; label: string }[];
    notes?: Record<string, string>;
  }
  let { spec }: { spec: Spec } = $props();

  const lines = $derived(spec.lineHtml ?? spec.code.replace(/\n$/, '').split('\n'));
  const right = $derived(spec.answer.lines ?? (spec.answer.line !== undefined ? [spec.answer.line] : []));
  let picked = $state<number | null>(null);
  let kind = $state<string | null>(null);
  let verdict = $state<{ ok: boolean; msg: string } | null>(null);
  let tries = $state(0);
  /** Notes are short plain text with `code` spans. */
  const inline = (t: string) => t.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!).replace(/`([^`]+)`/g, '<code>$1</code>');

  onMount(() => {
    progress.load();
    if (progress.isSolved(spec.id)) {
      picked = right[0] ?? null;
      kind = spec.answer.kind ?? null;
    }
  });

  function pick(n: number) {
    picked = n;
    verdict = null;
  }
  function check() {
    if (picked === null) {
      verdict = { ok: false, msg: 'Click the line first.' };
      return;
    }
    if (spec.kinds && !kind) {
      verdict = { ok: false, msg: 'Now say what kind of error it is.' };
      return;
    }
    tries++;
    const lineOk = right.includes(picked);
    const kindOk = !spec.kinds || !spec.answer.kind || kind === spec.answer.kind;
    if (lineOk && kindOk) {
      verdict = { ok: true, msg: 'Found it.' };
      progress.markSolved(spec.id);
      return;
    }
    const note = spec.notes?.[String(picked)];
    if (!lineOk) verdict = { ok: false, msg: note ?? `Not line ${picked}.${tries >= 3 && right.length ? ` The bug is within lines ${Math.max(1, Math.min(...right) - 2)}–${Math.min(lines.length, Math.max(...right) + 2)}.` : ''}` };
    else verdict = { ok: false, msg: `Right line, but not ${spec.kinds?.find((k) => k.id === kind)?.label ?? 'that'}.` };
  }
</script>

<ExerciseFrame id={spec.id} kind="Find the bug" title={spec.title} prompt={spec.prompt} hints={spec.hints ?? []} solution={spec.solution}>
  <div class="code shiki" role="listbox" aria-label="Program lines: pick the faulty one">
    {#each lines as html, i (i)}
      {@const n = i + 1}
      <button
        type="button"
        role="option"
        aria-selected={picked === n}
        class="ln"
        class:sel={picked === n}
        class:good={verdict?.ok && picked === n}
        class:bad={verdict && !verdict.ok && picked === n && !right.includes(n)}
        onclick={() => pick(n)}
      ><span class="no">{n}</span><span class="src">{@html html}</span></button>
    {/each}
  </div>
  {#if spec.kinds}
    <div class="kinds ui" role="radiogroup" aria-label="Kind of error">
      {#each spec.kinds as k (k.id)}
        <button type="button" role="radio" aria-checked={kind === k.id} class:on={kind === k.id} onclick={() => ((kind = k.id), (verdict = null))}>{k.label}</button>
      {/each}
    </div>
  {/if}
  <div class="act ui">
    <button type="button" class="go" onclick={check}>Check</button>
    {#if picked !== null}<span class="mute">Line {picked}{kind ? `, ${spec.kinds?.find((k) => k.id === kind)?.label}` : ''}</span>{/if}
  </div>
  {#if verdict}<Verdict ok={verdict.ok}>{@html inline(verdict.msg)}</Verdict>{#if verdict.ok && spec.explain}<div class="explain">{@html spec.explain}</div>{/if}{/if}
</ExerciseFrame>

<style>
  .code {
    font-family: var(--font-mono);
    font-size: 0.84rem;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--code-bg, var(--panel));
    padding: 0.35rem 0;
    overflow-x: auto;
  }
  .ln {
    display: flex;
    width: 100%;
    text-align: left;
    font: inherit;
    border: 0;
    border-left: 3px solid transparent;
    background: none;
    color: inherit;
    padding: 0.05rem 0.6rem 0.05rem 0;
    cursor: pointer;
    white-space: pre;
  }
  .ln:hover {
    background: color-mix(in srgb, var(--copper) 9%, transparent);
  }
  .ln.sel {
    background: color-mix(in srgb, var(--violet) 16%, transparent);
    border-left-color: var(--violet);
  }
  .ln.good {
    background: var(--ok-soft);
    border-left-color: var(--ok);
  }
  .ln.bad {
    background: color-mix(in srgb, var(--uaf) 14%, transparent);
    border-left-color: var(--uaf);
  }
  .no {
    display: inline-block;
    width: 2.6em;
    padding-right: 0.8em;
    text-align: right;
    color: var(--mute);
    user-select: none;
    flex: none;
  }
  .src :global(code),
  .src :global(.line) {
    font: inherit;
    background: none;
    padding: 0;
  }
  .kinds {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: 0.6rem;
    font-size: 0.82rem;
  }
  .kinds button {
    font: inherit;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 99px;
    padding: 0.15rem 0.7rem;
    cursor: pointer;
  }
  .kinds button.on {
    background: var(--violet);
    border-color: var(--violet);
    color: var(--on-accent);
    font-weight: 600;
  }
  .act {
    display: flex;
    gap: 0.7rem;
    align-items: center;
    margin-top: 0.6rem;
    font-size: 0.85rem;
  }
  .go {
    border: 1px solid var(--accent);
    background: var(--accent);
    color: var(--on-accent);
    border-radius: 6px;
    padding: 0.35rem 0.9rem;
    font-weight: 600;
    cursor: pointer;
    font: inherit;
  }
  .mute {
    color: var(--mute);
  }
  .explain {
    margin-top: 0.5rem;
    font-size: 0.92rem;
  }
</style>
