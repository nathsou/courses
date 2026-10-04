# Human Evolution — implemented course

**Energy, childhood, and the environments we make.** Completed implementation, 4 October 2026. This English interactive adaptation follows all six of Jean-Jacques Hublin’s 2017 Collège de France lectures in their original order. It preserves the substantive argument, explains selected subsequent findings, and teaches how evidence constrains evolutionary explanations.

The user’s implementation brief called for a compact course close to the original. The finished course therefore has **six chapters, three named sessions per chapter, about 9,800 words, eleven focused interactive figures and ten checked questions**. Allow about four hours including activities; this is an editorial estimate, not a measured completion time. The original lectures total 9 h 18 min. Videos and field notes are optional, with no prerequisites or locked chapters.

The earlier 20-chapter, 12–16-hour proposal remains in Git history and the unchanged [handoff ZIP](../research/hublin-transcripts.zip). This document describes the delivered course.

## Learning path

| Original lecture | Delivered chapter and sessions | Investigations |
| --- | --- | --- |
| Histoire de vie et reproduction | **A lifetime of energy:** landscape and organism; timing of life; supporting dependants | Individual accounting, schematic survivorship, conserved provisioning |
| Grandir avec un grand cerveau | **Growing a costly brain:** size and energetic demand; birth and development; childhood in fossils | Developmental curves and denominator distinction; dental formation clock |
| Alimentation | **The food that made us:** vanished diets; acquisition and sharing; processing and fire | Synthetic isotope baseline case; preparation returns |
| Le coût de la bipédie | **The price of a kilometre:** anatomy and mechanisms; energy and distance; fossil diversity | Pendulum and spring schematic; power versus cost per distance; branching fossil guide |
| Thermorégulation | **A body in a changing climate:** heat exchange; hair and proportions; shelter and clothing | Heat and water constraints; equal-volume geometry |
| L’évolution humaine : une construction de niche | **The environments we make:** ecological change; culture and selection; social brains | Dairying feedback; synthetic final evidence case |

Write for a curious adult without prior training. Terms are explained in the text and a searchable French–English glossary. Reading sessions have clear stopping points. The final case connects diet, development and fire without demanding one preferred evolutionary story.

## The learning experience

A restrained field-notebook design uses warm paper, clear ink, local fonts, original SVG drawings and a dark theme. Text carries the explanation. Controls earn their space by exposing a distinction: energy cannot appear through sharing; a denominator changes a percentage; an isotope baseline changes an inference; sweat must evaporate to cool.

Each interactive includes a question, labelled controls, numerical or textual consequences, a reset and explicit assumptions. Quantitative models use declared synthetic inputs. The childhood curves are schematic and separate from the cited published 66%/43% peak equivalents. No fossil simulation, full ancestral optimiser, account service, chatbot or coding workspace is needed.

One optional field note per chapter saves locally and can be downloaded. Its checkbox records the reader’s own review. Editing a note clears that review; changing a checked answer clears its feedback. Multiple-choice questions provide explanatory feedback, while free-text reasoning is not automatically graded.

## Symposium decision

The associated **Energetics of the Hominins** event is a 2018 colloquium: 15 scientific presentations plus opening and closing remarks. Fourteen scientific presentations were recorded. Wil Roebroeks’s presentation was explicitly unrecorded.

The symposium adds specialist detail and repeats parts of the core, so it is **not a second mandatory course**. Its strongest conceptual contributions inform the relevant explanations. All 15 scientific contributions have official links and short descriptions in the optional resource guide.

| Contribution | Use in the delivered course |
| --- | --- |
| Kuzawa: brain energetics; Pontzer: expenditure; van Schaik: reliable supply | Core distinctions about developmental demand, expanded throughput and buffering; optional talk links |
| Jaouen: isotope limitations; Henry: costs of fire | Baselines and preparation costs inform the two food investigations |
| Gunz: development; McPherron: intermittent fire; Speth: meat; Rendu: seasonality | Optional routes for deeper evidence comparison, without extra required chapters |
| Lieberman, Garcia, Churchill, Daujeard | Optional locomotor, reproductive, demographic and prey-handling context |
| Carmody: microbiome | Optional biological extension; it would widen the core considerably if required |
| Roebroeks | Official programme link and explicit unrecorded status; no attributed transcript content |

This selection concerns fit with the learning path, not scientific quality. Later publications qualify both lectures and symposium interpretations where relevant.

## Sources and scientific fidelity

The original French titles and dates remain visible. **Show lecture video links and timestamps** is off by default and persists on the device. Enabling it reveals three topic ranges per chapter and optional English symposium links. These are external links, with no embedded player or external media request during reading. Displayed end times describe a range; YouTube opens at its beginning and does not automatically stop at its end.

[Source coverage and model provenance](SOURCE-COVERAGE.md) maps all six recordings to the text, distinguishes topic locators from primary evidence, and records numerical assumptions. [Scientific revisions](SCIENTIFIC-UPDATES.md) records the final treatment of subsequent studies. The [research manifest](../research/sources.json) and unchanged captions in the repository ZIP retain the historical source provenance. The ZIP and captions are excluded from site assets.

Updates include menopause at Ngogo, neonatal brain proportions, Dmanisi dental development, Gabasa zinc isotopes, fire-making evidence, endurance-hunting records, eyed needles, landscape modification, dairying and the smoke-receptor reassessment. Comparative cortical evidence replaces a literal triune-brain stack. The text distinguishes experimental cortical effects, anatomical blood-flow proxies and uncertain social-brain extrapolations from demonstrated evolutionary causes.

## Project and verification

The application is a single SvelteKit/Svelte package using the static adapter and a small Markdown renderer. It reuses `packages/course-navigation` for the collection link, persistent desktop sidebar, mobile drawer and reading guide. There is no backend. It is integrated into the collection index, build, preview, navigation checks and Pages dependency installation.

Nine invariant/content tests cover energy conservation, transfers, dimensional consistency, heat exchange, constant-volume geometry, inference sensitivity, source intervals, complete chapter structure, citations and recording IDs. Chromium exercises all chapters, model controls, stored-work revisions, theme/source preferences, keyboard focus and mobile overflow at 390 and 844 pixels. Standalone and `/courses/human-evolution` builds are checked separately. The full collection build includes 13 courses; its static audit checks 332 pages with no broken local links, images, fragments or duplicate IDs. Shared collection navigation passes across all 13 courses, including desktop persistence, mobile focus and collection links. The dedicated CI workflow repeats the course tests, type check, prefixed build and browser checks.

Six screenshots captured from the running course are tracked in `docs/screenshots/` and displayed in the course README; the collection README displays the current overview. They can be regenerated with `npm run screenshots` after building. Validation is described in the README; the course does not claim a learner study or a comprehensive systematic literature review.
