/**
 * A slab cache (Bonwick, 1994): one cache per object type. Each slab is one or more frames carved into equal
 * objects. Allocation takes an object from a partially full slab (or an empty one, or a new slab); freeing
 * returns it to its slab. Slabs move between three lists as they fill and empty, and empty slabs can be given
 * back to the page allocator.
 */
export interface Slab {
  id: number;
  /** Which objects are in use. */
  used: boolean[];
  /** Index of the next free object (a free list threaded through the free objects). */
  freeList: number[];
}

export type SlabEvent = { kind: 'alloc' | 'free'; slab: number; index: number } | { kind: 'grow' | 'reap'; slab: number };

export class SlabCache {
  slabs: Slab[] = [];
  events: SlabEvent[] = [];
  private next = 0;
  readonly perSlab: number;

  constructor(
    readonly name: string,
    readonly objectSize: number,
    readonly slabBytes = 4096,
  ) {
    this.perSlab = Math.floor(slabBytes / objectSize);
  }

  get partial(): Slab[] {
    return this.slabs.filter((s) => s.freeList.length > 0 && s.freeList.length < this.perSlab);
  }
  get full(): Slab[] {
    return this.slabs.filter((s) => s.freeList.length === 0);
  }
  get empty(): Slab[] {
    return this.slabs.filter((s) => s.freeList.length === this.perSlab);
  }

  alloc(): { slab: number; index: number } {
    const s = this.partial[0] ?? this.empty[0] ?? this.grow();
    const index = s.freeList.shift()!;
    s.used[index] = true;
    this.events.push({ kind: 'alloc', slab: s.id, index });
    return { slab: s.id, index };
  }

  free(slab: number, index: number): void {
    const s = this.slabs.find((x) => x.id === slab);
    if (!s || !s.used[index]) throw new Error(`slab ${this.name}: double free or bad object (${slab}, ${index})`);
    s.used[index] = false;
    s.freeList.unshift(index);
    this.events.push({ kind: 'free', slab, index });
  }

  private grow(): Slab {
    const s: Slab = { id: this.next++, used: Array(this.perSlab).fill(false), freeList: Array.from({ length: this.perSlab }, (_, i) => i) };
    this.slabs.push(s);
    this.events.push({ kind: 'grow', slab: s.id });
    return s;
  }

  /** Give empty slabs back to the page allocator. */
  reap(): number {
    const empty = this.empty;
    this.slabs = this.slabs.filter((s) => !empty.includes(s));
    for (const s of empty) this.events.push({ kind: 'reap', slab: s.id });
    return empty.length;
  }

  /** Internal fragmentation: bytes per slab that no object can use. */
  waste(): number {
    return this.slabBytes - this.perSlab * this.objectSize;
  }
}
