/** The zoo's programs (chapters 15 and 16): each breaks one clause of malloc's contract. */
export interface ZooProgram {
  id: string;
  title: string;
  /** The kind of error a detector must report to catch it. */
  error: 'use-after-free' | 'double-free' | 'overflow' | 'leak';
  src: string;
}

export const ZOO: ZooProgram[] = [
  { id: 'uaf', title: 'Use after free', error: 'use-after-free', src: "struct Account { owner: int, balance: int }\n\nfn main() {\n  let a = new Account { owner: 7, balance: 100 }\n  free(a)\n  print(\"a.balance after free:\", a.balance)\n  let b = new Account { owner: 9, balance: 5000 }\n  print(\"a.balance now:\", a.balance)\n  a.balance = 0\n  print(\"b.balance now:\", b.balance)\n}" },
  { id: 'double', title: 'Double free', error: 'double-free', src: "struct Session { user: int, admin: bool }\n\nfn main() {\n  let s = new Session { user: 1, admin: false }\n  free(s)\n  free(s)\n  let alice = new Session { user: 2, admin: false }\n  let mallory = new Session { user: 3, admin: false }\n  print(\"same block?\", alice == mallory)\n  mallory.admin = true\n  print(\"alice.admin:\", alice.admin)\n}" },
  { id: 'overflow', title: 'Heap overflow', error: 'overflow', src: "struct Account { id: int, balance: int, limit: int }\n\nfn main() {\n  let scores = new [int; 3]\n  let acct = new Account { id: 42, balance: 100, limit: 500 }\n  for i in 0..8 {\n    scores[i] = 999999\n  }\n  print(\"balance:\", acct.balance)\n}" },
  { id: 'jump', title: 'Overflow that jumps', error: 'overflow', src: "struct Account { id: int, balance: int, limit: int }\n\nfn main() {\n  let scores = new [int; 3]\n  let acct = new Account { id: 42, balance: 100, limit: 500 }\n  let i = 12\n  scores[i] = 999999\n  print(\"balance:\", acct.balance)\n}" },
  { id: 'overread', title: 'Over-read', error: 'overflow', src: "struct Secret { key1: int, key2: int, key3: int }\n\nfn echo(payload: [int], claimed: int) {\n  for i in 0..claimed {\n    print(payload[i])\n  }\n}\n\nfn main() {\n  let payload = new [int; 3]\n  payload[0] = 104\n  payload[1] = 105\n  payload[2] = 33\n  let secret = new Secret { key1: 31337, key2: 27182, key3: 16180 }\n  echo(payload, 9)\n}" },
  { id: 'confusion', title: 'Type confusion', error: 'use-after-free', src: "struct Button { clicks: int, onClick: fn(int) -> int }\nstruct Message { length: int, body: int }\n\nfn open(x: int) -> int {\n  print(\"opening document\", x)\n  return 0\n}\n\nfn grantAdmin(x: int) -> int {\n  print(\"ADMIN ACCESS GRANTED\")\n  return 1\n}\n\nfn main() {\n  let button = new Button { clicks: 0, onClick: open }\n  free(button)\n  let msg = new Message { length: 8, body: 4194432 }\n  let handler = button.onClick\n  handler(1)\n}" },
  { id: 'leak', title: 'Leak', error: 'leak', src: "struct Request { id: int, size: int }\n\nfn handle(i: int) -> int {\n  let r = new Request { id: i, size: i * 10 }\n  if i % 4 == 0 {\n    return 0\n  }\n  let n = r.size\n  free(r)\n  return n\n}\n\nfn main() {\n  var total = 0\n  for i in 0..20 {\n    total = total + handle(i)\n  }\n  print(\"served\", total)\n}" },
];
