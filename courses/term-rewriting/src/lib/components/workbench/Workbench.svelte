<!--
  The workbench: every ```girafe listing in the course compiles to one. An editable rule file with
  live diagnostics, and tabs that run the file's queries, trace a reduction step by step, try to
  prove termination and confluence, run completion, apply strategies or saturate an e-graph.
  Everything runs on the reference engine, in the page, with fuel limits.
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import CodeEditor from '../exercise/CodeEditor.svelte';
  import Segmented from '../ui/Segmented.svelte';
  import Icon from '../ui/Icon.svelte';
  import TermTree from '../term/TermTree.svelte';
  import { parseProgram, parseTerm, showRule, type Program } from '$lib/trs/parse';
  import { show as showT, showPos, type Term, type Position } from '$lib/trs/term';
  import { evaluate, fromProgram, redexes, step as stepWith, contract, unfreeze, type Step, type Strategy, type Redex } from '$lib/trs/rewrite';
  import { acNormalize, flatten, unflatten } from '$lib/trs/ac';
  import { proveTermination, describeTermination, type TerminationProof } from '$lib/trs/termination';
  import { checkConfluence, describeConfluence, type ConfluenceVerdict } from '$lib/trs/confluence';
  import { complete, prove, type CompletionResult, type ProofResult } from '$lib/trs/completion';
  import { lpo, kbo, precedence as mkPrec } from '$lib/trs/orders';
  import { envFromProgram, runStrategy } from '$lib/trs/strategy';
  import { simplify, type SaturationReport } from '$lib/trs/egraph';
  import { showPoly } from '$lib/trs/poly';
  import { rng } from '$lib/trs/rewrite';

  type Tool = 'run' | 'trace' | 'termination' | 'confluence' | 'completion' | 'strategy' | 'saturate';
  const TOOL_LABEL: Record<Tool, string> = { run: 'Run', trace: 'Trace', termination: 'Termination', confluence: 'Confluence', completion: 'Completion', strategy: 'Strategy', saturate: 'Saturate' };

  let {
    source,
    tools = 'run',
    query,
    strategy = 'innermost',
    title,
    caption,
    lines,
    readonly = false,
    fuel = 200_000,
    order = 'lpo',
    id,
  }: {
    source: string;
    /** Comma-separated tabs: run, trace, termination, confluence, completion, strategy, saturate (or "all"). */
    tools?: string;
    /** A query to use instead of the file's `?` lines. */
    query?: string;
    strategy?: Strategy | 'manual';
    title?: string;
    caption?: string;
    lines?: number;
    readonly?: boolean;
    fuel?: number;
    /** The reduction order for completion: lpo or kbo (with the file's #precedence). */
    order?: 'lpo' | 'kbo';
    id?: string;
  } = $props();

  // svelte-ignore state_referenced_locally
  const toolList: Tool[] = (tools === 'all' ? 'run,trace,termination,confluence,completion,strategy,saturate' : tools).split(',').map((s) => s.trim()).filter((s): s is Tool => s in TOOL_LABEL);
  // svelte-ignore state_referenced_locally
  let src = $state(source);
  // svelte-ignore state_referenced_locally
  let tab = $state<Tool>(toolList[0] ?? 'run');
  let editor: CodeEditor | undefined = $state();

  const program: Program = $derived(parseProgram(src));
  const errors = $derived(program.diagnostics.filter((d) => d.severity === 'error'));
  const fx = $derived(program.fixity);
  const ac = $derived(program.ac);
  const show = (t: Term) => showT(ac.size ? unflatten(t, ac) : unfreeze(t), fx);

  /** The queries: the `query` prop, or the file's `?` lines. */
  const queries = $derived.by((): { term: Term; goal?: Term; text: string }[] => {
    if (query) {
      try {
        const parts = query.split(/\s+==\s+/);
        const term = parseTerm(parts[0]!, fx);
        return [{ term, goal: parts[1] ? parseTerm(parts[1], fx) : undefined, text: query }];
      } catch {
        return [];
      }
    }
    return program.queries.map((q) => ({ term: q.term, goal: q.goal, text: show(q.term) + (q.goal ? ` == ${show(q.goal)}` : '') }));
  });

  // ───────────── run ─────────────
  interface RunRow {
    text: string;
    result?: string;
    note: string;
    ok: boolean;
  }
  const runRows = $derived.by((): RunRow[] => {
    if (tab !== 'run' || errors.length) return [];
    const sys = fromProgram(program);
    return queries.map((q) => {
      const t0 = performance.now();
      try {
        const nf = (t: Term) => (ac.size ? acNormalize({ rules: program.rules, ac }, t, fuel) : (() => {
          const r = evaluate(sys, t, { fuel });
          return { term: r.term, steps: r.steps, normal: r.normal };
        })());
        const a = nf(q.term);
        if (q.goal) {
          const b = nf(q.goal);
          const same = showT(ac.size ? flatten(a.term, ac) : a.term) === showT(ac.size ? flatten(b.term, ac) : b.term);
          return { text: q.text, result: same ? `${show(a.term)}  (both sides)` : `${show(a.term)}  ≠  ${show(b.term)}`, note: same ? 'equal: same normal form' : a.normal && b.normal ? 'different normal forms' : 'stopped: out of fuel', ok: same };
        }
        const ms = performance.now() - t0;
        return { text: q.text, result: show(a.term), note: a.normal ? `${a.steps.toLocaleString('en-GB')} step${a.steps === 1 ? '' : 's'} · ${ms < 1 ? '<1' : ms.toFixed(0)} ms` : `stopped after ${a.steps.toLocaleString('en-GB')} steps (no normal form reached)`, ok: a.normal };
      } catch (e) {
        return { text: q.text, note: e instanceof Error ? e.message : String(e), ok: false };
      }
    });
  });

  // ───────────── trace ─────────────
  let traceQuery = $state(0);
  // svelte-ignore state_referenced_locally
  let traceStrategy = $state<Strategy | 'manual'>(strategy);
  let history = $state<{ term: Term; step?: Step }[]>([]);
  let traceKey = $state('');
  const traceSys = $derived(fromProgram(program));
  const current = $derived(history.at(-1)?.term);
  const random = rng(7);
  const nextStep = $derived.by((): Step | null => {
    if (!current || traceStrategy === 'manual') return null;
    try {
      return stepWith(traceSys, current, traceStrategy, random);
    } catch {
      return null;
    }
  });
  const allRedexes = $derived(current ? safeRedexes(current) : []);
  function safeRedexes(t: Term): Redex[] {
    try {
      return redexes(traceSys, t);
    } catch {
      return [];
    }
  }
  $effect(() => {
    const k = `${src}|${traceQuery}|${queries[traceQuery]?.text ?? ''}`;
    if (k !== traceKey) {
      traceKey = k;
      const q = queries[traceQuery];
      history = q ? [{ term: q.term }] : [];
    }
  });
  function doStep() {
    if (nextStep) history = [...history, { term: nextStep.after, step: nextStep }];
  }
  function pick(p: Position) {
    if (!current) return;
    const r = allRedexes.find((x) => x.pos.length === p.length && x.pos.every((v, i) => v === p[i]));
    if (!r) return;
    history = [...history, { term: contract(current, r), step: { before: current, after: contract(current, r), redexes: [r] } }];
  }
  function runToEnd() {
    let h = history.slice();
    for (let i = 0; i < 300; i++) {
      const cur = h.at(-1)!.term;
      const s = stepWith(traceSys, cur, traceStrategy === 'manual' ? 'innermost' : traceStrategy, random);
      if (!s) break;
      h.push({ term: s.after, step: s });
    }
    history = h;
  }
  const causeLabel = (s: Step) =>
    s.redexes
      .map((r) => (r.cause.kind === 'rule' ? (r.cause.rule.label ?? `rule ${r.cause.index + 1}`) : r.cause.name === 'force' ? 'force a lazy term' : `built-in ${r.cause.name}`) + ` at ${showPos(r.pos)}`)
      .join(', ');
  const shownRedex = $derived(traceStrategy === 'manual' ? null : (nextStep?.redexes[0]?.pos ?? null));

  // ───────────── termination / confluence / completion ─────────────
  let termResult = $state<TerminationProof | null>(null);
  let confResult = $state<ConfluenceVerdict | null>(null);
  let compResult = $state<CompletionResult | null>(null);
  let proofResults = $state<{ text: string; r: ProofResult }[]>([]);
  let busy = $state(false);
  let analysedFor = $state('');
  $effect(() => {
    if (src !== analysedFor) {
      termResult = null;
      confResult = null;
      compResult = null;
      proofResults = [];
    }
  });
  const later = (fn: () => void) => {
    busy = true;
    setTimeout(() => {
      try {
        fn();
      } finally {
        busy = false;
        analysedFor = src;
      }
    }, 20);
  };
  function runTermination() {
    later(() => (termResult = proveTermination(program.rules)));
  }
  function runConfluence() {
    later(() => (confResult = checkConfluence(program.rules)));
  }
  const precList = $derived(program.precedence ?? defaultPrecedence(program));
  function defaultPrecedence(p: Program): string[] {
    const syms = new Map<string, number>();
    const visit = (t: Term) => {
      if (t.type === 'fn') {
        if (!syms.has(t.name)) syms.set(t.name, t.args.length);
        t.args.forEach(visit);
      }
    };
    for (const e of p.equations) (visit(e.left), visit(e.right));
    for (const r of p.rules) (visit(r.lhs), visit(r.rhs));
    // Higher arity first, then order of appearance (unary inverses above binary products is set by #precedence).
    return [...syms.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
  }
  function makeOrder(extra: string[] = []) {
    const prec = mkPrec([...precList, ...extra]);
    return order === 'kbo' ? kbo({ prec }) : lpo(prec);
  }
  function runCompletion() {
    later(() => {
      const eqs = [...program.equations.map((e) => [e.left, e.right] as [Term, Term]), ...program.rules.map((r) => [r.lhs, r.rhs] as [Term, Term])];
      compResult = complete(eqs, makeOrder(), { maxSteps: 3000, maxRules: 80 });
      proofResults = queries
        .filter((q) => q.goal)
        .map((q) => {
          const skolems = [...new Set([...collectVars(q.term), ...collectVars(q.goal!)])].map((x) => `$${x}`);
          return { text: q.text, r: prove(eqs, [q.term, q.goal!], makeOrder(skolems)) };
        });
    });
  }
  function collectVars(t: Term, out: string[] = []): string[] {
    if (t.type === 'var') out.push(t.name);
    else t.args.forEach((a) => collectVars(a, out));
    return out;
  }

  // ───────────── strategies ─────────────
  const strategyNames = $derived([...program.strategies.keys()]);
  let strategyName = $state('');
  let strategyExpr = $state('');
  $effect(() => {
    if (!strategyNames.includes(strategyName)) strategyName = strategyNames[0] ?? '';
  });
  const strategyRows = $derived.by(() => {
    if (tab !== 'strategy' || errors.length) return [];
    const expr = strategyExpr.trim() || strategyName;
    if (!expr) return [];
    return queries.map((q) => {
      const r = runStrategy(expr, q.term, envFromProgram(program));
      return { text: q.text, result: r.term ? show(r.term) : null, log: r.log, error: r.error };
    });
  });

  // ───────────── saturation ─────────────
  let satResult = $state<{ text: string; result: string; cost: number; report: SaturationReport; classes: number; nodes: number }[] | null>(null);
  function runSaturation() {
    later(() => {
      satResult = queries.map((q) => {
        const r = simplify(q.term, program.rules, { iterations: 15, nodes: 4000 });
        return { text: q.text, result: show(r.term), cost: r.cost, report: r.report, classes: r.graph.size.classes, nodes: r.graph.size.nodes };
      });
    });
  }

  function reset() {
    src = source;
    editor?.setValue(source);
  }
  onMount(() => {
    if (!toolList.includes(tab)) tab = toolList[0] ?? 'run';
  });
  const minLines = $derived(lines ?? Math.min(18, Math.max(3, source.split('\n').length)));
</script>

<figure class="wb" id={id}>
  <header class="ui">
    <span class="kind">Girafe</span>
    {#if title}<span class="title">{title}</span>{/if}
    <span class="spacer"></span>
    {#if !readonly && src !== source}<button class="icon" onclick={reset} title="Restore the original rules" aria-label="Restore the original rules"><Icon name="reset" size={14} /></button>{/if}
  </header>
  <CodeEditor bind:this={editor} value={src} path="workbench.grf" language="girafe" {readonly} onchange={(v) => (src = v)} onrun={() => (tab === 'trace' ? doStep() : null)} {minLines} label="Rewrite rules" />
  {#if errors.length}
    <p class="errors ui" role="status">{errors.length} error{errors.length > 1 ? 's' : ''}: line {errors[0]!.line}: {errors[0]!.message}</p>
  {/if}
  {#if toolList.length > 1}
    <div class="tabs ui"><Segmented size="sm" label="Tool" options={toolList.map((t) => ({ value: t, label: TOOL_LABEL[t] }))} bind:value={tab} /></div>
  {/if}

  <div class="out ui" aria-live="polite">
    {#if tab === 'run'}
      {#if !queries.length}
        <p class="muted">Add a query line such as <code>? +(S(0), S(0))</code> to evaluate a term.</p>
      {:else}
        <ul class="rows">
          {#each runRows as r, i (i)}
            <li class:bad={!r.ok}>
              <code class="q">{r.text}</code>
              {#if r.result !== undefined}<span class="arrow">⟶</span><code class="res">{r.result}</code>{/if}
              <span class="note">{r.note}</span>
            </li>
          {/each}
        </ul>
      {/if}
    {:else if tab === 'trace'}
      {#if !queries.length}
        <p class="muted">Add a query line (<code>? term</code>) to trace its reduction.</p>
      {:else if current}
        <div class="controls">
          {#if queries.length > 1}
            <label>Query <select bind:value={traceQuery}>{#each queries as q, i (i)}<option value={i}>{q.text}</option>{/each}</select></label>
          {/if}
          <label>Strategy
            <select bind:value={traceStrategy}>
              <option value="innermost">leftmost-innermost</option>
              <option value="outermost">leftmost-outermost</option>
              <option value="parallel-outermost">parallel-outermost</option>
              <option value="rightmost-innermost">rightmost-innermost</option>
              <option value="random">random</option>
              <option value="manual">you choose (click a redex)</option>
            </select>
          </label>
          <span class="btns">
            <button onclick={() => (history = history.slice(0, 1))} disabled={history.length < 2} aria-label="Back to the start">⏮</button>
            <button onclick={() => (history = history.slice(0, -1))} disabled={history.length < 2} aria-label="Undo one step">◀</button>
            <button class="primary" onclick={doStep} disabled={!nextStep} aria-label="One step">Step ▶</button>
            <button onclick={runToEnd} disabled={traceStrategy !== 'manual' ? !nextStep : allRedexes.length === 0} aria-label="Run to the normal form">⏭</button>
          </span>
        </div>
        <div class="tree-wrap">
          <TermTree term={current} redex={shownRedex} clickable={traceStrategy === 'manual' ? allRedexes.map((r) => r.pos) : []} onpick={pick} label={(t) => (t.type === 'fn' && t.name === '?' ? '?' : t.name)} />
        </div>
        <p class="status">
          <code>{show(current)}</code>
          {#if allRedexes.length === 0}<span class="nf">normal form after {history.length - 1} step{history.length === 2 ? '' : 's'}</span>
          {:else}<span class="note">{allRedexes.length} redex{allRedexes.length === 1 ? '' : 'es'}{traceStrategy === 'manual' ? ': click one in the tree' : nextStep ? `; next: ${causeLabel(nextStep)}` : ''}</span>{/if}
        </p>
        {#if history.length > 1}
          <ol class="hist">
            {#each history as h, i (i)}
              {#if i > 0}<li><code>{show(h.term)}</code> <span class="note">{causeLabel(h.step!)}</span></li>{/if}
            {/each}
          </ol>
        {/if}
      {/if}
    {:else if tab === 'termination'}
      <button class="primary" onclick={runTermination} disabled={busy || errors.length > 0}>{busy ? 'Searching…' : 'Prove termination'}</button>
      {#if termResult}
        <p class:ok={termResult.result === 'terminating'} class:bad={termResult.result === 'non-terminating'}>{describeTermination(termResult)}</p>
        {#if termResult.result === 'terminating' && termResult.method === 'dependency pairs'}
          <ul class="rows small">
            {#each termResult.proof.pairs as p, i (i)}<li><code>{show(p.lhs)} → {show(p.rhs)}</code></li>{/each}
          </ul>
          <ul class="rows small">
            {#each termResult.proof.steps as s, i (i)}<li>{s.method} removes {s.removed.length} pair{s.removed.length === 1 ? '' : 's'}: {s.detail}</li>{/each}
          </ul>
        {:else if termResult.result === 'terminating' && termResult.method === 'polynomial'}
          <ul class="rows small">{#each [...termResult.interpretation] as [s, p] (s)}<li><code>[{s}] = {showPoly(p)}</code></li>{/each}</ul>
        {/if}
      {/if}
    {:else if tab === 'confluence'}
      <button class="primary" onclick={runConfluence} disabled={busy || errors.length > 0}>{busy ? 'Checking…' : 'Check confluence'}</button>
      {#if confResult}
        <p class:ok={confResult.result === 'confluent'} class:bad={confResult.result === 'not confluent'}>{describeConfluence(confResult)}</p>
        {#if confResult.joins.length}
          <p class="muted">{confResult.joins.length} critical pair{confResult.joins.length === 1 ? '' : 's'}:</p>
          <ul class="rows small">
            {#each confResult.joins as j, i (i)}
              <li class:bad={!j.joinable}>
                <span class="note">rules {j.pair.outer + 1} and {j.pair.inner + 1} at {showPos(j.pair.pos)}:</span>
                <code>{show(j.pair.left)}</code> ← <code>{show(j.pair.peak)}</code> → <code>{show(j.pair.right)}</code>
                <span class="note">{j.joinable ? `join at ${show(j.leftNF)}` : `normal forms ${show(j.leftNF)} and ${show(j.rightNF)}`}</span>
              </li>
            {/each}
          </ul>
        {:else}<p class="muted">No critical pairs: no two rules overlap.</p>{/if}
      {/if}
    {:else if tab === 'completion'}
      <p class="muted">Order: {order.toUpperCase()} with precedence {precList.join(' > ')}{program.precedence ? '' : ' (add a #precedence line to change it)'}.</p>
      <button class="primary" onclick={runCompletion} disabled={busy || errors.length > 0}>{busy ? 'Completing…' : 'Run completion'}</button>
      {#if compResult}
        <p class:ok={compResult.status === 'success'} class:bad={compResult.status !== 'success'}>
          {compResult.status === 'success' ? `Success: ${compResult.rules.length} rules, convergent.` : compResult.status === 'failed' ? `Failed: cannot orient ${show(compResult.stuck![0])} = ${show(compResult.stuck![1])}.` : 'Gave up after the step limit.'}
          <span class="note">{compResult.steps.length} inference steps</span>
        </p>
        <ol class="rows small">{#each compResult.rules as r, i (i)}<li><code>{showRule(r, fx)}</code></li>{/each}</ol>
        <details>
          <summary>The inference steps</summary>
          <ol class="rows small">{#each compResult.steps as s, i (i)}<li><span class="tag">{s.rule}</span> {s.note}</li>{/each}</ol>
        </details>
      {/if}
      {#each proofResults as p, i (i)}
        <p class:ok={p.r.status === 'proved'} class:bad={p.r.status === 'disproved'}>
          Goal <code>{p.text}</code>: {p.r.status === 'proved' ? `proved by unfailing completion (${p.r.iterations} iterations)` : p.r.status === 'disproved' ? 'not provable: saturation found no proof' : 'gave up'}
        </p>
      {/each}
    {:else if tab === 'strategy'}
      <div class="controls">
        {#if strategyNames.length}
          <label>Strategy <select bind:value={strategyName}>{#each strategyNames as s (s)}<option value={s}>{s} = {program.strategies.get(s)}</option>{/each}</select></label>
        {/if}
        <label class="grow">Or type one <input type="text" bind:value={strategyExpr} placeholder="e.g. innermost(rules)" spellcheck="false" /></label>
      </div>
      <ul class="rows">
        {#each strategyRows as r, i (i)}
          <li class:bad={!r.result}>
            <code class="q">{r.text}</code><span class="arrow">⟶</span>{#if r.result}<code class="res">{r.result}</code>{:else}<span>{r.error ?? 'the strategy fails'}</span>{/if}
            <span class="note">{r.log.length} rule application{r.log.length === 1 ? '' : 's'}{r.log.length ? `: ${r.log.slice(0, 12).join(', ')}${r.log.length > 12 ? ', …' : ''}` : ''}</span>
          </li>
        {/each}
      </ul>
    {:else if tab === 'saturate'}
      <button class="primary" onclick={runSaturation} disabled={busy || errors.length > 0 || !queries.length}>{busy ? 'Saturating…' : 'Saturate and extract'}</button>
      {#if satResult}
        <ul class="rows">
          {#each satResult as r, i (i)}
            <li>
              <code class="q">{r.text}</code><span class="arrow">⟶</span><code class="res">{r.result}</code>
              <span class="note">cost {r.cost}; {r.report.iterations.length} iterations ({r.report.stop}); {r.classes} e-classes, {r.nodes} e-nodes</span>
            </li>
          {/each}
        </ul>
      {/if}
    {/if}
  </div>
  {#if caption}<figcaption class="ui">{caption}</figcaption>{/if}
</figure>

<style>
  .wb {
    margin: 1.6rem 0;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius);
    background: var(--surface);
    overflow: hidden;
  }
  header {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.35rem 0.75rem;
    background: var(--pn);
    font-size: 0.78rem;
    border-bottom: 1px solid var(--border);
  }
  .kind {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--accent);
    font-weight: 700;
  }
  .title {
    font-weight: 600;
    color: var(--ink-2);
  }
  .spacer {
    flex: 1;
  }
  .icon {
    border: 0;
    background: none;
    color: var(--ink-3);
    cursor: pointer;
    padding: 0.2rem;
    display: inline-flex;
  }
  .errors {
    margin: 0;
    padding: 0.35rem 0.8rem;
    font-size: 0.78rem;
    color: var(--bad);
    background: var(--bad-soft);
  }
  .tabs {
    padding: 0.5rem 0.75rem 0;
  }
  .out {
    padding: 0.6rem 0.8rem 0.75rem;
    font-size: 0.85rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
  }
  .out p {
    margin: 0;
  }
  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }
  ol.rows {
    list-style: decimal;
    padding-left: 1.6rem;
  }
  .rows li {
    overflow-wrap: anywhere;
  }
  .rows.small {
    font-size: 0.8rem;
  }
  code {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    overflow-wrap: anywhere;
  }
  .res {
    color: var(--nf);
    font-weight: 600;
  }
  .arrow {
    margin: 0 0.4rem;
    color: var(--ink-3);
  }
  .note {
    color: var(--mute);
    font-size: 0.76rem;
    margin-left: 0.5rem;
  }
  .muted {
    color: var(--mute);
  }
  .bad,
  li.bad .res {
    color: var(--bad);
  }
  .ok {
    color: var(--ok);
  }
  .nf {
    color: var(--nf);
    font-weight: 600;
    margin-left: 0.5rem;
    font-size: 0.78rem;
  }
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 1rem;
    align-items: center;
  }
  .controls label {
    display: inline-flex;
    gap: 0.4rem;
    align-items: center;
    font-size: 0.8rem;
    color: var(--ink-2);
    min-width: 0;
  }
  .controls label.grow {
    flex: 1 1 14rem;
  }
  .controls input {
    flex: 1;
    min-width: 0;
    font-family: var(--font-mono);
    font-size: 0.8rem;
    padding: 0.25rem 0.4rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--page);
    color: var(--ink);
  }
  select {
    max-width: 16rem;
    font: inherit;
    font-size: 0.8rem;
    padding: 0.2rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--page);
    color: var(--ink);
  }
  .btns {
    display: inline-flex;
    gap: 0.3rem;
  }
  button {
    font: inherit;
    font-size: 0.8rem;
    border: 1px solid var(--line-strong);
    background: var(--page);
    color: var(--ink);
    border-radius: var(--radius-sm);
    padding: 0.25rem 0.6rem;
    cursor: pointer;
    align-self: flex-start;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  button.primary {
    background: var(--accent);
    color: var(--on-accent);
    border-color: var(--accent);
    font-weight: 600;
  }
  .tree-wrap {
    overflow-x: auto;
    padding: 0.3rem 0;
  }
  .hist {
    margin: 0;
    padding-left: 1.6rem;
    font-size: 0.78rem;
    max-height: 12rem;
    overflow-y: auto;
  }
  .tag {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    text-transform: uppercase;
    color: var(--accent);
    margin-right: 0.3rem;
  }
  details summary {
    cursor: pointer;
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  figcaption {
    padding: 0.45rem 0.8rem 0.6rem;
    font-size: 0.8rem;
    color: var(--mute);
    border-top: 1px solid var(--border);
  }
</style>
