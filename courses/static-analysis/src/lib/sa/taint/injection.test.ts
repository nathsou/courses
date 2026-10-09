import { describe, expect, test } from 'vitest';
import { classifyUrl, escapeHtml, joinPath, isInside, resolvePath, runSql, scanHtml, splitShell } from './injection.js';

const q = (name: string) => `SELECT id, name FROM users WHERE name = '${name}' AND role = 'member'`;

describe('SQL', () => {
  test('normal input', () => {
    expect(runSql(q('bob')).rows.map((r) => r.name)).toEqual(['bob']);
    expect(runSql(q('alice')).rows).toEqual([]);
  });
  test('tautology and comment', () => {
    // AND binds tighter than OR: the tautology only adds the members.
    expect(runSql(q("' OR '1'='1")).rows.map((r) => r.name)).toEqual(['bob', 'carol']);
    expect(runSql(q("' OR 1=1 --")).rows.map((r) => r.name)).toEqual(['alice', 'bob', 'carol']);
    const r = runSql(q("alice' --"));
    expect(r.rows.map((x) => x.name)).toEqual(['alice']);
    expect(r.comment).toBe("--' AND role = 'member'");
  });
  test('stacked statements and errors', () => {
    expect(runSql(q("x'; DROP TABLE users; --")).statements).toEqual(["SELECT id , name FROM users WHERE name = 'x'", 'DROP TABLE users']);
    expect(runSql(q("O'Brien")).error).toMatch(/syntax error|unterminated/);
  });
  test('parameters keep data as data', () => {
    expect(runSql("SELECT id, name FROM users WHERE name = ? AND role = 'member'", ["' OR '1'='1"]).rows).toEqual([]);
    expect(runSql("SELECT id, name FROM users WHERE name = ? AND role = 'member'", ['bob']).rows.length).toBe(1);
  });
});

test('HTML', () => {
  expect(scanHtml('<p>Hello, <img src=x onerror=alert(1)>!</p>').scripts).toEqual([{ tag: 'img', why: 'an event handler, onerror' }]);
  expect(scanHtml('<a href="javascript:steal()">x</a><script>1</script>').scripts.map((s) => s.why)).toEqual(['a javascript: URL', 'a script element']);
  expect(scanHtml(`<p>${escapeHtml('<img src=x onerror=alert(1)>')}</p>`).scripts).toEqual([]);
});

test('shell', () => {
  expect(splitShell('ping -c 1 example.com').map((c) => c.argv)).toEqual([['ping', '-c', '1', 'example.com']]);
  expect(splitShell('ping -c 1 x; cat /etc/passwd').map((c) => [c.via, c.argv.join(' ')])).toEqual([[undefined, 'ping -c 1 x'], [';', 'cat /etc/passwd']]);
  expect(splitShell('ping -c 1 $(whoami)').map((c) => c.argv[0])).toEqual(['whoami', 'ping']);
  expect(splitShell("ping 'a; b'")).toEqual([{ argv: ['ping', 'a; b'], via: undefined }]);
  expect(splitShell('ping x && rm -rf ~ | tee log').map((c) => c.via)).toEqual([undefined, '&&', '|']);
});

test('paths', () => {
  expect(joinPath('/srv/uploads', 'avatar.png')).toBe('/srv/uploads/avatar.png');
  expect(joinPath('/srv/uploads', '../../etc/passwd')).toBe('/etc/passwd');
  expect(joinPath('/srv/uploads', '/etc/passwd')).toBe('/srv/uploads/etc/passwd');
  expect(resolvePath('/srv/uploads', '/etc/passwd')).toBe('/etc/passwd');
  expect(isInside('/srv/uploads', '/srv/uploads-old/x')).toBe(false);
  expect(isInside('/srv/uploads', '/srv/uploads/x')).toBe(true);
});

test('URLs', () => {
  expect(classifyUrl('http://169.254.169.254/latest/meta-data/').kind).toBe('link-local (cloud metadata)');
  expect(classifyUrl('http://' + 'status.example.com@127.0.0.1:8080' + '/health')).toMatchObject({ kind: 'loopback', userinfo: 'status.example.com' });
  expect(classifyUrl('http://10.0.0.5/').kind).toBe('private network');
  expect(classifyUrl('https://example.com/').kind).toBe('public');
});
