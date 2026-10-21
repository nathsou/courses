#!/usr/bin/env python3
"""Convert one voice of a LilyPond file to the course's score format (src/lib/notation/parse.ts).

Usage: python3 scripts/ly2score.py file.ly VARIABLE [--bars=1-8] [--time=4/4 [--partial=4]]

Reads `VARIABLE = \\relative c'' { ... }` (or an absolute music expression) and prints the notes as absolute
pitches with explicit durations, one bar per `|`. A small subset of LilyPond: Dutch or English note names,
octave marks, durations and dots, chords, rests, ties, bar checks, \\repeat (played once), \\key and \\time.
Articulations, ornaments, slurs, beams, dynamics, markup and \\grace notes are dropped. In a `<< {..} \\\\ {..} >>`
passage only the first voice is kept, and the bar is reported on stderr so the other voice can be added by hand.
Always check the result against the edition it came from.
"""
import re
import sys

LETTERS = 'cdefgab'


def tokenize(src):
    src = re.sub(r'%\{.*?%\}', ' ', src, flags=re.S)
    src = re.sub(r'%[^\n]*', ' ', src)
    return re.findall(r'"(?:[^"\\]|\\.)*"|\\[a-zA-Z]+|\\[<>!()\[\]]|<<|>>|\\\\|[{}<>|~]|[a-zA-Z]+[\',]*!?\??=?[\',]*\d*\.*|\d+/\d+|\d+\.*|\S', src)


def find_variable(tokens, name):
    src_tokens = tokens
    for i, t in enumerate(src_tokens):
        if t == name and i + 1 < len(src_tokens) and src_tokens[i + 1] == '=':
            return i + 2
    raise SystemExit(f'variable {name} not found')


ACC = {'is': 1, 'isis': 2, 'es': -1, 'eses': -2, 's': 1, 'ss': 2, 'f': -1, 'ff': -2, 'sharp': 1, 'flat': -1, 'as': -1, 'ases': -2, '': 0}
NOTE_RE = re.compile(r"^([a-g])((?:isis|eses|is|es|ss|ff|sharp|flat|s|f)?)([',]*)[!?]?(=[',]*)?(\d*)(\.*)$")
ARTIC = re.compile(r'^\\(mordent|prall|trill|turn|staccato|fermata|accent|marcato|tenuto|upbow|downbow|p+|f+|mf|mp|sf|sfz|fp|cresc|decresc|dim|<|>|!)$')
SKIP_CMD = {'\\clef', '\\stemUp', '\\stemDown', '\\stemNeutral', '\\break', '\\noBreak', '\\pageBreak', '\\bar', '\\override', '\\once', '\\set', '\\tempo', '\\mark', '\\markup', '\\partial', '\\autoBeamOff', '\\autoBeamOn', '\\slurUp', '\\slurDown', '\\tieUp', '\\tieDown', '\\oneVoice', '\\voiceOne', '\\voiceTwo', '\\shortStem'}


class Conv:
    def __init__(self, tokens, i):
        self.t = tokens
        self.i = i
        self.ref = None  # (step, octave) of the last note, for \relative
        self.relative = False
        self.dur = '4'
        self.out = []  # list of (token string) and '|' markers
        self.bar = 1
        self.warnings = []

    def peek(self):
        return self.t[self.i] if self.i < len(self.t) else None

    def next(self):
        tok = self.t[self.i]
        self.i += 1
        return tok

    english = False

    def alter(self, letter, acc):
        if acc == 's' and not self.english and letter in 'ae':
            return -1  # Dutch "as", "es": A flat, E flat
        if acc == 'f' and not self.english:
            return 0
        return ACC.get(acc, 0)

    def pitch(self, letter, acc, marks, eq):
        step = LETTERS.index(letter)
        up = marks.count("'")
        down = marks.count(',')
        if self.relative and self.ref is not None:
            rstep, roct = self.ref
            # Closest octave: the letter interval is at most a fourth.
            octave = roct
            diff = step - rstep
            if diff > 3:
                octave -= 1
            elif diff < -3:
                octave += 1
            octave += up - down
        else:
            octave = 3 + up - down  # c is C3
        if eq is not None:
            octave = 3 + eq.count("'") - eq.count(',')
        self.ref = (step, octave)
        return letter, self.alter(letter, acc), octave

    @staticmethod
    def token(p):
        letter, alter, octave = p
        acc = {1: '#', 2: '##', -1: 'b', -2: 'bb', 0: ''}[alter]
        marks = "'" * (octave - 3) if octave >= 3 else ',' * (3 - octave)
        return letter + acc + marks

    def duration(self, d, dots):
        if d:
            self.dur = d + dots
        return self.dur

    def music(self, end='}'):
        while self.peek() is not None and self.peek() != end:
            self.element()
        if self.peek() == end:
            self.next()

    def element(self):
        tok = self.next()
        if tok == '{':
            self.music('}')
        elif tok == '\\relative':
            p = self.peek()
            if p and NOTE_RE.match(p):
                m = NOTE_RE.match(self.next())
                self.relative = False
                self.ref = None
                self.pitch(m.group(1), m.group(2), m.group(3), None)
                # The reference pitch of \relative: c' is C4, as an absolute pitch.
                self.relative = True
            else:
                self.relative = True
                self.ref = (0, 4)
            self.element()
        elif tok == '\\repeat':
            self.next()  # volta / unfold
            if self.peek() and self.peek().isdigit():
                self.next()
        elif tok == '\\alternative':
            # Keep the last alternative (the way out).
            self.next()  # {
            depth = 1
            start = self.i
            blocks = []
            cur = []
            while depth:
                x = self.next()
                if x == '{':
                    depth += 1
                    if depth == 2:
                        cur = [self.i]
                elif x == '}':
                    depth -= 1
                    if depth == 1:
                        blocks.append((cur[0], self.i - 1))
            save = self.i
            b0, b1 = blocks[-1]
            sub = Conv(self.t[:b1], b0)
            sub.ref, sub.relative, sub.dur, sub.bar = self.ref, self.relative, self.dur, self.bar
            sub.music(end=None)
            self.out += sub.out
            self.ref, self.dur, self.bar = sub.ref, sub.dur, sub.bar
            self.i = save
        elif tok in ('\\key',):
            self.next(); self.next()
        elif tok == '\\time':
            self.next()
        elif tok == '\\grace' or tok == '\\acciaccatura' or tok == '\\appoggiatura':
            # Skip the grace note (or group) but keep the relative reference moving.
            save_out = len(self.out)
            save_dur = self.dur
            self.element()
            del self.out[save_out:]
            self.dur = save_dur
        elif tok in ('\\times', '\\tuplet'):
            frac = self.next()
            self.out.append(f'\\tuplet {frac if tok == "\\tuplet" else "/".join(reversed(frac.split("/")))} {{')
            self.element()
            self.out.append('}')
        elif tok == '<<':
            # Everything inside << >> is simultaneous: keep the first element (voice), drop the rest.
            bar = self.bar
            first = True
            while True:
                x = self.peek()
                if x == '>>':
                    self.next()
                    break
                if x == '\\\\':
                    self.next()
                    continue
                if first:
                    self.element()
                    first = False
                else:
                    save_out, save_ref, save_dur, save_bar = len(self.out), self.ref, self.dur, self.bar
                    self.element()
                    if len(self.out) > save_out:
                        self.warnings.append(f'bar {bar}: a simultaneous voice was dropped')
                    del self.out[save_out:]
                    self.ref, self.dur, self.bar = save_ref, save_dur, save_bar
        elif tok == '\\context' or tok == '\\new':
            self.next()
            if self.peek() == '=':
                self.next(); self.next()
        elif tok == '<':
            notes = []
            first_ref = None
            while self.peek() != '>':
                x = self.next()
                m = NOTE_RE.match(x)
                if m:
                    notes.append(self.pitch(m.group(1), m.group(2), m.group(3), m.group(4)))
                    if first_ref is None:
                        first_ref = self.ref
            self.next()
            d = self.peek()
            m = re.match(r'^(\d*)(\.*)$', d or 'x')
            dur = self.dur
            if d and m and d[0].isdigit():
                self.next()
                dur = self.duration(m.group(1), m.group(2))
            self.ref = first_ref
            self.out.append('<' + ' '.join(self.token(p) for p in notes) + '>' + dur)
            self.after()
        elif tok == '|':
            self.out.append('|')
            self.bar += 1
        elif tok == '~':
            if self.out:
                self.out[-1] += '~'
        elif re.match(r'^[rsR]\d*\.*$', tok):
            m = re.match(r'^([rsR])(\d*)(\.*)$', tok)
            dur = self.duration(m.group(2), m.group(3))
            self.out.append(('s' if m.group(1) == 's' else 'r') + dur)
            self.after()
        elif NOTE_RE.match(tok):
            m = NOTE_RE.match(tok)
            p = self.pitch(m.group(1), m.group(2), m.group(3), m.group(4))
            dur = self.duration(m.group(5), m.group(6))
            self.out.append(self.token(p) + dur)
            self.after()
        elif tok in SKIP_CMD:
            if tok in ('\\clef', '\\bar', '\\mark', '\\tempo', '\\partial'):
                self.next()
                if tok == '\\tempo' and self.peek() == '=':
                    self.next(); self.next()
            if tok in ('\\override', '\\set'):
                # \override X.Y #'z = #v  — skip to the value.
                while self.peek() and self.peek() != '=':
                    self.next()
                self.next(); self.next()
            if tok == '\\markup':
                self.element()
        else:
            pass  # articulations, beams, slurs, dynamics, strings, \once …

    def after(self):
        # Post-note decorations: ~ ties, articulations; nothing else to do.
        while self.peek() == '~':
            self.next()
            self.out[-1] += '~'


def length(d):
    m = re.match(r'^(\d+)(\.*)$', d)
    base = 1 / int(m.group(1))
    total, add = base, base
    for _ in m.group(2):
        add /= 2
        total += add
    return total


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    bars = None
    for a in sys.argv[1:]:
        if a.startswith('--bars='):
            lo, hi = a.split('=')[1].split('-')
            bars = (int(lo), int(hi))
    path, var = args
    src = open(path, encoding='utf8').read()
    tokens = tokenize(src)
    Conv.english = bool(re.search(r'english\.ly|\\language\s+"english"', src))
    c = Conv(tokens, find_variable(tokens, var))
    c.element()
    time = next((a.split('=')[1] for a in sys.argv[1:] if a.startswith('--time=')), None)
    if time:
        # The source has no bar checks: split by duration.
        num, den = map(int, time.split('/'))
        bar_len = num / den
        partial = next((a.split('=')[1] for a in sys.argv[1:] if a.startswith('--partial=')), None)
        first = length(partial) if partial else bar_len
        items = [x for x in c.out if x != '|']
        measures, cur, acc, target, scale = [], [], 0.0, first, [1.0]
        for x in items:
            if x.startswith('\\tuplet'):
                a, b = x.split()[1].split('/')
                scale.append(int(b) / int(a))
                cur.append(x)
                continue
            if x == '}':
                scale.pop()
                cur.append(x)
                continue
            cur.append(x)
            acc += length(re.search(r'(\d+\.*)~?$', x).group(1)) * scale[-1]
            if acc >= target - 1e-9:
                measures.append(' '.join(cur))
                cur, acc, target = [], 0.0, bar_len
        if cur:
            measures.append(' '.join(cur))
        text = ' | '.join(measures)
    else:
        text = ' '.join(c.out)
    measures = [m.strip() for m in text.split('|')]
    if measures and not measures[-1]:
        measures.pop()
    if bars:
        measures = measures[bars[0] - 1:bars[1]]
    print(' | '.join(measures) + ' |')
    for w in c.warnings:
        print(w, file=sys.stderr)


if __name__ == '__main__':
    main()
