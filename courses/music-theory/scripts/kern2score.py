#!/usr/bin/env python3
"""
Convert a two-staff piano score in Humdrum **kern (left hand first, right hand second, as in the KernScores
encodings of the Chopin preludes) into the course's score format (src/lib/notation/parse.ts).

Not run in CI. Used to transcribe public-domain pieces; the result is reviewed by hand and against a printed
edition before it goes into a chapter. Handles chords, dots, ties, rests, spine splits (up to two voices per
staff), upbeats, key and time signatures. Grace notes, ornaments and articulations are dropped.

    python3 scripts/kern2score.py prelude28-07.krn [first_bar last_bar]
"""
import re
import sys
from fractions import Fraction

KEY_MODES = {}


def pitch(tok: str):
    """kern pitch letters → (letter, alter, octave); None for a rest."""
    m = re.search(r'([A-Ga-g]+)(#+|-+|n)?', tok)
    if not m or 'r' in tok and not m:
        return None
    letters, acc = m.group(1), m.group(2) or ''
    letter = letters[0].upper()
    octave = 3 - (len(letters) - 1) if letters[0].isupper() else 4 + (len(letters) - 1)
    alter = acc.count('#') - acc.count('-')
    return letter, alter, octave, acc == 'n'


def duration(tok: str) -> Fraction:
    m = re.match(r'\[?(\d+)(\.*)', tok)
    if not m:
        raise ValueError(f'no duration in {tok!r}')
    d = Fraction(4, int(m.group(1)))  # in quarter notes
    add = d
    for _ in m.group(2):
        add /= 2
        d += add
    return d


def token_out(p) -> str:
    letter, alter, octave, nat = p
    acc = {1: '#', 2: '##', -1: 'b', -2: 'bb'}.get(alter, 'n' if nat else '')
    marks = "'" * (octave - 3) if octave >= 3 else ',' * (3 - octave)
    return letter.lower() + acc + marks


def dur_out(q: Fraction) -> str:
    for base, s in [(4, '1'), (2, '2'), (1, '4'), (Fraction(1, 2), '8'), (Fraction(1, 4), '16'), (Fraction(1, 8), '32')]:
        if q == base:
            return s
        if q == base * Fraction(3, 2):
            return s + '.'
        if q == base * Fraction(7, 4):
            return s + '..'
    raise ValueError(f'duration {q} has no single note value')


def parse(path: str):
    lines = [l.rstrip('\n') for l in open(path, encoding='utf-8')]
    # spines: list of (staff, sub) for the current layout; staff 0 = left hand, 1 = right hand.
    spines = None
    pos = {}  # (staff, sub) → time in quarters
    events = []  # (staff, sub, start, dur, pitches, tie_start, tie_end, rest)
    bars = []  # bar line times
    key = meter = None
    for line in lines:
        if not line or line.startswith('!'):
            continue
        fields = line.split('\t')
        if spines is None:
            spines = [(i, 0) for i in range(len(fields))]
            pos = {s: Fraction(0) for s in spines}
            continue
        if fields[0].startswith('='):
            bars.append(max(pos.values()))
            continue
        if fields[0].startswith('*'):
            new = []
            i = 0
            for f, sp in zip(fields, spines):
                if f.startswith('*k[') and key is None:
                    key = f
                if f.startswith('*M') and meter is None:
                    meter = f[2:]
                if re.match(r'^\*[A-Ga-g][#-]?:$', f):
                    KEY_MODES['key'] = f[1:-1]
                if f == '*^':
                    new += [(sp[0], 0), (sp[0], 1)]
                    pos[(sp[0], 1)] = pos[sp]
                elif f == '*v':
                    if not new or new[-1][0] != sp[0]:
                        new.append((sp[0], 0))
                    pos[(sp[0], 0)] = max(pos.get((sp[0], 0), 0), pos.get(sp, 0))
                else:
                    new.append(sp)
            spines = new
            continue
        for f, sp in zip(fields, spines):
            if f == '.':
                continue
            notes = [t for t in f.split(' ') if t]
            if any('q' in t for t in notes):  # grace notes take no time
                continue
            d = duration(notes[0])
            ps = [pitch(t) for t in notes if 'r' not in t]
            ps = [p for p in ps if p]
            tie_start = any('[' in t or '_' in t for t in notes)
            events.append((sp[0], sp[1], pos[sp], d, ps, tie_start, not ps))
            pos[sp] += d
    return events, bars, key, meter


def main():
    path = sys.argv[1]
    events, bars, key, meter = parse(path)
    beats, unit = (int(x) for x in meter.split('/'))
    bar_len = Fraction(4 * beats, unit)
    upbeat = bars[0] if bars and bars[0] % bar_len else Fraction(0)
    out = []
    tonic = KEY_MODES.get('key', 'C')
    mode = 'minor' if tonic.islower() else 'major'
    t = tonic[0].lower() + tonic[1:].replace('-', 'b')
    out.append(f'\\key {t} \\{mode} \\time {meter}' + (f' \\partial {dur_out(upbeat)}' if upbeat else ''))
    total = max(e[2] + e[3] for e in events)
    for staff, clef in [(1, 'treble'), (0, 'bass')]:
        evs = [e for e in events if e[0] == staff]

        def height(es):
            ps = [p for e in es for p in e[4]]
            return sum(o * 7 + 'CDEFGAB'.index(l) for l, _, o, _ in ps) / len(ps) if ps else None

        def overlapping(e):
            return [x for x in evs if x[1] != e[1] and x[2] < e[2] + e[3] and e[2] < x[2] + x[3]]

        # Outside a split, everything is voice 1. Inside, the higher of the two lines is voice 1 (stems up).
        def voice_of(e):
            others = overlapping(e)
            if not others:
                return 0
            mine, theirs = height([e]), height(others)
            if mine is None or theirs is None:
                return 0 if e[1] == 0 else 1
            return 0 if mine >= theirs else 1

        voices = [[e for e in evs if voice_of(e) == 0], [e for e in evs if voice_of(e) == 1]]
        if not voices[1]:
            voices = voices[:1]
        texts = []
        for v in voices:
            v = sorted(v, key=lambda e: e[2])
            parts = []
            cursor = Fraction(0)
            for e in v:
                start = e[2]
                if start > cursor:  # a gap: fill with an invisible rest, split at bar lines
                    parts += spacers(cursor, start, upbeat, bar_len)
                parts.append(render(e))
                cursor = start + e[3]
            if cursor < total:
                parts += spacers(cursor, total, upbeat, bar_len)
            texts.append(with_bars(parts, v, upbeat, bar_len))
        out.append(f'\\staff {clef} ' + ' \\voice '.join(texts))
    print('\n'.join(out))


def spacers(a, b, upbeat, bar_len):
    out = []
    while a < b:
        # up to the next bar line
        nxt = upbeat + ((a - upbeat) // bar_len + 1) * bar_len if a >= upbeat else upbeat
        step = min(b, nxt) - a
        for base in [Fraction(3), Fraction(2), Fraction(1), Fraction(1, 2), Fraction(1, 4)]:
            while step >= base and base > 0:
                out.append(('s' + dur_out(base), a, base))
                a += base
                step -= base
    return out


def render(e):
    staff, sub, start, d, ps, tie, rest = e
    if rest:
        return ('r' + dur_out(d), start, d)
    body = token_out(ps[0]) if len(ps) == 1 else '<' + ' '.join(token_out(p) for p in ps) + '>'
    return (body + dur_out(d) + ('~' if tie else ''), start, d)


def with_bars(parts, v, upbeat, bar_len):
    text = []
    for tok, start, d in parts:
        text.append(tok)
        end = start + d
        if end >= upbeat and (end - upbeat) % bar_len == 0:
            text.append('|')
    return ' '.join(text)


if __name__ == '__main__':
    main()
