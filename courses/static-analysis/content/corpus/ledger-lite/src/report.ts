import { Ledger } from './ledger';
import { formatCents } from './money';

export function report(ledger: Ledger): string {
  const lines: string[] = [];
  let width = 0;
  for (const account of ledger.accounts()) width = Math.max(width, account.length);
  for (const account of ledger.accounts()) {
    lines.push(`${account.padEnd(width)}  ${formatCents(ledger.balance(account))}`);
  }
  return lines.join('\n');
}

export function status(ledger: Ledger, account: string): 'credit' | 'debit' | 'zero' {
  const b = ledger.balance(account);
  if (b > 0) return 'credit';
  if (b < 0) return 'debit';
  return 'zero';
}

export function normalise(input: string): string {
  let s = input;
  s = s.trim();
  s = s.toLowerCase();
  return s;
}
