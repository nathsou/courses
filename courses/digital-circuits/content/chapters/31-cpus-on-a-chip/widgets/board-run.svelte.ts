/**
 * Running a decoded chip on the board: the switches and buttons are driven onto its pins, the clock is stepped a
 * batch of cycles per animation frame, and the outputs are read back after each batch (with Octet's console writes
 * on the way). Only one batch is in flight at a time.
 */
import type { Synth } from '$lib/synth/api';
import { Chip, type Fit } from './chip';

export type Speed = 'slow' | 'medium' | 'fast';

/** Cycles per animation frame: about 60, 1,000 and 60,000 cycles a second. */
export const SPEEDS: Record<Speed, { cycles: number; label: string }> = {
  slow: { cycles: 1, label: '60 Hz' },
  medium: { cycles: 17, label: '1 kHz' },
  fast: { cycles: 1000, label: 'fast' },
};

export class BoardRun {
  values = $state<Record<string, number>>({});
  cycle = $state(0);
  console = $state('');
  running = $state(false);
  speed = $state<Speed>('medium');
  switches = $state(0);
  buttons = $state(0);
  error = $state('');
  /** Whether a chip is on the board. */
  ready = $state(false);
  private chip: Chip | null = null;
  private busy = false;
  private frame = 0;

  constructor(private readonly synth: () => Synth) {}

  private inputs(extra: Record<string, number> = {}): Record<string, number> {
    return { sw: this.switches, btn: this.buttons, rst_button: 0, ...extra };
  }

  /** Put a new chip on the board (a new fit, or a new program in the bits), from power-up. */
  async attach(f: Fit): Promise<void> {
    this.pause();
    const old = this.chip;
    this.chip = null;
    this.ready = false;
    if (old) await old.stop();
    this.chip = await Chip.start(this.synth(), f);
    this.ready = true;
    this.cycle = 0;
    this.console = '';
    await this.batch(0);
  }

  async detach(): Promise<void> {
    this.pause();
    const old = this.chip;
    this.chip = null;
    this.ready = false;
    if (old) await old.stop();
  }

  private async batch(cycles: number, extra: Record<string, number> = {}): Promise<void> {
    if (!this.chip || this.busy) return;
    this.busy = true;
    try {
      const out = await this.chip.run(cycles, this.inputs(extra), true);
      this.values = out.values;
      this.cycle = out.cycle;
      if (out.console.length) this.console = (this.console + String.fromCharCode(...out.console)).slice(-400);
    } catch (e) {
      this.error = e instanceof Error ? e.message : String(e);
      this.pause();
    } finally {
      this.busy = false;
    }
  }

  step(n = 1): Promise<void> {
    return this.batch(n);
  }

  play(): void {
    if (this.running || !this.chip) return;
    this.running = true;
    const tick = async () => {
      if (!this.running) return;
      await this.batch(SPEEDS[this.speed].cycles);
      if (this.running) this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  pause(): void {
    this.running = false;
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.frame);
  }

  /** Octet's reset button: held for four cycles (two of them in its synchroniser). */
  async reset(): Promise<void> {
    await this.batch(4, { rst_button: 1 });
    this.console = '';
  }

  /** Back to power-up, as if the board had been switched off and on. */
  async powerCycle(): Promise<void> {
    if (!this.chip) return;
    this.pause();
    await this.chip.restart();
    this.cycle = 0;
    this.console = '';
    await this.batch(0);
  }
}
