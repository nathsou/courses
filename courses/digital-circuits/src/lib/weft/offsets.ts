/**
 * synth reports positions as UTF-8 byte offsets; the editor and the page count UTF-16 code units. Weft
 * identifiers are ASCII, but comments and strings may not be (an em dash in a comment), so every offset
 * from synth goes through this conversion.
 */

/** A function from byte offsets of `text` (as UTF-8) to string indices. */
export function byteToIndex(text: string): (byte: number) => number {
  // Fast path: pure ASCII, where bytes and indices agree.
  // eslint-disable-next-line no-control-regex
  if (/^[\x00-\x7f]*$/.test(text)) return (b) => Math.max(0, Math.min(b, text.length));
  const starts: number[] = [];
  let byte = 0;
  for (let i = 0; i < text.length; i++) {
    starts.push(byte);
    const c = text.codePointAt(i)!;
    if (c > 0xffff) {
      starts.push(byte);
      i++;
    }
    byte += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  starts.push(byte);
  return (b) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid]! <= b) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };
}
