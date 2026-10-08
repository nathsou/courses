/**
 * The buddy system (Knowlton, 1965), as in the Linux kernel's page allocator: memory is a power-of-two number
 * of frames; a block of order k is 2^k frames aligned to 2^k. To allocate order k, take a free block of the
 * smallest order ≥ k and split it in halves ("buddies") until it is the right size. To free, merge the block
 * with its buddy while the buddy is free; a block's buddy is found by flipping one bit of its address.
 */
export type BuddyEvent =
  | { kind: 'split'; frame: number; order: number }
  | { kind: 'take'; frame: number; order: number }
  | { kind: 'merge'; frame: number; buddy: number; order: number }
  | { kind: 'release'; frame: number; order: number }
  | { kind: 'fail'; order: number };

export class BuddyAllocator {
  /** free[k] = start frames of free blocks of order k (kept sorted, lowest first, so results are predictable). */
  readonly free: number[][];
  /** Order of each allocated block, by start frame. */
  readonly allocated = new Map<number, number>();
  events: BuddyEvent[] = [];

  constructor(
    readonly frames: number,
    readonly maxOrder = Math.log2(frames),
  ) {
    if (!Number.isInteger(Math.log2(frames))) throw new Error('buddy: the number of frames must be a power of two');
    this.free = Array.from({ length: this.maxOrder + 1 }, () => []);
    const top = 2 ** this.maxOrder;
    for (let f = 0; f < frames; f += top) this.free[this.maxOrder]!.push(f);
  }

  static buddyOf(frame: number, order: number): number {
    return frame ^ (1 << order);
  }

  private insert(order: number, frame: number): void {
    const list = this.free[order]!;
    let i = 0;
    while (i < list.length && list[i]! < frame) i++;
    list.splice(i, 0, frame);
  }

  /** Allocate 2^order contiguous frames; returns the first frame, or -1 when no block is large enough. */
  alloc(order: number): number {
    let k = order;
    while (k <= this.maxOrder && this.free[k]!.length === 0) k++;
    if (k > this.maxOrder) {
      this.events.push({ kind: 'fail', order });
      return -1;
    }
    const frame = this.free[k]!.shift()!;
    while (k > order) {
      k--;
      const upper = frame + (1 << k);
      this.insert(k, upper);
      this.events.push({ kind: 'split', frame, order: k + 1 });
    }
    this.allocated.set(frame, order);
    this.events.push({ kind: 'take', frame, order });
    return frame;
  }

  free_(frame: number): void {
    let order = this.allocated.get(frame);
    if (order === undefined) throw new Error(`buddy: frame ${frame} is not the start of an allocated block`);
    this.allocated.delete(frame);
    this.events.push({ kind: 'release', frame, order });
    while (order < this.maxOrder) {
      const buddy = BuddyAllocator.buddyOf(frame, order);
      const list = this.free[order]!;
      const at = list.indexOf(buddy);
      if (at < 0) break;
      list.splice(at, 1);
      this.events.push({ kind: 'merge', frame: Math.min(frame, buddy), buddy, order: order + 1 });
      frame = Math.min(frame, buddy);
      order++;
    }
    this.insert(order, frame);
  }

  freeFrames(): number {
    return this.free.reduce((n, list, k) => n + list.length * 2 ** k, 0);
  }

  /** The largest block that could be allocated right now. */
  largestFree(): number {
    for (let k = this.maxOrder; k >= 0; k--) if (this.free[k]!.length) return k;
    return -1;
  }

  /** Every block, free or allocated, in frame order (for the buddy tree figure). */
  blocks(): { frame: number; order: number; free: boolean }[] {
    const out: { frame: number; order: number; free: boolean }[] = [];
    this.free.forEach((list, k) => list.forEach((f) => out.push({ frame: f, order: k, free: true })));
    for (const [f, k] of this.allocated) out.push({ frame: f, order: k, free: false });
    return out.sort((a, b) => a.frame - b.frame);
  }
}

/** Smallest order whose block holds `n` frames. */
export function orderFor(n: number): number {
  return Math.max(0, Math.ceil(Math.log2(n)));
}
