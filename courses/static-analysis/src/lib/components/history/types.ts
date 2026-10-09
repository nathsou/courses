/** Shapes of the history data in content/{timeline,lineage,museum,bios}.yaml (+ .d/*.yaml). */

export const LANES = ['theory', 'tools', 'dataflow', 'abstract-interpretation', 'interprocedural', 'security', 'paths', 'practice'] as const;
export type Lane = (typeof LANES)[number];

export const LANE_LABELS: Record<Lane, string> = {
  theory: 'Computability and logic',
  tools: 'Linters and analysers',
  dataflow: 'Dataflow analysis',
  'abstract-interpretation': 'Abstract interpretation',
  interprocedural: 'Interprocedural and pointer analysis',
  security: 'Security and taint',
  paths: 'Symbolic execution and fuzzing',
  practice: 'Analysis in practice',
};

/** Part each lane mostly belongs to, for the `part` filter. */
export const LANE_PARTS: Record<Lane, string[]> = {
  theory: ['0', 'III', 'V'],
  tools: ['0', 'I', 'II', 'IV'],
  dataflow: ['III'],
  'abstract-interpretation': ['V'],
  interprocedural: ['VI'],
  security: ['VII'],
  paths: ['VIII'],
  practice: ['IV'],
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
