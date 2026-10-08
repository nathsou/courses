# The corpus

Three small projects that every rule exercise with `corpus: true` runs on, as SonarJS's ruling tests run rules on
real projects. Expected issues per rule key live in `expected/<KEY>.json` and are regenerated from the exercises'
reference rules with `npm run corpus:sync`; `npm test` fails when they are out of date.

- `corkboard/`: the course's running example, an Express-style noticeboard with planted issues.
- `ledger-lite/`: an accounting library full of code that *looks* suspicious but is correct (`x === x` as a NaN
  check, `1 << 1`, `Math.random` for retry jitter, destructuring that discards fields): false-positive traps.
- `tinyq/`: a JavaScript queue with loops, `try`/`finally`, `switch` and a loop that always returns on its first
  iteration: code-path traps.

Planted issues in Corkboard (for authors; the corpus files carry no markers):

| Where | Issue | Rule modelled |
|---|---|---|
| `routes/posts.ts` `page > 0 && page > 0` | identical sub-expressions | S1764 |
| `routes/posts.ts` search | SQL built from the query string | S2077 / taint (chapter 29) |
| `routes/posts.ts` `DELETE … + req.params.id` | SQL built from a path parameter | S2077 / taint |
| `routes/posts.ts` post page | unescaped body in HTML | XSS (chapter 29) |
| `routes/posts.ts` latest | `find` result used without a check | S2259 |
| `routes/attachments.ts` | path from a request parameter | path traversal (chapter 29) |
| `routes/attachments.ts` delete | `let removed = false` overwritten | S1854 |
| `routes/preview.ts` | `fetch` of a request URL; logging request data | SSRF, log injection (chapter 29) |
| `routes/auth.ts` | hard-coded secret and password, md5, `Math.random` token | S2068, S4790, S2245 |
| `routes/admin.ts` | shell command built from the request | command injection (chapter 29) |
| `services/notices.ts` | dead stores, `x = x`, invariant return, nested identical test, optional chain dereference | S1854, S4165, S3516, S2589, S2259 |
| `util/validate.ts` | catastrophic backtracking; `x.length === x.length` | S5852, S1764 |
| `util/text.ts` `renderMarkup` | deeply nested branching | S3776 |
