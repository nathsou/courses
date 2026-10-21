/**
 * Which exercise the keyboard is playing into. Every exercise hears every note from the instrument, so a
 * page with several would answer them all at once. The exercise the reader last touched (pointer, focus or
 * key inside it) receives the notes while it is on screen; otherwise the one nearest the middle of the
 * screen does. Only exercises that take notes register.
 */
const frames = new Map<string, HTMLElement>();
let claimed: string | undefined;

/** Svelte action for an exercise's frame. */
export function register(node: HTMLElement, id: string | undefined) {
  if (!id) return;
  frames.set(id, node);
  const claim = () => (claimed = id);
  node.addEventListener('pointerdown', claim, true);
  node.addEventListener('focusin', claim, true);
  node.addEventListener('keydown', claim, true);
  return {
    destroy() {
      node.removeEventListener('pointerdown', claim, true);
      node.removeEventListener('focusin', claim, true);
      node.removeEventListener('keydown', claim, true);
      if (frames.get(id) === node) frames.delete(id);
      if (claimed === id) claimed = undefined;
    },
  };
}

function onScreen(el: HTMLElement): boolean {
  const r = el.getBoundingClientRect();
  return r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
}

/** Whether the exercise with this id should act on the instrument's notes now. */
export function listening(id: string): boolean {
  if (typeof window === 'undefined' || !frames.has(id)) return true;
  const mine = claimed ? frames.get(claimed) : undefined;
  if (mine && onScreen(mine)) return claimed === id;
  let best: string | undefined;
  let bestDistance = Infinity;
  for (const [k, el] of frames) {
    if (!onScreen(el)) continue;
    const r = el.getBoundingClientRect();
    const d = Math.abs((r.top + r.bottom) / 2 - window.innerHeight / 2);
    if (d < bestDistance) [best, bestDistance] = [k, d];
  }
  return best === undefined || best === id;
}
