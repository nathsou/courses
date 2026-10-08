// Course-wide widgets used in chapters. Each export is used in Markdown as `::kebab-name{prop=…}` or, for widgets
// that take code, as a `:::kebab-name{…}` container with a code block inside.
/** Code and what the parser made of it: `:::ast-explorer{tabs="tokens,tree"}` + a ```ts block. */
export { default as AstExplorer } from '$lib/components/widgets/AstExplorer.svelte';
/** Type a selector, see the nodes it matches: `:::selector-lab{selector="…" presets="a|b"}` + a ```ts block. */
export { default as SelectorLab } from '$lib/components/widgets/SelectorLab.svelte';
/** Cognitive Complexity per function, increments marked: `:::complexity-view` + a ```ts block. */
export { default as ComplexityView } from '$lib/components/widgets/ComplexityView.svelte';
/** Every call labelled with its fully qualified name: `:::fqn-view` + a ```ts block. */
export { default as FqnView } from '$lib/components/widgets/FqnView.svelte';
