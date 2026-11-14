/**
 * The boards the course builds for: two of the iCE40 boards synth knows (synth: crates/synth-playground/src/
 * boards). Their pin files are synth's own, word for word (`boards.test.ts` compares them with synth's
 * `devices`); a design's top module uses the port names they constrain: `clk`, `btn`, `led`, `rx`, `tx`.
 */
export interface Board {
  id: 'go-board' | 'alchitry-cu';
  name: string;
  part: 'hx1k' | 'hx8k';
  package: string;
  /** The board's oscillator, which a top module receives as `CLK_HZ` when it declares one. */
  clockHz: number;
  /** LEDs on `led[0]` and up. */
  leds: number;
  pcf: string;
}

export const BOARDS: Record<Board['id'], Board> = {
  'go-board': {
    id: 'go-board',
    name: 'Nandland Go Board',
    part: 'hx1k',
    package: 'vq100',
    clockHz: 25_000_000,
    leds: 4,
    pcf: `# Nandland Go Board (iCE40 HX1K VQ100, 25 MHz)
set_io clk 15
set_frequency clk 25
set_io sw1 53
set_io btn 53
set_io led[0] 56
set_io led[1] 57
set_io led[2] 59
set_io led[3] 60
# The seven-segment display's segments, for 8-bit outputs.
set_io led[4] 3
set_io led[5] 4
set_io led[6] 7
set_io led[7] 8
set_io rx 73
set_io tx 74
`,
  },
  'alchitry-cu': {
    id: 'alchitry-cu',
    name: 'Alchitry Cu',
    part: 'hx8k',
    package: 'cb132',
    clockHz: 100_000_000,
    leds: 8,
    pcf: `# Alchitry Cu (iCE40 HX8K CB132, 100 MHz)
set_io clk P7
set_frequency clk 100
set_io sw1 P8
set_io btn P8
set_io led[0] J11
set_io led[1] K11
set_io led[2] K12
set_io led[3] K14
set_io led[4] L12
set_io led[5] L14
set_io led[6] M12
set_io led[7] N14
set_io rx P14
set_io tx M9
`,
  },
};
