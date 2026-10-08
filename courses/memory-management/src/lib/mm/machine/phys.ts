/**
 * Physical memory: a byte array divided into frames. Values up to 2^53 − 1 can be stored in 64-bit words
 * (enough for any Sv39 address, size or page-table entry the course builds); they are split into two
 * little-endian 32-bit halves, exactly as a real RV64 machine stores them.
 */
export const PAGE_SIZE = 4096;
const TWO32 = 2 ** 32;

export class PhysicalMemory {
  readonly bytes: Uint8Array;
  readonly view: DataView;
  readonly frames: number;

  constructor(frames: number) {
    this.frames = frames;
    this.bytes = new Uint8Array(frames * PAGE_SIZE);
    this.view = new DataView(this.bytes.buffer);
  }

  get size(): number {
    return this.bytes.length;
  }

  private check(pa: number, n: number): void {
    if (!(pa >= 0 && pa + n <= this.bytes.length)) throw new RangeError(`physical address 0x${pa.toString(16)} is outside memory`);
  }

  load8(pa: number): number {
    this.check(pa, 1);
    return this.bytes[pa]!;
  }
  load16(pa: number): number {
    this.check(pa, 2);
    return this.view.getUint16(pa, true);
  }
  load32(pa: number): number {
    this.check(pa, 4);
    return this.view.getUint32(pa, true);
  }
  load64(pa: number): number {
    this.check(pa, 8);
    return this.view.getUint32(pa, true) + this.view.getUint32(pa + 4, true) * TWO32;
  }
  store8(pa: number, v: number): void {
    this.check(pa, 1);
    this.bytes[pa] = v & 0xff;
  }
  store16(pa: number, v: number): void {
    this.check(pa, 2);
    this.view.setUint16(pa, v & 0xffff, true);
  }
  store32(pa: number, v: number): void {
    this.check(pa, 4);
    this.view.setUint32(pa, v >>> 0, true);
  }
  store64(pa: number, v: number): void {
    this.check(pa, 8);
    if (!Number.isSafeInteger(v) || v < 0) throw new RangeError(`store64: ${v} is not an integer in [0, 2^53)`);
    this.view.setUint32(pa, v % TWO32, true);
    this.view.setUint32(pa + 4, Math.floor(v / TWO32), true);
  }

  /** Zero a whole frame. */
  zeroFrame(ppn: number): void {
    this.bytes.fill(0, ppn * PAGE_SIZE, (ppn + 1) * PAGE_SIZE);
  }

  /** Copy a whole frame (used by copy-on-write). */
  copyFrame(from: number, to: number): void {
    this.bytes.copyWithin(to * PAGE_SIZE, from * PAGE_SIZE, (from + 1) * PAGE_SIZE);
  }
}
