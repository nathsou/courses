---
title: Points-to analysis and Datalog
summary: Which names can refer to the same object? Allocation sites, Andersen's inclusion-based and Steensgaard's unification-based analyses, and Datalog, the small logic language in which industrial analysers write such analyses.
number: 27
duration: 55 minutes
prerequisites: [summaries-and-ifds]
---

Chapter 26 ended on a program its analysis gets wrong:

```js
const a = b;
a.x = secret;
sink(b.x);
```

Taint was tracked per variable, and nothing assigned a tainted value to `b` or to `b.x`. But `a` and `b` refer to the same object, so writing `a.x` writes `b.x`. Two names that may refer to the same storage are **aliases**, and a sound analysis of anything stored in objects must know about them. This chapter computes **points-to** information, the objects each variable may refer to, in the two classic ways, and then writes the same analysis in **Datalog**, the language in which several industrial analysers express theirs. It is optional: the taint analysis of Part VII stays with variables and says where that falls short.

## Objects as allocation sites

A program creates unboundedly many objects at run time, so an analysis must name them finitely. The standard choice is the **allocation site**: all objects created by the same literal, `new` expression or function expression in the code count as one abstract object. A loop that creates a thousand objects at one site has one abstract object; two literals on two lines have two.

The analysis then reduces the program to four kinds of statements, whatever the surface syntax:

| Statement | Fact | Meaning |
|---|---|---|
| `v = {}`, `new C()`, `[]`, `function…` | `new(v, o)` | `v` points to the object `o` |
| `v = w` | `assign(v, w)` | `v` points to whatever `w` points to |
| `v.f = w` | `store(v, f, w)` | the field `f` of `v`'s objects points to whatever `w` points to |
| `v = w.f` | `load(v, w, f)` | `v` points to whatever the field `f` of `w`'s objects points to |

Nested expressions are broken up with temporary variables: `x = a.b.c` becomes `$t1 = a.b; x = $t1.c`. The course's version is flow-insensitive (statement order is ignored, as in chapter 25) and intraprocedural (calls are ignored); a full analysis also adds facts for arguments and parameters along call edges.

## Andersen: inclusion

Andersen's analysis reads each statement as an inclusion between sets of objects. :cite[andersen1994] `v = w` means pts(w) ⊆ pts(v): whatever `w` may point to, `v` may too, but not the other way round. Stores and loads add inclusions through the fields of the objects found so far, so the analysis iterates until nothing grows: a least fixpoint again, of a monotone system over finite sets. A straightforward implementation takes cubic time in the size of the program; real ones are much faster in practice, by detecting cycles of inclusions and merging them.

:::points-to-view{n="27.1" title="Inclusion or unification"}
```js
const a = {};
const b = {};
let p = a;
let q = b;
p = q;
const box = { item: a };
const got = box.item;
got.tag = b;
```
:::

With Andersen's analysis, `p` points to both objects, `q` to `o2` only, and `a` and `b` stay apart. The object literal on line 6 is `o3`; its field `item` points to `o1`, so `got` does too, and the store `got.tag = b` gives `o1` a field `tag` pointing to `o2`. Click a variable to see only its edges.

## Steensgaard: unification

Steensgaard's analysis reads the same statement as an equation: after `v = w`, the analysis no longer distinguishes what `v` points to from what `w` points to, and merges them into one class. :cite[steensgaard1996] Every variable then points to exactly one class of objects, every class has one class per field, and the analysis is a sequence of merges, which a **union-find** structure performs in almost linear time. The price is precision: `p = q` merges the classes of `o1` and `o2`, so `a` and `b` now point to both objects, although neither variable was ever assigned the other's. Switch to the second tab in 27.1 to see it.

```quiz
q: "In 27.1, why does Steensgaard's analysis say that `a` may point to `o2`, when no statement assigns `b` or `q` to `a`?"
options:
  - text: "Because the analysis is flow-insensitive."
    why: "Andersen's analysis is flow-insensitive too, and keeps `a` pointing to `o1` only."
  - text: "Because `p = a` and `p = q` merge what `p`, `a` and `q` point to into one class, and `a`'s class now holds both objects."
    correct: true
    why: "Unification is symmetric: after `p = q`, the analysis treats `q = p` as if it had happened too. The direction of the assignment, which Andersen's inclusion keeps, is lost."
  - text: "Because `o1` and `o2` are created by the same kind of expression."
    why: "They are two allocation sites, two abstract objects. Andersen's analysis keeps them apart."
```

Both are used. Steensgaard's analysis scales to millions of lines and is a common first pass; Andersen's is more precise and, with modern engineering, also scales to large programs. Neither distinguishes calling contexts. The precise analyses for object-oriented code add **context sensitivity**, most often by tagging objects and variables with the receiver objects of the calls that led to them (**object sensitivity**), multiplying both the precision and the cost.

## Exercise: Andersen's analysis

```helper
id: points-to-and-datalog/andersen
title: An inclusion-based points-to analysis
prompt: |
  Implement `andersen` in `helpers/andersen.ts`. It receives the four kinds of facts of this chapter and returns, for every variable that appears in them, the set of objects it may point to, and for every object and field, the set of objects that field may point to. Iterate until nothing changes.
files:
  helpers/andersen.ts: |
    export type Fact =
      | { kind: 'new'; v: string; o: string }
      | { kind: 'assign'; v: string; w: string }
      | { kind: 'store'; v: string; f: string; w: string }
      | { kind: 'load'; v: string; w: string; f: string };

    export interface Result {
      /** Variable → objects. */
      pts: Map<string, Set<string>>;
      /** `${object}.${field}` → objects. */
      heap: Map<string, Set<string>>;
    }

    export function andersen(facts: Fact[]): Result {
      const pts = new Map<string, Set<string>>();
      const heap = new Map<string, Set<string>>();
      // TODO
      return { pts, heap };
    }
tests:
  andersen.test.ts: |
    import { test, expect } from 'workbench:test';
    import { andersen, type Fact } from '../rules/helpers/andersen.js';

    const sorted = (s: Set<string> | undefined) => [...(s ?? [])].sort();

    test('allocation and copies', () => {
      const facts: Fact[] = [
        { kind: 'new', v: 'a', o: 'o1' },
        { kind: 'new', v: 'b', o: 'o2' },
        { kind: 'assign', v: 'p', w: 'a' },
        { kind: 'assign', v: 'p', w: 'b' },
      ];
      const r = andersen(facts);
      expect(sorted(r.pts.get('p'))).toEqual(['o1', 'o2']);
      expect(sorted(r.pts.get('a'))).toEqual(['o1']);
    });
hiddenTests:
  more.test.ts: |
    import { test, expect } from 'workbench:test';
    import { andersen, type Fact } from '../rules/helpers/andersen.js';

    const sorted = (s: Set<string> | undefined) => [...(s ?? [])].sort();

    test('stores and loads through an alias', () => {
      const facts: Fact[] = [
        { kind: 'new', v: 'b', o: 'o1' },
        { kind: 'assign', v: 'a', w: 'b' },
        { kind: 'new', v: 'secret', o: 'o2' },
        { kind: 'store', v: 'a', f: 'x', w: 'secret' },
        { kind: 'load', v: 'leak', w: 'b', f: 'x' },
      ];
      const r = andersen(facts);
      expect(sorted(r.pts.get('leak'))).toEqual(['o2']);
      expect(sorted(r.heap.get('o1.x'))).toEqual(['o2']);
    });
    test('order does not matter', () => {
      const facts: Fact[] = [
        { kind: 'load', v: 'r', w: 'q', f: 'f' },
        { kind: 'assign', v: 'q', w: 'p' },
        { kind: 'store', v: 'p', f: 'f', w: 's' },
        { kind: 'assign', v: 's', w: 't' },
        { kind: 'new', v: 't', o: 'o3' },
        { kind: 'new', v: 'p', o: 'o4' },
      ];
      const r = andersen(facts);
      expect(sorted(r.pts.get('r'))).toEqual(['o3']);
    });
    test('cycles of copies', () => {
      const facts: Fact[] = [
        { kind: 'assign', v: 'x', w: 'y' },
        { kind: 'assign', v: 'y', w: 'z' },
        { kind: 'assign', v: 'z', w: 'x' },
        { kind: 'new', v: 'x', o: 'o1' },
        { kind: 'new', v: 'z', o: 'o2' },
      ];
      const r = andersen(facts);
      for (const v of ['x', 'y', 'z']) expect(sorted(r.pts.get(v))).toEqual(['o1', 'o2']);
    });
    test('variables without objects are present and empty', () => {
      const r = andersen([{ kind: 'assign', v: 'u', w: 'w' }]);
      expect(sorted(r.pts.get('u'))).toEqual([]);
      expect(r.pts.has('w')).toBe(true);
    });
answer:
  helpers/andersen.ts: |
    export type Fact =
      | { kind: 'new'; v: string; o: string }
      | { kind: 'assign'; v: string; w: string }
      | { kind: 'store'; v: string; f: string; w: string }
      | { kind: 'load'; v: string; w: string; f: string };

    export interface Result {
      pts: Map<string, Set<string>>;
      heap: Map<string, Set<string>>;
    }

    export function andersen(facts: Fact[]): Result {
      const pts = new Map<string, Set<string>>();
      const heap = new Map<string, Set<string>>();
      const get = (m: Map<string, Set<string>>, k: string) => m.get(k) ?? m.set(k, new Set()).get(k)!;
      const addAll = (to: Set<string>, from: Set<string>) => {
        let grew = false;
        for (const x of from) if (!to.has(x)) to.add(x), (grew = true);
        return grew;
      };
      for (const f of facts) {
        get(pts, f.v);
        if (f.kind !== 'new') get(pts, f.w);
        if (f.kind === 'new') get(pts, f.v).add(f.o);
      }
      let changed = true;
      while (changed) {
        changed = false;
        for (const f of facts) {
          if (f.kind === 'assign') changed = addAll(get(pts, f.v), get(pts, f.w)) || changed;
          if (f.kind === 'store') for (const o of get(pts, f.v)) changed = addAll(get(heap, `${o}.${f.f}`), get(pts, f.w)) || changed;
          if (f.kind === 'load') for (const o of get(pts, f.w)) changed = addAll(get(pts, f.v), get(heap, `${o}.${f.f}`)) || changed;
        }
      }
      return { pts, heap };
    }
```

## Datalog

Look again at the four rules of Andersen's analysis. Each says: *if these facts hold, this fact holds too*. That is exactly what **Datalog** expresses. A Datalog program has facts, `new(a, o1).`, and rules, `pts(V, O) :- assign(V, W), pts(W, O).`, read "V may point to O if V is assigned from W and W may point to O". Names starting with an upper-case letter are variables. The meaning of a program is the least set of facts that contains the given ones and is closed under the rules: a least fixpoint, computed bottom-up by applying the rules until no new fact appears. Datalog has no functions and no unbounded data, so evaluation always terminates, and its fixed-point semantics is the same as the dataflow analyses of Part III. Whaley and Lam's bddbddb showed that points-to analyses written in a few lines of Datalog can run on large programs. :cite[whaley2004]

The console below holds the facts of a snippet, the four rules of Andersen's analysis, a rule for aliasing, and two queries. Edit them: add a fact, remove a rule, ask a new question.

:::datalog-console{n="27.2" title="Andersen's analysis in Datalog"}
```text
% Facts for:
%   const a = {}; const b = {};      (o1, o2)
%   let p = a; let q = b; p = q;
%   p.f = a; const r = q.f;
new(a, o1). new(b, o2).
assign(p, a). assign(q, b). assign(p, q).
store(p, f, a). load(r, q, f).

pts(V, O) :- new(V, O).
pts(V, O) :- assign(V, W), pts(W, O).
heap(O, F, P) :- store(V, F, W), pts(V, O), pts(W, P).
pts(V, P) :- load(V, W, F), pts(W, O), heap(O, F, P).
alias(X, Y) :- pts(X, O), pts(Y, O), X != Y.

?- pts(r, O).
?- alias(p, Y).
```
:::

The figure's table compares two ways of evaluating the program. **Naive evaluation** applies every rule to all known facts in every round, rediscovering in round ten everything it found in rounds one to nine. **Semi-naive evaluation** only fires a rule when at least one of the facts it joins is new since the previous round, which finds the same fixpoint with much less work. The difference grows with the length of the derivations. On a chain of calls, reachability takes one round per link:

:::datalog-console{n="27.3" title="Reachability in a call graph"}
```text
calls(main, parse). calls(parse, lex). calls(lex, read).
calls(read, decode). calls(decode, utf8). calls(utf8, table).
calls(main, render). calls(render, layout). calls(layout, measure).
calls(measure, glyphs). calls(glyphs, table).

reaches(F, G) :- calls(F, G).
reaches(F, H) :- calls(F, G), reaches(G, H).

?- reaches(main, F).
?- reaches(F, table).
```
:::

Datalog's appeal for analysis writers is that the rules *are* the analysis: the specification and the implementation are the same few lines, and the engine takes care of evaluation order, indexing and parallelism.

- **Doop** expresses context-sensitive points-to analyses for Java in Datalog, with variants (call-site sensitivity, object sensitivity, type sensitivity) differing by a few rules. :cite[bravenboer2009]
- **Soufflé** compiles Datalog programs into parallel C++, and is the engine behind Doop today, among others. :cite[jordan2016]
- **CodeQL**, from GitHub, extracts a relational database from a codebase (its syntax trees, control flow, types) and evaluates queries written in QL, an object-oriented language that compiles to Datalog. :cite[avgustinov2016] Its JavaScript libraries provide data flow and taint tracking with type tracking and call-graph construction, all as QL rules over the database.

## Aliasing in Track A's rules

SonarJS's rules do not compute points-to information. They avoid needing it by tracking only local variables, whose only aliases are closures that capture them, and by giving up when a variable could change behind their back: S2259 ignores variables written in callbacks (chapter 9), S1854 does not report variables shared with another function's code path (chapter 14), and S2589 drops what it knows about a variable that a nested function may write (chapter 16). That keeps them precise on what they do track. It also explains what they cannot see: anything that flows through an object's fields, which is where the taint analyses of Part VII spend much of their effort.

## What comes next

Part VII turns to the security problems that motivate taint analysis: how injection attacks work, how taint analysis finds them, and what it cannot see.
