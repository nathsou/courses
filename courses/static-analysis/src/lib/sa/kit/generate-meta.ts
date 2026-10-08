/**
 * Rule metadata. Counterpart of SonarJS's `rules/helpers/generate-meta.ts`.
 *
 * In SonarJS, each rule's `generated-meta.ts` is produced from its RSPEC entry (the rule's specification:
 * title, type, default severity, tags, whether it is in the Sonar way profile, whether it has a quick fix) and merged
 * with the metadata the rule itself declares. The course's version takes the RSPEC part as an argument.
 */
import type { Rule } from 'eslint';

export interface SonarMeta {
  /** The rule key, e.g. 'S1764'. */
  sonarKey: string;
  /** The ESLint name the rule has in eslint-plugin-sonarjs, e.g. 'no-identical-expressions'. */
  eslintId?: string;
  /** Does the rule report secondary locations (so it needs the `sonarRuntime` message)? */
  hasSecondaries?: boolean;
  /** The text of the quick fix, for auto-fixable rules. */
  quickFixMessage?: string;
  type?: 'problem' | 'suggestion' | 'layout';
  description?: string;
}

export function generateMeta(sonar: SonarMeta, ruleMeta: Partial<Rule.RuleMetaData> = {}): Rule.RuleMetaData & { sonarKey: string } {
  const messages = { ...(ruleMeta.messages ?? {}) };
  if (sonar.hasSecondaries) messages.sonarRuntime = '{{sonarRuntimeData}}';
  return {
    type: sonar.type ?? 'problem',
    ...ruleMeta,
    docs: { description: sonar.description ?? '', url: `https://sonarsource.github.io/rspec/#/rspec/${sonar.sonarKey}/javascript`, ...(ruleMeta.docs ?? {}) },
    messages,
    sonarKey: sonar.sonarKey,
  };
}
