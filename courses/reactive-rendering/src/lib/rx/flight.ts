/**
 * Server components and their wire format, after React's "Flight", simplified.
 *
 * A *server component* is an ordinary (possibly async) function that runs only on the server: it may read a database
 * and its code never ships to the browser. A *client component* is referenced by id; its code is shipped as a module
 * and its props must be serialisable. The server turns the whole tree into rows of a stream:
 *
 *   0:["$","div",null,{"children":[["$","h1",null,{"children":"Posts"}],["$","$L1",null,{"likes":3}]]}]
 *   1:I["Likes.js","default"]
 *
 * `["$", type, key, props]` is an element; `$L1` points at row 1, a module reference for a client component. The
 * browser reads the rows, loads only the referenced client modules, and builds the same element tree it would have
 * built itself. Server components' output is *data*: they never re-render in the browser.
 */
import { h, type Component, type VNode } from './vdom';

export interface ClientComponent {
  readonly $$client: true;
  readonly id: string;
  readonly bytes: number;
  readonly render: Component;
}
export interface ServerComponent {
  (props: any): Promise<any> | any;
  bytes?: number;
}

export const clientComponent = (id: string, bytes: number, render: Component): ClientComponent => ({ $$client: true, id, bytes, render });
const isClient = (t: unknown): t is ClientComponent => typeof t === 'object' && t !== null && (t as ClientComponent).$$client === true;

export interface FlightResult {
  rows: string[];
  /** The stream the browser receives. */
  payload: string;
  /** Client modules the browser must download. */
  clientModules: { id: string; bytes: number }[];
  /** Bytes of server component code that stayed on the server. */
  serverOnlyBytes: number;
}

type Node = string | number | boolean | null | undefined | Node[] | { type: unknown; props?: Record<string, any>; key?: string | number | null };

/** Run the tree on the server: call every server component (awaiting it), keep host elements and client references. */
export async function serialize(root: Node): Promise<FlightResult> {
  const modules = new Map<string, { id: string; bytes: number; row: number }>();
  let serverOnlyBytes = 0;
  const seenServer = new Set<unknown>();
  const rows: string[] = [];

  async function walk(node: Node): Promise<unknown> {
    if (node === null || node === undefined || typeof node === 'boolean') return null;
    if (typeof node === 'string' || typeof node === 'number') return node;
    if (Array.isArray(node)) return Promise.all(node.map(walk));
    const { type, props = {}, key = null } = node as { type: any; props?: Record<string, any>; key?: string | number | null };
    if (typeof type === 'function') {
      if (!seenServer.has(type)) {
        seenServer.add(type);
        serverOnlyBytes += (type as ServerComponent).bytes ?? 0;
      }
      return walk(await type(props));
    }
    const children = props.children;
    const { children: _c, ...rest } = props;
    void _c;
    if (isClient(type)) {
      let m = modules.get(type.id);
      if (!m) modules.set(type.id, (m = { id: type.id, bytes: type.bytes, row: modules.size + 1 }));
      const out: Record<string, unknown> = { ...rest };
      if (children !== undefined) out.children = await walk(children);
      return ['$', `$L${m.row}`, key, out];
    }
    const out: Record<string, unknown> = { ...rest };
    if (children !== undefined) out.children = await walk(children);
    return ['$', type, key, out];
  }

  const tree = await walk(root);
  rows.push(`0:${JSON.stringify(tree)}`);
  for (const m of modules.values()) rows.push(`${m.row}:I${JSON.stringify([m.id, 'default'])}`);
  return { rows, payload: rows.join('\n') + '\n', clientModules: [...modules.values()].map(({ id, bytes }) => ({ id, bytes })), serverOnlyBytes };
}

/** In the browser: turn the stream back into elements, resolving client references through `modules`. */
export function deserialize(payload: string, modules: Record<string, Component>): VNode {
  const rows = new Map<number, string>();
  for (const line of payload.split('\n')) {
    const m = /^(\d+):(.*)$/.exec(line);
    if (m) rows.set(Number(m[1]), m[2]!);
  }
  const refs = new Map<number, Component>();
  for (const [n, body] of rows) {
    if (body.startsWith('I')) {
      const [id] = JSON.parse(body.slice(1)) as [string, string];
      const comp = modules[id];
      if (!comp) throw new Error(`Client module "${id}" was not loaded`);
      refs.set(n, comp);
    }
  }
  const revive = (v: any): any => {
    if (Array.isArray(v)) {
      if (v[0] === '$' && v.length === 4) {
        const [, type, key, props] = v as [string, string, string | number | null, Record<string, any>];
        const { children, ...rest } = props;
        const kids = children === undefined ? [] : Array.isArray(children) ? children.map(revive) : [revive(children)];
        const t = type.startsWith('$L') ? refs.get(Number(type.slice(2)))! : type;
        return h(t, key === null ? rest : { ...rest, key }, ...kids);
      }
      return v.map(revive);
    }
    return v;
  };
  return revive(JSON.parse(rows.get(0)!));
}
