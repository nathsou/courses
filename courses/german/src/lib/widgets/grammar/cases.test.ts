import { describe, expect, it } from 'vitest';
import { ambiguous, build, complete, fits, rolesOf, verbsFor, verbById, nounById, englishNP } from './cases';
import { CASE_EXAMPLES, CASE_NOUNS, CASE_PRESETS, CASE_VERBS } from '../data/case-machine';

describe('CaseMachine sentences', () => {
  it('man bites dog, in both orders', () => {
    const s = { verb: 'bite', nouns: { nom: 'dog', acc: 'man' }, article: 'def' as const, front: 'nom' as const };
    expect(build(s).text).toBe('Der Hund beißt den Mann.');
    expect(build(s).en).toBe('The dog bites the man.');
    expect(build({ ...s, front: 'acc' }).text).toBe('Den Mann beißt der Hund.');
    expect(build({ ...s, front: 'acc' }).en).toBe('The dog bites the man.');
    expect(build({ ...s, nouns: { nom: 'man', acc: 'dog' } }).text).toBe('Der Mann beißt den Hund.');
  });
  it('two objects: dative before accusative', () => {
    const s = { verb: 'give', nouns: { nom: 'man', dat: 'child', acc: 'ball' }, article: 'def' as const, front: 'nom' as const };
    expect(build(s).text).toBe('Der Mann gibt dem Kind den Ball.');
    expect(build({ ...s, front: 'acc' }).text).toBe('Den Ball gibt der Mann dem Kind.');
    expect(build({ ...s, front: 'dat' }).text).toBe('Dem Kind gibt der Mann den Ball.');
    expect(build(s).en).toBe('The man gives the child the ball.');
    expect(build({ ...s, article: 'indef' }).text).toBe('Ein Mann gibt einem Kind einen Ball.');
    expect(build({ ...s, article: 'indef' }).en).toBe('A man gives a child a ball.');
  });
  it('plural subjects take plural verbs; dative plural -n; n-declension', () => {
    expect(build({ verb: 'help', nouns: { nom: 'children', dat: 'neighbour' }, article: 'def', front: 'nom' }).text).toBe('Die Kinder helfen dem Nachbarn.');
    expect(build({ verb: 'help', nouns: { nom: 'teacher', dat: 'children' }, article: 'def', front: 'nom' }).text).toBe('Die Lehrerin hilft den Kindern.');
    expect(build({ verb: 'present', nouns: { nom: 'children', dat: 'teacher', acc: 'flowers' }, article: 'indef', front: 'acc' }).text).toBe('Blumen schenken Kinder einer Lehrerin.');
    expect(build({ verb: 'see', nouns: { nom: 'cat', acc: 'neighbour' }, article: 'def', front: 'nom' }).text).toBe('Die Katze sieht den Nachbarn.');
    expect(build({ verb: 'belong', nouns: { nom: 'book', dat: 'neighbour' }, article: 'def', front: 'nom' }).en).toBe('The book belongs to the neighbour.');
    expect(build({ verb: 'present', nouns: { nom: 'woman', dat: 'man', acc: 'apple' }, article: 'indef', front: 'nom' }).en).toBe('A woman gives a man an apple as a present.');
  });
  it('genitive owners', () => {
    const s = { verb: 'bite', nouns: { nom: 'dog', acc: 'man' }, article: 'def' as const, front: 'nom' as const, owner: { noun: 'neighbour', of: 'nom' as const } };
    expect(build(s).text).toBe('Der Hund des Nachbarn beißt den Mann.');
    expect(build(s).en).toBe("The neighbour's dog bites the man.");
    expect(build({ ...s, front: 'acc' }).text).toBe('Den Mann beißt der Hund des Nachbarn.');
    expect(build({ ...s, owner: { noun: 'children', of: 'acc' }, nouns: { nom: 'dog', acc: 'cat' } }).text).toBe('Der Hund beißt die Katze der Kinder.');
    expect(build({ ...s, owner: { noun: 'children', of: 'acc' }, nouns: { nom: 'dog', acc: 'cat' } }).en).toBe("The dog bites the children's cat.");
    expect(build({ verb: 'look', nouns: { nom: 'child', acc: 'ball' }, article: 'def', front: 'nom', owner: { noun: 'man', of: 'acc' } }).text).toBe('Das Kind sucht den Ball des Mannes.');
    expect(englishNP(nounById('dog'), 'indef', nounById('neighbour'))).toBe("a dog of the neighbour's");
  });
  it('fills roles with fitting, distinct nouns', () => {
    for (const v of CASE_VERBS) {
      const s = complete({ verb: v.id, nouns: {}, article: 'def', front: 'nom' });
      const ids = rolesOf(v).map((r) => s.nouns[r]!);
      expect(new Set(ids).size).toBe(ids.length);
      rolesOf(v).forEach((r) => expect(fits(v, r, nounById(s.nouns[r]!))).toBe(true));
    }
    // A thing cannot bite; switching verbs keeps what still fits.
    const s = complete({ verb: 'bite', nouns: { nom: 'ball', acc: 'man' }, article: 'def', front: 'acc' });
    expect(s.nouns.nom).not.toBe('ball');
    expect(s.nouns.acc).toBe('man');
    expect(complete({ verb: 'see', nouns: { nom: 'dog', acc: 'man' }, article: 'def', front: 'dat' }).front).toBe('nom');
  });
  it('limits verbs by the cases taught', () => {
    expect(verbsFor(['nom', 'acc']).map((v) => v.id)).toEqual(['see', 'bite', 'look']);
    expect(verbsFor(['nom', 'acc', 'dat'])).toHaveLength(CASE_VERBS.length);
  });
  it('presets and examples agree with the machine', () => {
    for (const p of CASE_PRESETS) {
      const nouns = { nom: p.nom, ...('acc' in p ? { acc: p.acc } : {}), ...('dat' in p ? { dat: p.dat } : {}) };
      const b = build({ verb: p.verb, nouns, article: 'def', front: 'nom' });
      expect(b.text).toBe(p.de);
      expect(b.en).toBe(p.en);
    }
    expect(build({ verb: 'bite', nouns: { nom: 'dog', acc: 'man' }, article: 'def', front: 'acc' }).text).toBe(CASE_EXAMPLES.biteFront.de);
    expect(build({ verb: 'give', nouns: { nom: 'man', dat: 'child', acc: 'ball' }, article: 'def', front: 'acc' }).text).toBe(CASE_EXAMPLES.ball.de);
  });
  it('spots fronted objects that read as subjects', () => {
    expect(ambiguous({ verb: 'see', nouns: { nom: 'woman', acc: 'cat' }, article: 'def', front: 'acc' })).toBe(true);
    expect(ambiguous({ verb: 'see', nouns: { nom: 'woman', acc: 'cat' }, article: 'def', front: 'nom' })).toBe(false);
    expect(ambiguous({ verb: 'bite', nouns: { nom: 'dog', acc: 'man' }, article: 'def', front: 'acc' })).toBe(false);
    expect(ambiguous({ verb: 'see', nouns: { nom: 'woman', acc: 'man' }, article: 'def', front: 'acc' })).toBe(false);
    expect(ambiguous({ verb: 'see', nouns: { nom: 'child', acc: 'book' }, article: 'indef', front: 'acc' })).toBe(true);
  });
  it('every noun and verb is well formed', () => {
    for (const n of CASE_NOUNS) expect(n.sg).toMatch(/^[A-ZÄÖÜ][a-zäöüß]+$/);
    expect(verbById('nope').id).toBe('see');
  });
});
