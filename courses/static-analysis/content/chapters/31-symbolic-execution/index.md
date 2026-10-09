---
title: Symbolic execution
summary: Exploring a program one path at a time, with symbols for inputs and a solver to decide which paths exist. Path conditions and path trees, satisfiability and a CDCL solver, bit-blasting, path explosion, and a path-sensitive null check.
number: 31
duration: 65 minutes
prerequisites: [lattices-and-fixpoints, soundness]
---

Every analysis since Part III has handled all paths at once: facts from different paths are joined where the paths meet, and precision is lost at every join. Chapter 24 kept a few paths apart by partitioning. **Symbolic execution** goes all the way: it follows one path at a time, keeps everything it knows about that path, and asks a **solver** whether the path can be taken at all. It is precise where abstract interpretation approximates, and pays for it in the number of paths. James King described it in 1976 as a generalisation of testing: running a program on symbols instead of values covers, in one run, every input that takes the same path. :cite[king1976]

## Symbols and path conditions

Run `check(x, y)` below with symbols instead of numbers: `x` is *X*, `y` is *Y*. Assignments compute symbolic expressions: after `const z = x * 3 + 1`, `z` holds *X·3 + 1*. At a condition, the executor cannot decide which way to go, so it goes both ways: one path continues under the assumption *X·3 + 1 = 4000*, the other under its negation. Each path carries the conjunction of the assumptions made so far, its **path condition**. A path exists if and only if some input satisfies its path condition, and any such input, found by a solver, is a test case that follows exactly that path.

:::path-tree{n="31.1" title="Two magic numbers"}
```js
function check(x, y) {
  const z = x * 3 + 1;
  if (z === 4000) {
    if (y === x - 7) {
      assert(false);
    }
    return 1;
  }
  return 0;
}
```
:::

The tree has three paths. The solver finds `x = 1333`, the only value with *X·3 + 1 = 4000*, and then `y = 1326`, and reports that the assertion fails for those inputs. A random tester would need, on average, tens of thousands of tries to hit `x = 1333` among 16-bit integers, and as many again for `y`; chapter 32 races the two. Every leaf of the tree shows the input that reaches it: symbolic execution generates tests as a side effect. Click a leaf to see its path condition.

## Satisfiability

Deciding whether a path condition has a solution is a satisfiability problem. In its simplest form, **SAT**, a formula over Boolean variables, given as clauses (disjunctions of variables and their negations), asks for an assignment that makes every clause true. SAT was the first problem shown to be NP-complete :cite[cook1971]: no algorithm is known that solves every instance in polynomial time. Yet modern solvers routinely decide industrial instances with millions of clauses, because real formulas have structure that the solvers exploit.

The classic algorithm, DPLL, chooses a variable, tries a value, simplifies, and backtracks on a contradiction. Its key step is **unit propagation**: when all literals of a clause but one are false, the last one must be true, which can force others in turn. The solvers that made SAT practical add **conflict-driven clause learning** (CDCL). :cite[marquessilva1999,moskewicz2001,een2003]

- When propagation reaches a conflict, the solver analyses why: the decisions and propagations that forced the conflicting clause. It **learns** a new clause that rules out that combination, so that it is never tried again in any other part of the search.
- It then **backjumps** to the earliest decision that the learned clause involves, instead of undoing only the last one.
- It decides next on the variables involved in recent conflicts (**VSIDS**), keeps the last value each variable had (**phase saving**), and **restarts** from scratch from time to time, keeping what it learned.
- **Two watched literals** per clause make propagation cheap: a clause only needs attention when one of its two watched literals becomes false.

The course's solver implements all of these, in about two hundred lines, and decides the figures' formulas in milliseconds. The statistics under each figure count the queries, the size of the largest formula, and the conflicts the solver met.

## Bit-blasting

Path conditions speak about integers, not Booleans. **SMT solvers** (*SAT modulo theories*) such as Z3 and cvc5 combine a SAT solver with decision procedures for arithmetic, arrays and bit-vectors. The simplest approach, and the one the course uses, is **bit-blasting**: represent each integer as a fixed number of bits, each bit a Boolean variable, and each operation as a circuit. Addition is a chain of full adders, one per bit, each passing a carry to the next; multiplication adds shifted copies of one operand, one per bit of the other; a comparison subtracts and looks at the sign. Each gate becomes a few clauses with the **Tseitin transformation**: a new variable for the gate's output, and clauses that force it to equal the gate's function of its inputs. An `x * 3 + 1 = 4000` over 16-bit integers becomes a few thousand clauses.

JavaScript numbers are not 16-bit integers. Two choices keep the results honest. The executor only accepts integer arithmetic (a division or a non-integer literal ends the analysis with a message), and every addition, subtraction and multiplication adds a **side condition** that its exact result fits in 16 bits. A path that needs larger values gets no model: the executor may miss it, but every input it reports is a real JavaScript execution with the outcome it claims. That makes it an under-approximation, the opposite of Part V's analyses: what it finds is real, and what it does not find may still exist.

## Exercise: bit-blasting addition

```helper
id: symbolic-execution/adder
title: A ripple-carry adder
prompt: |
  Implement `fullAdder`, `add` and `sub` in `helpers/adder.ts`. They build circuits from gates, whatever the gates are: concrete Booleans, as in the visible tests, or CNF literals with Tseitin clauses, as in the course's bit-blaster. Bits are least significant first.

  - `fullAdder(g, a, b, c)` returns `[sum, carry]` for three input bits.
  - `add(g, a, b, carryIn)` adds two numbers of the same width, wrapping around on overflow, starting with the given carry (default `g.F`).
  - `sub(g, a, b)` computes `a − b` in two's complement, with one call to `add`: `a + ~b + 1`.
files:
  helpers/adder.ts: |
    export interface Gates<B> {
      T: B;
      F: B;
      not(a: B): B;
      and(a: B, b: B): B;
      or(a: B, b: B): B;
      xor(a: B, b: B): B;
    }

    export function fullAdder<B>(g: Gates<B>, a: B, b: B, c: B): [B, B] {
      // TODO
      return [g.F, g.F];
    }

    export function add<B>(g: Gates<B>, a: B[], b: B[], carryIn: B = g.F): B[] {
      // TODO
      return a.map(() => g.F);
    }

    export function sub<B>(g: Gates<B>, a: B[], b: B[]): B[] {
      // TODO
      return a.map(() => g.F);
    }
tests:
  adder.test.ts: |
    import { test, expect } from 'workbench:test';
    import { fullAdder, add, sub, type Gates } from '../rules/helpers/adder.js';

    const bools: Gates<boolean> = { T: true, F: false, not: (a) => !a, and: (a, b) => a && b, or: (a, b) => a || b, xor: (a, b) => a !== b };
    const bits = (n: number, w: number) => Array.from({ length: w }, (_, i) => ((n >> i) & 1) === 1);
    const num = (bs: boolean[]) => bs.reduce((acc, b, i) => acc + (b ? 2 ** i : 0), 0);

    test('a full adder', () => {
      expect(fullAdder(bools, true, true, false)).toEqual([false, true]);
      expect(fullAdder(bools, true, true, true)).toEqual([true, true]);
      expect(fullAdder(bools, false, true, false)).toEqual([true, false]);
    });
    test('4-bit addition, wrapping around', () => {
      for (let a = 0; a < 16; a++) for (let b = 0; b < 16; b++) expect(num(add(bools, bits(a, 4), bits(b, 4)))).toBe((a + b) % 16);
    });
hiddenTests:
  more.test.ts: |
    import { test, expect } from 'workbench:test';
    import { fullAdder, add, sub, type Gates } from '../rules/helpers/adder.js';

    const bools: Gates<boolean> = { T: true, F: false, not: (a) => !a, and: (a, b) => a && b, or: (a, b) => a || b, xor: (a, b) => a !== b };
    const bits = (n: number, w: number) => Array.from({ length: w }, (_, i) => ((n >> i) & 1) === 1);
    const num = (bs: boolean[]) => bs.reduce((acc, b, i) => acc + (b ? 2 ** i : 0), 0);

    test('all full-adder rows', () => {
      for (const a of [false, true]) for (const b of [false, true]) for (const c of [false, true]) {
        const total = Number(a) + Number(b) + Number(c);
        expect(fullAdder(bools, a, b, c)).toEqual([total % 2 === 1, total >= 2]);
      }
    });
    test('carry in', () => {
      expect(num(add(bools, bits(5, 4), bits(6, 4), true))).toBe(12);
    });
    test('subtraction in two’s complement', () => {
      for (let a = 0; a < 16; a++) for (let b = 0; b < 16; b++) expect(num(sub(bools, bits(a, 4), bits(b, 4)))).toBe((a - b + 16) % 16);
    });
    test('works on symbolic gates: a 3-bit adder is a circuit of 15 gates at most', () => {
      let gates = 0;
      const sym: Gates<string> = {
        T: '1', F: '0',
        not: (a) => (a === '1' ? '0' : a === '0' ? '1' : `!${a}`),
        and: (a, b) => (gates++, `(${a}&${b})`),
        or: (a, b) => (gates++, `(${a}|${b})`),
        xor: (a, b) => (gates++, `(${a}^${b})`),
      };
      const out = add(sym, ['a0', 'a1', 'a2'], ['b0', 'b1', 'b2']);
      expect(out.length).toBe(3);
      expect(gates).toBeLessThanOrEqual(15);
    });
answer:
  helpers/adder.ts: |
    export interface Gates<B> {
      T: B;
      F: B;
      not(a: B): B;
      and(a: B, b: B): B;
      or(a: B, b: B): B;
      xor(a: B, b: B): B;
    }

    export function fullAdder<B>(g: Gates<B>, a: B, b: B, c: B): [B, B] {
      const ab = g.xor(a, b);
      const sum = g.xor(ab, c);
      const carry = g.or(g.and(a, b), g.and(c, ab));
      return [sum, carry];
    }

    export function add<B>(g: Gates<B>, a: B[], b: B[], carryIn: B = g.F): B[] {
      const out: B[] = [];
      let carry = carryIn;
      for (let i = 0; i < a.length; i++) {
        const [s, c] = fullAdder(g, a[i]!, b[i]!, carry);
        out.push(s);
        carry = c;
      }
      return out;
    }

    export function sub<B>(g: Gates<B>, a: B[], b: B[]): B[] {
      return add(g, a, b.map((x) => g.not(x)), g.T);
    }
```

## Path explosion

The cost of precision is the number of paths. A function with `n` independent `if` statements in sequence has up to 2ⁿ paths, and a loop whose bound depends on an input has as many paths as the bound has values. Change the bound in the figure below and watch the tree grow: each extra iteration adds a path, and the executor stops at the bound, marking what it did not explore.

:::path-tree{n="31.2" bound="3" title="A loop, unrolled"}
```js
function sumTo(n) {
  let total = 0;
  let i = 1;
  while (i <= n) {
    total = total + i;
    i = i + 1;
  }
  assert(total !== 15);
  return total;
}
```
:::

With up to three iterations, the assertion holds on every path explored. With five, the executor finds `n = 5`, for which the total is 15. The bound decides what the executor can see: everything it reports is real, and anything beyond the bound is unknown. Symbolic executors fight path explosion in several ways: search heuristics that favour paths reaching new code; **state merging**, which joins the states of paths that meet, trading precision for fewer paths, exactly as abstract interpretation does; summaries of functions, as in chapter 26; and simply budgets of time and paths.

## Symbolic execution in practice

**KLEE** executes LLVM bitcode symbolically, with a model of the operating system's environment, and was famously run on the GNU coreutils, the standard Unix command-line tools: it generated tests with high coverage and found bugs in programs that had been in use for decades. :cite[cadar2008] Its successors and relatives power test generation and vulnerability research, often combined with fuzzing (chapter 32).

The **Clang Static Analyzer**, part of the LLVM project, is a symbolic executor used as a bug finder. :cite[clangsa] It explores each function's paths with a symbolic model of memory, unrolls loops a few times (four by default), inlines calls up to limits, and runs checkers along each path: null dereferences, use after free, leaks, misuse of APIs. Its reports are paths, shown step by step in the editor, and like the course's executor it stays close to *real* paths rather than all of them, to keep false positives low.

## A path-sensitive null check

Chapter 9's S2259 reports a property access on a value whose type, after TypeScript's narrowing, is `null`. The narrowing follows each condition separately and joins at the end of each `if`, so it cannot relate two conditions on the same input. In the function below, `user` is `null` unless `flag > 0`, and it is only used when `flag > 0`: the code is correct. An analysis that joins paths sees, after the first `if`, a `user` that may be `null` or an object, and either reports a false positive at `user.name` or, like S2259, stays silent because the type is not exactly `null`. The symbolic executor follows the paths: it finds the two combinations "object, then not used" and "null, then used" infeasible, and proves the access safe.

:::path-tree{n="31.3" title="Correlated conditions"}
```js
function greet(flag) {
  let user = null;
  if (flag > 0) {
    user = { name: 'Ada' };
  }
  if (flag > 0) {
    return user.name;
  }
  return 'anonymous';
}
```
:::

Now change the second condition to `flag < 10`. The executor reports that `user` can be `null` on line 7, with an input that shows it (`flag = 0`, for instance): a true positive that the joined analysis could only have reported together with the false one above.

```quiz
q: "Why does SonarJS not use symbolic execution for a rule like S2259?"
options:
  - text: "Because symbolic execution cannot handle JavaScript."
    why: "Symbolic executors for JavaScript exist, in research and in tools. The issue is cost and coverage, not possibility."
  - text: "Because its cost grows with the number of paths, and an analyser that runs on every file of every project, in CI and in the editor, needs a cost that grows with the size of the code."
    correct: true
    why: "Chapter 17's analysis runs every rule on every file within a time budget. Path-sensitive analysis is affordable for some checks with tight bounds; a rule must still give a useful answer when the bounds are hit, and stay silent rather than guess."
  - text: "Because symbolic execution has more false positives than type narrowing."
    why: "It usually has fewer: it only reports paths it proved feasible, as in 31.3. Its weakness is the paths it does not explore."
```

## What comes next

The executor needs a solver call per branch and gives up on what it cannot model. Fuzzing makes the opposite trade: no solver, no model of the program, millions of cheap executions. The next chapter, which is optional, races the two, and combines them.
