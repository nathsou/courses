---
number: 28
title: 'Capstone: the verified Ledger'
summary: 'The Ledger, assembled in three layers in the style of IronFleet: a specification, a protocol that refines it, and an implementation whose step handlers carry out the protocol''s steps. Each layer is checked by the engine that suits it. Then: switches that break one layer at a time, to see which check catches each bug, and a bug that every layer''s check misses because it lives between two layers.'
duration: About 1 hour 15 minutes
---

The Ledger has appeared throughout the course in pieces. Chapter 2 lost an update between two concurrent deposits. Chapter 4 sent transfers across shards and checked that the protocol refines a specification. Chapter 16 gave `transfer` a contract with overflow-safe 64-bit balances, chapter 19 proved that it conserves money, chapter 22 freed the journal's entries, and chapter 26 bounded the fee arithmetic. Each piece was verified. This chapter puts the pieces together and asks what the whole has been shown to do.

## Three layers

The method comes from **IronFleet**, by Chris Hawblitzel, Jon Howell, Manos Kapritsos, Jacob Lorch, Bryan Parno, Michael Roberts, Srinath Setty and Brian Zill at Microsoft Research (2015). They built two distributed systems, a replicated state machine library based on Paxos and a sharded key-value store, and proved that the implementations meet short, centralised specifications, for safety and for liveness. The proof is structured in three layers, each a state machine, and each shown to refine the one above it:

1. a **high-level specification**: what the whole system must do, written as if it ran on one machine;
2. a **distributed protocol**: hosts exchanging messages over a network that may drop, delay and duplicate them, with abstract state (sets, integers without bounds), proved to refine the specification;
3. an **implementation**: the imperative code each host runs, with bounded integers, arrays and byte-level messages, proved to refine the protocol.:cite[hawblitzel2015]

Their tool was Dafny, which checks proofs with the Z3 SMT solver. The specification layer for the replicated state machine library is 85 lines; developing the method and both systems took about 3.7 person-years.:cite[hawblitzel2015]

The Ledger below follows the same plan at a much smaller size.

**The specification.** Three accounts hold four coins between them. A transfer moves one to three coins from an account that has them. Two invariants: money is conserved, and no balance goes negative. The explorer checks both in every reachable state.

```vouch
system Ledger {
  var bal: [int] = [2, 1, 1]

  action transfer(a: 0..3, b: 0..3, n: 1..4) when bal[a] >= n {
    bal[a] = bal[a] - n
    bal[b] = bal[b] + n
  }

  invariant conserved: sum([bal[a] | a in 0..3]) == 4
  invariant solvent: forall a: 0..3 :: bal[a] >= 0
}
```

**The protocol.** Accounts 0 and 1 live on one shard and account 2 on another. A transfer within a shard is a local step. Across shards, the sender's shard debits the account and sends a credit, which is delivered later. Between the two, money is *in flight*: it has left one account and not reached the other.

```vouch
system Shards {
  var bal: [int] = [2, 1, 1]
  var inflight: [int] = [0, 0, 0]

  action local(a: 0..3, b: 0..3, n: 1..4) when (a < 2) == (b < 2) && bal[a] >= n {
    bal[a] = bal[a] - n
    bal[b] = bal[b] + n
  }
  action send(a: 0..3, b: 0..3, n: 1..4) when (a < 2) != (b < 2) && bal[a] >= n {
    bal[a] = bal[a] - n
    inflight[b] = inflight[b] + n
  }
  action deliver(b: 0..3) when inflight[b] > 0 {
    bal[b] = bal[b] + inflight[b]
    inflight[b] = 0
  }

  refines Ledger via { bal = [bal[a] + inflight[a] | a in 0..3] }
}
```

The **refinement mapping** in the last line says what the protocol's state means: money in flight already belongs to its recipient. Under that reading, `send` is a specification transfer (the sender loses the coins, the recipient gains them), and `deliver` changes nothing the specification can see, so it is a stuttering step. Chapter 4's refinement checker confirms that every reachable step of the protocol is a step of the specification or a stutter. IronFleet's protocol-to-specification proof has the same shape: a function from protocol states to specification states, and a proof that each protocol step corresponds to a legal sequence of specification steps.:cite[hawblitzel2015] One consequence is worth stating: every property of the specification, conservation included, holds of the protocol *as seen through the mapping*, with no further proof.

**The implementation.** Balances are 64-bit unsigned integers in one array. `transfer`, `debit` and `credit` have contracts in the style of chapter 16 and are proved by the program verifier. `fee` is chapter 26's fee, checked by interval analysis. `undo` removes the latest entry from chapter 22's journal, checked by the separation-logic verifier.

**The step handlers.** One piece connects the implementation to the protocol: the code that carries out each protocol step by calling the implementation's functions. In IronFleet this is the host's step function, and the theorem connecting the layers says, for each step, that if the implementation's state before corresponds to a protocol state, then the state after corresponds to the protocol state that one protocol step produces.:cite[hawblitzel2015] The Ledger's version is a contract per handler: the protocol step's guard as the precondition, and its effect on the balances as the postcondition.

```vouch
fn on_local(inout bal: [u64], a: int, b: int, n: u64)
  requires 0 <= a < len(bal) && 0 <= b < len(bal) && n >= 1
  requires (a < 2) == (b < 2) && bal[a] >= n
  requires bal[b] <= MAX - n
  ensures len(bal) == len(old(bal))
  ensures forall k :: 0 <= k < len(bal) ==> bal[k] == old(bal[k]) - (if k == a { n } else { 0 }) + (if k == b { n } else { 0 })
{
  transfer(bal, a, b, n)
}
```

The dashboard below runs every check: the explorer on the specification, the refinement checker on the protocol, three engines on the implementation. Open a check for its engine, badge and certificate, and open a layer's code to read it. Everything is green. Before reading on, press **Check the step handlers**.

::ledger-dashboard{title="The Ledger"}

## The bug between the layers

`on_local` fails, and the counterexample has `a` equal to `b`: a transfer from an account to itself.

Each layer, on its own terms, is right. The specification allows a transfer to oneself, and it changes nothing: the account loses n coins and gains them back. The protocol allows it too, as a local step, since an account is on the same shard as itself. `transfer` requires `from != to`, and under that precondition it meets its contract. The precondition is not decoration. Look at the body: it reads both balances, then writes both.

```vouch
let f = bal[from]
let t = bal[to]
bal[from] = f - amount
bal[to] = t + amount
```

With `from` and `to` both 0 and balances [2, 1, 1], f and t are both 2; the first write stores 1, the second stores 3. The bank now holds five coins. The verifier found the problem as a call that breaks `transfer`'s precondition, and the interpreter replays it, because Vouch checks contracts when it runs. A compiled program that drops its contracts at run time, as most do, would simply mint the coin.

No check of a single layer could have found this. The specification check, the refinement check and `transfer`'s proof each looked at their own layer and were right. The bug is in what one layer assumes of the next: `transfer` assumes it is never asked for a self-transfer, and nothing above it promised that. Fix it in the handler, the code that owns the decision.

```verify
id: the-verified-ledger/self-transfer
title: Close the gap
prompt: |
  The handler `on_local` must carry out the protocol's local step for every input the protocol allows, a transfer from an account to itself included. Change its body so that it verifies. `transfer` and the handler's contract are locked.
starter: |
  const MAX: u64 = 18446744073709551615

  fn transfer(inout bal: [u64], from: int, to: int, amount: u64)
    requires 0 <= from < len(bal) && 0 <= to < len(bal) && from != to
    requires bal[from] >= amount
    requires bal[to] <= MAX - amount
    ensures len(bal) == len(old(bal))
    ensures bal[from] == old(bal[from]) - amount
    ensures bal[to] == old(bal[to]) + amount
    ensures forall k :: 0 <= k < len(bal) && k != from && k != to ==> bal[k] == old(bal[k])
  {
    let f = bal[from]
    let t = bal[to]
    bal[from] = f - amount
    bal[to] = t + amount
  }

  fn on_local(inout bal: [u64], a: int, b: int, n: u64)
    requires 0 <= a < len(bal) && 0 <= b < len(bal) && n >= 1
    requires (a < 2) == (b < 2) && bal[a] >= n
    requires bal[b] <= MAX - n
    ensures len(bal) == len(old(bal))
    ensures forall k :: 0 <= k < len(bal) ==> bal[k] == old(bal[k]) - (if k == a { n } else { 0 }) + (if k == b { n } else { 0 })
  {
    transfer(bal, a, b, n)
  }
locked: [[1, 23]]
solution: |
  {
    if a != b {
      transfer(bal, a, b, n)
    }
  }
hints:
  - What should a transfer from an account to itself do to the balances, according to the handler's postcondition?
  - Nothing. So the handler can do nothing in that case, and call `transfer` only when the accounts differ.
success: 'A self-transfer now does nothing, which is what the specification says it does, and every other transfer goes through `transfer` as before. The alternative fix is one layer up: add `a != b` to the protocol''s `local` step (and so to the handler''s precondition). The protocol would then do less than the specification allows, which refinement permits. Either way, the decision is made once, and the layers agree on it.'
lines: 30
```

Tick the fix in the dashboard and every check, handlers included, passes.

## Break it

The switches in the dashboard inject one bug at a time. Each is a small edit to one layer's code (open the layer's code to see it). Try each one before reading what happens.

- **An overdraft in the specification** breaks `solvent`, and the explorer finds the step. The refinement check still passes: the protocol was not changed, and it still does nothing the specification forbids. Refinement checks that the lower layer does no more than the upper one allows; a specification that allows too much is invisible to it.
- **A credit delivered twice**, and **a credit lost by the network**, both break the refinement: the specification sees money appear from nowhere, or vanish. The duplicate is not hypothetical. One of the verified systems studied by Pedro Fonseca and colleagues, Chapar, applied updates received twice, because the algorithm it implemented assumed a reliable network and the unverified code that received packets did not discard duplicates.:cite[fonseca2017]
- **transfer without its overflow precondition** fails its own proof: the verifier finds balances near 2⁶⁴ − 1 that overflow.
- **fee without its limit** fails the interval analysis, and triage confirms the overflow with an input the interpreter replays.
- **undo without the free** fails the separation-logic check: the entry leaks.
- **credit rounds down, with a weaker contract.** The code now credits the amount rounded down to a whole hundred, and someone weakened `credit`'s postcondition to "the balance does not decrease" to make it verify. `credit` meets its new contract. The specification and protocol are untouched. Only `on_deliver` fails, because the protocol needs the recipient to receive exactly the amount, and the weakened contract no longer promises it. Stop checking the handlers and nothing fails at all.
- **Ten times the fee** is caught by nothing. The fee's only check is that its arithmetic cannot overflow, and that is still true. No specification says what the fee should be, so no tool can find that it is wrong.

The last two switches make the same point from two sides. A check proves code against a contract, and a contract is only as useful as what relies on it. A weakened contract is caught only where a layer above relies on what it used to say; a fee with no contract at all is caught nowhere.

```quiz
q: 'A team proves that each module of its system meets its contract, and that the protocol refines the specification. What else is needed before the implementation can be said to meet the specification?'
options:
  - text: Nothing; each layer is verified.
    why: 'The Ledger had exactly this, and a self-transfer still minted a coin. Verified layers compose only when the contracts at each boundary match what the layer above needs.'
  - text: A proof that the code carrying out each protocol step does what that step says, under the step's guard.
    correct: true
    why: 'That is the connecting theorem. It is where `on_local` failed: the protocol allowed an input that `transfer`''s precondition excluded.'
  - text: More tests of the implementation.
    why: 'Tests might find the self-transfer, if someone thought to try it. Checking the handlers against the protocol finds it for certain.'
```

## What the composition proves

With the handlers checked and fixed, every check passes. Put together: every run of the step handlers, called as the protocol allows, changes the balances as a run of the protocol does; every run of the protocol, through the mapping, is a run of the specification; and in every run of the specification money is conserved and no balance is negative. That chain rests on assumptions, and the dashboard's results are only as good as these:

- **A1. The mapping.** Money in flight counts as its recipient's. The checker confirms the refinement under this mapping; whether the mapping says what the bank means is a judgement no checker makes.
- **A2. The instance.** Three accounts, four coins, transfers of one to three coins, two shards. The explorer's results are exhaustive for this instance and say nothing about a larger one. Chapter 25's method for every size does not apply directly: `conserved` adds up balances, and counting is outside its decidable fragment.
- **A3. The transcription.** The handlers' contracts restate the protocol's steps by hand, in another vocabulary: array indices for accounts, `u64` for integers, `a < 2` for "on the first shard". A mistake in that restatement would go unnoticed. IronFleet avoids this gap by writing every layer in one language, so that the implementation is checked against the very protocol that was proved.:cite[hawblitzel2015]
- **A4. No balance near 2⁶⁴ − 1.** The handlers require it. It follows from conservation if the bank's total money stays below 2⁶⁴, but that argument is made here in words, not checked.
- **A5. The event loop and the network.** Something must receive requests, call a handler only when its step's guard holds, one step at a time, and deliver each credit exactly once. None of that is modelled. IronFleet trusts a short main event loop too, and justifies the one-step-at-a-time view with a separate reduction argument.:cite[hawblitzel2015]
- **A6. The fee and the journal.** They are checked for run-time and memory safety only. Nothing says what the fee should be, and nothing connects the journal to the balances.
- **A7. The tools.** The parser, type checker, explorer, refinement checker, program verifier, abstract interpreter and separation-logic verifier are trusted. The SMT proofs are re-checked by the certificate checker, and counterexamples are replayed by the interpreter.

IronFleet's assumptions are of the same kinds: the specifications and the main event loop are trusted, as are Dafny, the .NET compiler and runtime, the operating system and the hardware; the network may drop, delay or duplicate packets but is assumed not to tamper with them.:cite[hawblitzel2015] In 2017, Fonseca and colleagues tested three verified distributed systems, IronFleet among them, and found sixteen bugs. None was in the verified protocol code. The bugs were in the specifications, in the verification tools, and above all in the unverified code at the boundary between the verified components and the rest of the system. They found no such boundary bugs in IronFleet, the system with the fewest unverified components.:cite[fonseca2017] The handlers of this chapter are that boundary, made small enough to check.

:::history
**Verified distributed systems.** 2015 brought two frameworks for verifying the implementations of distributed systems, not only their protocols: IronFleet, in Dafny, and Verdi, by James Wilcox and colleagues at the University of Washington, in the Coq proof assistant.:cite[hawblitzel2015,wilcox2015] Both kept a thin layer of unverified code between the verified core and the operating system. Fonseca and colleagues' study, two years later, looked for bugs exactly where the guarantees stopped, and found them there.:cite[fonseca2017] [Chapter 29](/chapters/what-did-we-prove/) takes the question further, to compilers and operating system kernels.
:::

:::hood
**The course's Ledger.** `src/lib/fv/ledger/ledger.ts` holds the four documents, the eleven checks and the switches; each switch is a text patch, and a test checks that each one is caught by exactly the checks this chapter says. The checks run in a Web Worker (`worker.ts`): the specification and the protocol go to `verifyDocument`, which uses the explorer and the refinement checker; the functions go to the program verifier or, for heap code, to the separation-logic verifier; the fee goes to the interval analysis and triage of chapter 26.
:::

:::proved
**What did we prove?** With the fix: for the three-account instance, every run of the step handlers, called as the protocol allows, keeps money conserved and every balance non-negative, under assumptions A1–A7 above. Separately, for all inputs: `fee` cannot overflow and `undo` is memory-safe. The re-enactment of IronFleet is much simpler than IronFleet: no liveness, no network messages as bytes, no hosts running concurrently.
:::

## What comes next

A7 lists the tools as trusted, and A3 a hand-written restatement. [Chapter 29](/chapters/what-did-we-prove/) maps everything a verified result trusts, from the parser to the hardware, and looks at what was found when people tested verified systems, compilers and kernels.

## Further reading

- The IronFleet paper explains the three layers, the reduction argument and the liveness proofs, with the cost in person-years.:cite[hawblitzel2015]
- Fonseca and colleagues' study classifies the bugs they found in verified distributed systems, and describes the testing toolkit they built to find more.:cite[fonseca2017]
- The Verdi paper presents the other approach of 2015, in Coq, with network semantics that can be swapped.:cite[wilcox2015]
