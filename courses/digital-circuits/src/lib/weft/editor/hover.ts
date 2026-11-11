/** The hover card: what synth says about the name under the pointer (its type, range, width and domain). */
import { hoverTooltip, type Tooltip } from '@codemirror/view';
import { refAt, type WeftAnalysis } from '../analysis';

export function hoverDom(kind: string, text: string): HTMLElement {
  const el = document.createElement('div');
  el.className = 'weft-hover';
  const what = document.createElement('div');
  what.className = 'what';
  what.textContent = kind.toLowerCase();
  const body = document.createElement('pre');
  body.textContent = text;
  el.append(what, body);
  return el;
}

export function weftHover(get: () => WeftAnalysis | undefined) {
  return hoverTooltip(
    (view, pos): Tooltip | null => {
      const a = get();
      if (!a || a.source !== view.state.doc.toString()) return null;
      const r = refAt(a, pos);
      if (!r || !r.item.hover) return null;
      return { pos: r.from, end: r.to, above: true, create: () => ({ dom: hoverDom(r.item.kind, r.item.hover) }) };
    },
    { hoverTime: 250 },
  );
}
