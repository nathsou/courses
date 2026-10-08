import { type Cents, isAmount } from './money';

export interface Entry {
  account: string;
  amount: Cents;
  memo?: string;
}

export class Ledger {
  private entries: Entry[] = [];

  post(entry: Entry): void {
    if (!isAmount(entry.amount)) throw new Error(`Not an amount: ${entry.amount}`);
    this.entries.push(entry);
  }

  balance(account: string): Cents {
    let total = 0;
    for (const e of this.entries) {
      if (e.account === account) total += e.amount;
    }
    return total;
  }

  memoOf(index: number): string {
    const entry = this.entries[index];
    if (entry === undefined || entry.memo === undefined) return '';
    return entry.memo.trim();
  }

  accounts(): string[] {
    const { entries, ...rest } = this;
    void rest;
    return [...new Set(entries.map((e) => e.account))].sort();
  }

  retryDelay(attempt: number): number {
    const jitter = Math.random() * 100;
    return 2 ** attempt * 100 + jitter;
  }

  lastEntry(): Entry | undefined {
    let last: Entry | undefined;
    for (const e of this.entries) last = e;
    return last;
  }
}
