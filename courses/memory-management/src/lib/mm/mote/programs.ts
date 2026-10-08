/**
 * Mote programs used across the course (and by the tests: every one must behave identically under every setting
 * that accepts it).
 */
export const PROGRAMS = {
  list: `struct Node { value: int, next: Node? }

fn push(head: Node?, v: int) -> Node {
  return new Node { value: v, next: head }
}

fn sum(list: Node?) -> int {
  var total = 0
  var cur = &list
  while cur != null {
    total = total + cur.value
    cur = cur.next
  }
  return total
}

fn main() {
  var list: Node? = null
  for i in 0..100 {
    list = push(list, i)
  }
  print("sum", sum(list))
}`,

  churn: `struct Point { x: int, y: int }
struct Pair { a: Point?, b: Point? }

fn make(i: int) -> Pair {
  return new Pair { a: new Point { x: i, y: i * 2 }, b: new Point { x: -i, y: 0 } }
}

fn main() {
  var keep: Pair? = null
  var total = 0
  for i in 0..400 {
    let p = make(i)
    total = total + p.a.x + p.b.x + p.a.y
    if i % 50 == 0 {
      keep = p
    }
  }
  print(total, keep.a.x)
}`,

  trees: `struct Tree { left: Tree?, right: Tree?, value: int }

fn build(depth: int) -> Tree? {
  if depth == 0 {
    return null
  }
  return new Tree { left: build(depth - 1), right: build(depth - 1), value: depth }
}

fn count(t: Tree?) -> int {
  if t == null {
    return 0
  }
  return 1 + count(t.left) + count(t.right)
}

fn main() {
  let longLived = build(6)
  var total = 0
  for i in 0..20 {
    let t = build(4)
    total = total + count(t)
  }
  print(total, count(longLived))
}`,

  cycle: `struct Node { value: int, next: Node? }

fn ring(n: int) -> int {
  let first = new Node { value: 0, next: null }
  var cur = &first
  for i in 1..n {
    let node = new Node { value: i, next: null }
    cur.next = node
    cur = cur.next
  }
  cur.next = first
  return n
}

fn main() {
  var total = 0
  for k in 0..30 {
    total = total + ring(5)
  }
  print(total)
}`,

  arrays: `struct Item { id: int }

fn main() {
  let items = new [Item; 50]
  for i in 0..50 {
    items[i] = new Item { id: i }
  }
  var s = 0
  for r in 0..10 {
    for i in 0..50 {
      if i % 3 == r % 3 {
        items[i] = new Item { id: items[i].id + 1 }
      }
      s = s + items[i].id
    }
  }
  print(s, len(items))
}`,
};
