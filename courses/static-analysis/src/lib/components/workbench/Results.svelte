<!--
  The outcome of a fixture run: one line per expected or actual issue, saying what matched and what did not.
-->
<script lang="ts">
  import type { FixtureReport } from '$lib/sa/runtime/run';

  let { report, onjump, hiddenSource }: { report: FixtureReport; onjump?: (line: number) => void; hiddenSource?: string } = $props();

  const ICON = { matched: '✓', missing: '✗', unexpected: '✗', mismatch: '≠' } as const;
  const WHAT = { matched: 'Expected issue raised', missing: 'Expected issue not raised', unexpected: 'Unexpected issue', mismatch: 'Issue raised, but' } as const;
  const passed = $derived(report.check.entries.filter((e) => e.verdict === 'matched').length);
</script>

<div class="fixture-result" class:pass={report.check.pass}>
  <p class="head">
    <span class="mark" aria-hidden="true">{report.check.pass ? '✓' : '✗'}</span>
    <span class="name">{report.name}</span>
    <span class="count">{passed}/{report.check.entries.length} issue{report.check.entries.length === 1 ? '' : 's'} as expected</span>
  </p>
  {#if report.check.errors.length}
    <ul class="errors">
      {#each report.check.errors as e, i (i)}<li>{e}</li>{/each}
    </ul>
  {/if}
  {#if report.check.entries.length === 0 && !report.check.errors.length}
    <p class="none">No issue expected, none raised.</p>
  {/if}
  <ul class="entries">
    {#each report.check.entries as e, i (i)}
      <li class="v-{e.verdict}">
        <button class="line" onclick={() => onjump?.(e.line)} disabled={!onjump} title="Show line {e.line}">
          <span class="icon" aria-hidden="true">{ICON[e.verdict]}</span> line {e.line}
        </button>
        <span class="what">{WHAT[e.verdict]}</span>
        {#if e.actual}<q class="msg">{e.actual.message}</q>{:else if e.expected?.message}<q class="msg expected">{e.expected.message}</q>{/if}
        {#if e.details.length}
          <ul class="details">
            {#each e.details as d, k (k)}<li>{d}</li>{/each}
          </ul>
        {/if}
      </li>
    {/each}
  </ul>
  {#if hiddenSource !== undefined}
    <details class="hidden-src">
      <summary>Show this hidden fixture</summary>
      <pre>{hiddenSource}</pre>
    </details>
  {/if}
</div>

<style>
  .fixture-result {
    border-left: 3px solid var(--bad);
    padding: 0.35rem 0 0.35rem 0.7rem;
    margin: 0.4rem 0;
  }
  .fixture-result.pass {
    border-left-color: var(--ok);
  }
  .head {
    margin: 0 0 0.25rem;
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
    flex-wrap: wrap;
  }
  .mark {
    font-weight: 800;
    color: var(--bad);
  }
  .pass .mark {
    color: var(--ok);
  }
  .name {
    font-family: var(--font-mono);
    font-weight: 700;
  }
  .count {
    color: var(--mute);
    font-size: 0.8rem;
  }
  .none {
    color: var(--mute);
    margin: 0;
  }
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .entries > li {
    padding: 0.15rem 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.2rem 0.5rem;
    align-items: baseline;
  }
  .line {
    font: inherit;
    font-family: var(--font-mono);
    font-size: 0.78rem;
    border: 1px solid var(--line-strong);
    border-radius: 3px;
    background: var(--panel);
    color: var(--fg);
    padding: 0 0.35rem;
    cursor: pointer;
    white-space: nowrap;
  }
  .line:disabled {
    cursor: default;
  }
  .v-matched .icon {
    color: var(--ok);
  }
  .v-missing .icon,
  .v-unexpected .icon {
    color: var(--bad);
  }
  .v-mismatch .icon {
    color: var(--maybe);
  }
  .what {
    font-size: 0.82rem;
  }
  .msg {
    font-size: 0.82rem;
    color: var(--ink-2);
  }
  .msg.expected {
    color: var(--mute);
  }
  .details {
    flex-basis: 100%;
    padding-left: 2.6rem;
    font-size: 0.8rem;
    color: var(--maybe);
  }
  .details li::before {
    content: '– ';
  }
  .errors {
    color: var(--bad);
    font-size: 0.82rem;
  }
  .hidden-src summary {
    cursor: pointer;
    font-size: 0.8rem;
    color: var(--accent-ink);
  }
  .hidden-src pre {
    font-size: 0.78rem;
    background: var(--pn);
    padding: 0.5rem;
    border-radius: 4px;
    overflow: auto;
  }
</style>
