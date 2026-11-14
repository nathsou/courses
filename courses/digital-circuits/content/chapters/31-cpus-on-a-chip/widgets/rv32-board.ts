/**
 * The RV32I core on the board: the core of `content/designs/rv32i.weft` (with the ALU of alu.weft and the register
 * file of regfile.weft) inside the wrapper of `designs/rv32-board.weft`, with a program in the wrapper's ROM.
 * `REGISTERS_IN_BRAM` chooses the register file: flip-flops, or a block RAM read during the fetch.
 */
import type { SourceFile } from '$lib/synth/api';
import type { Rv32Program } from '$lib/sim/cpu/rv32i';
import aluSource from '../../../designs/alu.weft?raw';
import regfileSource from '../../../designs/regfile.weft?raw';
import rv32iSource from '../../../designs/rv32i.weft?raw';
import wrapperSource from '../designs/rv32-board.weft?raw';

export { rv32iSource, wrapperSource };

/** The instruction ROM has one word per value of pc[7:2]: 64 words. */
export const RV32_ROM_WORDS = 64;

export type Registers = 'flip-flops' | 'block RAM';

const ROM_AT = /^\/\/\/ The program: one instruction per word/m;

/** The words of an assembled program (little-endian, as the core reads them). */
export function programWords(program: Rv32Program | ArrayLike<number>): number[] {
  const image = 'image' in program ? program.image : program;
  const words: number[] = [];
  for (let a = 0; a < image.length; a += 4) words.push(((image[a]! | (image[a + 1]! << 8) | (image[a + 2]! << 16) | (image[a + 3]! << 24)) >>> 0));
  return words;
}

/** `rom_words()` as Weft: the program's words, four to a line, and zeros (illegal instructions) after them. */
export function romFunction(words: number[]): string {
  if (words.length > RV32_ROM_WORDS) throw new Error(`the ROM holds ${RV32_ROM_WORDS} words, the program has ${words.length}`);
  const all = Array.from({ length: RV32_ROM_WORDS }, (_, i) => words[i] ?? 0);
  const rows: string[] = [];
  for (let i = 0; i < all.length; i += 4) rows.push('        ' + all.slice(i, i + 4).map((w) => '0x' + w.toString(16).padStart(8, '0')).join(', ') + ',');
  return `/// The program: one instruction per word, from address 0. A word that is not listed is 0, an illegal instruction.\nfn rom_words() -> [uint<32>; 64] {\n    [\n${rows.join('\n')}\n    ]\n}\n`;
}

/** The wrapper with a program as its ROM. */
export function withRom(wrapper: string, words: number[]): string {
  const at = wrapper.search(ROM_AT);
  if (at < 0) throw new Error('rv32-board.weft has no `rom_words()` to replace');
  return wrapper.slice(0, at) + romFunction(words);
}

/** The files of the design: the ALU, the register file, the core and the wrapper with the program in its ROM. */
export function rv32BoardFiles(program: Rv32Program | ArrayLike<number>): SourceFile[] {
  return [
    { name: 'alu.weft', text: aluSource },
    { name: 'regfile.weft', text: regfileSource },
    { name: 'rv32i.weft', text: rv32iSource },
    { name: 'rv32-board.weft', text: withRom(wrapperSource, programWords(program)) },
  ];
}

/** The parameters of the top module for a register file. */
export const rv32Params = (registers: Registers) => ({ REGISTERS_IN_BRAM: registers === 'block RAM' });
