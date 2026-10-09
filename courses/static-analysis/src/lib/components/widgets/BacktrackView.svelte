<!--
  Backtracking, counted: a regular expression, a family of inputs `prefix + pump × k + suffix`, and the number of
  steps a backtracking engine takes on each, on a logarithmic scale. Beside it, what scslre (the library behind
  S5852) says about the pattern. `:::backtrack-view{pump="a" suffix="!"}` with the pattern in a code block.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { growth, parseRegex, children, Unsupported } from '$lib/sa/regex/backtrack';
  import type { AST } from '@eslint-community/regexpp';

  let { code, flags = '', prefix = '', pump = 'a', suffix = '!', max = 24, n, caption, title = 'Backtracking, counted' }: { code: string; flags?: string; prefix?: string; pump?: string; suffix?: string; max?: number | string; n?: string; caption?: string; title?: string } = $props();

  const LIMIT = 1_000_000;
  // svelte-ignore state_referenced_locally
  let source = $state(code.trim());
  // svelte-ignore state_referenced_locally
  let fl = $state(flags);
  // svelte-ignore state_referenced_locally
  let pre = $state(prefix);
  // svelte-ignore state_referenced_locally
  let unit = $state(pump);
  // svelte-ignore state_referenced_locally
  let post = $state(suffix);
  const maxK = $derived(Number(max));

  const parsed = $derived.by((): { literal?: AST.RegExpLiteral; error?: string } => {
    try {
      return { literal: parseRegex(source, fl) };
    } catch (e) {
      return { error: e instanceof Error ? e.message : String(e) };
    }
  });
  const points = $derived.by(() => {
    if (!parsed.literal || !unit) return { data: [], error: undefined as string | undefined };
    try {
      return { data: growth(parsed.literal, pre, unit, post, maxK, LIMIT), error: undefined };
    } catch (e) {
      return { data: [], error: e instanceof Unsupported ? e.message : String(e) };
    }
  });

  let verdict = $state<string>('…');
  $effect(() => {
    const literal = parsed.literal;
    if (!literal) {
      verdict = '';
      return;
    }
    let cancelled = false;
    import('scslre')
      .then(({ analyse }) => {
        if (cancelled) return;
        try {
          const { reports } = analyse(literal);
          const exp = reports.some((r) => r.exponential);
          verdict = exp ? 'exponential backtracking: S5852 reports this pattern' : reports.length ? 'polynomial backtracking only: S5852 does not report it' : 'no super-linear backtracking found';
        } catch {
          verdict = 'scslre cannot analyse this pattern';
        }
      })
      .catch(() => (verdict = 'scslre could not be loaded'));
    return () => {
      cancelled = true;
    };
  });

  const W = 560;
  const H = 200;
  const PAD = { l: 44, r: 12, t: 12, b: 26 };
  const x = (k: number) => PAD.l + ((k - 1) / Math.max(1, maxK - 1)) * (W - PAD.l - PAD.r);
  const y = (steps: number) => H - PAD.b - (Math.log10(Math.max(1, steps)) / 6) * (H - PAD.t - PAD.b);
  const path = $derived(points.data.map((p, i) => `${i ? 'L' : 'M'}${x(p.k).toFixed(1)},${y(p.steps ?? LIMIT).toFixed(1)}`).join(' '));
  const last = $derived(points.data[points.data.length - 1]);

  function describe(node: AST.Node, depth = 0): { depth: number; type: string; raw: string }[] {
    if (node.type === 'RegExpLiteral') return describe(node.pattern, depth);
    const rows = node.type === 'Alternative' && (node.parent.type === 'Pattern' || node.parent.type === 'Group' || node.parent.type === 'CapturingGroup') && node.parent.alternatives.length === 1 ? [] : [{ depth, type: node.type === 'Quantifier' ? `Quantifier {${node.min},${node.max === Infinity ? '∞' : node.max}}${node.greedy ? '' : ' lazy'}` : node.type, raw: node.raw }];
    const inner = rows.length ? depth + 1 : depth;
    if (node.type === 'Character' || node.type === 'CharacterClass' || node.type === 'CharacterSet') return rows;
    return [...rows, ...children(node).flatMap((c) => describe(c, inner))];
  }
  const tree = $derived(parsed.literal ? describe(parsed.literal) : []);
</script>

<Widget {title} subtitle="Steps a backtracking engine takes on longer and longer inputs that do not match." {n} {caption} onreset={() => { source = code.trim(); fl = flags; pre = prefix; unit = pump; post = suffix; }}>
  <div class="bt ui">
    <div class="row">
      <label class="re"><span class="mono">/</span><input class="mono" bind:value={source} aria-label="Pattern" spellcheck="false" /><span class="mono">/</span><input class="mono flags" bind:value={fl} aria-label="Flags" spellcheck="false" /></label>
    </div>
    <div class="row inputs">
      <span>Input:</span>
      <input class="mono small" bind:value={pre} aria-label="Prefix" placeholder="prefix" spellcheck="false" />
      <span>+</span>
      <input class="mono small" bind:value={unit} aria-label="Repeated part" spellcheck="false" />
      <span>× k +</span>
      <input class="mono small" bind:value={post} aria-label="Suffix" placeholder="suffix" spellcheck="false" />
    </div>
    {#if parsed.error}
      <p class="err">{parsed.error}</p>
    {:else if points.error}
      <p class="err">{points.error}</p>
    {:else}
      <svg viewBox="0 0 {W} {H}" role="img" aria-label="Steps against k, logarithmic scale">
        {#each [0, 1, 2, 3, 4, 5, 6] as e (e)}
          <line x1={PAD.l} x2={W - PAD.r} y1={y(10 ** e)} y2={y(10 ** e)} class="grid" />
          <text x={PAD.l - 6} y={y(10 ** e) + 4} class="tick" text-anchor="end">10{['⁰', '¹', '²', '³', '⁴', '⁵', '⁶'][e]}</text>
        {/each}
        {#each [1, Math.round(maxK / 2), maxK] as k, i (k)}
          <text x={x(k)} y={H - 8} class="tick" text-anchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'}>k = {k}</text>
        {/each}
        <path d={path} class="line" />
        {#each points.data as p (p.k)}
          <circle cx={x(p.k)} cy={y(p.steps ?? LIMIT)} r={p.steps === null ? 4.5 : 2.6} class:capped={p.steps === null} class:matched={p.matched}>
            <title>k = {p.k}: {p.steps === null ? `more than ${LIMIT.toLocaleString('en-GB')} steps` : `${p.steps.toLocaleString('en-GB')} steps${p.matched ? ' (matched)' : ''}`}</title>
          </circle>
        {/each}
      </svg>
      <p class="summary">
        {#if last?.steps === null}
          At k = {last.k} ({(pre + unit.repeat(last.k) + post).length} characters), more than {LIMIT.toLocaleString('en-GB')} steps, where the counter stops.
        {:else if last}
          At k = {last.k}: {last.steps?.toLocaleString('en-GB')} steps.
        {/if}
      </p>
      <p class="verdict"><strong>scslre:</strong> {verdict}</p>
      <details>
        <summary>The pattern as a tree</summary>
        <ul class="tree">
          {#each tree as t, i (i)}<li style:padding-left="{t.depth * 1}rem"><span class="type">{t.type}</span> <code>{t.raw}</code></li>{/each}
        </ul>
      </details>
    {/if}
  </div>
</Widget>

<style>
  .bt {
    display: grid;
    gap: 0.5rem;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
    align-items: center;
    font-size: 0.85rem;
  }
  .re {
    display: flex;
    align-items: center;
    gap: 0.15rem;
    flex: 1;
    min-width: 0;
  }
  input {
    font: inherit;
    font-family: var(--font-mono);
    border: 1px solid var(--line-strong);
    border-radius: 4px;
    background: var(--panel);
    color: var(--fg);
    padding: 0.25rem 0.4rem;
  }
  .re input:first-of-type {
    flex: 1;
    min-width: 0;
  }
  .flags {
    width: 3.5rem;
  }
  .small {
    width: 5rem;
  }
  svg {
    width: 100%;
    height: auto;
    background: var(--pn);
    border-radius: 6px;
  }
  .grid {
    stroke: var(--line);
  }
  .tick {
    font-size: 11px;
    fill: var(--mute);
    font-family: var(--font-mono);
  }
  .line {
    fill: none;
    stroke: var(--accent);
    stroke-width: 2;
  }
  circle {
    fill: var(--accent);
  }
  circle.matched {
    fill: var(--ok);
  }
  circle.capped {
    fill: var(--bad);
  }
  .summary,
  .verdict {
    margin: 0;
    font-size: 0.85rem;
  }
  .err {
    color: var(--bad);
    font-size: 0.85rem;
  }
  .tree {
    list-style: none;
    margin: 0.3rem 0 0;
    padding: 0;
    font-size: 0.8rem;
  }
  .type {
    color: var(--mute);
  }
  details summary {
    cursor: pointer;
    font-size: 0.85rem;
    color: var(--accent-ink);
  }
</style>
