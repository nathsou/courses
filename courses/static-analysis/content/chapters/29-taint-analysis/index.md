---
title: Taint analysis
summary: Following untrusted data from where it enters a program to where it can do harm. Sources, sinks, sanitizers and validators as configuration, interprocedural flows on the IFDS engine, a taint-proven SQL injection rule, and what taint analysis cannot see.
number: 29
duration: 65 minutes
prerequisites: [summaries-and-ifds, how-injection-works]
---

Chapter 28 ended with the shape that every injection shares: untrusted data flows from a **source**, through assignments, string operations and calls, to a **sink**, without passing through a **sanitizer**. **Taint analysis** looks for exactly those paths. Data from a source is *tainted*; operations propagate taint from their inputs to their results; a sanitizer's result is clean; a sink that receives tainted data is a vulnerability. This chapter builds a taint analysis for Express applications on the IFDS engine of chapter 26, writes a rule with it, and ends with the places where it is wrong.

## A taint analysis is mostly configuration

The engine is the same for every vulnerability: an interprocedural reachability analysis. What changes from SQL injection to cross-site scripting is the **configuration**:

- **Sources**: what produces untrusted data. For an Express handler, the request's `query`, `params`, `body`, `headers` and `cookies`, and `req.get(name)`. Other configurations add more: values read back from the database (for *second-order* injection, where stored input is used later), message queues, files uploaded by users, environment variables in some threat models.
- **Sinks**: which *arguments* of which calls must not be tainted. The first argument of `db.query` is a sink; its second, the array of parameters, is not: that is exactly why parameterised queries are safe.
- **Sanitizers**: calls whose result is safe for this kind of sink. `escapeHtml` sanitizes for HTML and not for SQL; `Number(x)` is safe for nearly every sink, since a number cannot carry syntax; `path.basename` removes directories from a file name.
- **Validators**: conditions that make data safe on one branch, such as `if (!ALLOWED.has(column)) return res.sendStatus(400)`. After the `if`, `column` is one of the allowed values, whatever the request said.
- **Propagation**: what happens at calls the analysis cannot see into. The course's engine treats every unknown call as a **passthrough**: if any argument or the receiver is tainted, so is the result (`name.trim()`, `JSON.parse(body)`, `` `…${name}…` ``). The opposite default, that unknown calls return clean data, misses flows through every library; this one reports flows through functions that would in fact clean the data. Analysers ship models for the common libraries to narrow both errors.

Because sanitizers are specific to sinks, analysers usually run one configuration per kind of vulnerability, each producing its own rule. The engine underneath is shared.

## Tracing flows

Each tab of the figure is one configuration: the same sources, different sinks and sanitizers. Every flow comes with a **witness**: a realizable path through the exploded supergraph from the statement where the tainted value appears to the sink, computed after the analysis by a search restricted to the (statement, fact) pairs it reached. The witness is what makes a taint issue reviewable: a developer who sees only "line 18 is vulnerable" must reconstruct the flow; one who sees the path can check each step.

:::taint-tracer{n="29.1" title="Flows in an Express module"}
```js
const SORTABLE = new Set(['title', 'created']);

function boardQuery(owner, sort) {
  let sql = "SELECT * FROM boards WHERE owner = '" + owner + "'";
  if (SORTABLE.has(sort)) {
    sql = sql + ' ORDER BY ' + sort;
  }
  return sql;
}

function heading(title) {
  return '<h1>' + title + '</h1>';
}

app.get('/boards', async (req, res) => {
  const owner = req.query.owner;
  const sql = boardQuery(owner, req.query.sort);
  const rows = await db.query(sql);
  res.json(rows);
});

app.get('/boards/:id', async (req, res) => {
  const id = Number(req.params.id);
  const board = await db.query('SELECT * FROM boards WHERE id = ' + id);
  const html = heading(req.query.title);
  res.send(html);
});

app.get('/export', (req, res) => {
  const name = req.query.file;
  res.download('/srv/exports/' + name);
  cp.exec('zip -r /tmp/export.zip /srv/exports/' + name);
});
```
:::

The SQL flow goes through `boardQuery`: `owner` enters it as a parameter, taints `sql`, comes back as the return value, and reaches `db.query`. The summary of `boardQuery`, computed once, says that a tainted first parameter makes the return value tainted. The validation of `sort` with `SORTABLE.has` keeps the second parameter out of it, and `Number` keeps the `id` of the second handler out of its query. The XSS flow goes through `heading` the same way. The third handler has two flows from one source: the file name reaches `res.download` (path traversal) and a shell command (command injection), and each tab reports its own. Edit the module: wrap `name` in `path.basename(…)` before the download, or validate `owner` with a regular expression, and watch the flows disappear.

Each route handler is an entry point of the analysis: the engine seeds the tabulation with Λ at every handler's entry, since any of them can be called by a request, and it finds the handlers by looking for functions passed to `app.get`, `app.post` and the other routing methods. Their first parameter is the request; that is how the configuration knows that `req` is untrusted without relying on its name.

## Exercise: a taint-proven SQL injection rule

S2077 (chapter 28) reports every query built by concatenation or a template literal, and asks a reviewer to decide. A taint rule can decide for most of them: it reports only queries that receive data from a request, through any number of functions, without a sanitizer or a validation in between. That is the rule RSPEC calls S3649, *Database queries should not be vulnerable to injection attacks*; the version below is the course's, built on the course's engine, not Sonar's implementation.

```rule
id: taint-analysis/sql-injection
title: A taint-proven SQL injection rule
key: S3649
types: false
prompt: |
  Complete the rule. The module `workbench:taint` runs the analysis of this chapter on the file being linted: `findTaintFlows(context.sourceCode, config)` returns one flow per tainted sink argument, with `flow.argument`, the argument's node, and `flow.steps`, the witness.

  Fill in the configuration:
  - **sinks**: the first argument of calls to methods named `query`, `execute`, `raw` or `whereRaw` (as in `db.query(sql)`, `pool.execute(sql)`, `knex.raw(sql)`);
  - **sanitizers**: `Number`, `parseInt` and `parseFloat`, and methods named `escape` (as in `mysql.escape(value)`);
  - sources and validators are given: the request fields of route handlers, and allowlist checks.

  Then report each flow on the tainted argument with the message `Change this code to not construct SQL queries directly from user-controlled data.`
files:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { findTaintFlows, isRequestSource, allowlistValidates, type TaintConfig } from 'workbench:taint';
    import { generateMeta } from '../helpers/generate-meta.js';

    const SQL_METHODS = new Set(['query', 'execute', 'raw', 'whereRaw']);

    const config: TaintConfig = {
      isSource: isRequestSource,
      sinkArguments(call: estree.CallExpression): number[] {
        // TODO
        return [];
      },
      isSanitizer(call: estree.CallExpression): boolean {
        // TODO
        return false;
      },
      validates: allowlistValidates,
    };

    export const rule: Rule.RuleModule = {
      meta: generateMeta(
        { sonarKey: 'S3649' },
        { messages: { injection: 'Change this code to not construct SQL queries directly from user-controlled data.' } },
      ),
      create(context) {
        return {
          'Program:exit'() {
            // TODO: report every flow
          },
        };
      },
    };
fixtures:
  members.fixture.js: |
    const SORTABLE = new Set(['name', 'created']);

    function byName(name) {
      return db.query("SELECT * FROM users WHERE name = '" + name + "'"); // Noncompliant {{Change this code to not construct SQL queries directly from user-controlled data.}}
    }

    app.get('/members', async (req, res) => {
      res.json(await byName(req.query.name));
      await db.query('SELECT * FROM users WHERE id = ' + Number(req.query.id));
      await db.query('SELECT * FROM users WHERE name = ?', [req.query.name]);
    });

    app.get('/sorted', async (req, res) => {
      const column = req.query.sort;
      if (!SORTABLE.has(column)) {
        return res.sendStatus(400);
      }
      await db.query('SELECT * FROM users ORDER BY ' + column);
      const table = 'users';
      await db.query('SELECT * FROM ' + table);
    });
hidden:
  more.fixture.js: |
    function where(field, value) {
      return field + " = '" + value + "'";
    }

    function select(condition) {
      const sql = 'SELECT * FROM users WHERE ' + condition;
      return sql;
    }

    app.post('/search', async (req, res) => {
      const email = req.body.email;
      const sql = select(where('email', email));
      await pool.execute(sql); // Noncompliant
      //                 ^^^
      await knex.raw(`SELECT * FROM users WHERE email = '${req.body.email}'`); // Noncompliant
      await db.query('SELECT * FROM users WHERE email = ' + mysql.escape(email));
      let q = req.query.q;
      q = 'constant';
      await db.query('SELECT * FROM t WHERE x = ' + q);
      const page = parseInt(req.query.page, 10);
      await db.query('SELECT * FROM t LIMIT 10 OFFSET ' + page * 10);
    });

    app.get('/by-slug/:slug', async (req, res) => {
      const slug = req.params.slug;
      if (/^[a-z0-9-]+$/.test(slug)) {
        await db.query("SELECT * FROM posts WHERE slug = '" + slug + "'");
      }
      await db.query("SELECT * FROM posts WHERE slug = '" + slug + "'"); // Noncompliant
      res.send(escapeHtml(slug));
    });

    function notAHandler(input) {
      return db.query('SELECT ' + input);
    }
answer:
  rule.ts: |
    import type { Rule } from 'eslint';
    import type estree from 'estree';
    import { findTaintFlows, isRequestSource, allowlistValidates, type TaintConfig } from 'workbench:taint';
    import { generateMeta } from '../helpers/generate-meta.js';

    const SQL_METHODS = new Set(['query', 'execute', 'raw', 'whereRaw']);

    const methodName = (call: estree.CallExpression) =>
      call.callee.type === 'MemberExpression' && !call.callee.computed && call.callee.property.type === 'Identifier' ? call.callee.property.name : undefined;

    const config: TaintConfig = {
      isSource: isRequestSource,
      sinkArguments(call: estree.CallExpression): number[] {
        return SQL_METHODS.has(methodName(call) ?? '') ? [0] : [];
      },
      isSanitizer(call: estree.CallExpression): boolean {
        if (call.callee.type === 'Identifier') return ['Number', 'parseInt', 'parseFloat'].includes(call.callee.name);
        return methodName(call) === 'escape';
      },
      validates: allowlistValidates,
    };

    export const rule: Rule.RuleModule = {
      meta: generateMeta(
        { sonarKey: 'S3649' },
        { messages: { injection: 'Change this code to not construct SQL queries directly from user-controlled data.' } },
      ),
      create(context) {
        return {
          'Program:exit'() {
            for (const flow of findTaintFlows(context.sourceCode, config)) {
              context.report({ node: flow.argument, messageId: 'injection' });
            }
          },
        };
      },
    };
```

Compare the rule with S2077 on the visible fixture. If `db` came from one of the libraries S2077 knows (say `const db = mysql.createConnection(…)`; in the fixture it is a global, and S2077, which matches fully qualified names, would stay silent), S2077 would report four of the six queries: every one built by concatenation, including `'SELECT * FROM ' + table`, whose pieces are constants, and the `ORDER BY` query, whose column was validated. The taint rule reports one, the one that receives a request parameter through `byName`, and it can say where the data came from. In the hidden fixture, `notAHandler` is never called from a handler, so its parameter is not tainted: whether that is right depends on who calls it, which is the analysis's model of entry points at work.

## What taint analysis cannot see

Every taint analysis is wrong somewhere, and the errors fall into recognisable families.

**Missed flows** (false negatives):

- **Through objects.** The course's facts are variables. `user.name = req.body.name; save(user)` loses the taint at the store, because `user` is not tainted, only one of its fields. Real analysers track **access paths** such as `user.name`, truncated to a fixed length, and need the aliasing of chapter 27 to know that writing `a.x` writes `b.x`.
- **Through callbacks and promises.** A value passed to `.then(…)`, an event emitter or a framework's middleware chain flows through code the call graph may not connect.
- **Through storage.** Data written to a database or a cache and read back elsewhere (second-order injection) needs the database reads to be sources, which most configurations only do for specific APIs.
- **Unrecognised entry points and sources.** A different framework (Koa's `ctx.request.query`, Fastify's `request.query`, a GraphQL resolver's arguments) is invisible until it is modelled.

**Spurious flows** (false positives):

- **Validation the analysis does not understand.** A custom `isSafeColumn(c)` function, a schema validator (`zod`, `joi`, `express-validator`) that guarantees a number, a `switch` over the allowed values.
- **Passthroughs that actually clean.** A library function that returns a fixed set of values whatever its input looks like a passthrough until it is modelled.
- **Approximations from earlier parts**: flow-insensitivity, merged calling contexts, field-based properties, each adding paths that no execution takes.

Tuning a taint analysis is mostly the work of chapter 21 on a larger scale: classifying the false positives of a family, finding the narrow signal that identifies it, adding a model or a sanitizer, and checking on real code that true positives survive.

## Taint analysis in practice

**CodeQL** expresses each taint query as a configuration with exactly the roles of this chapter: predicates saying what is a source, a sink, and a *barrier* (a sanitizer or a validation), handed to a library module that computes the flows over its data-flow graph. Its JavaScript libraries model Express and many other frameworks, and its results are reported with paths from source to sink. **FlowDroid** (chapter 26) does the same for Android, with lists of sources and sinks in the Android framework.

For Sonar, the repository shows the following, and no more. The rules that report injection vulnerabilities from data flows, such as S3649, are provided by a separate security plugin, whose rule keys are added to the *Sonar way* profile when it is installed (chapter 28). Until November 2025, that plugin also registered its taint analysis rules with SonarJS's Node.js analysis through the `EslintHook` extension point of chapter 20, declaring that they must run on unchanged files too, and SonarJS's analysis cache stored files that the security plugin needed for that purpose. Both were removed in November 2025, and the repository does not describe how Sonar's taint analysis for JavaScript works today.

::source{path="docs/sonar-cache.md" symbol="sonar-security" title="The cache's history" note="Records when the security plugin's taint rules ran through the EslintHook and when that, and the related caching, was removed."}

## What comes next

Taint analysis follows explicit flows: data copied, concatenated, passed and returned. Data can also leak through control flow, by deciding which branch a program takes. The next chapter, which is optional, is about those implicit flows.
