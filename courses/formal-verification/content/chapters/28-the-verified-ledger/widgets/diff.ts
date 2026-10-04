/** A line diff (longest common subsequence), to show what a "break it" switch changed in a layer's code. */
export interface DiffLine {
  kind: 'same' | 'add' | 'del';
  text: string;
}

export function diffLines(before: string, after: string): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');
  const n = a.length;
  const m = b.length;
  // lcs[i][j]: the length of the longest common subsequence of a[i…] and b[j…].
  const lcs = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) lcs[i]![j] = a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i]! });
      i++;
      j++;
    } else if (j < m && (i === n || lcs[i]![j + 1]! >= lcs[i + 1]![j]!)) out.push({ kind: 'add', text: b[j++]! });
    else out.push({ kind: 'del', text: a[i++]! });
  }
  // Deletions first within a changed block reads better: the old line, then the new one.
  for (let k = 0; k + 1 < out.length; k++) {
    if (out[k]!.kind === 'add' && out[k + 1]!.kind === 'del') {
      let e = k;
      while (e > 0 && out[e - 1]!.kind === 'add') e--;
      const del = out.splice(k + 1, 1)[0]!;
      out.splice(e, 0, del);
    }
  }
  return out;
}
