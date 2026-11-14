/**
 * Running what a bitstream implements: the pins to name the ports of the decoded design, and its ports grouped
 * into buses (`led[0]` … `led[3]` is the bus `led`).
 */
import type { Chip, TbPort } from '$lib/synth/api';

/**
 * The pins of the design as placed: one `set_io` per pad it uses, from the board's pin file or chosen by the
 * placer. (A board's file may name several ports on one pin, `sw1` and `btn`; decoding needs only the ports
 * the design has.)
 */
export function pinsOf(chip: Chip, _pcf = ''): string {
  void _pcf;
  return chip.cells
    .filter((c) => c.bel === 'io' && c.pin)
    .map((c) => `set_io ${c.name.replace(/\$sb_io$/, '')} ${c.pin}`)
    .join('\n') + '\n';
}

export interface Bus {
  name: string;
  dir: 'in' | 'out';
  clock: boolean;
  width: number;
  /** The ports that make up the bus, least significant first: one port of the bus's width, or one per bit. */
  ports: { name: string; width: number }[];
}

/** Ports `x[0]`, `x[1]`, … (or one port `x` of several bits) as one bus `x`. */
export function busesOf(ports: TbPort[]): Bus[] {
  const out = new Map<string, Bus>();
  for (const p of ports) {
    if (p.dir === 'inout' || p.added) continue;
    const m = /^(.*)\[(\d+)\]$/.exec(p.name);
    const name = m ? m[1]! : p.name;
    let b = out.get(name);
    if (!b) out.set(name, (b = { name, dir: p.dir, clock: p.clock, width: 0, ports: [] }));
    b.ports[m ? Number(m[2]) : 0] = { name: p.name, width: p.width };
  }
  return [...out.values()].map((b) => {
    const ports = Array.from(b.ports, (x) => x ?? { name: '', width: 1 });
    return { ...b, ports, width: ports.reduce((s, p) => s + p.width, 0) };
  });
}

/** The value of a bus from the values read of its ports. */
export function busValue(b: Bus, values: Record<string, number | string>): number {
  let v = 0;
  let shift = 0;
  for (const p of b.ports) {
    v += Number(values[p.name] ?? 0) * 2 ** shift;
    shift += p.width;
  }
  return v;
}

/** The `set` of a value on a bus, port by port. */
export function busSet(b: Bus, value: number): Record<string, number> {
  const out: Record<string, number> = {};
  let shift = 0;
  for (const p of b.ports) {
    out[p.name] = Math.floor(value / 2 ** shift) % 2 ** p.width;
    shift += p.width;
  }
  return out;
}
