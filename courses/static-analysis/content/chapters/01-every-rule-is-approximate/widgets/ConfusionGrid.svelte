<!--
  Classify a rule's verdicts. Each card is a piece of code, with what the rule said about it. The reader decides
  whether the code really has the problem; the grid fills in true and false positives and negatives, and the
  precision and recall they give.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';

  interface Item {
    code: string;
    /** Did the rule raise an issue? */
    issue: boolean;
    /** Is there really a problem? */
    bug: boolean;
    why: string;
  }
  let { data, n, caption }: { data: { rule: string; items: Item[] }; n?: string; caption?: string } = $props();
  const items = $derived(data.items);
  const rule = $derived(data.rule);

  let answers = $state<(boolean | null)[]>([]);
  $effect(() => {
    if (answers.length !== items.length) answers = items.map(() => null);
  });

  const cell = (it: Item, bug: boolean) => (it.issue ? (bug ? 'TP' : 'FP') : bug ? 'FN' : 'TN');
  const counts = $derived.by(() => {
    const c = { TP: 0, FP: 0, FN: 0, TN: 0 };
    items.forEach((it, i) => {
      const a = answers[i];
      if (a !== null && a !== undefined) c[cell(it, a)]++;
    });
    return c;
  });
  const answered = $derived(answers.filter((a) => a !== null).length);
  const wrong = $derived(items.filter((it, i) => answers[i] !== null && answers[i] !== it.bug).length);
  const pct = (x: number, y: number) => (y === 0 ? '—' : `${Math.round((100 * x) / y)} %`);
</script>

<Widget title="True and false, positive and negative" subtitle={rule} {n} {caption} onreset={() => (answers = items.map(() => null))}>
  <ol class="cards ui">
    {#each items as it, i (i)}
      {@const a = answers[i]}
      <li class="card" class:raised={it.issue}>
        <pre><code>{it.code}</code></pre>
        <p class="said">{it.issue ? '⚑ The rule raises an issue' : '· No issue'}</p>
        <div class="choose" role="group" aria-label="Is there really a problem in card {i + 1}?">
          <span>Really a problem?</span>
          <button aria-pressed={a === true} onclick={() => (answers[i] = true)}>Yes</button>
          <button aria-pressed={a === false} onclick={() => (answers[i] = false)}>No</button>
        </div>
        {#if a !== null && a !== undefined}
          <p class="fb" class:ok={a === it.bug}>
            <strong>{cell(it, a)}{a === it.bug ? '' : ` (the course would say ${cell(it, it.bug)})`}.</strong>
            {it.why}
          </p>
        {/if}
      </li>
    {/each}
  </ol>
  <div class="grid ui" aria-live="polite">
    <table>
      <thead><tr><th></th><th>Really a problem</th><th>Not a problem</th></tr></thead>
      <tbody>
        <tr><th>Issue raised</th><td class="tp">TP {counts.TP}</td><td class="fp">FP {counts.FP}</td></tr>
        <tr><th>No issue</th><td class="fn">FN {counts.FN}</td><td class="tn">TN {counts.TN}</td></tr>
      </tbody>
    </table>
    <dl>
      <dt>Precision</dt><dd>{pct(counts.TP, counts.TP + counts.FP)}<span>of the issues are real</span></dd>
      <dt>Recall</dt><dd>{pct(counts.TP, counts.TP + counts.FN)}<span>of the real problems are found</span></dd>
    </dl>
    <p class="progress">{answered}/{items.length} classified{wrong ? `, ${wrong} differ from the course's reading` : ''}.</p>
  </div>
</Widget>

<style>
  .cards {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(15rem, 1fr));
    gap: 0.7rem;
  }
  .card {
    border: 1px solid var(--line);
    border-radius: var(--radius-sm);
    background: var(--panel);
    padding: 0.5rem 0.65rem;
    font-size: 0.82rem;
  }
  .card.raised {
    border-left: 3px solid var(--amber);
  }
  pre {
    margin: 0 0 0.4rem;
    font-size: 0.76rem;
    white-space: pre-wrap;
    background: var(--pn);
    padding: 0.35rem 0.45rem;
    border-radius: 3px;
  }
  .said {
    margin: 0 0 0.35rem;
    font-weight: 600;
  }
  .choose {
    display: flex;
    gap: 0.35rem;
    align-items: center;
    flex-wrap: wrap;
  }
  .choose span {
    color: var(--mute);
    margin-right: 0.2rem;
  }
  .choose button {
    border: 1px solid var(--line-strong);
    background: var(--panel);
    border-radius: 3px;
    padding: 0.05rem 0.55rem;
    cursor: pointer;
  }
  .choose button[aria-pressed='true'] {
    background: var(--accent-soft);
    border-color: var(--accent);
    font-weight: 700;
  }
  .fb {
    margin: 0.4rem 0 0;
    padding: 0.3rem 0.45rem;
    border-radius: 3px;
    background: var(--maybe-soft);
  }
  .fb.ok {
    background: var(--ok-soft);
  }
  .grid {
    display: flex;
    flex-wrap: wrap;
    gap: 1.2rem;
    align-items: center;
    margin-top: 1rem;
  }
  table {
    border-collapse: collapse;
    font-size: 0.85rem;
  }
  th,
  td {
    border: 1px solid var(--line);
    padding: 0.3rem 0.6rem;
    text-align: center;
  }
  th {
    font-weight: 600;
    color: var(--ink-2);
  }
  .tp,
  .tn {
    background: var(--ok-soft);
  }
  .fp,
  .fn {
    background: var(--bad-soft);
  }
  dl {
    display: grid;
    grid-template-columns: auto auto;
    gap: 0.2rem 0.7rem;
    margin: 0;
    font-size: 0.88rem;
  }
  dt {
    font-weight: 700;
  }
  dd {
    margin: 0;
    font-family: var(--font-mono);
  }
  dd span {
    font-family: var(--font-ui);
    color: var(--mute);
    margin-left: 0.5rem;
    font-size: 0.8rem;
  }
  .progress {
    color: var(--mute);
    font-size: 0.82rem;
    margin: 0;
    flex-basis: 100%;
  }
</style>
