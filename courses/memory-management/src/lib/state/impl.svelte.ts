/**
 * "Use my implementation" (PLAN §3, through-line 3): when the reader's code passes an exercise marked with `use`,
 * it is remembered here, and later figures can run it instead of the reference implementation.
 */
import { browser } from '$app/environment';

const KEY = 'memory-management:impl';

function read(): Record<string, { code: string; at: number }> {
  if (!browser) return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

class Impls {
  all: Record<string, { code: string; at: number }> = $state({});
  private loaded = false;
  load(): void {
    if (this.loaded || !browser) return;
    this.loaded = true;
    this.all = read();
  }
  get(slot: string): string | undefined {
    this.load();
    return this.all[slot]?.code;
  }
  save(slot: string, code: string): void {
    this.load();
    this.all[slot] = { code, at: Date.now() };
    try {
      localStorage.setItem(KEY, JSON.stringify(this.all));
    } catch {
      /* not remembered */
    }
  }
}

export const impls = new Impls();
