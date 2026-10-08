/**
 * A TypeScript language server for the rule workbench: TypeScript's own `LanguageService` behind the parts of the
 * Language Server Protocol that CodeMirror's `@codemirror/lsp-client` uses (completion, hover, signature help,
 * definition, references, rename, formatting, and pushed diagnostics). It runs in a Web Worker
 * (`worker.ts`) and in Vitest; it never touches a file system.
 *
 * The workspace is a fixed set of read-only files (TypeScript's library, the declarations of ESLint, ESTree,
 * TypeScript and regexpp, the course kit under /rules/helpers/) plus the documents the editors open.
 */
import ts from 'typescript';

export interface Message {
  jsonrpc: '2.0';
  id?: number | string;
  method?: string;
  params?: any;
  result?: unknown;
  error?: { code: number; message: string };
}

interface Position {
  line: number;
  character: number;
}

interface Doc {
  text: string;
  version: number;
}

export const COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  esModuleInterop: true,
  allowSyntheticDefaultImports: true,
  allowImportingTsExtensions: true,
  allowJs: true,
  checkJs: false,
  noEmit: true,
  skipLibCheck: true,
  lib: ['lib.es2022.d.ts'],
  types: [],
  // Every file is a module, so that two fixtures declaring the same top-level name do not clash.
  moduleDetection: ts.ModuleDetectionKind.Force,
};

const uriToPath = (uri: string) => decodeURIComponent(uri.replace(/^file:\/\//, ''));
const pathToUri = (p: string) => `file://${p}`;

/** Offsets of the start of each line. */
function lineStarts(text: string): number[] {
  const out = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) out.push(i + 1);
  return out;
}

function toOffset(text: string, pos: Position): number {
  const starts = lineStarts(text);
  const start = starts[Math.min(pos.line, starts.length - 1)] ?? 0;
  return Math.min(start + pos.character, text.length);
}

function toPosition(text: string, offset: number): Position {
  const starts = lineStarts(text);
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid]! <= offset) lo = mid;
    else hi = mid - 1;
  }
  return { line: lo, character: offset - starts[lo]! };
}

const KIND: Record<string, number> = {
  [ts.ScriptElementKind.primitiveType]: 14,
  [ts.ScriptElementKind.keyword]: 14,
  [ts.ScriptElementKind.variableElement]: 6,
  [ts.ScriptElementKind.localVariableElement]: 6,
  [ts.ScriptElementKind.constElement]: 21,
  [ts.ScriptElementKind.letElement]: 6,
  [ts.ScriptElementKind.parameterElement]: 6,
  [ts.ScriptElementKind.memberVariableElement]: 10,
  [ts.ScriptElementKind.memberGetAccessorElement]: 10,
  [ts.ScriptElementKind.memberSetAccessorElement]: 10,
  [ts.ScriptElementKind.functionElement]: 3,
  [ts.ScriptElementKind.localFunctionElement]: 3,
  [ts.ScriptElementKind.memberFunctionElement]: 2,
  [ts.ScriptElementKind.constructorImplementationElement]: 4,
  [ts.ScriptElementKind.classElement]: 7,
  [ts.ScriptElementKind.interfaceElement]: 8,
  [ts.ScriptElementKind.typeElement]: 25,
  [ts.ScriptElementKind.enumElement]: 13,
  [ts.ScriptElementKind.enumMemberElement]: 20,
  [ts.ScriptElementKind.moduleElement]: 9,
  [ts.ScriptElementKind.alias]: 6,
  [ts.ScriptElementKind.string]: 12,
};

export interface ServerOptions {
  send: (m: Message) => void;
  /** Read-only files of the workspace: absolute path → contents. */
  files: Map<string, string>;
  /** Debounce for diagnostics after a change, in ms (0 = synchronous, for tests). */
  diagnosticsDelay?: number;
}

export class TypeScriptLanguageServer {
  private docs = new Map<string, Doc>();
  private service: ts.LanguageService;
  private pending = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(private readonly opts: ServerOptions) {
    const host: ts.LanguageServiceHost = {
      getCompilationSettings: () => COMPILER_OPTIONS,
      getScriptFileNames: () => [...this.docs.keys(), ...[...opts.files.keys()].filter((f) => f.startsWith('/rules/') || f === '/corkboard-env.d.ts' || f === '/workbench-test.d.ts')],
      getScriptVersion: (f) => String(this.docs.get(f)?.version ?? 0),
      getScriptSnapshot: (f) => {
        const text = this.read(f);
        return text === undefined ? undefined : ts.ScriptSnapshot.fromString(text);
      },
      getCurrentDirectory: () => '/',
      getDefaultLibFileName: () => '/lib/lib.es2022.d.ts',
      fileExists: (f) => this.read(f) !== undefined,
      readFile: (f) => this.read(f),
      directoryExists: (d) => {
        const prefix = d.endsWith('/') ? d : `${d}/`;
        const shared = prefix.replace(/^\/ex\/[^/]+/, '');
        return [...this.docs.keys(), ...opts.files.keys()].some((f) => f.startsWith(prefix) || f.startsWith(shared));
      },
      getDirectories: () => [],
      useCaseSensitiveFileNames: () => true,
    };
    this.service = ts.createLanguageService(host, ts.createDocumentRegistry(true, '/'));
  }

  /**
   * Documents of an exercise live under `/ex/<exercise>/…` so that two exercises on a page never share a file;
   * everything that is not one of the exercise's own documents (the kit, Corkboard's declarations) falls back
   * to the shared read-only files.
   */
  private read(path: string): string | undefined {
    const doc = this.docs.get(path);
    if (doc) return doc.text;
    return this.opts.files.get(path) ?? this.opts.files.get(path.replace(/^\/ex\/[^/]+/, ''));
  }

  /** Handles one incoming JSON-RPC message (request or notification). */
  handle(m: Message): void {
    let result: unknown;
    try {
      result = this.dispatch(m);
    } catch (e) {
      if (m.id !== undefined) this.opts.send({ jsonrpc: '2.0', id: m.id, error: { code: -32603, message: e instanceof Error ? e.message : String(e) } });
      return;
    }
    if (m.id !== undefined && m.method) this.opts.send({ jsonrpc: '2.0', id: m.id, result: result ?? null });
  }

  private dispatch(m: Message): unknown {
    const p = m.params;
    switch (m.method) {
      case 'initialize':
        return {
          capabilities: {
            textDocumentSync: { openClose: true, change: 1 },
            completionProvider: { triggerCharacters: ['.', '"', "'", '/', '@'] },
            hoverProvider: true,
            signatureHelpProvider: { triggerCharacters: ['(', ','] },
            definitionProvider: true,
            typeDefinitionProvider: true,
            referencesProvider: true,
            renameProvider: true,
            documentFormattingProvider: true,
          },
          serverInfo: { name: 'workbench-typescript', version: ts.version },
        };
      case 'initialized':
      case '$/cancelRequest':
      case '$/setTrace':
      case 'workspace/didChangeConfiguration':
        return undefined;
      case 'shutdown':
        return null;
      case 'textDocument/didOpen':
        this.docs.set(uriToPath(p.textDocument.uri), { text: p.textDocument.text, version: 1 });
        this.scheduleDiagnostics(p.textDocument.uri);
        return undefined;
      case 'textDocument/didChange': {
        const path = uriToPath(p.textDocument.uri);
        const doc = this.docs.get(path);
        const last = p.contentChanges[p.contentChanges.length - 1];
        if (doc && last) {
          doc.text = last.text;
          doc.version++;
        }
        this.scheduleDiagnostics(p.textDocument.uri);
        return undefined;
      }
      case 'textDocument/didClose':
        this.docs.delete(uriToPath(p.textDocument.uri));
        return undefined;
      case 'textDocument/hover':
        return this.hover(p.textDocument.uri, p.position);
      case 'textDocument/completion':
        return this.completion(p.textDocument.uri, p.position);
      case 'textDocument/signatureHelp':
        return this.signatureHelp(p.textDocument.uri, p.position);
      case 'textDocument/definition':
      case 'textDocument/declaration':
        return this.locations(this.service.getDefinitionAtPosition(uriToPath(p.textDocument.uri), this.offset(p.textDocument.uri, p.position)));
      case 'textDocument/typeDefinition':
        return this.locations(this.service.getTypeDefinitionAtPosition(uriToPath(p.textDocument.uri), this.offset(p.textDocument.uri, p.position)));
      case 'textDocument/references':
        return this.locations(this.service.getReferencesAtPosition(uriToPath(p.textDocument.uri), this.offset(p.textDocument.uri, p.position)));
      case 'textDocument/rename':
        return this.rename(p.textDocument.uri, p.position, p.newName);
      case 'textDocument/formatting':
        return this.format(p.textDocument.uri);
      default:
        if (m.id !== undefined) throw new Error(`Unsupported method ${m.method}`);
        return undefined;
    }
  }

  private offset(uri: string, pos: Position): number {
    return toOffset(this.read(uriToPath(uri)) ?? '', pos);
  }

  private range(path: string, start: number, length: number) {
    const text = this.read(path) ?? '';
    return { start: toPosition(text, start), end: toPosition(text, start + length) };
  }

  private hover(uri: string, pos: Position) {
    const path = uriToPath(uri);
    const info = this.service.getQuickInfoAtPosition(path, this.offset(uri, pos));
    if (!info) return null;
    const signature = ts.displayPartsToString(info.displayParts);
    const docs = ts.displayPartsToString(info.documentation);
    const tags = (info.tags ?? []).map((t) => `*@${t.name}* ${ts.displayPartsToString(t.text)}`).join('\n\n');
    return {
      contents: { kind: 'markdown', value: ['```typescript\n' + signature + '\n```', docs, tags].filter(Boolean).join('\n\n') },
      range: this.range(path, info.textSpan.start, info.textSpan.length),
    };
  }

  private completion(uri: string, pos: Position) {
    const path = uriToPath(uri);
    const offset = this.offset(uri, pos);
    const list = this.service.getCompletionsAtPosition(path, offset, { includeCompletionsWithInsertText: true, includeAutomaticOptionalChainCompletions: true });
    if (!list) return null;
    // The client does not resolve items, so details go with small (member) lists only.
    const detailed = list.entries.length <= 150;
    const items = list.entries.map((e) => {
      const item: Record<string, unknown> = { label: e.name, kind: KIND[e.kind] ?? 1, sortText: e.sortText };
      if (e.insertText) item.insertText = e.insertText;
      if (e.replacementSpan) item.textEdit = { range: this.range(path, e.replacementSpan.start, e.replacementSpan.length), newText: e.insertText ?? e.name };
      if (detailed) {
        const d = this.service.getCompletionEntryDetails(path, offset, e.name, undefined, e.source, undefined, e.data);
        if (d) {
          item.detail = ts.displayPartsToString(d.displayParts);
          const doc = ts.displayPartsToString(d.documentation);
          if (doc) item.documentation = { kind: 'markdown', value: doc };
        }
      }
      return item;
    });
    return { isIncomplete: false, items };
  }

  private signatureHelp(uri: string, pos: Position) {
    const help = this.service.getSignatureHelpItems(uriToPath(uri), this.offset(uri, pos), undefined);
    if (!help) return null;
    return {
      activeSignature: help.selectedItemIndex,
      activeParameter: help.argumentIndex,
      signatures: help.items.map((it) => ({
        label: ts.displayPartsToString(it.prefixDisplayParts) + it.parameters.map((p) => ts.displayPartsToString(p.displayParts)).join(ts.displayPartsToString(it.separatorDisplayParts)) + ts.displayPartsToString(it.suffixDisplayParts),
        documentation: { kind: 'markdown', value: ts.displayPartsToString(it.documentation) },
        parameters: it.parameters.map((p) => ({ label: ts.displayPartsToString(p.displayParts), documentation: ts.displayPartsToString(p.documentation) })),
      })),
    };
  }

  private locations(spans: readonly { fileName: string; textSpan: ts.TextSpan }[] | undefined) {
    return (spans ?? []).map((s) => ({ uri: pathToUri(s.fileName), range: this.range(s.fileName, s.textSpan.start, s.textSpan.length) }));
  }

  private rename(uri: string, pos: Position, newName: string) {
    const path = uriToPath(uri);
    const offset = this.offset(uri, pos);
    const info = this.service.getRenameInfo(path, offset, {});
    if (!info.canRename) throw new Error(info.localizedErrorMessage);
    const locs = this.service.findRenameLocations(path, offset, false, false, {}) ?? [];
    const changes: Record<string, { range: unknown; newText: string }[]> = {};
    for (const l of locs) {
      // Only the reader's documents can be edited.
      if (!this.docs.has(l.fileName)) continue;
      (changes[pathToUri(l.fileName)] ??= []).push({ range: this.range(l.fileName, l.textSpan.start, l.textSpan.length), newText: `${l.prefixText ?? ''}${newName}${l.suffixText ?? ''}` });
    }
    return { changes };
  }

  private format(uri: string) {
    const path = uriToPath(uri);
    const edits = this.service.getFormattingEditsForDocument(path, { indentSize: 2, tabSize: 2, convertTabsToSpaces: true, insertSpaceAfterCommaDelimiter: true, semicolons: ts.SemicolonPreference.Insert } as ts.FormatCodeSettings);
    return edits.map((e) => ({ range: this.range(path, e.span.start, e.span.length), newText: e.newText }));
  }

  /** Syntactic and semantic diagnostics of an open document, in LSP form. */
  diagnostics(uri: string) {
    const path = uriToPath(uri);
    // Fixtures are deliberately buggy code: only their syntax errors are shown (hover still gives their types).
    const semantic = /\/fixtures\//.test(path) ? [] : this.service.getSemanticDiagnostics(path);
    const all = [...this.service.getSyntacticDiagnostics(path), ...semantic];
    return all.map((d) => ({
      range: this.range(path, d.start ?? 0, d.length ?? 0),
      severity: d.category === ts.DiagnosticCategory.Error ? 1 : d.category === ts.DiagnosticCategory.Warning ? 2 : 3,
      source: 'ts',
      code: d.code,
      message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
    }));
  }

  private scheduleDiagnostics(uri: string) {
    const publish = () => {
      this.pending.delete(uri);
      if (!this.docs.has(uriToPath(uri))) return;
      this.opts.send({ jsonrpc: '2.0', method: 'textDocument/publishDiagnostics', params: { uri, version: this.docs.get(uriToPath(uri))?.version, diagnostics: this.diagnostics(uri) } });
    };
    const delay = this.opts.diagnosticsDelay ?? 300;
    if (delay === 0) return publish();
    clearTimeout(this.pending.get(uri));
    this.pending.set(uri, setTimeout(publish, delay));
  }
}
