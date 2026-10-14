# The Prime Staircase

*From the sieve to the Riemann Hypothesis.* An interactive course on the prime numbers, explained from scratch:
how to find them, test them and factor numbers; how to count them; and why counting them leads to the zeta
function, the prime number theorem and the Riemann Hypothesis.

- Plan and decisions: [docs/PLAN.md](docs/PLAN.md)
- Library used by widgets and exercises: `src/lib/primes`
- Chapters: `content/chapters/<nn>-<slug>/index.md`

```sh
npm ci
npm test                                                    # library, content and exercise tests
npm run check                                               # svelte-check
NODE_OPTIONS=--experimental-strip-types npm run build       # static site in dist/
npm run zeros -- 10000                                      # recompute the table of zeros of ζ
```
