/**
 * The reader's engine: the code of every engine exercise they have passed, and which of those
 * modules are switched on. Kept in this browser's localStorage; without it, every exercise simply
 * runs against the reference engine.
 */
import { browser } from '$app/environment';
import { ENGINE_MODULES } from '$lib/code/engine-modules';
import type { EngineModule } from '$lib/code/protocol';

const KEY = 'term-rewriting:engine';

interface Stored {
  passed: Record<string, { code: string; at: number }>;
  off: Record<string, true>;
}

class EngineState {
  passed: Record<string, { code: string; at: number }> = $state({});
  off: Record<string, true> = $state({});
  private loaded = false;

  load(): void {
    if (this.loaded || !browser) return;
    this.loaded = true;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const s = JSON.parse(raw) as Stored;
        this.passed = s.passed ?? {};
        this.off = s.off ?? {};
      }
    } catch {
      /* storage unavailable */
    }
  }

  private save(): void {
    if (!browser) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ passed: this.passed, off: this.off }));
    } catch {
      /* storage unavailable: the engine is not remembered */
    }
  }

  /** Remember code that passed an engine exercise's tests. */
  savePassed(id: string, code: string): void {
    this.passed[id] = { code, at: Date.now() };
    this.save();
  }

  /** Use the reader's module (true) or the reference (false). */
  setMine(id: string, mine: boolean): void {
    if (mine) delete this.off[id];
    else this.off[id] = true;
    this.save();
  }

  forget(id: string): void {
    delete this.passed[id];
    delete this.off[id];
    this.save();
  }

  isMine(id: string): boolean {
    return id in this.passed && !(id in this.off);
  }

  /** The modules to load as `engine`, in course order. */
  modules(): EngineModule[] {
    this.load();
    return ENGINE_MODULES.filter((m) => this.isMine(m.id)).map((m) => ({ id: m.id, code: this.passed[m.id]!.code, provides: m.provides }));
  }
}

export const engineState = new EngineState();
