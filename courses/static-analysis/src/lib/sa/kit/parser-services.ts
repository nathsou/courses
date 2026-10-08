/**
 * Type information. Counterpart of SonarJS's `rules/helpers/parser-services.ts`.
 *
 * typescript-eslint hands rules a `parserServices` object. It always exists, but it only carries a TypeScript
 * program (and the maps between ESTree nodes and TypeScript nodes) when the file was parsed with one. A rule that
 * needs types checks first and stays silent otherwise.
 */
import type ts from 'typescript';
import type estree from 'estree';

export interface RequiredParserServices {
  program: ts.Program;
  esTreeNodeToTSNodeMap: { get(node: estree.Node): ts.Node };
  tsNodeToESTreeNodeMap: { get(node: ts.Node): estree.Node };
  hasFullTypeInformation?: boolean;
}

export function isRequiredParserServices(services: unknown): services is RequiredParserServices {
  const s = services as Partial<RequiredParserServices> | undefined;
  return !!s && !!s.program && !!s.esTreeNodeToTSNodeMap;
}
