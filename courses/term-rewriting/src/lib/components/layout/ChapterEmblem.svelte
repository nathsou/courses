<script lang="ts">
  /**
   * The chapter emblem: a small term tree generated from the chapter number, with one subterm lit
   * as the redex about to be contracted. Decorative.
   */
  import { f, type Term } from '$lib/trs/term';
  import TermTree from '../term/TermTree.svelte';

  let { seed }: { seed: number } = $props();

  const SYMS = ['+', '*', 'S', 'F', 'G', 'I', ':'];
  const LEAVES = ['0', 'x', 'y', 'E', 'Nil'];

  function gen(s: number): { t: Term; redex: number[] } {
    let h = (s * 2654435761) >>> 0 || 1;
    const rnd = () => ((h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0), h / 4294967296);
    const build = (depth: number): Term => {
      if (depth >= 3 || (depth > 0 && rnd() < 0.3)) {
        const name = LEAVES[Math.floor(rnd() * LEAVES.length)]!;
        return /^[a-z]/.test(name) ? { type: 'var', name } : f(name);
      }
      const name = SYMS[Math.floor(rnd() * SYMS.length)]!;
      const arity = name === 'S' || name === 'I' ? 1 : 2;
      return f(name, ...Array.from({ length: arity }, () => build(depth + 1)));
    };
    const t = build(0);
    // Light the first non-leaf argument as the redex.
    const redex: number[] = [];
    if (t.type === 'fn') {
      const k = t.args.findIndex((a) => a.type === 'fn' && a.args.length > 0);
      if (k >= 0) redex.push(k);
    }
    return { t, redex };
  }
  const g = $derived(gen(seed + 7));
</script>

<div class="emblem" aria-hidden="true">
  <TermTree term={g.t} redex={g.redex} dx={34} dy={40} maxWidth={190} title="" />
</div>

<style>
  .emblem {
    width: 11.5rem;
    opacity: 0.95;
  }
</style>
