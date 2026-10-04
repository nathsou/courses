<script lang="ts">
  import { base } from '$app/paths';
  import { chapters } from '$lib/outline';
  import { preferences } from '$lib/state.svelte';
</script>
<svelte:head><title>Human Evolution — Energy, childhood, and the environments we make</title><meta name="description" content="Explore all six of Jean-Jacques Hublin’s Collège de France lectures through clear explanations, evidence and focused interactive models."/></svelte:head>
<div class="home">
  <section class="hero">
    <div><span class="eyebrow">Palæoanthropology · An interactive course</span><h1>The cost of<br/>being <em>human.</em></h1><p class="lead">A large brain. A long childhood. A body that travels far. How did our lineage afford such an expensive way of living?</p><a class="primary-link" href="{base}/ch/life-history/">Begin the course <span aria-hidden="true">→</span></a></div>
    <figure class="hero-figure">
      <svg viewBox="0 0 440 400" role="img" aria-label="An original schematic human silhouette connects food energy to the brain, organs, movement and heat, with support from other people.">
        <defs><pattern id="hero-grid" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M24 0H0V24" fill="none" stroke="var(--line)" stroke-width=".5"/></pattern></defs>
        <circle cx="230" cy="205" r="156" fill="url(#hero-grid)"/>
        <circle cx="230" cy="205" r="156" class="guide"/><circle cx="230" cy="205" r="125" class="guide"/>
        <path class="outline" d="M209 50Q230 39 247 53Q267 75 250 98L247 115Q272 121 287 151L298 221Q302 236 291 239Q279 239 276 224L259 171L264 231L269 326Q270 346 257 346Q246 346 244 326L230 255L218 326Q215 346 202 346Q190 346 194 326L200 233L201 170L182 224Q177 239 166 236Q157 232 162 217L179 151Q188 124 211 115L211 100Q197 84 200 68Q202 56 209 50Z"/>
        <path d="M218 61Q232 53 244 64Q250 75 244 86Q234 96 220 88Q210 78 218 61Z" fill="var(--forest)" opacity=".8"/>
        <path d="M219 148Q234 135 247 151L245 174Q240 187 223 178Z" fill="var(--ochre)" opacity=".75"/>
        <path d="M214 192Q228 185 244 195Q253 207 239 218L212 214Z" fill="var(--rust)" opacity=".6"/>
        <path class="flow" d="M238 76H330M243 164H351M203 215H97M258 309H337M182 153H80"/>
        <circle cx="238" cy="76" r="3" fill="var(--forest)"/><circle cx="243" cy="164" r="3" fill="var(--ochre)"/><circle cx="203" cy="215" r="3" fill="var(--rust)"/>
        <text x="335" y="73">Brain</text><text x="335" y="90" class="diagram-label">a costly childhood</text>
        <text x="355" y="162">Organs</text><text x="355" y="179" class="diagram-label">maintenance</text>
        <text x="27" y="146">Food</text><text x="27" y="164" class="diagram-label">energy acquired</text>
        <text x="24" y="212">Heat</text><text x="24" y="230" class="diagram-label">energy exchanged</text>
        <text x="342" y="308">Movement</text><text x="342" y="326" class="diagram-label">the price of distance</text>
        <path class="guide" d="M114 335Q82 210 144 92"/><text x="36" y="368" class="diagram-label">A body supported by a landscape—and by other people.</text>
      </svg>
      <figcaption>Original schematic · physiology, ecology and cooperation</figcaption>
    </figure>
  </section>
  <div class="home-meta"><span>Six original lectures</span><span>About 4 hours with activities</span><span>No biology background needed</span><span>Videos optional</span></div>
  <section class="home-intro"><h2>Follow the energy.<br/>Question the evidence.</h2><div><p>Jean-Jacques Hublin’s 2017 Collège de France course connects reproduction, brain development, food, bipedalism, temperature and niche construction. This English adaptation follows that complete sequence, with compact explanations and investigations you can manipulate.</p><p>You will read an energy account, reconstruct an ancient diet, inspect a dental clock and compare ways of moving and exchanging heat. Each chapter has three natural stopping points. You can explore, take an optional field note, or simply read.</p></div></section>
  <section class="course-grid" aria-label="The six chapters">
    {#each chapters as chapter}<a class="course-card" href="{base}/ch/{chapter.slug}/"><div class="card-top"><span class="card-number">{String(chapter.number).padStart(2,'0')} / 06</span><span>{preferences.reviewed.includes(chapter.slug)?'Self-reviewed':`≈ ${chapter.minutes} min`}</span></div><h3>{chapter.title}</h3><p>{chapter.question}</p></a>{/each}
  </section>
  <p class="home-source">Based on <a href="https://www.college-de-france.fr/fr/agenda/cours/traits-de-vie-et-contraintes-energetiques-au-cours-de-evolution-humaine" lang="fr">Traits de vie et contraintes énergétiques au cours de l’évolution humaine</a>, delivered by Jean-Jacques Hublin in October–December 2017. Later findings are explained and cited where they change the account. Selected 2018 symposium insights are integrated; the guest recordings are optional resources. This is an independent educational adaptation, not an official Collège de France publication. <a href="{base}/resources/">Source guide & glossary →</a></p>
</div>
