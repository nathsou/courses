---
title: Why every rule is approximate
summary: The halting problem, Rice’s theorem, false positives and false negatives, and rules that ask for a review instead of a verdict.
number: 1
duration: 40 minutes
prerequisites: [one-issue]
---

Suppose you set out to write the perfect rule against a common bug: reading a property of `null` or `undefined`. The rule must raise an issue on every line that can crash this way when the program runs, and on no other line. No false alarms, nothing missed.

This chapter shows that the rule cannot be written, for this bug or for almost any other. The argument is older than the programmable computer, and once you have seen it, you will read every rule in this course differently: not as a detector that is right or wrong, but as an approximation that chose which way to be wrong.

## A question no program can answer

Start with the simplest question one can ask about a program: *does it stop?* Given the source of a function and an input, will the function return, or run forever?

For many programs the answer is obvious. `return 1` stops. `while (true) {}` does not. A loop counting from 1 to 10 stops. But consider this function, which stops if and only if some even number greater than 2 is *not* the sum of two primes:

```typescript
function goldbach(): void {
  for (let n = 4; ; n += 2) {
    if (!isSumOfTwoPrimes(n)) return;
  }
}
```

Whether it stops is an open problem in mathematics (Goldbach's conjecture, unsolved since 1742). An analyser that could always answer "does this function stop?" would settle it. That alone suggests the question is hard. In 1936, Alan Turing showed it is worse than hard: no program can answer it correctly for every program and input. :cite[turing1936]

The proof fits in six lines. Suppose someone hands you a function `halts(program, input)` that always returns `true` if `program` stops when run on `input`, and `false` if it runs forever. Programs are text, so a program can be an input. Now write this:

```typescript
function contrary(program) {
  if (halts(program, program)) {
    while (true) {}   // loop forever
  }
  return 'done';
}
```

and ask what `contrary(contrary)` does. Try both answers:

::halting-gadget{n="1.1"}

If `halts` says `contrary(contrary)` stops, `contrary` loops forever. If it says it loops, `contrary` stops. Either way `halts` gave the wrong answer about one program, so the `halts` we were promised cannot exist. Nothing in the argument depends on how `halts` works, how clever it is or how long it runs: every candidate fails on the `contrary` built from it.

:::note
The problem is called the **halting problem**. Turing's 1936 paper proved that a related question about his machines cannot be decided; the name "halting problem" and the version given here came later. :cite[turing1936]
:::

## From halting to every interesting question

Back to the perfect null-dereference rule. Suppose it exists: a function `crashes(program)` that answers "can this program read a property of `null`?". Then we could decide halting after all. Given any `program` and `input`, build this:

```typescript
function wrapper() {
  run(program, input);   // simulate it; this may never return
  const x = null;
  return x.length;       // crashes, but only if we get here
}
```

`wrapper` reads a property of `null` exactly when `run(program, input)` returns, that is, exactly when `program` halts on `input`. So `crashes(wrapper)` would answer the halting question, which no program can do. The perfect rule does not exist.

The trick works for any question about what a program *does* when it runs, as long as some programs have the property and some do not: "can this divide by zero?", "can user input reach this SQL query?", "is this variable ever read after it is written?", "can this function return `undefined`?". Replace the last two lines of `wrapper` with code that has the property, and a perfect checker for the property decides halting. This is **Rice's theorem** (1953): every non-trivial property of what programs compute is undecidable. :cite[rice1953]

:::key
No rule that judges what a program does at run time can be right about every program. Every such rule will sometimes raise an issue on correct code, or stay silent on a real bug, or both.
:::

What Rice's theorem does *not* forbid is reasoning about the program's *text*. "Are both sides of this `&&` the same tokens?" is a question about syntax, and S1764 answers it exactly. But S1764 is not really about tokens: it exists because identical operands are usually a bug, and "is this a bug?" is a question about behaviour. `x !== x` has identical operands and is the standard test for `NaN`. The check is exact; what it is evidence for is not. That is why the rule needs its exceptions.

## Four outcomes

Since every rule is wrong sometimes, the useful question is *how* it is wrong. For each place in the code, a rule either raises an issue or does not, and there either is a problem there or there is not. That makes four outcomes:

| | There is a problem | There is no problem |
|---|---|---|
| **The rule raises an issue** | true positive (TP) | :term[false positive] (FP) |
| **The rule stays silent** | :term[false negative] (FN) | true negative (TN) |

Two numbers summarise a rule's behaviour on a body of code. **Precision** is the share of its issues that are real: TP / (TP + FP). **Recall** is the share of the real problems it finds: TP / (TP + FN). A rule that never raises anything has no false positives and finds nothing; a rule that raises an issue on every line finds everything and is useless. Every rule sits somewhere between.

The grid below holds eight snippets and the verdicts of a simple rule that flags every call written `Math.random()`, the first version from chapter 0. Decide for each whether there is really a problem, here meaning an unpredictable value being needed and `Math.random` used anyway, and watch precision and recall come out of your answers.

:::confusion-grid{n="1.2"}
```yaml
rule: "A rule that flags every call written Math.random()"
items:
  - code: "const token = Math.random().toString(36);\nres.cookie('session', token);"
    issue: true
    bug: true
    why: "A session token must be unpredictable, and Math.random's output can be predicted from earlier outputs."
  - code: "questions.sort(() => Math.random() - 0.5);"
    issue: true
    bug: false
    why: "Shuffling quiz questions needs no secrecy. (The shuffle is biased, but that is a different problem.)"
  - code: "const id = crypto.randomUUID();"
    issue: false
    bug: false
    why: "A cryptographically secure generator, used for an identifier."
  - code: "const { random } = Math;\nconst resetCode = random() * 1e6;"
    issue: false
    bug: true
    why: "The starter rule's blind spot from chapter 0: the call is Math.random, but it is not written that way. The fully qualified name fixes it."
  - code: "const delay = base * 2 ** attempt + Math.random() * 100;"
    issue: true
    bug: false
    why: "Jitter on a retry delay only needs to spread retries out; predictability does no harm."
  - code: "const code = String(Date.now() % 1000000);\nsendResetEmail(user, code);"
    issue: false
    bug: true
    why: "A predictable reset code, but not from Math.random. No rule about Math.random can find it: it is outside the rule's reach, a false negative for the problem it was meant to prevent."
  - code: "const winner = entrants[Math.floor(Math.random() * entrants.length)];"
    issue: true
    bug: true
    why: "If anything of value depends on the draw, a predictable generator lets someone rig it."
  - code: "const bucket = Math.random() < 0.5 ? 'A' : 'B';"
    issue: true
    bug: false
    why: "Assigning visitors to an A/B test needs a fair coin, not a secret one."
```
Each card shows a snippet and whether the rule raised an issue on it. Classify each one; the table and the two measures update as you go.
:::

Two things show in the grid. First, the false positives here are not mistakes in the rule's matching: it matched exactly what it was written to match. They are cases where the *syntax* the rule can see does not decide the *question* the developer cares about, which is whether the value needs to be secret. Second, some false negatives are out of any such rule's reach. A rule finds instances of a pattern; the bug may come in a shape the pattern does not cover.

```quiz
q: "Which change to the rule raises its recall on these eight cards without lowering its precision?"
options:
  - text: "Match calls by their fully qualified name, `Math.random`, instead of by their spelling."
    correct: true
    why: "It turns the aliased `random()` call from a false negative into a true positive and adds no new false positive. That is the chapter 0 rule."
  - text: "Flag every call to any function named `random`."
    why: "That also finds the aliased call, but would flag unrelated functions called `random` in other code: precision can only go down."
  - text: "Stop flagging calls inside `sort` callbacks."
    why: "That removes one false positive, so precision goes up; recall does not change."
  - text: "Also flag `Date.now()`."
    why: "It would catch the predictable reset code, but `Date.now()` is everywhere and almost always harmless: a flood of false positives."
```

## Over and under

Static analysers deal with Rice's theorem by approximating, and there are two directions to approximate in.

An **over-approximation** considers more behaviours than the program really has. If the analysis cannot tell whether a variable can be `null` at some point, it assumes it can. Every real crash is then reported, but so are some impossible ones. An analysis that never misses a real problem of its kind is called **sound** (for that property): it has no false negatives, and pays in false positives.

An **under-approximation** considers fewer behaviours than the program has: only the paths a test actually runs, or only the patterns the rule's author thought of. Everything it reports is real, but it misses things. An analysis with no false positives is called **complete** (again, for that property).

Rice's theorem says no analysis of a non-trivial property is both sound and complete. In the vocabulary used throughout the course:

| Approach | Tends towards | Raises | Misses |
|---|---|---|---|
| Testing, fuzzing, running the program | under-approximation | only real failures | everything the inputs did not reach |
| Pattern rules (most of Part I) | neither: a chosen pattern | pattern instances, real or not | bugs in other shapes |
| Abstract interpretation (Part V) | over-approximation | every possible problem, some impossible | nothing of the kinds it checks, if its model of the language is complete |
| Symbolic execution (Part VIII) | under-approximation on the paths it explores | problems with a concrete triggering input | paths it did not have time to explore |

Analysers are also described as **may** or **must** analyses. A *may* analysis computes facts that hold on *some* path ("x may be null here"); a *must* analysis computes facts that hold on *every* path ("x must have been assigned here"). Which one a rule needs depends on whether a false positive or a false negative is the worse mistake for it. You will meet both in Part III.

:::industry
Real analysers are rarely sound for the whole language. JavaScript has `eval`, getters that run arbitrary code, monkey-patched built-ins and modules loaded at run time; an analysis that assumed the worst about all of them would report an issue on nearly every line. The usual compromise was named **soundiness** by Livshits and colleagues in 2015: be sound for the core of the language and make documented, deliberate assumptions about the hard parts. :cite[livshits2015soundiness]
:::

## Which way to be wrong

For a rule that runs on someone else's code, false positives cost more than they first appear to. Each one asks a developer to stop, read code they believed was fine, understand the rule, and decide. When that happens too often, developers stop reading the issues, and the real ones are ignored with the rest. Engineers at Coverity described this from a decade of selling a static analyser in 2010, and engineers at Google reached the same conclusion from running analysers on their whole code base in 2018. :cite[bessey2010,sadowski2018] Chapter 21 comes back to it with SonarJS's own practice.

So most rules in production analysers, SonarJS's included, lean towards precision: they flag a pattern only where it is very likely to be a bug, and give up some recall to stay trusted. S1764's exceptions for `x !== x` and `1 << 1` are this trade-off at work.

Some questions cannot be settled from the code at all. Whether a random number needs to be secret depends on what it is used for, which the code rarely says. For such rules the message asks the developer to decide: *Make sure that using this pseudorandom number generator is safe here*. Sonar long gave rules of this kind their own category, **Security Hotspots**: security-sensitive code that needs a human review rather than a confirmed vulnerability. In SonarJS's rule metadata at the commit this course follows, those rules, S2245 among them, have become vulnerability rules tagged `former-hotspot`; the wording of their messages still shows where they came from.

::source{path="sonar-plugin/javascript-checks/src/main/resources/org/sonar/l10n/javascript/rules/javascript/S2245.json" symbol="former-hotspot" title="S2245's rule metadata" note="The rule's type, its impact on software qualities (SECURITY: MEDIUM), its tags and the quality profiles it belongs to. This file is generated from RSPEC; chapter 20 follows how."}

```quiz
q: "A rule reports every division whose divisor is not a non-zero literal. On a large code base it finds every division by zero that ever happened in production, and also raises 4,000 other issues. What can you say about it?"
options:
  - text: "It is sound for division by zero, and its precision is low."
    correct: true
    why: "Finding every real case means no false negatives (sound, for this property). The thousands of issues on correct divisions are false positives, so precision is low."
  - text: "It is complete for division by zero."
    why: "Complete means no false positives. This rule has thousands."
  - text: "It is both sound and complete, because it found every real bug."
    why: "Rice's theorem rules that out, and the 4,000 other issues show it."
```

## What comes next

Every rule in the rest of the course is an approximation, and each part gives rules more information to approximate with. Part I starts at the bottom, with the information every rule has: the syntax tree. Chapter 2 shows how source text becomes one.
