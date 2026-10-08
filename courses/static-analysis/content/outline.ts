export interface OutlineEntry { slug: string; number: string; title: string; summary: string; flagship?: string; optional?: boolean; track?: 'A' | 'B'; year?: number; event?: string }
export interface OutlinePart { id: string; title: string; essay?: string; blurb: string; chapters: OutlineEntry[] }
export const COURSE_TITLE = 'Every Path at Once';
export const COURSE_SUBTITLE = 'Static analysis, from your first lint rule to taint tracking and symbolic execution';
export const PARTS: OutlinePart[] = [];
export interface AppendixEntry { slug: string; number: string; title: string; summary: string }
export const APPENDICES: AppendixEntry[] = [];
