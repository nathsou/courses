/** The practice room's schedule, kept in this browser's localStorage (with export and import as JSON). */
import { browser } from '$app/environment';
import { answer, type ItemState } from '$lib/practice/schedule';

const KEY = 'music-theory:practice';

class PracticeState {
  items: Record<string, ItemState> = $state({});
  /** Practise skills from chapters not yet opened. */
  everything = $state(false);
  private loaded = false;

  load(): void {
    if (this.loaded || !browser) return;
    this.loaded = true;
    try {
      const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as { items?: Record<string, ItemState>; everything?: boolean };
      this.items = raw.items ?? {};
      this.everything = raw.everything ?? false;
    } catch {
      /* start afresh */
    }
  }

  save(): void {
    if (!browser) return;
    try {
      localStorage.setItem(KEY, JSON.stringify({ items: this.items, everything: this.everything }));
    } catch {
      /* not remembered */
    }
  }

  record(id: string, right: boolean, seconds?: number): void {
    this.items = { ...this.items, [id]: answer(this.items[id], right, Date.now(), seconds) };
    this.save();
  }

  exportJson(): string {
    return JSON.stringify({ items: this.items, everything: this.everything }, null, 1);
  }

  importJson(text: string): void {
    const raw = JSON.parse(text) as { items?: Record<string, ItemState> };
    if (!raw.items || typeof raw.items !== 'object') throw new Error('Not a practice-room file');
    this.items = raw.items;
    this.save();
  }
}

export const practice = new PracticeState();
