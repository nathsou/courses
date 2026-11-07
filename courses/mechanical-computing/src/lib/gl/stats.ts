/**
 * Performance counters, exposed on `window.__mcStats` so browser checks can read them: mesh build times,
 * draw calls and instances in the last frame of each view, frames rendered, and live WebGL contexts.
 */
export interface Stats {
  meshBuilds: { key: string; ms: number; triangles: number }[];
  views: Record<string, { drawCalls: number; instances: number; triangles: number; frames: number; cpuMs: number; scale: number }>;
  liveContexts: number;
  maxLiveContexts: number;
  framesAllocating: number;
}

export const stats: Stats = { meshBuilds: [], views: {}, liveContexts: 0, maxLiveContexts: 0, framesAllocating: 0 };

if (typeof window !== 'undefined') (window as unknown as { __mcStats: Stats }).__mcStats = stats;
