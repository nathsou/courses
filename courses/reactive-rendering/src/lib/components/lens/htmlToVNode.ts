import { MComment, MElement, MText, createDocument, parseHTML, type MNode } from '$lib/rx/dom';
import { h, type Child } from '$lib/rx/vdom';

/**
 * Turn an HTML string into virtual DOM elements, for figures that let the reader edit a "before" and an "after".
 * Whitespace-only text is dropped; a `key` attribute becomes the element's key.
 */
export function htmlToVNodes(html: string): Child[] {
  const doc = createDocument();
  const conv = (n: MNode): Child | null => {
    if (n instanceof MText) {
      const t = n.data.replace(/\s+/g, ' ').trim();
      return t ? t : null;
    }
    if (n instanceof MComment) return null;
    const el = n as MElement;
    const props: Record<string, string | boolean> = {};
    let key: string | undefined;
    for (const [k, v] of el.attrs) {
      if (k === 'key') key = v;
      else props[k] = v === '' ? true : v;
    }
    const kids = el.children.map(conv).filter((c): c is Child => c !== null);
    return h(el.tag, key === undefined ? props : { ...props, key }, ...kids);
  };
  return parseHTML(doc, html).map(conv).filter((c): c is Child => c !== null);
}
