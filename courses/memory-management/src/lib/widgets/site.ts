// Course-wide widgets used in chapters. Each export is used in Markdown as `::kebab-name{prop=…}`.
/** The memory-manager dial: `:::dial{settings="manual,rc,mark-sweep" title="…"}` with a ```mote block inside. */
export { default as Dial } from '$lib/components/dial/Dial.svelte';
/** The heap inspector: `::heap-inspector{allocators="first,best" script="a 24, a 40, f 1" mine}`. */
export { default as HeapInspector } from '$lib/components/heap/HeapInspector.svelte';
/** The scoreboard: `::scoreboard{traces="phases,random" allocators="first,best"}`. */
export { default as Scoreboard } from '$lib/components/heap/Scoreboard.svelte';
/** The lab bench: `::lab-bench` (chapter 14; also the whole of /lab). */
export { default as LabBench } from '$lib/components/heap/LabBench.svelte';
/** The zoo: `:::zoo-run{title="…" checks}` with a ```mote block inside (chapters 15 and 16). */
export { default as ZooRun } from '$lib/components/zoo/ZooRun.svelte';
/** Lifetime bars: `:::lifetime-bars{title="…" setting="ownership"}` with a ```mote block inside (chapter 17). */
export { default as LifetimeBars } from '$lib/components/zoo/LifetimeBars.svelte';
/** The reference-counting stepper: `:::rc-stepper{title="…" setting="rc"}` with a ```mote block inside (chapters 18–19). */
export { default as RcStepper } from '$lib/components/graph/RcStepper.svelte';
/** The full-stack replay: `:::full-stack{settings="manual,rc,mark-sweep"}` with a ```mote block inside (chapter 28). */
export { default as FullStack } from '$lib/components/zoo/FullStack.svelte';
