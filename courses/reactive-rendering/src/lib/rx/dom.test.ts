import { describe, expect, test } from 'vitest';
import { MElement, MText, createDocument, describeStats, outline, parseHTML, toHTML } from './dom';

describe('MiniDom tree operations', () => {
  test('builds, serialises and logs a small tree', () => {
    const doc = createDocument();
    const ul = doc.createElement('ul');
    const li = doc.createElement('li');
    li.setAttribute('class', 'item');
    li.appendChild(doc.createTextNode('a & b'));
    ul.appendChild(li);
    doc.body.appendChild(ul);
    expect(doc.body.innerHTML).toBe('<ul><li class="item">a &amp; b</li></ul>');
    const stats = doc.statsSince(0);
    expect(stats.created).toBe(3);
    expect(stats.inserted).toBe(3);
    expect(stats.attrs).toBe(1);
    // Only the last insert (into the body) and nothing before it touched a connected node.
    expect(stats.live).toBe(1);
  });

  test('insertBefore moves an existing node; removeChild detaches it', () => {
    const doc = createDocument();
    const [a, b, c] = ['a', 'b', 'c'].map((t) => {
      const e = doc.createElement('i');
      e.textContent = t;
      doc.body.appendChild(e);
      return e;
    });
    doc.body.insertBefore(c!, a!);
    expect(doc.body.textContent).toBe('cab');
    doc.body.removeChild(b!);
    expect(doc.body.textContent).toBe('ca');
    expect(b!.parent).toBeNull();
    expect(() => doc.body.removeChild(b!)).toThrow();
  });

  test('cannot insert a node into its own descendant', () => {
    const doc = createDocument();
    const a = doc.createElement('div');
    const b = doc.createElement('div');
    a.appendChild(b);
    expect(() => b.appendChild(a)).toThrow();
  });

  test('textContent on a lone text child is a single text write', () => {
    const doc = createDocument();
    const p = doc.createElement('p');
    p.textContent = 'one';
    doc.body.appendChild(p);
    const mark = doc.mark();
    p.textContent = 'two';
    expect(doc.statsSince(mark)).toMatchObject({ texts: 1, created: 0, inserted: 0, live: 1 });
  });

  test('fragments insert their children and are left empty', () => {
    const doc = createDocument();
    const f = doc.createFragment();
    f.appendChild(doc.createTextNode('x'));
    f.appendChild(doc.createTextNode('y'));
    doc.body.appendChild(f);
    expect(doc.body.textContent).toBe('xy');
    expect(f.children.length).toBe(0);
  });

  test('form control values live apart from attributes', () => {
    const doc = createDocument();
    const input = doc.createElement('input');
    input.setAttribute('value', 'initial');
    expect(input.value).toBe('initial');
    input.userInput('typed');
    expect(input.value).toBe('typed');
    expect(input.getAttribute('value')).toBe('initial');
    expect(toHTML(input)).toBe('<input value="initial">');
  });

  test('events bubble and can be stopped', () => {
    const doc = createDocument();
    const outer = doc.createElement('div');
    const inner = doc.createElement('button');
    outer.appendChild(inner);
    doc.body.appendChild(outer);
    const log: string[] = [];
    outer.addEventListener('click', () => log.push('outer'));
    inner.addEventListener('click', (e) => {
      log.push('inner');
      if (e.detail.stop) e.stopPropagation();
    });
    inner.click();
    inner.fire('click', { stop: true });
    expect(log).toEqual(['inner', 'outer', 'inner']);
  });

  test('querySelector supports tags, classes, ids and attributes', () => {
    const doc = createDocument();
    doc.body.innerHTML = '<div id="a" class="x y"><span data-k="1">one</span><span data-k="2" class="y">two</span></div>';
    expect(doc.body.querySelector('#a')).not.toBeNull();
    expect(doc.body.querySelectorAll('span.y').map((e) => e.textContent)).toEqual(['two']);
    expect(doc.body.querySelector('[data-k=2]')?.textContent).toBe('two');
    expect(() => doc.body.querySelector('div span')).toThrow();
  });

  test('cloneNode(deep) copies attributes, props and children but not listeners', () => {
    const doc = createDocument();
    const a = doc.createElement('div');
    a.setAttribute('class', 'k');
    a.appendChild(doc.createTextNode('t'));
    a.addEventListener('click', () => {});
    const b = a.cloneNode(true);
    expect(toHTML(b)).toBe('<div class="k">t</div>');
    expect(b.listeners.size).toBe(0);
    expect(b.id).not.toBe(a.id);
  });

  test('doc.clone records one clone operation however large the tree', () => {
    const doc = createDocument();
    const frag = doc.fragmentFromHTML('<div><span>a</span><span>b</span><button>c</button></div>');
    const mark = doc.mark();
    const copy = doc.clone(frag.firstChild as MElement);
    expect(doc.statsSince(mark)).toMatchObject({ parsed: 7, created: 0, total: 1 });
    expect(toHTML(copy)).toBe('<div><span>a</span><span>b</span><button>c</button></div>');
  });

  test('innerHTML replaces the whole subtree and counts the parsed nodes', () => {
    const doc = createDocument();
    doc.body.innerHTML = '<p>a</p><p>b</p>';
    const first = doc.body.firstChild;
    const mark = doc.mark();
    doc.body.innerHTML = '<p>a</p><p>b</p>';
    expect(doc.body.firstChild).not.toBe(first);
    expect(doc.statsSince(mark)).toMatchObject({ parsed: 4, live: 1 });
  });

  test('focus is tracked on the document', () => {
    const doc = createDocument();
    const a = doc.createElement('input');
    doc.body.appendChild(a);
    a.focus();
    expect(doc.activeElement).toBe(a);
    a.blur();
    expect(doc.activeElement).toBeNull();
  });
});

describe('HTML parsing and serialisation', () => {
  test('round-trips attributes, void tags, comments and entities', () => {
    const doc = createDocument();
    const html = '<div class="a b" hidden=""><input type="text" value="x&amp;y"><br><!--note--><p>1 &lt; 2</p></div>';
    const nodes = parseHTML(doc, html);
    expect(nodes.map((n) => toHTML(n)).join('')).toBe(html);
    const input = (nodes[0] as MElement).querySelector('input')!;
    expect(input.getAttribute('value')).toBe('x&y');
  });

  test('handles unquoted attributes, single quotes and self-closing syntax', () => {
    const doc = createDocument();
    const [el] = parseHTML(doc, "<span a=1 b='two' c/>text") as MElement[];
    expect(el!.attrs.get('a')).toBe('1');
    expect(el!.attrs.get('b')).toBe('two');
    expect(el!.attrs.has('c')).toBe(true);
    expect(parseHTML(doc, 'plain')[0]).toBeInstanceOf(MText);
  });

  test('outline is readable', () => {
    const doc = createDocument();
    const [el] = parseHTML(doc, '<ul class=l><li>a</li></ul>');
    expect(outline(el!)).toBe('<ul class=l>\n  <li>\n    "a"');
  });
});

test('describeStats summarises an empty and a busy log', () => {
  const doc = createDocument();
  expect(describeStats(doc.statsSince(0))).toBe('nothing');
  doc.body.appendChild(doc.createElement('p'));
  expect(describeStats(doc.statsSince(0))).toBe('1 created, 1 inserted');
});
