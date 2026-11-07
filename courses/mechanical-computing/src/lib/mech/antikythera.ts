/**
 * The arithmetic of gear trains, and the Antikythera mechanism's lunar gearing.
 *
 * A pair of meshing gears multiplies a rotation by −(driver teeth)/(driven teeth); gears on a shared axle
 * turn together. The mechanism's main wheel turns once a year; the train b2 (64) → c1 (38), c2 (48) → d1 (24),
 * d2 (127) → e2 (32) turns the lunar axle 64·48·127 / (38·24·32) = 254/19 times a year: the Moon goes round
 * the zodiac 254 times in 19 years (the Metonic relation). A pin-and-slot pair on slightly offset axes then
 * makes the Moon pointer run faster and slower round each month, as Hipparchos's theory of the Moon required.
 */

export interface Mesh {
  driver: number;
  driven: number;
}

/** Overall ratio of a train of meshes (driven turns per driver turn), with the sign of each reversal. */
export function trainRatio(meshes: Mesh[]): number {
  return meshes.reduce((r, m) => (-r * m.driver) / m.driven, 1);
}

export const LUNAR_TRAIN: Mesh[] = [
  { driver: 64, driven: 38 },
  { driver: 48, driven: 24 },
  { driver: 127, driven: 32 },
];

/** Sidereal months in a year by the Metonic relation: 254 in 19 years. */
export const SIDEREAL_PER_YEAR = 254 / 19;

/**
 * Pin-and-slot: gear k1 turns uniformly at angle t about its axle; its pin, at radius r, sits in a radial slot
 * of gear k2, whose axle is offset by e. The angle of k2 is the direction of the pin seen from k2's axle.
 * Returns k2's angle.
 */
export function pinSlot(t: number, r: number, e: number, offsetAngle = 0): number {
  const px = r * Math.cos(t), py = r * Math.sin(t);
  const cx = e * Math.cos(offsetAngle), cy = e * Math.sin(offsetAngle);
  return Math.atan2(py - cy, px - cx);
}

/** The unwrapped difference between the pin-and-slot output and uniform motion, in radians. */
export function anomaly(t: number, r: number, e: number): number {
  let d = pinSlot(t, r, e) - t;
  d = Math.atan2(Math.sin(d), Math.cos(d));
  return d;
}

/** Days in a sidereal month and a mean year, for the readouts. */
export const SIDEREAL_DAYS = 27.3217;
export const YEAR_DAYS = 365.2422;
