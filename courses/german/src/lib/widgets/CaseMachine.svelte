<script lang="ts">
  /**
   * Build a sentence: a verb and nouns in roles (subject = nominative, direct object =
   * accusative, indirect object = dative, owner = genitive). The articles follow the roles, and
   * any role can move to the front without changing who does what.
   */
  import { untrack } from 'svelte';
  import { flip } from 'svelte/animate';
  import { parseCases, determiner, joined, type Case } from '$lib/de/declension';
  import { CASE_NOUNS, CASE_PRESETS } from './data/case-machine';
  import { build, complete, fits, rolesOf, verbsFor, verbById, nounById, ambiguous, type Role, type Setup, type NP } from './grammar/cases';
  import { speech } from '$lib/audio/speech.svelte';
  import Shell from './kit/Shell.svelte';
  import Rich from '$lib/components/exercise/Rich.svelte';
  import PlayButton from '$lib/components/de/PlayButton.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  let { cases }: { cases?: string } = $props();
  const caseList = $derived<Case[]>(cases === 'all' ? ['nom', 'acc', 'dat', 'gen'] : parseCases(cases, ['nom', 'acc', 'dat']));
  const verbs = $derived(verbsFor(caseList));
  const genitive = $derived(caseList.includes('gen'));

  const START: Setup = untrack(() => caseList).includes('dat')
    ? { verb: 'give', nouns: { nom: 'man', dat: 'child', acc: 'ball' }, article: 'def', front: 'nom', owner: null }
    : { verb: 'bite', nouns: { nom: 'dog', acc: 'man' }, article: 'def', front: 'nom', owner: null };
  let setup = $state<Setup>(START);
  const s = $derived(complete({ ...setup, verb: verbs.some((v) => v.id === setup.verb) ? setup.verb : (verbs.find((v) => v.id === 'give') ?? verbs[0]!).id }));
  const verb = $derived(verbById(s.verb));
  const roles = $derived(rolesOf(verb));
  const built = $derived(build(s));
  const isAmbiguous = $derived(ambiguous(s));

  const ROLE: Record<Role, { name: string; case: string; q: string }> = {
    nom: { name: 'Subject', case: 'nominative', q: 'who does it?' },
    acc: { name: 'Direct object', case: 'accusative', q: 'what or whom?' },
    dat: { name: 'Indirect object', case: 'dative', q: 'to or for whom?' },
  };

  const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  function set(patch: Partial<Setup>) {
    setup = complete({ ...s, ...patch });
  }
  function setNoun(r: Role, id: string) {
    // Taking a noun from another role swaps the two.
    const nouns = { ...s.nouns };
    const other = (Object.keys(nouns) as Role[]).find((k) => k !== r && nouns[k] === id);
    if (other && fits(verb, other, nounById(nouns[r]!))) nouns[other] = nouns[r];
    else if (other) delete nouns[other];
    nouns[r] = id;
    set({ nouns, owner: s.owner?.noun === id ? null : s.owner });
  }
  const swapWith = $derived(roles.find((r) => r !== 'nom' && fits(verb, 'nom', nounById(s.nouns[r]!)) && fits(verb, r, nounById(s.nouns.nom!))));
  function swap() {
    if (!swapWith) return;
    set({ nouns: { ...s.nouns, nom: s.nouns[swapWith], [swapWith]: s.nouns.nom } });
  }
  function preset(p: (typeof CASE_PRESETS)[number]) {
    const nouns: Setup['nouns'] = { nom: p.nom };
    if ('acc' in p) nouns.acc = p.acc;
    if ('dat' in p) nouns.dat = p.dat;
    setup = complete({ verb: p.verb, nouns, article: 'def', front: 'nom', owner: null });
  }
  const nomForm = (id: string, r: Role | 'gen') => {
    const n = nounById(id);
    const a = determiner(s.article === 'def' || r === 'gen' ? 'der' : 'ein', 'nom', n.g);
    return [a ? joined(a) : '', n.sg].filter(Boolean).join(' ');
  };
  const isNP = (x: NP | { verb: string }): x is NP => !('verb' in x);
  const cap = (t: string, first: boolean) => (first ? t.charAt(0).toUpperCase() + t.slice(1) : t);
</script>

<Shell label="Case machine" icon="settings" title="Who does what to whom?">
  <div class="presets ui">
    <span class="lbl">Try:</span>
    {#each CASE_PRESETS.filter((p) => verbs.some((v) => v.id === p.verb)) as p (p.id)}
      <button type="button" class="btn small ghost" onclick={() => preset(p)}>{p.label}</button>
    {/each}
  </div>

  <div class="controls">
    <div class="group">
      <span class="lbl ui" id="cm-verb">Verb</span>
      <div class="chips" role="radiogroup" aria-labelledby="cm-verb">
        {#each verbs as v (v.id)}
          <button type="button" role="radio" aria-checked={s.verb === v.id} class="chip" class:on={s.verb === v.id} lang="de" onclick={() => set({ verb: v.id })}>{v.de}</button>
        {/each}
      </div>
    </div>
    <div class="roles">
      {#each roles as r (r)}
        <label class="role r-{r}">
          <span class="ui"><b>{ROLE[r].name}</b> · {ROLE[r].case}</span>
          <select class="ui" value={s.nouns[r]} onchange={(e) => setNoun(r, (e.currentTarget as HTMLSelectElement).value)}>
            {#each CASE_NOUNS.filter((n) => fits(verb, r, n)) as n (n.id)}
              <option value={n.id} lang="de">{nomForm(n.id, r)}</option>
            {/each}
          </select>
        </label>
      {/each}
      {#if genitive}
        <label class="role r-gen">
          <span class="ui"><b>Whose?</b> · genitive</span>
          <select
            class="ui"
            value={s.owner?.noun ?? ''}
            onchange={(e) => {
              const v = (e.currentTarget as HTMLSelectElement).value;
              set({ owner: v ? { noun: v, of: s.owner?.of ?? 'nom' } : null });
            }}
          >
            <option value="">(nobody)</option>
            {#each CASE_NOUNS.filter((n) => n.kind === 'anim' && !Object.values(s.nouns).includes(n.id)) as n (n.id)}
              <option value={n.id} lang="de">{nomForm(n.id, 'gen')}</option>
            {/each}
          </select>
        </label>
        {#if s.owner}
          <label class="role r-gen">
            <span class="ui">…belongs with</span>
            <select class="ui" value={s.owner.of} onchange={(e) => set({ owner: { noun: s.owner!.noun, of: (e.currentTarget as HTMLSelectElement).value as Role } })}>
              {#each roles as r (r)}<option value={r}>{ROLE[r].name.toLowerCase()}</option>{/each}
            </select>
          </label>
        {/if}
      {/if}
    </div>
    <div class="group">
      <span class="lbl ui" id="cm-art">Article</span>
      <div class="chips" role="radiogroup" aria-labelledby="cm-art">
        <button type="button" role="radio" aria-checked={s.article === 'def'} class="chip ui" class:on={s.article === 'def'} onclick={() => set({ article: 'def' })}>the (der)</button>
        <button type="button" role="radio" aria-checked={s.article === 'indef'} class="chip ui" class:on={s.article === 'indef'} onclick={() => set({ article: 'indef' })}>a (ein)</button>
      </div>
    </div>
  </div>

  <div class="stage" aria-live="polite">
    <p class="sr-only">{built.text} {built.en}</p>
    <div class="sentence" aria-hidden="true">
      {#each built.order as x, i ('verb' in x ? 'verb' : x.role)}
        <span class="part" animate:flip={{ duration: reduce ? 0 : 320 }}>
          {#if isNP(x)}
            <span class="np r-{x.role}" lang="de">
              {#if x.article}<b class="art">{cap(x.article.stem, i === 0)}<u>{x.article.ending}</u></b>{' '}{/if}<span>{x.article ? x.noun.stem : cap(x.noun.stem, i === 0)}{#if x.noun.ending}<u>{x.noun.ending}</u>{/if}</span>{#if x.owner}{' '}<span class="gen"><b class="art">{x.owner.article.stem}<u>{x.owner.article.ending}</u></b> {x.owner.noun.stem}{#if x.owner.noun.ending}<u>{x.owner.noun.ending}</u>{/if}</span>{/if}
            </span>
            <span class="tag ui">{ROLE[x.role].case}{#if x.owner} + genitive{/if}</span>
          {:else}
            <span class="verb" lang="de">{x.verb}</span>
            <span class="tag ui">verb</span>
          {/if}
        </span>
      {/each}
      <span class="part end"><PlayButton text={built.text} /></span>
    </div>
    <p class="en ui">“{built.en}”</p>
  </div>

  <div class="order">
    <span class="lbl ui" id="cm-front">Put first</span>
    <div class="chips" role="radiogroup" aria-labelledby="cm-front">
      {#each built.order.filter(isNP) as x (x.role)}
        <button type="button" role="radio" aria-checked={s.front === x.role} class="chip front r-{x.role}" class:on={s.front === x.role} lang="de" onclick={() => set({ front: x.role })}>{x.text}</button>
      {/each}
    </div>
    {#if swapWith}
      <button type="button" class="btn small" onclick={swap}><Icon name="shuffle" size={15} /> Swap the {ROLE.nom.name.toLowerCase()} and {ROLE[swapWith].name.toLowerCase()}</button>
    {/if}
  </div>

  <div class="notes ui">
    {#if isAmbiguous}
      <p class="warn">
        <Rich text={`Careful: here neither article shows the case, so a listener takes the first noun as the subject and reads it the other way round. Only the masculine {der → den} makes the accusative visible.`} />
      </p>
    {:else if s.front !== 'nom'}
      <p>
        <Rich text={`The ${ROLE[s.front].name.toLowerCase()} comes first, for emphasis or to link to what was said before. The verb stays second, and the endings still say who does what, so the meaning is the same.`} />
      </p>
    {:else}
      <p>The subject is in the nominative; objects take the accusative or dative. Put another part first and watch what stays the same.</p>
    {/if}
    {#if verb.note}<p><Rich text={verb.note} /></p>{/if}
  </div>
</Shell>

<style>
  .presets {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.3rem;
    margin: -0.3rem 0 0.6rem;
    font-size: 0.85rem;
  }
  .lbl {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--mute);
  }
  .controls {
    display: grid;
    gap: 0.7rem;
  }
  .group {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.6rem;
  }
  .group .lbl {
    min-width: 3.6rem;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.35rem;
  }
  .chip {
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 999px;
    padding: 0.25rem 0.75rem;
    font-family: var(--font-body);
    font-size: 0.95rem;
    font-weight: 560;
    cursor: pointer;
  }
  .chip.ui {
    font-family: var(--font-ui);
    font-size: 0.85rem;
  }
  .chip.on {
    background: var(--fg);
    border-color: var(--fg);
    color: var(--bg);
  }
  .roles {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
    gap: 0.5rem;
  }
  .role {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.45rem 0.6rem 0.55rem;
    border-radius: 10px;
    background: color-mix(in srgb, var(--rc) 10%, var(--panel));
    border: 1px solid color-mix(in srgb, var(--rc) 40%, transparent);
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .role select {
    font-size: 0.95rem;
    padding: 0.3rem 0.4rem;
    border-radius: 7px;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
  }
  .r-nom {
    --rc: var(--gold);
  }
  .r-acc {
    --rc: var(--accent);
  }
  .r-dat {
    --rc: var(--jade);
  }
  .r-gen {
    --rc: var(--g-pl);
  }
  .stage {
    margin: 1rem 0 0.6rem;
    padding: 0.9rem 0.8rem 0.6rem;
    border-radius: 12px;
    background: var(--bg);
    border: 1px solid var(--line);
  }
  .sentence {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 0.5rem 0.4rem;
  }
  .part {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
  }
  .part.end {
    align-self: center;
  }
  .np,
  .verb {
    font-family: var(--font-body);
    font-size: 1.25rem;
    font-weight: 560;
    line-height: 1.3;
    padding: 0.2rem 0.5rem;
    border-radius: 8px;
  }
  .np {
    background: color-mix(in srgb, var(--rc) 16%, transparent);
    border-bottom: 3px solid var(--rc);
  }
  .np u {
    text-decoration: none;
    color: var(--accent-ink);
    font-weight: 750;
  }
  .np .art {
    font-weight: 700;
  }
  .gen {
    background: color-mix(in srgb, var(--g-pl) 16%, transparent);
    border-radius: 6px;
    padding: 0 0.25rem;
  }
  .verb {
    border-bottom: 3px solid var(--line-strong);
  }
  .tag {
    font-size: 0.66rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mute);
  }
  .en {
    margin: 0.55rem 0 0;
    color: var(--ink-2);
    font-size: 0.92rem;
  }
  .order {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.6rem;
  }
  .chip.front.on {
    background: color-mix(in srgb, var(--rc) 22%, var(--panel));
    border-color: var(--rc);
    color: var(--fg);
  }
  .notes {
    font-size: 0.86rem;
    color: var(--ink-2);
    line-height: 1.55;
  }
  .notes p {
    margin: 0.6rem 0 0;
  }
  .warn {
    background: var(--gold-soft);
    border-radius: 8px;
    padding: 0.45rem 0.65rem;
  }
  @media (max-width: 420px) {
    .np,
    .verb {
      font-size: 1.1rem;
    }
  }
</style>
