/**
 * The chapter's numbers are synth's: every count in the text is measured here with the pinned synth, and the
 * quotations of synth's output and of the course's code are checked against a fresh run and the source.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { run, type RunResult } from '$lib/synth/api';
import { nodeSynth } from '$lib/synth/node';
import { andDepth } from './widgets/ifmatch';

const md = readFileSync(new URL('./index.md', import.meta.url), 'utf8');
const design = (name: string) => readFileSync(new URL(`../../designs/${name}.weft`, import.meta.url), 'utf8');
const synth = nodeSynth();
const counter = design('counter');

async function synthesise(text: string): Promise<(id: string) => RunResult['stages'][number]> {
  const r = await run(synth, { files: [{ name: 'd.weft', text }], stop: 'synth', testbench: true });
  expect(r.ok, r.error).toBe(true);
  return (id) => r.stages.find((s) => s.id === id)!;
}
const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

describe('the numbers in the text', () => {
  it('the counter: eight cells as written, 12 AND gates and 4 flip-flops, 7 LUTs', async () => {
    const st = await synthesise(counter);
    expect(sum(st('elaborated').stats)).toBe(8);
    expect(st('gates_optimised').stats).toMatchObject({ AND: 12, FF: 4 });
    expect(st('mapped').stats).toMatchObject({ SB_LUT4: 7, SB_DFFESR: 4 });
    expect(md).toContain('As written it is eight word-level cells');
    expect(md).toContain('12 AND gates and 4 flip-flops');
    expect(md).toContain('7 LUTs and 4 flip-flops with enable and reset');
  });

  it('the lab: 8 bits, +% 3, *% 3 and no clear', async () => {
    const wide = await synthesise(counter.replaceAll('uint<4>', 'uint<8>').replace('== 15', '== 255'));
    expect(wide('mapped').stats).toMatchObject({ SB_LUT4: 13, SB_CARRY: 6 });
    expect(wide('gates_optimised').stats.FF).toBe(8);
    expect(md).toContain('(6 carry cells)');
    expect(md).toContain('13 LUTs in all');
    const plus3 = await synthesise(counter.replace('+% 1', '+% 3'));
    expect(plus3('mapped').stats.SB_LUT4).toBe(8);
    const times3 = await synthesise(counter.replace('+% 1', '*% 3'));
    expect(times3('gates_optimised').stats).toMatchObject({ AND: 0, FF: 0 });
    const noClear = counter.replace(/ {4}if clear \{\n {8}value := 0;\n {4}\} else if enable/, '    if enable');
    expect(noClear).not.toContain('clear {');
    const nc = await synthesise(noClear);
    expect(nc('mapped').stats).toMatchObject({ SB_LUT4: 5, SB_DFFE: 4 });
    expect(md).toContain('7 LUTs become 5');
  });

  it('a 32-bit adder is 32 LUTs and 31 carry cells', async () => {
    const st = await synthesise('module add(in a: uint<32>, in b: uint<32>, out y: uint<32>) {\n    y = a +% b;\n}\n');
    expect(st('mapped').stats).toMatchObject({ SB_LUT4: 32, SB_CARRY: 31 });
    expect(md).toContain('synth maps the adder to 32 LUTs and 31 carry cells');
  });

  it('the ALU: 588 LUTs, 95 carry cells, 1,526 AND gates', async () => {
    const st = await synthesise(design('alu'));
    expect(st('mapped').stats).toMatchObject({ SB_LUT4: 588, SB_CARRY: 95 });
    expect(st('gates_optimised').stats.AND).toBe(1526);
    expect(md).toContain('588 LUTs and 95 carry cells');
    expect(md).toContain('**1,526 AND gates**');
  });

  it('the register file: 992 flip-flops of 1,024, about 4,000 AND gates', async () => {
    const st = await synthesise(design('regfile'));
    expect(st('gates_lowered').stats.FF).toBe(1024);
    expect(st('gates_optimised').stats.FF).toBe(992);
    expect(Math.abs(st('gates_optimised').stats.AND! - 4000)).toBeLessThan(100);
    expect(md).toContain('synth builds 992');
  });

  it('the traffic light: two flip-flops, three AND gates, three LUTs', async () => {
    const st = await synthesise(design('traffic-light'));
    expect(st('gates_optimised').stats).toMatchObject({ AND: 3, FF: 2 });
    expect(st('mapped').stats.SB_LUT4).toBe(3);
    expect(md).toContain('two flip-flops (four states fit in two bits), three AND gates after optimisation, and three LUTs');
  });

  it('the swap: eight flip-flops, each behind a multiplexer', async () => {
    const { SNIPPETS } = await import('./widgets/snippets');
    const st = await synthesise(SNIPPETS.swap!.code);
    expect(st('gates_optimised').stats.FF).toBe(8);
    expect(st('mapped').stats.SB_LUT4).toBe(8);
    expect(andDepth(st('gates_optimised').graph!)).toBe(2);
  });

  it('quotes synth’s RTL of the counter exactly', async () => {
    const st = await synthesise(counter);
    const quoted = /```rtl\n([\s\S]*?)\n```/.exec(md)![1]!;
    const body = st('optimised').text.split('\n').map((l) => l.trim()).filter((l) => /^[$\w]+ = /.test(l));
    expect(quoted.split('\n')).toEqual(body);
  });

  it('quotes the course’s carry expansion exactly', () => {
    const src = readFileSync(new URL('../../../src/lib/weft/gates.ts', import.meta.url), 'utf8');
    const quoted = /```ts\n([\s\S]*?)\n```/.exec(md.slice(md.indexOf('## Instances')))![1]!;
    const lines = quoted.split('\n');
    const at = src.split('\n').findIndex((l) => l.trim() === lines[0]!.trim());
    expect(at).toBeGreaterThan(0);
    const indent = /^\s*/.exec(src.split('\n')[at]!)![0].length;
    expect(src.split('\n').slice(at, at + lines.length).map((l) => l.slice(indent))).toEqual(lines);
  });
});
