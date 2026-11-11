/** ```weft code blocks in chapters are highlighted as synth highlights Weft, in the structure of the Shiki blocks. */
import { describe, expect, it } from 'vitest';
import path from 'node:path';
import { compileMarkdown } from './compile';

const file = path.resolve(import.meta.dirname, '../../content/chapters/06-shannons-switches/index.md');

describe('weft code blocks', () => {
  it('are highlighted with the course tokens', async () => {
    const md = ['A counter:', '', '```weft title="counter.weft"', '/// Counts.', 'module counter(in clk: clock, out q: uint<4>) {', '    reg v: uint<4> = 0;', '    v := v +% 1;', '    q = v;', '}', '```', ''].join('\n');
    const { code } = await compileMarkdown(md, file);
    expect(code).toContain('<figure class="code-block" data-lang="weft"><figcaption>counter.weft</figcaption>');
    expect(code).toMatch(/<pre class="shiki shiki-themes bench-light bench-dark weft"[^>]*tabindex="0"><code><span class="line">/);
    expect(code).toContain('class="tok-keyword"');
  });
});
