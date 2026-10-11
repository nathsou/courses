---
title: Travelling
goals:
  - buy a train ticket, follow station announcements and change trains
  - book a hotel room and complain politely at reception
  - say dates like am dritten Mai and vom 2. bis zum 9. Juli
  - say what you could, wanted or had to do (konnte, wollte, musste)
  - talk about the weather
---

The Swiss railways are famous for running to the minute; the German ones are famous for apologising. Either way, a trip through the German-speaking countries means tickets, platforms, announcements and, sooner or later, a hotel reception. This lesson gets you from the ticket counter to your room, and back to reception if the heating doesn't work.

Along the way you will learn to say dates, which German builds from ordinal numbers, and the past of the modal verbs. Those are the forms you need to tell the story afterwards: {Wir mussten in Frankfurt umsteigen, und ich konnte nicht schlafen.}

## Am Bahnhof

```dialogue
title: Im Reisezentrum
Mitarbeiterin: Guten Tag! Was kann ich für Sie tun? | Hello! What can I do for you?
Luca: Guten Tag. Ich möchte eine Fahrkarte nach München, bitte. | Hello. I'd like a ticket to Munich, please.
Mitarbeiterin: Einfach oder hin und zurück? | Single or return?
Luca: Hin und zurück. Hin am Freitag, zurück am Sonntag. | Return. Out on Friday, back on Sunday.
Mitarbeiterin: Am Freitag fährt um 9:01 Uhr ein ICE direkt nach München. Um 10:05 Uhr müssen Sie in Frankfurt umsteigen. | On Friday there's an ICE direct to Munich at 9:01. At 10:05 you have to change in Frankfurt.
Luca: Den um 9:01 Uhr, bitte. Kann ich einen Platz reservieren? | The 9:01, please. Can I reserve a seat?
Mitarbeiterin: Natürlich. Am Fenster oder am Gang? | Of course. Window or aisle?
Luca: Am Fenster, bitte. | Window, please.
Mitarbeiterin: Gut. Das macht zusammen 189,80 Euro. Ihr Zug fährt von Gleis 14. Gute Reise! | Fine. That's 189.80 euros altogether. Your train leaves from platform 14. Have a good trip!
```

A few things to notice. **{einfach}** is a single ticket (literally "simple"), **{hin und zurück}** a return ("there and back"). **{das Gleis}** is literally the track, but it is what Germans say when they mean the platform: {Der Zug fährt von Gleis 14.} And {umsteigen}, like {einsteigen} (to get on) and {aussteigen} (to get off), is separable and takes {sein} in the perfect: {Ich bin in Frankfurt umgestiegen.}

:::culture
The three national railways are the **DB** (Deutsche Bahn), the **ÖBB** in Austria and the **SBB** in Switzerland. In Switzerland a ticket is often {das Billett} and a platform {der Perron}, both borrowed from French. In Germany, the monthly {Deutschlandticket} covers all local and regional trains, buses and trams, but not the fast ICE and IC trains.
:::

```words
die Fahrkarte, -n | ticket
das Gleis, -e | platform, track
die Abfahrt, -en | departure
die Ankunft, ¨-e | arrival
um|steigen (steigt um, stieg um, ist umgestiegen) | to change (trains, buses)
ein|steigen (steigt ein, stieg ein, ist eingestiegen) | to get on, to board
aus|steigen (steigt aus, stieg aus, ist ausgestiegen) | to get off
der Anschluss, ¨-e | connection
einfach | single (ticket); simple, easy
hin und zurück | return (ticket)
reservieren | to reserve
der Koffer, - | suitcase
```

```match
title: At the station
pairs:
  - [die Fahrkarte, ticket]
  - [das Gleis, platform]
  - [umsteigen, to change trains]
  - [die Abfahrt, departure]
  - [die Ankunft, arrival]
  - [der Anschluss, connection]
  - [einfach, single (ticket)]
  - [hin und zurück, return (ticket)]
```

```order
title: At the ticket counter
items:
  - en: I'd like a ticket to Vienna, please.
    de: Ich möchte eine_Fahrkarte nach_Wien bitte.
    also: [Ich möchte bitte eine_Fahrkarte nach_Wien.]
  - en: Do I have to change trains?
    de: Muss ich umsteigen?
  - en: Which platform does the train leave from?
    de: Von welchem_Gleis fährt der_Zug?
    extra: [Welches_Gleis]
  - en: We got off in Salzburg.
    de: Wir sind in_Salzburg ausgestiegen.
    also: [In_Salzburg sind wir ausgestiegen.]
    extra: [haben]
```

## Die Durchsage

Station announcements are fast, formulaic and full of numbers. The good news is that they always use the same few phrases:

| Announcement | Meaning |
| --- | --- |
| {An Gleis 7 fährt ein: …} | Now arriving at platform 7: … |
| {Bitte Vorsicht bei der Einfahrt.} | Please stand back, a train is approaching. |
| {Heute circa 20 Minuten später.} | About 20 minutes late today. |
| {Der Zug hat 20 Minuten Verspätung.} | The train is 20 minutes late. |
| {Der Zug fährt heute von Gleis 9.} | The train leaves from platform 9 today. |
| {Der Zug fällt heute aus.} | The train is cancelled today. |
| {Wir bitten um Entschuldigung.} | We apologise. |

:::tip
Listen for three things only: the **train** (number or destination), the **platform**, and the **change** ({später}, {Verspätung}, {fällt aus}, {von Gleis …}). Everything else is politeness.
:::

```words
die Durchsage, -n | announcement
die Verspätung, -en | delay
aus|fallen (fällt aus, fiel aus, ist ausgefallen) | to be cancelled
```

```choose
title: Listen to the announcements
items:
  - de: 'Meine Damen und Herren, an Gleis 7 fährt ein: der ICE nach Hamburg. Bitte Vorsicht bei der Einfahrt.'
    audio: true
    listen: true
    prompt: Which platform is the train arriving at?
    options: ['7', '17', '70']
    answer: 0
  - de: Information zum ICE nach Hamburg, Abfahrt 14:28 Uhr. Heute circa 20 Minuten später. Wir bitten um Entschuldigung.
    audio: true
    listen: true
    prompt: What is the problem?
    options: [The train is about 20 minutes late., The train is cancelled., The train leaves from a different platform.]
    answer: 0
  - de: Achtung, eine Gleisänderung. Der ICE nach Hamburg fährt heute von Gleis 9.
    audio: true
    listen: true
    prompt: What has changed?
    options: [the platform, the departure time, the destination]
    answer: 0
  - de: Der Zug endet heute in Hannover. Reisende nach Hamburg steigen bitte in Hannover um.
    audio: true
    listen: true
    prompt: What must passengers for Hamburg do?
    options: [change trains in Hanover, stay on the train, wait for the next train]
    answer: 0
  - de: Der Regionalexpress nach Kiel fällt heute aus.
    audio: true
    listen: true
    prompt: What is happening to the train to Kiel?
    options: [It is cancelled., It is late., It is full.]
    answer: 0
```

## Der erste, der zweite: dates

Dates in German use **ordinal numbers** (first, second, third). They are easy to build:

- **1st to 19th: number + -te.** {zweite}, {vierte}, {fünfte}, {zehnte}, {neunzehnte}. Four are irregular: **{erste}**, **{dritte}**, **{siebte}** and **{achte}** (only one t).
- **20th and above: number + -ste.** {zwanzigste}, {einundzwanzigste}, {dreißigste}, {hundertste}.
- In writing, a **full stop** after the figure makes it ordinal: {der 3. Mai} is read {der dritte Mai}.

Ordinals take endings like adjectives, but for dates you only need two:

| | the date: **-e** | on, from, until: **-en** |
| --- | --- | --- |
| 1. | {Heute ist der erste Mai.} | {am ersten Mai} |
| 3. | {Heute ist der dritte Juni.} | {am dritten Juni} |
| 7. | {Morgen ist der siebte Juli.} | {vom siebten Juli} |
| 20. | {Gestern war der zwanzigste März.} | {bis zum zwanzigsten März} |

After {der}, the ending is -e; after {am}, {vom}, {zum}, the dative contractions, it is -en. So "from 2 to 9 July" is {vom zweiten bis zum neunten Juli}, written {vom 2. bis zum 9. Juli}. To ask the date, say {Der Wievielte ist heute?} or {Welches Datum haben wir heute?}

:::culture
Germans write the day first, with dots: **3.5.2026** is 3 May, never 5 March. At the top of a letter: {Wien, 3. Mai 2026}. Austrians call January {Jänner}. And floors are counted the British way: {das Erdgeschoss} is the ground floor, {der erste Stock} the floor above it.
:::

```words
das Datum, Daten | date
Der Wievielte ist heute? | What's the date today?
```

```type
title: 'Dates in words: write out the ordinal, with its ending'
items:
  - de: Heute ist der ___ Mai.
    hint: 3.
    answer: dritte
  - de: Ich habe am ___ Juli Geburtstag.
    hint: 7.
    answer: siebten
  - de: Wir sind vom ___ bis zum fünften August in Wien.
    hint: 1.
    answer: ersten
  - de: Die Party ist am ___ Dezember.
    hint: 31.
    answer: einunddreißigsten
  - de: Der ___ März ist ein Freitag.
    hint: 20.
    answer: zwanzigste
  - de: Unser Zimmer ist im ___ Stock.
    hint: 2.
    answer: zweiten
  - de: Das Hotel ist vom 24. Dezember bis zum ___ Januar geschlossen.
    hint: 8.
    answer: achten
```

## Im Hotel

```words
das Einzelzimmer, - | single room
das Doppelzimmer, - | double room
die Halbpension (Sg.) | half board
die Rezeption, -en | reception
buchen | to book
übernachten | to stay the night
der Aufzug, ¨-e | lift
die Heizung, -en | heating
```

{die Halbpension} is breakfast and dinner; {die Vollpension} adds lunch. In Austria and Switzerland the lift is usually {der Lift}.

```read
title: Ihre Buchung
setting: A booking confirmation from a hotel in Innsbruck, in Aylin Yilmaz's inbox.
text: |
  Sehr geehrte Frau Yilmaz,

  vielen Dank für Ihre Buchung! Hiermit bestätigen wir Ihre Reservierung:

  Anreise: Freitag, 10. Juli 2026
  Abreise: Sonntag, 12. Juli 2026
  2 Nächte, 1 Doppelzimmer mit Balkon, Halbpension
  Preis: 248 Euro pro Nacht, mit Frühstück und Abendessen

  Check-in ab 15 Uhr, Check-out bis 11 Uhr.
  Unser Restaurant ist täglich von 18 bis 21 Uhr geöffnet.
  Parkplätze finden Sie direkt hinter dem Hotel.

  Wir freuen uns auf Ihren Besuch!

  Mit freundlichen Grüßen
  Martina Hofer
  Rezeption, Hotel Alpenrose
en: |
  Dear Ms Yilmaz,

  Thank you very much for your booking! We hereby confirm your reservation:

  Arrival: Friday, 10 July 2026
  Departure: Sunday, 12 July 2026
  2 nights, 1 double room with balcony, half board
  Price: 248 euros per night, with breakfast and dinner

  Check-in from 3 p.m., check-out by 11 a.m.
  Our restaurant is open daily from 6 to 9 p.m.
  You will find parking directly behind the hotel.

  We look forward to your visit!

  Kind regards
  Martina Hofer
  Reception, Hotel Alpenrose
questions:
  - claim: Frau Yilmaz bleibt drei Nächte im Hotel.
    answer: false
    explain: "{2 Nächte}: from Friday to Sunday."
  - claim: Das Zimmer hat einen Balkon.
    answer: true
  - claim: Das Abendessen ist im Preis inklusive.
    answer: true
    explain: "{Halbpension}: breakfast and dinner."
  - claim: Man kann schon um elf Uhr einchecken.
    answer: false
  - prompt: Where can Aylin park?
    options: [behind the hotel, in front of the hotel, at the station]
    answer: 0
```

## Ich musste umsteigen: konnte, wollte, musste

When Germans talk about the past, the modal verbs are the big exception to the perfect: even in conversation they use the **Präteritum**. {Ich musste gestern lange arbeiten}, not {Ich habe gestern lange arbeiten müssen}, which exists but sounds heavy.

The forms are pleasingly regular: **drop the umlaut, add -te**.

| | können | müssen | dürfen | wollen | sollen | mögen |
| --- | --- | --- | --- | --- | --- | --- |
| ich | {konnte} | {musste} | {durfte} | {wollte} | {sollte} | {mochte} |
| du | {konntest} | {musstest} | {durftest} | {wolltest} | {solltest} | {mochtest} |
| er/sie/es | {konnte} | {musste} | {durfte} | {wollte} | {sollte} | {mochte} |
| wir | {konnten} | {mussten} | {durften} | {wollten} | {sollten} | {mochten} |
| ihr | {konntet} | {musstet} | {durftet} | {wolltet} | {solltet} | {mochtet} |
| sie/Sie | {konnten} | {mussten} | {durften} | {wollten} | {sollten} | {mochten} |

As in the present ({ich kann}, {er kann}), the ich and er forms are the same, with no -t. {mögen} also changes g to ch: {mochte}. And {möchten} has no past of its own: "I wanted to" is {ich wollte}. {Ich möchte nach Wien} becomes {Ich wollte nach Wien}.

:::mistake
Watch the umlaut: it changes the meaning. {Ich konnte nicht schlafen} is "I couldn't sleep" (past). {Ich könnte heute kommen} is "I could come today" (a possibility, the Konjunktiv II you will meet at B1). The same goes for {musste} (had to) and {müsste} (ought to), {durfte} (was allowed to) and {dürfte}. Many returners mix them up; your listeners will notice.
:::

```conjugate
title: The past of the modal verbs
items:
  - verb: können
    tense: preterite
  - verb: müssen
    tense: preterite
  - verb: wollen
    tense: preterite
    persons: [0, 1, 3]
```

```cloze
title: A trip with obstacles
prompt: Put the modal verb into the Präteritum.
items:
  - de: Der Zug hatte Verspätung. Ich [musste](müssen) in Basel eine Stunde warten.
    en: The train was late. I had to wait an hour in Basel.
  - de: Wir [wollten](wollen) um acht fahren, aber der Zug ist ausgefallen.
    en: We wanted to leave at eight, but the train was cancelled.
  - de: '[Konntest](können) du im Zug schlafen?'
    en: Were you able to sleep on the train?
  - de: Früher [durfte](dürfen) man im Zug rauchen.
    en: You used to be allowed to smoke on trains.
  - de: Ich [sollte](sollen) Mia vom Bahnhof abholen, aber ich habe es vergessen.
    en: I was supposed to pick Mia up from the station, but I forgot.
  - de: Ihr [musstet](müssen) in Frankfurt umsteigen, oder?
    en: You had to change in Frankfurt, didn't you?
  - de: Als Kind [mochte](mögen) ich keinen Kaffee.
    en: As a child I didn't like coffee.
```

```order
title: What happened on the trip
items:
  - en: I couldn't sleep.
    de: Ich konnte nicht schlafen.
    extra: [könnte]
  - en: We wanted to go to Salzburg.
    de: Wir wollten nach_Salzburg fahren.
    also: [Nach_Salzburg wollten wir fahren.]
  - en: Did you have to change trains? (to a friend)
    de: Musstest du umsteigen?
    extra: [Müsstest]
```

## Wie ist das Wetter?

German weather sentences almost all start with **{es}**: {Es regnet}, {Es schneit}, {Es ist kalt}. Only the sun gets a subject of its own: {Die Sonne scheint}.

| | |
| --- | --- |
| {Es ist sonnig.} {Die Sonne scheint.} | It's sunny. The sun is shining. |
| {Es ist bewölkt.} | It's cloudy. |
| {Es regnet.} {Es schneit.} | It's raining. It's snowing. |
| {Es ist windig.} | It's windy. |
| {Es gibt ein Gewitter.} | There's a thunderstorm. |
| {Es sind 25 Grad.} {Es ist minus fünf Grad.} | It's 25 degrees. It's minus five. |
| {Es hat geregnet.} {Es war kalt.} | It rained. It was cold. |

Temperatures are in Celsius, and {Grad} does not change in the plural: {zwanzig Grad}. Both {Es ist 25 Grad} and {Es sind 25 Grad} are heard.

:::culture
In the Alps you will hear people blame headaches and bad moods on **{der Föhn}**, a warm, dry wind that comes down from the mountains. The same word means a hairdryer, which, as it happens, blows warm, dry air too.
:::

```words
regnen | to rain
schneien | to snow
scheinen (scheint, schien, hat geschienen) | to shine
die Sonne, -n | sun
der Regen (Sg.) | rain
der Schnee (Sg.) | snow
der Wind, -e | wind
das Gewitter, - | thunderstorm
die Wolke, -n | cloud
bewölkt | cloudy
sonnig | sunny
windig | windy
der Grad, -e | degree
```

```read
title: Das Wetter am Wochenende
setting: The weekend forecast on an Austrian news website in October.
text: |
  Samstag: Im Westen und im Süden scheint den ganzen Tag die Sonne, bei Temperaturen bis 22 Grad. Im Norden ist es bewölkt, und am Nachmittag gibt es dort Gewitter.

  Sonntag: Von Westen kommt Regen. In Tirol und Vorarlberg regnet es schon am Vormittag, in Wien erst am Abend. Die Temperaturen liegen nur noch bei 12 bis 15 Grad. Auf den Bergen über 2000 Metern kann es schneien.

  Montag: Kühl und windig, höchstens 10 Grad.
en: |
  Saturday: In the west and south the sun shines all day, with temperatures up to 22 degrees. In the north it is cloudy, and there will be thunderstorms there in the afternoon.

  Sunday: Rain arrives from the west. In Tyrol and Vorarlberg it is already raining in the morning, in Vienna not until the evening. Temperatures will only be 12 to 15 degrees. In the mountains above 2,000 metres it may snow.

  Monday: Cool and windy, 10 degrees at most.
questions:
  - claim: Am Samstag scheint im Süden die Sonne.
    answer: true
  - claim: In Wien regnet es am Sonntag schon am Vormittag.
    answer: false
    explain: "{in Wien erst am Abend}: not until the evening."
  - claim: Auf den Bergen kann es am Sonntag schneien.
    answer: true
  - prompt: What will Monday be like?
    options: [cool and windy, sunny and warm, stormy and hot]
    answer: 0
```

## Eine Beschwerde an der Rezeption

A complaint in German is polite but direct: say what the problem is, then what you would like. {Entschuldigung, ich habe ein Problem mit meinem Zimmer} opens almost any complaint. The modal verbs in the past are perfect for it: {Ich konnte nicht schlafen}, {Ich wollte duschen, aber das Wasser war kalt}.

```words
die Beschwerde, -n | complaint
funktionieren | to work (of a machine)
kaputt | broken
```

```scene
title: A bad night in Innsbruck
setting: It is the morning after your first night at the Hotel Alpenrose in Innsbruck. You go down to reception.
partner: Herr Gruber, the receptionist
turns:
  - they: Guten Morgen! Wie haben Sie geschlafen?
    theyEn: Good morning! How did you sleep?
    options:
      - de: Leider gar nicht gut. Ich konnte nicht schlafen.
        en: Not well at all, I'm afraid. I couldn't sleep.
        ok: true
      - de: Leider gar nicht gut. Ich könnte nicht schlafen.
        en: Not well at all, I'm afraid. I could (would be able to) not sleep.
        reply: Oh, Sie konnten nicht schlafen? Das tut mir leid!
        replyEn: Oh, you couldn't sleep? I'm sorry!
  - they: Was war denn das Problem?
    theyEn: So what was the problem?
    options:
      - de: Das Zimmer war sehr laut, und die Heizung hat nicht funktioniert.
        en: The room was very noisy, and the heating didn't work.
        ok: true
      - de: Das Zimmer war sehr laut, und die Heizung ist nicht funktioniert.
        en: The room was very noisy, and the heating is not worked.
        reply: Die Heizung hat nicht funktioniert? Das ist ja ärgerlich.
        replyEn: The heating didn't work? That's really annoying.
  - they: Das tut mir wirklich leid. Sie haben Zimmer 214 im zweiten Stock, richtig?
    theyEn: I'm really sorry. You're in room 214 on the second floor, right?
    options:
      - de: Ja, genau. Und ich wollte eigentlich ein Zimmer mit Balkon.
        en: Yes, that's right. And actually I wanted a room with a balcony.
        ok: true
      - de: Ja, genau. Und ich wollt eigentlich ein Zimmer mit Balkon.
        en: Yes, that's right. And actually I want (wrong form) a room with a balcony.
        reply: Sie wollten ein Zimmer mit Balkon, ja, das sehe ich hier.
        replyEn: You wanted a room with a balcony, yes, I can see that here.
  - they: Ich kann Ihnen heute ein anderes Zimmer geben, im fünften Stock, mit Balkon und Blick auf die Berge.
    theyEn: I can give you another room today, on the fifth floor, with a balcony and a view of the mountains.
    options:
      - de: Das ist sehr nett, vielen Dank!
        en: That's very kind, thank you very much!
        ok: true
      - de: Super, danke! Kannst du mir auch einen Kaffee bringen?
        en: Great, thanks! Can you (du) bring me a coffee too?
        reply: Einen Kaffee? Aber natürlich, den bringe ich Ihnen sofort!
        replyEn: A coffee? Of course, I'll bring you one straight away!
end: Your new room on the fifth floor looks straight onto the mountains above Innsbruck, and the coffee is on the house.
```

```speak
title: Say it aloud
items:
  - Einmal nach Salzburg, hin und zurück, bitte.
  - Muss ich umsteigen?
  - Ich habe am dritten Mai Geburtstag.
  - Ich konnte leider nicht schlafen.
  - Heute regnet es, aber morgen scheint die Sonne.
```

```roleplay
title: At the ticket counter
setting: You are at the ticket counter in Vienna's main station. You want to visit a friend in Graz this weekend.
goal: Buy a return ticket to Graz for a specific date (say the date with an ordinal), ask about the departure time, the platform and whether you have to change, and reserve a seat.
partner: Frau Leitner, a friendly but very fast ÖBB ticket clerk
opener: Grüß Gott! Wohin soll's denn gehen?
openerEn: Hello! So where are you off to?
words: [die Fahrkarte, hin und zurück, am … (date), umsteigen, das Gleis, reservieren, die Abfahrt]
checks: [asked for a return ticket, gave a date with an ordinal and the right ending, asked about the platform or a change of trains]
```

```compose
task: Write a short postcard (four or five sentences) from a trip. Say where you are, what the weather is like, what you wanted to do and what you had to do instead.
target: Präteritum of modal verbs (wollte, musste, konnte), weather expressions, dates with ordinals
hints: ['{Liebe …, ich bin seit dem … in …}', '{Wir wollten …, aber …}', '{Es regnet / Die Sonne scheint …}']
examples:
  - Liebe Mia, ich bin seit dem zweiten Juli in Zürich. Am Samstag wollten wir auf den Uetliberg, aber es hat geregnet. Wir mussten ins Museum gehen. Liebe Grüße, Ben
  - Hallo Paul, das Wetter in Hamburg ist super, die Sonne scheint und es sind 24 Grad. Leider konnte ich gestern nicht schlafen, das Hotel ist sehr laut.
```
