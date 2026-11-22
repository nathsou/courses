---
number: B
title: 'Models, constants and simplifications'
summary: 'The physical constants, the equations behind every simulation, and where each one is simplified.'
---

Every widget in this course computes its results from a model, written in TypeScript and tested against textbook values; none plays back recorded data. This appendix lists the constants, the models and, for each, what it leaves out. The code lives in `src/lib/physics/` (devices and circuits), `src/lib/eda/` (the design tools) and `src/lib/fab/` (the processes).

## Constants

| Quantity | Value |
| --- | --- |
| Elementary charge $q$ | $1.602 \times 10^{-19}$ C |
| Boltzmann's constant $k_\mathrm{B}$ | $8.617 \times 10^{-5}$ eV/K |
| $k_\mathrm{B}T$ at 300 K | 0.0259 eV |
| Permittivity of free space $\varepsilon_0$ | $8.854 \times 10^{-14}$ F/cm |
| Relative permittivity of silicon, of silicon dioxide | 11.7, 3.9 |
| Silicon atoms per cm³ | $5.0 \times 10^{22}$ (lattice constant 0.5431 nm) |
| Silicon band gap at 300 K | 1.12 eV (Varshni: $E_g = 1.17 - 4.73 \times 10^{-4}\,T^2/(T + 636)$) |
| Effective densities of states, silicon, 300 K | $N_c = 2.86 \times 10^{19}$, $N_v = 2.66 \times 10^{19}$ cm⁻³, scaling as $T^{3/2}$ |
| Intrinsic carrier concentration, silicon, 300 K | $1.0 \times 10^{10}$ cm⁻³ |
| Electron and hole mobility, pure silicon, 300 K | 1414 and 471 cm²/V·s |

The values for germanium, gallium arsenide and silicon dioxide in chapter 1 are from Sze and Ng; silicon dioxide's effective densities of states are rough, and only the enormous size of its gap matters there.:cite[sze2007]

## Part I: devices

- **Carriers** (chapters 1 and 2). $n_i = \sqrt{N_c N_v}\,e^{-E_g/2k_\mathrm{B}T}$; doped silicon from charge neutrality and $np = n_i^2$, with every dopant ionised (so there is no freeze-out in the model). The Fermi level is measured from mid-gap, ignoring the small offset of the intrinsic level, and Boltzmann statistics are used throughout, which loses accuracy in degenerate silicon (the doping lab warns when it gets there). Mobility follows the Caughey–Thomas fit to the total impurity concentration, at 300 K, with no dependence on electric field.
- **The bond lattice** (chapters 1 and 2) is qualitative. Its pairs of carriers appear by an Arrhenius law with an activation energy of 0.11 eV instead of 0.56 eV, scaled to about three pairs at room temperature, so that you can see any at all.
- **Drift and diffusion** (chapter 2): independent random walks with silicon's diffusivity (from Einstein's relation) and a drift of $\mu E$; no scattering details, no interaction between carriers.
- **The p–n junction** (chapter 3): the abrupt junction in the depletion approximation (no carriers inside the depletion region, none of its charge outside). The diode's saturation current is the long-base Shockley formula with a minority-carrier lifetime of 1 µs and an area of 100 µm × 100 µm; there is no recombination in the depletion region, no series resistance and no breakdown.
- **The MOS capacitor** (chapter 4): the exact one-dimensional solution of Poisson's equation for the charge in the silicon against surface potential, with an ideal oxide (no trapped charge, no interface states) and a gate work function chosen from three idealised materials. The electron charge is the exact total charge minus the exact charge without electrons.
- **The MOSFET** (chapter 4 onwards): the interpolation formula of the EKV model, which is continuous from subthreshold to strong inversion and reduces to the square law $\beta(V_{GS} - V_T)^2/2n$ in saturation, with a slope factor $n$ and channel-length modulation $\lambda$. The course's transistors are illustrative: $V_T = 0.4$ V, $\beta = 600$ µA/V² (nMOS) and 240 µA/V² (pMOS), $n = 1.3$, $\lambda = 0.08$/V. Velocity saturation, the drain's influence on the threshold and gate leakage are described in the text but not modelled.

## Part II: circuits

- **The inverter** (chapter 5): the static transfer curve solved exactly from the transistor model (where the nMOS and pMOS currents are equal); noise margins from the points of slope −1.
- **Switching** (chapter 6): a single inverter discharging a capacitor, integrated in small time steps from the transistor currents; the unit inverter has 1 fF of input capacitance and 1 fF of its own. Delays are therefore in the right range for an older process, not for a modern one.
- **Logical effort** (chapter 6): delay $N(H^{1/N} + p)$ in units of $\tau$, with $p = 1$.
- **Scaling** (chapter 6): Dennard's ideal rules, and the same with the voltage fixed; leakage as $10^{-V_T/S}$.
- **The latch** (chapter 7): two inverters with a smooth transfer curve of chosen gain, each node a first-order lag. **Setup, hold and metastability** use an illustrative window (20 ps setup, 10 ps hold, 8 ps resolution time constant) and the standard formula for the mean time between failures.
- **SRAM** (chapter 7): the six-transistor cell integrated in time with the transistor model, node capacitances of 0.4 fF and bitlines of 20 fF; random variation is a worst-case threshold shift in the two pull-down transistors. **DRAM**: charge sharing between a cell and a bitline, with an illustrative exponential leak.

## Part III: the design tools

The HDL, simulator and proof engine are described in Appendix A. The synthesiser bit-blasts into a structurally hashed graph of AND, OR, XOR, NOT and multiplexer nodes with local simplifications, then maps onto the library by tree covering. It does not restructure logic globally or use don't-cares (chapter 10's Karnaugh maps show what they would gain).

The cell library is illustrative: transistor counts are those of the standard static CMOS gates; delays (10 ps for an inverter to 28 ps for an XOR) plus 4 ps per unit of load are round numbers in the right proportions, not any foundry's. Flip-flops have a clock-to-output delay of 40 ps, a setup time of 25 ps and a hold time of 5 ps.

Placement measures half-perimeter wirelength and anneals with swaps and moves; there is no timing or congestion in its cost. The router is Dijkstra's algorithm on a grid of two layers with preferred directions, routing nets in sequence with no rip-up. Timing analysis ignores wires (their capacitance and resistance) and input transition times, and uses one corner. The layout rules are a simplified set in the style of Mead and Conway's scalable λ rules,:cite[mead1980] and extraction recognises only the five layers drawn. Fault simulation covers single stuck-at faults on cell outputs and inputs, with full scan.

## Part IV: the processes

- **Segregation** (chapter 13): Scheil's equation with equilibrium segregation coefficients from Sze and Ng; real pulls use effective coefficients that depend on growth rate and stirring, and evaporation from the melt is ignored.
- **Dies per wafer and yield** (chapters 13 and 17): dies on a grid offset by half a die, with a 3 mm edge exclusion; defects uniformly random (or crudely clustered round random centres); Poisson, Murphy and negative-binomial yield formulas.
- **Lithography** (chapter 14): scalar, thin-mask Fourier optics. The grating image sums the diffraction orders that pass a circular pupil over source points across a circular source (Abbe's method), with a paraxial defocus phase; the two-dimensional imager filters the mask's Fourier transform through a shifted pupil for each of thirteen source points. The resist is a sharp threshold, with no blur, no acid diffusion and no stochastic noise; real lithography at high numerical aperture also needs vector (polarisation) effects and three-dimensional mask effects. The proximity correction is a simple pixel-based loop restricted to near the drawn edges, a toy cousin of production inverse lithography.
- **Oxidation** (chapter 15): the Deal–Grove model with its original coefficients for (111) silicon, the linear rate divided by 1.68 for (100), and 25 nm of initial oxide for dry growth; it is known to underestimate the growth of very thin dry oxides.:cite[dealgrove1965]
- **Implantation** (chapter 15): Gaussian profiles with projected ranges and straggles interpolated from LSS-theory tables for 10–100 keV, with no channelling and no tail; annealing adds $2Dt$ to the variance with the intrinsic diffusivity at the anneal temperature, ignoring the faster diffusion of very high concentrations and the transient enhanced diffusion caused by implant damage.
- **Etching and deposition** (chapter 15): an elliptical etch front of constant rates; a view-factor estimate for sputtering, a reaction–diffusion estimate for CVD, and uniform ALD. All illustrative.
- **The process flow** (chapter 16): a column model in which every etch is perfectly anisotropic and every deposit is planar on each column (no coating of side walls), with no spacers, lightly doped drains, silicide, well contacts or p-well; vertical sizes are exaggerated.:cite[plummer2000]
