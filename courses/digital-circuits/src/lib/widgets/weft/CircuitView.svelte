<!--
  A Weft design's gates (synth's gate-level network, `$lib/weft/gates.ts`) drawn with the Schematic renderer and
  running on the course's digital engine.

    <CircuitView {circuit} {gates} {highlight} onhover={(elementId) => …} oninput={(port, value) => …} bind:this={view} />

  The host drives it with `apply(op)` (set an input, pulse the clock, reset) and reads what it shows from the
  engine. Clicking a switch in the drawing calls `oninput`. Hovering a part reports its element id
  (`onhover`), which the host maps back to source text.
-->
<script lang="ts">
  import { onMount, untrack } from 'svelte';
  import Schematic from '$lib/bench/Schematic.svelte';
  import { buildModel } from '$lib/bench/model';
  import { flatten } from '$lib/sim/netlist/flatten';
  import { createGateSim, type GateSim } from '$lib/weft/gatesim';
  import type { GateNetlist } from '$lib/weft/gates';
  import type { Circuit, ParamValue } from '$lib/sim/netlist/types';
  import type { Op } from './tbDriver.svelte';

  let {
    circuit,
    gates,
    highlight,
    onhover,
    oninput,
    replay = [],
    label = 'Gate-level circuit',
    dim = false,
  }: {
    circuit: Circuit;
    gates: GateNetlist;
    /** Element ids to highlight. */
    highlight?: Set<string>;
    onhover?: (elementId: string | null) => void;
    /** A switch in the drawing was flipped: the port and its new value. */
    oninput?: (port: string, value: bigint) => void;
    /** What has been done so far (set, tick, reset), replayed when the circuit is rebuilt. */
    replay?: Op[];
    label?: string;
    /** Shown while the source has errors (the circuit is the last one that compiled). */
    dim?: boolean;
  } = $props();

  let sim: GateSim | undefined = $state.raw();
  let error = $state('');
  let schematic: Schematic | undefined = $state();
  let wrap: HTMLDivElement | undefined = $state();
  let width = $state(0);

  // Fit the drawing to its container, but not below 0.6 (then it scrolls sideways).
  const extent = $derived.by(() => {
    try {
      const vb = buildModel(circuit).viewBox;
      return vb.x1 - vb.x0;
    } catch {
      return 600;
    }
  });
  const scale = $derived(Math.max(0.6, Math.min(1.5, width > 0 ? (width - 4) / extent : 1)));

  // A new circuit: a new engine, brought to the state the host has reached.
  $effect(() => {
    const c = circuit;
    const l = gates;
    const ops = untrack(() => replay);
    untrack(() => {
      error = '';
      try {
        const s = createGateSim(l, flatten(c));
        for (const op of ops) run(s, op);
        sim = s;
      } catch (e) {
        sim = undefined;
        error = e instanceof Error ? e.message : String(e);
      }
    });
  });

  function run(s: GateSim, op: Op): void {
    if (op.op === 'set') {
      if (gates.ports.some((p) => p.name === op.name && p.dir === 'in' && !p.clock)) s.set(op.name, op.value);
    } else if (op.op === 'tick') s.tick();
    else s.reset();
  }

  /** Applies one operation to the gates and repaints. */
  export function apply(op: Op): void {
    if (!sim) return;
    run(sim, op);
    schematic?.frame(0);
  }

  export function get(port: string): bigint | undefined {
    return sim?.get(port);
  }

  export function frame(): void {
    schematic?.frame(0);
  }

  function onparam(id: string, key: string, value: ParamValue): void {
    if (!sim || key !== 'on' || !id.startsWith('in/')) return;
    const port = gates.ports.find((p) => p.elements.includes(id));
    if (!port || port.clock) return;
    sim.settle();
    const v = sim.get(port.name);
    if (v !== undefined) oninput?.(port.name, v);
    schematic?.frame(0);
  }

  function hoverTarget(ev: Event): string | null {
    const g = (ev.target as Element | null)?.closest?.('g.comp[data-cid]') as SVGGElement | null;
    if (!g) return null;
    const id = circuit.components[Number(g.dataset.cid)]?.id;
    return id && !id.startsWith('~') ? id : null;
  }

  onMount(() => {
    if (!wrap) return;
    const ro = new ResizeObserver(([e]) => (width = e?.contentRect.width ?? 0));
    ro.observe(wrap);
    return () => ro.disconnect();
  });
</script>

<div class="cv" class:dim bind:this={wrap} role="group" aria-label={label}>
  {#if error}
    <p class="err ui">{error}</p>
  {:else}
    <div
      class="scroll"
      role="presentation"
      onpointerover={(ev) => onhover?.(hoverTarget(ev))}
      onpointerleave={() => onhover?.(null)}
    >
      <Schematic bind:this={schematic} {circuit} engine={sim?.engine ?? null} highlight={highlight} {scale} {label} {onparam} />
    </div>
  {/if}
</div>

<style>
  .cv {
    min-width: 0;
    transition: opacity 150ms;
  }
  .cv.dim {
    opacity: 0.55;
  }
  .scroll {
    overflow: auto;
    max-width: 100%;
    padding-bottom: 0.2rem;
  }
  .scroll :global(svg.sch) {
    max-width: none;
    margin: 0;
  }
  .err {
    color: var(--bad);
    font-size: 0.85rem;
  }
</style>
