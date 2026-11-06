---
number: B
title: The rule language
summary: Girafe syntax and the course’s extensions, equations, pragmas, labels, conditions, queries, goals and infix operators, with the built-in externals and the options of the workbench.
duration: Reference
---

Rule files in this course are written in the syntax of **Girafe**, a rewriting language and compiler by Nathan Soufflet,:cite[girafe] extended with a few constructs that the theory needs. Everything here works in every workbench.

## Girafe syntax

| Construct | Example | Notes |
|---|---|---|
| comment | `-- to the end of the line` | |
| rule | `+(S(x), y) -> S(+(x, y))` | one per statement; a statement may continue over several lines |
| variable | `x`, `tl`, `acc'` | a name starting with a lower-case letter |
| wildcard | `_` | a fresh variable each time |
| function symbol | `S`, `Nil`, `0`, `+`, `:`, `=>` | any other name: upper case, digit, or one of `. - ~ + * & | / \ ^ % ° $ @ # ; : _ = ' > < !` |
| application | `F(x, G(y))` | constants have no parentheses: `True`, `0` |
| laziness | `If(True, a?, b?) -> a`; `Nats(n) -> :(n, Nats(S(n))?)` | on a left-hand side, `?` makes an argument position lazy; on a right-hand side it freezes a subterm until a match needs it |
| externals | `@add(a, b)` | built-in operations on integers, below |
| conditional | `if(c, a, b)` | built in: `if(True, a, b) -> a`, `if(False, a, b) -> b`, branches lazy |

A rule's left-hand side must not be a variable, and every variable of the right-hand side must occur on the left (or in a condition). The workbench reports violations as errors.

## The course's extensions

| Construct | Example | Meaning |
|---|---|---|
| equation | `*(*(x, y), z) == *(x, *(y, z))` | for completion and proofs (Part VI); the symbol `==` as in the TPDB format |
| query | `? +(S(0), S(0))` | evaluate a term (a line starting with `?`) |
| goal | `? I(I(a)) == a` | are the two sides equal? (same normal form; or proved by unfailing completion in the *Completion* tab) |
| label | `[Fold] Add(Lit(a), Lit(b)) -> Lit(@add(a, b))` | names a rule for strategies |
| condition | `Max(x, y) -> x if @ge(x, y) ->* True` | `s ->* t`: the normal form of $s$ is an instance of $t$ (and may bind new variables); `s == t`: same normal form; several conditions separated by commas |

### Pragmas

A pragma is a line starting with `#` followed by a lower-case word.

| Pragma | Example | Meaning |
|---|---|---|
| `#infixl`, `#infixr`, `#infix` | `#infixl 6 +` | declare infix operators with a precedence (0–20) and associativity; then `x + 0 -> x` means `+(x, 0) -> x`. Infix operators need spaces around them. |
| `#priority` | | rules are tried in order and the first match wins (Girafe's semantics); without it, a file is an unordered set of rules |
| `#ac` | `#ac + *` | associative-commutative symbols: rewriting modulo AC in the *Run* tab |
| `#precedence` | `#precedence I > * > E` | the precedence used by the *Completion* tab (with LPO, or KBO with `order="kbo"`) |
| `#strategy` | `#strategy simp = innermost(A <+ B)` | a named strategy for the *Strategy* tab |

### Strategies

`id`, `fail`, a rule label, `rules` (any rule at the root), `s1 ; s2`, `s1 <+ s2`, `try(s)`, `repeat(s)`, `all(s)`, `one(s)`, `some(s)`, `topdown(s)`, `bottomup(s)`, `alltd(s)`, `oncetd(s)`, `oncebu(s)`, `innermost(s)`, `outermost(s)`, `where(s)`, `not(s)`, and the names of `#strategy` definitions. Chapter 25 explains them.

## Externals

Externals compute on integer constants (names like `42` or `-7`), with arbitrary precision. They apply only when their arguments are integers (or, for equality, terms with no variables and no frozen parts).

| External | Result |
|---|---|
| `@add`, `@sub`, `@mul`, `@div`, `@mod`, `@pow`, `@max`, `@min` | arithmetic (`@div` truncates; `@mod` is non-negative; division by zero does not reduce) |
| `@lt`, `@le`, `@gt`, `@ge` | `True` or `False` |
| `@equ` (also `@eq`), `@neq` | syntactic equality of ground terms |

## The workbench

Every ```` ```girafe ```` block in the course is a workbench. Its tabs:

- **Run**: evaluate each query with innermost evaluation (honouring `#priority`, laziness and conditions), or modulo AC if the file declares `#ac`; goals compare normal forms.
- **Trace**: one step at a time, with a choice of strategy, or click the redex yourself.
- **Termination**: try LPO, KBO and MPO with every precedence, linear polynomial interpretations, dependency pairs, and a search for loops.
- **Confluence**: compute the critical pairs, join them, and decide confluence when a criterion applies (orthogonality, or termination with joinable critical pairs). Conditions are ignored.
- **Completion**: Knuth–Bendix completion of the equations (and rules), and unfailing completion for each goal.
- **Strategy**: apply a named or typed strategy to each query.
- **Saturate**: equality saturation of each query with the rules, then extraction of the smallest term.

Every computation has a step, size or time limit, and says when it stops early.
