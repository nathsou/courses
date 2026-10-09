<!--
  Abstraction and concretisation on a number line. Click integers to build a concrete set S: the figure shows α(S)
  in the chosen domain and γ(α(S)) as a band. Pick an expression over x: it compares the concrete results f(S), the
  analysis's compositional result f♯(α(S)), and the best transformer α(f(γ(α(S)))).
  `::galois-view{domains="signs,parity,constants,intervals" exprs="x + 1|x * x|x - x" set="-2,0,3"}`.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { DOMAINS, alpha, evalAbstract, evalBest, evalConcrete, parseExpr, type Domain, type DomainKey, type Expr } from '$lib/sa/absint/domains';

  let {
    domains = 'signs,parity,constants,intervals',
    exprs = 'x + 1|-x|x * x|x - x',
    set = '-2,0,3',
    initial,
    n,
    caption,
    title = 'Abstraction and concretisation',
  }: { domains?: string; exprs?: string | boolean; set?: string | boolean; initial?: string; n?: string; caption?: string; title?: string } = $props();

  const LO = -8;
  const HI = 8;
  const window = Array.from({ length: HI - LO + 1 }, (_, i) => i + LO);
  const keys = $derived(domains.split(',').map((s) => s.trim()).filter((k): k is DomainKey => k in DOMAINS));
  const exprList = $derived((typeof exprs === 'string' ? exprs : '').split('|').map((s) => s.trim()).filter(Boolean));
  const initialSet = () => (typeof set === 'string' ? set : '').split(',').filter((s) => s.trim() !== '').map((s) => Number(s.trim())).filter((x) => Number.isInteger(x) && x >= LO && x <= HI);

  // svelte-ignore state_referenced_locally
  let key = $state<DomainKey>((initial as DomainKey) ?? (domains.split(',')[0]!.trim() as DomainKey));
  // svelte-ignore state_referenced_locally
  let chosen = $state(new Set<number>(initialSet()));
  let exprText = $state('');
  let custom = $state('');

  const d = $derived(DOMAINS[key] as Domain<unknown>);
  const S = $derived([...chosen].sort((a, b) => a - b));
  const a = $derived(alpha(d, S));
  const parsed = $derived.by((): { e?: Expr; error?: string } => {
    const src = exprText || custom;
    if (!src) return {};
    try {
      return { e: parseExpr(src) };
    } catch (err) {
      return { error: err instanceof Error ? err.message : String(err) };
    }
  });

  const result = $derived.by(() => {
    const e = parsed.e;
    if (!e) return undefined;
    const concrete = [...new Set(S.map((x) => evalConcrete(e, x)))].sort((p, q) => p - q);
    const analysis = evalAbstract(d, e, a);
    const best = evalBest(d, e, a, window);
    const exact = alpha(d, concrete);
    const sound = concrete.every((v) => d.has(analysis, v));
    const isBest = d.leq(analysis, best);
    // The output line spans the values that matter, within reason.
    const images = window.filter((x) => d.has(a, x)).map((x) => evalConcrete(e, x));
    const lo = Math.max(-40, Math.min(LO, ...images));
    const hi = Math.min(80, Math.max(HI, ...images));
    return { concrete, analysis, best, exact, sound, isBest, lo, hi };
  });

  const W = 640;
  const PAD = 20;
  const xOf = (v: number, lo: number, hi: number) => PAD + ((v - lo) * (W - 2 * PAD)) / Math.max(1, hi - lo);
  const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => i + lo);
  const fmtSet = (xs: number[]) => (xs.length ? `{${xs.join(', ')}}` : '∅');

  function toggle(x: number) {
    const next = new Set(chosen);
    if (next.has(x)) next.delete(x);
    else next.add(x);
    chosen = next;
  }
  const gammaText = $derived.by(() => {
    const inWindow = window.filter((x) => d.has(a, x));
    const beyond = d.has(a, HI + 1) || d.has(a, LO - 1);
    return `${fmtSet(inWindow)}${beyond ? ' and more beyond the figure' : ''}`;
  });
</script>

<Widget {title} subtitle={exprList.length ? 'Click integers to choose a set S; pick an expression to apply to it.' : 'Click integers to choose a set S, and compare the domains.'} {n} {caption} onreset={() => { chosen = new Set(initialSet()); exprText = ''; custom = ''; key = (initial as DomainKey) ?? keys[0]!; }}>
  <div class="gv ui">
    {#if keys.length > 1}
      <div class="tabs" role="tablist" aria-label="Domain">
        {#each keys as k (k)}<button role="tab" aria-selected={k === key} class:on={k === key} onclick={() => (key = k)}>{DOMAINS[k].name}</button>{/each}
      </div>
    {/if}

    <div class="line" role="group" aria-label="Integers from {LO} to {HI}">
      {#each window as x (x)}
        <button class="pt" class:on={chosen.has(x)} class:in={d.has(a, x)} aria-pressed={chosen.has(x)} onclick={() => toggle(x)}>{x}</button>
      {/each}
    </div>
    <dl>
      <dt>S</dt><dd><code>{fmtSet(S)}</code></dd>
      <dt>α(S)</dt><dd><code>{d.format(a)}</code></dd>
      <dt>γ(α(S))</dt><dd><code>{gammaText}</code> <span class="note"><span class="sw"></span> the band</span></dd>
    </dl>

    {#if exprList.length}
    <div class="exprs">
      <span>Apply</span>
      {#each exprList as e (e)}<button class:on={exprText === e} onclick={() => { exprText = exprText === e ? '' : e; custom = ''; }}><code>{e}</code></button>{/each}
      <label>or type one <input bind:value={custom} oninput={() => (exprText = '')} placeholder="(x + 1) * x" size="12" spellcheck="false" /></label>
    </div>
    {/if}
    {#if parsed.error}<p class="err">{parsed.error}. Use x, integers, + − * and parentheses.</p>{/if}

    {#if result}
      <svg viewBox="0 0 {W} 70" role="img" aria-label="Results on a number line">
        {#each range(result.lo, result.hi) as v (v)}
          {@const cx = xOf(v, result.lo, result.hi)}
          {@const step = (W - 2 * PAD) / Math.max(1, result.hi - result.lo)}
          {#if d.has(result.analysis, v)}<rect class="band" x={cx - step / 2} y="30" width={step} height="9" />{/if}
          {#if d.has(result.best, v)}<rect class="band best" x={cx - step / 2} y="42" width={step} height="9" />{/if}
          {#if result.concrete.includes(v)}<circle class="res" {cx} cy="16" r={Math.min(7, step / 2.2)} />{/if}
          {#if v % (result.hi - result.lo > 40 ? 10 : result.hi - result.lo > 20 ? 5 : 2) === 0}<text x={cx} y="66" text-anchor="middle" class="tick">{v}</text>{/if}
        {/each}
      </svg>
      <dl>
        <dt>f(S)</dt><dd><code>{fmtSet(result.concrete)}</code> <span class="note">● the concrete results</span></dd>
        <dt>α(f(S))</dt><dd><code>{d.format(result.exact)}</code> <span class="note">what the domain could say about these results</span></dd>
        <dt>best</dt><dd><code>{d.format(result.best)}</code> <span class="note"><span class="sw best"></span> α(f(γ(α(S)))): the best possible from α(S) alone</span></dd>
        <dt>analysis</dt><dd><code>{d.format(result.analysis)}</code> <span class="note"><span class="sw"></span> f♯(α(S)), operation by operation</span></dd>
      </dl>
      <p class="verdict" class:ok={result.sound} class:bad={!result.sound}>
        {result.sound ? '✓ Sound: every concrete result is in γ of the analysis’s result.' : '✗ Unsound: a concrete result falls outside the analysis’s result.'}
        {#if result.sound}{result.isBest ? ' It is also the best transformer here.' : ' It is less precise than the best transformer.'}{/if}
      </p>
    {/if}
  </div>
</Widget>

<style>
  .gv {
    display: grid;
    gap: 0.5rem;
  }
  .tabs,
  .exprs {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem 0.4rem;
    font-size: 0.85rem;
  }
  .tabs button,
  .exprs button {
    font: inherit;
    font-size: 0.8rem;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 999px;
    padding: 0.15rem 0.7rem;
    cursor: pointer;
  }
  .tabs button.on,
  .exprs button.on {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-fg, #fff);
  }
  .exprs button code {
    background: transparent;
    padding: 0;
  }
  .exprs button.on code {
    color: inherit;
  }
  .sw {
    display: inline-block;
    width: 1.4em;
    height: 0.6em;
    vertical-align: middle;
    background: var(--accent);
    opacity: 0.35;
    border-radius: 2px;
  }
  .sw.best {
    background: var(--ok);
    opacity: 0.45;
  }
  .exprs input {
    font-family: var(--font-mono, monospace);
    font-size: 0.8rem;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 4px;
    padding: 0.1rem 0.3rem;
  }
  svg {
    width: 100%;
    height: auto;
  }
  .line {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem 0.2rem;
    justify-content: center;
  }
  .pt {
    font: inherit;
    font-size: 0.78rem;
    width: 2.1rem;
    height: 2.1rem;
    border-radius: 50%;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    cursor: pointer;
    position: relative;
    margin-bottom: 0.55rem;
  }
  .pt.in::after {
    content: '';
    position: absolute;
    left: -0.2rem;
    right: -0.2rem;
    bottom: -0.6rem;
    height: 0.35rem;
    background: var(--accent);
    opacity: 0.35;
  }
  .pt.on {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-fg, #fff);
  }
  .pt:focus-visible {
    outline: 2px solid var(--fg);
    outline-offset: 1px;
  }
  .band {
    fill: var(--accent);
    opacity: 0.28;
  }
  .band.best {
    fill: var(--ok);
    opacity: 0.35;
  }
  .res {
    fill: var(--accent);
  }
  .tick {
    font-size: 10px;
    fill: var(--ink-2);
  }
  dl {
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 0.2rem 0.8rem;
    margin: 0;
    font-size: 0.85rem;
  }
  dt {
    font-weight: 600;
  }
  dd {
    margin: 0;
    overflow-wrap: anywhere;
  }
  .note {
    color: var(--ink-2);
    font-size: 0.8rem;
  }
  .verdict {
    margin: 0;
    font-weight: 600;
    font-size: 0.88rem;
  }
  .verdict.ok {
    color: var(--ok);
  }
  .verdict.bad {
    color: var(--bad, #b00);
  }
  .err {
    color: var(--bad, #b00);
    font-size: 0.85rem;
    margin: 0;
  }
</style>
