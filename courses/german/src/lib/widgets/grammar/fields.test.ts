import { describe, expect, it } from 'vitest';
import { CAN_FRONT, chunksOf, clauseText, mainRow, rowText, standalone, subRow, withClause } from './fields';
import { BRACKET_PRESETS, QUESTION_PRESETS, SUB_PRESETS, V2_PRESETS } from '../data/word-order';

const by = <T extends { id: string }>(xs: T[], id: string) => xs.find((x) => x.id === id)!;

describe('main clauses', () => {
  const train = by(V2_PRESETS, 'train');
  it('verb second whatever comes first', () => {
    expect(rowText(mainRow(train, { kind: 'chunk', id: 'subject' }))).toBe('Ich fahre morgen mit dem Zug nach Berlin.');
    expect(rowText(mainRow(train, { kind: 'chunk', id: 'c0' }))).toBe('Morgen fahre ich mit dem Zug nach Berlin.');
    expect(rowText(mainRow(train, { kind: 'chunk', id: 'c1' }))).toBe('Mit dem Zug fahre ich morgen nach Berlin.');
    expect(rowText(mainRow(train, { kind: 'chunk', id: 'c2' }))).toBe('Nach Berlin fahre ich morgen mit dem Zug.');
    const fb = by(V2_PRESETS, 'football');
    expect(rowText(mainRow(fb, { kind: 'chunk', id: 'c2' }))).toBe('Fußball spielt mein Bruder jeden Samstag im Park.');
    expect(rowText(mainRow(by(V2_PRESETS, 'coffee'), { kind: 'chunk', id: 'c2' }))).toBe('Kaffee trinken wir sonntags gern.');
  });
  it('the verb is always alone in the left bracket', () => {
    for (const p of [...V2_PRESETS, ...QUESTION_PRESETS, ...BRACKET_PRESETS])
      for (const c of chunksOf(p)) {
        const r = mainRow(p, { kind: 'chunk', id: c.key });
        expect(r.vorfeld).toHaveLength(1);
        expect(r.left.map((s) => s.de)).toEqual([p.verb]);
        expect(r.mittel).toHaveLength(chunksOf(p).length - 1);
      }
  });
  it('questions', () => {
    const v = by(QUESTION_PRESETS, 'vienna');
    expect(rowText(mainRow(v, { kind: 'yesno' }), '?')).toBe('Fährt Lena morgen mit dem Zug nach Wien?');
    expect(rowText(mainRow(v, { kind: 'wh', id: 'subject' }), '?')).toBe('Wer fährt morgen mit dem Zug nach Wien?');
    expect(rowText(mainRow(v, { kind: 'wh', id: 'c2' }), '?')).toBe('Wohin fährt Lena morgen mit dem Zug?');
    expect(rowText(mainRow(by(QUESTION_PRESETS, 'zurich'), { kind: 'wh', id: 'c0' }), '?')).toBe('Seit wann wohnt Jonas in Zürich?');
    expect(rowText(mainRow(by(QUESTION_PRESETS, 'dinner'), { kind: 'wh', id: 'c1' }), '?')).toBe('Für wen kocht Mehmet heute Abend Spaghetti?');
    for (const p of QUESTION_PRESETS) {
      expect(p.question).toMatch(/\?$/);
      for (const c of chunksOf(p)) {
        expect(c.q).toBeTruthy();
        expect(c.question).toMatch(/\?$/);
      }
    }
  });
  it('the verb bracket and the Nachfeld', () => {
    expect(rowText(mainRow(by(BRACKET_PRESETS, 'perfect'), { kind: 'chunk', id: 'c0' }))).toBe('Gestern habe ich im Park Fußball gespielt.');
    expect(rowText(mainRow(by(BRACKET_PRESETS, 'modal'), { kind: 'chunk', id: 'c1' }))).toBe('In die Berge wollen wir am Wochenende fahren.');
    expect(rowText(mainRow(by(BRACKET_PRESETS, 'separable'), { kind: 'chunk', id: 'c1' }))).toBe('Um sechs Uhr stehe ich am Montag auf.');
    expect(rowText(mainRow(by(BRACKET_PRESETS, 'separable'), { kind: 'yesno' }), '?')).toBe('Stehe ich am Montag um sechs Uhr auf?');
    expect(rowText(mainRow(by(BRACKET_PRESETS, 'nachfeld'), { kind: 'chunk', id: 'subject' }))).toBe('Ich habe gestern länger gearbeitet als du.');
  });
});

describe('subordinate clauses', () => {
  it('send the verb to the end, joining separable verbs', () => {
    expect(clauseText(subRow(by(SUB_PRESETS, 'ill'), 'weil'))).toBe('weil ich krank bin');
    expect(clauseText(subRow(by(SUB_PRESETS, 'early'), 'dass'))).toBe('dass ich morgen früh aufstehe');
    expect(clauseText(subRow(by(SUB_PRESETS, 'come'), 'ob'))).toBe('ob du heute Abend mitkommen kannst');
    expect(clauseText(subRow(by(SUB_PRESETS, 'exam'), 'dass'))).toBe('dass Lena die Prüfung bestanden hat');
  });
  it('on their own they are verb-second main clauses', () => {
    expect(rowText(standalone(by(SUB_PRESETS, 'early')))).toBe('Ich stehe morgen früh auf.');
    expect(rowText(standalone(by(SUB_PRESETS, 'exam')))).toBe('Lena hat die Prüfung bestanden.');
  });
  it('hang in the Nachfeld, or fill the Vorfeld', () => {
    const ill = by(SUB_PRESETS, 'ill');
    const cl = clauseText(subRow(ill, 'weil'));
    const after = withClause(ill.leads.weil!, cl, false);
    expect(rowText(after.row, after.punct)).toBe('Ich bleibe heute zu Hause, weil ich krank bin.');
    const before = withClause(ill.leads.weil!, cl, true);
    expect(rowText(before.row, before.punct)).toBe('Weil ich krank bin, bleibe ich heute zu Hause.');
    const exam = by(SUB_PRESETS, 'exam');
    const q = withClause(exam.leads.ob!, clauseText(subRow(exam, 'ob')), false);
    expect(rowText(q.row, q.punct)).toBe('Weißt du, ob Lena die Prüfung bestanden hat?');
    const heard = withClause(exam.leads.dass!, clauseText(subRow(exam, 'dass')), false);
    expect(rowText(heard.row, heard.punct)).toBe('Ich habe gehört, dass Lena die Prüfung bestanden hat.');
    const early = by(SUB_PRESETS, 'early');
    const w = withClause(early.leads.weil!, clauseText(subRow(early, 'weil')), true);
    expect(rowText(w.row, w.punct)).toBe('Weil ich morgen früh aufstehe, gehe ich heute zeitig ins Bett.');
    const come = by(SUB_PRESETS, 'come');
    const wenn = withClause(come.leads.wenn!, clauseText(subRow(come, 'wenn')), true);
    expect(rowText(wenn.row, wenn.punct)).toBe('Wenn du heute Abend mitkommen kannst, freue ich mich.');
  });
  it('every lead makes a sentence', () => {
    for (const p of SUB_PRESETS)
      for (const [conj, lead] of Object.entries(p.leads)) {
        const cl = clauseText(subRow(p, conj));
        for (const first of CAN_FRONT.has(conj) ? [false, true] : [false]) {
          const t = rowText(withClause(lead, cl, first).row, withClause(lead, cl, first).punct);
          expect(t).toMatch(/^[A-ZÄÖÜ].*[a-zäöüß][.?]$/);
          expect(t.split(',').length).toBe(2);
        }
        expect(lead.en).toMatch(/[.?]$/);
      }
  });
});
