// Course-wide widgets used in chapters. Each export is used in Markdown as `::kebab-name{prop=…}`.
/** The memory-manager dial: `:::dial{settings="manual,rc,mark-sweep" title="…"}` with a ```mote block inside. */
export { default as Dial } from '$lib/components/dial/Dial.svelte';
/** The heap inspector: `::heap-inspector{allocators="first,best" script="a 24, a 40, f 1" mine}`. */
export { default as HeapInspector } from '$lib/components/heap/HeapInspector.svelte';
/** The scoreboard: `::scoreboard{traces="phases,random" allocators="first,best"}`. */
export { default as Scoreboard } from '$lib/components/heap/Scoreboard.svelte';
