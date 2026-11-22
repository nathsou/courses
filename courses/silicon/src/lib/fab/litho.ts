/**
 * Optical lithography in scalar Fourier optics. A mask diffracts light into orders; the projection lens collects
 * only the orders within its numerical aperture; the image is what those orders rebuild. Partially coherent
 * illumination is a sum of coherent images from many source points (Abbe's method). The resist is a threshold:
 * where the dose exceeds it, positive resist dissolves.
 */

// ───────────────────────── One dimension: a grating ─────────────────────────

export interface Optics {
  /** Wavelength, nm. */
  lambda: number;
  NA: number;
  /** Partial coherence: the source's radius as a fraction of the pupil's. */
  sigma: number;
  /** Defocus, nm. */
  defocus?: number;
}

const sinc = (x: number) => (x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x));

/**
 * Aerial image intensity across one period of a grating of opaque lines (width w, nm) at pitch p (nm) on a
 * clear mask, normalised so that a large clear area has intensity 1. Returns intensity at `n` points over one
 * period, starting at a line's centre.
 */
export function gratingImage(o: Optics, p: number, w: number, n = 200): Float64Array {
  const orders: { k: number; c: number }[] = [];
  const kmax = Math.ceil(((1 + o.sigma) * o.NA * p) / o.lambda) + 1;
  for (let k = -kmax; k <= kmax; k++) orders.push({ k, c: k === 0 ? 1 - w / p : -(w / p) * sinc((k * w) / p) });
  // Source points across the (1-D projection of the) circular source, weighted by its chord length.
  const S = 41;
  const out = new Float64Array(n);
  let wsum = 0;
  for (let s = 0; s < S; s++) {
    const u = o.sigma * (-1 + (2 * s + 1) / S);
    const weight = o.sigma === 0 ? 1 : Math.sqrt(Math.max(0, 1 - (u / o.sigma) ** 2));
    if (o.sigma === 0 && s !== (S - 1) / 2) continue;
    const pass = orders.filter(({ k }) => Math.abs((k * o.lambda) / (p * o.NA) + (o.sigma === 0 ? 0 : u)) <= 1);
    for (let i = 0; i < n; i++) {
      const x = (i / n) * p;
      let re = 0;
      let im = 0;
      for (const { k, c } of pass) {
        const f = k / p + ((o.sigma === 0 ? 0 : u) * o.NA) / o.lambda; // spatial frequency, 1/nm
        const phase = 2 * Math.PI * (k * x) / p - Math.PI * o.lambda * (o.defocus ?? 0) * f * f;
        re += c * Math.cos(phase);
        im += c * Math.sin(phase);
      }
      out[i]! += weight * (re * re + im * im);
    }
    wsum += weight;
  }
  for (let i = 0; i < n; i++) out[i]! /= wsum;
  return out;
}

/** The printed width (nm) of the resist line left where intensity stays below the threshold, or 0 if none. */
export function printedLine(image: Float64Array, p: number, threshold: number): number {
  const n = image.length;
  if (image[0]! >= threshold) return 0;
  let i = 0;
  while (i < n / 2 && image[i]! < threshold) i++;
  if (i >= n / 2) return p;
  const a = image[i - 1]!;
  const b = image[i]!;
  const edge = (i - 1 + (threshold - a) / (b - a)) / n;
  return 2 * edge * p;
}

/** Smallest pitch whose first diffraction order the lens can still collect: λ / (NA (1 + σ)). */
export const minPitch = (o: Optics) => o.lambda / (o.NA * (1 + o.sigma));

// ───────────────────────── Two dimensions: an FFT imager ─────────────────────────

function fft(re: Float64Array, im: Float64Array, inverse: boolean): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wr = Math.cos(ang);
    const wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const ar = re[i + k]!;
        const ai = im[i + k]!;
        const br = re[i + k + len / 2]! * cr - im[i + k + len / 2]! * ci;
        const bi = re[i + k + len / 2]! * ci + im[i + k + len / 2]! * cr;
        re[i + k] = ar + br;
        im[i + k] = ai + bi;
        re[i + k + len / 2] = ar - br;
        im[i + k + len / 2] = ai - bi;
        const t = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = t;
      }
    }
  }
  if (inverse) for (let i = 0; i < n; i++) {
    re[i]! /= n;
    im[i]! /= n;
  }
}

function fft2(re: Float64Array, im: Float64Array, n: number, inverse: boolean): void {
  const rr = new Float64Array(n);
  const ri = new Float64Array(n);
  for (let y = 0; y < n; y++) {
    for (let x = 0; x < n; x++) {
      rr[x] = re[y * n + x]!;
      ri[x] = im[y * n + x]!;
    }
    fft(rr, ri, inverse);
    for (let x = 0; x < n; x++) {
      re[y * n + x] = rr[x]!;
      im[y * n + x] = ri[x]!;
    }
  }
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) {
      rr[y] = re[y * n + x]!;
      ri[y] = im[y * n + x]!;
    }
    fft(rr, ri, inverse);
    for (let y = 0; y < n; y++) {
      re[y * n + x] = rr[y]!;
      im[y * n + x] = ri[y]!;
    }
  }
}

/**
 * Aerial image of a 2-D mask (n × n pixels of `pixel` nm, 1 = clear, 0 = opaque), with a circular source of
 * radius σ sampled at a few points. Intensity normalised to 1 for a large clear area.
 */
export function maskImage(mask: Float64Array, n: number, pixel: number, o: Optics): Float64Array {
  const re = Float64Array.from(mask);
  const im = new Float64Array(n * n);
  fft2(re, im, n, false);
  const field = n * pixel;
  const cutoff = (o.NA / o.lambda) * field; // pupil radius in frequency samples
  const sources: [number, number][] = [[0, 0]];
  if (o.sigma > 0) {
    for (const r of [0.5, 1]) for (let k = 0; k < 6; k++) sources.push([r * o.sigma * Math.cos((k * Math.PI) / 3 + (r === 1 ? Math.PI / 6 : 0)), r * o.sigma * Math.sin((k * Math.PI) / 3 + (r === 1 ? Math.PI / 6 : 0))]);
  }
  const out = new Float64Array(n * n);
  const fre = new Float64Array(n * n);
  const fim = new Float64Array(n * n);
  for (const [sx, sy] of sources) {
    for (let v = 0; v < n; v++)
      for (let u = 0; u < n; u++) {
        const fu = u < n / 2 ? u : u - n;
        const fv = v < n / 2 ? v : v - n;
        const inside = Math.hypot(fu + sx * cutoff, fv + sy * cutoff) <= cutoff;
        const i = v * n + u;
        fre[i] = inside ? re[i]! : 0;
        fim[i] = inside ? im[i]! : 0;
      }
    fft2(fre, fim, n, true);
    for (let i = 0; i < n * n; i++) out[i]! += fre[i]! * fre[i]! + fim[i]! * fim[i]!;
  }
  for (let i = 0; i < n * n; i++) out[i]! /= sources.length;
  return out;
}
