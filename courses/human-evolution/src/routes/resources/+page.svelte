<script lang="ts">
  import { base } from '$app/paths';
  import { chapters } from '$lib/outline';
  import { symposium } from '$lib/symposium';
  import { glossary } from '$lib/glossary';
  import { preferences } from '$lib/state.svelte';
  import references from '$lib/references.json';
  const official = 'https://www.college-de-france.fr/fr/agenda/cours/traits-de-vie-et-contraintes-energetiques-au-cours-de-evolution-humaine';
  let filter = $state('');
  const shown = $derived(glossary.filter(([term, definition]) => `${term} ${definition}`.toLowerCase().includes(filter.toLowerCase())));
</script>
<svelte:head><title>Sources & field glossary — Human Evolution</title><meta name="description" content="Original lectures, primary research, scientific revisions, optional symposium resources and a French–English glossary."/></svelte:head>
<article class="article resources">
  <span class="eyebrow">A guide to the evidence</span><h1>Sources & field glossary</h1>
  <div class="prose">
    <p>This independent English course adapts all six lectures by <strong>Jean-Jacques Hublin</strong> in <a href={official} lang="fr">Traits de vie et contraintes énergétiques au cours de l’évolution humaine</a>, Collège de France, October–December 2017. Original arguments are attributed; later research is cited where it qualifies them.</p>
    <p>All illustrations are original schematics. Numerical teaching models state their assumptions at the figure. The childhood plot is schematic; the published peak energy equivalents are separately identified. The source captions and research archive are authoring material and are not distributed as course assets.</p>
    <h2 id="lectures">The six original lectures</h2>
    <ol>{#each chapters as c}<li><a href="{official}/{c.number===1?'histoire-de-vie-et-reproduction':c.number===2?'grandir-avec-un-grand-cerveau':c.number===3?'alimentation':c.number===4?'le-cout-de-la-bipedie':c.number===5?'thermoregulation':'evolution-humaine-une-construction-de-niche'}" lang="fr">{c.original}</a> · {c.date}{#if preferences.videos}<br/><a href="https://www.youtube.com/watch?v={c.videoId}&t=0s" target="_blank" rel="noreferrer">Open original lecture on YouTube at 0:00 →</a>{/if}</li>{/each}</ol>
    <p>Enable <strong>Show lecture video links and timestamps</strong> in Reading settings to see links beside related passages. Ranges are verified against caption topic coverage and provide navigation, not sentence-level quotations. Automatic captions can misstate names and numbers; quantitative claims use the publications listed below. A historical video passage is not evidence for a later correction.</p>
    <h2 id="research">Research behind the explanations</h2>
    <p>The bibliography includes foundational studies, later primary findings and explicitly identified reviews. It is a focused guide to the course’s questions, rather than a claim that every debate is settled. Some publisher pages provide only abstracts or require access for full text.</p>
    <ul class="references">{#each references as r}<li id={r.id}><a href="https://doi.org/{r.doi}">{r.title}</a><small>{r.authors} · {r.year} · {r.role}</small></li>{/each}</ul>
    <h2 id="symposium">Optional symposium resources</h2>
    <p><a href="https://www.college-de-france.fr/fr/agenda/colloque/energetics-of-the-hominins">Energetics of the Hominins</a> took place on 11–12 June 2018. Its fifteen scientific talks complement the lectures. Insights about expanded throughput, childhood, buffering, isotope limitations and fire costs inform the core explanations; watching the guest talks is optional.</p>
    <p>Fourteen scientific presentations were recorded. Wil Roebroeks’s presentation was not recorded; no video is supplied for it. The programme also includes Hublin’s opening and closing sessions, which are additional source context.</p>
    <ul class="references">{#each symposium as talk}<li><a href="https://www.college-de-france.fr/fr/agenda/colloque/energetics-of-the-hominins/{talk.slug}">{talk.title}</a><small>{talk.speaker} · {talk.role}</small>{#if preferences.videos && talk.video}<a class="small" href="https://www.youtube.com/watch?v={talk.video}&t=0s" target="_blank" rel="noreferrer">Open English symposium recording at 0:00 →</a>{/if}</li>{/each}</ul>
    <h2 id="glossary">A small field glossary</h2>
    <p>Terms are introduced in the chapters; this French–English reference helps when following the original lectures.</p>
  </div>
  <label class="glossary-search">Find a term <input type="search" bind:value={filter} placeholder="Try isotope, sevrage, or energy…"/></label>
  <p class="small" aria-live="polite">{shown.length} terms</p>
  <dl class="glossary">{#each shown as [term, definition]}<div><dt>{term}</dt><dd>{definition}</dd></div>{/each}</dl>
  <div class="prose"><h2 id="reading">Reading the models and your progress</h2><p>Activities illustrate a mechanism or help assess evidence. A numerical output establishes a consequence of stated assumptions; it does not validate a fossil reconstruction. Checked questions supply feedback on a selected answer. Field notes and self-review are your own judgment, saved on this device when storage is available. Editing a reviewed note clears its self-review marker.</p><p>The course uses no embedded video players or remote analytics. Following an external source link takes you to that provider. Text and figures remain readable without viewing the videos. <a href="{base}/">Return to the course opening →</a></p></div>
</article>

<style>.glossary-search { display:flex; flex-direction:column; gap:.5rem; font-size:.8rem; margin:1rem 0; }.glossary-search input { padding:.7rem; background:var(--bg); color:var(--ink); border:1px solid var(--line-strong); border-radius:4px; }</style>
