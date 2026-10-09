/**
 * Reusing other rules. Counterpart of SonarJS's `rules/helpers/decorators/` (`interceptor.ts`, `merger.ts`).
 *
 * A *decorated* rule runs an existing ESLint rule but intercepts its reports: it can drop the ones it knows to be
 * false positives, rewrite the message, or add a suggestion. A *merged* rule runs several rules' listeners as one
 * rule (chapter 10).
 */
import type { Rule } from 'eslint';

export type ReportInterceptor = (context: Rule.RuleContext, descriptor: Rule.ReportDescriptor) => void;

/** Wraps `rule` so that each of its reports goes through `onReport`, which decides whether to report it. */
export function interceptReport(rule: Rule.RuleModule, onReport: ReportInterceptor): Rule.RuleModule {
  return {
    meta: rule.meta,
    create(original: Rule.RuleContext) {
      // The context is frozen; a new object inheriting from it can still have its own `report`.
      const context = Object.create(original, {
        report: { value: (descriptor: Rule.ReportDescriptor) => onReport(original, descriptor), writable: false },
      }) as Rule.RuleContext;
      return rule.create(context);
    },
  };
}

/** Runs several sets of listeners as one: each event is dispatched to every listener that handles it. */
export function mergeRules(...listeners: Rule.RuleListener[]): Rule.RuleListener {
  const merged: Record<string, (...args: unknown[]) => void> = {};
  for (const l of listeners) {
    for (const [event, handler] of Object.entries(l)) {
      if (typeof handler !== 'function') continue;
      const previous = merged[event];
      merged[event] = previous
        ? (...args: unknown[]) => {
            previous(...args);
            (handler as (...a: unknown[]) => void)(...args);
          }
        : (handler as (...a: unknown[]) => void);
    }
  }
  return merged as Rule.RuleListener;
}
