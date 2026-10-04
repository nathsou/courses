---
number: B
title: Vouch reference
summary: 'The language at a glance: lexical rules, types, expressions and their precedence, statements, functions and contracts, heap programs, systems, worlds and constraint problems, and what each engine accepts.'
---

Vouch is the course's language. A Vouch file is a list of declarations of four kinds: **functions** (with contracts), **systems** (state machines and processes), **worlds** (relational models) and **problems** (constraint problems). The [Workbench](/workbench/) checks every declaration with the engines that apply, and its language server gives the same diagnostics, hovers and badges in an editor. Every example on this page is checked by the course's test suite.

## Lexical rules

- Comments run from `//` to the end of the line; `///` before a declaration is its documentation, shown on hover.
- Identifiers are letters, digits and `_`, starting with a letter or `_`.
- Integer literals are decimal, hexadecimal (`0xff`) or binary (`0b1010`), with optional `_` separators.
- Mathematical symbols have Unicode spellings, converted as they are read: `∀` is `forall`, `∃` is `exists`, `⟹` is `==>`, `⟺` is `<==>`, `≤` and `≥` are `<=` and `>=`, `≠` is `!=`, `∧`, `∨` and `¬` are `&&`, `||` and `!`, and `↦` is `|->`.
- There are no semicolons. A newline ends a statement unless the line obviously continues: it ends with a binary operator or a comma, the newline is inside parentheses or brackets, or the next line starts with a binary operator such as `&&` or `==>`.

## Types

| Type | Values | Notes |
|---|---|---|
| `bool` | `true`, `false` | |
| `int` | mathematical integers | unbounded: no overflow, ever |
| `nat` | integers ≥ 0 | assigning a negative value is a proof obligation |
| `lo..hi`, `lo..=hi` | a finite range (`..` excludes `hi`, `..=` includes it) | mainly for the variables of systems |
| `i8` … `i64`, `u8` … `u64` | machine integers | every arithmetic operation that could overflow is an obligation |
| `bv1` … `bv64` | bit-vectors | arithmetic wraps silently; signed operations are functions (`slt`, `sdiv`, `ashr`, …) |
| `[T]` | finite sequences (arrays) | `len(a)`, `a[i]`, slices `a[i..j]`, update `a[i := v]`, concatenation `++` |
| `set<T>`, `multiset<T>` | finite sets and multisets | literals `{1, 2}`, membership `in`, size `#s`, `+` and `-` for union and difference |
| `map<K, V>` | finite maps | `m[k]`, `keys(m)` |
| `A -> B` | total functions over a finite domain | in systems: `var owner: Account -> Shard` |
| `(A, B)` | tuples | |
| `enum`, `struct` | declared data types | `enum Vote { none, yes, no }`, `struct Msg { kind: Kind, shard: Shard }` |
| `ref C`, `ref C?` | references to objects of a `class` | `?` allows `null`; heap programs only |
| `type T` | atoms: values with equality and nothing else | `symmetric type T` lets the explorer use symmetry; `instance T = 3` fixes a size |

Conversions between integer types are written `x as T`; a conversion that can lose information is an obligation.

## Expressions

From loosest to tightest binding:

| Operators | Meaning |
|---|---|
| `<==>` | if and only if |
| `==>`, `<==` | implies (right-associative), is implied by |
| `until`, `~>` | temporal: until, leads to (in properties) |
| `\|\|` | or |
| `&&`, `**` | and; separating conjunction (heap assertions) |
| `==`, `!=`, `<`, `<=`, `>`, `>=`, `in`, `!in`, `\|->` | comparisons, membership, points-to; `0 <= i < n` chains |
| `\|`, `^`, `&` | bitwise or, xor, and |
| `<<`, `>>` | shifts |
| `+`, `-`, `++` | addition, subtraction, concatenation |
| `*`, `/`, `%` | multiplication, division and remainder (division truncates towards zero, as in C, Java and Rust) |
| `as` | conversion |
| `-`, `!`, `~`, `#` | negation, not, bitwise not, size |

Other expressions:

- `forall x: T :: P` and `exists x: T :: P`; several variables with commas; the type may be omitted when the body bounds the variable (`forall k :: 0 <= k < len(a) ==> …`).
- `if c { a } else { b }` is an expression; so is `match`.
- `old(e)` in a postcondition is `e` evaluated on entry.
- `{ x: T | P }` is the set of `x` satisfying `P`; `[f(k) | k in a..b]` is a sequence.
- `sum(s)`, `min(a, b)`, `max(a, b)`, `abs(x)`, `multiset(a)`, `set(a)`, `reversed(a)`.

## Functions and contracts

```vouch
/// The index of the largest element.
fn argmax(a: [int]) -> (best: int)
  requires len(a) > 0
  ensures 0 <= best < len(a)
  ensures forall k :: 0 <= k < len(a) ==> a[k] <= a[best]
{
  best = 0
  for i in 1..len(a)
    invariant 0 <= best < i
    invariant forall k :: 0 <= k < i ==> a[k] <= a[best]
  {
    if a[i] > a[best] {
      best = i
    }
  }
}
```

- `fn` declares a function with a body that runs. Its contract is a list of `requires` (preconditions), `ensures` (postconditions; `result`, or the named result, is the return value) and, for recursion, `decreases`.
- `pure fn` is a function without side effects that may appear in specifications; `pred` is a pure function returning `bool`.
- `lemma` is a function whose body is a proof and which is erased at run time (chapter 19).
- `inout` parameters may be changed by the function; the caller sees the change. `old(…)` refers to their values on entry.
- `ghost` variables and parameters exist only for the proof.

Statements: `let` (immutable) and `var` (mutable), assignment and multiple assignment `a, b = b, a`, `if` / `else`, `while` and `for i in a..b` with `invariant` and `decreases` clauses, `loop` with `break`, `match`, `return`, `assert`, and `assume` (which the exercises forbid, since it makes anything verify).

## Heap programs

```vouch
class Cell {
  val: int
}

fn swap(x: ref Cell, y: ref Cell)
  requires x.val |-> 1 ** y.val |-> 2
  ensures x.val |-> 2 ** y.val |-> 1
{
  let t = x.val
  x.val = y.val
  y.val = t
}
```

`class` declares objects on a heap; `new C { … }` allocates one and `free x` releases it. Heap assertions use separation logic (chapters 21–22): `x.f |-> v` (the field holds `v`, and the assertion owns it), `P ** Q` (both, on disjoint parts of the heap), `emp` (nothing), and recursive predicates such as the built-in `list(x)` and `lseg(x, y)`. A function whose contract uses them is checked by the separation-logic verifier.

## Systems

```vouch
system Counter {
  var n: 0..=3 = 0
  var done: bool = false

  action step when n < 3 && !done {
    n = n + 1
  }
  action stop when !done {
    done = true
  }

  invariant bounded: n <= 3
  property ends: eventually always (n == 3 || done)
  fairness weak stop
}
```

- `var` declares a state variable with its initial value; an `init { … }` block can set up more complex initial states, and `fact`s constrain them.
- `action name(params) when guard { … }` is a step: it may happen whenever its guard holds, for any values of its parameters.
- `process P(id: T) { … }` declares one process per value of `id`; labels (`l: stmt`) divide its body into atomic steps, `await c` blocks until `c` holds, and `P(i) at l` says that process `i` is at label `l` (chapter 2).
- `invariant` states a property of every reachable state; `property` a temporal one, with `always`, `eventually`, `next`, `until` and `~>` (chapter 3); `fairness weak A` or `fairness strong A` rules out runs that ignore `A` forever.
- `refines Spec via { v = e, … }` asks for every step to map to a step of the system `Spec`, or to none (chapter 4).

## Worlds

```vouch
world Family {
  type Person
  rel parent: Person -> set Person
  fact no_self: forall p: Person :: p !in p.^parent
  check acyclic: forall p: Person :: p !in p.parent for 3
  run some_family: some { p: Person | some p.parent } for 3
}
```

A world declares atom types and relations, with multiplicities (`one`, `lone`, `some`, `set`), relational operators (`.` for join, `^` for transitive closure, `~` for converse) and `fact`s. `check P for n` looks for a counterexample with at most `n` atoms of each type; `run P for n` looks for an instance (chapter 9).

## Problems

```vouch
problem Queens4 {
  type Row = 0..4
  var col: Row -> 0..4
  constraint columns: forall r1: Row, r2: Row :: r1 != r2 ==> col[r1] != col[r2]
  constraint diagonals: forall r1: Row, r2: Row :: r1 != r2 ==> col[r1] - col[r2] != r1 - r2 && col[r1] - col[r2] != r2 - r1
  count
}
```

A problem declares finite variables and constraints, then `solve` (find one solution) or `count` (count them). It is encoded into SAT (chapter 6), and every solution found is checked by the interpreter.

## Which engine runs

| Declaration | Engines (chapters) | Badge when it succeeds |
|---|---|---|
| `fn`, `lemma` | the program verifier with SMT (16–20); random testing when a construct is outside it | verified for all inputs, with a re-checked SMT proof |
| heap `fn` | the separation-logic verifier (21–22) | verified |
| `system` | the explorer (1–4), BDDs (11), BMC and k-induction for wide bit-vectors (10, 23), IC3 when the state space is too large (24) | every state checked, or an inductive invariant re-checked |
| `world` | the relational model finder (9) | no counterexample up to the scope |
| `problem` | the SAT encoding (6) | each solution checked |

Appendix C says what each engine checks, where it stops, and what its certificate is.
