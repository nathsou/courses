/** Hexadecimal with a 0x prefix, padded to `width` digits. */
export function hex(n: number, width = 0): string {
  return '0x' + Math.floor(n).toString(16).padStart(width, '0');
}

/** Binary, padded to `width` digits, grouped by `group` from the right. */
export function bin(n: number, width: number, group = 0): string {
  let s = '';
  for (let i = width - 1; i >= 0; i--) {
    s += Math.floor(n / 2 ** i) % 2 ? '1' : '0';
    if (group && i && i % group === 0) s += '_';
  }
  return s;
}

/** Bytes in the largest binary unit that keeps the number at least 1: 4096 → "4 KiB". */
export function bytes(n: number): string {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let u = 0;
  while (n >= 1024 && u < units.length - 1 && n % 1024 === 0) {
    n /= 1024;
    u++;
  }
  if (n >= 1024 && u < units.length - 1) {
    n /= 1024;
    u++;
    return `${n.toFixed(1)} ${units[u]}`;
  }
  return `${n} ${units[u]}`;
}

/** Thousands separators with a thin space, as in the course's prose. */
export function num(n: number): string {
  return Math.round(n).toLocaleString('en-GB');
}
