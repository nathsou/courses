import { describe, expect, test } from 'vitest';
import { createDocument, type MElement } from './dom';
import { morph } from './morph';

const setup = (html: string) => {
  const doc = createDocument();
  doc.body.innerHTML = html;
  doc.clearLog();
  return { doc, root: doc.body };
};

describe('morph', () => {
  test('identical HTML changes nothing', () => {
    const { doc, root } = setup('<div class="a"><p>x</p><input value="v"></div>');
    morph(root, '<div class="a"><p>x</p><input value="v"></div>');
    expect(doc.ops).toHaveLength(0);
  });

  test('changes text and attributes in place', () => {
    const { doc, root } = setup('<div class="a"><p>one</p></div>');
    const p = root.querySelector('p')!;
    morph(root, '<div class="b"><p>two</p></div>');
    expect(root.innerHTML).toBe('<div class="b"><p>two</p></div>');
    expect(root.querySelector('p')).toBe(p);
    expect(doc.statsSince(0)).toMatchObject({ attrs: 1, texts: 1, created: 0, inserted: 0, removed: 0 });
  });

  test('a focused input keeps its node, its focus and the text typed into it', () => {
    const { doc, root } = setup('<form><input id="q" value=""><span>0 results</span></form>');
    const input = root.querySelector('#q') as MElement;
    input.focus();
    input.userInput('rea');
    morph(root, '<form><input id="q" value=""><span>12 results</span></form>');
    expect(root.querySelector('#q')).toBe(input);
    expect(doc.activeElement).toBe(input);
    expect(input.value).toBe('rea');
    expect(root.querySelector('span')!.textContent).toBe('12 results');
  });

  test('innerHTML, for contrast, throws the input away', () => {
    const { doc, root } = setup('<form><input id="q" value=""></form>');
    const input = root.querySelector('#q') as MElement;
    input.focus();
    input.userInput('rea');
    root.innerHTML = '<form><input id="q" value=""></form>';
    expect(root.querySelector('#q')).not.toBe(input);
    expect((root.querySelector('#q') as MElement).value).toBe('');
    expect(doc.activeElement).toBe(input); // the old node: no longer in the page
    expect(input.isConnected).toBe(false);
  });

  test('items with ids are recognised after they move', () => {
    const { root } = setup('<ul><li id="a">A</li><li id="b">B</li><li id="c">C</li></ul>');
    const [a, b, c] = root.querySelectorAll('li');
    morph(root, '<ul><li id="c">C</li><li id="a">A</li><li id="b">B</li></ul>');
    expect(root.querySelectorAll('li').map((l) => l.id)).toEqual([c!.id, a!.id, b!.id]);
  });

  test('inserting and removing', () => {
    const { root } = setup('<ul><li id="a">A</li><li id="c">C</li></ul>');
    const c = root.querySelector('#c')!;
    morph(root, '<ul><li id="a">A</li><li id="b">B</li><li id="c">C</li></ul>');
    expect(root.querySelector('#c')).toBe(c);
    expect(root.querySelectorAll('li').map((l) => l.textContent)).toEqual(['A', 'B', 'C']);
    morph(root, '<ul><li id="b">B</li></ul>');
    expect(root.innerHTML).toBe('<ul><li id="b">B</li></ul>');
  });

  test('nodes without ids are matched by position and kind', () => {
    const { root } = setup('<p>a</p><p>b</p><p>c</p>');
    const ps = root.querySelectorAll('p');
    morph(root, '<p>a</p><p>B</p><p>c</p><p>d</p>');
    expect(root.querySelectorAll('p').slice(0, 3)).toEqual(ps);
    expect(root.textContent).toBe('aBcd');
  });

  test('the kind of an element decides whether it can be reused', () => {
    const { root } = setup('<div><span>x</span></div>');
    const span = root.querySelector('span')!;
    morph(root, '<div><b>x</b></div>');
    expect(root.innerHTML).toBe('<div><b>x</b></div>');
    expect(root.querySelector('b')).not.toBe(span);
  });

  test('a stale random page always converges on the new HTML', () => {
    let seed = 5;
    const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
    const page = () => {
      const items = 'abcdefgh'.split('').filter(() => rnd() > 0.4).sort(() => rnd() - 0.5);
      return `<main>${items.map((i) => `<section id="${i}" class="${rnd() > 0.5 ? 'x' : 'y'}"><h2>${i}</h2>${rnd() > 0.5 ? '<p>note</p>' : ''}</section>`).join('')}</main>`;
    };
    const { root } = setup(page());
    for (let round = 0; round < 80; round++) {
      const html = page();
      morph(root, html);
      expect(root.innerHTML).toBe(html);
    }
  });
});

describe('form state and preserved elements', () => {
  test('a field that is not focused takes the value the new HTML gives it', () => {
    const { root } = setup('<form><input id="q" value=""></form>');
    const input = root.querySelector('#q') as MElement;
    input.userInput('rea');
    morph(root, '<form><input id="q" value=""></form>');
    expect(input.value).toBe('');
  });

  test('a preserved element is left exactly as it is, with its subtree', () => {
    const { root } = setup('<div><input id="q" value=""><p>old</p></div>');
    const input = root.querySelector('#q') as MElement;
    input.userInput('rea');
    morph(root, '<div><input id="q" value=""><p>new</p></div>', { preserve: (el) => el.getAttribute('id') === 'q' });
    expect(input.value).toBe('rea');
    expect(root.querySelector('p')!.textContent).toBe('new');
  });
});
