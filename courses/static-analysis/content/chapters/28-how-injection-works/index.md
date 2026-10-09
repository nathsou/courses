---
title: How injection works
summary: The vulnerabilities taint analysis looks for, from the attacker's side. HTTP requests as input, and how SQL, HTML, shells, file paths and server-side requests go wrong when a program pastes that input into a string that another interpreter reads.
number: 28
duration: 50 minutes
prerequisites: [every-rule-is-approximate]
---

Part VII is about the analysis that security products are best known for: tracking untrusted data through a program to the places where it can do harm. Before the analysis, this chapter looks at the harm. It needs no analysis background, only some JavaScript, and it introduces the vocabulary that the next chapter turns into an algorithm.

## Everything in a request is input

A web server receives **HTTP requests**: a method (`GET`, `POST`…), a path, a query string, headers, cookies and a body. In an Express application, a handler sees them as `req.params` (parts of the path), `req.query` (the query string), `req.body` (the parsed body), `req.headers` and `req.cookies`:

```js
// GET /members?name=bob
app.get('/members', async (req, res) => {
  const name = req.query.name;   // "bob", or anything else the client chooses
  …
});
```

Browsers fill in most of a request on the user's behalf, which makes it easy to forget that none of it is under the server's control. A client can send any method, any path, any header, any cookie, any body, with a few lines of code or a command-line tool. Every value in a request is **attacker-controlled**: the server must treat it as data that anyone in the world may have chosen to cause harm.

## Code built from strings

The vulnerabilities in this chapter share one shape. The program builds a piece of code in some other language (a SQL query, an HTML page, a shell command, a file path, a URL) by pasting input into a string, and hands the string to an **interpreter** that parses it. If the input contains the language's syntax, a quote, a `<`, a `;`, a `..`, the interpreter reads it as code, and the structure the programmer intended is gone. The general name for this is **injection**, and it has been in every edition of the OWASP Top 10, the web security community's list of the most critical risks to web applications. :cite[owasp2021]

The playground below simulates five interpreters. It runs nothing: the SQL engine has one table of three users, the HTML is shown in a frame with scripts disabled, and the shell, the file system and the network are only described. For each, the left column is a vulnerable handler and the right column a safe one.

::injection-playground{n="28.1" title="Five interpreters" caption="Try the presets, then your own inputs. Each tab is one of the sections below."}

## SQL injection

The vulnerable handler builds its query by concatenation, so the attacker writes part of the query. The presets show the classic moves:

- `' OR 1=1 --` closes the string, adds a condition that is always true, and turns the rest of the query, including `AND role = 'member'`, into a comment. The query returns every user, the administrator included.
- `' OR '1'='1` looks similar but returns only the members: `AND` binds more tightly than `OR`, so the condition reads `name = '' OR ('1' = '1' AND role = 'member')`. Attackers adjust their input to the query, often by trying inputs until the results change; injection does not require knowing the code.
- `x'; DROP TABLE users; --` ends the first statement and starts another. Many database drivers refuse to run more than one statement per call, which blocks this form, but not the others.
- `O'Brien` is not an attack at all: a legitimate name breaks the query. Errors are often the first sign of injection, and error messages shown to the user tell the attacker how the query is built.

The fix is not to clean the input but to keep it out of the code: a **parameterised query** (or prepared statement) sends the query's text with placeholders, `?`, and the values separately. The database parses the query before it sees any value, so no value can change its structure. Every SQL driver for Node.js supports parameters, and query builders and ORMs use them internally, until a developer calls their raw methods (`knex.raw`, `sequelize.query`) with a concatenated string. Escaping quotes in the input is the weaker alternative: it is easy to get wrong for a given database's syntax and character encodings, and easy to forget once.

## Cross-site scripting

When the interpreter is the victim's browser, injecting HTML injects JavaScript, which runs with the victim's session on the vulnerable site: it can read the page, act as the user, and send their data elsewhere. That is **cross-site scripting** (XSS). Script elements are the obvious way in, but not the only one: any element with an event handler attribute (`onerror`, `onload`, `onclick`) or a `javascript:` URL runs code. The HTML tab shows each.

XSS comes in three forms. **Reflected**: the input comes back in the response to the same request, so the attacker sends the victim a link with the payload in its query string. **Stored**: the input is saved (a comment, a display name) and served to every user who views it. **DOM-based**: client-side code writes input into the page itself, with `innerHTML` or `document.write`, without the server ever seeing it.

The fix is **output encoding** for the context the data lands in: in HTML text, `<` becomes `&lt;` and `&` becomes `&amp;`; inside an attribute, quotes must be encoded too; inside a URL, `javascript:` must be refused; inside a script, the rules are different again. Template engines and frameworks such as React encode by default, so the bugs cluster where developers turn it off (`dangerouslySetInnerHTML`, `{{{ }}}` in Handlebars, `autoescape: false`). When an application must accept rich HTML, a **sanitizer** such as DOMPurify parses it and keeps only an allowlist of harmless elements and attributes. A Content Security Policy that forbids inline scripts adds a second line of defence.

## Command injection

`exec` runs its argument through a shell, `/bin/sh -c`, and a shell is a programming language: `;`, `&&`, `||` and `|` chain commands, `$(…)` and backticks run a command and paste its output, and quotes decide what is one argument. A host name of `example.com; cat /etc/passwd` becomes two commands.

The fix is to not use a shell: `execFile` and `spawn` (without the `shell: true` option) start the program directly with an array of arguments, so the input is exactly one argument whatever it contains. One problem remains, shown by the last preset: an argument starting with `-` is read as an option by most programs. `ping -f localhost` floods; other programs have options that read or write arbitrary files. Validating the input (a host name has a known shape) or putting `--` before it, which most programs read as "no more options", closes that gap.

## Path traversal

A handler that serves files from a directory by name joins the directory and the name. `..` in a path means "the parent directory", so `../../../etc/passwd` climbs out of the uploads directory to any file the server's process can read. `path.join` normalises the result but does not stop it from leaving the directory; and a name such as `/etc/passwd`, passed to `path.resolve` instead, replaces the directory altogether.

The fix resolves the full path first and checks that it is still inside the directory. The check has its own trap, shown by the last preset: `startsWith('/srv/app/uploads')` accepts `/srv/app/uploads-old/secret.txt`. The safe handler compares with the directory *followed by a separator*. Frameworks offer the same protection through options such as Express's `res.sendFile(name, { root })`, which refuses paths that leave the root.

## Server-side request forgery

A server that fetches a URL chosen by the client (to show a preview, import an image, call a webhook) makes the request from inside its own network. An attacker who cannot reach `http://localhost:6379/` or `http://10.0.0.5/internal/report` can ask the server to. On cloud platforms, `http://169.254.169.254/` serves the instance's metadata, which can include temporary credentials. That is **server-side request forgery** (SSRF). URL syntax adds its own surprises: in `https://images.example.com@127.0.0.1/admin`, the part before `@` is a user name, and the host is `127.0.0.1`.

The fix parses the URL once, checks the parsed host against an **allowlist** of the hosts the feature needs, and uses the parsed URL for the request. Blocklists of internal addresses are fragile: there are many ways to write an address, and a host name can resolve to a public address when it is checked and to an internal one when it is fetched (DNS rebinding). Network rules that keep the server from reaching internal services it does not need are the second line of defence.

## The same shape, everywhere

Many more interpreters have the same problem: NoSQL queries (in MongoDB, a JSON body such as `{ "password": { "$ne": null } }` turns an equality test into "not null"), LDAP and XPath queries, template engines that evaluate expressions, regular expressions built from input (chapter 11's ReDoS), log files (forged log lines), and `eval` itself. In each case, the vulnerability is a path through the program:

- from a **source**, where untrusted data enters (`req.query`, `req.body`, a message from a queue, a file uploaded by a user);
- through **propagation** (assignments, string operations, function calls, objects and collections);
- to a **sink**, an operation that interprets its argument (`db.query`, `res.send`, `exec`, `fs.readFile`, `fetch`);
- without passing through a **sanitizer**, an operation that makes the data safe for that sink (parameterisation, encoding, a validated allowlist).

Following that path through real code, across functions and files, is what **taint analysis** does, and what the next chapter builds.

## How Sonar's products report these

SonarJS's own rules approach injection without following data. S2077, *SQL queries should not be dynamically formatted*, finds calls to the query methods of known database libraries, identified by their fully qualified names (chapter 8), whose first argument is a template literal with expressions or a concatenation involving something other than literals. It does not know where the pieces come from: a query built from two constants defined elsewhere is reported too, and its message asks for a review, *Make sure that executing SQL queries is safe here*. S4721 does the same for commands run through a shell, and S5247 for template engines with auto-escaping turned off. All three were Security Hotspots, rules for code that needs a human review, and are tagged `former-hotspot` in the metadata at the pinned commit (chapter 1).

::source{path="packages/analysis/src/jsts/rules/S2077/rule.ts" symbol="const sqlQuerySignatures" title="S2077: the query methods it watches" note="Fully qualified names of the query functions of pg, mysql, sqlite3, knex, typeorm and others. The check on the first argument is syntactic."}

Rules that report a confirmed path from a source to a sink, such as S3649 for SQL injection and S5131 for XSS, come from Sonar's security analysis, which is not part of the SonarJS repository. The repository shows only how they are attached: when the plugin builds the *Sonar way* profile for JavaScript or TypeScript, it looks up a class of the security plugin by reflection and activates the rule keys it provides, and the lookup is expected to fail when that plugin is not installed.

::source{path="sonar-plugin/sonar-javascript-plugin/src/main/java/org/sonar/plugins/javascript/JavaScriptProfilesDefinition.java" symbol="private static void activateSecurityRules" title="Security rules join the Sonar way profile when available"}

## What comes next

The next chapter builds a taint analysis for JavaScript on the engine of chapter 26: models of Express's sources and of the sinks of this chapter, propagation through strings and calls, sanitizers, and a rule that turns S2077's question into an answer.
