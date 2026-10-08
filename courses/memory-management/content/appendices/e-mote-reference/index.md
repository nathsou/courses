---
title: Mote reference
summary: 'The course language: types, statements, built-ins and the memory-manager settings.'
number: E
---

Mote is the small language the course uses to show memory managers at work. It has structs, arrays and functions, and nothing that would distract from the question of who frees what: no strings beyond the ones you print, no generics, no modules. The same program can run under any of ten memory managers, from `malloc` and `free` to a generational collector, which is what the dial in chapter 0 and its relatives throughout the course do.

This page is the whole language. The playground at the bottom runs any program you write under any setting.

## A first program

```mote
struct Node { value: int, next: Node? }

fn push(head: Node?, v: int) -> Node {
  return new Node { value: v, next: head }
}

fn main() {
  var list: Node? = null
  for i in 0..10 {
    list = push(list, i)
  }
  print(list.value)
}
```

A program is a list of struct declarations, functions and global variables, in any order. It must have a function `main()`, where it starts. Comments run from `//` to the end of the line.

Statements end at a new line or a semicolon. An expression never continues onto the next line with an operator, a call or an index, so a line break always ends a statement: write long expressions on one line, or in parentheses on one line.

## Types

| type | values | notes |
|---|---|---|
| `int` | whole numbers | 53-bit range; overflow is a runtime error |
| `bool` | `true`, `false` | |
| `S` or `S?` | a pointer to a struct `S`, or `null` | the `?` documents that it may be null; the language does not check |
| `[T]` | a pointer to an array of `T`, or `null` | arrays have a fixed length |
| `fn(T, U) -> R` | a pointer to a function | |

Every struct and array lives in the heap, and a variable of struct or array type holds a pointer to it. Assigning one copies the pointer, not the object, which is the whole reason memory management is hard.

String literals exist only as arguments to `print`.

## Declarations

```mote
struct Tree {
  left: Tree?
  right: Tree?
  weak parent: Tree?        // a weak pointer: see below
  value: int
}

var count: int = 0          // a global: a root for every collector

fn depth(t: Tree?) -> int {
  if t == null { return 0 }
  let l = depth(t.left)     // let: cannot be reassigned
  var r = depth(t.right)    // var: can be
  if l > r { return l + 1 }
  return r + 1
}
```

Fields are separated by commas or new lines. A function without `->` returns nothing. Local variables are declared with `let` (fixed) or `var` (reassignable), with an optional type; the type is inferred from the initial value when omitted, and must be given when the initial value is `null`.

A **weak** field does not keep its target alive. Reference counting does not count it, tracing collectors do not follow it, and when its target is freed, the field becomes `null` (chapters 19 and 27). Only pointer fields can be weak.

## Statements and expressions

| | |
|---|---|
| `x = e`, `p.f = e`, `a[i] = e` | assignment |
| `if c { … } else if d { … } else { … }` | conditions are `bool`; braces are required |
| `while c { … }` | |
| `for i in a..b { … }` | `i` counts from `a` up to `b − 1` |
| `break`, `continue`, `return e` | |
| `new S { f: e, g: e }` | allocate a struct; fields not given are zero or `null` |
| `new [T; n]` | allocate an array of `n` elements, all zero or `null` |
| `p.f`, `a[i]`, `len(a)` | field, element, length |
| `f(x, y)` | call a function, or a function pointer |
| `&e` | a borrow (ownership setting only; elsewhere it means `e`) |

Operators, from loosest to tightest: `||`; `&&`; `==` and `!=`; `<`, `<=`, `>` and `>=`; `+` and `-`; `*`, `/` and `%`; then unary `-` and `!`. Division rounds towards zero. `==` on pointers compares addresses.

## Built-in functions

| | |
|---|---|
| `print(a, b, …)` | prints its arguments, separated by spaces; pointers print as addresses |
| `free(p)` | frees `p` (manual setting). Under other settings it does nothing, but the course records it as a “ghost free”, so the lifetime chart can show where a manual program would have freed the object |
| `gc()` | asks the collector to collect now, if there is one |
| `len(a)` | the length of an array |
| `assert(c)` | stops the program with an error if `c` is false |
| `random(n)` | a number from 0 to `n − 1`, from a seeded generator: every run is the same |

## Runtime errors

Mote checks what C would not, unless the setting says otherwise:

- **null pointer dereference**, reading or writing a field of `null`;
- **index out of bounds**, or a negative array length;
- **out of memory**, when the memory manager cannot find room even after collecting;
- **division by zero** and **integer overflow**;
- **double free**, and **free of an address `malloc` never returned**;
- **use of a moved value**, and **use after free**, under the ownership setting.

Under the manual setting, use-after-free, double frees and buffer overflows are *not* stopped: like C, the program carries on, reading whatever is in the memory now. That is what chapter 15’s error zoo is about. The oracle (appendix B) still sees them, and the figures mark them.

## The settings

| setting | who frees | chapter |
|---|---|---|
| manual | the program, with `free`; a size-class allocator like a thread cache | 10–16 |
| ownership | each object has one owner; it is freed when its owner goes out of scope. Assigning a pointer moves it; `&e` borrows | 17 |
| reference counting | freed when its count of incoming pointers reaches zero | 18 |
| RC + cycle collector | reference counting, plus trial deletion for cycles | 19 |
| mark–sweep | a tracing collector: mark what is reachable from the roots, sweep the rest | 21 |
| conservative | mark–sweep that treats every word on the stack that looks like a heap address as a pointer | 24 |
| mark–compact | mark, then slide the survivors together | 22 |
| copying | copy the survivors into the other half of the heap (Cheney’s algorithm) | 22 |
| generational | a copying nursery for new objects, mark–sweep for the old, and a write barrier between them | 23 |
| incremental | mark–sweep in small slices at the program’s safepoints, with a choice of write barrier | 25 |

The roots, for every collector, are the global variables and the pointers in the stack frames of the functions that are running. The compiler’s stack maps (chapter 24) say which stack slots hold pointers.

## Playground

Edit the program, then turn the dial. Every setting runs the same program (except ownership, which needs programs written for it, with borrows: chapter 17 has them); the chart shows the bytes each one holds over time, against the two oracles: the bytes still reachable, and the bytes the program will actually use again.

:::dial{settings="manual,rc,rc-cycles,mark-sweep,conservative,mark-compact,copying,generational,incremental" editable="true" title="Mote playground" n="E.1"}
```mote
struct Node { value: int, next: Node? }

fn build(n: int) -> Node? {
  var head: Node? = null
  for i in 0..n {
    head = new Node { value: i, next: head }
  }
  return head
}

fn sum(list: Node?) -> int {
  var total = 0
  var cur = list
  while cur != null {
    total = total + cur.value
    cur = cur.next
  }
  return total
}

fn release(list: Node?) {
  var cur = list
  while cur != null {
    let next = cur.next
    free(cur)
    cur = next
  }
}

fn main() {
  for round in 0..5 {
    let list = build(40)
    print(round, sum(list))
    release(list)
  }
}
```
:::
