/**
 * The page's side of the TypeScript language server: one worker and one LSP client per page, shared by every
 * editor. Each exercise opens its documents under `/ex/<exercise id>/…`. Jumping to a definition in another file
 * (the kit) asks the workbench of that exercise to show it.
 */
import type { LSPClient, Workspace, WorkspaceFile } from '@codemirror/lsp-client';
import type { EditorView } from '@codemirror/view';

type DisplayHandler = (uri: string) => Promise<EditorView | null>;

let shared: Promise<LSPClient> | undefined;
const displays = new Map<string, DisplayHandler>();

/**
 * Registers the workbench that shows files of exercise `slug` (URIs `file:///ex/<slug>/…`), for jumps to a
 * definition in another file. Returns the unregister function.
 */
export function registerDisplay(slug: string, handler: DisplayHandler): () => void {
  displays.set(slug, handler);
  return () => {
    if (displays.get(slug) === handler) displays.delete(slug);
  };
}

export function lspClient(): Promise<LSPClient> {
  shared ??= create();
  return shared;
}

async function create(): Promise<LSPClient> {
  const lsp = await import('@codemirror/lsp-client');
  const worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: 'typescript-language-server' });
  let handlers: ((m: string) => void)[] = [];
  worker.onmessage = (e: MessageEvent<string>) => {
    for (const h of handlers) h(e.data);
  };

  class File implements WorkspaceFile {
    constructor(
      readonly uri: string,
      readonly languageId: string,
      public version: number,
      public doc: import('@codemirror/state').Text,
      readonly view: EditorView,
    ) {}
    getView() {
      return this.view;
    }
  }

  /** Like the library's default workspace, plus cross-file display through the focused workbench. */
  class CourseWorkspace extends lsp.Workspace {
    files: File[] = [];
    private versions: Record<string, number> = {};
    private next(uri: string) {
      return (this.versions[uri] = (this.versions[uri] ?? -1) + 1);
    }
    syncFiles() {
      const out = [];
      for (const file of this.files) {
        const plugin = lsp.LSPPlugin.get(file.view);
        if (!plugin) continue;
        const changes = plugin.unsyncedChanges;
        if (!changes.empty) {
          out.push({ changes, file, prevDoc: file.doc });
          file.doc = file.view.state.doc;
          file.version = this.next(file.uri);
          plugin.clear();
        }
      }
      return out;
    }
    openFile(uri: string, languageId: string, view: EditorView) {
      const existing = this.getFile(uri) as File | null;
      if (existing) {
        // A remounted editor for the same document replaces the old one.
        this.files = this.files.filter((f) => f !== existing);
        this.client.didClose(uri);
      }
      const file = new File(uri, languageId, this.next(uri), view.state.doc, view);
      this.files.push(file);
      this.client.didOpen(file);
    }
    closeFile(uri: string, view: EditorView) {
      const file = this.files.find((f) => f.uri === uri && f.view === view);
      if (!file) return;
      this.files = this.files.filter((f) => f !== file);
      this.client.didClose(uri);
    }
    async displayFile(uri: string) {
      const open = this.files.find((f) => f.uri === uri);
      if (open) return open.view;
      const slug = /^file:\/\/\/ex\/([^/]+)\//.exec(uri)?.[1];
      const handler = slug ? displays.get(slug) : undefined;
      return handler ? handler(uri) : null;
    }
  }

  const client = new lsp.LSPClient({
    rootUri: 'file:///',
    timeout: 15_000,
    extensions: lsp.languageServerExtensions(),
    workspace: (c) => new CourseWorkspace(c) as unknown as Workspace,
  });
  client.connect({
    send: (m) => worker.postMessage(m),
    subscribe: (h) => handlers.push(h),
    unsubscribe: (h) => (handlers = handlers.filter((x) => x !== h)),
  });
  return client;
}
