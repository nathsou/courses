<script lang="ts">
  /**
   * Modal particles: one plain sentence, then the same sentence with doch, mal, ja, eben/halt,
   * eigentlich, schon, denn, wohl or bloß, with an English paraphrase of the nuance, or a note on
   * why that particle does not fit there.
   */
  import { PARTICLES, PARTICLE_BASES, type ParticleId, type ParticleFit, type ParticleMiss } from './data/particle-lab';
  import Shell from './kit/Shell.svelte';
  import HiText from './kit/HiText.svelte';
  import Rich from '$lib/components/exercise/Rich.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import { unmark } from './kit/marks';

  let baseId = $state(PARTICLE_BASES[0]!.id);
  let particle = $state<ParticleId | null>('doch');

  const base = $derived(PARTICLE_BASES.find((b) => b.id === baseId)!);
  const entry = $derived(particle ? base.with[particle] : null);
  const fits = (e: ParticleFit | ParticleMiss | null): e is ParticleFit => !!e && !('none' in e);
  const allFits = $derived(PARTICLES.map((p) => ({ p, e: base.with[p.id] })).filter((x) => fits(x.e)) as { p: (typeof PARTICLES)[number]; e: ParticleFit }[]);
  const KIND = { command: 'command', statement: 'statement', question: 'W-question' } as const;
</script>

<Shell label="Particle lab" icon="sparkle">
  <div class="bases" role="radiogroup" aria-label="Sentence">
    {#each PARTICLE_BASES as b (b.id)}
      <button type="button" role="radio" aria-checked={baseId === b.id} class="chip" class:on={baseId === b.id} onclick={() => (baseId = b.id)} lang="de">{b.de}</button>
    {/each}
  </div>

  <div class="parts" role="group" aria-label="Add a particle">
    <button type="button" class="p ui" class:on={particle === null} aria-pressed={particle === null} onclick={() => (particle = null)}>none</button>
    {#each PARTICLES as p (p.id)}
      <button type="button" class="p" class:on={particle === p.id} aria-pressed={particle === p.id} title={p.gloss} onclick={() => (particle = particle === p.id ? null : p.id)} lang="de">{p.label}</button>
    {/each}
  </div>

  <div class="stage" aria-live="polite">
    <p class="plain ui"><span class="kind">{KIND[base.kind]}</span> <span lang="de" class="pde">{base.de}</span> <PlayButton text={base.de} small /> <span class="pen">{base.en}</span></p>
    {#if entry === null}
      <p class="big"><HiText text={base.de} size="lg" /></p>
      <p class="en ui">Plain and neutral. Now add a particle: it changes the tone, not the facts.</p>
    {:else if fits(entry)}
      <p class="big"><HiText text={entry.de} size="lg" /><PlayButton text={unmark(entry.de)} /></p>
      <p class="en">“{entry.en}”</p>
      <p class="tagline ui"><Icon name="lightbulb" size={15} /><span>{entry.note}</span></p>
      {#if entry.alt}<p class="alt ui">Also: <HiText text={entry.alt} play /></p>{/if}
    {:else}
      <p class="big miss"><span class="x ui" aria-hidden="true"><Icon name="x" size={18} /></span><span class="ui">Doesn’t fit this sentence.</span></p>
      <p class="why"><Rich text={entry.note} /></p>
      {#if entry.de}<p class="alt ui">Where it does fit: <HiText text={entry.de} play /> {#if entry.en}<span class="pen">“{entry.en}”</span>{/if}</p>{/if}
    {/if}
  </div>

  <details class="all">
    <summary class="ui">Every particle that fits “<span lang="de">{base.de}</span>” ({allFits.length})</summary>
    <ul>
      {#each allFits as { p, e } (p.id)}
        <li><HiText text={e.de} play /> <span class="pen ui">{e.note}</span></li>
      {/each}
    </ul>
  </details>
</Shell>

<style>
  .bases {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .chip {
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    border-radius: 999px;
    padding: 0.22rem 0.75rem;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 0.95rem;
    font-weight: 560;
  }
  .chip:hover {
    border-color: var(--mute);
  }
  .chip.on {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .parts {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin: 0.8rem 0;
  }
  .p {
    min-width: 2.8rem;
    border: 1.5px solid var(--line-strong);
    border-bottom-width: 3px;
    background: var(--panel);
    border-radius: 9px;
    padding: 0.25rem 0.6rem;
    cursor: pointer;
    font-family: var(--font-body);
    font-weight: 600;
    font-size: 0.95rem;
  }
  .p.ui {
    font-family: var(--font-ui);
    font-size: 0.8rem;
    color: var(--mute);
  }
  .p:hover {
    border-color: var(--mute);
  }
  .p.on {
    border-color: var(--accent);
    background: var(--accent);
    color: #fff;
  }
  .stage {
    background: var(--pn);
    border-radius: 12px;
    padding: 0.8rem 1rem;
    min-height: 9.5rem;
  }
  .plain {
    margin: 0 0 0.4rem;
    font-size: 0.82rem;
    color: var(--mute);
  }
  .kind {
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border: 1px solid var(--line-strong);
    border-radius: 999px;
    padding: 0 0.45rem;
    margin-right: 0.2rem;
  }
  .pde {
    font-family: var(--font-body);
    color: var(--ink-2);
    font-size: 0.95rem;
  }
  .pen {
    color: var(--mute);
    font-size: 0.85rem;
  }
  .big {
    margin: 0.2rem 0 0.1rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
  }
  .big.miss {
    color: var(--bad);
    font-weight: 600;
    font-size: 0.95rem;
  }
  .x {
    display: inline-grid;
    place-items: center;
    width: 1.7rem;
    height: 1.7rem;
    border-radius: 50%;
    background: var(--bad-soft);
  }
  .en {
    margin: 0.2rem 0 0;
    font-size: 1rem;
    font-style: italic;
    color: var(--ink-2);
  }
  .tagline {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    margin: 0.5rem 0 0;
    padding: 0.15rem 0.6rem;
    border-radius: 999px;
    background: var(--gold-soft);
    color: var(--ink-2);
    font-size: 0.82rem;
    font-weight: 600;
  }
  .tagline :global(svg) {
    color: var(--gold);
  }
  .why {
    margin: 0.3rem 0 0;
  }
  .alt {
    margin: 0.5rem 0 0;
    font-size: 0.85rem;
    color: var(--mute);
  }
  .alt :global(.hi) {
    font-family: var(--font-body);
    font-size: 1rem;
    color: var(--fg);
  }
  .all {
    margin-top: 0.8rem;
  }
  summary {
    cursor: pointer;
    font-size: 0.85rem;
    font-weight: 600;
    color: var(--ink-2);
  }
  .all ul {
    list-style: none;
    padding: 0;
    margin: 0.5rem 0 0;
    display: grid;
    gap: 0.3rem;
  }
  .all li {
    padding: 0.25rem 0;
    border-bottom: 1px solid var(--line);
  }
</style>
