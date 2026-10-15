import { describe, expect, test } from 'vitest';
import { clientComponent, deserialize, serialize, type ServerComponent } from './flight';
import { renderToString } from './ssr';
import { h } from './vdom';

const db = { posts: [{ id: 1, title: 'Signals', likes: 3 }, { id: 2, title: 'Fibers', likes: 7 }] };
const Likes = clientComponent('Likes.js', 1800, ({ n }: { n: number }) => h('button', null, `♥ ${n}`));

const PostList: ServerComponent = async () => {
  await Promise.resolve(); // pretend to query a database
  return { type: 'ul', props: { children: db.posts.map((p) => ({ type: 'li', key: p.id, props: { children: [p.title, ' ', { type: Likes, props: { n: p.likes } }] } })) } };
};
PostList.bytes = 42000; // say, a Markdown library and a database driver

const page = { type: 'main', props: { children: [{ type: 'h1', props: { children: 'Posts' } }, { type: PostList, props: {} }] } };

describe('Flight-style serialisation', () => {
  test('server components run on the server and leave only elements and client references', async () => {
    const r = await serialize(page);
    expect(r.rows).toHaveLength(2);
    expect(r.rows[0]).toContain('["$","h1",null,{"children":"Posts"}]');
    expect(r.rows[0]).toContain('"$L1"');
    expect(r.rows[0]).not.toContain('PostList');
    expect(r.rows[1]).toBe('1:I["Likes.js","default"]');
  });

  test('only client modules ship; server component code stays home', async () => {
    const r = await serialize(page);
    expect(r.clientModules).toEqual([{ id: 'Likes.js', bytes: 1800 }]);
    expect(r.serverOnlyBytes).toBe(42000);
  });

  test('the browser rebuilds the same tree, and rendering it gives the same HTML', async () => {
    const r = await serialize(page);
    const tree = deserialize(r.payload, { 'Likes.js': Likes.render });
    expect(renderToString(tree)).toBe('<main><h1>Posts</h1><ul><li>Signals<!-- --> <button>♥ 3</button></li><li>Fibers<!-- --> <button>♥ 7</button></li></ul></main>');
  });

  test('deserialising a stream that references an unloaded module fails clearly', async () => {
    const r = await serialize(page);
    expect(() => deserialize(r.payload, {})).toThrow(/Likes.js/);
  });
});
