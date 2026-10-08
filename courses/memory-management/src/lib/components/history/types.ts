/** Shapes of the history data in content/{timeline,lineage,museum,bios}.yaml (+ .d/*.yaml). */

export const LANES = ['hardware', 'virtual-memory', 'allocators', 'safety', 'ownership', 'reference-counting', 'tracing', 'failures'] as const;
export type Lane = (typeof LANES)[number];

export const LANE_LABELS: Record<Lane, string> = {
  hardware: 'Memory hardware',
  'virtual-memory': 'Virtual memory and kernels',
  allocators: 'Allocators',
  safety: 'Memory safety tools',
  ownership: 'Ownership and regions',
  'reference-counting': 'Reference counting',
  tracing: 'Tracing collection',
  failures: 'Failures',
};

/** Part each lane mostly belongs to, for the `part` filter. */
export const LANE_PARTS: Record<Lane, string[]> = {
  hardware: ['I'],
  'virtual-memory': ['I', 'II'],
  allocators: ['II', 'III'],
  safety: ['IV'],
  ownership: ['IV'],
  'reference-counting': ['V'],
  tracing: ['VI'],
  failures: ['I', 'II', 'III', 'IV', 'V', 'VI'],
};

export interface TimelineEvent {
  year: number;
  month?: number;
  lane: Lane;
  title: string;
  people?: string;
  /** Chapter (or part essay) slug where the event matters. */
  chapter?: string;
  /** Part ids this event belongs to (defaults from the lane). */
  parts?: string[];
  /** HTML (rendered at build time). */
  text: string;
  cite?: string[];
}

export interface LineageNode {
  id: string;
  name: string;
  year: number;
  kind: 'tool' | 'idea' | 'paper';
  lane: Lane;
  chapter?: string;
  /** Anchor in the Rosetta appendix, when the tool appears there. */
  rosetta?: string;
  note?: string;
}

export interface LineageEdge {
  from: string;
  to: string;
  type: 'descends' | 'influenced';
  cite?: string[];
}

export interface Exhibit {
  id: string;
  title: string;
  year: number | string;
  /** HTML. */
  summary: string;
  chapter: string;
  reenacted: boolean;
  simplification?: string;
  cite?: string[];
}

export interface BioEntry {
  id: string;
  name: string;
  born?: number;
  died?: number;
  summary: string;
  chapters?: string[];
  cite?: string[];
}
