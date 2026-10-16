import { describe, expect, test } from 'vitest';
import { highlight } from './render';

describe('code rendering', () => {
  test.each([
    ['ts', 'const value: number = 42;'],
    ['jsx', 'const el = <button onClick={() => n++}>+1</button>;'],
    ['svelte', '<script>let count = $state(0);</script><button onclick={() => count++}>{count}</button>'],
    ['vue', '<template><button @click="count++">{{ count }}</button></template>'],
    ['html', '<div class="row"><span>Hello</span></div>'],
  ])('highlights %s with distinct token colours in both themes', async (lang, code) => {
    const html = await highlight(code, lang);
    expect(new Set([...html.matchAll(/--shiki-light:(#[a-fA-F0-9]+)/g)].map((m) => m[1])).size).toBeGreaterThan(1);
    expect(new Set([...html.matchAll(/--shiki-dark:(#[a-fA-F0-9]+)/g)].map((m) => m[1])).size).toBeGreaterThan(1);
  });

  test('keeps unknown languages readable and escapes code', async () => {
    const html = await highlight('<example>&', 'unknown-language');
    expect(html).toMatch(/(?:&lt;|&#x3C;)example/);
    expect(html).toMatch(/&amp;|&#x26;/);
  });
});
