/**
 * Build-time maths rendering (KaTeX). Equations are rendered to HTML (with MathML for screen readers) when
 * the course is built, so pages carry no maths code.
 */
import katex from 'katex';

/** Macros available in every equation. */
export const MACROS: Record<string, string> = {
  '\\eV': '\\,\\mathrm{eV}',
  '\\cm': '\\,\\mathrm{cm}',
  '\\nm': '\\,\\mathrm{nm}',
  '\\um': '\\,\\mu\\mathrm{m}',
  '\\Vt': 'V_{\\mathrm{T}}',
  '\\VDD': 'V_{\\mathrm{DD}}',
  '\\Cox': 'C_{\\mathrm{ox}}',
  '\\NA': 'N_{\\mathrm{A}}',
  '\\ND': 'N_{\\mathrm{D}}',
  '\\kT': 'k_{\\mathrm{B}}T',
};

export function renderMath(tex: string, display: boolean): string {
  return katex.renderToString(tex, {
    displayMode: display,
    throwOnError: false,
    strict: 'ignore',
    macros: { ...MACROS },
    output: 'htmlAndMathml',
  });
}
