/**
 * CodeMirror support for the course's rule language (Girafe syntax): a stream tokenizer for
 * highlighting, and a linter that reports the parser's diagnostics.
 */
import { StreamLanguage, type StringStream } from '@codemirror/language';
import type { Diagnostic as CmDiagnostic } from '@codemirror/lint';
import { parseProgram } from '$lib/trs/parse';

const SPECIAL = /[.\-~+*&|/\\^%°$@#;:_='><!]/;
const NAME = /[A-Za-z0-9.\-~+*&|/\\^%°$@#;:_='><!\p{L}]/u;

interface St {
  lineStart: boolean;
}

export const girafe = StreamLanguage.define<St>({
  name: 'girafe',
  startState: () => ({ lineStart: true }),
  token(stream: StringStream, state: St): string | null {
    if (stream.sol()) state.lineStart = true;
    if (stream.eatSpace()) return null;
    const first = state.lineStart;
    state.lineStart = false;
    if (stream.match('--')) {
      stream.skipToEnd();
      return 'comment';
    }
    if (first && stream.match(/^#[a-z][a-z-]*/)) {
      return 'meta';
    }
    if (stream.match('->*') || stream.match('->') || stream.match('==')) return 'operator';
    if (first && stream.peek() === '?') {
      stream.next();
      return 'keyword';
    }
    const ch = stream.peek() ?? '';
    if ('(),[]?'.includes(ch)) {
      stream.next();
      return ch === '?' ? 'keyword' : 'punctuation';
    }
    if (NAME.test(ch)) {
      let s = '';
      while (!stream.eol() && NAME.test(stream.peek()!) && !(stream.peek() === '-' && (stream.string[stream.pos + 1] === '>' || stream.string[stream.pos + 1] === '-'))) s += stream.next();
      if (s === 'if') return 'keyword';
      if (s === '_') return 'variableName.special';
      if (/^\p{Ll}/u.test(s)) return 'variableName.special';
      if (/^-?\d+$/.test(s)) return 'number';
      if (s[0] === '@') return 'function';
      if (SPECIAL.test(s[0]!)) return 'operator';
      return 'typeName';
    }
    stream.next();
    return null;
  },
  languageData: { commentTokens: { line: '--' } },
});

/** Parser diagnostics as CodeMirror lint diagnostics. */
export function girafeDiagnostics(src: string): CmDiagnostic[] {
  return parseProgram(src).diagnostics.map((d) => ({
    from: Math.min(d.from, src.length),
    to: Math.max(Math.min(d.to, src.length), Math.min(d.from, src.length)),
    severity: d.severity,
    message: d.message,
  }));
}
