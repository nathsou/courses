<!--
  What synth made of a design at each step of synthesis: the word-level cells after elaboration and after
  synth's RTL optimisation, the AND gates, flip-flops and carry bits of the gate network, and the iCE40 cells
  after LUT mapping (synth: docs/PLAYGROUND.md, *Summary*).
-->
<script lang="ts">
  import type { Stage } from '$lib/synth/api';

  let { stages, pending = false }: { stages: Stage[] | undefined; pending?: boolean } = $props();

  const LABEL: Record<string, string> = {
    elaborated: 'Elaborated: word-level cells, as written',
    optimised: 'After RTL optimisation',
    memories_mapped: 'Memories mapped',
    gates_lowered: 'Lowered to gates',
    gates_optimised: 'Gates, optimised',
    mapped: 'Mapped to iCE40 cells',
  };
  const NAME: Record<string, string> = {
    Add: 'adders', Sub: 'subtractors', Mul: 'multipliers', Mux: '2-way multiplexers', Pmux: 'parallel multiplexers', Dff: 'registers', Eq: 'equality tests', Ne: 'inequality tests',
    Lt: 'comparators', Le: 'comparators', Gt: 'comparators', Ge: 'comparators', And: 'AND', Or: 'OR', Xor: 'XOR', Not: 'NOT', Shl: 'left shifters', Shr: 'right shifters', Sshr: 'arithmetic right shifters',
    Shiftx: 'bit selectors', ReduceOr: 'any-one tests', ReduceAnd: 'all-ones tests', ReduceXor: 'parity', LogicNot: 'NOT', LogicAnd: 'AND', LogicOr: 'OR', Memory: 'memories',
    AND: 'AND gates', FF: 'flip-flops', 'carry chains': 'carry chains', instances: 'instances', SB_LUT4: 'LUT4s', SB_DFF: 'flip-flops', SB_DFFE: 'flip-flops with enable', SB_DFFSR: 'flip-flops with reset',
    SB_DFFESR: 'flip-flops with enable and reset', SB_DFFSS: 'flip-flops with set', SB_DFFESS: 'flip-flops with enable and set', SB_CARRY: 'carry cells', SB_RAM40_4K: 'block RAMs', $input: 'input pins', $output: 'output pins',
  };
  const rows = $derived(
    (stages ?? [])
      .filter((s) => LABEL[s.id])
      .map((s) => ({
        id: s.id,
        title: LABEL[s.id]!,
        items: Object.entries(s.stats)
          .filter(([k, v]) => v > 0 && k !== '$input' && k !== '$output' && k !== 'instances')
          .map(([k, v]) => ({ name: NAME[k] ?? k, n: v })),
      })),
  );
</script>

<div class="cost ui" aria-live="polite">
  {#if !stages}
    <p class="note">{pending ? 'Synthesising…' : 'Fix the errors in the source to see what it costs.'}</p>
  {:else}
    <ol>
      {#each rows as r (r.id)}
        <li>
          <h5>{r.title}</h5>
          {#if r.items.length}
            <p>{#each r.items as it, i (it.name)}{#if i > 0}<span class="sep">·</span>{/if}<span><b>{it.n}</b> {it.name}</span>{/each}</p>
          {:else}
            <p class="none">nothing: only wiring</p>
          {/if}
        </li>
      {/each}
    </ol>
  {/if}
</div>

<style>
  .cost {
    font-size: 0.84rem;
  }
  .note {
    color: var(--mute);
    margin: 0.4rem 0;
  }
  ol {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0.45rem;
    counter-reset: step;
  }
  li {
    border-left: 3px solid var(--line-strong);
    padding: 0.15rem 0 0.15rem 0.65rem;
  }
  h5 {
    margin: 0;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--mute);
  }
  p {
    margin: 0.1rem 0 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.15rem 0.4rem;
    color: var(--ink-2);
  }
  b {
    font-family: var(--font-mono);
    color: var(--fg);
  }
  .sep {
    color: var(--mute);
  }
  .none {
    color: var(--mute);
    font-style: italic;
  }
</style>
