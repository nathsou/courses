/**
 * Lovelace's Note G (1843) in the course's card language: the table's 25 operations, with her variable
 * numbers, computing the Bernoulli number she calls B7 (−1/30; B8 in today's numbering) from B1, B3 and B5.
 * Operations 13–23 appear twice, as in her table (once for B3, once for B5): the engine had no way to vary
 * which column a card names, so the repetition is written out.
 *
 * Her equation, for n = 4:
 *   0 = −½·(2n−1)/(2n+1) + B1·(2n/2) + B3·(2n(2n−1)(2n−2)/(2·3·4)) + B5·(…) + B7
 * V13 accumulates the terms before B7, so B7 = −V13; the last operation stores it in V24.
 *
 * NOTE_G_PRINTED reproduces the slip in the published table, where operation 4 divides V5 by V4 instead of
 * V4 by V5.
 */

const header = (n: number) => `.decimal 20
# Lovelace's Note G: the Bernoulli number B7, with n = ${n}
N1 1             # V1 = 1
N2 2             # V2 = 2
N3 ${n}             # V3 = n
N21 0.16666666666666666667    # B1 = 1/6
N22 -0.03333333333333333333   # B3 = −1/30
N23 0.02380952380952380952    # B5 = 1/42
`;

const op = (n: number, sym: string, a: number, b: number, ...out: number[]) =>
  `${sym}                # operation ${n}\nL${a}\nL${b}\n${out.map((v) => `S${v}`).join('\n')}\n`;

function body(printed: boolean, n: number): string {
  const loop = (b: number, first: number) =>
    op(first, '-', 6, 1, 6) + // 2n − 1, 2n − 3, …
    op(first + 1, '+', 1, 7, 7) + // 3, 5, …
    op(first + 2, '÷', 6, 7, 8) +
    op(first + 3, '×', 8, 11, 11) +
    op(first + 4, '-', 6, 1, 6) +
    op(first + 5, '+', 1, 7, 7) +
    op(first + 6, '÷', 6, 7, 9) +
    op(first + 7, '×', 9, 11, 11) + // A3, A5, …
    op(first + 8, '×', b, 11, 12) + // B·A
    op(first + 9, '+', 12, 13, 13) +
    op(first + 10, '-', 10, 1, 10);
  return (
    header(n) +
    op(1, '×', 2, 3, 4, 5, 6) + // 2n
    op(2, '-', 4, 1, 4) + // 2n − 1
    op(3, '+', 5, 1, 5) + // 2n + 1
    (printed ? op(4, '÷', 5, 4, 11) : op(4, '÷', 4, 5, 11)) + // (2n − 1)/(2n + 1)
    op(5, '÷', 11, 2, 11) + // ½·(2n − 1)/(2n + 1)
    op(6, '-', 13, 11, 13) + // A0 = −½·(2n − 1)/(2n + 1)
    op(7, '-', 3, 1, 10) + // n − 1 (a counter)
    op(8, '+', 2, 7, 7) + // 2
    op(9, '÷', 6, 7, 11) + // A1 = 2n/2
    op(10, '×', 21, 11, 12) + // B1·A1
    op(11, '+', 12, 13, 13) + // A0 + B1·A1
    op(12, '-', 10, 1, 10) + // n − 2
    '# operations 13–23, for B3\n' +
    loop(22, 13) +
    '# operations 13–23 again, for B5\n' +
    loop(23, 13) +
    op(24, '-', 24, 13, 24) + // B7 = −(A0 + B1·A1 + B3·A3 + B5·A5)
    'P                # print B7\n' +
    op(25, '+', 1, 3, 3) // n + 1, ready for the next Bernoulli number
  );
}

export const NOTE_G = body(false, 4);
export const NOTE_G_PRINTED = body(true, 4);
export const B7 = -1 / 30;
