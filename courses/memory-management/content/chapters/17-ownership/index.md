---
title: Ownership
summary: Every object has exactly one owner, and the owner going away is the free. Destructors, moves, borrows, Rust, regions and escape analysis.
number: 17
duration: 55 minutes
prerequisites: [the-error-zoo]
---

Look back at the zoo and ask, of each error, what the programmer did not know. The use after free: that someone else had already freed the account. The double free: that the session had already been freed. The leak: that nobody else was going to free the request. Every one of them is a failure to answer the same question: *whose job is it to free this object?*

C has no answer. A pointer is a pointer, and any code holding one may free what it points to, or assume someone else will. **Ownership** is the discipline of answering the question in the program itself: every object has exactly one **owner**, the owner is responsible for freeing it, and when the owner goes away, the object goes with it. Get that right and `free` stops being something the programmer writes. It is inserted, at exactly one place, by the language.

## Destructors: freeing tied to scope

C++ got there first, through a technique Bjarne Stroustrup named “resource acquisition is initialization”: represent a resource by a local object whose destructor releases it, so that leaving the scope, by any path, releases the resource, and “the programmer cannot forget to release the resource” :cite[stroustrup-faq]. Memory is the most common resource of all. A `std::unique_ptr` owns one heap object and deletes it in its destructor; it cannot be copied, only moved, so there is never more than one owner.

The course’s language can do the same. Under Mote’s **ownership** setting:

- a pointer stored in a local variable, a global or a field of another object **owns** what it points to;
- assigning it elsewhere (`let b = a`, `x.next = a`, `return a`) **moves** it: the new place owns the object and the old one may no longer be used;
- a parameter, or a local initialised with `&e`, only **borrows**: it may use the object but never frees it;
- when an owner goes out of scope, or is overwritten, the object is **dropped**: freed, together with everything it owns.

There is no `free` anywhere in the programs that follow. Mote checks these rules as the program runs and stops at the first violation, which makes each mistake easy to see; Rust, as we shall see, checks the same kind of rules before the program runs at all.

```predict
q: "In the program in the figure below, `a`’s car is moved into `garage`. When `main` ends, which car is dropped first?"
options:
  - text: The 1999 car, the one in `garage`
    correct: true
    why: "Locals are dropped in reverse order of declaration, so `garage` (declared last) goes first; `a` was moved out and owns nothing; then `b`. Dropping a car drops the engine it owns."
  - text: The 2024 car, `b`’s
    why: "`b` was declared before `garage`. Locals are dropped in reverse order of declaration."
  - text: Neither is dropped; nothing calls free
    why: "That is the point of ownership: the drops are inserted where each owner goes out of scope."
```

:::lifetime-bars{title="Owners, moves and drops" n="17.1"}
```mote
struct Engine { power: int }
struct Car { engine: Engine?, year: int }

fn main() {
  let a = new Car { engine: new Engine { power: 90 }, year: 1999 }
  let b = new Car { engine: new Engine { power: 150 }, year: 2024 }
  var garage = a
  print(garage.year, b.engine.power)
}
```
Each bar is an object; its stretches are labelled with the owner at each moment, a local or a field of another object (`#2.engine` is the `engine` field of object 2). Click a column to see who owned what after each line. Notice `a`’s car changing owner on line 7, and the last column, which lists the drops at the end of `main` in the order they happened.
:::

Rust drops a function’s variables in the same order, “in reverse order of declaration” :cite[rust-destructors], and for the same reason: a variable declared later may refer to one declared earlier, so it must go first.

## Use after move

One owner means that after a move, the old name is empty. Using it is the ownership version of a use after free, except that it is caught at the moment it happens, with a message that says what went wrong.

```mote-task
id: ownership/move
title: Two names for one account
setting: ownership
prompt: |
  `let backup = mine` *moves* the account into `backup`, so `mine` no longer owns anything and line 10 is rejected. `total` only needs to *read* both accounts. Make `backup` a borrow instead of an owner, so the program prints 200 and the account is still dropped exactly once.
starter: |
  struct Account { owner: int, balance: int }

  fn total(a: Account, b: Account) -> int {
    return a.balance + b.balance
  }

  fn main() {
    let mine = new Account { owner: 1, balance: 100 }
    let backup = mine
    print(total(mine, backup))
  }
solution: |
  struct Account { owner: int, balance: int }

  fn total(a: Account, b: Account) -> int {
    return a.balance + b.balance
  }

  fn main() {
    let mine = new Account { owner: 1, balance: 100 }
    let backup = &mine
    print(total(mine, backup))
  }
expect: ["200"]
hints:
  - "A local initialised with `&e` borrows: `let backup = &mine`."
explain: "Now `mine` is the only owner and `backup` merely borrows; `mine` is dropped at the end of `main`. (In real code the backup is pointless, of course: `total(mine, mine)` would do.)"
```

## Borrows that outlive their owner

Borrowing is what makes ownership practical: most code only needs to *look at* an object, and it would be absurd to move it in and out of every function. But a borrow is a pointer that does not own anything, which means it can outlive what it points to. That is exactly the dangling pointer from the zoo, and the ownership rules have to stop it.

:::lifetime-bars{title="A borrow that outlives its object" n="17.2"}
```mote
struct Box { v: int }

fn main() {
  let first = new Box { v: 1 }
  var best = &first
  for i in 0..3 {
    let b = new Box { v: i * 10 }
    if b.v > best.v {
      best = b
    }
  }
  print(best.v)
}
```
`best` borrows the best box seen so far. On line 9 it starts borrowing `b`, but `b` is dropped at the end of each pass through the loop. The red dashed line is a borrow pointing at an object that no longer exists.
:::

Under manual management with no `free`, this program prints the right answer and leaks four boxes. Under ownership, it is stopped on line 12, at the use of the dangling borrow. The fix is not to borrow the best box but to *own* it: move each better box into a variable that lives as long as it is needed.

```mote-task
id: ownership/borrow
title: Keep the best one
setting: ownership
prompt: |
  Fix the program from figure 17.2 so that it prints 20 under the ownership setting, with every box dropped by the end. `best` has to own the best box, not borrow it.
starter: |
  struct Box { v: int }

  fn main() {
    let first = new Box { v: 1 }
    var best = &first
    for i in 0..3 {
      let b = new Box { v: i * 10 }
      if b.v > best.v {
        best = b
      }
    }
    print(best.v)
  }
solution: |
  struct Box { v: int }

  fn main() {
    var best = new Box { v: 1 }
    for i in 0..3 {
      let b = new Box { v: i * 10 }
      if b.v > best.v {
        best = b
      }
    }
    print(best.v)
  }
expect: ["20"]
hints:
  - "Start with an owner: `var best = new Box { v: 1 }`."
  - "Then `best = b` moves the new box into `best`, and the old best box is dropped when it is overwritten."
explain: "Each assignment `best = b` moves `b` into `best` and drops the box `best` owned before. When `b` was moved, the end of the loop body has nothing left to drop; when it was not, `b` is dropped there as usual."
```

## Rust: the rules, checked before the program runs

Rust, whose 1.0 release in May 2015 promised safety “without requiring a garbage collector or runtime” :cite[rust2015], builds this discipline into its type system. Its book states the ownership rules in three lines: “Each value in Rust has an owner. There can only be one owner at a time. When the owner goes out of scope, the value will be dropped” :cite[rustbook-ownership]. Borrowing has two more: at any given time you can have either one mutable reference or any number of immutable ones, and “references must always be valid” :cite[rustbook-references].

The difference from Mote is when the rules are checked. Mote checks them as the program runs, so a bad path that is never taken is never caught. Rust’s **borrow checker** checks them at compile time, for every path: the program in figure 17.2 would not compile, because the compiler can see that `b` does not live as long as the borrow stored in `best`. Proving that a program obeys the rules on every path is a kind of verification.

:::bridge{course=formal-verification chapter=linked-structures-and-ownership title="For All Inputs, chapter 22: Linked structures and ownership"}
Separation logic describes heaps in disjoint pieces, so that a proof about one object cannot be broken by a write to another. The same chapter shows how Rust’s borrow checker does this accounting in the type system, and how verifiers catch use after free, double free and leaks.
:::

The price is expressiveness. Some perfectly safe programs are hard to write under one-owner rules: a doubly linked list, where every node is pointed to by two others; a graph with cycles; a cache shared by many parts of a program. Rust offers escape hatches for these, among them reference-counted pointers, which are the subject of the next part.

## Regions and escape analysis

Ownership ties an object’s lifetime to a scope. Two older ideas do the same from other directions.

Chapter 13’s **regions** let a compiler assign objects to arenas whose lifetimes it can check :cite[tofte1997], and the Cyclone language, a safe dialect of C, brought checked regions to C-like code :cite[grossman2002]. Rust’s reference lists “ML Kit, Cyclone: region based memory management” among the language’s influences, alongside C++’s “references, RAII, smart pointers, move semantics” :cite[rust-influences]; a Rust lifetime is, in effect, the region a reference may point into.

**Escape analysis** asks a simpler question: does this object outlive the function that created it? If not, it can live in the function’s stack frame and be freed by the return, for free. Go does exactly this. Its FAQ explains that the compiler allocates a function’s variables in its stack frame when possible, but “if the compiler cannot prove that the variable is not referenced after the function returns, then the compiler must allocate the variable on the garbage-collected heap to avoid dangling pointer errors” :cite[gofaq]. The language never asks the programmer; the compiler proves what it can and leaves the rest to the collector.

:::key
**Ownership** answers the question the zoo kept failing: every object has one owner, and the owner going out of scope is the free. **Moves** transfer ownership; **borrows** use an object without owning it, and must not outlive it. C++ ties freeing to scopes with destructors; Rust checks ownership and borrowing at compile time; regions and escape analysis bound lifetimes in other ways. The cost is that some structures, with many references to one object, do not fit one-owner rules.
:::

:::whofrees
The owner, at the end of its scope, by a free the language inserts. The programmer still decides *who* the owner is, but never writes `free` and can never call it twice or forget it.
:::

## What’s next

Part IV is done. Part V starts from the structures ownership cannot express: objects with many owners at once. If no single owner can decide, perhaps the object can count its owners itself, and free itself when the count reaches zero. That is **reference counting**.
