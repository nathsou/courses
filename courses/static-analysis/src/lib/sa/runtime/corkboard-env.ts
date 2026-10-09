/**
 * Type declarations for Corkboard's runtime: small, typed stand-ins for Express, a SQL database, the file system,
 * child processes, logging, hashing and `fetch`. Nothing here is ever executed against a real service; the
 * declarations let fixtures and the corpus type-check, and let type-aware rules ask real questions.
 */
export const CORKBOARD_ENV_FILE = '/corkboard-env.d.ts';

export const CORKBOARD_ENV = `
declare const console: { log(...args: unknown[]): void; warn(...args: unknown[]): void; error(...args: unknown[]): void };
declare function setTimeout(callback: () => void, ms?: number): number;
declare function fetch(url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }): Promise<{ status: number; text(): Promise<string>; json(): Promise<unknown> }>;
declare const process: { env: Record<string, string | undefined>; argv: string[]; exit(code?: number): never };
declare function require(id: string): any;
declare class URL { constructor(url: string, base?: string); readonly hostname: string; readonly pathname: string; readonly protocol: string; readonly searchParams: { get(name: string): string | null }; toString(): string }
declare const module: { exports: any };

declare module 'express' {
  export interface User { id: number; name: string; admin: boolean }
  export interface Request {
    query: Record<string, string | undefined>;
    params: Record<string, string>;
    body: any;
    headers: Record<string, string | undefined>;
    cookies: Record<string, string | undefined>;
    user?: User;
  }
  export interface CookieOptions { httpOnly?: boolean; secure?: boolean; sameSite?: 'strict' | 'lax' | 'none'; maxAge?: number }
  export interface Response {
    status(code: number): Response;
    send(body: string): Response;
    json(body: unknown): Response;
    redirect(url: string): void;
    sendFile(path: string): void;
    cookie(name: string, value: string, options?: CookieOptions): Response;
    set(header: string, value: string): Response;
  }
  export type Handler = (req: Request, res: Response, next?: () => void) => void | Promise<void>;
  export interface Router {
    get(path: string, ...handlers: Handler[]): Router;
    post(path: string, ...handlers: Handler[]): Router;
    put(path: string, ...handlers: Handler[]): Router;
    delete(path: string, ...handlers: Handler[]): Router;
    use(...handlers: (Handler | Router)[]): Router;
  }
  export interface Application extends Router { listen(port: number, callback?: () => void): void }
  interface Express {
    (): Application;
    Router(): Router;
    static(root: string): Handler;
    json(): Handler;
  }
  const express: Express;
  export function Router(): Router;
  export default express;
}

declare module 'db' {
  export interface Row { [column: string]: unknown }
  /** Runs SQL. Parameters bound with ? placeholders are never interpreted as SQL. */
  export function query<T = Row>(sql: string, params?: unknown[]): Promise<T[]>;
  /** Quotes a string for use inside a SQL string literal. */
  export function escape(value: string): string;
}

declare module 'fs' {
  export function readFileSync(path: string, encoding?: 'utf8'): string;
  export function writeFileSync(path: string, data: string): void;
  export function existsSync(path: string): boolean;
  export function unlinkSync(path: string): void;
  export function readdirSync(path: string): string[];
}

declare module 'path' {
  export function join(...parts: string[]): string;
  export function resolve(...parts: string[]): string;
  export function normalize(path: string): string;
  export function basename(path: string, ext?: string): string;
  export function extname(path: string): string;
  export const sep: string;
}

declare module 'child_process' {
  export function exec(command: string, callback?: (error: Error | null, stdout: string) => void): void;
  export function execFile(file: string, args: string[], callback?: (error: Error | null, stdout: string) => void): void;
}

declare module 'logger' {
  export function info(message: string): void;
  export function warn(message: string): void;
  export function error(message: string): void;
}

declare module 'crypto' {
  export function randomBytes(size: number): { toString(encoding: 'hex' | 'base64'): string };
  export function createHash(algorithm: 'md5' | 'sha1' | 'sha256'): { update(data: string): { digest(encoding: 'hex'): string } };
  export function randomUUID(): string;
}

declare module 'escape-html' {
  /** Replaces & < > " ' with HTML entities. */
  export default function escapeHtml(value: string): string;
}
`;
