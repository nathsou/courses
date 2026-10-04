/**
 * The spec court (chapter 29): functions that verify against a wrong specification. The reader calls witnesses
 * (a suspicious implementation that also verifies, or an ordinary caller that the contract rejects) and then
 * points at the faulty line.
 */
export interface Witness {
  kind: 'impl' | 'caller';
  label: string;
  /** impl: the replacement for the function's body (from its opening brace to the end). */
  body?: string;
  /** caller: a function appended to the code, which is the one verified. */
  caller?: { name: string; code: string };
  /** What it means when the witness behaves as expected (an impl verifies; a caller fails). */
  meaning: string;
}

export interface Case {
  id: string;
  title: string;
  story: string;
  code: string;
  /** The function whose body the witnesses replace (the last declaration in `code`). */
  fn: string;
  /** 1-based lines that are at fault. */
  fault: number[];
  witnesses: Witness[];
  verdict: string;
}

export const CASES: Case[] = [
  {
    id: 'search',
    title: 'Binary search',
    story: 'The binary search of chapter 18, with a shorter contract. It needs only the bounds as a loop invariant now.',
    fn: 'search',
    code: `pred sorted(a: [int]) {
  forall i, j :: 0 <= i < j < len(a) ==> a[i] <= a[j]
}

fn search(a: [int], key: int) -> int
  requires sorted(a)
  ensures 0 <= result ==> result < len(a) && a[result] == key
{
  var lo = 0
  var hi = len(a)
  while lo < hi
    invariant 0 <= lo <= hi <= len(a)
    decreases hi - lo
  {
    let mid = lo + (hi - lo) / 2
    if a[mid] < key {
      lo = mid + 1
    } else if key < a[mid] {
      hi = mid
    } else {
      return mid
    }
  }
  return -1
}`,
    fault: [7],
    witnesses: [
      {
        kind: 'caller',
        label: 'Try a caller that looks up a key it knows is present',
        caller: { name: 'lookup', code: `fn lookup(a: [int], key: int) -> int
  requires sorted(a) && key in a
  ensures result >= 0
{
  return search(a, key)
}` },
        meaning: 'Even when the key is in the array, a caller cannot conclude that search finds it.',
      },
      { kind: 'impl', label: 'Try an implementation that always returns −1', body: '{\n  return -1\n}', meaning: 'A search that never finds anything meets the contract.' },
    ],
    verdict: 'The postcondition says that a non-negative result is right, and nothing about −1: giving up always meets it. The missing clause is chapter 18’s `ensures result < 0 ==> key !in a`, and proving it needs that chapter’s two quantified invariants, which is why they could be dropped here.',
  },
  {
    id: 'withdraw',
    title: 'A frozen account',
    story: 'Withdrawals were verified for open accounts. Then a rule was added: from a frozen account, at most 100 may be withdrawn. The function still verifies.',
    fn: 'withdraw',
    code: `enum State { open, frozen, closed }

fn withdraw(state: State, balance: u64, amount: u64) -> u64
  requires state == open || state == frozen
  requires amount <= balance
  requires state == frozen && amount <= 100
  ensures result == balance - amount
{
  return balance - amount
}`,
    fault: [6],
    witnesses: [
      { kind: 'impl', label: 'Try an implementation that returns 0', body: '{\n  return 0\n}', meaning: 'An implementation that ignores its inputs meets the contract.' },
      {
        kind: 'caller',
        label: 'Try an ordinary withdrawal of 50 from an open account',
        caller: { name: 'pay', code: `fn pay(balance: u64) -> u64
  requires balance >= 50
{
  return withdraw(open, balance, 50)
}` },
        meaning: 'The contract does not allow an ordinary withdrawal from an open account.',
      },
    ],
    verdict: 'The new rule was written with `&&` where it needed `==>`. As written, it demands a frozen account, so open accounts, the common case, can no longer withdraw at all. The function verifies, and every caller with an open account fails. The rule meant `requires state == frozen ==> amount <= 100`.',
  },
  {
    id: 'fee',
    title: 'A fee that cannot be negative',
    story: 'A fee of 0.3% on a transfer, rounded down, now with a postcondition.',
    fn: 'fee',
    code: `fn fee(amount: u32) -> u32
  requires amount <= 100000000
  ensures result >= 0
{
  return amount * 30 / 10000
}`,
    fault: [3],
    witnesses: [
      {
        kind: 'caller',
        label: 'Try a caller that relies on the fee being small',
        caller: { name: 'net', code: `fn net(amount: u32) -> u32
  requires amount <= 100000000
{
  let f = fee(amount)
  return amount - f
}` },
        meaning: 'A caller cannot even subtract the fee from the amount: for all the contract says, the fee could exceed it.',
      },
      { kind: 'impl', label: 'Try an implementation that returns 0', body: '{\n  return 0\n}', meaning: 'A fee of nothing meets the contract.' },
    ],
    verdict: 'The result is an unsigned integer, so `result >= 0` is true of every value of its type: the postcondition says nothing. A useful one: `ensures result == amount * 30 / 10000`, or at least a bound such as `result <= amount / 100`.',
  },
  {
    id: 'transfer',
    title: 'A transfer that touches only two accounts',
    story: '`transfer` from chapter 16, with the contract slightly shortened.',
    fn: 'transfer',
    code: `fn transfer(inout bal: [u64], from: int, to: int, amount: u64)
  requires 0 <= from < len(bal) && 0 <= to < len(bal) && from != to
  requires bal[from] >= amount
  requires bal[to] <= 18446744073709551615 - amount
  ensures len(bal) == len(old(bal))
  ensures bal[from] == old(bal[from]) - amount
  ensures bal[to] == old(bal[to]) + amount
{
  bal[from] = bal[from] - amount
  bal[to] = bal[to] + amount
}`,
    fault: [5, 6, 7],
    witnesses: [
      {
        kind: 'impl',
        label: 'Try an implementation that also empties account 0',
        body: `{
  bal[from] = bal[from] - amount
  bal[to] = bal[to] + amount
  if from != 0 && to != 0 {
    bal[0] = 0
  }
}`,
        meaning: 'An implementation that wipes out another account meets the contract.',
      },
      {
        kind: 'caller',
        label: 'Try a caller that moves money twice, between different accounts',
        caller: { name: 'two', code: `fn two(inout bal: [u64])
  requires len(bal) == 4 && bal[0] == 10 && bal[1] == 0 && bal[2] == 10 && bal[3] == 0
  ensures bal[1] == 5 && bal[3] == 5
{
  transfer(bal, 0, 1, 5)
  transfer(bal, 2, 3, 5)
}` },
        meaning: 'After the second transfer, the caller cannot tell that the first one’s result survived.',
      },
    ],
    verdict: 'The postconditions say what happens to the two accounts involved and nothing about the others. The missing frame condition: `ensures forall k :: 0 <= k < len(bal) && k != from && k != to ==> bal[k] == old(bal[k])`.',
  },
];

/** The code a witness runs on, and the function to verify in it. */
export function witnessCode(c: Case, w: Witness): { code: string; fn: string } {
  if (w.caller) return { code: `${c.code}\n\n${w.caller.code}`, fn: w.caller.name };
  return { code: withBody(c, w.body!), fn: c.fn };
}

/** The code with the function's body replaced. */
export function withBody(c: Case, body: string): string {
  const lines = c.code.split('\n');
  const sig = lines.findIndex((l) => l.startsWith(`fn ${c.fn}(`));
  const open = lines.findIndex((l, i) => i > sig && l === '{');
  return [...lines.slice(0, open), body].join('\n');
}
