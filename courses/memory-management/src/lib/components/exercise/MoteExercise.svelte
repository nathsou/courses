<!--
  A Mote exercise (```mote-task blocks): the reader fixes or writes a Mote program, which runs under the given
  memory-management setting and is checked for the expected output, memory errors and leaks. The result is bound
  to the code it was computed from. Spec: { id, title, prompt, setting, starter, solution, expect?, leaks?, hints?, explain? }
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { progress } from '$lib/state/progress.svelte';
  import ExerciseFrame from './ExerciseFrame.svelte';
  import CodeEditor from '$lib/exercise/CodeEditor.svelte';
  import { checkMote, type MoteVerdict } from '$lib/mm/mote/task';
  import { SETTINGS, type Setting } from '$lib/mm/managers/managers';
  import Icon from '../ui/Icon.svelte';

  interface Spec {
    id: string;
    title?: string;
    prompt?: string;
    setting: Setting;
    starter: string;
    solution?: string;
    expect?: string[] | string;
    leaks?: boolean;
    hints?: string[];
    explain?: string;
  }
  let { spec }: { spec: Spec } = $props();

  let code = $state(spec.starter);
  let editor = $state<CodeEditor | undefined>();
  let verdict = $state<MoteVerdict | null>(null);
  let ranOn = $state<string | null>(null);
  let showSolution = $state(false);
  const stale = $derived(verdict !== null && ranOn !== code);
  const setting = $derived(SETTINGS.find((s) => s.id === spec.setting));

  onMount(() => {
    progress.load();
    const d = progress.draft<string>(spec.id, spec.starter);
    if (d !== spec.starter) {
      code = d;
      editor?.setValue(d);
    }
  });

  function run() {
    progress.saveDraft(spec.id, code);
    const submitted = code;
    verdict = checkMote(submitted, { setting: spec.setting, expect: spec.expect, leaks: spec.leaks });
    ranOn = submitted;
    if (verdict.ok) progress.markSolved(spec.id);
  }

  function reset() {
    code = spec.starter;
    editor?.setValue(spec.starter);
    verdict = null;
  }
</script>

<ExerciseFrame id={spec.id} kind="Fix it" title={spec.title} prompt={spec.prompt} hints={spec.hints}>
  <p class="setting ui">Runs under: <strong>{setting?.label ?? spec.setting}</strong></p>
  <CodeEditor bind:this={editor} value={code} lang="mote" onchange={(c) => (code = c)} onrun={run} highlightLine={verdict && !stale ? verdict.error?.line : undefined} label="Your program for {spec.title ?? 'this exercise'}" minLines={Math.min(18, spec.starter.split('\n').length + 1)} />
  <div class="bar ui">
    <button class="run" onclick={run}><Icon name="play" size={14} /> Run it</button>
    <span class="kbd">Ctrl/⌘ + Enter</span>
    <span class="spacer"></span>
    <button class="ghost" onclick={reset}><Icon name="reset" size={14} /> Reset</button>
    {#if spec.solution}
      <button class="ghost" onclick={() => (showSolution = !showSolution)}><Icon name="eye" size={14} /> {showSolution ? 'Hide' : 'Show'} a solution</button>
    {/if}
  </div>
  {#if verdict}
    <div class="report ui" class:stale aria-live="polite">
      {#if stale}<p class="stale-note">You have edited the code since this run: the results below are for the previous version.</p>{/if}
      <p>
        {#if verdict.ok}<span class="vchip ok">✓ every check passed on this code</span>
        {:else}<span class="vchip bad">✗ {verdict.checks.filter((c) => !c.passed).length} of {verdict.checks.length} checks failed</span>{/if}
      </p>
      <ul class="tests">
        {#each verdict.checks as c (c.name)}
          <li class:fail={!c.passed}>
            <span class="mark">{c.passed ? '✓' : '✗'}</span> {c.name}
            {#if c.detail && !c.passed}<div class="msg">{c.detail}</div>{/if}
          </li>
        {/each}
      </ul>
      {#if verdict.output.length}
        <details class="logs" open><summary>Output ({verdict.output.length})</summary><pre>{verdict.output.join('\n')}</pre></details>
      {/if}
    </div>
  {/if}
  {#if verdict?.ok && !stale && spec.explain}<div class="explain">{@html spec.explain}</div>{/if}
  {#if showSolution && spec.solution}
    <div class="solution"><CodeEditor value={spec.solution} lang="mote" readonly label="A solution" minLines={4} /></div>
  {/if}
</ExerciseFrame>

<style>
  .setting {
    font-size: 0.8rem;
    color: var(--ink-2);
    margin: 0 0 0.4rem;
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.6rem;
    font-size: 0.86rem;
  }
  .spacer {
    flex: 1;
  }
  button {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    border-radius: var(--radius-sm);
    padding: 0.35rem 0.75rem;
    cursor: pointer;
    font-weight: 600;
  }
  .run {
    background: var(--copper);
    color: var(--on-accent);
    border: 1px solid var(--copper);
  }
  .run:disabled {
    opacity: 0.6;
  }
  .ghost {
    background: var(--panel);
    border: 1px solid var(--line-strong);
    font-weight: 500;
  }
  .kbd {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--mute);
  }
  .report {
    margin-top: 0.8rem;
    font-size: 0.88rem;
  }
  .report.stale {
    opacity: 0.6;
  }
  .stale-note {
    color: var(--maybe);
    font-size: 0.82rem;
  }
  .tests {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0;
  }
  .tests li {
    padding: 0.2rem 0;
  }
  .mark {
    color: var(--ok);
    font-weight: 700;
  }
  .fail .mark {
    color: var(--bad);
  }
  .msg {
    margin: 0.2rem 0 0.3rem 1.3rem;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--bad);
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .logs pre {
    font-size: 0.76rem;
    max-height: 12rem;
    overflow: auto;
  }
  .explain {
    margin-top: 0.8rem;
    padding: 0.6rem 0.8rem;
    border-left: 3px solid var(--ok);
    background: var(--ok-soft);
    font-size: 0.95rem;
  }
  .solution {
    margin-top: 0.8rem;
  }
</style>
