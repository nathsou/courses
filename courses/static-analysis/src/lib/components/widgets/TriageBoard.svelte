<!--
  Triage: issue cards to classify (true positive, false positive, accept), each with its explanation once answered.
  `:::triage-board` with a ```yaml block: `issues: [{ rule, message, file, code, line?, verdict, why, fix? }]`
  where verdict is 'true positive' | 'false positive' | 'accept'.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';

  type Verdict = 'true positive' | 'false positive' | 'accept';
  interface Card {
    rule: string;
    message: string;
    file?: string;
    code: string;
    /** 1-based line within `code` that carries the issue. */
    line?: number;
    verdict: Verdict;
    why: string;
    /** For false positives: the exception a rule writer could add. */
    fix?: string;
  }
  let { data, n, caption, title = 'Triage' }: { data: { issues: Card[] }; n?: string; caption?: string; title?: string } = $props();

  const VERDICTS: { v: Verdict; label: string }[] = [
    { v: 'true positive', label: 'True positive: fix the code' },
    { v: 'false positive', label: 'False positive: the rule is wrong here' },
    { v: 'accept', label: 'Accept: right, but not worth fixing' },
  ];
  let answers = $state<(Verdict | null)[]>([]);
  $effect(() => {
    if (answers.length !== data.issues.length) answers = data.issues.map(() => null);
  });
  const score = $derived(answers.filter((a, i) => a !== null && a === data.issues[i]!.verdict).length);
  const answered = $derived(answers.filter((a) => a !== null).length);
  const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rich = (s: string) => escape(s).replace(/`([^`]+)`/g, '<code>$1</code>');
</script>

<Widget {title} subtitle="Decide what each issue deserves, as a reviewer would." {n} {caption} onreset={() => (answers = data.issues.map(() => null))}>
  <div class="tb ui">
    {#each data.issues as card, i (i)}
      <article class="card" class:right={answers[i] !== null && answers[i] === card.verdict} class:wrong={answers[i] !== null && answers[i] !== card.verdict}>
        <header>
          <span class="rule">{card.rule}</span>
          <span class="msg">{card.message}</span>
          {#if card.file}<span class="file">{card.file}</span>{/if}
        </header>
        <pre class="code">{#each card.code.trimEnd().split('\n') as l, k (k)}<span class="ln" class:hit={card.line === k + 1}>{l || ' '}</span>{/each}</pre>
        <div class="choices" role="radiogroup" aria-label="Verdict for issue {i + 1}">
          {#each VERDICTS as c (c.v)}
            <button role="radio" aria-checked={answers[i] === c.v} class:chosen={answers[i] === c.v} onclick={() => (answers[i] = c.v)}>{c.label}</button>
          {/each}
        </div>
        {#if answers[i] !== null}
          <div class="why" aria-live="polite">
            <p><strong>{answers[i] === card.verdict ? 'Yes.' : `Not quite: this is a ${card.verdict === 'accept' ? 'case to accept' : card.verdict}.`}</strong> {@html rich(card.why)}</p>
            {#if card.fix}<p class="fix"><strong>For the rule writer:</strong> {@html rich(card.fix)}</p>{/if}
          </div>
        {/if}
      </article>
    {/each}
    <p class="score" aria-live="polite">{answered === 0 ? `${data.issues.length} issues to triage.` : `${score} of ${answered} answered as a careful reviewer would.`}</p>
  </div>
</Widget>

<style>
  .tb {
    display: grid;
    gap: 0.8rem;
  }
  .card {
    border: 1px solid var(--line);
    border-left: 4px solid var(--line-strong);
    border-radius: 6px;
    padding: 0.6rem 0.8rem;
    background: var(--panel);
  }
  .card.right {
    border-left-color: var(--ok);
  }
  .card.wrong {
    border-left-color: var(--maybe);
  }
  header {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.6rem;
    align-items: baseline;
    font-size: 0.85rem;
  }
  .rule {
    font-family: var(--font-mono);
    font-weight: 700;
    color: var(--accent-ink);
  }
  .file {
    font-family: var(--font-mono);
    color: var(--mute);
    font-size: 0.76rem;
  }
  .code {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    background: var(--pn);
    border-radius: 4px;
    padding: 0.5rem 0.6rem;
    margin: 0.4rem 0;
    overflow: auto;
  }
  .code .ln {
    display: block;
    white-space: pre;
  }
  .code .hit {
    background: var(--amber-soft);
  }
  .choices {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .choices button {
    font: inherit;
    font-size: 0.8rem;
    padding: 0.25rem 0.6rem;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
  }
  .choices button.chosen {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-fg, #fff);
  }
  .why {
    font-size: 0.86rem;
    margin-top: 0.4rem;
  }
  .why p {
    margin: 0.2rem 0;
  }
  .fix {
    color: var(--ink-2);
  }
  .score {
    font-size: 0.85rem;
    margin: 0;
    color: var(--mute);
  }
</style>
