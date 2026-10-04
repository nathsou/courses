---
number: E
title: Rosetta
summary: 'The same small examples in Vouch and in the languages of real tools: Dafny, ACSL for Frama-C, Viper, TLA+, Alloy and SMT-LIB. A starting point for moving from the course to the field.'
---

Vouch was designed to be close to the languages of real tools, so that what you write in the course transfers. This appendix shows the same small examples in Vouch and in six of those languages. Each section names the tool that checks the code and the chapter whose ideas it uses. The Vouch and SMT-LIB versions are checked by the course's test suite (the SMT-LIB ones with Z3 as well); the others are written to each tool's documented syntax but are not run here, so treat them as starting points and check them with the tool itself.

The examples:

1. **max**, a function with a contract (chapter 16);
2. **find**, a linear search with a loop invariant (chapter 18);
3. **swap**, two heap cells exchanged (chapter 21);
4. **Die Hard**, the water-jug puzzle as a system whose invariant fails, so that the counterexample is the solution (chapter 1);
5. **a file system**, a relational model with a property that fails (chapter 9).

## Vouch

```vouch
fn max(x: int, y: int) -> int
  ensures result >= x && result >= y
  ensures result == x || result == y
{
  if x >= y {
    return x
  }
  return y
}

fn find(a: [int], key: int) -> int
  ensures 0 <= result ==> result < len(a) && a[result] == key
  ensures result < 0 ==> forall k :: 0 <= k < len(a) ==> a[k] != key
{
  var i = 0
  while i < len(a)
    invariant 0 <= i <= len(a)
    invariant forall k :: 0 <= k < i ==> a[k] != key
    decreases len(a) - i
  {
    if a[i] == key {
      return i
    }
    i = i + 1
  }
  return -1
}

class Cell {
  val: int
}

fn swap(x: ref Cell, y: ref Cell, ghost a: int, ghost b: int)
  requires x.val |-> a ** y.val |-> b
  ensures x.val |-> b ** y.val |-> a
{
  let t = x.val
  x.val = y.val
  y.val = t
}
```

```vouch
system DieHard {
  var small: 0..=3 = 0
  var big: 0..=5 = 0

  action fill_small { small = 3 }
  action fill_big { big = 5 }
  action empty_small { small = 0 }
  action empty_big { big = 0 }
  action small_to_big {
    let pour = min(small, 5 - big)
    small, big = small - pour, big + pour
  }
  action big_to_small {
    let pour = min(big, 3 - small)
    small, big = small + pour, big - pour
  }

  invariant not_four: big != 4
}
```

```vouch
world FileSystem {
  type Dir, File
  rel parent: Dir -> lone Dir
  rel contents: Dir -> set File
  rel root: Dir

  fact one_root: one root
  fact root_has_no_parent: no root.parent
  fact every_file_somewhere: forall f: File :: some { d: Dir | f in d.contents }

  check no_dir_contains_itself: forall d: Dir :: d !in d.^parent for 3
}
```

The explorer finds the run that puts 4 gallons in the big jug; the model finder finds two directories that are each other's parent, which the facts do not forbid.

## Dafny

Dafny (chapters 16–20) is the closest relative of Vouch: contracts, invariants, ghost code and lemmas, checked through Boogie and Z3.:cite[leino2010] Methods return values through named results; `:=` assigns; arrays are objects with a `Length`. For objects on the heap, Dafny uses *dynamic frames*: a method says which objects it `modifies`, instead of separation logic's ownership.

```dafny
method Max(x: int, y: int) returns (m: int)
  ensures m >= x && m >= y
  ensures m == x || m == y
{
  if x >= y { m := x; } else { m := y; }
}

method Find(a: array<int>, key: int) returns (r: int)
  ensures 0 <= r ==> r < a.Length && a[r] == key
  ensures r < 0 ==> forall k :: 0 <= k < a.Length ==> a[k] != key
{
  var i := 0;
  while i < a.Length
    invariant 0 <= i <= a.Length
    invariant forall k :: 0 <= k < i ==> a[k] != key
    decreases a.Length - i
  {
    if a[i] == key { return i; }
    i := i + 1;
  }
  return -1;
}

class Cell {
  var val: int
}

method Swap(x: Cell, y: Cell)
  modifies x, y
  ensures x.val == old(y.val) && y.val == old(x.val)
{
  var t := x.val;
  x.val := y.val;
  y.val := t;
}
```

`Swap` does not need `x` and `y` to be different objects: if they are the same, the postcondition still holds. The Vouch version, with `**`, requires them to be separate.

## ACSL

ACSL is the specification language of Frama-C for C programs (chapters 16 and 26).:cite[kirchner2015] Specifications are comments starting with `@`. Because C has pointers and machine integers, the contracts say more: which memory is valid to read or write (`\valid`), what a function may change (`assigns`), and quantifiers range over mathematical `integer`s.

```c
/*@ ensures \result >= x && \result >= y;
    ensures \result == x || \result == y;
    assigns \nothing;
*/
int max(int x, int y) {
  return x >= y ? x : y;
}

/*@ requires n >= 0 && \valid_read(a + (0 .. n - 1));
    assigns \nothing;
    ensures 0 <= \result ==> \result < n && a[\result] == key;
    ensures \result < 0 ==> \forall integer k; 0 <= k < n ==> a[k] != key;
*/
int find(const int *a, int n, int key) {
  /*@ loop invariant 0 <= i <= n;
      loop invariant \forall integer k; 0 <= k < i ==> a[k] != key;
      loop assigns i;
      loop variant n - i;
  */
  for (int i = 0; i < n; i++)
    if (a[i] == key) return i;
  return -1;
}

/*@ requires \valid(x) && \valid(y);
    assigns *x, *y;
    ensures *x == \old(*y) && *y == \old(*x);
*/
void swap(int *x, int *y) {
  int t = *x;
  *x = *y;
  *y = t;
}
```

The WP plug-in proves these contracts; the Eva plug-in, an abstract interpreter, would check the same code for run-time errors without them.

## Viper

Viper is an intermediate language for permission-based verification (chapters 21–22).:cite[muller2016] `acc(x.val)` is the permission to access a field, and `&&` between permissions behaves like Vouch's `**`: holding full permission to both `x.val` and `y.val` implies that `x` and `y` are different. Front ends such as Prusti translate Rust into Viper.:cite[astrauskas2019]

```viper
field val: Int

method max(x: Int, y: Int) returns (m: Int)
  ensures m >= x && m >= y
  ensures m == x || m == y
{
  if (x >= y) { m := x } else { m := y }
}

method swap(x: Ref, y: Ref)
  requires acc(x.val) && acc(y.val)
  ensures acc(x.val) && acc(y.val)
  ensures x.val == old(y.val) && y.val == old(x.val)
{
  var t: Int := x.val
  x.val := y.val
  y.val := t
}
```

## TLA+

TLA+ describes systems as an initial-state predicate and a next-state relation, in which a primed variable is the value after a step (chapters 1–4).:cite[lamport1994,lamport2002] The TLC model checker explores every state; an invariant is listed in its configuration file (`INVARIANT NotFour`), and TLC reports the run that breaks it.:cite[yu1999]

```tla
---------------------------- MODULE DieHard ----------------------------
EXTENDS Naturals
VARIABLES small, big

Init == small = 0 /\ big = 0

Min(m, n) == IF m < n THEN m ELSE n

FillSmall  == small' = 3 /\ big' = big
FillBig    == big' = 5 /\ small' = small
EmptySmall == small' = 0 /\ big' = big
EmptyBig   == big' = 0 /\ small' = small
SmallToBig == LET pour == Min(small, 5 - big)
              IN  small' = small - pour /\ big' = big + pour
BigToSmall == LET pour == Min(big, 3 - small)
              IN  small' = small + pour /\ big' = big - pour

Next == FillSmall \/ FillBig \/ EmptySmall \/ EmptyBig \/ SmallToBig \/ BigToSmall
Spec == Init /\ [][Next]_<<small, big>>

NotFour == big # 4
=============================================================================
```

Each Vouch `action` is one disjunct of `Next`. TLA+ makes the frame explicit: an action must say that the variables it does not change keep their values (`big' = big`).

## Alloy

Alloy (chapter 9) describes structures with signatures and relations, and checks assertions up to a scope with a SAT solver.:cite[jackson2006] A Vouch `world` is a small Alloy model.

```alloy
sig File {}
sig Dir {
  parent: lone Dir,
  contents: set File
}
one sig Root extends Dir {}

fact { no Root.parent }
fact { all f: File | some d: Dir | f in d.contents }

assert NoDirContainsItself { all d: Dir | d not in d.^parent }
check NoDirContainsItself for 3
```

Alloy finds the same counterexample as Vouch: a cycle of directories, disconnected from the root. Adding `fact { all d: Dir - Root | Root in d.^parent }` (every directory hangs below the root) removes it.

## SMT-LIB

SMT-LIB is the common input language of SMT solvers (chapters 12–14). A program verifier ends here: each proof obligation becomes a formula, negated, and the solver is asked whether it is satisfiable. Here is the obligation for `max`, written by hand. `unsat` means that no input breaks the contract.

```smt
(declare-const x Int)
(declare-const y Int)
(define-fun m () Int (ite (>= x y) x y))
; Is there an input for which the postcondition fails?
(assert (not (and (>= m x) (>= m y) (or (= m x) (= m y)))))
(check-sat)
```

And the overflow of chapter 0's binary search, with 32-bit bit-vectors: two valid, non-negative indices whose sum is negative. `sat`, and the model is the counterexample.

```smt
(declare-const lo (_ BitVec 32))
(declare-const hi (_ BitVec 32))
(assert (bvsle #x00000000 lo))
(assert (bvsle lo hi))
(assert (bvslt (bvadd lo hi) #x00000000))
(check-sat)
(get-model)
```
