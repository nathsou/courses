/**
 * The programs of Appendix F's playgrounds, the same as the blocks on the page (a test checks that they are), with
 * their tests. (`::snippet-playground{id="…"}` looks them up.)
 */
export interface Snippet {
  title: string;
  top?: string;
  code: string;
  tests?: string;
  solution?: string;
}

export const SNIPPETS: Record<string, Snippet> = {
  glance: { title: 'A module at a glance', code: `/// A 4-bit counter with enable and synchronous clear.
module counter(
    in  clk: clock,
    in  enable: bool,
    in  clear: bool,
    out count: uint<4>,
    out wrapped: bool,
) {
    reg value: uint<4> = 0;

    if clear {
        value := 0;
    } else if enable {
        value := value +% 1;
    }
    count = value;
    wrapped = enable && value == 15;
}
`, tests: `test "counts while enabled, and clear wins" {
    set enable = true, clear = false;
    step 3;
    expect count == 3;
    set clear = true;
    step;
    expect count == 0;
}
` },
  memory: { title: 'A register file in block RAM', code: `/// A register file: two read ports, one write port. The reads are registered, so this is block RAM.
module regs(
    in  clk: clock,
    in  write: bool,
    in  waddr: uint<5>,
    in  wdata: uint<32>,
    in  raddr: uint<5>,
    out rdata: uint<32>,
) {
    mem x: [uint<32>; 32] init [0; 32];
    reg q: uint<32> = 0;
    q := x[raddr];
    if write {
        x[waddr] := wdata;
    }
    rdata = q;
}
`, tests: `test "a word written is read a cycle after its address" {
    set write = true, waddr = 3, wdata = 33;
    step;
    set write = false, raddr = 3;
    step;
    expect rdata == 33;
}

test "a read in the cycle of a write sees the old word" {
    set write = true, waddr = 5, wdata = 7, raddr = 5;
    step;
    expect rdata == 0;
    step;
    expect rdata == 7;
}
` },
  'std-presses': { title: 'Counting presses', code: `/// Counts the presses of a button: synchronised, then a pulse on each rising edge.
module press_counter(in clk: clock, in btn: bool, out presses: uint<8>) {
    let pressed = rising(sync(btn));
    reg count: uint<8> = 0;
    if pressed {
        count := count +% 1;
    }
    presses = count;
}
`, tests: `test "a press is counted three cycles after the button goes down" {
    set btn = true;
    step 2;
    expect presses == 0;
    step;
    expect presses == 1;
    step 5;
    expect presses == 1;
}

test "two presses, two counts" {
    set btn = true;
    step 4;
    set btn = false;
    step 4;
    set btn = true;
    step 4;
    expect presses == 2;
}
` },
};
