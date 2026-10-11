---
title: 'A1: putting it together'
goals:
  - follow a whole day in German, from the bakery in the morning to the wine tavern at night
  - read short emails, adverts and signs as in the Goethe A1 exam, and fill in a form
  - check every point of A1 grammar with mixed drills, and see it all on one page
---

This lesson teaches no new grammar. It brings back the people, words and structures of the last eleven lessons and mixes them, the way real German does. Lena from Graz (lesson 4) visits her friend Fatma (lesson 2) in Vienna; you meet the baker Zeynep (lesson 6) and Elias (lesson 9) again; and you spend a day in Vienna yourself, from the bakery at eight to the {Heuriger} at night.

The middle of the lesson looks like the reading part of the Goethe-Zertifikat A1, also called Start Deutsch 1: short emails, adverts, signs and a form. At the end you will find the whole of A1 grammar on one page. If a drill trips you up, the lesson number in brackets tells you where to look.

## Eine Einladung aus Wien

```read
title: Kommst du nach Wien?
setting: An email from Fatma, a doctor in Vienna, to her friend Lena in Graz.
text: |
  Liebe Lena,

  wie geht es dir? Mir geht es gut, aber ich arbeite sehr viel.
  Am Wochenende habe ich endlich frei! Kommst du am Samstag nach Wien?
  Du kannst bei mir schlafen, mein Sofa ist sehr gemütlich.

  Am Vormittag können wir einkaufen gehen. Du brauchst doch eine Jacke, oder?
  Am Abend gehen wir zum Heurigen. Mein Freund Elias und seine Freundin Zeynep kommen auch.

  Ruf mich bitte an oder schreib mir!
  Liebe Grüße
  Fatma
en: |
  Dear Lena,

  How are you? I'm fine, but I'm working a lot.
  At the weekend I'm finally free! Will you come to Vienna on Saturday?
  You can sleep at my place; my sofa is very comfortable.

  In the morning we can go shopping. You need a jacket, don't you?
  In the evening we're going to the Heuriger. My friend Elias and his girlfriend Zeynep are coming too.

  Please call me or write!
  Love,
  Fatma
questions:
  - claim: Fatma hat am Wochenende keine Zeit.
    answer: false
    explain: "{Am Wochenende habe ich endlich frei!}"
  - claim: Lena kann bei Fatma schlafen.
    answer: true
  - claim: Am Vormittag können Fatma und Lena einkaufen gehen.
    answer: true
  - prompt: Who is coming to the Heuriger too?
    options: [Elias and Zeynep, "Lena's brother", "Fatma's parents"]
    answer: 0
  - claim: Lena soll Fatma anrufen oder schreiben.
    answer: true
```

## Ein Samstag in Wien

```story
title: Ein Samstag in Wien
paragraphs:
  - de: Lena wohnt in Graz, aber heute ist sie in Wien. Ihre Freundin Fatma wohnt hier. Fatma ist Ärztin und arbeitet viel, aber heute ist Samstag, und sie hat frei.
    en: Lena lives in Graz, but today she is in Vienna. Her friend Fatma lives here. Fatma is a doctor and works a lot, but today is Saturday, and she has the day off.
  - de: Um acht steht Fatma auf und kauft Semmeln. Die Bäckerei ist gleich um die Ecke. Die Bäckerin heißt Zeynep. Sie steht jeden Tag um halb drei auf! Dann frühstücken Lena und Fatma zusammen.
    en: At eight Fatma gets up and buys rolls. The bakery is just round the corner. The baker is called Zeynep. She gets up at half past two every day! Then Lena and Fatma have breakfast together.
  - de: 'Am Vormittag fahren sie mit der U-Bahn in die Stadt. Lena braucht eine Jacke. Auf der Mariahilfer Straße findet sie eine Jacke in Blau. Sie probiert sie an. Die Jacke passt, und Fatma sagt: „Die steht dir super!“ Lena kauft sie.'
    en: 'In the morning they take the underground into town. Lena needs a jacket. On Mariahilfer Straße she finds a jacket in blue. She tries it on. The jacket fits, and Fatma says, "It really suits you!" Lena buys it.'
  - de: Mittags haben sie Hunger. Sie gehen in ein Kaffeehaus. Fatma nimmt eine Suppe, Lena möchte einen Apfelstrudel und eine Melange. „Zusammen oder getrennt?“, fragt der Kellner. „Zusammen“, sagt Lena. „Heute zahle ich!“
    en: At midday they are hungry. They go to a coffee house. Fatma has a soup; Lena would like an apple strudel and a melange. "Together or separately?" asks the waiter. "Together," says Lena. "Today I'm paying!"
  - de: Am Abend gehen sie zum Heurigen. Dort treffen sie Elias und seine Freundin. Fatma lacht. Die Freundin ist Zeynep, die Bäckerin! Sie essen, trinken Wein und reden viel. Aber Zeynep ist sehr müde. Sie geht schon um neun nach Hause.
    en: In the evening they go to the Heuriger. There they meet Elias and his girlfriend. Fatma laughs. The girlfriend is Zeynep, the baker! They eat, drink wine and talk a lot. But Zeynep is very tired. She goes home at nine.
  - de: Am Sonntag fährt Lena nach Graz zurück. Im Zug schreibt sie eine Nachricht an ihren Bruder Felix. „Wien war toll! Ich habe eine Jacke gekauft, und wir sind zum Heurigen gegangen. Und Minka? Geht es ihr gut?“
    en: On Sunday Lena goes back to Graz. On the train she writes a message to her brother Felix. "Vienna was great! I bought a jacket, and we went to the Heuriger. And Minka? Is she all right?"
questions:
  - prompt: Why does Fatma not work today?
    options: ["It's Saturday.", "She's ill.", "She's on holiday."]
    answer: 0
  - prompt: What does Lena buy?
    options: [a jacket, shoes, a dress]
    answer: 0
  - prompt: Who pays in the coffee house?
    options: [Lena, Fatma, the waiter]
    answer: 0
  - prompt: Who is Zeynep?
    options: ["the baker, and Elias's girlfriend", "Fatma's sister", a waitress at the Heuriger]
    answer: 0
  - prompt: Why does Zeynep go home early?
    options: [She is very tired., She has to work on Sunday., She doesn't like wine.]
    answer: 0
    explain: She gets up at half past two every morning (lesson 6).
  - prompt: Who is Minka?
    options: ["Lena's cat (lesson 4)", "Felix's girlfriend", "Fatma's neighbour"]
    answer: 0
```

## Your day in Vienna

Now it is your turn. You are in Vienna for a day. Everyone you meet is a stranger, so it is {Sie} all day long.

```scene
title: 8 a.m. At the bakery
setting: A small bakery in Vienna's seventh district. Zeynep is behind the counter.
partner: Zeynep
turns:
  - they: Guten Morgen! Was darf's sein?
    theyEn: Good morning! What can I get you?
    options:
      - de: Guten Morgen! Ich hätte gern vier Semmeln, bitte.
        en: Good morning! I'd like four rolls, please.
        ok: true
      - de: Guten Morgen! Ich hätte gern vier Semmel, bitte.
        en: Good morning! I'd like four roll, please.
        reply: Vier Semmeln, sehr gern.
        replyEn: Four rolls, certainly.
  - they: Sonst noch etwas?
    theyEn: Anything else?
    options:
      - de: Ja, einen Kaffee zum Mitnehmen, bitte.
        en: Yes, a coffee to take away, please.
        ok: true
      - de: Ja, ein Kaffee zum Mitnehmen, bitte.
        en: Yes, a coffee to take away, please. (wrong ending)
        reply: Einen Kaffee zum Mitnehmen, gern.
        replyEn: A coffee to take away, certainly.
  - they: Das macht 5,40 Euro.
    theyEn: That's 5.40 euros.
    options:
      - de: Hier sind sechs Euro. Stimmt so.
        en: Here's six euros. Keep the change.
        ok: true
      - de: Fünfzig Euro vierzig? So teuer?
        en: Fifty euros forty? That expensive?
        reply: Nein, nein, fünf Euro vierzig! So teuer sind meine Semmeln nicht.
        replyEn: No, no, five euros forty! My rolls aren't that expensive.
  - they: Danke schön! Einen schönen Tag noch!
    theyEn: Thank you! Have a nice day!
    options:
      - de: Danke, Ihnen auch! Auf Wiederschauen!
        en: Thanks, you too! Goodbye!
        ok: true
      - de: Danke, dir auch! Tschüss!
        en: Thanks, you too! Bye! (informal)
        reply: Danke, Ihnen auch! Auf Wiederschauen!
        replyEn: Thank you, you too! Goodbye!
```

```scene
title: 11 a.m. Asking the way
setting: You have spent the morning at the Naschmarkt, Vienna's famous food market, and now need to find Mariahilfer Straße. A young woman is waiting at the traffic lights.
partner: Eine junge Frau
turns:
  - options:
      - de: Entschuldigung, wie komme ich zur Mariahilfer Straße?
        en: Excuse me, how do I get to Mariahilfer Straße?
        ok: true
      - de: Entschuldigung, wie komme ich zum Mariahilfer Straße?
        en: Excuse me, how do I get to Mariahilfer Straße? (wrong gender)
        reply: Zur Mariahilfer Straße? Das ist nicht weit.
        replyEn: To Mariahilfer Straße? It's not far.
  - they: Gehen Sie hier geradeaus und dann die zweite Straße rechts.
    theyEn: Go straight on here and then take the second street on the right.
    options:
      - de: Geradeaus und dann die zweite Straße rechts. Vielen Dank!
        en: Straight on and then the second street on the right. Thank you very much!
        ok: true
      - de: Danke! Kann ich auch mit der U-Bahn fahren?
        en: Thanks! Can I go by underground too?
        ok: true
        reply: Ja, das geht. Aber zu Fuß sind es nur zehn Minuten.
        replyEn: Yes, you can. But it's only ten minutes on foot.
      - de: Danke! Kann ich auch mit die U-Bahn fahren?
        en: Thanks! Can I go by underground too? (wrong article)
        reply: Mit der U-Bahn? Ja, das geht. Aber zu Fuß sind es nur zehn Minuten.
        replyEn: By underground? Yes, you can. But it's only ten minutes on foot.
  - they: Bitte, gern geschehen. Schönen Tag noch!
    theyEn: You're welcome. Have a nice day!
    options:
      - de: Danke, gleichfalls!
        en: Thanks, you too!
        ok: true
```

```scene
title: 8 p.m. At the Heuriger
setting: A wine tavern on the edge of Vienna, under the vines. The waitress comes to your table.
partner: Die Kellnerin
turns:
  - they: Grüß Gott! Was möchten Sie trinken?
    theyEn: Hello! What would you like to drink?
    options:
      - de: Ich hätte gern ein Glas Weißwein, bitte.
        en: I'd like a glass of white wine, please.
        ok: true
      - de: Ich will ein Glas Weißwein.
        en: I want a glass of white wine.
        reply: Sie möchten ein Glas Weißwein? Sehr gern.
        replyEn: You'd like a glass of white wine? Certainly.
  - they: Und zum Essen? Heute gibt es Schweinsbraten.
    theyEn: And to eat? Today there's roast pork.
    options:
      - de: Gern, ich nehme den Schweinsbraten.
        en: Yes, please, I'll have the roast pork.
        ok: true
      - de: Ich esse kein Fleisch. Haben Sie auch etwas ohne Fleisch?
        en: I don't eat meat. Do you have anything without meat?
        ok: true
        reply: Natürlich! Wir haben Käse, Brot und Erdäpfelsalat.
        replyEn: Of course! We have cheese, bread and potato salad.
      - de: Ich esse nicht Fleisch.
        en: I eat not meat.
        reply: Sie essen kein Fleisch? Kein Problem, wir haben Käse, Brot und Erdäpfelsalat.
        replyEn: You don't eat meat? No problem, we have cheese, bread and potato salad.
  - they: Hat es Ihnen geschmeckt?
    theyEn: Did you enjoy your meal?
    options:
      - de: Ja, sehr gut, danke! Zahlen, bitte.
        en: Yes, very good, thank you! The bill, please.
        ok: true
      - de: Ja, ich habe sehr gut geschmeckt!
        en: Yes, I tasted very good!
        reply: (lacht) Es hat Ihnen gut geschmeckt? Das freut mich!
        replyEn: (laughs) You enjoyed it? I'm glad!
  - they: Das macht 23,50 Euro.
    theyEn: That's 23.50 euros.
    options:
      - de: Machen Sie 25 Euro, bitte.
        en: Make it 25 euros, please.
        ok: true
      - de: Hier sind 25 Euro. Stimmt nicht.
        en: Here's 25 euros. That's not right.
        reply: Stimmt nicht? Ach, Sie meinen „Stimmt so“! Vielen Dank!
        replyEn: Not right? Oh, you mean "Keep the change"! Thank you very much!
end: You walk back to the tram stop under a sky full of stars, and realise you have spent a whole day in German.
```

:::culture
Austria has its own words for everyday food: {die Semmel} (roll), {der Erdapfel} (potato), {der Paradeiser} (tomato), {das Schlagobers} (whipped cream). Germans understand them, and Austrians understand {Brötchen} and {Kartoffel}, but using the local word is a small, much appreciated courtesy.
:::

## Reading like the exam

In the Goethe A1 exam you read short, practical texts and decide what is true. The texts contain words you have not learnt: that is deliberate. Look for the information you need and ignore the rest.

```choose
title: Welche Anzeige passt?
items:
  - prompt: Mehmet, a student in Leipzig, wants to learn to cook. Which advert is for him?
    options:
      - 'Kochkurs für Anfänger: Italienisch kochen! Jeden Mittwoch 18–21 Uhr, Volkshochschule Leipzig, 45 €'
      - 'Restaurant Da Mario sucht einen Koch. Montag bis Samstag. Tel. 0341 556677'
    answer: 0
  - prompt: Mehmet needs a cheap bicycle.
    options:
      - 'Fahrrad zu verkaufen! 3 Jahre alt, blau, sehr gut. Nur 90 €. Tel. 0176 3344556'
      - 'Fahrradladen Speiche: neue Fahrräder ab 499 €. Reparaturen schnell und günstig.'
    answer: 0
  - prompt: "Mehmet's sister is visiting on Sunday. He wants to have breakfast with her in a café."
    options:
      - 'Café Lindgrün: Frühstück Montag bis Freitag 8–11 Uhr. Am Wochenende geschlossen.'
      - 'Café am Markt: Sonntagsfrühstück von 9 bis 14 Uhr, mit Brötchen, Eiern, Obst und Kaffee. 14,50 € pro Person.'
    answer: 1
  - prompt: Hannah is looking for a room in a shared flat.
    options:
      - 'Schöne 3-Zimmer-Wohnung, 75 qm, Balkon, 980 € + NK. Nur an Familien.'
      - 'WG sucht Mitbewohnerin! 14-qm-Zimmer, hell und ruhig, 390 € warm. Wir sind zwei Studentinnen und eine Katze.'
    answer: 1
```

```choose
title: Schilder – richtig oder falsch?
items:
  - de: 'Bäckerei Krause · Öffnungszeiten: Mo–Sa 6–18 Uhr, So 7–11 Uhr'
    prompt: "{Man kann am Sonntag um zehn Uhr Brötchen kaufen.}"
    options: [richtig, falsch]
    answer: 0
  - de: Liebe Kunden, vom 1. bis 14. August machen wir Urlaub. Ab 15. August sind wir wieder für Sie da!
    prompt: "{Das Geschäft ist im August zwei Wochen geschlossen.}"
    options: [richtig, falsch]
    answer: 0
  - de: Stadtbibliothek – Bitte leise sprechen! Essen und Trinken verboten.
    prompt: "{In der Bibliothek darf man Kaffee trinken.}"
    options: [richtig, falsch]
    answer: 1
  - de: Der Aufzug ist heute kaputt. Bitte nehmen Sie die Treppe.
    prompt: "{Man kann heute mit dem Aufzug fahren.}"
    options: [richtig, falsch]
    answer: 1
    en: The lift is out of order today. Please use the stairs.
  - de: 'Praxis Dr. Weber: Heute keine Sprechstunde! Bitte gehen Sie zu Dr. Krüger, Bahnhofstraße 12.'
    prompt: "{Heute kann man zu Dr. Krüger gehen.}"
    options: [richtig, falsch]
    answer: 0
```

## Ein Formular

Sooner or later every German learner fills in a form: for a course, a gym, a library card, or registering your address, which is compulsory within two weeks of moving in Germany (in Austria, within three days). The words are always the same.

```words
das Formular, -e | form
der Vorname, -n | first name
der Familienname, -n | surname
das Geburtsdatum, Geburtsdaten | date of birth
der Geburtsort, -e | place of birth
der Wohnort, -e | place of residence, town
die Postleitzahl, -en | postcode
die Staatsangehörigkeit, -en | nationality
der Familienstand (Sg.) | marital status
die Unterschrift, -en | signature
geboren | born
```

{Familienstand} is answered with the words from lesson 4: {ledig}, {verheiratet} or {geschieden}. Dates are written day, month, year with full stops: {07.11.2001}. {PLZ} is the usual short form of {Postleitzahl}, and {Str.} of {Straße}.

Mehmet (lesson 2) wants to do the cooking course at the {Volkshochschule}, the adult education centre that almost every town in Germany and Austria has. Read what he tells the woman at the desk:

> {Ich heiße Mehmet Arslan.} {Ich komme aus der Türkei, aus Izmir.} {Ich bin am 7. November 2001 in Izmir geboren.} {Jetzt wohne ich in Leipzig, in der Karl-Liebknecht-Straße 18.} {Die Postleitzahl ist 04107.} {Ich bin nicht verheiratet.} {Ich studiere Informatik an der Uni.}

```type
title: Fill in Mehmet's form
items:
  - prompt: Familienname
    answer: Arslan
  - prompt: Vorname
    answer: Mehmet
  - prompt: Geburtsdatum (TT.MM.JJJJ)
    answer: [07.11.2001, 7.11.2001, 7. November 2001]
  - prompt: Geburtsort
    answer: Izmir
  - prompt: Staatsangehörigkeit
    answer: [türkisch, Türkei]
  - prompt: Straße, Hausnummer
    answer: [Karl-Liebknecht-Straße 18, Karl-Liebknecht-Str. 18]
  - prompt: PLZ, Wohnort
    answer: [04107 Leipzig]
  - prompt: Familienstand
    answer: ledig
  - prompt: Beruf
    answer: [Student, Student der Informatik]
```

## Alles gemischt

Every drill in this section mixes several lessons.

```gender
title: Article and plural, from all of A1
plural: true
items: [Bruder, Tochter, Brötchen, Apfel, Küche, Zimmer, Hemd, Jacke, Fahrrad, Buch, Wohnung, Museum]
```

```conjugate
title: Verbs from all of A1
items:
  - verb: sein
    tense: present
  - verb: nehmen
    tense: present
    persons: [1, 2]
  - verb: aufstehen
    tense: present
    persons: [0, 2]
  - verb: können
    tense: present
    persons: [1, 4]
  - verb: fahren
    tense: perfect
    persons: [0, 3]
```

```cloze
title: One sentence, several lessons
items:
  - de: Mein Bruder [isst](essen) gern Fisch, aber er [mag](mögen) [keinen] Salat.
    en: My brother likes eating fish, but he doesn't like salad.
  - de: Um sieben [stehe](aufstehen) ich [auf], dann [frühstücke](frühstücken) ich.
    en: At seven I get up, then I have breakfast.
  - de: Wie findest du [den] Pullover? – Ich finde [ihn] zu teuer.
    en: What do you think of the jumper? – I think it's too expensive.
  - de: Am Samstag [kann](können) ich nicht. Ich [muss](müssen) arbeiten.
    en: On Saturday I can't. I have to work.
  - de: Gestern [sind](sein/haben) wir ins Kino [gegangen](gehen).
    en: Yesterday we went to the cinema.
  - de: '[Hast](haben) du Geschwister? – Ja, ich habe [einen] Bruder und zwei [Schwestern].'
    en: Do you have any brothers or sisters? – Yes, I have a brother and two sisters.
  - de: Die Schuhe [gefallen](gefallen) [mir](me) sehr gut.
    en: I like the shoes very much.
  - de: Wir fahren mit [dem] Bus [zum/zu dem] Bahnhof.
    en: We're going to the station by bus.
```

```fill
title: nicht or kein?
items:
  - de: Tut mir leid, ich habe heute ___ Zeit.
    options: [keine, nicht]
    answer: 0
    en: Sorry, I have no time today.
  - de: Das Zimmer ist ___ groß, aber sehr gemütlich.
    options: [nicht, kein]
    answer: 0
    en: The room isn't big, but very cosy.
  - de: Ich trinke ___ Kaffee, nur Tee.
    options: [keinen, nicht]
    answer: 0
    en: I don't drink coffee, only tea.
  - de: Wir fahren heute ___ mit dem Auto.
    options: [nicht, kein]
    answer: 0
    en: We're not going by car today.
  - de: Das ist ___ Hund, das ist eine Katze!
    options: [kein, nicht]
    answer: 0
    en: That's not a dog, that's a cat!
```

```choose
title: du, ihr or Sie?
items:
  - prompt: You ask a stranger in Zurich where the station is.
    options: ['Entschuldigung, wie komme ich zum Bahnhof?', 'Hallo, sag mal, wo ist der Bahnhof?']
    answer: 0
    explain: A stranger in the street gets the polite form.
  - prompt: You invite two friends to the cinema.
    options: [Habt ihr Lust auf Kino?, Hast du Lust auf Kino?, Haben Sie Lust auf Kino?]
    answer: 0
  - prompt: A shop assistant asks you whether you like the coat.
    options: [Gefällt Ihnen der Mantel?, Gefällt dir der Mantel?]
    answer: 0
  - prompt: You tell your flatmate to come in.
    options: [Komm rein!, Kommen Sie rein!, Kommt rein!]
    answer: 0
```

```order
title: Word order, all of it
items:
  - en: On Sundays I get up late.
    de: Am_Sonntag stehe ich spät auf.
    also: [Ich stehe am_Sonntag spät auf.]
  - en: Can you come along tomorrow? (to a friend)
    de: Kannst du morgen mitkommen?
    extra: [kommst]
  - en: We stayed at home yesterday.
    de: Wir sind gestern zu_Hause geblieben.
    extra: [haben]
    also: [Gestern sind wir zu_Hause geblieben.]
  - en: Where do you live? (formal)
    de: Wo wohnen Sie?
  - en: I don't like the jacket.
    de: Die Jacke gefällt mir nicht.
    also: [Mir gefällt die Jacke nicht.]
```

## A1 grammar on one page

**Verbs in the present** (lessons 2, 4, 5, 9). Endings -e, -st, -t, -en, -t, -en. Some strong verbs change their vowel in the du and er forms only: {sprechen → du sprichst}, {essen → er isst}, {fahren → du fährst}, {lesen → er liest}. Modal verbs have no ending in the ich and er forms.

| | {wohnen} | {arbeiten} | {sprechen} | {sein} | {haben} | {können} |
| --- | --- | --- | --- | --- | --- | --- |
| {ich} | {wohne} | {arbeite} | {spreche} | {bin} | {habe} | {kann} |
| {du} | {wohnst} | {arbeitest} | {sprichst} | {bist} | {hast} | {kannst} |
| {er/sie/es} | {wohnt} | {arbeitet} | {spricht} | {ist} | {hat} | {kann} |
| {wir} | {wohnen} | {arbeiten} | {sprechen} | {sind} | {haben} | {können} |
| {ihr} | {wohnt} | {arbeitet} | {sprecht} | {seid} | {habt} | {könnt} |
| {sie/Sie} | {wohnen} | {arbeiten} | {sprechen} | {sind} | {haben} | {können} |

**Word order** (lessons 2, 6, 9, 11). The conjugated verb is second; in yes/no questions and commands it is first. Everything else that belongs to the verb goes to the end: the separable prefix, the infinitive after a modal verb, the participle.

| Position 1 | Verb | Middle | End |
| --- | --- | --- | --- |
| {Um sieben} | {stehe} | {ich} | {auf.} |
| {Was} | {machst} | {du am Samstag?} | |
| | {Kommst} | {du} | {mit?} |
| {Ich} | {muss} | {morgen früh} | {aufstehen.} |
| {Wir} | {sind} | {gestern nach Wien} | {gefahren.} |

**Articles and cases** (lessons 4, 5, 8, 10). Only the masculine changes in the accusative. {ein}, {kein} and the possessives ({mein}, {dein}, {sein}, {ihr}, {unser}, {euer}, {Ihr}) share one set of endings; {dieser} and {welcher} copy {der}, {die}, {das}.

| | masculine | feminine | neuter | plural |
| --- | --- | --- | --- | --- |
| nominative | {der}, {ein}, {dieser} | {die}, {eine}, {diese} | {das}, {ein}, {dieses} | {die}, {keine}, {diese} |
| accusative | **{den}, {einen}, {diesen}** | {die}, {eine}, {diese} | {das}, {ein}, {dieses} | {die}, {keine}, {diese} |
| dative, after {mit}, {zu}, {bei}, {von} … | {dem} | {der} | {dem} | {den} |

The accusative is used for the object of most verbs ({Ich nehme den Fisch}) and after {es gibt}. Contractions: {zum}, {zur}, {im}, {am}, {ins}, {beim}, {vom}.

**Pronouns** (lessons 2, 7, 10).

| nominative | {ich} | {du} | {er} | {sie} | {es} | {wir} | {ihr} | {sie} | {Sie} |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| accusative | {mich} | {dich} | {ihn} | {sie} | {es} | {uns} | {euch} | {sie} | {Sie} |
| dative (so far) | {mir} | {dir} | | | | | | | {Ihnen} |

**Plurals** (lesson 4): -e, -er, -(e)n, no ending, -s, often with an umlaut. The plural article is always {die}.

**Negation** (lessons 5, 7): {kein} replaces {ein} or no article ({Ich habe keine Zeit}); {nicht} negates everything else, and goes before adjectives, places, separable prefixes and second verbs ({Das ist nicht teuer}, {Ich kann heute nicht kommen}).

**The imperative** (lesson 8): {Kommen Sie!} · {Komm!} · {Kommt!} For du, take the du form and drop -st and any umlaut: {du kommst → Komm!}, {du fährst → Fahr!}; but an e that became i stays: {du nimmst → Nimm!}

**Modal verbs** (lesson 9): {können}, {wollen}, {müssen}, {dürfen}, {sollen}, {möchten} + infinitive at the end. {Ich will} = I want. {Du musst nicht} = you don't have to; {Du darfst nicht} = you mustn't. Liking: {Ich mag Käse} (things), {Ich schwimme gern / lieber / am liebsten} (activities), {Der Pullover gefällt mir} (how it looks).

**The past** (lesson 11): {haben} or {sein} + participle at the end. Regular {ge…t} ({gemacht}), irregular {ge…en} ({gegessen}). {sein} for movement from A to B, and for {bleiben} and {sein}. For {sein} and {haben} themselves, use {war} and {hatte}.

**Time** (lesson 6): {um acht Uhr}, {am Montag}, {am Abend}, {im Juli}. {halb drei} is 2:30. Time words often come first, and then the verb is still second: {Gestern war ich krank.}

## Check yourself

```type
title: Say it in German
items:
  - prompt: My name is Alex and I come from Ireland.
    answer: [Ich heiße Alex und ich komme aus Irland., Ich heiße Alex und komme aus Irland., Mein Name ist Alex und ich komme aus Irland.]
  - prompt: How much does the jacket cost?
    answer: [Wie viel kostet die Jacke?, Was kostet die Jacke?]
  - prompt: "I'd like a coffee and two rolls, please."
    answer: ['Ich hätte gern einen Kaffee und zwei Brötchen, bitte.', 'Ich möchte einen Kaffee und zwei Brötchen, bitte.', 'Ich hätte gern einen Kaffee und zwei Semmeln, bitte.', Ich hätte gern einen Kaffee und zwei Brötchen.]
  - prompt: Excuse me, how do I get to the station?
    answer: ['Entschuldigung, wie komme ich zum Bahnhof?', Wie komme ich zum Bahnhof?]
  - prompt: On Saturday I have to work. (start with On Saturday)
    answer: [Am Samstag muss ich arbeiten.]
  - prompt: Yesterday we went to Vienna. (by car or train)
    answer: [Gestern sind wir nach Wien gefahren., Wir sind gestern nach Wien gefahren.]
```

```type
title: Dictation
items:
  - listen: true
    answer: Wie heißen Sie, bitte?
  - listen: true
    answer: Ich stehe jeden Tag um halb sieben auf.
  - listen: true
    answer: Kannst du am Freitag mitkommen?
  - listen: true
    answer: Am Wochenende sind wir nach Graz gefahren.
```

```speak
title: Say it aloud
items:
  - Guten Tag! Ich heiße Alex Morgan und ich komme aus Irland.
  - Ich wohne in Basel und ich bin Ingenieur.
  - Am Wochenende spiele ich gern Tennis.
  - Gestern habe ich lange geschlafen.
```

```roleplay
title: The speaking exam, part one
setting: The speaking part of the Goethe A1 exam. The examiner asks you to introduce yourself using the keywords on a card - Name, Alter, Land, Wohnort, Sprachen, Beruf, Hobby - then asks you to spell your name and give a phone number.
goal: Introduce yourself in full sentences using every keyword on the card, spell your surname, and say a phone number.
partner: Frau Schmid, a friendly but precise examiner at the Goethe-Institut
opener: Guten Tag! Bitte stellen Sie sich vor. Hier ist Ihre Karte.
openerEn: Hello! Please introduce yourself. Here is your card.
words: [heißen, kommen, wohnen, sprechen, sein, Jahre alt, gern]
checks: ['gave name, age, country, town, languages, job and a hobby in full sentences', spelt the surname with German letter names, said a phone number digit by digit or in pairs]
```

```compose
task: "Your friend Jonas has invited you to his party on Saturday, but you can't go. Write him a short message (about 30 words): say sorry, say why, and suggest another day."
target: modal verbs, invitations, verb second, du
hints: ['{Lieber Jonas, …}', '{Leider kann ich am Samstag nicht kommen. Ich muss …}', '{Hast du am … Zeit?}']
examples: ['Lieber Jonas, vielen Dank für die Einladung! Leider kann ich am Samstag nicht kommen. Meine Eltern kommen nach Berlin. Hast du am Sonntag Zeit? Wir können zusammen frühstücken! Liebe Grüße, Mia']
```
