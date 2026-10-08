/**
 * The course's cost model, in simulated cycles. A teaching model, not a predictor: the parameters are round
 * numbers of the order measured on contemporary out-of-order cores (L1 a few cycles, L2 around a dozen, last-level
 * cache a few dozen, DRAM a couple of hundred), and every figure that reports cycles shows them. Appendix B says
 * how it differs from a real machine (no overlap of misses, no prefetching, no out-of-order execution).
 */
import type { CacheConfig } from './cache';

export interface CostModel {
  caches: CacheConfig[];
  dram: number;
  /** Cycles to handle a page fault in the kernel (trap, handler, return), excluding the memory it touches. */
  fault: number;
  /** Cycles for a system call's trap and return. */
  syscall: number;
  /** Zeroing or copying one 4 KiB page. */
  pageCopy: number;
  /** One step of a page walk, beyond the memory access it makes. */
  walkStep: number;
  tlbEntries: number;
}

export const TEACHING_MACHINE: CostModel = {
  caches: [
    { name: 'L1', size: 32 * 1024, ways: 8, line: 64, latency: 4 },
    { name: 'L2', size: 512 * 1024, ways: 8, line: 64, latency: 14 },
    { name: 'L3', size: 4 * 1024 * 1024, ways: 16, line: 64, latency: 40 },
  ],
  dram: 200,
  fault: 1000,
  syscall: 300,
  pageCopy: 600,
  walkStep: 2,
  tlbEntries: 64,
};

/** A small machine for figures: every line and set can be drawn. */
export const TINY_MACHINE: CostModel = {
  caches: [{ name: 'L1', size: 512, ways: 2, line: 32, latency: 4 }],
  dram: 100,
  fault: 1000,
  syscall: 300,
  pageCopy: 600,
  walkStep: 2,
  tlbEntries: 8,
};
