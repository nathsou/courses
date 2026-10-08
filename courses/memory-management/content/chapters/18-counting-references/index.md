---
title: Counting references
summary: Every object keeps a count of the pointers to it, and frees itself when the count reaches zero. Collins’s idea of 1960, and where it lives today.
number: 18
duration: 45 minutes
prerequisites: [ownership]
---

Ownership works beautifully until two parts of a program both need an object and neither can say it will be the last to use it. A document shown in two windows. A string interned in a table and held by a dozen variables. A node in a graph with several parents. Make any one of them the owner and the others hold borrows that may dangle; make none of them the owner and nobody frees it.

The way out is to stop asking who the owner is and start counting them. Give every object a number: how many pointers to it exist right now. Each time a pointer to it is created, add one; each time one is destroyed or overwritten, subtract one. When the number reaches zero, nobody can reach the object any more, and it can be freed on the spot. That is **reference counting**, and it was published by George Collins in 1960, for the list-processing systems of the day :cite[collins1960].

## Watching the counts

:::rc-stepper{title="Counts, and a cascade" n="18.1"}
```mote
struct Node { value: int, next: Node? }

fn main() {
  var list: Node? = null
  for i in 0..4 {
    list = new Node { value: i, next: list }
  }
  var keep = list.next.next
  list = null
  print("kept", keep.value)
  keep = null
  print("done")
}
```
Each card is an object with its count in the corner; arrows are pointers, and the variables on the left count too. Step through the loop and watch each new node take the old list as its `next`. Then watch line 9.
:::

```predict
q: "On line 9, `list = null` removes the only variable pointing to the head of the four-node list. `keep` still points to the third node. What happens?"
options:
  - text: Nothing is freed until the program ends
    why: "Reference counting frees an object the moment its count reaches zero. That is its great virtue."
  - text: All four nodes are freed
    why: "The third node has two pointers to it: the second node’s `next` and `keep`. One of them goes away; one remains."
  - text: The first two nodes are freed; the cascade stops at the node `keep` holds
    correct: true
    why: "The head’s count drops to zero, so it is freed, which drops the second node’s count to zero, which frees it, which drops the third node’s count from 2 to 1. One count still holds, and the cascade stops there."
```

Two things happened on line 9, and both matter. Memory came back immediately, in the same statement, with no pause and no collector: the course’s lifetime charts would show almost no gap between an object becoming unreachable and its being freed. And a single assignment freed *two* objects, because freeing an object destroys the pointers inside it, which decrements their targets, which may free them in turn. That chain is a **cascade**.

## The cost of a cascade

A cascade has no natural limit. Drop the last pointer to the head of a list of a million nodes and that one assignment frees a million objects before the next statement runs, which is exactly the kind of pause reference counting is supposed to avoid. Worse, the obvious way to write it, a `release` function that calls itself on each child, uses one stack frame per level, and chapter 8 showed what happens to a stack a million frames deep.

The fix for the second problem is to keep a **work list**: objects whose counts have reached zero and whose children have not been released yet. The fix for the first is to not process the whole list at once: free a bounded number of objects per allocation and leave the rest for later, which smooths the pause at the cost of holding memory a little longer. The course’s VM does the work list; the exercise asks you to do the same.

```build
id: counting-references/rc
title: Reference counting on the workbench
prompt: |
  Implement reference counting on the collector workbench. Every pointer store goes through `write(slot, value)`, where `slot` is a root slot or a pointer field. Keep each object’s count in its aux word, free an object with `heap.free` when its count reaches zero, and release everything it points to. The last test builds a list of 100,000 nodes and drops it with one write: a recursive release will overflow the stack. The very last test documents what reference counting cannot do.
starter: |
  import { GcHeap } from '@mm/gc';

  // The count of object o lives in its aux word: heap.aux(o) and heap.setAux(o, n).
  export function createRc(heap: GcHeap) {
    function increment(o: number) {
      // TODO
    }

    function decrement(o: number) {
      // TODO: when a count reaches zero, decrement everything the object points to, then heap.free it.
    }

    return {
      /** Store `value` (an object or 0) into `slot` (a root slot or a pointer field), keeping every count right. */
      write(slot: number, value: number): void {
        // TODO: keep the counts of the old and the new target right.
        heap.set(slot, value);
      },
    };
  }
solution: |
  import { GcHeap } from '@mm/gc';

  // The count of object o lives in its aux word: heap.aux(o) and heap.setAux(o, n).
  export function createRc(heap: GcHeap) {
    function increment(o: number) {
      heap.setAux(o, heap.aux(o) + 1);
    }

    function decrement(o: number) {
      // A work list, not recursion: a long list can cascade through millions of objects.
      const work = [o];
      while (work.length) {
        const x = work.pop()!;
        const n = heap.aux(x) - 1;
        heap.setAux(x, n);
        if (n > 0) continue;
        for (const child of heap.children(x)) work.push(child);
        heap.free(x);
      }
    }

    return {
      /** Store `value` (an object or 0) into `slot` (a root slot or a pointer field), keeping every count right. */
      write(slot: number, value: number): void {
        const old = heap.get(slot);
        if (old === value) return;
        if (value) increment(value);
        heap.set(slot, value);
        if (old) decrement(old);
      },
    };
  }
tests: |
  import { test, expect } from '@mm/test';
  import { GcHeap } from '@mm/gc';
  import { createRc } from './solution';

  function setup(roots = 4) {
    const heap = new GcHeap({ bytes: 1 << 23, roots });
    const T = heap.addType('Node', 2, 1);
    const rc = createRc(heap);
    const r = heap.rootSlots();
    const field = (o: number, i: number) => heap.pointerSlots(o)[i]!;
    return { heap, T, rc, r, field };
  }

  test('counts follow the pointers: an object dies when its last pointer goes', () => {
    const { heap, T, rc, r } = setup();
    const a = heap.alloc(T);
    rc.write(r[0]!, a);
    rc.write(r[1]!, a);
    expect(heap.aux(a)).toBe(2);
    rc.write(r[0]!, 0);
    expect(heap.aux(a)).toBe(1);
    expect(heap.isFree(a)).toBe(false);
    rc.write(r[1]!, 0);
    expect(heap.isFree(a)).toBe(true);
  });
  test('freeing an object releases what it points to, and the cascade stops at shared objects', () => {
    const { heap, T, rc, r, field } = setup();
    const a = heap.alloc(T);
    const b = heap.alloc(T);
    const c = heap.alloc(T);
    rc.write(r[0]!, a);
    rc.write(field(a, 0), b);
    rc.write(field(b, 0), c);
    rc.write(r[1]!, c); // c is shared
    rc.write(r[0]!, 0);
    expect([heap.isFree(a), heap.isFree(b), heap.isFree(c)]).toEqual([true, true, false]);
    expect(heap.aux(c)).toBe(1);
  });
  test('overwriting a pointer with itself changes nothing', () => {
    const { heap, T, rc, r } = setup();
    const a = heap.alloc(T);
    rc.write(r[0]!, a);
    rc.write(r[0]!, a);
    expect(heap.aux(a)).toBe(1);
    expect(heap.isFree(a)).toBe(false);
  });
  test('a list of 100,000 nodes is freed by one write, without overflowing the stack', () => {
    const { heap, T, rc, r, field } = setup();
    const first = heap.alloc(T);
    rc.write(r[0]!, first);
    let cur = first;
    for (let i = 1; i < 100_000; i++) {
      const n = heap.alloc(T);
      rc.write(field(cur, 0), n);
      cur = n;
    }
    rc.write(r[0]!, 0);
    expect(heap.freed.size).toBe(100_000);
  });
  test('the known limitation: a cycle keeps itself alive', () => {
    const { heap, T, rc, r, field } = setup();
    const a = heap.alloc(T);
    const b = heap.alloc(T);
    rc.write(r[0]!, a);
    rc.write(field(a, 0), b);
    rc.write(field(b, 0), a);
    rc.write(r[0]!, 0);
    expect([heap.aux(a), heap.aux(b)]).toEqual([1, 1]);
    expect(heap.freed.size).toBe(0);
  });
hints:
  - "In `write`: increment the new target *before* decrementing the old one, or `x = x` could free x."
  - "Use a work list in `decrement`: pop an object, decrement it, and if it reached zero push its children (`heap.children(x)`) and free it."
```

## Reference counting everywhere

Once you know the pattern, it is everywhere.

- **CPython** counts references to every object. `Py_DECREF` releases a reference, and “once the last strong reference is released (i.e. the object’s reference count reaches 0), the object’s type’s deallocation function … is invoked” :cite[cpython-refcounting].
- **Swift** uses Automatic Reference Counting for instances of classes: the compiler inserts the increments and decrements, and “ARC automatically frees up the memory used by class instances when those instances are no longer needed” :cite[swift-arc]. The same approach is used for Objective-C :cite[swift-arc].
- **C++**’s `std::shared_ptr` “uses reference counting to manage resources” :cite[ms-shared-ptr], and **Rust**’s `Rc<T>` “provides shared ownership of a value”, dropping it “when the last `Rc` pointer to a given allocation is destroyed” :cite[rust-rc]. These are the escape hatches from one-owner rules that chapter 17 promised.
- **COM**, Microsoft’s component model, puts the count in every interface: `Release` decrements it, and “when the reference count on an object reaches zero, `Release` must cause the interface pointer to free itself” :cite[com-release].
- **File systems** count too. A Unix file can have several names, hard links, and the file’s space is freed only “when the file’s link count becomes 0 and no process has a reference to the file via an open file descriptor or a memory mapping” :cite[posix-unlink]. Deleting a file is a decrement.

What these systems share is the appeal of determinism: an object dies the moment its last reference goes, so its memory, and any other resource it holds, comes back at a predictable point in the program. What they also share is a cost, paid on every pointer write, and a blind spot, which the next chapter is about.

:::key
**Reference counting** keeps, in each object, the number of pointers to it, adjusted on every pointer write; an object whose count reaches zero is freed at once, releasing the pointers inside it, which can **cascade**. It reclaims memory promptly and with no separate collector, which is why CPython, Swift, `shared_ptr`, `Rc`, COM and file systems use it. A cascade can be long, so it should run from a work list, not recursion.
:::

:::whofrees
The last pointer to go. Nobody decides; the object counts its owners and frees itself when there are none left. The programmer’s job shrinks to not creating the one structure that counting cannot see.
:::

## What’s next

That structure is a **cycle**. Two objects that point to each other each have a count of at least one, forever, even when nothing else in the program can reach them. The next chapter shows the leak, two ways to avoid it, and an algorithm that finds such cycles by doing something clever with the counts.
