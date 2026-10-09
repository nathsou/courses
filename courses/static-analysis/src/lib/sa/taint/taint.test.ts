import { describe, expect, test } from 'vitest';
import { analyseSource, RULES } from './taint.js';

const app = `const ROOT = '/srv/app/uploads';
const SORTABLE = new Set(['name', 'created']);

function findMembers(name) {
  const sql = "SELECT * FROM users WHERE name = '" + name + "'";
  return db.query(sql);
}

function byId(id) {
  return db.query('SELECT * FROM users WHERE id = ' + Number(id));
}

app.get('/members', (req, res) => {
  const name = req.query.name;
  findMembers(name);
  byId(req.query.id);
  res.json({ ok: true });
});

app.get('/sorted', (req, res) => {
  const column = req.query.sort;
  if (!SORTABLE.has(column)) {
    return res.sendStatus(400);
  }
  db.query('SELECT * FROM users ORDER BY ' + column);
});

app.get('/hello', (req, res) => {
  const who = req.params.who;
  res.send('<p>Hello, ' + who + '</p>');
  res.send('<p>Hello, ' + escapeHtml(who) + '</p>');
});

app.get('/files/:name', (req, res) => {
  const file = path.resolve(ROOT, req.params.name);
  if (!file.startsWith(ROOT + path.sep)) {
    return res.sendStatus(403);
  }
  res.sendFile(file);
  res.sendFile(path.join(ROOT, req.params.name));
});

app.post('/ping', (req, res) => {
  const host = req.body.host;
  cp.exec('ping -c 1 ' + host);
  execFile('ping', ['-c', '1', host]);
});

app.get('/preview', async (req, res) => {
  const target = new URL(req.query.url);
  const image = await fetch(target);
  res.json({ size: image.size });
});
`;

const line = (needle: string) => app.split('\n').findIndex((l) => l.includes(needle)) + 1;

describe('taint rules on an Express app', () => {
  test('SQL: through a helper function; not through Number or an allowlist', () => {
    const flows = analyseSource(app, RULES.sql!.config);
    expect(flows.map((f) => app.slice(0, f.call[0]).split('\n').length)).toEqual([line('return db.query(sql)')]);
    const steps = flows[0]!.steps.map((s) => `${s.fn}: ${s.text} [${s.fact}]`);
    expect(steps[0]).toBe('GET /members: const name = req.query.name [Λ]');
    expect(steps.at(-1)).toBe('findMembers: return db.query(sql); [sql]');
    expect(steps.some((s) => s.startsWith('findMembers: entry (name) [name]'))).toBe(true);
  });
  test('XSS: the escaped response is clean', () => {
    expect(analyseSource(app, RULES.xss!.config).map((f) => app.slice(0, f.call[0]).split('\n').length)).toEqual([line("res.send('<p>Hello, ' + who")]);
  });
  test('paths: validated or not', () => {
    expect(analyseSource(app, RULES.path!.config).map((f) => app.slice(0, f.call[0]).split('\n').length)).toEqual([line('res.sendFile(path.join')]);
  });
  test('commands: exec but not execFile', () => {
    expect(analyseSource(app, RULES.command!.config).map((f) => app.slice(0, f.call[0]).split('\n').length)).toEqual([line('cp.exec(')]);
  });
  test('SSRF', () => {
    expect(analyseSource(app, RULES.ssrf!.config).map((f) => app.slice(0, f.call[0]).split('\n').length)).toEqual([line('await fetch(target)')]);
  });
});
