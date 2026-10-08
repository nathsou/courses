// Course-wide widgets used in chapters. Each export is used in Markdown as `::kebab-name{prop=…}` or, for widgets
// that take code, as a `:::kebab-name{…}` container with a code block inside.
/** Code and what the parser made of it: `:::ast-explorer{tabs="tokens,tree"}` + a ```ts block. */
export { default as AstExplorer } from '$lib/components/widgets/AstExplorer.svelte';
