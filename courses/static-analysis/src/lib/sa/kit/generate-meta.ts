/**
 * Rule metadata. Counterpart of SonarJS's `rules/helpers/generate-meta.ts`.
 *
 * In SonarJS, a rule's `meta.ts` says how the rule is implemented (`implementation`, `eslintId`, `hasSecondaries`,
 * `quickFixMessage`, …) and its generated `generated-meta.ts` adds what RSPEC says about it (`meta.type`,
 * `meta.docs`, `sonarKey`, `scope`, `languages`, …). The rule then writes
 *
 *     import * as meta from './generated-meta.js';
 *     export const rule = { meta: generateMeta(meta, { messages: { … } }), create(context) { … } };
 *
 * and `generateMeta` merges the two. The course's version takes the same kind of object (only `sonarKey` is
 * required), so `generateMeta({ sonarKey: 'S1764', hasSecondaries: true }, …)` also works.
 */
import type { Rule } from 'eslint';

export interface SonarMeta {
  /** The rule key, e.g. 'S1764'. */
  sonarKey: string;
  /** The ESLint name the rule has in eslint-plugin-sonarjs, e.g. 'no-identical-expressions'. */
  eslintId?: string;
  implementation?: 'original' | 'decorated' | 'external';
  /** Does the rule report secondary locations (so it needs the `sonarRuntime` message)? */
  hasSecondaries?: boolean;
  /** The text of the automatic fix, for fixable rules. */
  quickFixMessage?: string;
  /** What RSPEC says about the rule (in SonarJS, generated from it). */
  meta?: Partial<Rule.RuleMetaData>;
}

export function generateMeta(sonarMeta: SonarMeta, ruleMeta: Partial<Rule.RuleMetaData> = {}): Rule.RuleMetaData {
  if (ruleMeta.fixable && !sonarMeta.quickFixMessage) {
    throw new Error(`Rule ${sonarMeta.sonarKey} is marked as fixable but no quick fix message is provided.`);
  }
  // The RSPEC side wins for documentation; the implementation decides `fixable`.
  const metadata: Rule.RuleMetaData = {
    type: 'problem',
    ...ruleMeta,
    ...sonarMeta.meta,
    docs: { url: `https://sonarsource.github.io/rspec/#/rspec/${sonarMeta.sonarKey}/javascript`, ...ruleMeta.docs, ...sonarMeta.meta?.docs },
    schema: sonarMeta.meta?.schema ?? ruleMeta.schema,
  };
  metadata.fixable = ruleMeta.fixable;
  metadata.messages = { ...(ruleMeta.messages ?? {}), ...(sonarMeta.meta?.messages ?? {}) };
  if (sonarMeta.hasSecondaries) metadata.messages.sonarRuntime = '{{sonarRuntimeData}}';
  return metadata;
}
