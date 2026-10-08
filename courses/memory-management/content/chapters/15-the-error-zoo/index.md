---
title: The error zoo
summary: Use after free, double free, overflows, over-reads and leaks, each reproduced on a real allocator; and how a dangling pointer becomes type confusion.
number: 15
duration: 50 minutes
prerequisites: [a-heap-from-scratch]
---

`malloc` makes a promise and asks for one in return. The promise: here is a block of at least the size you asked for, which nobody else will be given. The request: use only the bytes you asked for, stop using them when you call `free`, and call `free` exactly once. That is the whole contract of manual memory management, and every memory error is a way of breaking one clause of it.

The allocator never checks. It cannot: in C, a pointer is just a number, and the allocator sees only the calls the program makes, not the loads and stores in between. When the program breaks the contract, nothing happens at that moment. What happens comes later, somewhere else, and often looks like something else entirely.

This chapter is a zoo of those errors. Each figure runs a short Mote program under manual management with no checks, on the size-class allocator from chapter 12, exactly as C would run it. Step through each one: the heap panel shows every block and who occupies it, freed blocks show the free-list pointer the allocator wrote into them, and the oracle, which sees everything, explains each error as it happens.

## Use after free

```predict
q: "In the program below, `a` is freed and then read. What does line 6 print?"
options:
  - text: An error
    why: "Nothing checks. The read goes to memory like any other read."
  - text: "100"
    correct: true
    why: "Freeing a block changes almost nothing in it: the allocator overwrote only the first word with its free-list pointer, and the balance is still there. A use after free usually works, until the memory is reused."
  - text: "0"
    why: "Freed memory is not cleared. The old values stay until someone writes over them."
```

:::zoo-run{title="Use after free" n="15.1"}
```mote
struct Account { owner: int, balance: int }

fn main() {
  let a = new Account { owner: 7, balance: 100 }
  free(a)
  print("a.balance after free:", a.balance)
  let b = new Account { owner: 9, balance: 5000 }
  print("a.balance now:", a.balance)
  a.balance = 0
  print("b.balance now:", b.balance)
}
```
Press play, or step with the arrows. A dashed block is free; its first word now holds the free-list pointer. When `b` is allocated, the allocator hands out the most recently freed block of that size, which is `a`’s.
:::

The read on line 6 works, which is the most dangerous thing about it. Then `b` is allocated, the allocator reuses the block, and the stale pointer `a` now reads and writes `b`. Line 9 sets *a*’s balance to zero and empties *b*’s account. Notice that after the reuse even the oracle stops complaining: `a` and `b` hold the same address and point at an object of the type `a` expects, and from the address alone nobody can tell that `a` was meant to be dead. Detectors, in the next chapter, have to work hard to catch this.

## Double free

Free a block twice and the allocator puts it on its free list twice. The list now offers the same block to the next two callers.

:::zoo-run{title="Double free" n="15.2"}
```mote
struct Session { user: int, admin: bool }

fn main() {
  let s = new Session { user: 1, admin: false }
  free(s)
  free(s)
  let alice = new Session { user: 2, admin: false }
  let mallory = new Session { user: 3, admin: false }
  print("same block?", alice == mallory)
  mallory.admin = true
  print("alice.admin:", alice.admin)
}
```
After the second `free`, the block appears twice on the size class’s free list. The next two allocations return the same address: two objects, one block.
:::

`alice` and `mallory` are the same memory. When Mallory’s session is made an administrator, so is Alice’s. In a real allocator the consequences are usually worse, because the allocator’s own bookkeeping, the free-list pointer stored inside the block, is now inside memory that the program believes it owns. A program that writes to its new object overwrites the free list, and the next `malloc` returns whatever address was written there.

::museum{exhibit="zlib-2002"}

## Heap overflow

An array has a length; nothing in C stops an index from going past it. Writes past the end land in whatever comes next in memory, which, in an allocator that packs blocks of one size class together, is the next object.

:::zoo-run{title="Heap overflow" n="15.3"}
```mote
struct Account { id: int, balance: int, limit: int }

fn main() {
  let scores = new [int; 3]
  let acct = new Account { id: 42, balance: 100, limit: 500 }
  for i in 0..8 {
    scores[i] = 999999
  }
  print("balance:", acct.balance)
}
```
The loop writes eight elements into an array of three. Red fields were overwritten from outside their object.
:::

The account’s balance becomes 999999, and nothing in the program ever assigned it. The first words past the array were the account’s header; in C, they would be the allocator’s chunk header, and corrupting it breaks `free` later, far from the bug.

## Over-read

Reading past the end is quieter than writing: nothing is damaged, something is revealed.

:::zoo-run{title="An echo that trusts its caller" n="15.4"}
```mote
struct Secret { key1: int, key2: int, key3: int }

fn echo(payload: [int], claimed: int) {
  for i in 0..claimed {
    print(payload[i])
  }
}

fn main() {
  let payload = new [int; 3]
  payload[0] = 104
  payload[1] = 105
  payload[2] = 33
  let secret = new Secret { key1: 31337, key2: 27182, key3: 16180 }
  echo(payload, 9)
}
```
`echo` prints as many elements as its caller *claims* the payload has. The claim is 9; the payload has 3.
:::

After the three bytes of the payload (“hi!” as character codes) come the secret’s header and then its three keys, printed for anyone who asked. This is the shape of one of the most famous bugs of the last decade.

::museum{exhibit="heartbleed-2014"}

## Leaks

The opposite of a use after free is never freeing at all. A leaked block is harmless once; leaked on every request of a server that runs for months, it is a slow-motion outage.

:::zoo-run{title="An early return" n="15.5" leaks}
```mote
struct Request { id: int, size: int }

fn handle(i: int) -> int {
  let r = new Request { id: i, size: i * 10 }
  if i % 4 == 0 {
    return 0
  }
  let n = r.size
  free(r)
  return n
}

fn main() {
  var total = 0
  for i in 0..20 {
    total = total + handle(i)
  }
  print("served", total)
}
```
Every fourth request returns early and skips the `free`. Run to the end: the oracle lists every object that was never freed and that nothing points to.
:::

The oracle can say the leaked requests are *unreachable*, because it can see the whole heap and every root. A C program cannot, which is why the program’s author never noticed. Chapter 21 turns exactly this ability, finding everything unreachable, into a memory manager.

Two more species complete the zoo. An **invalid free** passes `free` an address that `malloc` never returned, such as a pointer into the middle of a block; the allocator reads a header that is not a header. An **uninitialised read** uses memory before anything was written to it, and sees whatever the previous occupant left behind. Mote zeroes every new object, as Java, Go and Rust do, so it cannot show the second; C does not.

## From a bug to an exploit

Why do these bugs matter beyond crashes and wrong answers? Because memory reused by an object of a *different type* lets an attacker choose what a stale pointer finds.

Here is the idea, at the level of concepts. An object with a **function pointer** in it, a button with an `onClick` handler, is freed while a pointer to it survives. The attacker arranges for the program to allocate something whose contents they control, here a message with an integer body, of the same size, so the allocator gives it the button’s old block. The integer sits exactly where the handler was. When the program calls the stale button’s handler, it jumps to whatever number the attacker sent.

:::zoo-run{title="Type confusion" n="15.6" checks}
```mote
struct Button { clicks: int, onClick: fn(int) -> int }
struct Message { length: int, body: int }

fn open(x: int) -> int {
  print("opening document", x)
  return 0
}

fn grantAdmin(x: int) -> int {
  print("ADMIN ACCESS GRANTED")
  return 1
}

fn main() {
  let button = new Button { clicks: 0, onClick: open }
  free(button)
  let msg = new Message { length: 8, body: 4194432 }
  let handler = button.onClick
  handler(1)
}
```
The message’s `body` lies where the button’s `onClick` was. The attacker chose the number 4194432, which is the address of `grantAdmin` in this program. Tick *Checks on* to run the same program with the course’s checks.
:::

The program never calls `grantAdmin`. The attacker did, by choosing which bytes the dangling pointer would find. That is **type confusion**: the code reads memory through a pointer of one type while the memory holds an object of another. Real exploits must also learn addresses (chapter 7’s randomisation exists to stop exactly this) and defeat other defences, but the core is the same, and it is why use-after-free bugs in browsers are treated as critical.

::museum{exhibit="chrome-2019"}

## How common is this?

::museum{exhibit="memory-safety-statistics"}

Those figures count vulnerabilities, not all bugs, and they come from very large C and C++ code bases; they do not say that every program is 70% memory errors. What they do say is that after decades of tools, training and review, the errors in this zoo remain the largest single class of serious security bugs in the software that most people run.

```quiz
q: "A server keeps a pointer to a connection object in a table. When the client disconnects, the connection is freed, but the table entry is not removed. Later, a new request object happens to be allocated at the same address, and the server sends data to the 'connection' through the table. Which error is this?"
options:
  - text: A leak
    why: "The connection was freed. The problem is the opposite: a pointer that outlived its object."
  - text: A use after free, and with a new type in the old block, type confusion
    correct: true
    why: "The table entry dangles. Once the block is reused by an object of another type, the server treats a request as a connection."
  - text: A double free
    why: "Nothing is freed twice here."
  - text: An overflow
    why: "Every access stays within the block; it is just the wrong block."
```

:::key
Manual memory management is a contract: use only what you asked for, stop when you free it, and free it exactly once. Each error breaks one clause: **overflows** and **over-reads** break the first, **use after free** the second, **double frees** and **leaks** the third. The allocator does not check, so the damage appears later and elsewhere; and when freed memory is reused by an object of another type, a dangling pointer becomes **type confusion**, which attackers can steer.
:::

:::whofrees
The programmer, at exactly the right moment, exactly once, for every object, on every path through the program, including the error paths and the early returns. The zoo is what happens when that fails, and the rest of the course is about tools and designs that need people to get it right less often.
:::

## What’s next

If the allocator does not check, could something else? The next chapter puts on the detectors’ goggles: guard pages, Valgrind, AddressSanitizer’s shadow memory, hardened allocators and memory tagging, each replaying this zoo, each catching a different subset at a different cost.
