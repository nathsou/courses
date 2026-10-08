/**
 * Reporting issues with secondary locations. Counterpart of SonarJS's `rules/helpers/location.ts`.
 *
 * ESLint's `context.report` knows one location per issue. SonarQube issues have a primary location, any number of
 * secondary locations (each with an optional message) and an optional cost (the estimated effort to fix). When the
 * rule runs inside the analyser, `settings.sonarRuntime` is true and `report` packs all of that into the message as
 * JSON, under the message id `sonarRuntime`; the analyser decodes it again. Run as a plain ESLint rule, `report`
 * falls back to an ordinary message. Chapter 5 takes this apart.
 */
import type { AST, Rule } from 'eslint';
import type estree from 'estree';

export type LocationHolder = AST.Token | estree.Node | { loc?: AST.SourceLocation | null };

export interface IssueLocation {
  line: number;
  column: number;
  endLine: number;
  endColumn: number;
  message?: string;
}

export interface EncodedMessage {
  message: string;
  secondaryLocations: IssueLocation[];
  cost?: number;
}

export function encodeContents(message: string, secondaryLocations: IssueLocation[] = [], cost?: number): string {
  return JSON.stringify({ message, secondaryLocations, cost } satisfies EncodedMessage);
}

/** Replaces `{{key}}` placeholders in a message with the report's data. */
export function expandMessage(message: string, data: Record<string, unknown> | undefined): string {
  let out = message;
  for (const [k, v] of Object.entries(data ?? {})) out = out.split(`{{${k}}}`).join(String(v));
  return out;
}

/** A secondary location spanning `start` (to `end`, if given), with an optional message. */
export function toSecondaryLocation(start: LocationHolder, end?: LocationHolder | string, message?: string): IssueLocation {
  if (!start.loc) throw new Error('Invalid secondary location: the node has no location');
  const endLoc = typeof end === 'object' && end.loc ? end.loc : start.loc;
  return {
    message: typeof end === 'string' ? end : message,
    line: start.loc.start.line,
    column: start.loc.start.column,
    endLine: endLoc.end.line,
    endColumn: endLoc.end.column,
  };
}

/**
 * Reports an issue. Use it instead of `context.report` whenever the issue has secondary locations or a cost.
 * The descriptor must carry `message` (the text) even when it also names a `messageId`.
 */
export function report(context: Rule.RuleContext, descriptor: Rule.ReportDescriptor & { message?: string }, secondaryLocations: IssueLocation[] = [], cost?: number): void {
  const { message, data } = descriptor as { message?: string; data?: Record<string, unknown> };
  if (context.settings.sonarRuntime) {
    if (message === undefined) throw new Error('report(): "message" is required to encode an issue for the analyser');
    const { message: _m, messageId: _id, ...rest } = descriptor as Record<string, unknown>;
    context.report({ ...rest, messageId: 'sonarRuntime', data: { ...data, sonarRuntimeData: encodeContents(expandMessage(message, data), secondaryLocations, cost) } } as Rule.ReportDescriptor);
  } else if (message !== undefined && 'messageId' in descriptor) {
    const { message: _m, ...rest } = descriptor as Record<string, unknown>;
    context.report(rest as Rule.ReportDescriptor);
  } else if (message !== undefined) {
    const { data: _d, ...rest } = descriptor as Record<string, unknown>;
    context.report({ ...rest, message: expandMessage(message, data) } as Rule.ReportDescriptor);
  } else {
    context.report(descriptor);
  }
}

/** Decodes a message produced by {@link report} under `sonarRuntime` (what the analyser does with every issue). */
export function decodeMessage(raw: string): EncodedMessage {
  const parsed = JSON.parse(raw) as EncodedMessage;
  return { message: parsed.message, secondaryLocations: parsed.secondaryLocations ?? [], cost: parsed.cost };
}
