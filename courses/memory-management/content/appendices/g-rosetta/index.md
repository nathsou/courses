---
title: Rosetta
summary: One linked list in eight languages, and who frees it in each.
number: G
---

The same small program, eight times: build a linked list of a million numbers, walk it once to add them up, then let it go. The interesting line in each version is the last one, where the list stops being needed, because that is where the languages disagree about *who frees it*.

| language | who frees the list | when |
|---|---|---|
| C | the programmer, one `free` per node | when the program says so; never, if it forgets |
| C++ | the owning `unique_ptr`’s destructor | when the owner is destroyed or reassigned |
| Rust | the owning `Box`’s drop | when the owner goes out of scope, checked by the compiler |
| Swift | automatic reference counting | when a node’s count reaches zero |
| Python | reference counting, plus a cycle collector | when a node’s count reaches zero |
| Java | a tracing collector | some time after the list becomes unreachable |
| Go | a concurrent mark–sweep collector | some time after the list becomes unreachable |
| JavaScript | the engine’s mark-and-sweep collector | some time after the list becomes unreachable |

All the versions except Swift’s were compiled and run for this appendix on Linux, and all print `499999500000`. (No Swift compiler was at hand; that version follows the language’s documentation but was not run.) They are written to show the memory management plainly, not as the best way to store a million numbers: in every one of these languages, an array would be smaller and faster.

## C

```c
#include <stdio.h>
#include <stdlib.h>

struct node { long value; struct node *next; };

struct node *build(long n) {
    struct node *head = NULL;
    for (long i = 0; i < n; i++) {
        struct node *p = malloc(sizeof *p);
        if (!p) abort();
        p->value = i;
        p->next = head;
        head = p;
    }
    return head;
}

void release(struct node *p) {
    while (p) {
        struct node *next = p->next;   /* read next before freeing p */
        free(p);
        p = next;
    }
}

int main(void) {
    struct node *list = build(1000000);
    long sum = 0;
    for (struct node *p = list; p; p = p->next) sum += p->value;
    printf("%ld\n", sum);
    release(list);                     /* forget this and it leaks */
}
```

Every node is a separate `malloc`, and must be a separate `free` :cite[kernighan1988]. The one subtle line is in `release`: reading `p->next` *after* `free(p)` would be a use-after-free, which usually works, until the allocator reuses the block (chapter 15). Forgetting `release` entirely is a leak that no one will report. Freeing the list twice is a double free, which with a thread cache can hand the same block to two later callers.

## C++

```cpp
#include <cstdio>
#include <memory>

struct Node {
    long value;
    std::unique_ptr<Node> next;   // each node owns the rest of the list
};

std::unique_ptr<Node> build(long n) {
    std::unique_ptr<Node> head;
    for (long i = 0; i < n; i++)
        head = std::make_unique<Node>(Node{i, std::move(head)});
    return head;
}

int main() {
    auto list = build(1000000);
    long sum = 0;
    for (Node *p = list.get(); p; p = p->next.get()) sum += p->value;
    std::printf("%ld\n", sum);
    // Drop iteratively: the default destructor would recurse once per node.
    while (list) list = std::move(list->next);
}
```

A `unique_ptr` owns its object and deletes it when the `unique_ptr` itself is destroyed. It cannot be copied, only moved, which transfers the ownership :cite[ms-unique-ptr]. Each node owns the next, so destroying the head destroys the whole list, with no `free` in sight.

But look at how: the head’s destructor destroys its `next`, whose destructor destroys *its* `next`, and so on, a million calls deep. When we removed the last line and let `list` go out of scope instead, the program crashed with a segmentation fault: the recursion overflowed the 8 MiB stack. The fix is the loop on the last line, which moves each node’s successor into `list` before the node itself is destroyed, so that every destructor finds its `next` already empty.

## Rust

```rust
struct Node {
    value: i64,
    next: Option<Box<Node>>, // each node owns the rest of the list
}

fn build(n: i64) -> Option<Box<Node>> {
    let mut head = None;
    for i in 0..n {
        head = Some(Box::new(Node { value: i, next: head }));
    }
    head
}

fn main() {
    let mut list = build(1_000_000);
    let mut sum = 0;
    let mut p = &list;
    while let Some(node) = p {
        sum += node.value;
        p = &node.next;
    }
    println!("{sum}");
    // Drop iteratively: the default drop would recurse once per node.
    while let Some(mut node) = list {
        list = node.next.take();
    }
}
```

The same design as C++, enforced by the compiler: every value has one owner, and it is dropped when its owner goes out of scope :cite[rustbook-ownership]. The walk uses `&`, a borrow, so it reads the list without taking ownership of it :cite[rustbook-references]; using `list` after moving it somewhere else would not compile. Chapter 17 is about this model.

The compiler-generated drop has C++’s problem: it is recursive, and recursive code can blow the stack :cite[toomanylists]. Without the final loop, this program aborted with `fatal runtime error: stack overflow`. The loop is the iterative drop that Rust’s best-known tutorial on linked lists recommends :cite[toomanylists]: take each node’s `next` out before the node is dropped.

## Swift

```swift
final class Node {
    let value: Int
    let next: Node?
    init(value: Int, next: Node?) {
        self.value = value
        self.next = next
    }
}

func build(_ n: Int) -> Node? {
    var head: Node? = nil
    for i in 0..<n {
        head = Node(value: i, next: head)
    }
    return head
}

var list = build(1_000_000)
var sum = 0
var p = list
while let node = p {
    sum += node.value
    p = node.next
}
print(sum)
// Release iteratively: releasing the head would release the next node from inside its deinit, and so on.
while let node = list {
    list = node.next
}
```

Swift counts references to every class instance and deallocates it when the count reaches zero :cite[swift-arc]. The compiler inserts the increments and decrements, so the code looks like Java’s, but the frees are as prompt as C’s: the moment the last reference to a node goes, the node goes. Chapter 18 is about this model.

Reference counting releases a chain the same way C++ and Rust destroy one: the node’s deinitialisation releases the next node, which releases the next. Swift programmers have reported stack overflows when a long list is released all at once :cite[springer2022], so this version, too, releases the list one node at a time. Each pass of the loop holds the old head in `node` while `list` moves on, and the old head is released at the end of the pass, when its `next` is still referenced by `list`.

## Python

```python
class Node:
    def __init__(self, value, next):
        self.value = value
        self.next = next

def build(n):
    head = None
    for i in range(n):
        head = Node(i, head)
    return head

lst = build(1_000_000)
total, p = 0, lst
while p is not None:
    total += p.value
    p = p.next
print(total)
lst = None   # the last reference to the head: counts fall to zero down the list
```

CPython, the standard implementation, counts references too, and calls an object’s deallocation function as soon as its last reference is released :cite[cpython-refcounting]. Setting `lst` to `None` frees the head at once, which frees the next node, and so on down the list; this version ran without a crash. A list whose last node pointed back to the first would form a cycle that counting never frees, and CPython runs a separate cycle collector to find such garbage :cite[cpython-gc] (chapter 19).

## Java

```java
public class List {
    static final class Node {
        final long value;
        final Node next;
        Node(long value, Node next) { this.value = value; this.next = next; }
    }

    static Node build(long n) {
        Node head = null;
        for (long i = 0; i < n; i++) head = new Node(i, head);
        return head;
    }

    public static void main(String[] args) {
        Node list = build(1_000_000);
        long sum = 0;
        for (Node p = list; p != null; p = p.next) sum += p.value;
        System.out.println(sum);
        list = null; // unreachable now; collected whenever the collector runs
    }
}
```

Nothing is freed at the last line. The list becomes unreachable, and the language only promises that unreachable objects *may* be reclaimed :cite[jls12]; when, and whether before the program exits, is up to the collector. HotSpot’s default collector has been G1 since JDK 9 :cite[jep248] (chapter 26). Nor is there a chain of nested frees to overflow the stack: a tracing collector works outwards from what is still reachable, not along the dead list (chapter 21).

## Go

```go
package main

import "fmt"

type Node struct {
	Value int64
	Next  *Node
}

func build(n int64) *Node {
	var head *Node
	for i := int64(0); i < n; i++ {
		head = &Node{Value: i, Next: head}
	}
	return head
}

func main() {
	list := build(1_000_000)
	var sum int64
	for p := list; p != nil; p = p.Next {
		sum += p.Value
	}
	fmt.Println(sum)
	list = nil // unreachable now; the concurrent collector reclaims it
	_ = list
}
```

Go decides for each value whether it can live on the stack, where it is freed with its function’s frame, or whether it *escapes* to the heap, where the garbage collector manages it. The nodes here are returned from `build`, so they escape :cite[go-gc-guide]. Go’s collector is a tracing mark–sweep collector that does most of its work concurrently with the program, and it never moves objects :cite[go-gc-guide].

## JavaScript

```js
function build(n) {
  let head = null;
  for (let i = 0; i < n; i++) head = { value: i, next: head };
  return head;
}

let list = build(1_000_000);
let sum = 0;
for (let p = list; p !== null; p = p.next) sum += p.value;
console.log(sum);
list = null; // unreachable now; the engine's collector reclaims it
```

JavaScript allocates memory when objects are created and frees it when they are no longer used; modern engines all decide “no longer used” by reachability, with a mark-and-sweep collector, and none uses reference counting any more :cite[mdn-memory]. A program cannot trigger a collection itself :cite[mdn-memory]. The closest it can get to knowing when an object dies is a `FinalizationRegistry`, whose callbacks may run late or never (chapter 27).

## The same program, compared

The eight versions fall into the three families of the course. In C, the program frees. In C++, Rust and Swift, the frees are written by the compiler or the library, at points fixed by the program’s structure: the end of an owner’s scope, the last decrement of a count. They are prompt and predictable, and a long chain of them is a chain of nested calls that can overflow the stack. In Python the frees are prompt as well, but a cycle needs a second mechanism. In Java, Go and JavaScript the program never says when, and the collector frees whatever it cannot reach, in its own time, in bulk.

In Mote, appendix E, you can run one program under all of these policies and watch them disagree.
