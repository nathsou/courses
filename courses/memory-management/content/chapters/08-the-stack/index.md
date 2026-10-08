---
title: The stack
summary: Allocation by moving one register. Frames, overflows, and the pointer that outlived its frame.
number: 8
duration: 45 minutes
prerequisites: [anatomy-of-an-address-space]
---

Most of the memory a program uses is never allocated with `malloc` or `new` at all. Every time a function is called, it needs room for its local variables, its temporaries and the address to return to, and every time it returns, that room is no longer needed. The program gets that memory from the **stack**, and both allocating and freeing it cost a single subtraction or addition to one register.

The stack is the fastest allocator in the machine, and the oldest. It is also a perfect illustration of the central bargain of memory management: it is fast because it knows exactly when every piece of memory dies, and it is dangerous for exactly the same reason.

## Last in, first out

Function calls nest. If `main` calls `f` and `f` calls `g`, then `g` returns before `f` does, and `f` before `main`. Whatever memory `g` needed can be released before `f`’s, and `f`’s before `main`’s. Allocations and frees come in strict last-in-first-out order, which is the one order that needs no bookkeeping at all.

So each thread gets one contiguous region and a **stack pointer** marking how much of it is in use. On RISC-V and most other machines the stack grows *downwards*, from high addresses to low. Calling a function moves the stack pointer down by the size of the function’s **frame**, and that is the whole of the allocation. Returning moves it back up, and that is the whole of the free. There is no free list, no header, no search, and no fragmentation: the free memory is always one contiguous block below the stack pointer.

A frame holds what the function needs while it runs: the **return address** (where in the caller to continue), usually the caller’s frame pointer, the function’s local variables, and temporary values the compiler could not keep in registers. The compiler knows every frame’s size and layout in advance, because it knows every local variable.

Step through the course’s VM below. Its frames live in a simulated stack, laid out as real words, exactly as described. Watch the stack pointer as `fact` calls itself.

:::stack-stepper{stack=2048 title="Frames on the stack" n="8.1"}
```mote
fn fact(n: int) -> int {
  if n <= 1 {
    return 1
  }
  let rest = fact(n - 1)
  return n * rest
}

fn main() {
  let x = fact(5)
  print(x)
}
```
Each frame starts with a return address and the caller’s frame address, then the function’s locals, then its temporaries (the VM is a stack machine, so intermediate values live on the stack, where a garbage collector will be able to find them in chapter 24). Highlighted words just changed.
:::

When `fact(1)` returns, its frame is not erased. The words are still there, below the stack pointer, until the next call overwrites them. Freeing a frame does nothing to the memory at all: it just declares it unused. Remember that; it is the root of this chapter’s bug.

:::bridge{course=compiler-backends chapter=frames title="SSA to Silicon, chapter 15: Stack frames"}
Shows how a real compiler lays out a frame after register allocation: spill slots, saved registers, alignment, and the prologue and epilogue that move the stack pointer.
:::

## Running out

The stack is a fixed region (8 MiB is a common default for a main thread on Linux; threads often get less), and the guard page from chapter 7 sits below it. A function that recurses without end keeps pushing frames until one lands on the guard page, the access faults, and the kernel kills the program with a segmentation fault. That is what “stack overflow” means.

```predict
q: The figure below has a stack of only 1 KiB. Each `fact` frame here takes 48 bytes: six words. Roughly how deep can the recursion go before the program crashes?
options:
  - text: About 5
    why: Too pessimistic. 1 KiB is 1024 bytes.
  - text: About 20
    correct: true
    why: "1024 / 48 is just over 21, and the start-up and main frames take a little of that. Run it and see where it stops."
  - text: About 1,000
    why: That would need frames of about one byte each.
```

:::stack-stepper{stack=1024 title="One frame too many" n="8.2"}
```mote
fn fact(n: int) -> int {
  if n <= 1 {
    return 1
  }
  let rest = fact(n - 1)
  return n * rest
}

fn main() {
  print(fact(40))
}
```
The same function, asked to recurse forty times in a 1 KiB stack. Press “Run to the end”.
:::

Real stacks are thousands of times larger, but so are real programs’ recursions: a recursive descent parser fed a deeply nested input, or a recursive tree walk over a degenerate tree that is really a long list, overflows the same way. Chapter 18 shows a reference-counting runtime overflowing its stack while *freeing* a long list, one recursive call per node.

## The pointer that outlived its frame

In C you can take the address of a local variable. Nothing stops you from returning it:

```c
int *make_counter(void) {
    int count = 0;
    return &count;          // the address of a local
}

int main(void) {
    int *c = make_counter();
    *c = 1;                 // writes into a frame that no longer exists
    printf("%d\n", other_function(*c));
}
```

When `make_counter` returns, its frame is popped. `c` still holds the address where `count` used to be, which is now below the stack pointer, in memory that the next call will reuse for its own frame. Writing through `c` corrupts whatever `other_function` keeps there; reading through it returns whatever `other_function` left. The program may work in testing and fail in production, or work with one compiler and fail with another. This is a **dangling pointer**, and it is the stack’s version of the use-after-free that Part IV is about. Compilers warn about the obvious case above; they cannot catch every case in which a pointer to a local escapes.

The stack can be this fast only because it assumes no pointer to a frame outlives the frame. Languages that cannot guarantee that assumption, because closures capture variables or objects escape their function, must allocate those variables somewhere else: on the heap, where they need a different way of being freed. Chapter 17 shows how Rust proves the assumption at compile time (its borrow checker rejects the code above), and how Go and Java’s compilers use **escape analysis** to put an object on the stack when they can prove it does not escape.

The obvious case is easy to spot. Here is a less obvious one, of the kind compilers miss.

```debug
id: the-stack/escape
title: The parser that remembered too much
prompt: "This C program (the `#include` lines are left out) prints `1`, as expected, most of the time. Click the line that lets a pointer to a stack frame outlive the frame."
lang: c
code: |
  struct parser { const char *input; int *depth; };

  void init(struct parser *p, const char *text, int *depth) {
      p->input = text;
      p->depth = depth;
  }

  struct parser *new_parser(const char *text) {
      struct parser *p = malloc(sizeof *p);
      int depth = 0;
      init(p, text, &depth);
      return p;
  }

  void open_bracket(struct parser *p) {
      *p->depth += 1;
  }

  int main(void) {
      struct parser *p = new_parser("((()))");
      open_bracket(p);
      printf("%d\n", *p->depth);
      free(p);
  }
answer:
  line: 11
notes:
  "4": "A string literal lives for the whole run of the program, so keeping a pointer to it is safe."
  "5": "`init` stores whatever pointer it is given. That is fine when the pointer lives at least as long as the parser: the problem is what it is given, and by whom."
  "9": "The parser is on the heap, so it outlives `new_parser`: returning it is fine."
  "10": "A local variable is fine on its own. What matters is where its address goes."
  "12": "Returning `p`, a pointer to the heap, is fine."
  "16": "This is where the program writes through the dangling pointer, so it is where things break. But the pointer was dangling already: where was it created?"
  "22": "This reads through the dangling pointer. But it was dangling already: where was it created?"
  "20": "A string literal lives for the whole run of the program."
hints:
  - "Which variables live in `new_parser`’s frame, and which of their addresses leave it?"
explain: "Line 11 passes the address of `depth`, a local of `new_parser`, to `init`, which stores it in a parser on the heap. The parser outlives the call; `depth` dies when `new_parser` returns. When we compiled this with GCC 13 at `-O0`, there was no warning, and the program printed `1` anyway, because nothing had reused that stack slot yet. With `-O2`, the only warning was that `depth` was used uninitialised: a symptom, pointing at line 16, not at the cause. AddressSanitizer, with its stack-use-after-return check switched on, reported a stack use after return in `open_bracket` (chapter 16). The fix is to give the counter the parser’s lifetime: make `depth` an `int` field of the struct, not a pointer."
```

:::programmer
Every local variable in Java, Go, Python or JavaScript also lives in a stack frame. What you cannot do in those languages is take its address: you can only copy its value. That restriction is exactly what makes stack allocation safe.
:::

## Smashing the stack

A frame keeps the return address right next to the function’s local variables. A local array that is written past its end can therefore overwrite the return address, and when the function returns, it jumps wherever the overwritten value says. If the program copies attacker-controlled input into that array without checking its length, the attacker chooses where the program goes.

::museum{exhibit="morris-1988"}

The technique was explained step by step in 1996 in an article with a memorable title, *Smashing the Stack for Fun and Profit* :cite[aleph1996], and stack overflows were for years the most common kind of exploit. Three defences followed, and modern systems use all of them:

- **Stack canaries**: the compiler places a random value between the locals and the return address and checks it before returning. An overflow that reaches the return address must first overwrite the canary, and the check catches it. The idea, named after the birds that miners carried to detect gas, was introduced by StackGuard in 1998 :cite[cowan1998].
- **Non-executable stacks**: the stack’s pages are mapped without execute permission (X = 0 in chapter 3’s page-table entry), so code injected onto the stack cannot run.
- **Address randomisation**, from chapter 7, so that an attacker does not know where to jump.

Attackers adapted (instead of injecting code, they reuse snippets of code that is already executable), and the arms race moved on. The underlying bug, writing past the end of a buffer, is still there, and Part IV is about it.

:::whofrees
The function’s return frees its frame, by moving the stack pointer. No call to `free`, no check, no delay: the frame is dead the moment the function returns, and the compiler knows this statically. Every other memory manager in the course would like to be this cheap; none can be, because their objects do not die in last-in-first-out order.
:::

## What’s next

The stack serves one thread’s function calls. The kernel has its own, very different, allocation problems: handing out physical frames in sizes from one page to many, and allocating its own small objects thousands of times a second. The next chapter opens the kernel’s allocators.
