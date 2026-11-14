/** synth's diagnostics as CodeMirror diagnostics. */
import type { Diagnostic as CmDiagnostic } from '@codemirror/lint';
import type { WeftAnalysis } from '../analysis';

const lines = (d: { notes?: { message: string }[]; helps?: string[] }) => [
  ...(d.notes ?? []).map((n) => `note: ${n.message}`),
  ...(d.helps ?? []).map((h) => `help: ${h}`),
];

/** The located diagnostics of an analysis, clamped to a document of `length` characters. */
export function toCmDiagnostics(a: WeftAnalysis, length: number): CmDiagnostic[] {
  return a.located.map(({ from: f, to: t, item: d }, i) => {
    let from = Math.min(f, length);
    let to = Math.min(Math.max(t, from), length);
    if (to === from) {
      if (from > 0 && a.source[from - 1] !== '\n') from--;
      else to = Math.min(length, to + 1);
    }
    const head = d.label && d.label !== d.message ? `${d.message}: ${d.label}` : d.message;
    return {
      from,
      to,
      severity: d.severity === 'error' ? 'error' : d.severity === 'warning' ? 'warning' : 'info',
      message: [head, ...lines(d)].join('\n'),
      renderMessage: () => {
        const el = document.createElement('div');
        const h = document.createElement('strong');
        h.textContent = head;
        el.append(h);
        for (const line of lines(d)) {
          const p = document.createElement('div');
          p.textContent = line;
          p.style.color = 'var(--ink-2)';
          el.append(p);
        }
        el.dataset.diagnostic = String(i);
        return el;
      },
    };
  });
}
