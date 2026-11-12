/**
 * Appendix G prints numbers about the virtual devices. This file imports the device models and asserts every one
 * of them, table by table, and checks the behaviours the datasheets describe by running the models.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { fencedBlocks, tableAfter } from './fences';
import * as G from '$lib/pld/devices/gal22v10';
import { fitGal22v10 } from '$lib/pld/devices/gal22v10-fit';
import { decoderDesign } from '$lib/pld/devices/gal22v10-designs';
import { readGal22v10Jedec, writeGal22v10Jedec } from '$lib/pld/devices/gal22v10-jedec';
import { Prom, VPROM_ADDRESS_BITS, VPROM_WIDTH } from '$lib/pld/devices/prom';
import { Pla, VPLA_SIZE } from '$lib/pld/devices/pla';
import * as C from '$lib/pld/devices/vcpld32-arch';
import { VCpld32 } from '$lib/pld/devices/vcpld32';
import { BSR_LENGTH, ERASE_CYCLES, IDCODE_MANUFACTURER, IDCODE_PART, IDCODE_VALUE, IDCODE_VERSION, INSTRUCTIONS, IR_LENGTH, PROGRAM_CYCLES, ROW_REGISTER_LENGTH, TAP_STATES } from '$lib/pld/cpld/jtag';
import { TIMING } from '$lib/pld/cpld/timing';
import { PROM_MAX_ADDRESS, PROM_MAX_WIDTH } from '$lib/studio/adapters/prom';
import { EXAMPLES } from '$lib/studio/examples';
import { nodeSynth } from '$lib/synth/node';
import { run } from '$lib/synth/api';
import DELAYS from '$lib/synth/ice40-delays.json';
import { tileKind } from '$lib/studio/ice40/chipdraw';
import { BOARDS } from '$lib/studio/ice40/boards';
import { STUDIO_DESIGNS } from '$lib/studio/ice40/designs';
import { galPins, cpldSymbol, plaSymbol, promSymbol } from './widgets/pinouts';

const md = readFileSync(new URL('./index.md', import.meta.url), 'utf8').replace(/ /g, ' ');
const source = (path: string) => readFileSync(new URL(`../../../src/lib/${path}`, import.meta.url), 'utf8');

const num = (s: string): number => Number(s.replace(/,/g, ''));
const fmt = (n: number): string => n.toLocaleString('en-GB');

/** The text of a `##` section. */
function section(heading: string): string {
  const lines = md.split('\n');
  const at = lines.findIndex((l) => l.trim() === heading);
  if (at < 0) throw new Error(`no section ${heading}`);
  let end = lines.findIndex((l, i) => i > at && /^## /.test(l));
  if (end < 0) end = lines.length;
  return lines.slice(at, end).join('\n');
}

/** The rows of a table under a heading (of a section), keyed by the text of their first cell. */
function table(heading: string, nth = 0, within?: string): Map<string, string[]> {
  const rows = tableAfter(within ? section(within) : md, heading, nth);
  return new Map(rows.map((r) => [r[0]!.replace(/`/g, ''), r.slice(1)]));
}
const cell = (t: Map<string, string[]>, label: string, col = 0): string => {
  const r = t.get(label);
  if (!r) throw new Error(`no row "${label}" (rows: ${[...t.keys()].join(' | ')})`);
  return r[col]!;
};

describe('vPROM', () => {
  const p = new Prom();
  const t = table('### Characteristics', 0, '## vPROM');

  it('has the parameters of the table', () => {
    expect(VPROM_ADDRESS_BITS).toBe(5);
    expect(VPROM_WIDTH).toBe(8);
    expect(num(cell(t, 'Address lines'))).toBe(p.addressBits);
    expect(num(cell(t, 'Data outputs'))).toBe(p.width);
    expect(num(cell(t, 'Words'))).toBe(p.words);
    expect(num(cell(t, 'Fuses'))).toBe(p.fuseCount);
    expect(p.inputs).toEqual(['A4', 'A3', 'A2', 'A1', 'A0']);
    expect(p.outputs).toEqual(['D7', 'D6', 'D5', 'D4', 'D3', 'D2', 'D1', 'D0']);
  });

  it('reads 0 when virgin and 1 when a fuse is blown, and blows a fuse once', () => {
    expect(cell(t, 'A virgin fuse reads')).toBe('0');
    expect(cell(t, 'A blown fuse reads')).toBe('1');
    const q = new Prom();
    expect(q.contents().every((w) => w === 0)).toBe(true);
    expect(q.blow(3, 0)).toBe(true);
    expect(q.blow(3, 0)).toBe(false);
    expect(q.read(3)).toBe(0x80);
  });

  it('has the size limits of the table', () => {
    expect(() => new Prom({ addressBits: 16, width: 32 })).not.toThrow();
    expect(() => new Prom({ addressBits: 17 })).toThrow();
    expect(() => new Prom({ width: 33 })).toThrow();
    expect(cell(t, 'Largest device the model allows')).toBe('16 address lines, 32 outputs');
    expect(cell(t, 'Largest device the Studio builds')).toBe(`${PROM_MAX_ADDRESS} address lines, ${PROM_MAX_WIDTH} outputs`);
  });

  it('numbers the fuses as word × 8 + column, column 0 being D7', () => {
    expect(p.fuseIndex(5, 3)).toBe(5 * 8 + 3);
    expect(p.bitOfColumn(0)).toBe(7);
    expect(md).toContain('number *w* × 8 + *c*');
  });

  it('refuses to turn a 1 back into a 0, naming the address and the output', () => {
    const q = new Prom();
    q.program([1]);
    expect(() => q.program([0])).toThrow(/Address 0, D0: the fuse is already blown/);
    expect(q.verify([1, 0])).toEqual([]);
    expect(q.verify([2])).toEqual([{ address: 0, expected: 2, actual: 1 }]);
  });

  it('writes the fuse map of the text', () => {
    const block = fencedBlocks(md, 'json')[0]!;
    const q = new Prom({ addressBits: 2, width: 3 });
    q.program([1, 2, 5, 7]);
    expect(JSON.parse(block.code)).toEqual(q.toFuseMap());
  });
});

describe('vPLA', () => {
  const pla = new Pla();
  const t = table('### Characteristics', 0, '## vPLA');

  it('has the parameters of the table', () => {
    expect(VPLA_SIZE).toEqual({ inputs: 8, terms: 16, outputs: 8 });
    expect(num(cell(t, 'Inputs'))).toBe(8);
    expect(num(cell(t, 'Product terms'))).toBe(16);
    expect(num(cell(t, 'Outputs'))).toBe(8);
    expect(num(cell(t, 'AND-plane fuses'))).toBe(pla.andFuses.length);
    expect(num(cell(t, 'OR-plane fuses'))).toBe(pla.orFuses.length);
    expect(num(cell(t, 'Polarity fuses'))).toBe(pla.polarityFuses.length);
    expect(num(cell(t, 'Total fuses'))).toBe(pla.fuseCount);
    expect(pla.fuseCount).toBe(16 * 8 * 2 + 16 * 8 + 8);
    expect(pla.inputNames[0]).toBe('I0');
    expect(pla.outputNames[7]).toBe('O7');
  });

  it('reads 0 on every output when virgin, in every one of its 256 input combinations', () => {
    for (let x = 0; x < 256; x++) expect(pla.evaluate(x)).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(pla.decodeTerm(0).kind).toBe('false');
    expect(pla.decodeTerm(0).pattern).toBe('xxxxxxxx');
  });

  it('numbers its fuses as the text says', () => {
    expect(pla.andIndex(3, 5, 'true')).toBe((3 * 8 + 5) * 2);
    expect(pla.andIndex(3, 5, 'complement')).toBe((3 * 8 + 5) * 2 + 1);
    expect(pla.orIndex(3, 5)).toBe(3 * 8 + 5);
  });

  it('has the fuse semantics of the table: intact connects, blown disconnects, polarity inverts', () => {
    const q = new Pla();
    // Term 0: I0 · ¬I1 (disconnect the complement of I0 and the true form of I1, and everything else).
    q.programTerm(0, '10------', [0]);
    expect(q.decodeTerm(0).pattern).toBe('10------');
    expect(q.evaluate(0b10000000)[0]).toBe(1);
    expect(q.evaluate(0b11000000)[0]).toBe(0);
    // A term with nothing connected is the constant 1.
    const r = new Pla();
    for (let i = 0; i < 8; i++) {
      r.blow({ plane: 'and', term: 1, input: i, literal: 'true' });
      r.blow({ plane: 'and', term: 1, input: i, literal: 'complement' });
    }
    expect(r.decodeTerm(1).kind).toBe('true');
    expect(r.decodeTerm(1).pattern).toBe('--------');
    // The polarity fuse inverts the output.
    q.blow({ plane: 'polarity', output: 0 });
    expect(q.evaluate(0b10000000)[0]).toBe(0);
    expect(q.evaluate(0)[0]).toBe(1);
  });
});

describe('GAL22V10', () => {
  it('has the fuse counts of the text', () => {
    expect(G.FUSE_COUNT).toBe(5892);
    expect(G.ARRAY_FUSES).toBe(5808);
    expect(G.ROWS * G.COLUMNS).toBe(5808);
    expect(G.CONFIG_BASE).toBe(5808);
    expect(G.SIGNATURE_BASE).toBe(5828);
    expect(G.FUSE_COUNT - G.SIGNATURE_BASE).toBe(64);
    expect(G.SIGNATURE_BASE - G.CONFIG_BASE).toBe(20);
    expect([G.ROWS, G.COLUMNS]).toEqual([132, 44]);
    for (const s of ['5,892', '5,808', '5,828', '5,891', '132 rows', '44 columns']) expect(md).toContain(s);
  });

  it('has the pins of the table', () => {
    const t = table('### Pin descriptions', 0, '## GAL22V10');
    expect(G.CLOCK_PIN).toBe(1);
    expect(G.GND_PIN).toBe(12);
    expect(G.VCC_PIN).toBe(24);
    expect([...G.INPUT_PINS]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13]);
    expect([...G.OLMC_PINS]).toEqual([23, 22, 21, 20, 19, 18, 17, 16, 15, 14]);
    expect([...t.keys()]).toEqual(['1', '2–11', '12', '13', '14–23', '24']);
    const pins = galPins();
    expect(pins.length).toBe(24);
    expect(pins.map((p) => p.name)).toEqual(['CLK/I', ...Array(10).fill('I'), 'GND', 'I', ...Array(10).fill('I/O/Q'), 'VCC']);
    expect(cell(t, '1')).toBe('CLK/I');
    expect(cell(t, '24')).toBe('VCC');
  });

  it('has the product terms and rows of the table', () => {
    const t = table('### The AND array', 1, '## GAL22V10');
    expect(t.size).toBe(10);
    let total = 0;
    for (const pin of G.OLMC_PINS) {
      const r = G.olmcRows(pin);
      expect(num(cell(t, String(pin), 0))).toBe(r.oeRow);
      expect(num(cell(t, String(pin), 1))).toBe(r.firstTermRow);
      expect(num(cell(t, String(pin), 2))).toBe(r.terms);
      expect(G.PRODUCT_TERMS[pin]).toBe(r.terms);
      total += r.terms + 1;
    }
    expect(total).toBe(G.ROWS - 2);
    expect(G.PRODUCT_TERMS[23]).toBe(8);
    expect(md).toContain('8, 10, 12, 14, 16, 16, 14, 12, 10, 8');
    expect([G.AR_ROW, G.SP_ROW]).toEqual([0, 131]);
    expect(G.OLMC_PINS.map((p) => G.PRODUCT_TERMS[p]).join(', ')).toBe('8, 10, 12, 14, 16, 16, 14, 12, 10, 8');
  });

  it('has the column formulas of the table', () => {
    for (let p = 1; p <= 11; p++) expect(G.pinColumn(p)).toBe(4 * (p - 1));
    expect(G.pinColumn(13)).toBe(42);
    for (let p = 14; p <= 23; p++) expect(G.pinColumn(p)).toBe(2 + 4 * (23 - p));
    expect(G.fuseIndex(5, 7)).toBe(44 * 5 + 7);
    expect(G.columnSignal(43)).toEqual({ pin: 13, complement: true });
  });

  it('has the configuration fuses of the text', () => {
    for (const p of G.OLMC_PINS) {
      expect(G.s0Fuse(p)).toBe(5808 + 2 * (23 - p));
      expect(G.s1Fuse(p)).toBe(G.s0Fuse(p) + 1);
    }
    // S0 = 1 active high, S1 = 1 combinational.
    const f = G.blankFuses();
    f[G.s0Fuse(23)] = 1;
    f[G.s1Fuse(23)] = 1;
    const cfg = G.decodeGal22v10(f).olmcs[0]!;
    expect([cfg.activeHigh, cfg.registered]).toEqual([true, false]);
    f[G.s1Fuse(23)] = 0;
    expect(G.decodeGal22v10(f).olmcs[0]!.registered).toBe(true);
  });

  /** A device with every row a constant 0 except those the test sets. */
  const row = (f: Uint8Array, r: number, connect: Record<number, 0 | 1> | 'one') => {
    for (let c = 0; c < G.COLUMNS; c++) f[G.fuseIndex(r, c)] = connect === 'one' ? 1 : 1;
    if (connect !== 'one') for (const [c, v] of Object.entries(connect)) f[G.fuseIndex(r, Number(c))] = v === 1 ? 0 : 1;
  };
  const olmc = (f: Uint8Array, pin: number, opts: { registered: boolean; high: boolean }) => {
    f[G.s0Fuse(pin)] = opts.high ? 1 : 0;
    f[G.s1Fuse(pin)] = opts.registered ? 0 : 1;
  };

  it('feeds back the inverted register output, never the pin, and resets and presets as the text says', () => {
    const f = G.blankFuses();
    // Pin 23: registered, active high, always driven, D = 1.
    olmc(f, 23, { registered: true, high: true });
    row(f, G.olmcRows(23).oeRow, 'one');
    row(f, G.olmcRows(23).firstTermRow, 'one');
    // Pin 22: combinational, active high, always driven, sum = the feedback of pin 23 (true column).
    olmc(f, 22, { registered: false, high: true });
    row(f, G.olmcRows(22).oeRow, 'one');
    row(f, G.olmcRows(22).firstTermRow, { [G.pinColumn(23)]: 1 });
    const gal = new G.Gal22v10(f);
    gal.powerUp();
    const start = gal.evaluate({});
    expect(start.q[23]).toBe(0); // power-up: Q = 0
    expect(start.pins[23]).toBe(0);
    expect(start.pins[22]).toBe(1); // feedback is ¬Q = 1
    const after = gal.clock({});
    expect(after.pins[23]).toBe(1); // D = 1 loaded
    expect(after.pins[22]).toBe(0); // ¬Q = 0: the complement of the pin
    // AR: a row that is constant 1 in row 0 resets every register at once, without a clock.
    row(f, G.AR_ROW, 'one');
    const withAr = new G.Gal22v10(f);
    withAr.q.fill(1);
    expect(withAr.evaluate({}).q[23]).toBe(0);
    expect(withAr.clock({}).pins[23]).toBe(0); // AR wins over loading D
    // SP: at a clock edge with SP true, every register is set to 1 instead of loading D.
    const g2 = G.blankFuses();
    olmc(g2, 23, { registered: true, high: true });
    row(g2, G.olmcRows(23).oeRow, 'one');
    row(g2, G.olmcRows(23).firstTermRow, {}); // never true: constant 0? (all 1s = constant 1; use a contradiction)
    for (const c of [G.pinColumn(2), G.pinColumn(2) + 1]) g2[G.fuseIndex(G.olmcRows(23).firstTermRow, c)] = 0;
    row(g2, G.SP_ROW, 'one');
    const sp = new G.Gal22v10(g2);
    sp.powerUp();
    expect(sp.clock({}).pins[23]).toBe(1);
    // AR wins over SP.
    row(g2, G.AR_ROW, 'one');
    const both = new G.Gal22v10(g2);
    expect(both.clock({}).pins[23]).toBe(0);
  });

  it('drives a pin only while its output-enable term is true, and reads it as an input otherwise', () => {
    const f = G.blankFuses();
    olmc(f, 23, { registered: false, high: true });
    row(f, G.olmcRows(23).oeRow, { [G.pinColumn(2)]: 1 }); // enabled by pin 2
    row(f, G.olmcRows(23).firstTermRow, 'one');
    const gal = new G.Gal22v10(f);
    expect(gal.evaluate({ 2: 0, 23: 0 }).driven[23]).toBe(false);
    expect(gal.evaluate({ 2: 0, 23: 1 }).pins[23]).toBe(1); // the external level
    expect(gal.evaluate({ 2: 1 }).driven[23]).toBe(true);
    expect(gal.evaluate({ 2: 1 }).pins[23]).toBe(1);
  });

  it('writes a JEDEC file with the fields of the text', () => {
    const fit = fitGal22v10(decoderDesign());
    const text = writeGal22v10Jedec(fit.fuses, { header: ['Device: GAL22V10 (ATF22V10)'] });
    const file = readGal22v10Jedec(text);
    expect(file.fuseCount).toBe(5892);
    expect(file.pinCount).toBe(24);
    for (const field of ['*QP24', '*QF5892', '*F0', '*G0']) expect(text).toContain(`\n${field}\n`);
    expect(text.startsWith('\x02')).toBe(true);
    expect(text).toMatch(/\*C[0-9A-F]{4}\n\*\n\x03[0-9A-F]{4}\n$/);
    // The listing of the text: every line shown occurs in the file, in the same order.
    const block = fencedBlocks(md, 'text').find((b) => b.code.startsWith('<STX>'))!;
    const lines = block.code
      .replace('<STX>', '\x02')
      .replace('<ETX>', '\x03')
      .split('\n')
      .filter((l) => l && !l.includes('⋮'));
    let at = 0;
    for (const l of lines) {
      const i = text.indexOf(l, at);
      expect(i, `line “${l}” of the JEDEC listing`).toBeGreaterThanOrEqual(at);
      at = i + l.length;
    }
  });

  it('checks the fuse checksum of its files', () => {
    const fit = fitGal22v10(decoderDesign());
    const text = writeGal22v10Jedec(fit.fuses, {});
    const broken = text.replace(/\*C[0-9A-F]{4}/, '*C0000');
    expect(() => readGal22v10Jedec(broken)).toThrow();
  });
});

describe('vCPLD-32', () => {
  const t = table('### Characteristics', 0, '## vCPLD-32');

  it('has the parameters of the table', () => {
    expect(num(cell(t, 'Function blocks'))).toBe(C.FUNCTION_BLOCKS);
    expect(num(cell(t, 'Macrocells per block'))).toBe(C.MACROCELLS_PER_FB);
    expect(num(cell(t, 'Macrocells'))).toBe(C.MACROCELLS);
    expect(num(cell(t, 'I/O pins'))).toBe(C.IO_PINS);
    expect(num(cell(t, 'Inputs to each function block'))).toBe(C.FB_INPUTS);
    expect(num(cell(t, 'Product terms per block'))).toBe(C.TERMS_PER_FB);
    expect(num(cell(t, 'Product terms per macrocell'))).toBe(C.TERMS_PER_MC);
    expect(num(cell(t, 'Most terms one macrocell can collect'))).toBe(C.MAX_TERMS_PER_MC);
    expect(num(cell(t, 'Literal columns per term'))).toBe(C.LITERAL_COLUMNS);
    expect(num(cell(t, 'Configuration bits'))).toBe(C.BIT_COUNT);
    expect(cell(t, 'Configuration rows')).toBe(`${C.ROW_COUNT} rows of ${C.ROW_BITS} bits`);
    expect([C.MACROCELLS, C.IO_PINS, C.TERMS_PER_FB, C.MAX_TERMS_PER_MC, C.LITERAL_COLUMNS, C.BIT_COUNT]).toEqual([32, 32, 40, 15, 48, 9024]);
  });

  it('lays out the configuration memory as the table says', () => {
    expect([C.INTERCONNECT_OFFSET, C.ARRAY_OFFSET, C.ENABLE_OFFSET, C.MC_OFFSET, C.RESERVED_OFFSET, C.FB_BITS]).toEqual([0, 144, 2064, 2104, 2232, 2240]);
    expect(C.FB_BITS / C.ROW_BITS).toBe(35);
    expect(C.USERCODE_OFFSET).toBe(8960);
    expect(C.USERCODE_OFFSET + C.USERCODE_BITS).toBe(8992);
    expect(C.ROW_BITS * C.ROW_COUNT).toBe(C.BIT_COUNT);
    expect(C.MC_BITS).toBe(16);
    expect(C.interconnectBit(1, 3)).toBe(2240 + 6 * 3);
    expect(C.arrayBit(0, 2, 5, false)).toBe(144 + 48 * 2 + 2 * 5);
    expect(C.arrayBit(0, 2, 5, true)).toBe(144 + 48 * 2 + 2 * 5 + 1);
    expect(C.termEnableBit(0, 7)).toBe(2064 + 7);
    expect(C.mcBase(0, 3)).toBe(2104 + 16 * 3);
    expect(C.usercodeBit(4)).toBe(8964);
    const layout = table('### Configuration memory', 0, '## vCPLD-32');
    expect([...layout.keys()]).toEqual(['0 to 143', '144 to 2,063', '2,064 to 2,103', '2,104 to 2,231', '2,232 to 2,239']);
  });

  it('has the macrocell fields of the table', () => {
    expect([C.MC_XOR, C.MC_REG, C.MC_TFF, C.MC_INIT, C.MC_OE, C.MC_STEER]).toEqual([0, 1, 2, 3, 4, 6]);
    expect([C.OE_OFF, C.OE_ALWAYS, C.OE_GLOBAL, C.OE_TERM]).toEqual([0, 1, 2, 3]);
    expect([C.STEER_OFF, C.STEER_LOCAL, C.STEER_UP, C.STEER_DOWN]).toEqual([0, 1, 2, 3]);
    expect(C.steerTarget(3, C.STEER_UP)).toBe(4);
    expect(C.steerTarget(3, C.STEER_DOWN)).toBe(2);
    expect(C.steerTarget(7, C.STEER_UP)).toBe(-1); // no wrap-around
    expect(C.steerTarget(0, C.STEER_DOWN)).toBe(-1);
    expect(C.MC_STEER + 2 * C.TERMS_PER_MC).toBe(C.MC_BITS);
  });

  it('keeps its configuration over a power cycle, and can only set bits when it programs a row', () => {
    const dev = new VCpld32();
    expect(dev.isBlank).toBe(true);
    const ones = new Uint8Array(64);
    ones[3] = 1;
    dev.programRow(2, ones);
    expect(dev.readRow(2)[3]).toBe(1);
    dev.programRow(2, new Uint8Array(64));
    expect(dev.readRow(2)[3]).toBe(1); // still set: old OR data
    dev.powerCycle();
    expect(dev.readRow(2)[3]).toBe(1); // non-volatile
    dev.erase();
    expect(dev.readRow(2)[3]).toBe(0);
    expect(dev.isBlank).toBe(true);
  });

  it('is inert when erased: no pin is driven', () => {
    const snap = new VCpld32().evaluate({});
    expect(snap.oe.every((o) => o === false)).toBe(true);
  });

  it('has the timing of the table', () => {
    const tt = table('### Timing', 0, '## vCPLD-32');
    const ns = (s: string) => Number(/^([\d.]+) ns$/.exec(s)![1]);
    expect(ns(cell(tt, 'tPD', 1))).toBe(TIMING.tPD);
    expect(ns(cell(tt, 'tSU', 1))).toBe(TIMING.tSU);
    expect(ns(cell(tt, 'tH', 1))).toBe(TIMING.tH);
    expect(ns(cell(tt, 'tCO', 1))).toBe(TIMING.tCO);
    expect(ns(cell(tt, 'tPTA', 1))).toBe(TIMING.tPTA);
    expect(ns(cell(tt, 'tFB', 1))).toBe(TIMING.tFB);
    expect(ns(cell(tt, 'tREG2REG', 1))).toBe(TIMING.tReg2Reg);
    expect([TIMING.tPD, TIMING.tSU, TIMING.tH, TIMING.tCO, TIMING.tPTA, TIMING.tFB, TIMING.tReg2Reg]).toEqual([7.5, 4.5, 0, 4.5, 1, 5, 8]);
    expect(1000 / TIMING.tReg2Reg).toBe(125);
    expect(md).toContain('1 / tREG2REG = 125 MHz');
  });

  it('has the JTAG of the text', () => {
    const t = table('### JTAG', 0, '## vCPLD-32');
    const hex = (s: string) => Number.parseInt(s.replace('0x', ''), 16);
    const names = { EXTEST: 'EXTEST', SAMPLE_PRELOAD: 'SAMPLE/PRELOAD' } as Record<string, string>;
    expect(t.size).toBe(11);
    for (const [name, code] of Object.entries(INSTRUCTIONS)) {
      const shown = names[name] ?? name;
      const row = [...t.entries()].find(([, v]) => v[0] === shown);
      expect(row, name).toBeDefined();
      expect(hex(row![0]), name).toBe(code);
    }
    expect(IR_LENGTH).toBe(8);
    expect(BSR_LENGTH).toBe(99);
    expect(ROW_REGISTER_LENGTH).toBe(72);
    expect(ERASE_CYCLES).toBe(8);
    expect(PROGRAM_CYCLES).toBe(3);
    expect(TAP_STATES.length).toBe(16);
    expect([IDCODE_VERSION, IDCODE_PART, IDCODE_MANUFACTURER]).toEqual([1, 0xc032, 0x0ff]);
    expect(IDCODE_VALUE).toBe(0x1c0321ff);
    expect(md).toContain('`0x1C0321FF`');
    expect(md).toContain('`0xC032`');
    expect(md).toContain('`0x0FF`');
    expect(md).toContain('boundary-scan register, 99 bits');
    expect(md).toContain('row register, 72 bits');
    expect(md).toContain('busy for 8 TCK cycles');
    expect(md).toContain('3 Run-Test/Idle cycles');
  });
});

describe('the iCE40 HX1K and HX8K', async () => {
  const synth = nodeSynth();
  const one = { files: [{ name: 'one.weft', text: 'module one(in a: bool, out y: bool) {\n    y = !a;\n}\n' }], pins: '' };
  const hx1k = await run(synth, { ...one, part: 'hx1k', package: 'vq100' });
  const hx8k = await run(synth, { ...one, part: 'hx8k', package: 'ct256' });
  const cb132 = await run(synth, { ...one, part: 'hx8k', package: 'cb132' });
  const t = table('### Sizes', 0, '## iCE40 HX1K and HX8K');
  const kinds = (r: typeof hx1k) => {
    const c = r.chip!;
    const k: Record<string, number> = {};
    for (let y = 0; y < c.gh; y++) for (let x = 0; x < c.gw; x++) k[tileKind(c, x, y)] = (k[tileKind(c, x, y)] ?? 0) + 1;
    return k;
  };

  it('has the sizes of the table, read from synth’s chip database', () => {
    for (const [c, r] of [[0, hx1k], [1, hx8k]] as const) {
      const v = (label: string) => cell(t, label, c);
      const chip = r.chip!;
      expect(v('Tiles, with the I/O ring (columns × rows)')).toBe(`${chip.gw} × ${chip.gh}`);
      expect(num(v('Logic tiles'))).toBe(kinds(r).logic);
      expect(num(v('Logic cells'))).toBe(chip.usage.lc_total);
      expect(chip.usage.lc_total).toBe(8 * kinds(r).logic!);
      expect(num(v('Block RAMs (4 Kbit each)'))).toBe(chip.usage.ram_total);
      expect(num(v('Block RAM (Kbit)'))).toBe(chip.usage.ram_total * 4);
      expect(num(v('Configuration bits in the tiles'))).toBe(r.bitstream!.tile_bits);
      expect(num(v('Bitstream file (bytes, as synth and icepack write it)'))).toBe(r.bitstream!.bytes);
    }
    expect(cell(t, 'User pads in the course’s packages', 0)).toBe(`${hx1k.chip!.usage.io_total} (VQ100)`);
    expect(cell(t, 'User pads in the course’s packages', 1)).toBe(`${hx8k.chip!.usage.io_total} (CT256), ${cb132.chip!.usage.io_total} (CB132)`);
  });

  it('has eight global networks: eight column-buffer bits in a logic tile of the buffer rows', () => {
    const colbuf = hx1k.bitstream!.tiles.find((x) => x.t === 'logic' && x.f.some((f) => f.n.startsWith('ColBufCtrl')))!;
    expect(new Set(colbuf.f.filter((f) => f.n.startsWith('ColBufCtrl')).map((f) => f.n)).size).toBe(8);
  });

  it('has the logic cell of the table: 20 bits, the LUT’s 16 and the flags at 8, 9, 18 and 19', async () => {
    const r = await run(synth, { ...one, part: 'hx1k', package: 'vq100' });
    const lc = r.chip!.cells.find((c) => c.bel === 'lc')!;
    expect(lc.lut_bits).toHaveLength(16);
    // The flags sit between the table's bits: the carry and flip-flop enables are two of the four.
    expect(lc.lut_bits).not.toContain(lc.carry_bit);
    expect(lc.lut_bits).not.toContain(lc.dff_bit);
    const logic = r.bitstream!.tiles.find((x) => x.t === 'logic')!;
    expect(logic.w).toBe(54);
    expect(16 * 54).toBe(864);
  });

  it('has the timing of the table: synth’s delays for the HX parts', () => {
    const rows = table('### Timing model', 0, '## iCE40 HX1K and HX8K');
    const ns = (ps: number) => `${(Math.round(ps / 10) / 100).toFixed(2)} ns`;
    const at = (label: string) => cell(rows, label, 0);
    expect(at('LUT, any input to output')).toBe(ns(DELAYS.lut));
    expect(at('LUT, input I3 when it comes from the carry')).toBe(ns(DELAYS.lut_in3));
    expect(at('Carry, carry in to carry out')).toBe(ns(DELAYS.carry));
    expect(at('Flip-flop, clock to output')).toBe(ns(DELAYS.clk_to_q));
    expect(at('Flip-flop set-up')).toBe(ns(DELAYS.setup));
    expect(at('Output driver onto a span-4 wire, onto a span-12')).toBe(`${ns(DELAYS.odrv4)}, ${ns(DELAYS.odrv12)}`);
    expect(at('Span-4 wire, over its four tiles')).toBe(ns(DELAYS.span4_h[4]!));
    expect(at('Span-12 wire, over its twelve tiles')).toBe(ns(DELAYS.span12_h[12]!));
    expect(at('Span-12 to span-4')).toBe(ns(DELAYS.sp12to4));
    expect(at('Local track')).toBe(ns(DELAYS.local));
    expect(at('Cell input multiplexer')).toBe(ns(DELAYS.inmux));
  });
});

describe('the boards', () => {
  it('have the clocks, LEDs and pin names of the table', () => {
    const rows = table('## The boards', 0, '## The boards');
    const at = (label: string, c: number) => cell(rows, label, c);
    for (const [c, b] of [[0, BOARDS['go-board']], [1, BOARDS['alchitry-cu']]] as const) {
      expect(at('Clock', c)).toBe(`${b.clockHz / 1e6} MHz, on \`clk\``);
      expect(at('LEDs', c)).toBe(`${b.leds}, on \`led[0]\` to \`led[${b.leds - 1}]\``);
      for (const name of ['sw1', 'btn', 'rx', 'tx', 'clk']) expect(b.pcf).toMatch(new RegExp(`^set_io ${name.replace('[', '\\[')} `, 'm'));
    }
    expect(at('FPGA', 0)).toBe('iCE40 HX1K, VQ100');
    expect(at('FPGA', 1)).toBe('iCE40 HX8K, CB132');
  });
});

describe('the drawings', () => {
  it('are drawn from the models', () => {
    expect(galPins().length).toBe(24);
    expect(promSymbol().left.length).toBe(5);
    expect(promSymbol().right.length).toBe(8);
    expect(plaSymbol().left.length).toBe(8);
    expect(plaSymbol().right.length).toBe(8);
    const c = cpldSymbol();
    expect(c.left.length + c.right.length).toBe(32);
    expect(c.top.map((p) => p.name)).toEqual(['GCLK', 'GSR', 'GOE']);
    expect(c.bottom.map((p) => p.name)).toEqual(['TCK', 'TMS', 'TDI', 'TDO']);
  });
});

describe('the Studio links', () => {
  it('name devices and examples that exist', () => {
    const links = [...md.matchAll(/^::device-studio\{([^}]*)\}/gm)].map((m) => m[1]!);
    expect(links.length).toBe(4);
    for (const l of links) {
      const device = /device="([^"]+)"/.exec(l)![1] as keyof typeof EXAMPLES;
      const example = /example="([^"]+)"/.exec(l)![1]!;
      expect(EXAMPLES[device]?.some((e) => e.id === example), l).toBe(true);
    }
    const fpga = [...md.matchAll(/^::fpga-studio\{([^}]*)\}/gm)].map((m) => m[1]!);
    expect(fpga.length).toBe(1);
    for (const l of fpga) expect(STUDIO_DESIGNS[/design="([^"]+)"/.exec(l)![1]!]).toBeDefined();
  });
});
