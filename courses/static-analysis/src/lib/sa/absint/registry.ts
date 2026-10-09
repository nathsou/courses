/** The abstract interpreters of Part V, by key, for figures that compare them. */
import type { CheckingAnalysis } from './checks.js';
import { intervalsPartitioned, intervalsReducedParity, intervalsTimesParity, parityAnalysis } from './combine.js';
import { intervals } from './intervals.js';
import { zones } from './zones.js';

export const DOMAIN_ANALYSES: Record<string, { label: string; analysis: CheckingAnalysis<unknown> }> = {
  intervals: { label: 'Intervals', analysis: intervals as CheckingAnalysis<unknown> },
  parity: { label: 'Parity', analysis: parityAnalysis as CheckingAnalysis<unknown> },
  product: { label: 'Intervals × parity', analysis: intervalsTimesParity as CheckingAnalysis<unknown> },
  reduced: { label: 'Reduced product', analysis: intervalsReducedParity as CheckingAnalysis<unknown> },
  partitioned: { label: 'Partitioned intervals', analysis: intervalsPartitioned as CheckingAnalysis<unknown> },
  zones: { label: 'Zones', analysis: zones as CheckingAnalysis<unknown> },
};
