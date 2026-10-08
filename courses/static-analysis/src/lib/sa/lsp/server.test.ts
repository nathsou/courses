import { describe, expect, test } from 'vitest';
import { TypeScriptLanguageServer, type Message } from './server.js';
import { loadWorkspaceFiles } from './workspace.js';

async function setup() {
  const sent: Message[] = [];
  const server = new TypeScriptLanguageServer({ files: await loadWorkspaceFiles(), send: (m) => sent.push(m), diagnosticsDelay: 0 });
  let id = 0;
  const request = (method: string, params: unknown) => {
    const myId = ++id;
    server.handle({ jsonrpc: '2.0', id: myId, method, params });
    return sent.find((m) => m.id === myId)!;
  };
  return { server, sent, request };
}

const URI = 'file:///ex/ch3-identical/rules/S1764/rule.ts';
const RULE = `import type { Rule } from 'eslint';
import { areEquivalent } from '../helpers/equivalence.js';
export const rule: Rule.RuleModule = {
  create(context) {
    return {
      BinaryExpression(node) {
        if (areEquivalent(node.left, node.right, context.sourceCode)) context.report({ node, message: 'x' });
      },
    };
  },
};
const n: number = 'oops';
`;

describe('TypeScript language server', () => {
  test('diagnostics, hover, completion, definition', async () => {
    const { server, sent, request } = await setup();
    expect((request('initialize', {}).result as any).capabilities.hoverProvider).toBe(true);
    server.handle({ jsonrpc: '2.0', method: 'textDocument/didOpen', params: { textDocument: { uri: URI, languageId: 'typescript', version: 1, text: RULE } } });
    const diags = sent.find((m) => m.method === 'textDocument/publishDiagnostics')!.params.diagnostics;
    expect(diags.map((d: any) => d.message)).toEqual(["Type 'string' is not assignable to type 'number'."]);

    // Hover over areEquivalent shows its documentation from the kit.
    const hover = request('textDocument/hover', { textDocument: { uri: URI }, position: { line: 6, character: 14 } }).result as any;
    expect(hover.contents.value).toContain('areEquivalent');

    // Completion after `context.`
    const text = RULE.replace("context.sourceCode)", "context.)");
    server.handle({ jsonrpc: '2.0', method: 'textDocument/didChange', params: { textDocument: { uri: URI, version: 2 }, contentChanges: [{ text }] } });
    const line = text.split('\n')[6]!;
    const comp = request('textDocument/completion', { textDocument: { uri: URI }, position: { line: 6, character: line.indexOf('context.)') + 8 } }).result as any;
    const labels = comp.items.map((i: any) => i.label);
    expect(labels).toContain('sourceCode');
    expect(labels).toContain('report');

    // Definition of areEquivalent jumps into the kit.
    const def = request('textDocument/definition', { textDocument: { uri: URI }, position: { line: 1, character: 10 } }).result as any[];
    expect(def[0].uri).toBe('file:///ex/ch3-identical/rules/helpers/equivalence.ts');
  });
});
