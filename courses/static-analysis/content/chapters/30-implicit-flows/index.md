---
title: Implicit flows and noninterference
summary: Leaking a secret without ever copying it. Explicit and implicit flows, the pc label and control dependence, Denning's lattice, noninterference, security type systems, declassification, and why taint analysers usually look the other way.
number: 30
duration: 40 minutes
prerequisites: [taint-analysis]
---

Taint analysis follows data that is copied: assigned, concatenated, passed, returned. A program can also move information without copying anything, by letting a secret decide which branch it takes. This chapter, which is optional, is about those **implicit flows**, the theory that defines when a program keeps a secret, and the reasons the taint analyses of chapter 29 mostly ignore them.

## Leaking without copying

The function below receives a secret byte. It never assigns `secret`, or anything computed from it, to `out`: every assignment to `out` uses only `out` and `bit`. Yet it returns the secret, exactly. Run it, then try the other presets, or write your own.

:::leak-a-bit{n="30.1" title="Leak a bit"}
```js
function leak(secret) {
  let out = 0;
  let bit = 1;
  while (bit < 256) {
    if ((secret & bit) !== 0) {
      out = out | bit;
    }
    bit = bit * 2;
  }
  return out;
}
```
:::

The taint analysis, which only follows **explicit flows**, says the result is public. The other analysis says it depends on the secret, because it also follows the **implicit flow**: whether `out = out | bit` runs depends on `secret`, so after it, `out` carries information about `secret`, whatever value was assigned. The same happens when the secret only decides how many times a loop runs (*count up*), or which of two constants is returned (*one bit*).

## The pc label

An information-flow analysis gives each value a **security label**, here L for public and H for secret, and adds one more: the label of the **program counter**, or **pc**, which says what the decision to be at the current point depends on. At the start, the pc is L. Inside a branch of `if (c)`, the pc is the label of `c`, joined with the pc of the `if` itself. After the `if`, where both branches meet, it is back to what it was: being after the `if` reveals nothing.

An assignment `x = e` then gives `x` the label of `e` *joined with the pc*. In the figure, the lines marked `pc = H` are those that run only for some secrets: every variable written there becomes secret, and stays secret at the join after the branch, since one branch wrote it under a secret pc.

"Inside a branch" is easy to see in structured code, and must be computed in general, with `break`, `continue`, early `return` and exceptions. The standard tool is **control dependence**. A node `p` **post-dominates** a node `n` if every path from `n` to the function's exit passes through `p`. A node is control-dependent on a condition if one of the condition's branches always leads to it and the other may avoid it: formally, the node post-dominates one successor of the condition but not the condition itself. :cite[ferrante1987] Post-dominators are a dataflow analysis of their own (backward, over sets of nodes, with intersection as the join), and control dependence follows from them. The course's analysis computes both on the control-flow graphs of chapter 12, then iterates the labels and the pc together, since the label of a condition depends on the pc, and the pc on the labels of conditions.

## Lattices of secrets

Dorothy Denning's **lattice model** generalises the two labels. :cite[denning1976] Security classes form a lattice: information may flow from a class to any class above it, and the class of a value computed from several others is their join. Two levels, L ⊑ H, are the simplest case. With several principals, labels can be sets of owners (data that Alice and Bob may both see is below data that only Alice may see), and a value computed from Alice's data and Bob's data is visible only to whoever may see both. The certification of programs that Denning and Denning described the next year is the pc-based analysis of this chapter. :cite[denning1977]

## Noninterference

When does a program keep a secret? Goguen and Meseguer's answer, **noninterference**, does not mention labels or flows at all: a program is secure if its public outputs are the same for any two runs that have the same public inputs, whatever their secret inputs. :cite[goguen1982] Changing the secret must not *interfere* with anything an observer can see.

This is a property of *pairs* of runs, not of single runs: no single execution of the bit-by-bit function does anything wrong. It is what the figure tests when it runs the function on twelve secrets and compares the outputs: different outputs for different secrets are a violation. The analysis proves it for all inputs, in the sense of chapter 23: if it says the output is L, then the output is the same for every secret. The converse fails, as always: `if (secret > 0) { out = 1; } else { out = 1; }` gives the same output for every secret, and the analysis reports a dependence. Noninterference is a non-trivial property of programs, and Rice's theorem applies.

```quiz
q: "Which of these functions satisfies noninterference, with `secret` as the only secret input and the return value as the only public output?"
options:
  - text: "`function f(secret) { let x = 0; if (secret > 0) { x = 1; } x = 5; return x; }`"
    correct: true
    why: "Whatever the secret, the function returns 5: the assignment after the `if` overwrites what the branch did, and the pc is public there. The flow-sensitive analysis agrees."
  - text: "`function f(secret) { if (secret === 42) { return 1; } return 0; }`"
    why: "It returns 1 for one secret and 0 for the others: it reveals whether the secret is 42. The second `return` is control-dependent on the condition, because the first branch leaves the function."
  - text: "`function f(secret) { let n = 0; while (n < secret) { n = n + 1; } return 7; }`"
    why: "The return value is always 7, but the time the function takes, and for a negative secret whether it ends at all, depend on the secret. Noninterference in the sense above, about outputs only, holds; an observer who can time the call learns the secret. That is a timing channel."
```

The last option of the quiz shows the limits of the definition. A program can leak through **covert channels** that its outputs do not show: whether it terminates, how long it runs, how much memory it uses, what it leaves in a cache. The analysis of this chapter, like most, ignores them. Defending against timing channels needs code whose running time does not depend on secrets (constant-time comparison of passwords and keys, for instance), which is a different discipline.

## Security type systems

The analysis can also be written as a **type system**, in which a program that type-checks is guaranteed to satisfy noninterference. Volpano, Smith and Irvine gave the first such system with a soundness proof. :cite[volpano1996] Each variable has a fixed level, and the typing rule for an assignment `x = e` under a pc requires that `label(e) ⊔ pc ⊑ label(x)`: a secret may not be written to a public variable, and nothing may be written to a public variable under a secret pc. The course's analysis is the **flow-sensitive** variant, in which a variable's label can change from one point to the next, so that `x = 5` after the branch makes `x` public again. :cite[hunt2006] JFlow, now Jif, extended Java with such labels, including labels for multiple principals and a checker that runs at compile time. :cite[myers1999]

## Declassification

Real programs must reveal something about their secrets. A login check reveals whether the password was right; an aggregate statistic reveals something about every row it summarises. Noninterference forbids both. **Declassification** marks the places where the program deliberately releases information: in the figure, `declassify(secret > 127)` makes the comparison public, and the analysis accepts everything that follows from it. The policy question moves from "does anything leak?" to "does anything leak *except* what was declassified, and could an attacker abuse the declassification?", for instance by calling the login check a million times. Sabelfeld and Myers's survey covers this and the other extensions. :cite[sabelfeld2003]

## Why taint analysers look the other way

Most taint analyses for security, including those of chapter 29, track explicit flows only by default. Some can optionally track implicit ones, as FlowDroid can. There are two reasons for the default.

First, for **injection**, implicit flows rarely matter. An attacker who controls a branch condition can make the program run one of its own queries rather than another, but cannot insert SQL into it, unless the program copies their input character by character through branches, which real code almost never does.

Second, implicit flows make an analysis report much more. Every value computed after `if (req.query.debug)`, in either branch, would become tainted; a validation such as `if (!ALLOWED.has(column)) return` would taint everything that follows, since whether it runs depends on the input. A taint analysis that followed implicit flows would report nearly everything downstream of an input-dependent condition, and developers would stop reading it (chapter 21).

For **confidentiality**, the question is different: whether a password, a token or personal data can reach a log, a response or a third party. There, implicit flows are real leaks, and the analyses that care about them accept the noise or require annotations (labels on variables, declassification points) to control it. SonarJS's rules about secrets, such as S6418 (*Hard-coded secrets*), address a narrower question: they look at where a secret is *written* in the code, matching variable names against secret-sounding words and measuring the randomness of string literals, not where it flows.

::source{path="packages/analysis/src/jsts/rules/S6418/rule.ts" symbol="randomnessSensibility" title="S6418: names and entropy, not flows"}

## What comes next

Part VIII changes the question. Instead of approximating all executions at once, it explores them one path at a time, with a solver to decide which paths are possible: symbolic execution, and its cousin, fuzzing.
