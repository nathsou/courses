/**
 * The browser's rendering pipeline as a cost model: script → style → layout → paint → composite.
 *
 * Writing to the DOM does not draw anything. It *invalidates*: it marks style and layout as out of date. The browser
 * normally recomputes them once, at the end of the frame. But if script *reads* something that depends on layout
 * (`offsetHeight`, `getBoundingClientRect()`…) while they are out of date, the browser must stop and recompute them
 * right then, synchronously: a *forced layout*. Alternate writes and layout reads in a loop and every iteration pays
 * for a whole layout.
 *
 * The numbers are plausible and round, not measured: what matters is how many times each stage runs, and that layout
 * grows with the size of the page. A real browser's costs depend on the content.
 */

export type Write = { kind: 'write'; what: 'width' | 'class' | 'text' | 'append' | 'transform'; label: string; /** False for a node that is not attached to the page. */ live?: boolean };
export type Read = { kind: 'read'; what: 'offsetHeight' | 'rect' | 'color' | 'dataset'; label: string };
export type Step = Write | Read;

export interface PipelineConfig {
  /** Nodes on the page: layout cost scales with it. */
  nodes: number;
}

export type StageKind = 'script' | 'style' | 'layout' | 'paint' | 'composite';

export interface Stage {
  kind: StageKind;
  ms: number;
  /** True when it ran because script asked for a layout-dependent value, not at the end of the frame. */
  forced: boolean;
  /** Index of the step that caused it (for forced stages). */
  step?: number;
}

export interface PipelineResult {
  stages: Stage[];
  forcedStyles: number;
  forcedLayouts: number;
  totalMs: number;
  /** Time spent in forced stages. */
  forcedMs: number;
}

const COST = { script: 0.004, style: (n: number) => 0.15 + n * 0.0004, layout: (n: number) => 0.2 + n * 0.0016, paint: (n: number) => 0.3 + n * 0.0003, composite: () => 0.1 };

export function simulate(steps: readonly Step[], cfg: PipelineConfig): PipelineResult {
  const stages: Stage[] = [];
  let styleDirty = false;
  let layoutDirty = false;
  let paintDirty = false;
  let scriptMs = 0;
  const flushScript = () => {
    if (scriptMs > 0) stages.push({ kind: 'script', ms: scriptMs, forced: false });
    scriptMs = 0;
  };
  steps.forEach((s, i) => {
    scriptMs += COST.script;
    if (s.kind === 'write') {
      if (s.live === false) return; // building off-page: nothing is invalidated
      if (s.what === 'transform') {
        paintDirty = true; // composited property: no style recalculation affecting layout, no layout
        return;
      }
      styleDirty = true;
      layoutDirty = true;
      paintDirty = true;
    } else {
      // A read of a layout-dependent value flushes whatever is out of date, now.
      const needsLayout = s.what === 'offsetHeight' || s.what === 'rect';
      const needsStyle = needsLayout || s.what === 'color';
      if (needsStyle && styleDirty) {
        flushScript();
        stages.push({ kind: 'style', ms: COST.style(cfg.nodes), forced: true, step: i });
        styleDirty = false;
      }
      if (needsLayout && layoutDirty) {
        flushScript();
        stages.push({ kind: 'layout', ms: COST.layout(cfg.nodes), forced: true, step: i });
        layoutDirty = false;
      }
    }
  });
  flushScript();
  // The end of the frame: whatever is still out of date is recomputed once.
  if (styleDirty) stages.push({ kind: 'style', ms: COST.style(cfg.nodes), forced: false });
  if (layoutDirty) stages.push({ kind: 'layout', ms: COST.layout(cfg.nodes), forced: false });
  if (paintDirty) {
    stages.push({ kind: 'paint', ms: COST.paint(cfg.nodes), forced: false });
    stages.push({ kind: 'composite', ms: COST.composite(), forced: false });
  }
  const forced = stages.filter((s) => s.forced);
  return {
    stages,
    forcedStyles: forced.filter((s) => s.kind === 'style').length,
    forcedLayouts: forced.filter((s) => s.kind === 'layout').length,
    totalMs: stages.reduce((a, s) => a + s.ms, 0),
    forcedMs: forced.reduce((a, s) => a + s.ms, 0),
  };
}

export type Snippet = 'interleaved' | 'batched' | 'fragment' | 'transform' | 'reads-only';

export const SNIPPETS: { id: Snippet; title: string; code: (n: number) => string; note: string }[] = [
  {
    id: 'interleaved',
    title: 'Read, then write, for each item',
    code: () => `for (const el of items) {\n  const h = el.offsetHeight;   // read\n  el.style.width = h + 'px';   // write\n}`,
    note: 'Every read finds the previous write’s invalidation still pending, so every read after the first forces a style recalculation and a layout.',
  },
  {
    id: 'batched',
    title: 'All the reads first, then all the writes',
    code: () => `const heights = items.map((el) => el.offsetHeight);   // one layout\nitems.forEach((el, i) => {\n  el.style.width = heights[i] + 'px';           // writes only\n});`,
    note: 'The same result. The first read pays for one layout; the writes only invalidate, and the browser lays out once at the end of the frame.',
  },
  {
    id: 'fragment',
    title: 'Build off the page, attach once',
    code: () => `const frag = document.createDocumentFragment();\nfor (let i = 0; i < n; i++) {\n  const li = document.createElement('li');\n  li.textContent = 'Item ' + i;\n  frag.append(li);              // detached: invalidates nothing\n}\nlist.append(frag);              // one live write`,
    note: 'Nodes that are not attached to the page cannot invalidate its layout. Only the final append does. Frameworks assemble subtrees off the page for exactly this reason.',
  },
  {
    id: 'transform',
    title: 'Animate with transform',
    code: () => `for (const el of items) {\n  el.style.transform = 'translateX(10px)';   // composited\n}`,
    note: 'transform and opacity can be applied by the compositor without recomputing layout, which is why animations prefer them to left, top or width.',
  },
  {
    id: 'reads-only',
    title: 'Reads with nothing pending',
    code: () => `for (const el of items) {\n  total += el.offsetHeight;      // nothing is out of date\n}`,
    note: 'Layout-dependent reads are only expensive when something is out of date. With nothing invalidated they are cheap, however many there are.',
  },
];

/** The sequence of steps a snippet performs for `n` items. */
export function steps(snippet: Snippet, n: number): Step[] {
  const out: Step[] = [];
  switch (snippet) {
    case 'interleaved':
      for (let i = 0; i < n; i++) out.push({ kind: 'read', what: 'offsetHeight', label: `item ${i}.offsetHeight` }, { kind: 'write', what: 'width', label: `item ${i}.style.width` });
      break;
    case 'batched':
      for (let i = 0; i < n; i++) out.push({ kind: 'read', what: 'offsetHeight', label: `item ${i}.offsetHeight` });
      for (let i = 0; i < n; i++) out.push({ kind: 'write', what: 'width', label: `item ${i}.style.width` });
      break;
    case 'fragment':
      for (let i = 0; i < n; i++) out.push({ kind: 'write', what: 'append', label: `frag.append(li ${i})`, live: false });
      out.push({ kind: 'write', what: 'append', label: 'list.append(frag)' });
      break;
    case 'transform':
      for (let i = 0; i < n; i++) out.push({ kind: 'write', what: 'transform', label: `item ${i}.style.transform` });
      break;
    case 'reads-only':
      for (let i = 0; i < n; i++) out.push({ kind: 'read', what: 'offsetHeight', label: `item ${i}.offsetHeight` });
      break;
  }
  return out;
}
