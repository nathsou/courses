---
title: Where and where to
goals:
  - say where something is (wo? + dative) and where it is going (wohin? + accusative)
  - use the nine two-way prepositions and the short forms im, ins, am, ans
  - tell stellen from stehen, legen from liegen, setzen from sitzen, and hängen from hängen
  - say where you are going (ins Kino, in die Schweiz, nach Hause, zum Arzt) and where you are
---

Moving house is chaos: boxes everywhere, and someone asking {Wohin kommt das?} every thirty seconds. It is also the perfect place to learn one of the famous puzzles of German grammar: why is it {im Schrank} (in the wardrobe) but {in den Schrank} (into the wardrobe)?

In lesson 8 you met the simplest version: {in der Stadt} but {in die Stadt}. This lesson gives you the whole system. It is more logical than it looks, and once it clicks you will hear it in every other sentence.

## Der Umzug

```dialogue
title: Wohin kommt das Sofa?
Ben: Puh, das Sofa ist schwer! Wohin kommt das? | Phew, the sofa's heavy! Where does it go?
Zeynep: Ins Wohnzimmer, bitte. An die Wand, neben das Fenster. | Into the living room, please. Against the wall, next to the window.
Ben: Hier? | Here?
Zeynep: Perfekt. Danke! | Perfect. Thanks!
Dragan: Zeynep, wo ist die Kaffeemaschine? | Zeynep, where's the coffee machine?
Zeynep: In der Küche, in einem Karton auf dem Boden. | In the kitchen, in a box on the floor.
Dragan: Da stehen zehn Kartons auf dem Boden! | There are ten boxes on the floor!
Zeynep: Auf dem Karton steht „Küche – Kaffee!“ | It says "Kitchen – coffee!" on the box.
Ben: Gut, dann machen wir erst mal eine Pause. | Great, then let's have a break first.
```

Two questions run through the whole dialogue:

- **{Wo?}** (where?) asks for a **position**. The answer is in the **dative**: {Wo ist die Kaffeemaschine?} {In der Küche, auf dem Boden.}
- **{Wohin?}** (where to?) asks for a **destination**. The answer is in the **accusative**: {Wohin kommt das Sofa?} {Ins Wohnzimmer, an die Wand.}

:::key
The rule is not "movement means accusative". It is: **a destination, a change of place → accusative; a position → dative**, even if there is movement *within* that position. {Wir laufen im Park} (we are running around in the park: dative) but {Wir laufen in den Park} (we are running into the park: accusative). When in doubt, ask yourself: wo? or wohin?
:::

```words
der Umzug, ¨-e | move (to a new home)
um|ziehen (zieht um, zog um, ist umgezogen) | to move (house)
ein|ziehen (zieht ein, zog ein, ist eingezogen) | to move in
der Karton, -s | cardboard box
die Kiste, -n | box, crate
der Keller, - | cellar, basement
das Dach, ¨-er | roof
```

```sort
title: Wo or wohin?
prompt: Is it a position (wo?) or a destination (wohin?)?
buckets: ['wo? + Dativ', 'wohin? + Akkusativ']
items:
  - [Die Katze schläft auf dem Sofa., 0]
  - [Die Katze springt auf das Sofa., 1]
  - [Ich gehe in die Küche., 1]
  - [Ich koche in der Küche., 0]
  - [Wir laufen im Park., 0]
  - [Wir laufen in den Park., 1]
  - [Das Bild hängt an der Wand., 0]
  - [Ben trägt den Karton in den Keller., 1]
explain: "Look at the articles: {dem}, {der}, {im} for positions; {das}, {die}, {den} for destinations."
```

## Neun Präpositionen

Nine prepositions work both ways: dative for wo?, accusative for wohin? They are called **{Wechselpräpositionen}** ("changing prepositions"), and they are all about space.

| Preposition | Meaning | wo? (dative) |
| --- | --- | --- |
| {in} | in, into | {im Schrank}, {in der Küche} |
| {an} | at, on (a vertical surface), by | {an der Wand}, {am Fenster} |
| {auf} | on (top of) | {auf dem Tisch} |
| {über} | above, over | {über dem Sofa} |
| {unter} | under, below | {unter dem Bett} |
| {vor} | in front of | {vor dem Haus} |
| {hinter} | behind | {hinter der Tür} |
| {neben} | next to | {neben dem Fenster} |
| {zwischen} | between | {zwischen dem Bett und dem Schrank} |

**{an}** or **{auf}**? {auf} is on top of a horizontal surface; {an} is touching the side of something, a vertical surface, or being at its edge. So {Das Bild hängt an der Wand}, {Die Lampe hängt an der Decke}, and {Wir sitzen am Tisch} (at the table), but {Die Katze sitzt auf dem Tisch} (on it, much to everyone's annoyance).

:::note
{vor} also means "ago", and then it always takes the dative: {vor zwei Tagen}, {vor einem Jahr}. Time has no destination.
:::

```words
über | over, above
unter | under, below
vor | in front of; ago
hinter | behind
neben | next to
zwischen | between
die Wand, ¨-e | wall
die Decke, -n | ceiling; blanket
der Boden, ¨ | floor; ground
die Ecke, -n | corner
```

::preposition-scene{mode=both}

```match
title: Where exactly?
pairs:
  - [unter dem Bett, under the bed]
  - [über dem Sofa, above the sofa]
  - [hinter der Tür, behind the door]
  - [vor dem Haus, in front of the house]
  - [neben dem Fenster, next to the window]
  - [zwischen den Kisten, between the boxes]
  - [an der Wand, on the wall]
  - [auf dem Tisch, on the table]
```

```fill
title: Which preposition?
items:
  - de: Das Bild hängt ___ der Wand.
    options: [an, auf, in]
    answer: 0
    en: The picture is hanging on the wall.
  - de: Die Bücher stehen ___ Regal.
    options: [im, am, auf]
    answer: 0
    en: The books are on the shelves.
    explain: "Books stand {im Regal}: a set of shelves is something you put things into."
  - de: Wir sitzen ___ Tisch und essen.
    options: [am, auf dem, im]
    answer: 0
    en: We're sitting at the table, eating.
  - de: Der Hund schläft ___ dem Bett. Man sieht ihn nicht!
    options: [unter, über, auf]
    answer: 0
    en: The dog is sleeping under the bed. You can't see him!
  - de: Die Lampe hängt ___ dem Tisch.
    options: [über, unter, zwischen]
    answer: 0
    en: The lamp hangs above the table.
```

## Dativ oder Akkusativ?

Here is the same pattern with each gender. Only the article changes (and the short forms):

| | wo? + dative | wohin? + accusative |
| --- | --- | --- |
| masculine | {Die Katze ist unter dem Tisch.} | {Die Katze läuft unter den Tisch.} |
| feminine | {Ben ist in der Küche.} | {Ben geht in die Küche.} |
| neuter | {Das Kind ist im Bett.} | {Das Kind geht ins Bett.} |
| plural | {Die Bücher sind in den Kisten.} | {Wir packen die Bücher in die Kisten.} |

With {in} and {an}, the article usually merges:

| | dative (wo?) | accusative (wohin?) |
| --- | --- | --- |
| in | **{im}** = in dem | **{ins}** = in das |
| an | **{am}** = an dem | **{ans}** = an das |

A useful memory hook: the **m** of {im} and {am} is the m of the dative {dem}; the **s** of {ins} and {ans} is the s of the accusative {das}. You will also hear {aufs} (auf das) all the time, and in casual speech {unters}, {übers} and {hinters}.

:::mistake
{im Kino} and {ins Kino} sound alike but mean different things: {Ich bin im Kino} (I'm at the cinema), {Ich gehe ins Kino} (I'm going to the cinema). Learners often use {im} for both. Listen for the s.
:::

```cloze
title: Preposition and article
prompt: Type the preposition with the right article, or the short form.
items:
  - de: Die Kaffeemaschine steht [in der](in) Küche.
    en: The coffee machine is in the kitchen.
  - de: Ben trägt das Sofa [ins/in das](in) Wohnzimmer.
    en: Ben carries the sofa into the living room.
  - de: Dragan ist [im/in dem](in) Keller.
    en: Dragan is in the cellar.
  - de: Die Katze springt [aufs/auf das](auf) Sofa.
    en: The cat jumps onto the sofa.
  - de: Jetzt schläft sie [auf dem](auf) Sofa.
    en: Now she's asleep on the sofa.
  - de: Das Fahrrad steht [vor dem](vor) Haus.
    en: The bike is in front of the house.
  - de: Zeynep läuft schnell [in den](in) Supermarkt.
    en: Zeynep pops into the supermarket.
  - de: Die Lampe hängt [über dem](über) Tisch.
    en: The lamp hangs above the table.
```

## stellen oder stehen? legen oder liegen?

English puts things almost anywhere with one verb: "put". German wants to know **how the thing ends up**: standing upright, lying flat, sitting, or hanging. And for each position there are two verbs: one for the *action* (putting it there) and one for the *result* (being there).

| Action: wohin? + accusative | | Position: wo? + dative | |
| --- | --- | --- | --- |
| {stellen} (upright) | {Ich stelle die Flasche auf den Tisch.} | {stehen} | {Die Flasche steht auf dem Tisch.} |
| {legen} (flat) | {Ich lege das Handy auf den Tisch.} | {liegen} | {Das Handy liegt auf dem Tisch.} |
| {setzen} (seated) | {Ich setze das Kind auf den Stuhl.} | {sitzen} | {Das Kind sitzt auf dem Stuhl.} |
| {hängen} | {Ich hänge das Bild an die Wand.} | {hängen} | {Das Bild hängt an der Wand.} |

The action verbs are all **regular** ({hat gestellt, gelegt, gesetzt, gehängt}). The position verbs are **strong** ({hat gestanden, gelegen, gesessen, gehangen}), and in the south, Austria and Switzerland they take {sein}, as you saw in lesson 13. The two {hängen} look identical in the present; only the past shows which is which: {Ich habe das Bild an die Wand gehängt}, but {Das Bild hat zehn Jahre im Flur gehangen}.

Upright or flat? Bottles, glasses, furniture and books on a shelf stand; phones, keys, papers, and anything flat or on its side, lie. That is why Germans rarely answer {Wo ist …?} with {ist}: {Wo ist mein Handy?} {Es liegt auf dem Sofa.} {Wo ist die Milch?} {Sie steht im Kühlschrank.}

```words
stellen | to put (upright), to stand
stehen (steht, stand, hat gestanden) | to stand, to be (upright)
legen | to put (flat), to lay
liegen (liegt, lag, hat gelegen) | to lie, to be (lying)
setzen | to sit (someone) down, to put
sitzen (sitzt, saß, hat gesessen) | to sit, to be sitting
hängen (hängt, hing, hat gehangen) | to hang, to be hanging
der Spiegel, - | mirror
der Teppich, -e | rug, carpet
die Pflanze, -n | plant
das Bild, -er | picture
```

```gender
title: Article and plural
plural: true
items: [Regal, Spiegel, Teppich, Pflanze, Bild, Karton, Kiste, Wand, Ecke, Keller]
```

```fill
title: Action or position?
items:
  - de: Ich ___ die Flasche in den Kühlschrank.
    options: [stelle, stehe, lege]
    answer: 0
    en: I'm putting the bottle in the fridge.
  - de: Die Flasche ___ im Kühlschrank.
    options: [steht, stellt, liegt]
    answer: 0
    en: The bottle is in the fridge.
  - de: Wo ist mein Handy? Es ___ auf dem Sofa.
    options: [liegt, legt, steht]
    answer: 0
    en: Where's my phone? It's on the sofa.
  - de: ___ die Gläser bitte auf den Tisch!
    options: [Stell, Steh, Sitz]
    answer: 0
    en: Put the glasses on the table, please!
  - de: Die Kinder ___ schon am Tisch.
    options: [sitzen, setzen]
    answer: 0
    en: The children are already sitting at the table.
  - de: Wir haben das Bild über das Sofa ___.
    options: [gehängt, gehangen]
    answer: 0
    en: We hung the picture over the sofa.
    explain: "An action with an object: {hängen, hängte, gehängt}. Notice the accusative: {über das Sofa}."
  - de: Das Bild hat zehn Jahre im Flur ___.
    options: [gehangen, gehängt]
    answer: 0
    en: The picture hung in the hall for ten years.
  - de: Hast du die Schlüssel auf den Tisch ___?
    options: [gelegt, gelegen, gestellt]
    answer: 0
    en: Did you put the keys on the table?
```

```order
title: Putting things in their place
items:
  - en: I'm hanging the mirror on the wall.
    de: Ich hänge den_Spiegel an_die_Wand.
    also: [Den_Spiegel hänge ich an_die_Wand., An_die_Wand hänge ich den_Spiegel.]
    extra: [an_der_Wand]
  - en: The books are under the bed.
    de: Die_Bücher liegen unter_dem_Bett.
    also: [Unter_dem_Bett liegen die_Bücher.]
    extra: [unter_das_Bett]
  - en: Put the boxes in the cellar, please! (to several friends)
    de: Stellt die_Kisten bitte in_den_Keller!
    also: [Stellt bitte die_Kisten in_den_Keller!]
  - en: Where did you put my keys? (to a friend)
    de: Wohin hast du meine_Schlüssel gelegt?
    extra: [Wo]
    explain: "With a verb of putting, the question is {wohin?}. In conversation it is often split: {Wo hast du meine Schlüssel hingelegt?}"
```

## Wohin geht's? ins Kino, nach Hause, zum Arzt

"Where to?" is not always {in}. The kind of place decides the preposition:

| The place | wohin? | wo? |
| --- | --- | --- |
| buildings, rooms, enclosed spaces | {ins Kino}, {in die Schule} | {im Kino}, {in der Schule} |
| towns and most countries (no article) | {nach Wien}, {nach Italien} | {in Wien}, {in Italien} |
| countries with an article | {in die Schweiz}, {in die Türkei}, {in die USA} | {in der Schweiz}, {in der Türkei}, {in den USA} |
| people, and places named after a person | {zu Lena}, {zum Arzt}, {zum Bäcker} | {bei Lena}, {beim Arzt}, {beim Bäcker} |
| home | {nach Hause} | {zu Hause} |
| the sea, lakes, rivers | {ans Meer}, {an den See} | {am Meer}, {am See} |
| open spaces and events | {auf den Markt}, {auf eine Party} | {auf dem Markt}, {auf einer Party} |

Three traps:

- {nach} is only for places without an article. Most countries have none ({Deutschland}, {Österreich}, {Italien}), but some do, and then it's {in} + accusative: {Wir fahren in die Schweiz}, never {nach der Schweiz}.
- **{zu Hause}** is "at home", **{nach Hause}** is "(going) home". {Ich bin zu Hause} but {Ich gehe nach Hause}. In Austria and Switzerland you will also see {zuhause} written as one word, and many southerners simply say {Ich gehe heim}.
- {zu} is the safe default for shops and places you go *to*; {in} stresses going *inside*: {Ich gehe zur Apotheke} or {Ich gehe in die Apotheke} are both fine.

```words
nach Hause | (going) home
zu Hause | at home
das Meer, -e | sea
```

```type
title: Where to? Where?
items:
  - de: Am Samstag fahren wir ___ Schweiz.
    answer: in die
    en: On Saturday we're going to Switzerland.
  - de: Ich muss morgen ___ Arzt.
    answer: [zum, zu dem]
    en: I have to go to the doctor's tomorrow.
  - de: Wir gehen heute Abend ___ Kino.
    answer: [ins, in das]
    en: We're going to the cinema tonight.
  - de: Nach der Arbeit gehe ich direkt ___ Hause.
    answer: nach
    en: After work I'm going straight home.
  - de: Bist du heute Abend ___ Hause?
    answer: zu
    en: Are you at home this evening?
  - de: Im Sommer fahren wir ___ Meer.
    answer: [ans, an das]
    en: In summer we're going to the seaside.
  - de: Fliegt ihr im Sommer ___ Spanien?
    answer: nach
    en: Are you flying to Spain in the summer?
  - de: Heute Abend gehen wir ___ eine Party.
    answer: [auf, zu]
    en: We're going to a party tonight.
```

## Die neue Wohnung

```read
title: Endlich eingezogen!
setting: An email from Zeynep to her sister Fatma, a week after the move to Cologne.
text: |
  Liebe Fatma,

  wir sind endlich eingezogen! Die Wohnung ist ganz oben, direkt unter dem Dach.
  Das Wohnzimmer ist groß und hell. Das Sofa steht an der Wand, und über dem Sofa hängt jetzt das Bild von Oma.
  Neben dem Fenster steht eine Pflanze, ein Geschenk von Ben.
  Die Küche ist leider klein, aber zwischen dem Herd und dem Kühlschrank ist noch Platz für einen Tisch.
  Unser Schlafzimmer ist noch ein Chaos: Die Kleidung liegt auf dem Boden, und die Bücher sind noch in den Kisten.
  Das Fahrrad von Dragan steht im Flur. Es muss in den Keller!

  Am Samstag machen wir eine Party. Kommst du? Wir wohnen jetzt in der Lindenstraße 12, gegenüber vom Park.

  Liebe Grüße
  Zeynep
en: |
  Dear Fatma,

  We've moved in at last! The flat is right at the top, directly under the roof.
  The living room is big and bright. The sofa is against the wall, and Grandma's picture now hangs above the sofa.
  Next to the window there's a plant, a present from Ben.
  Unfortunately the kitchen is small, but there's still room for a table between the cooker and the fridge.
  Our bedroom is still chaos: the clothes are lying on the floor, and the books are still in the boxes.
  Dragan's bike is in the hall. It has to go in the cellar!

  On Saturday we're having a party. Will you come? We now live at Lindenstraße 12, opposite the park.

  Love,
  Zeynep
questions:
  - claim: Die Wohnung ist ganz oben.
    answer: true
  - claim: Über dem Sofa hängt ein Bild von der Oma.
    answer: true
  - claim: In der Küche ist kein Platz für einen Tisch.
    answer: false
    explain: "{Zwischen dem Herd und dem Kühlschrank ist noch Platz für einen Tisch.}"
  - claim: Die Bücher stehen schon im Regal.
    answer: false
  - prompt: Where does Dragan's bike have to go?
    options: [into the cellar, into the hall, into the living room]
    answer: 0
```

```scene
title: The removal men
setting: You are moving into a flat in Zurich. Two removal men are carrying your furniture up the stairs.
partner: Herr Brunner, a removal man
turns:
  - they: Grüezi! Wohin sollen wir den Schrank stellen?
    theyEn: Hello! Where shall we put the wardrobe?
    options:
      - de: Ins Schlafzimmer, bitte. Neben das Fenster.
        en: In the bedroom, please. Next to the window.
        ok: true
      - de: Im Schlafzimmer, bitte. Neben dem Fenster.
        en: In (dative) the bedroom, please. Next to (dative) the window.
        reply: Also ins Schlafzimmer, neben das Fenster. Alles klar!
        replyEn: So into the bedroom, next to the window. Right you are!
  - they: Und die Kisten mit den Büchern? Die sind sehr schwer.
    theyEn: And the boxes of books? They're very heavy.
    options:
      - de: Stellen Sie sie bitte ins Wohnzimmer, vor das Regal.
        en: Please put them in the living room, in front of the shelves.
        ok: true
      - de: Stehen Sie sie bitte ins Wohnzimmer.
        en: Please stand (be standing) them in the living room.
        reply: Wir stellen sie ins Wohnzimmer? Gut, machen wir.
        replyEn: We should put them in the living room? Fine, will do.
  - they: Und den Spiegel? Wohin hängen wir den?
    theyEn: And the mirror? Where shall we hang it?
    options:
      - de: Hängen Sie ihn bitte an die Wand im Flur.
        en: Please hang it on the wall in the hall.
        ok: true
      - de: Hängen Sie ihn bitte an der Wand im Flur.
        en: Please hang it on (dative) the wall in the hall.
        reply: An die Wand im Flur, gern.
        replyEn: On the wall in the hall, certainly.
      - de: Hängen Sie ihn bitte auf die Wand im Flur.
        en: Please hang it on top of the wall in the hall.
        reply: An die Wand im Flur, meinen Sie? Kein Problem.
        replyEn: On the wall in the hall, you mean? No problem.
  - they: So, fertig! Wo ist denn das WC?
    theyEn: Right, all done! Where's the toilet?
    options:
      - de: Gleich hier, neben der Küche.
        en: Just here, next to the kitchen.
        ok: true
      - de: Gleich hier, neben die Küche.
        en: Just here, next to (accusative) the kitchen.
        reply: Neben der Küche? Danke!
        replyEn: Next to the kitchen? Thanks!
end: The wardrobe stands by the bedroom window, the mirror hangs in the hall, and the removal men are on their way back to Winterthur.
```

```type
title: Dictation
items:
  - listen: true
    answer: Die Kaffeemaschine steht in der Küche.
  - listen: true
    answer: Stell die Kisten bitte in den Keller!
  - listen: true
    answer: Wir fahren im Sommer in die Schweiz.
```

```speak
title: Say it aloud
items:
  - Wohin kommt das Sofa?
  - Ins Wohnzimmer, an die Wand.
  - Das Handy liegt auf dem Tisch.
  - Ich gehe jetzt nach Hause.
```

```roleplay
title: Moving day
setting: It is moving day. Your friend Noah has come to help and is carrying things in from the van.
goal: Tell Noah where to put at least five things (with stellen, legen or hängen and the accusative), and answer when he asks where something is (with the dative).
partner: Noah, 27, helpful, strong, and a little chaotic; he sometimes puts things in odd places
opener: So, hier ist die erste Kiste. Wohin soll ich die stellen?
openerEn: Right, here's the first box. Where shall I put it?
words: [stellen, legen, hängen, ins Wohnzimmer, in die Küche, auf den Tisch, an die Wand, neben]
checks: [gave at least five instructions with the accusative after a two-way preposition, answered a wo? question with the dative, used stellen, legen or hängen correctly]
```

```compose
task: Describe a room in your home in four or five sentences. Where is the furniture, and what is on it, under it or next to it?
target: two-way prepositions with the dative (wo?), and stehen, liegen, hängen
hints: ['{Das Sofa steht …}', '{An der Wand hängt …}', '{Auf dem Tisch liegt …}']
examples:
  - In meinem Wohnzimmer steht ein Sofa. Über dem Sofa hängt ein Bild, und neben dem Sofa steht eine Lampe.
  - Auf dem Tisch liegen meine Bücher. Unter dem Tisch schläft meine Katze.
```
