declare module 'espree' {
  export function parse(code: string, options?: Record<string, unknown>): unknown;
  export const version: string;
  export const latestEcmaVersion: number;
}
