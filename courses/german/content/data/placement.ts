/**
 * The placement check: eight questions per level, each tied to the lesson that teaches its point,
 * so a returner learns not just a level but which lessons to brush up. German is in `de`,
 * `options` (unless English) and `audio`; `prompt` is English.
 */
export interface PlacementQuestion {
  level: 'A1' | 'A2' | 'B1' | 'B2';
  lesson: string;
  prompt: string;
  de?: string;
  /** Played aloud; the text is not shown until answered. */
  audio?: string;
  options: string[];
  answer: number;
}

export const PLACEMENT: PlacementQuestion[] = [
  // A1
  { level: 'A1', lesson: '01-hallo', prompt: 'What do you hear?', audio: 'Guten Abend!', options: ['Guten Abend!', 'Guten Morgen!', 'Gute Nacht!'], answer: 0 },
  { level: 'A1', lesson: '02-ich-bin', prompt: 'Choose the right form.', de: 'Woher ___ du?', options: ['kommst', 'kommt', 'kommen'], answer: 0 },
  { level: 'A1', lesson: '03-zahlen', prompt: 'Which number do you hear?', audio: 'dreiundvierzig', options: ['34', '43', '33', '44'], answer: 1 },
  { level: 'A1', lesson: '04-familie', prompt: 'Choose the right word.', de: 'Das ist ___ Schwester.', options: ['meine', 'mein', 'meinen'], answer: 0 },
  { level: 'A1', lesson: '05-essen', prompt: 'Choose the right word.', de: 'Ich möchte ___ Kaffee, bitte.', options: ['einen', 'ein', 'eine'], answer: 0 },
  { level: 'A1', lesson: '06-tagesablauf', prompt: 'It is 7:30. How do you say it?', options: ['Es ist halb acht.', 'Es ist halb sieben.', 'Es ist sieben halb.'], answer: 0 },
  { level: 'A1', lesson: '09-freizeit', prompt: 'Choose the right form.', de: 'Ich ___ heute leider nicht kommen.', options: ['kann', 'kannst', 'können'], answer: 0 },
  { level: 'A1', lesson: '11-wochenende', prompt: 'Choose the right word.', de: 'Am Wochenende ___ ich nach Berlin gefahren.', options: ['bin', 'habe', 'war'], answer: 0 },
  // A2
  { level: 'A2', lesson: '13-perfekt', prompt: 'Choose the right form.', de: 'Ich habe dich gestern ___.', options: ['angerufen', 'geanruft', 'anrufen'], answer: 0 },
  { level: 'A2', lesson: '14-dativ', prompt: 'Choose the right word.', de: 'Ich helfe ___ Nachbarin.', options: ['der', 'die', 'den'], answer: 0 },
  { level: 'A2', lesson: '15-wo-wohin', prompt: 'Choose the right word.', de: 'Ich lege das Buch auf ___ Tisch.', options: ['den', 'dem', 'der'], answer: 0 },
  { level: 'A2', lesson: '17-gesundheit', prompt: 'Choose the right word.', de: 'Ich fühle ___ heute nicht gut.', options: ['mich', 'mir', 'sich'], answer: 0 },
  { level: 'A2', lesson: '18-vergleichen', prompt: 'Choose the right word.', de: 'Berlin ist größer ___ München.', options: ['als', 'wie', 'dann'], answer: 0 },
  { level: 'A2', lesson: '19-adjektive', prompt: 'Choose the right form.', de: 'Wir haben einen ___ Hund.', options: ['kleinen', 'kleiner', 'kleines'], answer: 0 },
  { level: 'A2', lesson: '20-weil-dass', prompt: 'Complete the sentence.', de: 'Ich komme nicht mit, weil ich ___.', options: ['arbeiten muss', 'muss arbeiten', 'arbeite muss'], answer: 0 },
  { level: 'A2', lesson: '21-arbeit', prompt: 'Choose the right word.', de: '___ ich ein Kind war, wohnten wir in Wien.', options: ['Als', 'Wenn', 'Wann'], answer: 0 },
  // B1
  { level: 'B1', lesson: '24-praeteritum', prompt: 'Choose the right word.', de: 'Nachdem er gegessen ___, ging er spazieren.', options: ['hatte', 'hat', 'war'], answer: 0 },
  { level: 'B1', lesson: '25-relativsaetze', prompt: 'Choose the right word.', de: 'Das ist der Mann, ___ ich gestern geholfen habe.', options: ['dem', 'den', 'der'], answer: 0 },
  { level: 'B1', lesson: '26-passiv', prompt: 'Choose the right word.', de: 'Das Rathaus ___ im Jahr 1890 gebaut.', options: ['wurde', 'hat', 'war worden'], answer: 0 },
  { level: 'B1', lesson: '27-konjunktiv-ii', prompt: 'Choose the right form.', de: 'Wenn ich mehr Zeit ___, würde ich mehr lesen.', options: ['hätte', 'habe', 'hatte'], answer: 0 },
  { level: 'B1', lesson: '28-infinitiv-zu', prompt: 'Choose the right word.', de: 'Ich lerne Deutsch, ___ in Wien zu arbeiten.', options: ['um', 'damit', 'für'], answer: 0 },
  { level: 'B1', lesson: '29-verben-praepositionen', prompt: 'Choose the right word.', de: 'Ich freue mich schon ___ die Ferien.', options: ['auf', 'über', 'für'], answer: 0 },
  { level: 'B1', lesson: '30-genitiv', prompt: 'Choose the right word.', de: 'Wegen ___ Regens sind wir zu Hause geblieben.', options: ['des', 'dem', 'den'], answer: 0 },
  { level: 'B1', lesson: '31-konnektoren', prompt: 'Choose the right word.', de: 'Es hat geregnet. ___ sind wir spazieren gegangen.', options: ['Trotzdem', 'Obwohl', 'Weil'], answer: 0 },
  // B2
  { level: 'B2', lesson: '34-konjunktiv-i', prompt: 'Reported speech: choose the right form.', de: 'Der Minister sagte, er ___ nichts davon gewusst.', options: ['habe', 'hat', 'hätte gehabt'], answer: 0 },
  { level: 'B2', lesson: '35-passiv-alternativen', prompt: 'Choose the right form.', de: 'Das Problem lässt sich leicht ___.', options: ['lösen', 'gelöst', 'zu lösen'], answer: 0 },
  { level: 'B2', lesson: '36-partizipien', prompt: '“The prices that have risen sharply” is …', options: ['die stark gestiegenen Preise', 'die stark steigenden Preise', 'die stark gestiegene Preise'], answer: 0 },
  { level: 'B2', lesson: '37-nominalstil', prompt: 'The nominal style of {nachdem er angekommen war} is …', options: ['nach seiner Ankunft', 'bei seiner Ankunft', 'vor seiner Ankunft'], answer: 0 },
  { level: 'B2', lesson: '37-nominalstil', prompt: 'What does the government do?', de: 'Trotz anhaltender Kritik hält die Regierung an ihren Plänen fest.', options: ['It sticks to its plans despite continuing criticism.', 'It drops its plans because of the criticism.', 'It criticises the plans of others.'], answer: 0 },
  { level: 'B2', lesson: '38-modalpartikeln', prompt: 'What does this mean?', de: 'Er soll sehr reich sein.', options: ['People say he is very rich.', 'He ought to be very rich.', 'He wants to be very rich.'], answer: 0 },
  { level: 'B2', lesson: '39-argumentieren', prompt: 'Choose the right word.', de: 'Sie hat schnell Deutsch gelernt, ___ sie jeden Tag Zeitung gelesen hat.', options: ['indem', 'sodass', 'damit'], answer: 0 },
  { level: 'B2', lesson: '39-argumentieren', prompt: 'What does this mean?', de: 'Da bist du auf dem Holzweg.', options: ['You are on the wrong track there.', 'You are on the right path there.', 'You are lost in the woods.'], answer: 0 },
];
