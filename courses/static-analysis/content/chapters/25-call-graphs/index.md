---
title: Call graphs
summary: Which functions can a call invoke? Resolving calls by name, by the classes a program instantiates, and by following function values through variables, parameters and properties, and why every answer for JavaScript is an approximation.
number: 25
duration: 55 minutes
prerequisites: [lattices-and-fixpoints]
---

Every analysis so far has stopped at the edges of a function. When `retry(ping, 3)` calls `task()`, the rules of Track A see a call to something named `task` and know nothing about what runs. Part VI follows values across function boundaries, and the first step of any such analysis is to know which functions a call can invoke. That is the **call graph**: one node per function, and an edge from a call site to each function it may call.

In a language like C, most calls name their target, and the call graph is nearly free. JavaScript makes it a real analysis. Functions are values: they are passed as arguments, returned from other functions, stored in variables and properties. Method calls are dispatched on the receiver at run time, through prototype chains that programs can modify. Some calls are made by the runtime itself, on functions given to `forEach`, `then` or `addEventListener`. This chapter builds call graphs three ways, compares them on the same code, and ends with how SonarJS answers the question when a rule needs it.

## Three uses of a call graph

- **Reachability.** Which functions can run at all, starting from a program's entry points? A function no path reaches is dead code. An unused-export or unused-function rule asks exactly this, and its false positives come from edges the graph missed.
- **Interprocedural analysis.** The analyses of the next chapters propagate facts along call edges: arguments into parameters, return values back to call sites. A missing edge is a missing flow, and with it a missed bug.
- **Impact.** Which code is affected by a change to this function? Which tests exercise it? The reverse edges answer that.

A call graph is **sound** when it contains every edge that some execution takes. As always, soundness and precision pull apart: the graph with an edge from every call to every function is sound and useless.

## Resolving calls by name

The cheapest resolution looks at the call's syntax. A call `f()` targets every function bound to the name `f`; a call `o.m()` targets every function stored under a property or method named `m`, in any class or object. Try it on the module below, with the first tab selected.

:::call-graph-view{n="25.1" algorithms="names,rta,flow" title="Methods called area"}
```js
class Shape {
  area() { return 0; }
  describe() { return 'area ' + this.area(); }
}
class Circle extends Shape {
  constructor(r) { super(); this.r = r; }
  area() { return 3 * this.r * this.r; }
}
class Square extends Shape {
  constructor(s) { super(); this.s = s; }
  area() { return this.s * this.s; }
}
class Polygon extends Shape {
  area() { return triangulate(this).length; }
}
function triangulate(p) { return []; }
function total(list) {
  let sum = 0;
  list.forEach((s) => { sum += s.area(); });
  return sum;
}
const report = { area: (n) => n + ' m²' };
const all = [new Circle(1), new Square(2)];
console.log(report.area(total(all)));
```
:::

The call `s.area()` on line 19 gets five targets: the four `area` methods and the arrow function stored in `report.area`. `report.area(…)` on line 24 gets the same five. The callback passed to `forEach` is reached through a rule for a few library functions known to call their arguments (`forEach`, `map`, `then`, `setTimeout` and similar), which is itself a model of code the analysis does not see. `console.log` has no target in the module: it belongs to the runtime.

In a statically typed object-oriented language, the standard cheap resolution is **class hierarchy analysis** (CHA): a call `o.m()`, where `o` is declared with type `T`, targets `m` as defined in `T` or inherited by it, and every override of `m` in subclasses of `T`. :cite[dean1995] JavaScript has no declared types, so `T` is unknown and the hierarchy to search is every class: CHA degenerates into resolution by name.

## Rapid type analysis

Look at `Polygon` in 25.1: no code ever creates one, yet its `area` method, and `triangulate` with it, are reachable by name. **Rapid type analysis** (RTA) removes such edges by keeping track of the classes a program instantiates: a method is a possible target only if an instance of its class, or of a subclass, is created with `new` somewhere in code already found reachable. :cite[bacon1996]

Reachability and instantiation depend on each other (a reachable function may create a new class, whose methods make more functions reachable, which create more classes), so RTA computes both together, by iterating until neither grows: another least fixpoint, over two sets. Select the second tab. `Polygon.area` disappears from line 19 and from line 24, and `triangulate` becomes unreachable. `Shape.area` stays, because `Circle` and `Square` extend `Shape`, and the analysis does not check whether both override it.

RTA is unsound when instances come from places it does not see: another module, deserialisation, `Object.create`, a framework that instantiates classes from configuration. Its edges are fewer, and occasionally wrong.

## Exercise: rapid type analysis

```helper
id: call-graphs/rta
title: Rapid type analysis
prompt: |
  Implement `rta` in `helpers/rta.ts`. The program is given as data: each function lists the calls it makes (a call to a function by name, or a method call by method name) and the classes it instantiates; each class lists its methods (method name → function name) and its superclass.

  Starting from `entry`, compute the reachable functions and the live classes, where:
  - a class is **live** if it, or one of its subclasses (directly or not), is instantiated in a reachable function;
  - a function call targets the function of that name, if it exists;
  - a method call `m` targets the method `m` of every live class that defines `m` itself.

  Return both sets as sorted arrays.
files:
  helpers/rta.ts: |
    export type Call = { kind: 'function'; name: string } | { kind: 'method'; name: string };

    export interface Program {
      entry: string;
      functions: Record<string, { calls: Call[]; news: string[] }>;
      classes: Record<string, { extends?: string; methods: Record<string, string> }>;
    }

    export function rta(program: Program): { reachable: string[]; live: string[] } {
      // TODO
      return { reachable: [program.entry], live: [] };
    }
tests:
  rta.test.ts: |
    import { test, expect } from 'workbench:test';
    import { rta, type Program } from '../rules/helpers/rta.js';

    const shapes: Program = {
      entry: 'main',
      functions: {
        main: { calls: [{ kind: 'method', name: 'area' }], news: ['Circle'] },
        circleArea: { calls: [], news: [] },
        polygonArea: { calls: [{ kind: 'function', name: 'triangulate' }], news: [] },
        triangulate: { calls: [], news: [] },
      },
      classes: {
        Circle: { methods: { area: 'circleArea' } },
        Polygon: { methods: { area: 'polygonArea' } },
      },
    };

    test('only instantiated classes count', () => {
      expect(rta(shapes)).toEqual({ reachable: ['circleArea', 'main'], live: ['Circle'] });
    });
hiddenTests:
  more.test.ts: |
    import { test, expect } from 'workbench:test';
    import { rta, type Program } from '../rules/helpers/rta.js';

    test('instantiation discovered later makes earlier calls resolve further', () => {
      const p: Program = {
        entry: 'main',
        functions: {
          main: { calls: [{ kind: 'method', name: 'run' }, { kind: 'function', name: 'setup' }], news: [] },
          setup: { calls: [], news: ['Job'] },
          jobRun: { calls: [{ kind: 'method', name: 'done' }], news: ['Report'] },
          reportDone: { calls: [], news: [] },
        },
        classes: {
          Job: { methods: { run: 'jobRun' } },
          Report: { methods: { done: 'reportDone' } },
        },
      };
      expect(rta(p)).toEqual({ reachable: ['jobRun', 'main', 'reportDone', 'setup'], live: ['Job', 'Report'] });
    });
    test('superclasses of instantiated classes are live', () => {
      const p: Program = {
        entry: 'main',
        functions: {
          main: { calls: [{ kind: 'method', name: 'describe' }], news: ['Square'] },
          describe: { calls: [{ kind: 'method', name: 'area' }], news: [] },
          shapeArea: { calls: [], news: [] },
          squareArea: { calls: [], news: [] },
        },
        classes: {
          Shape: { methods: { describe: 'describe', area: 'shapeArea' } },
          Rect: { extends: 'Shape', methods: {} },
          Square: { extends: 'Rect', methods: { area: 'squareArea' } },
        },
      };
      expect(rta(p)).toEqual({ reachable: ['describe', 'main', 'shapeArea', 'squareArea'], live: ['Rect', 'Shape', 'Square'] });
    });
    test('recursion and unknown names', () => {
      const p: Program = {
        entry: 'a',
        functions: {
          a: { calls: [{ kind: 'function', name: 'b' }, { kind: 'function', name: 'missing' }], news: [] },
          b: { calls: [{ kind: 'function', name: 'a' }], news: [] },
          c: { calls: [], news: ['K'] },
        },
        classes: { K: { methods: {} } },
      };
      expect(rta(p)).toEqual({ reachable: ['a', 'b'], live: [] });
    });
answer:
  helpers/rta.ts: |
    export type Call = { kind: 'function'; name: string } | { kind: 'method'; name: string };

    export interface Program {
      entry: string;
      functions: Record<string, { calls: Call[]; news: string[] }>;
      classes: Record<string, { extends?: string; methods: Record<string, string> }>;
    }

    export function rta(program: Program): { reachable: string[]; live: string[] } {
      const reachable = new Set([program.entry]);
      const live = new Set<string>();
      let changed = true;
      while (changed) {
        changed = false;
        for (const f of reachable) {
          for (const created of program.functions[f]?.news ?? []) {
            // The class and all its superclasses become live.
            let k: string | undefined = created;
            while (k && !live.has(k)) {
              live.add(k);
              changed = true;
              k = program.classes[k]?.extends;
            }
          }
          for (const call of program.functions[f]?.calls ?? []) {
            const targets =
              call.kind === 'function'
                ? program.functions[call.name] ? [call.name] : []
                : [...live].map((k) => program.classes[k]?.methods[call.name]).filter((t): t is string => !!t);
            for (const t of targets) if (!reachable.has(t)) reachable.add(t), (changed = true);
          }
        }
      }
      return { reachable: [...reachable].sort(), live: [...live].sort() };
    }
```

## Following function values

Both resolutions so far look only at the call's syntax. They fail as soon as the callee is a variable that holds a function, which in JavaScript is everywhere: callbacks, higher-order functions, functions returned by factories.

:::call-graph-view{n="25.2" algorithms="names,flow" title="Callbacks and closures"}
```js
function retry(task, times) {
  for (let i = 0; i < times; i++) {
    if (task()) return true;
  }
  return false;
}
function ping() { return fetchStatus() === 200; }
function fetchStatus() { return 200; }
function makeLogger(prefix) {
  return (msg) => console.log(prefix + msg);
}
const log = makeLogger('[net] ');
retry(ping, 3);
log('done');
```
:::

By name, `task()` and `log()` have no target: no function is called `task` or `log`. So `ping`, `fetchStatus` and the arrow function returned by `makeLogger` look unreachable, and a dead-code rule built on this graph would report all three, wrongly.

The third algorithm tracks where function values go. Each function is a value that starts at its definition. Assignments, declarations and returns move values between **abstract locations**: one per variable, one per function's return value, one per call site's result, and one per property *name*. When a function value reaches the callee of a call site, the analysis adds the call edge, then makes the call's arguments flow into the function's parameters and its return value flow into the call's result. New flows can bring new functions to other call sites, so the analysis iterates until nothing changes: a least fixpoint again, over sets of functions. With the third tab, `ping` flows from `retry(ping, 3)` into the parameter `task`, and `task()` calls it. The arrow function flows out of `makeLogger`'s return into `log`, and `log('done')` calls it.

The analysis is **flow-insensitive**: it ignores the order of statements and treats every assignment as if it could happen at any time. That loses precision (a variable reassigned from one function to another holds both everywhere) and gains speed and simplicity. Using one location per property name, whatever the object, is called **field-based**. It merges `report.area` with every `area` method: in 25.1, the third tab finds the same five targets as resolution by name. Feldthaus and colleagues showed that field-based, flow-insensitive call graphs for JavaScript are cheap enough to build in an IDE, and found them precise enough on real programs for the services they targeted, such as jump-to-definition. :cite[feldthaus2013] Chapter 27 shows how to tell objects apart, at a cost.

```quiz
q: "In 25.1, with function-value flow, why does `report.area(total(all))` on line 24 have five targets rather than one?"
options:
  - text: "Because `report` could be any object."
    why: "`report` is a constant holding one object literal. The imprecision is elsewhere."
  - text: "Because properties are tracked by name, not per object: the location `.area` holds every function stored under that name, methods included."
    correct: true
    why: "That is what field-based means. A field-sensitive analysis would keep `report`'s `area` apart from the class methods, at the cost of tracking which objects each variable can point to (chapter 27)."
  - text: "Because the analysis is flow-insensitive."
    why: "Flow-insensitivity loses the order of assignments; here, the merge comes from using one location per property name."
```

## How SonarJS resolves calls

SonarJS's rules analyse one file at a time and do not build a call graph. When a rule needs to know what a call runs, it asks the TypeScript type checker for the call's **resolved signature**, the declaration the checker selects for the call from the callee's static type, and follows it to a function with a body. The helper says what it does and does not do: it follows one hop, and it gives up on built-ins, overloads without a single declaration, and declarations without source.

::source{path="packages/analysis/src/jsts/rules/helpers/call-to-declaration.ts" symbol="export function followCallToDeclaration" title="One hop through the type checker"}

This is neither CHA nor RTA. For `shape.area()` with `shape: Shape`, the checker's answer is `Shape`'s declaration of `area`, the method the static type declares, not the overrides that may run. For a rule that wants to know what the code *says* (whether a deprecated declaration is called, for instance, or what a function's parameters are), that is exactly right. For a rule that wants to know what *runs*, it is an approximation that misses overrides and anything the checker cannot type.

S2699 (*Tests should include assertions*) uses it to look inside helper functions. A test whose body calls `checkLogin(response)`, where `checkLogin` contains the `expect` calls, has assertions, just not in the test's own body. The rule visits the test's callback; for every call it meets, it resolves the call to an implementation, visits that function's body too, and so on transitively, even into declarations in other files of the TypeScript program. A map of visited nodes, with each node marked as "no assertions" while it is being visited, cuts recursive cycles and makes each function's result reusable for the next test. That is a small interprocedural analysis, computed on demand, with summaries: the subject of the next chapter.

::source{path="packages/analysis/src/jsts/rules/S2699/rule.ts" symbol="class TestCaseAssertionVisitor" title="S2699 follows calls into helpers" note="Each visited node's result is memoised; a node being visited counts as having no assertions, which ends cycles."}

## What makes JavaScript call graphs unsound

Every algorithm of this chapter misses edges on real code, and knowing which is part of using one:

- **Dynamic property access**: `handlers[eventName]()`, `obj[method](…)`.
- **Reflection**: `fn.call`, `fn.apply`, `fn.bind`, `Reflect.apply`, `new Function`, `eval`.
- **Implicit calls**: getters, setters, `toString` and `valueOf` during coercion, iterators in `for…of`, `Proxy` traps.
- **Frameworks**: dependency injection, decorators, routing tables and templates that name handlers as strings, which call application code from library code the analysis does not read.
- **Modules**: dynamic `import()`, `require` with a computed path, globals shared between scripts.

Analysers for JavaScript treat these with the soundiness of chapter 1: model the common cases (a few library functions, the main frameworks), document the rest, and accept the missing edges. :cite[livshits2015soundiness]

## What comes next

With a call graph, an analysis can follow facts into callees and back. The next chapter shows how to do so without analysing every function once per call, and without mixing up what flows in from one caller with what returns to another.
