/**
 * The designs the course ships, in its HDL. The decade counter is the running example of Part III: one digit
 * of a digital clock, counting 0 to 9 while `en` is high, with a synchronous reset and a terminal-count output
 * that tells the next digit to count.
 */

export const DECADE_COUNTER = `// One digit of a clock: counts 0, 1, …, 9, 0, … while en is 1.
input en
input rst
reg q: 4 = 0
output tc = en && q == 9      // terminal count: the next digit counts
output digit: 4 = q
q <= rst ? 0 : !en ? q : q == 9 ? 0 : q + 1
`;

/** The same counter with the classic off-by-one: it wraps after 10, not after 9. */
export const DECADE_COUNTER_BUGGY = `// One digit of a clock: counts 0, 1, …, 9, 0, … while en is 1.
input en
input rst
reg q: 4 = 0
output tc = en && q == 9      // terminal count: the next digit counts
output digit: 4 = q
q <= rst ? 0 : !en ? q : q == 10 ? 0 : q + 1
`;

/** A free-running 4-bit binary counter: the simplest sequential design. */
export const BINARY_COUNTER = `// Counts 0 to 15 and wraps, one step per clock cycle.
reg q: 4 = 0
output count: 4 = q
q <= q + 1
`;

/** A 4-bit ripple-carry adder, written bit by bit, and the same adder written with +. */
export const ADDER_BITS = `input a: 4
input b: 4
wire c1 = a[0] & b[0]
wire c2 = (a[1] & b[1]) | (c1 & (a[1] ^ b[1]))
wire c3 = (a[2] & b[2]) | (c2 & (a[2] ^ b[2]))
wire c4 = (a[3] & b[3]) | (c3 & (a[3] ^ b[3]))
output s: 5 = {c4, a[3] ^ b[3] ^ c3, a[2] ^ b[2] ^ c2, a[1] ^ b[1] ^ c1, a[0] ^ b[0]}
`;

export const ADDER_PLUS = `input a: 4
input b: 4
output s: 5 = a + b
`;
