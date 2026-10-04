# Vouch: the language, its semantics and its language server

Vouch is the course's language. Readers meet it in chapter 0 and look it up in appendix B
(`content/appendices/b-vouch-reference/index.md`), which is the reader-facing reference and whose examples are
checked by `tools/markdown/reference.test.ts`. This document is for people working on the toolchain: what the
language means, where each part lives, and how the language server is put together.

## Design rules

1. **One language, four kinds of declaration.** Functions with contracts (`fn`, `pure fn`, `pred`, `lemma`),
   systems (`system`: state machines and processes), worlds (`world`: relational models) and problems
   (`problem`: constraint problems). Every engine reads the same AST and the same type information.
2. **The interpreter is the definition.** `src/lib/fv/vouch/interp` is the reference semantics. Every other
   engine is tested against it, and every counterexample an engine reports is replayed on it before it is shown.
   If an engine and the interpreter disagree, the engine is wrong.
3. **Close to real tools.** Contracts read like Dafny's, systems like TLA+'s actions, worlds like Alloy's
   signatures, so that what the reader writes transfers (appendix E shows the correspondences).
4. **Honest about limits.** A construct an engine does not handle produces an *unknown* or a fallback to testing
   with a reason, never a silent pass.

## Pipeline

| Stage | Directory | Notes |
|---|---|---|
| Lexer | `vouch/syntax/lexer.ts` | no semicolons: NEWLINE tokens only where a statement can end; Unicode spellings (∀ ∃ ⟹ ≤ ↦ ∗ …) map to ASCII tokens |
| Parser | `vouch/syntax/parser.ts`, `ast.ts` | recursive descent with error recovery; precedence table in appendix B |
| Type checker | `vouch/check/checker.ts`, `types.ts` | produces `Checked`: the program, diagnostics, and per-declaration info (`fns`, `containers`) |
| Interpreter | `vouch/interp/` | `exec.ts` runs functions with run-time contracts; `system.ts` runs systems (`SystemRuntime`: initial states, successors, keys for hashing) |
| VC generator | `vouch/vc/` | weakest preconditions to proof obligations for the SMT solver; `verify.ts` is the program verifier |
| Language server | `vouch/lsp/` | `server.ts` (protocol-independent), `worker.ts` (browser), `stdio.ts` (command line) |
| Engines | `src/lib/fv/<engine>/` | see appendix C; `verify/document.ts` decides which engines run on which declaration |

## Types and their semantics

From `vouch/check/types.ts`:

- `int` is unbounded. `nat` is `int` with an obligation that assigned values are non-negative. A range `lo..hi`
  (exclusive) or `lo..=hi` (inclusive) is a finite integer type; assigning outside it is an obligation, and the
  explorer reports it as a failure.
- Machine integers `i8`…`i64`, `u8`…`u64`: every operation that can overflow is an obligation in executable code
  (the interpreter fails, the verifier generates a `no overflow` obligation). In specifications, arithmetic on
  them is mathematical.
- Bit-vectors `bv1`…`bv64` wrap silently; signed comparisons and division are functions (`slt`, `sdiv`, `ashr`, …);
  conversions only with `as`.
- Division and remainder truncate towards zero, as in C, Java and Rust; division by zero is an obligation.
- Sequences `[T]` are values (copy semantics); `inout` parameters are the only way a function changes its
  caller's data, apart from heap objects. Sets, multisets and maps are values too.
- `type T` declares atoms, with equality only. In systems, `instance T = n` fixes their number; `symmetric type T`
  lets the explorer reduce by symmetry. In worlds, the scope of a command bounds them.
- `ref C` and `ref C?` are references to `class` objects on a heap, for the separation-logic verifier.

## Functions and contracts

- `requires`, `ensures`, `decreases`, `modifies`/`reads` (heap frames); `old(e)` in postconditions; named results
  (`-> (r: T)`) or `result`.
- `pure fn` and `pred` may be used in specifications; they must terminate (`decreases` when recursive).
- `lemma` bodies are proofs and are erased at run time. `ghost` variables and parameters are erased too; the checker
  rejects ghost code that writes real state (`ghost/write`).
- `assume` is allowed in the language and forbidden in exercises (see `forbidden` in
  `src/lib/components/exercise/vouch/check.ts`).
- The verifier checks that preconditions are satisfiable: a vacuous contract is reported as *unknown*, with the
  message "Vacuous", instead of *verified*.

## Systems

- State variables with initial values; `init { … }` for more complex initial states; `fact`s constrain them.
- `action a(params) when guard { body }`: a step, enabled when the guard holds, for any parameter values in their
  (finite) types. Actions execute atomically.
- `process P(id: T) { … }`: one process per value of `id`; labels split the body into atomic steps; `await c`
  blocks; `P(i) at l` tests a process's position. Processes and actions interleave.
- `invariant` (state predicates), `property` (LTL: `always`, `eventually`, `next`, `until`, `~>`), `fairness weak`
  and `fairness strong` on actions or processes.
- `refines S via { v = e, … }`: refinement, with stuttering, under the given mapping (default: same-named variables).

## Worlds and problems

- Worlds: atom types, `rel` declarations with multiplicities, relational operators (join `.`, closure `^` and `*`,
  converse `~`), `fact`s, and `check P for n` / `run P for n` commands, encoded into SAT by `relational/`.
- Problems: finite variables, `constraint`s, then `solve` or `count`, encoded into SAT by `problem/`.

## The language server

`VouchLanguageServer` in `vouch/lsp/server.ts` implements the protocol over plain JSON messages, so the same code
runs in a Web Worker in the browser (`worker.ts`, used by the Workbench and every editor widget through
`@codemirror/lsp-client`) and over stdio on the command line (`stdio.ts`).

Capabilities: diagnostics (parse and type errors, then engine verdicts as they arrive, each with its badge),
hover (types, documentation comments, verdict details), completion, signature help, go to definition, find
references, rename, document symbols, semantic tokens, inlay hints (the inferred types of `let` bindings) and
quick fixes. Verification runs after the document stops changing and is cancelled by the next
change.

### Using it in an editor

Run the server with `npm run vouch -- lsp --stdio` in `courses/formal-verification`. Any editor with a generic
LSP client can use it:

- **Neovim** (0.10 or later):
  ```lua
  vim.filetype.add({ extension = { vouch = 'vouch' } })
  vim.api.nvim_create_autocmd('FileType', {
    pattern = 'vouch',
    callback = function()
      vim.lsp.start({ name = 'vouch', cmd = { 'npm', 'run', '-s', '--prefix', '/path/to/courses/formal-verification', 'vouch', '--', 'lsp', '--stdio' } })
    end,
  })
  ```
- **Helix** (`languages.toml`):
  ```toml
  [language-server.vouch]
  command = "npm"
  args = ["run", "-s", "--prefix", "/path/to/courses/formal-verification", "vouch", "--", "lsp", "--stdio"]

  [[language]]
  name = "vouch"
  scope = "source.vouch"
  file-types = ["vouch"]
  language-servers = ["vouch"]
  ```
- **VS Code**: use a generic LSP client extension and point it at the same command for `*.vouch` files.

The command line also checks and verifies files directly:

```sh
npm run vouch -- check file.vouch    # parse and type-check
npm run vouch -- verify file.vouch   # run the engines; print each verdict, its badge and its certificate
```

## Adding to the language

1. Lexer and parser, with a test in `syntax/*.test.ts`.
2. Type checker, with diagnostics that say what to do (`checker.test.ts`).
3. The interpreter: the meaning comes first.
4. Each engine that should handle it, each with a test against the interpreter; engines that cannot handle it
   must say so with an *unknown* and a reason.
5. Appendix B, with an example (checked by the reference test), and hover documentation in the language server.
