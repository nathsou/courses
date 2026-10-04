/** All values here are explicitly illustrative teaching inputs, not fossil reconstructions. */
export function energyBudget(intake: number, resting: number, activity: number) {
  const digestion = intake * 0.1;
  const expenditure = resting + activity + digestion;
  return { digestion, expenditure, balance: intake - expenditure, brain: resting * 0.2 };
}
export const household = [
  { person: 'Adult A', acquired: 3200, need: 2400 },
  { person: 'Adult B', acquired: 2900, need: 2200 },
  { person: 'Older adult', acquired: 2200, need: 1900 },
  { person: 'Child A', acquired: 450, need: 1500 },
  { person: 'Child B', acquired: 250, need: 1000 }
];
export function provision(factor: number, share: boolean) {
  const people = household.map(p => ({ ...p, acquired: p.acquired * factor }));
  const surplus = people.reduce((s,p) => s + Math.max(0, p.acquired - p.need), 0);
  const deficit = people.reduce((s,p) => s + Math.max(0, p.need - p.acquired), 0);
  const moved = share ? Math.min(surplus, deficit) : 0;
  const rows = people.map(p => {
    const excess = Math.max(0, p.acquired - p.need), missing = Math.max(0, p.need - p.acquired);
    const transfer = excess > 0 ? -(surplus ? moved * excess / surplus : 0) : (deficit ? moved * missing / deficit : 0);
    return { ...p, transfer, available: p.acquired + transfer, shortfall: Math.max(0, p.need - p.acquired - transfer) };
  });
  return { rows, moved, total: rows.reduce((s,p) => s + p.acquired,0), need: rows.reduce((s,p) => s + p.need,0), shortfall: rows.reduce((s,p) => s + p.shortfall,0) };
}
export const childhood = [
  { age: 0, volume: 25, demand: 40, growth: 100 },
  { age: 2, volume: 70, demand: 80, growth: 32 },
  { age: 5, volume: 90, demand: 100, growth: 18 },
  { age: 8, volume: 95, demand: 90, growth: 25 },
  { age: 12, volume: 98, demand: 65, growth: 50 },
  { age: 16, volume: 100, demand: 45, growth: 35 },
  { age: 20, volume: 100, demand: 40, growth: 5 }
];
export function toothDays(intervals: number, periodicity: number, initial: number) { return initial + intervals * periodicity; }
export function dietLevel(value: number, baseline: number, step: number) { return (value - baseline) / step; }
export function processing(group: number, gain: number, fuelCost: number) { return { benefit: group * gain, cost: fuelCost, net: group * gain - fuelCost }; }
export function gaitCost(speed: number, gait: 'walk' | 'run') {
  return gait === 'walk' ? 1.8 + 6 * (speed - 1.3) ** 2 : 4 + 0.05 * (speed - 3) ** 2;
}
export function travel(speed: number, gait: 'walk' | 'run', mass: number, distance: number) {
  const cost = gaitCost(speed, gait);
  return { cost, energy: cost * mass * distance, power: cost * mass * speed, hours: distance / (speed * 3.6) };
}
export function heatBalance(air: number, humidity: number, metabolic: number, sweat: number, insulation: number) {
  const produced = metabolic * 0.8;
  const dry = 8 * 1.8 * (34 - air) / (1 + insulation);
  const evaporatedFraction = Math.max(0, Math.min(1, (100 - humidity) / 60));
  const evaporative = sweat * 674 * evaporatedFraction;
  return { produced, dry, evaporative, evaporatedFraction, balance: produced - dry - evaporative };
}
export function cylinder(volume: number, height: number) {
  const radius = Math.sqrt(volume / (Math.PI * height));
  const area = 2 * Math.PI * radius * height + 2 * Math.PI * radius * radius;
  return { radius, area, ratio: area / volume };
}
