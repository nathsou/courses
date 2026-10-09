/**
 * The TypeScript language server in a Web Worker. Messages are JSON strings (the transport format of
 * @codemirror/lsp-client).
 */
import '../runtime/shims.js';
import { TypeScriptLanguageServer, type Message } from './server.js';
import { loadWorkspaceFiles } from './workspace.js';

const queue: Message[] = [];
let server: TypeScriptLanguageServer | undefined;

addEventListener('message', (e: MessageEvent<string>) => {
  const m = JSON.parse(e.data) as Message;
  if (server) server.handle(m);
  else queue.push(m);
});

loadWorkspaceFiles().then((files) => {
  server = new TypeScriptLanguageServer({ files, send: (m) => postMessage(JSON.stringify(m)) });
  for (const m of queue.splice(0)) server.handle(m);
});
