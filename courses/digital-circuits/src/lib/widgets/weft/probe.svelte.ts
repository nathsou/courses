/**
 * Cross-probing between a Weft source and its gates, by name: synth keeps the names of registers and ports
 * through synthesis (a flip-flop of `count` is named `count`), so the pointer over a register or port in the
 * source lights its flip-flops or switches and LEDs, and the pointer over one of those marks the name in the
 * source wherever it appears.
 */
import type { WeftAnalysis } from '$lib/weft/analysis';
import { refAt } from '$lib/weft/analysis';
import type { GateNetlist } from '$lib/weft/gates';

export interface Range {
  from: number;
  to: number;
}

export class Probe {
  ids: Set<string> = $state.raw(new Set());
  ranges: Range[] = $state.raw([]);

  clear(): void {
    if (this.ids.size) this.ids = new Set();
    if (this.ranges.length) this.ranges = [];
  }

  private mark(a: WeftAnalysis, g: GateNetlist, name: string): void {
    const ids = g.byName[name] ?? [];
    if (!ids.length) return this.clear();
    this.ids = new Set(ids);
    this.ranges = a.refs.filter((r) => a.source.slice(r.from, r.to) === name && (r.item.kind === 'Register' || r.item.kind === 'Port')).map((r) => ({ from: r.from, to: r.to }));
  }

  fromSource(a: WeftAnalysis | undefined, g: GateNetlist | undefined, hit: { offset: number } | null): void {
    if (!a || !g || !hit || a.source === undefined) return this.clear();
    const r = refAt(a, hit.offset);
    if (!r) return this.clear();
    this.mark(a, g, a.source.slice(r.from, r.to));
  }

  fromElement(a: WeftAnalysis | undefined, g: GateNetlist | undefined, id: string | null): void {
    if (!a || !g || !id) return this.clear();
    const info = g.elements[id];
    if (!info || (info.role !== 'ff' && info.role !== 'port')) {
      this.ids = id ? new Set([id]) : new Set();
      this.ranges = [];
      return;
    }
    this.mark(a, g, info.name);
  }
}
