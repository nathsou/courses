# Writing lessons

Lessons are `content/lessons/<nn-slug>.md`, listed in `content/outline.ts` (slugs are URLs and
progress keys: never rename them). The compiler is `tools/markdown/compile.ts`. Read
`content/lessons/04-familie.md` first: it is the model lesson, and shows every feature below.

## Who the learners are

English speakers, many of them **returners**: people who studied German at school or university,
reached some level, and forgot a lot. They recognise more than they can produce. So:

- Explain grammar properly, in English, with the *why*, short concrete examples and the common
  exception. Never assume they remember the rule; do assume they can cope with a real explanation.
- Mention the textbook "rule they half remember" and correct the version that misleads.
- Give lots of production practice (typing, building sentences, speaking), not only recognition.
- Every level is explained in English. From A2, more of each lesson's text is German; at B1 and
  B2, dialogues, reading texts and stories carry most of the input.

## Style

British English. Warm, direct, a little playful; never cutesy. First a working example, then the
rule, then the history or exceptions. Keep each `##` section 5–10 minutes, ending in something
the learner does. German must be **correct, natural, current standard German** (Duden). Use
`du` among friends and young people, `Sie` with strangers, in shops and at work, consistently.
Mention Austrian and Swiss variants where they matter (Jänner, Grüezi, Matura, Paradeiser), and
set scenes across Germany, Austria and Switzerland. Use a diverse cast of names (Lena, Jonas,
Aylin, Mehmet, Sophie, Luca, Fatma, Noah, Mia, Ben, Hannah, Elias, Zeynep, Dragan…).

Size: 350–600 lines of Markdown, 25–45 new words, 12–20 activities. A1 lessons lean on short
dialogues and many quick drills; B1–B2 lessons on longer texts and production.

## Front matter

```yaml
---
title: 'Family: der, die, das'      # quote it if it contains a colon
goals:
  - name the people in your family
  - give every noun its gender
words: [die Lampe]                  # optional: taught words not listed in a ```words block
---
```

## German in prose: {braces}

Write English prose with German inside braces: `{Guten Tag}`, `{Ich habe einen Bruder.}`. Every
braced run becomes tappable German: each word opens its word card (meaning, gender, plural,
principal parts, audio), nouns are coloured by gender, and a sentence of four words or more gets
a play button. Braces work in paragraphs, lists, tables, bold and callouts. In headings the
braces are simply removed. Do not brace English, single letters or endings ("the ending -e").

Never put braces inside YAML except in the English fields listed below.

## Blocks

| Block | Purpose |
| --- | --- |
| ```` ```words ```` | New words in dictionary notation, one per line, then ` \| ` and an English gloss. They become the lesson's review cards. |
| ```` ```dialogue ```` | `Speaker: Deutsch \| English` per line; optional `title:` line. Play and shadow modes. |
| `:::note`, `:::tip`, `:::culture`, `:::grammar[Title]`, `:::mistake`, `:::key`, `:::fun` | Callouts. |
| `:::details[Summary]` | Collapsible aside. |
| `::widget-name{prop=value}` | A widget from `src/lib/widgets/WidgetName.svelte` (catalogue below). |

### Word lists: dictionary notation

```words
der Tisch, -e | table
die Stadt, ¨-e | town, city              ¨ = umlaut: Städte
das Zimmer, - | room                     - = plural unchanged
der Vater, ¨ | father                    ¨ alone: Väter
das Museum, Museen | museum              a full plural form
die Eltern (Pl.) | parents               plural-only
die Milch (Sg.) | milk                   no plural (use for mass nouns)
der Student, -en | student
fahren (fährt, fuhr, ist gefahren) | to drive, to go
an|rufen (ruft an, rief an, hat angerufen) | to phone
machen | to do, to make                  regular verbs need no parts
sich freuen (über + A) | to be glad about
helfen (hilft, half, hat geholfen) (+ D) | to help
gut (besser, am besten) | good
Wie geht's? | How are you?               phrases are fine
```

Rules:

- Nouns always with `der`/`die`/`das`; give the plural notation (or `(Sg.)`/`(Pl.)`).
- Verbs: give principal parts `(present 3sg, preterite, hat/ist participle)` for every strong,
  mixed or irregular verb, and for every verb whose perfect takes `ist`. Mark separable verbs with
  `|`. Reflexive verbs start with `sich`. A preposition or case a verb takes goes in a bracket of
  its own (`warten (auf + A)`, `helfen (hilft, half, hat geholfen) (+ D)`).
- One meaning-focused gloss, short; no part-of-speech labels.
- After editing word lists run `npm run lexicon`. It builds the dictionary from all lessons plus
  Wiktionary and **checks every noun's gender and plural and every verb's parts and auxiliary
  against Wiktionary**. Fix what it reports (usually a typo or a wrong plural). If Wiktionary is
  genuinely wrong or you teach a variant on purpose, add an entry to
  `content/data/accepted-issues.json`: `{ "issue": "<the issue text without the file:line prefix>", "why": "…" }`.
- A word taught in an earlier lesson need not be repeated (the first lesson in course order
  "owns" it). Repeating is harmless.

## Exercises

Fenced YAML blocks; shapes are in `src/lib/exercises/types.ts`, checked by
`src/lib/exercises/validate.ts` and `content/content.test.ts`.

**Language of YAML fields.** These keys are **English** (German only inside `{braces}`):
`title, prompt, explain, en, setting, goal, partner, theyEn, replyEn, end, task, target, hint,
hints, checks, openerEn, question`. **Every other string is German** (de, options, answer, they,
reply, text, claim, items of gender/speak, pairs, buckets, sort items…), and is spoken and
annotated as German. Options and match pairs may be English: they are detected automatically,
and may contain `{German}`.

Quote YAML strings that contain `: `, start with `{`, `[`, `'`, `"`, `*`, or contain ` #`.

| Kind | What the learner does |
| --- | --- |
| `choose` | Multiple choice. `prompt` (English) and/or `de` (German shown large); `audio: true` + `listen: true` for listening items (the `de` text is hidden until answered); `noGender: true` hides gender colours. `options`, `answer` (index), `explain`, `en`. |
| `fill` | Choose the word for the `___` gap in `de`. |
| `type` | Type the answer. `de` with one `___` gap (the answer fills it), or a `prompt` to translate; `answer` is a string or a list of accepted answers (first = model). `hint` shows in the empty field (e.g. the infinitive). `listen: true` = dictation (plays the answer, or `audio`). Punctuation is ignored; capitals and umlauts count as "almost". |
| `cloze` | Gapped text: `de: Ich [fahre](fahren) mit [dem] Bus [zur/zu der] Arbeit.` `[a/b]` accepts either, `(hint)` shows a hint after the gap. `bank: true` shows the answers as a word bank. Best for endings, articles and verb forms in context. |
| `order` | Sentence builder: `en` and `de` (tiles split at spaces; join words with `_`: `ins_Kino`). `also: [...]` other correct orders (German word order is flexible: always list them!), `extra: [...]` distractor tiles. |
| `match` | `pairs: [[left, right], …]` (2–8); `listen: true` plays the left side. |
| `sort` | `buckets: [...]`, `items: [[text, bucket index], …]`, `explain`. |
| `gender` | `items: [Tisch, Lampe, …]` nouns without article; the course knows the answers and shows the ending rule. `plural: true` also asks the plural. Nouns must be in the dictionary (taught somewhere). |
| `conjugate` | `items: [{verb: fahren, tense: present}]`; tenses `present, preterite, perfect, konj2, konj1, imperative`; optional `persons: [0..5]` (ich, du, er/sie/es, wir, ihr, sie/Sie; imperative: 1 and 4). Answers come from the verb tables; the verb must be taught (in a word list). |
| `scene` | A conversation with choices: `partner`, `setting`, `turns: [{they, theyEn, options: [{de, en, ok, reply, replyEn}]}]`. Wrong options need an in-character `reply`; make them plausible learner mistakes (wrong case, du/Sie slip) and let the reply recast the correct form. |
| `story` | Graded reader: `title`, `paragraphs: [{de, en}]`, `questions` (choose items). |
| `read` | Real-world text (`text: \|` keeps line breaks): an email, a notice, an advert, a chat. `setting`, `en`, `questions`: choose items or `{claim: German statement, answer: true/false}` (richtig/falsch). |
| `speak` | `items: [German sentences]`: hear, record, compare, optional speech recognition. |
| `roleplay`, `compose` | Optional AI partner (needs the learner's API key). Always give `examples` to `compose`. |

## Widgets

Widgets are Svelte components in `src/lib/widgets/`; use them in a lesson as
`::kebab-name{prop=value}` (props are optional unless marked). German data a widget speaks lives
in `src/lib/widgets/data/*.ts` (so the audio collector finds it).

| Widget | Props | What it does |
| --- | --- | --- |
| `::sound-board` | `set=vowels\|umlauts\|diphthongs\|consonants\|endings` | Tap sounds and example words; minimal-pair listening quiz. |
| `::alphabet` | | The alphabet with letter names; spelling game. |
| `::number-explorer` | `max=100\|1000\|1000000` | Type or step a number; its German word built from parts (vier·und·zwanzig); listening quiz. |
| `::clock-time` | `mode=informal\|formal\|both` | Set a clock, read the time both ways (halb drei / vierzehn Uhr dreißig); listening quiz. |
| `::gender-rules` | | The endings that predict der, die, das, with examples and exceptions; quick quiz. |
| `::article-table` | `kind=definite\|indefinite\|negative\|possessive\|demonstrative\|personal`, `cases=nom,acc,dat,gen` | Declension table that highlights what changes; hide-and-recall mode. |
| `::case-machine` | `cases=nom,acc\|nom,acc,dat\|all` | Build a sentence by giving nouns roles; articles change by case; word order moves, meaning stays. |
| `::word-order` | `mode=v2\|questions\|bracket\|subordinate\|all` | The sentence fields (Vorfeld, verb second, middle field, verb at the end): choose what comes first and watch the verb. |
| `::separable-verbs` | | One separable verb through present, modal, perfect, subordinate clause and zu-infinitive. |
| `::family-tree` | | A family; questions like "Wer ist Lenas Onkel?" |
| `::town-map` | | A small town; follow directions (geradeaus, die zweite Straße links); prepositions of place. |
| `::preposition-scene` | `mode=wo\|wohin\|both` | A cat, a box, a sofa: in/an/auf/über/unter/vor/hinter/neben/zwischen with dative (wo?) or accusative (wohin?). |
| `::perfect-builder` | | Choose a verb: haben or sein, how the participle is made, the finished sentence; quiz. |
| `::adjective-endings` | | Choose article type, gender and case; see the ending and why; drill mode. |
| `::conjugator` | `verb=fahren` | Every tense of any taught verb, with the irregular forms highlighted. |
| `::connector-lab` | | Two clauses joined by und/denn, weil/obwohl, deshalb/trotzdem: watch the verb move. |
| `::relative-pronouns` | | Choose the noun and its role in the relative clause; see der/den/dem/dessen… |
| `::passive-machine` | | Active ↔ passive in each tense and with modals, step by step. |
| `::konjunktiv-lab` | | Real vs unreal conditions, present and past (Wenn ich Zeit hätte…). |
| `::da-wo-compounds` | | warten auf → worauf? darauf; things vs people (auf wen? auf ihn). |
| `::reported-speech` | | Direct speech → Konjunktiv I, with the switch to Konjunktiv II when forms coincide. |
| `::particle-lab` | | One sentence with and without doch, mal, ja, eben, halt, eigentlich, schon. |
| `::attribute-unfolder` | | Unpack an extended participle attribute into a relative clause, step by step. |
| `::nominal-style` | | Verbal style ↔ nominal style (weil es regnete ↔ wegen des Regens). |
| `::compound-builder` | | Build compound nouns; the last part decides the gender; linking -s-. |

## After editing

```sh
npm run lexicon   # rebuild the dictionary and check words against Wiktionary
npm test          # compiles every lesson (Markdown and Svelte), validates exercises and words
```

`npm run audio:texts` refreshes the clip list for audio generation (see README).
