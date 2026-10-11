---
title: Numbers you can say
goals:
  - count from zero to a million, building big numbers the German way
  - say your age, your phone number and your email address, and understand other people's
  - ask what something costs and understand prices in euros and Swiss francs
  - say years such as 1989 and 2026
---

German numbers are built like Lego: learn about thirty pieces and you can make any number up to a million. There is one twist, and it is the famous one: 21 is {einundzwanzig}, "one-and-twenty", the units before the tens. English did this too, once: "four-and-twenty blackbirds baked in a pie".

If you learnt German before, you can probably still count to ten. The hard part, for everyone, is *hearing* {siebenundvierzig} at speed and writing down 47 rather than 74. So this lesson is full of listening: phone numbers, prices and years, the numbers you actually meet.

## Null bis zwölf

```words
null | zero
eins | one
zwei | two
zwo | two (on the phone, to avoid confusion with drei)
drei | three
vier | four
fünf | five
sechs | six
sieben | seven
acht | eight
neun | nine
zehn | ten
elf | eleven
zwölf | twelve
die Zahl, -en | number, figure
```

Use what you learnt about sounds in lesson 1: {zwei} starts with ts and rhymes with "high"; {vier} starts with f; {sechs} sounds like "zeks", with chs as ks; {sieben} starts with a z sound; {acht} has the rough ch; {neun} has the "oy" of {eu}; {zwölf} needs your rounded ö.

{Eins} is the number you count with: {eins, zwei, drei}. Before a noun it shrinks to {ein} ({ein Euro}), and inside longer numbers too ({einundzwanzig}).

:::tip
On the phone and over loudspeakers, Germans often say {zwo} instead of {zwei}, so that it cannot be confused with {drei}. You will hear it in phone numbers, prices and times; it is never wrong when speaking, but write {zwei}.
:::

:::culture
Germans count on their fingers starting with the **thumb**: thumb up is one, thumb and index finger two. Hold up your index and middle finger to order two beers and the waiter may well bring three.
:::

```match
title: Listen and match
listen: true
pairs:
  - [sieben, '7']
  - [zwei, '2']
  - [zwölf, '12']
  - [drei, '3']
  - [acht, '8']
  - [elf, '11']
  - [neun, '9']
  - [sechs, '6']
```

## Dreizehn bis neunundneunzig

```words
sechzehn | sixteen
siebzehn | seventeen
zwanzig | twenty
dreißig | thirty
sechzig | sixty
siebzig | seventy
```

The teens are the unit plus {-zehn}, just like English "-teen". The tens add {-zig}. In both, {sechs} and {sieben} lose a bit, and thirty is the one rebel, with {-ßig}:

| | teens | | tens |
| --- | --- | --- | --- |
| 13 | {dreizehn} | 30 | {dreißig} |
| 14 | {vierzehn} | 40 | {vierzig} |
| 15 | {fünfzehn} | 50 | {fünfzig} |
| 16 | {sechzehn} (no s) | 60 | {sechzig} (no s) |
| 17 | {siebzehn} (no -en) | 70 | {siebzig} (no -en) |
| 18 | {achtzehn} | 80 | {achtzig} |
| 19 | {neunzehn} | 90 | {neunzig} |

From 21 to 99 you say the units first, then {und}, then the tens, all as **one word**:

- 21 {einundzwanzig} (eins becomes ein)
- 34 {vierunddreißig}
- 58 {achtundfünfzig}
- 99 {neunundneunzig}

Remember from lesson 1 that the final -ig is said like -ich in standard German ({zwanzig} "TSVAN-tsich") and like -ik in the south, Austria and Switzerland.

:::tip
When someone dictates a number, write the **units digit first**, leaving a space in front of it, then fill in the tens: you hear {sieben…}, write _7, hear {…undvierzig}, and complete 47. Native speakers do exactly this.
:::

::number-explorer{max=100}

```type
title: Write it in words
items:
  - prompt: '16'
    answer: sechzehn
  - prompt: '17'
    answer: siebzehn
  - prompt: '21'
    answer: einundzwanzig
  - prompt: '30'
    answer: [dreißig, dreissig]
    explain: In Switzerland, which does not use ß, it is written dreissig.
  - prompt: '47'
    answer: siebenundvierzig
  - prompt: '66'
    answer: sechsundsechzig
  - prompt: '71'
    answer: einundsiebzig
  - prompt: '99'
    answer: neunundneunzig
```

```choose
title: Which number do you hear?
items:
  - de: sechsundvierzig
    audio: true
    listen: true
    options: ['46', '64', '56']
    answer: 0
  - de: vierundsechzig
    audio: true
    listen: true
    options: ['46', '64', '54']
    answer: 1
  - de: siebzehn
    audio: true
    listen: true
    options: ['70', '17', '7']
    answer: 1
  - de: siebzig
    audio: true
    listen: true
    options: ['17', '70', '77']
    answer: 1
  - de: dreiunddreißig
    audio: true
    listen: true
    options: ['33', '23', '30']
    answer: 0
  - de: achtundfünfzig
    audio: true
    listen: true
    options: ['85', '58', '48']
    answer: 1
```

## Wie alt bist du?

```words
alt | old
jung | young
das Jahr, -e | year
Wie alt bist du? | How old are you? (informal)
Wie alt sind Sie? | How old are you? (formal)
```

German gives your age with {sein}, just as English does with "to be":

- {Wie alt bist du?} — {Ich bin achtundzwanzig.} or {Ich bin achtundzwanzig Jahre alt.}
- {Wie alt ist Jonas?} — {Er ist siebzehn.}
- {Wie alt sind Sie?} is fine at the doctor's; elsewhere, asking an adult stranger's age is as personal as it is in English.

For a rough age, use {Anfang}, {Mitte} or {Ende} (beginning, middle, end): {Sie ist Mitte dreißig}, "she's in her mid-thirties"; {Er ist Anfang zwanzig}, "he's in his early twenties".

:::mistake
Not {Ich habe dreißig Jahre}: that is French or Spanish thinking. In German, as in English, you *are* thirty: {Ich bin dreißig.}
:::

```order
title: Build the sentence
items:
  - en: How old are you? (to a child)
    de: Wie alt bist du?
    extra: [sind]
  - en: How old are you? (to Mr Novak)
    de: Wie alt sind Sie?
    extra: [bist]
  - en: I'm thirty years old.
    de: Ich bin dreißig Jahre alt.
    also: [Dreißig Jahre alt bin ich.]
    extra: [habe]
  - en: Is Jonas eighteen?
    de: Ist Jonas achtzehn?
```

```cloze
title: How old?
prompt: Type the missing word. The figure in brackets is a hint.
items:
  - de: Wie alt [bist](sein) du? – Ich [bin](sein) zwanzig.
    en: How old are you? – I'm twenty.
  - de: Wie alt sind Sie, Herr Novak? – Ich bin [sechzig](60).
    en: How old are you, Mr Novak? – I'm sixty.
  - de: Lena ist [neunzehn](19) Jahre [alt].
    en: Lena is nineteen years old.
  - de: Jonas ist [siebzehn](17), und Aylin ist [einundzwanzig](21).
    en: Jonas is seventeen, and Aylin is twenty-one.
  - de: Frau Weber ist Mitte [vierzig](40s).
    en: Mrs Weber is in her mid-forties.
```

## Hundert, tausend, eine Million

```words
hundert | a hundred
tausend | a thousand
die Million, -en | million
die Milliarde, -n | billion (a thousand million)
```

Bigger numbers simply stack the pieces, largest first, and everything below a million is written as **one word**:

| | |
| --- | --- |
| 100 | {hundert} or {einhundert} |
| 101 | {hunderteins} |
| 120 | {hundertzwanzig} |
| 365 | {dreihundertfünfundsechzig} |
| 1.000 | {tausend} or {eintausend} |
| 2.026 | {zweitausendsechsundzwanzig} |
| 85.000 | {fünfundachtzigtausend} |
| 1.000.000 | {eine Million} |
| 3.000.000 | {drei Millionen} |

German leaves out the "and" English puts after hundred: 120 is "a hundred and twenty" but plain {hundertzwanzig}. {Million} and {Milliarde} are nouns, so they stand apart and take a plural: {zwei Millionen}.

:::mistake
Two traps with big numbers. First, German swaps the point and the comma: 1.000 is a thousand (you will also see 1 000), and 2,5 is two and a half, said {zwei Komma fünf}. Second, a German {Milliarde} is an English billion, and a German {Billion} is a million million, an English trillion. Newspaper figures depend on it.
:::

::number-explorer{max=1000000}

```type
title: Big numbers
items:
  - prompt: '100'
    answer: [hundert, einhundert]
  - prompt: '101'
    answer: [hunderteins, einhunderteins]
  - prompt: '365'
    answer: dreihundertfünfundsechzig
  - prompt: '1.000'
    answer: [tausend, eintausend]
  - prompt: '2.500'
    answer: [zweitausendfünfhundert]
  - prompt: '80.000'
    answer: achtzigtausend
  - prompt: '1.000.000'
    answer: eine Million
```

```choose
title: Points and commas
items:
  - prompt: On a German website, 1.500 means …
    options: [one thousand five hundred, one and a half]
    answer: 0
  - prompt: A sign says {2,5 km}. How far is it?
    options: [two and a half kilometres, two thousand five hundred kilometres]
    answer: 0
  - prompt: An English billion (1,000,000,000) is …
    options: [eine Milliarde, eine Billion, eine Million]
    answer: 0
    explain: "{eine Billion} is a thousand times more: an English trillion."
  - prompt: How do you say 0,5?
    options: [null Komma fünf, null Punkt fünf]
    answer: 0
```

## Years

German says years before 2000 in hundreds, and always says the hundreds: 1989 is "nineteen hundred eighty-nine", {neunzehnhundertneunundachtzig}, all one word. From 2000 it switches to thousands: {zweitausend}, {zweitausendzwölf}, {zweitausendsechsundzwanzig}.

| | |
| --- | --- |
| 1756 | {siebzehnhundertsechsundfünfzig}: Mozart is born in Salzburg |
| 1971 | {neunzehnhunderteinundsiebzig}: Swiss women get the vote |
| 1989 | {neunzehnhundertneunundachtzig}: the Berlin Wall falls |
| 2002 | {zweitausendzwei}: euro coins and notes arrive in Germany and Austria |
| 2026 | {zweitausendsechsundzwanzig} |

:::mistake
Never "in 2026", which is an anglicism. Say just the year, {2026}, or {im Jahr 2026}: {Ich bin 1995 geboren} (I was born in 1995). Learn {Ich bin … geboren} as a fixed phrase for now.
:::

```match
title: Listen and match the years
listen: true
pairs:
  - [neunzehnhundertneunundachtzig, '1989']
  - [neunzehnhundertachtundneunzig, '1998']
  - [zweitausendzwei, '2002']
  - [zweitausendzwanzig, '2020']
  - [siebzehnhundertsechsundfünfzig, '1756']
  - [neunzehnhunderteinundsiebzig, '1971']
```

## Phone numbers and email addresses

```words
die Nummer, -n | number (of a phone, a house, a room)
die Telefonnummer, -n | phone number
das Handy, -s | mobile phone
die E-Mail, -s | email
die Adresse, -n | address
der Punkt, -e | dot; full stop; point
der Bindestrich, -e | hyphen
```

German has two words for "number": a {Zahl} is a figure in maths, a {Nummer} is a label, such as a phone, house or room number.

Phone numbers are read digit by digit or, very often, in pairs: 030 12 34 56 is {null drei null, zwölf, vierunddreißig, sechsundfünfzig}. To ask for one, say {Wie ist Ihre Telefonnummer?} or, to a friend, {Wie ist deine Nummer?} ({Ihre} and {deine} are "your", as you will see in lesson 4.)

:::culture
A mobile is a {Handy} in Germany and Austria, a German "English" word that English does not have; the Swiss also say {Natel}. The country codes are +49 for Germany, +43 for Austria and +41 for Switzerland; Berlin numbers start 030, Vienna 01, Zurich 044.
:::

In an email address, @ is {ät} (or, jokingly, {Klammeraffe}, "spider monkey"), a dot is {Punkt}, - is {Bindestrich} and _ is {Unterstrich}. Add {alles klein} (all lower case) and spell any unusual name with the alphabet from lesson 1. In Austria and Switzerland you will often hear {das E-Mail}.

```dialogue
title: Anmeldung (signing up for a German course in Vienna)
Frau Kaiser: Grüß Gott! Wie heißen Sie, bitte? | Hello! What's your name, please?
Ben: Clarke, Ben Clarke. | Clarke, Ben Clarke.
Frau Kaiser: Wie schreibt man das? | How do you spell that?
Ben: Ce – El – A – Er – Ka – E. | C-L-A-R-K-E.
Frau Kaiser: Danke. Und Ihre Telefonnummer? | Thank you. And your phone number?
Ben: Null sechs neun neun, eins zwo drei, vierundfünfzig, siebenundachtzig. | 0699 123 54 87.
Frau Kaiser: Und Ihre E-Mail-Adresse? | And your email address?
Ben: Ben Punkt Clarke ät web Punkt de. Alles klein. | ben.clarke@web.de. All lower case.
Frau Kaiser: Gut. Der Kurs kostet zweihundertneunzig Euro. | Good. The course costs 290 euros.
Ben: Zweihundertneunzig. Okay, danke! | Two hundred and ninety. OK, thank you!
```

```choose
title: Which phone number?
items:
  - de: null eins sieben zwo, vierunddreißig, sechsundfünfzig, achtundsiebzig
    audio: true
    listen: true
    options: [0172 34 56 78, 0172 43 65 87, 0173 34 56 78]
    answer: 0
  - de: null drei null, zwölf, neunundachtzig, dreiundsechzig
    audio: true
    listen: true
    options: [030 12 98 36, 030 12 89 63, 030 20 89 63]
    answer: 1
  - de: null vier vier, sechs null eins, siebenundvierzig, elf
    audio: true
    listen: true
    options: [044 601 74 11, 041 601 47 11, 044 601 47 11]
    answer: 2
```

```type
title: Write down the email address
prompt: Type the address as you would write it.
items:
  - listen: true
    audio: lena Punkt berger, ät, web Punkt D E
    answer: lena.berger@web.de
  - listen: true
    audio: jonas Unterstrich weber, ät, G M X Punkt A T
    answer: jonas_weber@gmx.at
  - listen: true
    audio: mia Bindestrich koch, ät, bluewin Punkt C H
    answer: mia-koch@bluewin.ch
```

## Was kostet das?

```words
kosten | to cost
Wie viel kostet das? | How much is it?
der Euro, - | euro
der Cent, - | cent
der Franken, - | (Swiss) franc
teuer | expensive
billig | cheap
Das macht … | That comes to …
```

German writes prices with a comma, and the currency usually after the number: 3,50 €. You say the euros, then the cents, without "and": {drei Euro fünfzig}. Below a euro, it is {Cent}: 0,80 € is {achtzig Cent}.

| written | said |
| --- | --- |
| 3,50 € | {drei Euro fünfzig} |
| 1,20 € | {ein Euro zwanzig} |
| 12,00 € | {zwölf Euro} |
| 0,99 € | {neunundneunzig Cent} |
| 249,– € | {zweihundertneunundvierzig Euro} |

After a number, {Euro} and {Cent} do not take a plural: {zwei Euro}, {fünfzig Cent}. To ask the price: {Wie viel kostet das?} or {Was kostet das?}; for one thing, {Was kostet der Kaffee?}; at the till you hear {Das macht sieben Euro vierzig.}

:::culture
Austria uses the euro too, and often puts the sign first: € 3,50. Switzerland has the franc ({der Franken}), with 100 {Rappen}, and writes prices with a point: CHF 3.50 or Fr. 3.50, said {drei Franken fünfzig}. The Swiss even write thousands with an apostrophe: 1'000. In casual Swiss speech a franc is a {Stutz}.
:::

```choose
title: How much?
items:
  - de: drei Euro fünfzig
    audio: true
    listen: true
    options: ['3,50 €', '5,30 €', '3,15 €']
    answer: 0
  - de: neunzehn Euro neunzig
    audio: true
    listen: true
    options: ['9,90 €', '19,90 €', '90,19 €']
    answer: 1
  - de: achtzig Cent
    audio: true
    listen: true
    options: ['0,18 €', '8,00 €', '0,80 €']
    answer: 2
  - de: zweihundertfünfundvierzig Euro
    audio: true
    listen: true
    options: ['245 €', '254 €', '2,45 €']
    answer: 0
  - de: vier Franken zwanzig
    audio: true
    listen: true
    options: [CHF 4.02, CHF 4.20, CHF 2.40]
    answer: 1
```

```read
title: Café Lindner
setting: The menu on the table of a traditional coffee house in Vienna.
text: |
  Café Lindner · Wien

  Kaffee
  Melange 4,90
  Verlängerter 4,20
  Einspänner 5,60

  Kuchen
  Apfelstrudel 5,50
  Sachertorte 6,90

  Getränke
  Mineralwasser 0,33 l 3,80

  Wiener Frühstück (Kaffee, Semmel, Butter, Marmelade, Ei) 9,80

  Alle Preise in Euro
en: |
  Café Lindner · Vienna

  Coffee
  Melange (coffee with frothed milk) 4.90
  Verlängerter (espresso topped up with hot water) 4.20
  Einspänner (black coffee with whipped cream, in a glass) 5.60

  Cakes
  Apple strudel 5.50
  Sachertorte (chocolate cake) 6.90

  Drinks
  Mineral water 0.33 l 3.80

  Viennese breakfast (coffee, bread roll, butter, jam, egg) 9.80

  All prices in euros
questions:
  - prompt: How much is a Melange?
    options: [€4.90, €9.40, €4.19]
    answer: 0
  - claim: Ein Apfelstrudel kostet fünf Euro fünfzig.
    answer: true
  - claim: Die Sachertorte kostet sechs Euro neunzehn.
    answer: false
    explain: "6,90 € is {sechs Euro neunzig}."
  - prompt: Which is the cheapest coffee?
    options: [Verlängerter, Melange, Einspänner]
    answer: 0
  - prompt: You order a Melange and an Apfelstrudel. What does the waiter say?
    options: ['{Das macht zehn Euro vierzig.}', '{Das macht neun Euro vierzig.}', '{Das macht elf Euro vierzig.}']
    answer: 0
```

:::culture
A {Semmel} is a bread roll in Austria and Bavaria; in most of Germany it is a {Brötchen}, in Switzerland a {Weggli} or {Brötli}. Same with the pretzel: a {Brezel} in most of Germany, a {Breze} or {Brezn} in Bavaria.
:::

```scene
title: At the bakery
setting: 8 a.m. at a bakery in Munich. You want two pretzels.
partner: the baker
turns:
  - they: Grüß Gott! Was darf's sein?
    theyEn: Hello! What can I get you?
    options:
      - de: Grüß Gott! Zwei Brezen, bitte.
        en: Hello! Two pretzels, please.
        ok: true
      - de: Tschüss! Zwei Brezen, bitte.
        en: Bye! Two pretzels, please.
        reply: Tschüss? Sie kommen doch gerade! Grüß Gott! Zwei Brezen, gern.
        replyEn: Bye? You've only just come in! Hello! Two pretzels, gladly.
  - they: Gern. Sonst noch etwas?
    theyEn: Certainly. Anything else?
    options:
      - de: Nein, danke. Wie viel kostet das?
        en: No, thank you. How much is that?
        ok: true
      - de: Nein, danke. Was kostet das?
        en: No, thank you. What does that cost?
        ok: true
      - de: Nein, danke. Wie viele kostet das?
        en: No, thank you. How many does that cost?
        reply: Sie meinen „Wie viel kostet das?“ Moment …
        replyEn: You mean "How much is it?" Just a moment …
  - they: Das macht zwei Euro vierzig.
    theyEn: That comes to €2.40.
    options:
      - de: Hier, bitte. Fünf Euro.
        en: Here you are. Five euros.
        ok: true
      - de: Zwölf Euro vierzig? Das ist teuer!
        en: Twelve euros forty? That's expensive!
        reply: Nein, nein, zwo Euro vierzig! Zwo, nicht zwölf.
        replyEn: No, no, two euros forty! Two, not twelve.
      - de: Zwei Euro vierzehn? Hier, bitte.
        en: Two euros fourteen? Here you are.
        reply: Vierzig, nicht vierzehn! Zwei Euro vierzig, bitte.
        replyEn: Forty, not fourteen! Two euros forty, please.
  - they: Und zwei Euro sechzig zurück. Danke schön!
    theyEn: And two euros sixty change. Thank you!
    options:
      - de: Danke! Auf Wiederschauen!
        en: Thanks! Goodbye!
        ok: true
      - de: Danke! Gute Nacht!
        en: Thanks! Good night!
        reply: Gute Nacht? Es ist acht Uhr früh! Auf Wiederschauen!
        replyEn: Good night? It's eight in the morning! Goodbye!
end: You leave with two warm Brezen and the right change.
```

## Check yourself

```cloze
title: Mental arithmetic
prompt: Germans say {plus}, {minus} and {mal} (times). Write the answer in words.
items:
  - de: Drei plus vier ist [sieben].
  - de: Zehn minus zwei ist [acht].
  - de: Zwanzig plus elf ist [einunddreißig].
  - de: Hundert minus eins ist [neunundneunzig].
  - de: Fünf mal zwölf ist [sechzig].
  - de: Siebzehn plus siebzehn ist [vierunddreißig].
```

```type
title: Say it in German
items:
  - prompt: How old are you? (to a child)
    answer: Wie alt bist du?
  - prompt: I'm twenty-five.
    answer: [Ich bin fünfundzwanzig., Ich bin fünfundzwanzig Jahre alt., Ich bin 25., Ich bin 25 Jahre alt.]
  - prompt: How much is the coffee?
    answer: [Was kostet der Kaffee?, Wie viel kostet der Kaffee?]
  - prompt: That's expensive!
    answer: Das ist teuer!
  - prompt: 'Write the price in words: 3,50 €'
    answer: [drei Euro fünfzig, drei Euro und fünfzig Cent]
  - prompt: 'Write the price in words: 0,99 €'
    answer: neunundneunzig Cent
  - prompt: 'Write the year in words: 1989'
    answer: neunzehnhundertneunundachtzig
  - prompt: 'Write the year in words: 2026'
    answer: zweitausendsechsundzwanzig
  - de: Ich bin ___ Jahre alt.
    listen: true
    audio: Ich bin dreiundvierzig Jahre alt.
    answer: [dreiundvierzig, '43']
  - de: Das kostet ___ Euro.
    listen: true
    audio: Das kostet achtzehn Euro.
    answer: [achtzehn, '18']
```

```speak
title: Say it aloud
items:
  - Ich bin dreißig Jahre alt.
  - Die Nummer ist null eins sieben zwo, vierunddreißig, sechsundfünfzig.
  - Wie viel kostet das?
  - Das macht sieben Euro fünfzig.
  - Ich bin neunzehnhundertneunundneunzig geboren.
```

```roleplay
title: Joining a gym
setting: You are signing up at a gym in Graz. The receptionist needs your details.
goal: Give your name and spell it, your age, your phone number and your email address, and ask how much membership costs.
partner: Frau Kaiser, the receptionist, polite and efficient; she uses Sie and speaks simple German
opener: Grüß Gott! Sie möchten Mitglied werden? Wie heißen Sie, bitte?
openerEn: Hello! You'd like to become a member? What's your name, please?
words: [buchstabieren, alt, die Telefonnummer, die E-Mail, Punkt, Wie viel kostet das?]
checks: [spelt their name with German letter names, gave a phone number in German, gave an email address with ät and Punkt, asked the price]
```

```compose
task: Write three sentences about yourself, with the numbers in words. Give your age, your phone number (make one up) and the year you were born.
target: numbers (units before tens), Ich bin … Jahre alt, years
hints: ['{Ich bin … Jahre alt.}', '{Meine Nummer ist …}', '{Ich bin … geboren.}']
examples: [Ich bin vierunddreißig Jahre alt., Meine Nummer ist null eins sieben sechs – zwölf – vierundachtzig – dreißig., Ich bin neunzehnhunderteinundneunzig geboren.]
```
