// Page script for chapter "milky-way": wires <Var>/<Out> computations.
import { compute } from '../lib/runtime/vars';
import { fmt } from '../lib/ui/controls';

const G_ASTRO = 4.30091e-6; // kpc (km/s)^2 / Msun

// Escape speed from the Sun's radius for a flat (isothermal) halo with v_c = 230 km/s,
// truncated at r_max = G M / v_c^2: v_esc = v_c sqrt(2 [1 + ln(r_max / R0)]).
compute('vesc', ['Mgal'], ({ Mgal }) => {
  const vc = 230, R0 = 8.2;
  const rmax = Math.max((G_ASTRO * Mgal * 1e12) / (vc * vc), R0);
  return `${fmt(vc * Math.sqrt(2 * (1 + Math.log(rmax / R0))), 3)} km/s`;
});

// Sun's orbital period around the Galactic centre, given R0 and v0.
compute('Tsun', ['R0', 'v0'], ({ R0, v0 }) => {
  const kpcPerKm = 3.2408e-17; // kpc per km
  const period_s = (2 * Math.PI * R0) / (v0 * kpcPerKm); // seconds... see below
  // Simpler: T = 2*pi*R0[kpc]*3.0857e16[km/kpc] / v0[km/s] seconds, converted to Myr.
  const T_s = (2 * Math.PI * R0 * 3.0857e16) / v0;
  const T_Myr = T_s / (3.15576e13);
  return `${fmt(T_Myr, 3)} Myr`;
});
