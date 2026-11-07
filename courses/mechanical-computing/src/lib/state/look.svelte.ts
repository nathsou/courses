/** How 3D machines are drawn — lit brass or an engineering drawing — remembered in this browser. */
import { browser } from '$app/environment';
import type { Look } from '$lib/gl/renderer';

const KEY = 'mechanical-computing:look';

class LookState {
  look: Look = $state('brass');
  private loaded = false;

  load(): void {
    if (this.loaded || !browser) return;
    this.loaded = true;
    try {
      const v = localStorage.getItem(KEY);
      if (v === 'brass' || v === 'drawing') this.look = v;
    } catch {
      /* not remembered */
    }
  }

  set(v: Look): void {
    this.look = v;
    try {
      localStorage.setItem(KEY, v);
    } catch {
      /* not remembered */
    }
  }
}

export const look = new LookState();
