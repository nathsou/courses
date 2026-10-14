/**
 * Computes the ordinates of the first zeros of ζ on the critical line with the course's own code
 * (Hardy's Z by Euler–Maclaurin, sign changes refined by regula falsi), checks the count against the
 * Riemann–von Mangoldt formula, and writes
 *   src/lib/primes/zeros.ts      the first 100 (imported by the library and the exercises)
 *   static/data/zeros.json       the first COUNT (fetched by the widgets)
 * Run: npm run zeros -- [COUNT]
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { findZeros, zeroCountSmooth } from '../src/lib/primes/zeta';

const COUNT = Number(process.argv[2] ?? 10000);
// Height comfortably above the COUNT-th zero: invert N(T) ≈ (T/2π) log(T/2πe).
let T = 100;
while (zeroCountSmooth(T) < COUNT + 20) T *= 1.05;
const start = Date.now();
const zeros = findZeros(T);
console.log(`found ${zeros.length} zeros up to ${T.toFixed(1)} in ${((Date.now() - start) / 1000).toFixed(1)} s`);
// Turing-style sanity check: the count up to the midpoint between consecutive zeros stays within 1.5 of the smooth formula (|S(T)| < 1 in this range).
let worst = 0;
for (let i = 0; i + 1 < zeros.length; i += 50) {
  const mid = (zeros[i]! + zeros[i + 1]!) / 2;
  worst = Math.max(worst, Math.abs(i + 1 - zeroCountSmooth(mid)));
}
console.log(`max |found − smooth N(T)| at sampled midpoints: ${worst.toFixed(3)}`);
if (worst > 1.5) throw new Error('zero count disagrees with N(T): a close pair was probably missed');
const first = zeros.slice(0, COUNT);
mkdirSync('static/data', { recursive: true });
writeFileSync('static/data/zeros.json', JSON.stringify(first.map((g) => Number(g.toFixed(9)))));
writeFileSync(
  'src/lib/primes/zeros.ts',
  `/**\n * The ordinates γ of the first 100 non-trivial zeros ½ + iγ of ζ, computed by scripts/zeros.ts with the course's\n * own code (and checked against published values in the tests). The widgets fetch the first ${COUNT} from\n * static/data/zeros.json.\n */\nexport const ZEROS: readonly number[] = [\n${first
    .slice(0, 100)
    .map((g) => `  ${g.toFixed(12)},`)
    .join('\n')}\n];\n`,
);
