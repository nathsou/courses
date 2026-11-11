import { describe, expect, it } from 'vitest';
import { highlightWeftHtml, tokenize } from './highlight';

const kinds = (src: string, lang?: 'weft' | 'rtl' | 'pcf') => tokenize(src, lang).map((t) => [src.slice(t.from, t.to), t.kind]);

describe('Weft highlighting', () => {
  it('colours keywords, types, numbers, builtins, domains and comments', () => {
    const src = '/// Doc.\nmodule top(in clk: clock, out led: uint<4>) {\n    let b = sync(btn) @clk; // hi\n    reg c: uint<4> = 0x0;\n}';
    const k = kinds(src);
    expect(k).toContainEqual(['/// Doc.', 'doc']);
    expect(k).toContainEqual(['module', 'keyword']);
    expect(k).toContainEqual(['top', 'type']);
    expect(k).toContainEqual(['clock', 'type']);
    expect(k).toContainEqual(['uint', 'type']);
    expect(k).toContainEqual(['sync', 'function']);
    expect(k).toContainEqual(['@clk', 'domain']);
    expect(k).toContainEqual(['0x0', 'number']);
    expect(k).toContainEqual(['// hi', 'comment']);
    expect(k).toContainEqual(['=', 'operator']);
  });

  it('keeps ranges apart from numbers', () => {
    expect(kinds('for i in 0..8 { }')).toContainEqual(['0', 'number']);
  });

  it('uses semantic kinds where the analysis gives them', () => {
    const src = 'count := count +% 1;';
    const t = tokenize(src, 'weft', new Map([[0, 'Register'], [9, 'Register']]));
    expect(t.filter((x) => x.kind === 'register')).toHaveLength(2);
  });

  it('highlights IR text and pin files', () => {
    expect(kinds('$n3 = add count, 26\'d1 @$binary0', 'rtl')).toContainEqual(['add', 'function']);
    expect(kinds('set_io led[0] 56 # LED', 'pcf')).toContainEqual(['set_io', 'keyword']);
  });

  it('renders a code block like the Shiki ones', () => {
    const html = highlightWeftHtml('let a = 1;\nlet b = a < 2;\n');
    expect(html).toMatch(/^<!-- svelte-ignore a11y_no_noninteractive_tabindex --><pre class="shiki shiki-themes bench-light bench-dark weft"/);
    expect(html.match(/<span class="line">/g)).toHaveLength(2);
    expect(html).toContain('&lt;');
  });
});
