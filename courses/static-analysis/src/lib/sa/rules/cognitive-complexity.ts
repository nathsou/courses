/**
 * Cognitive Complexity, per function: the course's implementation of the per-function part of SonarJS's S3776
 * (chapter 6). Structural increments (if, loops, switch, catch, conditional expressions) cost 1 plus the nesting
 * inside the function's own control flow; else, else if, labelled jumps and each change to a run of `&&` cost 1.
 * Like SonarJS at the pinned commit, `||` and `??` never add. (SonarJS also aggregates nested functions into a
 * per-file metric and exempts React components; neither is done here.)
 */
import type { AST, Rule } from 'eslint';
import type estree from 'estree';
import { getMainFunctionTokenLocation, report, toSecondaryLocation } from '../helpers/location.js';
import { generateMeta } from '../helpers/generate-meta.js';

type FunctionNode = estree.FunctionDeclaration | estree.FunctionExpression | estree.ArrowFunctionExpression;
type Point = { complexity: number; loc: AST.SourceLocation };

const message = 'Refactor this function to reduce its Cognitive Complexity from {{complexityAmount}} to the {{threshold}} allowed.';

export const rule: Rule.RuleModule = {
  meta: generateMeta({ sonarKey: 'S3776', hasSecondaries: true }, { messages: { refactorFunction: message }, schema: [{ type: 'number' }] }),
  create(context) {
    const threshold = typeof context.options[0] === 'number' ? context.options[0] : 15;
    const sourceCode = context.sourceCode;
    /** One entry per enclosing function: its increments and its current control-flow nesting. */
    const functions: { points: Point[]; nesting: number }[] = [];
    /** Nodes inside which the nesting grows (then/else blocks, loop bodies, cases, catch bodies, ternary branches). */
    const nestingNodes = new Set<estree.Node>();
    const current = () => functions[functions.length - 1];

    function structural(loc: AST.SourceLocation) {
      const f = current();
      if (f) f.points.push({ complexity: f.nesting + 1, loc });
    }
    function hybrid(loc: AST.SourceLocation) {
      current()?.points.push({ complexity: 1, loc });
    }
    const firstToken = (node: estree.Node) => sourceCode.getFirstToken(node)!.loc;

    function flatten(node: estree.Node, seen: Set<estree.Node>): estree.LogicalExpression[] {
      if (node.type !== 'LogicalExpression') return [];
      seen.add(node);
      return [...flatten(node.left, seen), node, ...flatten(node.right, seen)];
    }
    const counted = new Set<estree.Node>();

    return {
      ':function'() {
        functions.push({ points: [], nesting: 0 });
      },
      ':function:exit'(node: estree.Node) {
        const f = functions.pop()!;
        const total = f.points.reduce((n, p) => n + p.complexity, 0);
        if (total <= threshold) return;
        const loc = getMainFunctionTokenLocation(node as FunctionNode, (node as estree.Node & { parent?: estree.Node }).parent, context);
        report(
          context,
          { messageId: 'refactorFunction', message, data: { complexityAmount: String(total), threshold: String(threshold) }, loc: loc ?? node.loc! },
          f.points.map((p) => toSecondaryLocation({ loc: p.loc }, p.complexity === 1 ? '+1' : `+${p.complexity} (incl. ${p.complexity - 1} for nesting)`)),
          total - threshold,
        );
      },
      '*'(node: estree.Node) {
        if (nestingNodes.has(node) && current()) current()!.nesting++;
      },
      '*:exit'(node: estree.Node) {
        if (nestingNodes.has(node)) {
          if (current()) current()!.nesting--;
          nestingNodes.delete(node);
        }
      },
      IfStatement(node: estree.IfStatement) {
        const parent = (node as estree.IfStatement & { parent?: estree.Node }).parent;
        if (parent?.type === 'IfStatement' && parent.alternate === node) hybrid(firstToken(node));
        else structural(firstToken(node));
        nestingNodes.add(node.consequent);
        if (node.alternate && node.alternate.type !== 'IfStatement') {
          nestingNodes.add(node.alternate);
          hybrid(sourceCode.getTokenAfter(node.consequent)!.loc);
        }
      },
      'ForStatement, ForInStatement, ForOfStatement, WhileStatement, DoWhileStatement'(node: estree.ForStatement | estree.ForInStatement | estree.ForOfStatement | estree.WhileStatement | estree.DoWhileStatement) {
        structural(firstToken(node));
        nestingNodes.add(node.body);
      },
      SwitchStatement(node: estree.SwitchStatement) {
        structural(firstToken(node));
        for (const c of node.cases) nestingNodes.add(c);
      },
      CatchClause(node: estree.CatchClause) {
        structural(firstToken(node));
        nestingNodes.add(node.body);
      },
      ConditionalExpression(node: estree.ConditionalExpression) {
        structural(sourceCode.getTokenAfter(node.test)!.loc);
        nestingNodes.add(node.consequent);
        nestingNodes.add(node.alternate);
      },
      'BreakStatement, ContinueStatement'(node: estree.BreakStatement | estree.ContinueStatement) {
        if (node.label) hybrid(firstToken(node));
      },
      LogicalExpression(node: estree.LogicalExpression) {
        if (counted.has(node)) return;
        let previous: estree.LogicalExpression | undefined;
        for (const e of flatten(node, counted)) {
          if (e.operator !== '||' && e.operator !== '??' && previous?.operator !== e.operator) hybrid(sourceCode.getTokenAfter(e.left)!.loc);
          previous = e;
        }
      },
    } as Rule.RuleListener;
  },
};
