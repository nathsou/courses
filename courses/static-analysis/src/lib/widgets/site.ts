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
/** Occurrences of names labelled with their narrowed types, with a strict switch: `:::type-view{names="a,b"}` + a ```ts block. */
export { default as TypeView } from '$lib/components/widgets/TypeView.svelte';
/** Backtracking steps against input length, and scslre's verdict: `:::backtrack-view{pump="a" suffix="!"}` + a ```text block. */
export { default as BacktrackView } from '$lib/components/widgets/BacktrackView.svelte';
/** A dataflow analysis stepped through its worklist: `:::fixpoint-stepper{analysis="liveness"}` + a ```js block. */
export { default as FixpointStepper } from '$lib/components/widgets/FixpointStepper.svelte';
/** Hasse diagrams with join and meet: `::lattice-lab{presets="powerset,flat,sign,notlattice"}`. */
export { default as LatticeLab } from '$lib/components/widgets/LatticeLab.svelte';
/** A pipeline, stage by stage, with the data at each boundary: `:::follow-issue` + a ```yaml block of stages. */
export { default as FollowIssue } from '$lib/components/widgets/FollowIssue.svelte';
/** Issues to classify as true positive, false positive or accepted: `:::triage-board` + a ```yaml block. */
export { default as TriageBoard } from '$lib/components/widgets/TriageBoard.svelte';
/** A set of integers, its abstraction and concretisation, and transformers compared: `::galois-view{domains="…" exprs="x + 1|x * x"}`. */
export { default as GaloisView } from '$lib/components/widgets/GaloisView.svelte';
/** Several abstract interpreters, check by check: `:::domain-compare{analyses="intervals,parity,reduced"}` + a ```js block. */
export { default as DomainCompare } from '$lib/components/widgets/DomainCompare.svelte';
