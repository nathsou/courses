/**
 * Weft programs that Chapter 17's playgrounds start from, with their tests (the course's test language,
 * `$lib/weft/testbench.ts`). They live here, not in the Markdown, so that `snippets.test.ts` can run them.
 * (`::snippet-playground{id="…"}` looks them up.) A snippet with `rejected` is meant not to compile.
 */
export interface Snippet {
  title: string;
  /** The module to simulate (default: the only one). */
  top?: string;
  code: string;
  tests?: string;
  /** The program shows something Weft refuses: synth must report an error. */
  rejected?: boolean;
}

export const SNIPPETS: Record<string, Snippet> = {
  toggle: {
    title: 'A flip-flop in Weft',
    code: `/// Divides the clock by two: q changes at every rising edge.
module toggle(in clk: clock, out q: bool) {
    reg state: bool = false;

    state := !state;
    q = state;
}
`,
    tests: `test "q flips at every clock edge" {
    expect !q;
    step;
    expect q;
    step;
    expect !q;
    step 5;
    expect q;
}
`,
  },
  latch: {
    title: 'Trying to write a latch',
    rejected: true,
    code: `/// A transparent latch: q follows d while en is true, and keeps its value while en is false.
module latch(in en: bool, in d: bool, out q: bool) {
    let held = if en { d } else { held };
    q = held;
}
`,
  },
  'press-toggle': {
    title: 'A button that toggles a lamp',
    code: `/// Cleans up a bouncing push button or switch. The input is synchronised first; the output then changes
/// only after the input has held its new value for STABLE clock cycles in a row.
module debouncer<STABLE: int = 4>(in raw: bool @async, out clean: bool) {
    let level = sync(raw);
    reg state: bool = false;
    reg count: index<STABLE> = 0;
    let differs = level != state;
    let settled = count == STABLE - 1;

    if !differs || settled {
        count := 0;
    } else {
        count := count +% 1;
    }
    if differs && settled {
        state := level;
    }
    clean = state;
}

/// A push button that flips a lamp: every press, however much it bounces, flips it once.
module press_to_toggle(in clk: clock, in button: bool, out lamp: bool) {
    let clean = debouncer<STABLE: 4>(raw: button);
    let press = rising(clean);
    reg lit: bool = false;

    if press {
        lit := !lit;
    }
    lamp = lit;
}
`,
    tests: `test "one press flips the lamp once, however much the button chatters" {
    step 4;
    for i in 0..3 {
        set button = true;
        step;
        set button = false;
        step;
    }
    set button = true;
    step 12;
    expect lamp;
    set button = false;
    step 12;
    expect lamp;
    set button = true;
    step 12;
    expect !lamp;
}
`,
  },
};
