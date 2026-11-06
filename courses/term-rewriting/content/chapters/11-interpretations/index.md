---
number: 11
title: Polynomial interpretations
summary: Map every term to a number that each rule decreases, check the inequalities by looking at coefficients, let the computer search for the polynomials, and prove that the algebra system’s derivative terminates.
duration: About 1½ hours
prerequisites: [well-founded-orders]
theorems: [Monotone algebras give reduction orders, Polynomial interpretations bound derivation lengths]
techniques: [interpreting terms as polynomials]
---

The most direct measure of a term is a number. If every function symbol is read as a function on the natural numbers, every ground term denotes a number, and a rule terminates if its left side always denotes more than its right side. This chapter makes that work for terms with variables, and shows how much of the checking a computer can do.

## Monotone algebras

:::definition[Interpretation]
An **interpretation** assigns to each symbol $f$ of arity $n$ a function $[f] : \mathbb{N}^n \to \mathbb{N}$. A term $t$ with variables $x_1, \ldots, x_k$ then denotes a function $[t]$ of those variables: $[x] = x$, and $[f(t_1, \ldots, t_n)] = [f]([t_1], \ldots, [t_n])$.

The interpretation is **strictly monotone** if each $[f]$ is strictly increasing in each argument: $a > b$ implies $[f](\ldots, a, \ldots) > [f](\ldots, b, \ldots)$.
:::

Define $s > t$ to mean $[s](\vec x) > [t](\vec x)$ for *all* natural numbers $\vec x$.

:::theorem{status=proved}
For a strictly monotone interpretation, the order $s > t$ just defined is a reduction order. Hence if $[l] > [r]$ for every rule $l \to r$, the system terminates.
:::

:::proof
**Well-founded:** a descending chain of terms gives, at $\vec x = \vec 0$, a descending chain of natural numbers. **Closed under substitutions:** $[t\sigma](\vec x)$ is $[t]$ evaluated at the values $[\sigma(x_i)](\vec x)$, which are natural numbers; since $[s] > [t]$ everywhere, in particular there. **Closed under contexts:** by induction on the position, using strict monotonicity of the symbol at each level: if $[s] > [t]$ everywhere then $[f(\ldots, s, \ldots)] = [f](\ldots, [s], \ldots) > [f](\ldots, [t], \ldots)$. The second sentence is then the theorem of Chapter 10.
:::

Monotonicity is essential. With $[F](x) = 0$, every term `F(…)` denotes $0$, and a rule inside an `F` would not decrease anything.

## Polynomials

Dallas Lankford proposed taking each $[f]$ to be a **polynomial** with natural-number coefficients.:cite[lankford1979] Such a polynomial is strictly monotone in $x_i$ exactly when $x_i$ actually occurs in it. Take Peano addition:

$$[0] = 1, \qquad [S](x) = x + 1, \qquad [+](x, y) = 2x + y.$$

Then the rules compare as follows:

$$
\begin{aligned}
[0 + y] &= 2 + y &&> y = [y],\\
[S(x) + y] &= 2x + 2 + y &&> 2x + y + 1 = [S(x + y)].
\end{aligned}
$$

Both differences, $2$ and $1$, are positive for every $x$ and $y$, so addition terminates. The weight $2$ on the first argument of $+$ is what makes the second rule work: moving an `S` out of the first argument of `+` loses $2$ and gains $1$.

How can a computer decide whether a polynomial is positive for all natural numbers? In general it cannot: by Matiyasevich's theorem (Hilbert's tenth problem), whether a polynomial with integer coefficients has a root in the natural numbers is undecidable. But a simple sufficient condition covers most cases.

:::proposition{status=proved}
If $p(\vec x)$ has a constant term at least $1$ and no negative coefficient, then $p(\vec x) \ge 1$ for all natural numbers $\vec x$.
:::

:::proof
Every monomial is a product of a non-negative coefficient and natural numbers, so it is non-negative; the constant term adds at least $1$.
:::

This **absolute positiveness** test is what the tools in this chapter use. Try the interpretations below: type a polynomial for each symbol (in the variables `x1`, `x2`, … for its arguments) and every rule's difference $[l] - [r]$ is computed and tested. Multiplication is harder than addition; can you find an interpretation for all four rules?

::poly-interp{rules="+(0, y) -> y\n+(S(x), y) -> S(+(x, y))\n*(0, y) -> 0\n*(S(x), y) -> +(y, *(x, y))" interpretation='{"+": "2*x1 + x2", "S": "x1 + 1", "0": "1"}'}

The search button tries every **linear** interpretation $a_0 + a_1 x_1 + \cdots$ with small coefficients. It finds one for addition but not for multiplication, which needs a product: $[\ast](x, y) = 2xy + x + y + 1$ works (check it). That makes sense: a linear interpretation can only prove that a system's derivations have length at most exponential in the size of the start term, and polynomial interpretations in general give at most a doubly exponential bound, a result of Dieter Hofbauer and Clemens Lautemann.:cite[hofbauer-lautemann1989] Ackermann's function grows faster than any such bound, so **no** polynomial interpretation proves it terminating; Chapter 12 does it with a syntactic order instead.

```numeric
id: interpretations/value
title: Evaluating an interpretation
prompt: 'With $[0] = 1$, $[S](x) = x + 1$ and $[\ast](x, y) = 2xy + x + y + 1$, what number does the ground term `*(S(0), S(0))` denote?'
answer: 13
tolerance: 0
explain: '$[S(0)] = 2$, so $[\ast](2, 2) = 8 + 2 + 2 + 1 = 13$.'
```

## The algebra system terminates

The derivative rules of Chapter 6 are a harder test, because the product rule copies both factors: `D(u * v)` becomes `D(u) * v + u * D(v)`, in which `u` and `v` appear twice. No linear interpretation can pay for that (the search fails). A square can:

::poly-interp{rules="D(X) -> N(1)\nD(+(u, v)) -> +(D(u), D(v))\nD(*(u, v)) -> +(*(D(u), v), *(u, D(v)))" interpretation='{"D": "2*x1*x1", "*": "x1 + x2 + 2", "+": "x1 + x2 + 1", "X": "2", "N": "x1 + 1", "1": "1"}'}

With $[D](x) = 2x^2$, the product rule's left side is $2(u + v + 2)^2$, which contains a cross term $4uv$ that is missing on the right. Expanding gives the difference $4uv + 7u + 7v + 3$, positive everywhere. (The constant-folding and identity rules of the algebra system all make terms smaller, and any interpretation that counts symbols handles them; the *Termination* tab of the workbench proves the whole system terminating with other methods.)

## Searching for interpretations

Real termination provers search for interpretations far more cleverly than the course's brute force. They fix a shape for each $[f]$ with unknown coefficients (say $a + bx + cy$ with $a, b, c$ between $0$ and $7$), expand every $[l] - [r]$ symbolically, require each coefficient to be non-negative and each constant to be positive, and hand the resulting constraints on $a, b, c, \ldots$ to a SAT or SMT solver. AProVE and TTT2, among the strongest provers in the annual Termination Competition, work this way,:cite[giesl2017,korp2009] and the same encoding extends to interpretations into matrices and into ordinals.

## Interpretations in your engine

The reference engine's `poly` module (imported as `poly` from `trs`) provides polynomials as maps from monomials to coefficients, with `constant(n)`, `variable(x)`, `add(…)`, `mul(p, q)`, `substitute(p, env)` and `showPoly(p)`. An interpretation is a `Map` from symbols to polynomials in `x1`, `x2`, ….

```code
id: interpretations/interpret
title: Interpreting a term
provides: [interpret]
prompt: |
  Write `interpret(I, t)`: the polynomial $[t]$ denoted by the term `t` under the interpretation `I`.

  - A variable `x` denotes the polynomial `x`.
  - For `f(t1, …, tn)`, take `I.get(f)` and substitute $[t_i]$ for `x{i}` (with `poly.substitute`).
  - A symbol with no interpretation is read as $1 + x_1 + \cdots + x_n$, so that it is monotone and counts as at least 1.
starter: |
  import type { Term } from 'trs';
  import { poly } from 'trs';
  type Poly = ReturnType<typeof poly.constant>;

  export function interpret(I: ReadonlyMap<string, Poly>, t: Term): Poly {
    return poly.constant(0);
  }
tests: |
  import { test, expect } from 'test';
  import { interpret } from 'solution';
  import { poly, term, interpretation, rules } from 'trs';

  const I = interpretation({ '+': '2*x1 + x2', '*': '2*x1*x2 + x1 + x2 + 1', S: 'x1 + 1', '0': '1' });
  const sh = (t) => poly.showPoly(interpret(I, term(t)));
  test('variables and constants', () => {
    expect(sh('x')).toBe('x');
    expect(sh('0')).toBe('1');
    expect(sh('S(S(0))')).toBe('3');
  });
  test('substitution into the interpretation of the root', () => {
    expect(sh('+(S(x), y)')).toBe('2·x + y + 2');
    expect(sh('*(S(0), S(0))')).toBe('13');
  });
  test('uninterpreted symbols count as 1 + their arguments', () => {
    expect(sh('F(x, S(0))')).toBe('x + 3');
    expect(sh('C')).toBe('1');
  });
  test('every Peano rule decreases', () => {
    for (const r of rules('+(0, y) -> y\n+(S(x), y) -> S(+(x, y))\n*(0, y) -> 0\n*(S(x), y) -> +(y, *(x, y))')) {
      const d = poly.sub(interpret(I, r.lhs), interpret(I, r.rhs));
      expect(poly.positive(d)).toBe(true);
    }
  });
solution: |
  import type { Term } from 'trs';
  import { poly } from 'trs';
  type Poly = ReturnType<typeof poly.constant>;

  export function interpret(I: ReadonlyMap<string, Poly>, t: Term): Poly {
    if (t.type === 'var') return poly.variable(t.name);
    const args = t.args.map((a) => interpret(I, a));
    const p = I.get(t.name);
    if (!p) return poly.add(poly.constant(1), ...args);
    return poly.substitute(p, new Map(args.map((a, i) => [`x${i + 1}`, a])));
  }
hints:
  - 'Interpret the arguments first (recursively), then build an environment mapping `x1`, `x2`, … to them.'
  - '`poly.substitute(I.get(f), env)` does the substitution; `poly.add(poly.constant(1), ...args)` is the default.'
```

:::key
- A strictly monotone interpretation into $\mathbb{N}$ gives a reduction order: if $[l] > [r]$ for all values, the rules terminate.
- Polynomials are natural interpretations; positivity is undecidable in general, but absolute positiveness (non-negative coefficients, positive constant) is easy and usually enough.
- Linear interpretations fail on duplicating rules; quadratic ones handle the product rule. No polynomial handles Ackermann's function.
:::

:::exercises
1. Find polynomial interpretations proving that `F(G(x)) -> G(F(x))` terminates, and then `F(G(x)) -> G(G(F(x)))`. (Hint: let `F` multiply.)
2. Show that no polynomial interpretation can prove `Ack` terminating, using the doubly exponential bound.
3. Interpret over the integers $\ge 2$ instead of $\ge 0$. Which proofs become easier? What changes in the absolute-positiveness test?
4. Prove that the rule `F(x, x) -> F(G(x), x)` cannot be proved terminating by *any* strictly monotone interpretation. Does it terminate?
:::
