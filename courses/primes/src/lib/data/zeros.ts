/**
 * The ordinates of the first 10,000 nontrivial zeros of ζ (static/data/zeros.json, produced by `npm run zeros`).
 * Fetched once and shared by every widget that needs more than the first 100 (which ship in $lib/primes/zeros).
 */
import { base } from '$app/paths';

let cache: Promise<number[]> | null = null;

export function loadZeros(): Promise<number[]> {
  cache ??= fetch(`${base}/data/zeros.json`)
    .then((r) => {
      if (!r.ok) throw new Error(`zeros.json: ${r.status}`);
      return r.json() as Promise<number[]>;
    })
    .catch((e) => {
      cache = null;
      throw e;
    });
  return cache;
}
