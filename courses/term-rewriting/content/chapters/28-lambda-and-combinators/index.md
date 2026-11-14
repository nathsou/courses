---
number: 28
title: λ-calculus and combinators
summary: β-reduction and the trouble with binders, combinatory logic as an orthogonal rewrite system, bracket abstraction, de Bruijn indices and explicit substitutions, and functions for Pebble.
duration: About 2 hours
prerequisites: [reduction-semantics, orthogonality]
theorems: [Bracket abstraction simulates β-reduction, Combinatory logic is confluent, Church–Rosser]
techniques: [bracket abstraction]
---

The λ-calculus is the rewriting system behind functional programming: a single rule, β-reduction, computes everything. But it is not a *first-order* rewrite system, because its terms have **binders**, and everything in this course so far has been first order. This chapter shows three ways to bring the λ-calculus into the first-order world: combinators, which remove variables altogether; de Bruijn indices, which remove names; and explicit substitutions, which make substitution itself a set of rules. (The collection's course on the Calculus of Inductive Constructions builds the λ-calculus and its confluence from the other side, as the core of a proof assistant.)

## β-reduction and binders

λ-terms are variables $x$, applications $M\,N$ and abstractions $\lambda x.\,M$ (the function that maps $x$ to $M$). Computation is one rule:
$$ (\lambda x.\, M)\, N \;\to_\beta\; M[x := N]. $$
The trouble is the substitution $M[x := N]$. It must replace only the *free* occurrences of $x$, and it must not let free variables of $N$ be **captured** by binders in $M$: substituting $y$ for $x$ in $\lambda y.\, x$ must give $\lambda y'.\, y$, renaming the bound $y$ first, not $\lambda y.\, y$. So terms are identified up to renaming of bound variables (α-equivalence), and substitution is a meta-level operation, not a rewrite step. Neither fits first-order rewriting, where a rule's variables stand for arbitrary subterms and substitution is the blind replacement of Chapter 2.

:::theorem{name="Church and Rosser" year=1936 status=stated}
β-reduction is confluent.
:::

Church and Rosser's theorem (Chapter 4) is what makes the λ-calculus a reasonable foundation for computation: a λ-term has at most one normal form.:cite[church-rosser1936] The modern proof is Tait and Martin-Löf's parallel reduction, the same technique as the parallel moves lemma of Chapter 17; Barendregt's book gives it in full.:cite[barendregt1984]

## Combinatory logic

In 1924 Moses Schönfinkel showed that variables can be eliminated entirely:cite[schonfinkel1924] every λ-term can be expressed with two constants, $S$ and $K$, and application alone. With a binary symbol `Ap` for application, they obey three first-order rules (the third combinator, $I$, is definable as $SKK$ but convenient):

```girafe title="Combinatory logic" tools="trace,run,confluence" strategy="outermost"
Ap(I, x) -> x
Ap(Ap(K, x), y) -> x
Ap(Ap(Ap(S, x), y), z) -> Ap(Ap(x, z), Ap(y, z))
? Ap(Ap(Ap(S, K), K), A)
? Ap(Ap(Ap(S, Ap(K, Ap(S, I))), K), A)
```

$I\,x = x$; $K\,x\,y = x$ (keep the first argument); $S\,x\,y\,z = x\,z\,(y\,z)$ (apply $x$ to $z$ and to $y\,z$, sharing the argument). This is an ordinary rewrite system, left-linear and without critical pairs (check the *Confluence* tab): it is orthogonal, so it is confluent by Chapter 17, although it does not terminate ($S I I (S I I)$ loops). Haskell Curry rediscovered and developed combinatory logic independently;:cite[curry-feys1958] Hindley and Seldin's textbook covers both sides.:cite[hindley-seldin2008]

## Bracket abstraction

To translate a λ-term into combinators, remove the abstractions one at a time, from the inside out, with the **bracket abstraction** $[x]M$, a combinator term that behaves like $\lambda x.\, M$:

$$
[x]\,x = I, \qquad [x]\,M = K\,M \;\;(x \notin M), \qquad [x]\,(M\,N) = S\,([x]M)\,([x]N).
$$

The common optimisation $[x]\,(M\,x) = M$ when $x \notin M$ (η-reduction) keeps translations small.

:::theorem{status=proved}
For every combinator term $M$ and term $N$: $([x]M)\,N \to^* M[x := N]$, where the substitution is ordinary first-order replacement (combinator terms have no binders).
:::

:::proof
By induction on $M$. If $M = x$: $I\,N \to N$. If $x \notin M$: $K\,M\,N \to M = M[x := N]$. If $M = P\,Q$: $S\,([x]P)\,([x]Q)\,N \to ([x]P)\,N\,(([x]Q)\,N) \to^* P[x := N]\;Q[x := N]$ by the induction hypothesis on both sides, and that is $(P\,Q)[x := N]$. The η case: $M\,N = (M\,x)[x := N]$ when $x \notin M$.
:::

So β-reduction becomes first-order rewriting, and capture cannot happen because there are no bound variables left. Type a λ-term below and watch it compile to $S$, $K$ and $I$, then reduce:

::lambda-lab

The price is twofold. Translations can be large: naive bracket abstraction can blow up quadratically or worse, which is why David Turner's combinator-based implementation of SASL (1979) added extra combinators such as $B$ and $C$. And combinatory reduction is **weak**: it never reduces "under a λ", because there is no λ, so $S\,K\,K$ and $I$ are both normal forms although they denote the same function.

## Names without names: de Bruijn indices

Nicolaas de Bruijn proposed replacing each bound variable by a number: how many binders up its own binder is.:cite[debruijn1972] So $\lambda x.\,\lambda y.\,x$ becomes $\lambda\,\lambda\,2$ and $\lambda x.\, x\,(\lambda y.\, x\, y)$ becomes $\lambda\, 1\,(\lambda\, 2\, 1)$. α-equivalent terms become identical, so α-conversion disappears. Substitution still has to adjust indices when it passes under a binder (the "shifting"), but it is now a purely syntactic operation, and proof assistants and compilers use de Bruijn indices internally for exactly this reason. The lab above shows the de Bruijn form of each term.

## Explicit substitutions

The last step makes substitution itself a set of rewrite rules. In the **λυ-calculus** of Pierre Lescanne (1994),:cite[lescanne1994] terms use de Bruijn indices, and a substitution is an explicit term constructor `Sub(a, s)`, with substitutions built from `Slash(b)` (replace index 1 by $b$), `Lift(s)` (pass under a binder) and `Shift` (add one to every index). β-reduction just creates a substitution, and seven more first-order rules carry it out:

```girafe title="The λυ-calculus" tools="trace,run" strategy="outermost"
App(Lam(a), b) -> Sub(a, Slash(b))
Sub(App(a, b), s) -> App(Sub(a, s), Sub(b, s))
Sub(Lam(a), s) -> Lam(Sub(a, Lift(s)))
Sub(Var(One), Slash(a)) -> a
Sub(Var(Succ(n)), Slash(a)) -> Var(n)
Sub(Var(One), Lift(s)) -> Var(One)
Sub(Var(Succ(n)), Lift(s)) -> Sub(Sub(Var(n), s), Shift)
Sub(Var(n), Shift) -> Var(Succ(n))
? App(Lam(Lam(Var(Succ(One)))), A)
? App(Lam(App(Var(One), Var(One))), Lam(Var(One)))
```

The first query is $(\lambda\lambda\,2)\,A$, which should give $\lambda A$ shifted: the result `Lam(Sub(A, Shift))` says exactly that ($A$ placed under one binder). The second is $(\lambda x.\, x\,x)(\lambda y.\, y)$, which reduces to $\lambda y.\, y$. Explicit substitutions, introduced by Martín Abadi, Luca Cardelli, Pierre-Louis Curien and Jean-Jacques Lévy in the λσ-calculus,:cite[abadi1991] are the theory behind abstract machines: an implementation of a functional language is, in effect, a strategy for an explicit-substitution calculus.

## Functions for Pebble

Pebble gets functions the way the interpreter of Chapter 27 handled `Let`: with environments. A function value is a **closure**, the function's body together with the environment in which it was defined:

```girafe title="Pebble with functions" tools="run"
#priority
Run(e) -> Eval(e, Empty)
Eval(Lit(n), env) -> Lit(n)
Eval(V(x), env) -> Lookup(x, env)
Eval(Add(a, b), env) -> Plus(Eval(a, env), Eval(b, env))
Eval(Mul(a, b), env) -> Times(Eval(a, env), Eval(b, env))
Eval(Let(x, e, body), env) -> Eval(body, Bind(x, Eval(e, env), env))
Eval(Lam(x, body), env) -> Closure(x, body, env)
Eval(App(f, a), env) -> Apply(Eval(f, env), Eval(a, env))
Apply(Closure(x, body, cenv), v) -> Eval(body, Bind(x, v, cenv))
Plus(Lit(a), Lit(b)) -> Lit(@add(a, b))
Times(Lit(a), Lit(b)) -> Lit(@mul(a, b))
Lookup(x, Bind(y, v, env)) -> if(@equ(x, y), v, Lookup(x, env))
? Run(Let(Twice, Lam(F, Lam(X, App(V(F), App(V(F), V(X))))), App(App(V(Twice), Lam(Y, Mul(V(Y), Lit(3)))), Lit(5))))
? Run(Let(K, Lit(10), Let(AddK, Lam(X, Add(V(X), V(K))), Let(K, Lit(1000), App(V(AddK), Lit(1))))))
```

The second query is the classic test of **lexical scoping**: `AddK` was defined when `K` was 10, so calling it after `K` is rebound to 1000 still adds 10, giving 11. The closure remembered its environment. (A dynamically scoped language would give 1001.)

```code
id: lambda-and-combinators/bracket
title: Bracket abstraction
prompt: |
  Combinator terms are built with `Ap(…, …)`, the constants `S`, `K`, `I`, other constants, and variables. Write `abstract(x, m)`, the bracket abstraction $[x]m$, with the three rules of this chapter and the η optimisation. Then write `compile(lam)` for λ-terms given as nested arrays: a string is a variable or constant (capitalised), `['lam', 'x', body]` an abstraction and `['ap', f, a]` an application.
starter: |
  import type { Term } from 'trs';
  import { f, v, occurs } from 'trs';

  export function abstract(x: string, m: Term): Term {
    return m;
  }

  export function compile(lam: unknown): Term {
    return f('I');
  }
tests: |
  import { test, expect } from 'test';
  import { abstract, compile } from 'solution';
  import { term, show, normalize, system, SKI, f } from 'trs';

  const nf = (t) => show(normalize(system(SKI), t, { strategy: 'outermost' }).term);
  test('the three rules', () => {
    expect(show(abstract('x', term('x')))).toBe('I');
    expect(show(abstract('x', term('A')))).toBe('Ap(K, A)');
    expect(show(abstract('x', term('Ap(F, Ap(G, x))')))).toBe('Ap(Ap(S, Ap(K, F)), G)');
  });
  test('eta', () => {
    expect(show(abstract('x', term('Ap(F, x)')))).toBe('F');
  });
  test('abstraction then application substitutes', () => {
    const m = term('Ap(Ap(x, A), Ap(B, x))');
    expect(nf(f('Ap', abstract('x', m), term('C')))).toBe('Ap(Ap(C, A), Ap(B, C))');
  });
  test('compiling λ-terms', () => {
    const K2 = ['lam', 'x', ['lam', 'y', 'x']];
    expect(nf(f('Ap', f('Ap', compile(K2), term('A')), term('B')))).toBe('A');
    const twice = ['lam', 'f', ['lam', 'x', ['ap', 'f', ['ap', 'f', 'x']]]];
    expect(nf(f('Ap', f('Ap', compile(twice), term('G')), term('C')))).toBe('Ap(G, Ap(G, C))');
  });
solution: |
  import type { Term } from 'trs';
  import { f, v, occurs } from 'trs';

  export function abstract(x: string, m: Term): Term {
    if (!occurs(x, m)) return f('Ap', f('K'), m);
    if (m.type === 'var') return f('I');
    const [a, b] = m.args;
    if (b.type === 'var' && b.name === x && !occurs(x, a)) return a;
    return f('Ap', f('Ap', f('S'), abstract(x, a)), abstract(x, b));
  }

  export function compile(lam: unknown): Term {
    if (typeof lam === 'string') return /^[A-Z]/.test(lam) ? f(lam) : v(lam);
    const [k, a, b] = lam as [string, unknown, unknown];
    if (k === 'ap') return f('Ap', compile(a), compile(b));
    return abstract(a as string, compile(b));
  }
hints:
  - 'Check the K rule first (`x` does not occur in `m`), then the variable case (then `m` must be `x` itself), then η, then the S rule on `Ap(a, b)`.'
  - 'To compile `[\"lam\", x, body]`, compile the body first, then abstract `x` from the result: inner abstractions are removed first.'
```

:::key
- β-reduction needs capture-avoiding substitution, which is not first-order rewriting.
- Combinatory logic ($S$, $K$, $I$) is an orthogonal, hence confluent, first-order system; bracket abstraction translates λ-terms into it and simulates β.
- De Bruijn indices remove names; explicit substitutions (λυ, λσ) make substitution a set of rules.
- Pebble's functions are closures: lexical scoping by environments.
:::

:::exercises
1. Translate $\lambda x.\,\lambda y.\, y\, x$ into combinators by hand, and check that it swaps its arguments.
2. Show that $S\,K\,K\,x \to^* x$, so that $I$ is definable. Why is $I$ still convenient?
3. Show that $S\,I\,I\,(S\,I\,I)$ has no normal form. Is there a term with a normal form that outermost reduction finds but innermost does not?
4. Write the de Bruijn form of the Church numeral $2 = \lambda f.\,\lambda x.\, f\,(f\,x)$ and reduce `App(App(two, F), A)` in the λυ workbench (with `F` and `A` as constants).
:::
