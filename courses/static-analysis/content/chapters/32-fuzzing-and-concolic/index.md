---
title: Fuzzing and concolic testing
summary: Finding bugs by running programs on generated inputs. Random testing, coverage-guided fuzzing and its mutations, magic numbers, concolic testing as symbolic execution steered by concrete runs, and hybrid fuzzers that combine the two.
number: 32
duration: 40 minutes
prerequisites: [symbolic-execution]
---

Symbolic execution reasons about every input that follows a path, and pays with a solver call per branch and with the parts of the program it cannot model. **Fuzzing** makes the opposite trade: no reasoning at all, only executions, as many as possible, on inputs chosen cleverly or not at all. Everything a fuzzer reports really happened: it ran the program and saw it fail. This chapter, which is optional, compares the two, and shows how modern tools combine them.

## Random testing

In 1988, during a thunderstorm, a line noise on Barton Miller's dial-up connection garbled his commands, and the UNIX utilities he was using crashed. His class turned the accident into a project: feed random bytes to the standard utilities and count the crashes. On every version of UNIX they tried, a quarter to a third of the utilities crashed or hung. :cite[miller1990] The name of the tool, **fuzz**, stuck to the whole field.

Random inputs are cheap and unbiased, and they fail on the same thing every time: conditions that only a few inputs satisfy. To pass `if (x === 31337)`, a uniformly random 16-bit `x` succeeds once in 65,536 tries; two such conditions in sequence, once in four billion. Real programs are full of them: magic numbers in file headers, checksums, version fields, keywords.

## Coverage-guided fuzzing

**Coverage-guided** fuzzers, of which AFL made the approach famous, add feedback. :cite[afl] The program is instrumented to record which branches each execution takes. The fuzzer keeps a **corpus** of inputs, and repeatedly picks one and **mutates** it: flips bits, adds or subtracts small numbers, replaces values with "interesting" ones (0, −1, powers of two, the boundaries of integer types), splices inputs together. An input that reaches a branch outcome no previous input reached joins the corpus. Progress accumulates: an input that passes the first check is kept and mutated further, so the second check is attacked from inputs that already pass the first.

Mutations do not guess magic numbers either, but fuzzers have learned to cheat. A **dictionary** of tokens, often extracted from the program itself (string and integer constants, keywords of the file format), gives mutations values to insert. Modern fuzzers go further and record the operands of the comparisons each execution performs, then copy the expected value into the input at the place it came from, which defeats most magic numbers without any reasoning. :cite[aschermann2019]

## The race

The figure runs five test generators on the same function, with the same budget of executions, and fixed random seeds. The chart shows how many branch outcomes each has covered after each number of executions, on a logarithmic scale; a dot marks the execution where it hit the failing assertion.

:::fuzzer-race{n="32.1" title="Two magic numbers"}
```js
function parse(x, y) {
  if (x === 31337) {
    if (y > x) {
      if (y - x === 1000) {
        assert(false);
      }
    }
  }
  return 0;
}
```
:::

Random testing and plain coverage-guided fuzzing stay stuck at the first condition for all 20,000 executions. The dictionary, which contains `31337` and `1000` because they appear in the code, gets the guided fuzzer through the first two conditions, but `y = 32337` appears nowhere in the code and is still out of reach. The fourth strategy finds the bug in a handful of executions.

## Concolic testing

**Concolic** testing (*concrete* and *symbolic*) runs the program on a real input and, alongside, computes the symbolic condition of every branch it takes, as the executor of chapter 31 does, but only along that one path. :cite[godefroid2005,sen2005] Then it negates one branch condition, keeps the ones before it, and asks the solver for an input: that input follows the same path up to the branch and goes the other way there. Each new input is run concretely in turn, and gives new branches to negate. SAGE organised this as a **generational search**: from each run, it negates every branch of the path, not just the last, and generates a whole generation of new inputs at once. :cite[godefroid2008] It ran at Microsoft on file parsers for years, and its developers reported that whitebox fuzzing found about a third of all the file-fuzzing bugs found during the development of Windows 7. :cite[bounimova2013]

In 32.1, the first run with `x = 0, y = 0` takes the false branch of `x === 31337`; negating it gives `x = 31337` directly. The next run reaches `y > x`, and so on: one solver call per barrier.

The concrete run gives concolic testing something pure symbolic execution lacks: a fallback. When the symbolic evaluation meets an operation the solver does not model (a library call, a hash, a division here), it uses the operation's **concrete** value and continues. The path stays real, but the conditions that depend on that value can no longer be steered.

:::fuzzer-race{n="32.2" title="A checksum the solver cannot see through"}
```js
function checksum(a, b) {
  let h = a;
  let i = 0;
  while (i < 6) {
    h = (h * 31 + b) % 1009;
    i = i + 1;
  }
  if (h === 7) {
    assert(false);
  }
  return h;
}
```
:::

Here the table turns. The remainder makes `h` concrete for the concolic tester, so it cannot ask for `h === 7`; it falls back on random inputs and runs out of its budget. One input in about a thousand gives `h = 7`, so random testing finds the bug in a few thousand executions, and the fuzzers do too.

## Hybrid fuzzing

The fifth strategy combines the two, as Driller did: :cite[stephens2016] it fuzzes, which is cheap and handles anything the program does, and when the fuzzer stops finding new coverage, it hands the corpus to the solver, which negates branches along the corpus's paths to get past conditions the mutations cannot guess. In 32.1, the solver gets it past the magic numbers; in 32.2, the fuzzer does the work. Hybrid fuzzers spend most of their time fuzzing and call the solver rarely, where it pays.

```quiz
q: "Coverage-guided fuzzing beat random testing in neither race. When does it beat it?"
options:
  - text: "When reaching a branch requires passing several conditions in sequence, each satisfied by a reasonable fraction of inputs."
    correct: true
    why: "Random inputs must satisfy all the conditions at once, with a probability that is the product of each one's. The guided fuzzer keeps the inputs that pass the first conditions and mutates them, so it pays for each condition separately. A parser that checks a header, then a version, then a length, then a field, is the typical case."
  - text: "When the condition is a single comparison with a constant that appears in the code."
    why: "That is where the dictionary helps, not the coverage feedback; without a dictionary, mutations guess the constant no better than random inputs."
  - text: "When the program computes a hash of its input."
    why: "Hashes defeat both: a small change to the input changes the hash unpredictably, so coverage gives no gradient to follow. Real fuzzers often remove checksums from the program under test for this reason."
```

## Testing and static analysis

Fuzzers and symbolic executors run the program: they need an entry point, a **harness** that feeds inputs to the code under test, and an environment in which it can run. What they report is real, and comes with an input that reproduces it. They say nothing about code they do not reach, and their findings depend on the time they are given. Continuous fuzzing services run them for weeks on open-source libraries; JavaScript has coverage-guided fuzzers too, and property-based testing libraries generate inputs in the same spirit inside ordinary unit tests.

Static analysers such as SonarJS make the other trade. They never run the code, so they reach every line, including error handling that tests never exercise, and give an answer in seconds on every change, in the editor and in CI. In exchange, they reason about possible behaviours rather than observed ones, and must be careful with what they claim (chapter 21). The two are complementary, and the best-tested projects use both.

## What comes next

The last chapter looks back at the course as a ladder, from matching patterns to reasoning about paths, and points to where to go next.
