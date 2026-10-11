/**
 * Modal particles: five base sentences, each tried with each particle. `de` marks the particle
 * with `{…}`; `en` paraphrases the nuance; `note` names it. When a particle does not fit, `none`
 * says why, and `de`/`en` may show a related sentence where it does.
 */

export type ParticleId = 'doch' | 'mal' | 'ja' | 'eben' | 'eigentlich' | 'schon' | 'denn' | 'wohl' | 'bloss';

export const PARTICLES: { id: ParticleId; label: string; gloss: string }[] = [
  { id: 'doch', label: 'doch', gloss: 'contradiction, reminder, urging' },
  { id: 'mal', label: 'mal', gloss: 'softens requests: just, for a moment' },
  { id: 'ja', label: 'ja', gloss: 'shared knowledge, surprise' },
  { id: 'eben', label: 'eben / halt', gloss: 'that’s just how it is' },
  { id: 'eigentlich', label: 'eigentlich', gloss: 'actually, by the way' },
  { id: 'schon', label: 'schon', gloss: 'admittedly, urging, reassurance' },
  { id: 'denn', label: 'denn', gloss: 'friendly interest in questions' },
  { id: 'wohl', label: 'wohl', gloss: 'probably, I suppose' },
  { id: 'bloss', label: 'bloß / nur', gloss: 'exasperation, warnings' },
];

export interface ParticleFit {
  de: string;
  en: string;
  note: string;
  /** Another way to say it (German), e.g. halt for eben. */
  alt?: string;
}

export interface ParticleMiss {
  none: true;
  note: string;
  de?: string;
  en?: string;
}

export interface ParticleBase {
  id: string;
  de: string;
  en: string;
  kind: 'command' | 'statement' | 'question';
  with: Record<ParticleId, ParticleFit | ParticleMiss>;
}

export const PARTICLE_BASES: ParticleBase[] = [
  {
    id: 'komm',
    de: 'Komm her.',
    en: 'Come here.',
    kind: 'command',
    with: {
      doch: { de: 'Komm {doch} her!', en: 'Come on over! (Why don’t you come over?)', note: 'encouraging, a little insistent' },
      mal: { de: 'Komm {mal} her.', en: 'Come here a sec.', note: 'casual: softens the order', alt: 'Komm {doch mal} her!' },
      ja: { de: 'Komm {ja} her!', en: 'You make sure you come here!', note: 'stressed {ja} in a command: a warning or threat' },
      eben: { de: 'Dann komm {halt} her.', en: 'Well, just come over, then.', note: 'shrugging: it’s the obvious solution', alt: 'Dann komm {eben} her.' },
      eigentlich: { none: true, note: '{eigentlich} goes in statements and questions, not in commands.' },
      schon: { de: 'Komm {schon} her!', en: 'Come on, get over here!', note: 'impatient urging' },
      denn: { none: true, note: '{denn} as a particle is for questions only.', de: 'Kommst du {denn} her?', en: 'So are you coming over?' },
      wohl: { none: true, note: '{wohl} guesses; in a command it only appears in a fixed threat with {wollen}.', de: 'Willst du {wohl} herkommen!', en: 'Will you come here this minute!' },
      bloss: { none: true, note: 'In commands {bloß} is a warning, usually with {nicht}.', de: 'Komm {bloß} nicht her!', en: 'Don’t you dare come here!' },
    },
  },
  {
    id: 'teuer',
    de: 'Das ist teuer.',
    en: 'That’s expensive.',
    kind: 'statement',
    with: {
      doch: { de: 'Das ist {doch} teuer!', en: 'But that’s expensive! (Surely you can see that.)', note: 'contradicting, or reminding of the obvious' },
      mal: { none: true, note: '{mal} softens requests and commands; a plain statement has nothing to soften.' },
      ja: { de: 'Das ist {ja} teuer!', en: 'Wow, that’s expensive!', note: 'surprise at what you see (or: as we both know)' },
      eben: { de: 'Das ist {eben} teuer.', en: 'It’s just expensive, that’s all there is to it.', note: 'resignation: nothing can be done', alt: 'Das ist {halt} teuer.' },
      eigentlich: { de: 'Das ist {eigentlich} teuer.', en: 'Actually, that’s quite expensive, when you think about it.', note: 'a second thought, a gentle objection' },
      schon: { de: 'Das ist {schon} teuer.', en: 'It is expensive, admittedly (… but it’s worth it).', note: 'concession: a “but” usually follows' },
      denn: { none: true, note: '{denn} as a particle is for questions only.', de: 'Ist das {denn} teuer?', en: 'Is it expensive, then?' },
      wohl: { de: 'Das ist {wohl} teuer.', en: 'That’s probably expensive, I suppose.', note: 'an assumption' },
      bloss: { none: true, note: 'Here {bloß} would just mean “only” ({Das ist bloß teuer} = it’s only expensive). The particle goes in questions, wishes and warnings.', de: 'Warum ist das {bloß} so teuer?', en: 'Why on earth is it so expensive?' },
    },
  },
  {
    id: 'wohnen',
    de: 'Wo wohnst du?',
    en: 'Where do you live?',
    kind: 'question',
    with: {
      doch: { de: 'Wo wohnst du {doch} gleich?', en: 'Where do you live again?', note: 'asking for something you’ve forgotten; usually with {gleich} or {noch mal}' },
      mal: { none: true, note: '{mal} belongs to the request, not to the question itself.', de: 'Sag {mal}, wo wohnst du?', en: 'Tell me, where do you live?' },
      ja: { none: true, note: 'Unstressed {ja} does not go in questions: it signals that the speaker already knows.' },
      eben: { none: true, note: '{eben} and {halt} present something as settled; questions are open.' },
      eigentlich: { de: 'Wo wohnst du {eigentlich}?', en: 'So where do you live, by the way?', note: 'casual interest, often changing the subject' },
      schon: { none: true, note: 'In W-questions {schon} makes them rhetorical.', de: 'Wer weiß das {schon}?', en: 'Who knows, really? (Nobody does.)' },
      denn: { de: 'Wo wohnst du {denn}?', en: 'So where do you live?', note: 'friendly, interested: without {denn} the question can sound abrupt' },
      wohl: { none: true, note: 'In questions {wohl} means “I wonder”, about a third person, not to the person you are asking.', de: 'Wo wohnt sie {wohl}?', en: 'Where might she live, I wonder?' },
      bloss: { de: 'Wo wohnst du {bloß}?', en: 'Where on earth do you live?', note: 'exasperation (you can’t find the house)', alt: 'Wo wohnst du {nur}?' },
    },
  },
  {
    id: 'wissen',
    de: 'Das weißt du.',
    en: 'You know that.',
    kind: 'statement',
    with: {
      doch: { de: 'Das weißt du {doch}!', en: 'You know that! (You should, anyway.)', note: 'a reminder, slightly reproachful' },
      mal: { none: true, note: '{mal} softens requests and commands, not statements.' },
      ja: { de: 'Das weißt du {ja}.', en: 'As you know.', note: 'shared knowledge, no reproach' },
      eben: { none: true, note: '{eben} and {halt} present a fact as unchangeable; that doesn’t suit this sentence.' },
      eigentlich: { de: 'Das weißt du {eigentlich}.', en: 'You know that really.', note: 'in principle you know it (even if you forgot)' },
      schon: { de: 'Das weißt du {schon}.', en: 'I’m sure you know that.', note: 'reassurance (it can also simply mean “already”)' },
      denn: { none: true, note: '{denn} as a particle is for questions only.', de: 'Weißt du das {denn}?', en: 'Do you actually know that?' },
      wohl: { de: 'Das weißt du {wohl}.', en: 'You probably know that.', note: 'an assumption (said sharply, it can be ironic)' },
      bloss: { none: true, note: '{bloß} goes in questions, wishes and warnings.' },
    },
  },
  {
    id: 'zeit',
    de: 'Ich habe keine Zeit.',
    en: 'I haven’t got time.',
    kind: 'statement',
    with: {
      doch: { de: 'Ich habe {doch} keine Zeit!', en: 'But I haven’t got time! (I told you.)', note: 'reminding, a little impatient' },
      mal: { none: true, note: '{mal} softens requests and commands, not statements.' },
      ja: { de: 'Ich habe {ja} keine Zeit.', en: 'I haven’t got time, you see.', note: 'as you know: an explanation the listener can accept' },
      eben: { de: 'Ich habe {eben} keine Zeit.', en: 'I just haven’t got time, that’s how it is.', note: 'resignation', alt: 'Ich habe {halt} keine Zeit.' },
      eigentlich: { de: 'Ich habe {eigentlich} keine Zeit.', en: 'Actually I haven’t really got time (… but go on, then).', note: 'softens a refusal, leaving the door open' },
      schon: { none: true, note: '{schon} with a negative statement sounds odd here; it concedes or reassures.' },
      denn: { none: true, note: '{denn} as a particle is for questions only.' },
      wohl: { none: true, note: '{wohl} guesses, and you don’t guess about your own time.', de: 'Er hat {wohl} keine Zeit.', en: 'He probably hasn’t got time.' },
      bloss: { none: true, note: 'Here {bloß} would mean “only”: {Ich habe bloß keine Zeit} = the only problem is that I haven’t got time.' },
    },
  },
];
