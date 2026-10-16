/**
 * The course outline: single source of truth for navigation. A chapter becomes readable when a
 * matching `chapters/<nn>-<slug>/index.md` exists; until then it is listed as planned.
 * Slugs are fixed: other courses link to them.
 */

/** The six answers to the course's one question, from "start over" to "do not run on the client". */
export type AnswerId = 'rebuild' | 'check' | 'diff' | 'track' | 'compile' | 'skip';

export const ANSWERS: { id: AnswerId; label: string; glyph: string; blurb: string }[] = [
  { id: 'rebuild', label: 'Rebuild', glyph: '⟳', blurb: 'Throw the old DOM away and build it again from the new state.' },
  { id: 'check', label: 'Dirty-check', glyph: '≟', blurb: 'Compare every bound value with what it was, again and again, until nothing differs.' },
  { id: 'diff', label: 'Diff', glyph: '⇄', blurb: 'Build a description of the new UI and compare it with the description of the old one.' },
  { id: 'track', label: 'Track', glyph: '⛓', blurb: 'Record which code read which value, and re-run exactly that code when the value changes.' },
  { id: 'compile', label: 'Compile', glyph: '⚙', blurb: 'Work out at build time which DOM node depends on which value.' },
  { id: 'skip', label: 'Skip', glyph: '☁', blurb: 'Do the work on the server, or not at all, and send the browser only what must run.' },
];

export interface OutlineEntry {
  slug: string;
  number: string;
  title: string;
  summary: string;
  /** The flagship interactive. */
  flagship?: string;
  /** Optional deeper chapter (◇): the core path skips it. */
  optional?: boolean;
  /** The answers the chapter works on (lit on the answer strip). */
  answers?: AnswerId[];
  /** Year of the chapter's key historical moment, for the course map. */
  year?: number;
  event?: string;
}

export interface OutlinePart {
  id: string;
  title: string;
  /** Part opener page with the "How we got here" essay (absent for the prologue and epilogue). */
  essay?: string;
  blurb: string;
  chapters: OutlineEntry[];
}

export const COURSE_TITLE = 'What Changed?';
export const COURSE_SUBTITLE = 'Reactive rendering, from innerHTML to signals';

/** The framework versions every statement in the course refers to. Update with the chapters that name them. */
export const VERSIONS_AS_OF = 'October 2026';
export const VERSIONS: Record<string, string> = {
  React: '19.3 (React Compiler 1.0)',
  Vue: '3.5, and 3.6 release candidates (Vapor mode)',
  Solid: '1.9, and 2.0 release candidates',
  Svelte: '5.5x (Svelte 4.2 for the older design)',
  Angular: '22',
  Qwik: '1.20',
  Lit: '3.3',
  Preact: '11 (Signals 1.14)',
};

export const PARTS: OutlinePart[] = [
  {
    id: '0',
    title: 'Prologue',
    blurb: 'One question, six answers, and the lens that lets you watch each of them work.',
    chapters: [
      { slug: 'the-question', number: '0', title: 'The question', summary: 'Every UI framework answers one question: when the state changes, which parts of the page must change, and how do we find them? Watch three answers to it, side by side, through a lens that flashes every DOM node that gets touched.', flagship: 'The mutation lens', answers: ['rebuild', 'check', 'diff', 'track', 'compile', 'skip'] },
    ],
  },
  {
    id: 'I',
    title: 'The problem',
    essay: 'the-problem',
    blurb: 'What the browser charges for a change, why “just redraw everything” loses your typing, and how the first generation of frameworks watched for changes.',
    chapters: [
      { slug: 'what-the-browser-does', number: '1', title: 'What the browser does with your writes', summary: 'From a DOM write to pixels: style, layout, paint and composite, the writes that are cheap, the reads that force a layout, and a loop that makes a page crawl.', flagship: 'Pipeline stepper', answers: ['rebuild'] },
      { slug: 'ui-as-a-function', number: '2', title: 'UI as a function of state', summary: 'The idea behind everything that follows: describe the page for the current state and let something else make the DOM match. The simplest renderer, why it destroys what the user was doing, and the bookkeeping that replaces it.', flagship: 'Same app, three ways', answers: ['rebuild'], year: 2013, event: 'React is open-sourced' },
      { slug: 'before-frameworks', number: '3', title: 'Before frameworks: events and dirty checking', summary: 'Observers, observable models, and AngularJS’s digest loop: how a framework that cannot see assignments finds out what changed, and what that costs per watcher.', flagship: 'The digest loop', answers: ['check'], year: 2010, event: 'AngularJS' },
    ],
  },
  {
    id: 'II',
    title: 'Virtual DOM',
    essay: 'virtual-dom',
    blurb: 'Describe the whole page as a value, diff it against the last one, and patch the difference: reconciliation, keys, hooks, memoisation and time slicing.',
    chapters: [
      { slug: 'trees-as-values', number: '4', title: 'Trees as values', summary: 'Elements as plain objects, a diff that is O(n) because it cheats on purpose, and a patch that touches only what differs. Build the core of a virtual DOM.', flagship: 'Diff lab', answers: ['diff'], year: 1989, event: 'Zhang and Shasha’s tree edit distance' },
      { slug: 'lists-and-keys', number: '5', title: 'Lists and keys', summary: 'Why a reordered list breaks the state of its inputs, how keys fix it, and how React’s and Vue’s algorithms decide what to move, down to the longest increasing subsequence.', flagship: 'List reconciler', answers: ['diff'] },
      { slug: 'components-and-hooks', number: '6', title: 'Components and hooks', summary: 'Components that run again on every change, and state that survives it: useState as a list of slots, effects with dependencies, and why the rules of hooks are not arbitrary.', flagship: 'Hook slots', answers: ['diff'], year: 2018, event: 'Hooks announced at React Conf' },
      { slug: 'who-re-renders', number: '7', title: 'Who re-renders, and why', summary: 'Render versus commit, why a parent drags its children along, memo and its traps, stale closures, and the React Compiler that writes the memoisation for you.', flagship: 'Render counter', answers: ['diff', 'compile'], year: 2025, event: 'React Compiler 1.0' },
      { slug: 'time-slicing', number: '8', title: 'Time slicing', summary: 'A render that cannot be interrupted freezes the page. Fibers turn the recursion into a loop you can pause, and priorities let typing jump the queue.', flagship: 'Frame timeline', answers: ['diff'], year: 2017, event: 'React 16 ships Fiber' },
    ],
  },
  {
    id: 'III',
    title: 'Signals',
    essay: 'signals',
    blurb: 'Record who read what, and re-run only that: fine-grained reactivity built from scratch, then in Solid, Vue and Angular, and the attempt to standardise it.',
    chapters: [
      { slug: 'signals-from-scratch', number: '9', title: 'Signals from scratch', summary: 'A spreadsheet is a reactive program. Build signal, computed and effect in forty lines around one global variable, and watch dependencies be discovered rather than declared.', flagship: 'The spreadsheet', answers: ['track'], year: 1979, event: 'VisiCalc' },
      { slug: 'glitches-and-diamonds', number: '10', title: 'Glitches and diamonds', summary: 'The bug every first implementation has: a value read in a half-updated graph. Topological order, the three-colour algorithm, version numbers, and cutting propagation off when nothing changed.', flagship: 'Graph lab', answers: ['track'] },
      { slug: 'ownership-and-batching', number: '11', title: 'Ownership, cleanup and batching', summary: 'Effects that create effects, subscriptions that leak, writes that should be one update, and how roots give every reactive computation an owner.', flagship: 'Owner tree', answers: ['track'] },
      { slug: 'templates-and-solid', number: '12', title: 'Templates and Solid', summary: 'Components that run once: a template compiler turns markup into a clone, a few node lookups and one effect per hole. Write the compiler’s output by hand, then read Solid’s.', flagship: 'Template compiler', answers: ['track', 'compile'], year: 2021, event: 'Solid 1.0' },
      { slug: 'vue-proxies-and-hints', number: '13', title: 'Vue: proxies and compiler hints', summary: 'Tracking through Proxy get and set traps, the table that records who read what, and a virtual DOM that skips almost all of its diff because the compiler left it hints.', flagship: 'Dependency table', answers: ['track', 'diff', 'compile'], year: 2020, event: 'Vue 3' },
      { slug: 'angular-zones-and-signals', number: '14', title: 'Angular: zones, then signals', summary: 'Patching every async API to learn when to check, what OnPush saves, and what changes when change detection is driven by signals and the zone goes away.', flagship: 'Zone simulator', answers: ['check', 'track'], year: 2023, event: 'Angular signals' },
      { slug: 'a-standard-for-signals', number: '15', title: 'A standard for signals', summary: 'Seven libraries, seven spellings of the same idea. What the TC39 proposal standardises, what it deliberately leaves out, and how to build an effect from its watcher.', flagship: 'Signals Rosetta', answers: ['track'], year: 2024, event: 'The TC39 Signals proposal' },
    ],
  },
  {
    id: 'IV',
    title: 'Templates and compilers',
    essay: 'compilers',
    blurb: 'Know the shape of the UI ahead of time: tagged templates with holes, Svelte’s bitmasks, Svelte 5’s runes, and the same component through five compilers.',
    chapters: [
      { slug: 'lit-templates', number: '16', title: 'Lit: templates without a compiler', summary: 'A tagged template gives the library the static strings and the dynamic values separately. Parse once, clone, and update only the holes whose values changed.', flagship: 'Parts inspector', answers: ['check'], year: 2019, event: 'lit-html 1.0' },
      { slug: 'svelte-invalidation', number: '17', title: 'Svelte 3 and 4: compile-time invalidation', summary: 'Assignments rewritten into $$invalidate calls, a bitmask of what is dirty, and an update function that is a list of if-statements. No virtual DOM and no signals.', flagship: 'Dirty bits', answers: ['compile'], year: 2019, event: 'Svelte 3' },
      { slug: 'svelte-runes', number: '18', title: 'Svelte 5: runes are signals the compiler hides', summary: 'Why Svelte moved from bitmasks to signals, what $state, $derived and $effect compile to, and how to read the output of the real compiler, live.', flagship: 'Compile it live', answers: ['compile', 'track'], year: 2024, event: 'Svelte 5' },
      { slug: 'five-compilers', number: '19', title: 'The same component, five compilers', summary: 'One counter through React with and without its compiler, Solid, Vue’s two modes, Svelte 5 and Angular: what is done at build time, what is left to the runtime, and what each leaves on the page.', flagship: 'Compiler compare', answers: ['diff', 'track', 'compile'] },
    ],
  },
  {
    id: 'V',
    title: 'Beyond the client',
    essay: 'beyond-the-client',
    blurb: 'The fastest update is the one the browser never does: server rendering and hydration, islands and server components, resumability, and morphing HTML.',
    chapters: [
      { slug: 'ssr-and-hydration', number: '20', title: 'Server rendering and hydration', summary: 'HTML that paints at once and a page that cannot yet be used. What hydration repeats, how it fails when the two renders disagree, and what it costs to find out.', flagship: 'Hydration lab', answers: ['skip'] },
      { slug: 'islands-and-server-components', number: '21', title: 'Islands and server components', summary: 'Hydrate only the parts that need it, or never ship the rest of the code at all: islands, partial hydration and the stream format of React Server Components.', flagship: 'Flight viewer', answers: ['skip'], year: 2020, event: 'React Server Components demo' },
      { slug: 'resumability', number: '22', title: 'Resumability', summary: 'Instead of re-running components to rebuild what the server knew, serialise it. Qwik’s loader, QRLs, and a page that runs no application code until you touch it.', flagship: 'Resume simulator', answers: ['skip', 'track'], year: 2023, event: 'Qwik 1.0' },
      { slug: 'morphing', number: '23', title: 'Morphing: HTML over the wire', summary: 'The server sends HTML; the browser reconciles it into the page. htmx, Turbo and LiveView keep no component state in the browser, and idiomorph keeps your focus.', flagship: 'Morph lab', answers: ['skip', 'diff'], year: 2020, event: 'htmx 1.0' },
    ],
  },
  {
    id: 'VI',
    title: 'Putting it together',
    blurb: 'The same table, seven strategies, counted exactly; then your own framework, and a compass for choosing.',
    chapters: [
      { slug: 'one-benchmark', number: '24', title: 'Seven strategies, one benchmark', summary: 'Create, update, select, swap, remove: the js-framework-benchmark scenarios run on seven of the course’s strategies, counted in DOM operations, with a plain account of what a benchmark hides.', flagship: 'Benchmark bench', answers: ['rebuild', 'diff', 'track', 'compile', 'skip'] },
      { slug: 'design-your-own', number: '25', title: 'Design your own', summary: 'Pick a strategy for a set of constraints, build a small framework against a test suite, and place real frameworks on the map.', flagship: 'Decision compass', optional: true, answers: ['rebuild', 'check', 'diff', 'track', 'compile', 'skip'] },
    ],
  },
  {
    id: 'E',
    title: 'Epilogue',
    blurb: 'Where the lines are blurring.',
    chapters: [
      { slug: 'where-next', number: '26', title: 'Where this is going', summary: 'Compilers that write memoization, signals in the platform, DOM APIs that move nodes without resetting them, and why the six answers keep converging.', flagship: 'The map', answers: ['rebuild', 'check', 'diff', 'track', 'compile', 'skip'] },
    ],
  },
];

export interface AppendixEntry {
  slug: string;
  number: string;
  title: string;
  summary: string;
}

export const APPENDICES: AppendixEntry[] = [
  { slug: 'javascript-primer', number: 'A', title: 'The JavaScript you need', summary: 'Closures, getters and setters, Proxy, the event loop and microtasks, WeakMap and tagged templates: only what the chapters lean on.' },
  { slug: 'minidom', number: 'B', title: 'MiniDom reference', summary: 'The fake DOM every figure runs on: its API, its operation log, and what it leaves out.' },
  { slug: 'reactive-lab', number: 'C', title: 'The reactive lab', summary: 'Every module an exercise can import, with the signature of each function.' },
  { slug: 'rosetta', number: 'D', title: 'One counter, nine frameworks', summary: 'The same component written in React, Preact, Solid, Vue, Svelte 5, Angular, Lit, Qwik and htmx, with versions.' },
  { slug: 'glossary-and-bibliography', number: 'E', title: 'Glossary, timeline and bibliography', summary: 'Every term, every date and every source in the course.' },
];

export const READING_PATHS: { id: string; title: string; blurb: string; chapters: string[] }[] = [
  {
    id: 'react',
    title: 'I write React',
    blurb: 'How a virtual DOM works, why your component renders again, what the compiler is doing, and where server components fit.',
    chapters: ['the-question', 'ui-as-a-function', 'trees-as-values', 'lists-and-keys', 'components-and-hooks', 'who-re-renders', 'time-slicing', 'ssr-and-hydration', 'islands-and-server-components', 'five-compilers'],
  },
  {
    id: 'signals',
    title: 'I use signals',
    blurb: 'Solid, Vue, Preact, Angular or Svelte 5: how dependencies are tracked, why diamonds glitch, and where the standard is going.',
    chapters: ['the-question', 'signals-from-scratch', 'glitches-and-diamonds', 'ownership-and-batching', 'templates-and-solid', 'vue-proxies-and-hints', 'angular-zones-and-signals', 'a-standard-for-signals', 'svelte-runes'],
  },
  {
    id: 'compilers',
    title: 'I like compilers',
    blurb: 'Templates, bitmasks, runes and the output of real compilers, read side by side.',
    chapters: ['the-question', 'templates-and-solid', 'vue-proxies-and-hints', 'lit-templates', 'svelte-invalidation', 'svelte-runes', 'five-compilers', 'where-next'],
  },
  {
    id: 'first-load',
    title: 'I care about the first load',
    blurb: 'Server rendering, hydration, islands, resumability and morphing: who does the work, and when.',
    chapters: ['the-question', 'what-the-browser-does', 'ssr-and-hydration', 'islands-and-server-components', 'resumability', 'morphing', 'one-benchmark'],
  },
];
