<script lang="ts">
  /**
   * Every tense of a verb from the course's verb tables: Präsens, Präteritum, Perfekt,
   * Konjunktiv II, Konjunktiv I, Imperativ. Forms that differ from the regular pattern are
   * highlighted; tap a form to hear it with its pronoun. Without a `verb`, a searchable picker.
   */
  import { untrack } from 'svelte';
  import { allVerbs, verbTable, type VerbTable } from '$lib/de/verbs';
  import { lookup } from '$lib/de/lexicon';
  import { speech } from '$lib/audio/speech.svelte';
  import { cell, fixImperative, regularForms, separablePrefix, type Cell } from './grammar/conjugation';
  import Shell from './kit/Shell.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';

  let { verb }: { verb?: string } = $props();
  const given = untrack(() => verb);
  const VERBS = allVerbs().sort((a, b) => a.replace(/^sich /, '').localeCompare(b.replace(/^sich /, ''), 'de'));
  const find = (k: string | undefined) => (k ? (VERBS.find((v) => v === k) ?? VERBS.find((v) => v === `sich ${k}`) ?? (verbTable(k) ? k : undefined)) : undefined);
  const initial = find(given) ?? find('fahren') ?? find('sein') ?? VERBS[0];
  let key = $state(initial);
  let query = $state('');
  const picker = $derived(!given || !find(given));

  const matches = $derived.by(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const bare = (v: string) => v.replace(/^sich /, '');
    const rank = (v: string) => (bare(v).startsWith(q) ? 0 : 1);
    return VERBS.filter((v) => v.includes(q))
      .sort((a, b) => rank(a) - rank(b) || bare(a).localeCompare(bare(b), 'de'))
      .slice(0, 24);
  });

  /** Verbs whose reflexive pronoun is dative (ich wünsche mir …). */
  const DATIVE_REFLEXIVE = new Set(['sich wünschen', 'sich ansehen', 'sich anschauen', 'sich merken', 'sich überlegen', 'sich leisten', 'sich ausdenken', 'sich vornehmen', 'sich ausleihen', 'sich holen', 'sich kaufen', 'sich vorstellen']);
  const PRON = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'];
  const SAY = ['ich', 'du', 'er', 'wir', 'ihr', 'sie'];

  interface Row {
    who: string;
    say: string;
    c: Cell;
    /** Text before and after the highlighted verb form (auxiliary, reflexive, Sie). */
    pre: string;
    post: string;
    full: string;
  }
  interface Tense {
    id: string;
    de: string;
    en: string;
    rows: Row[];
    note?: string;
  }

  const t = $derived<VerbTable | undefined>(key ? verbTable(key) : undefined);
  const reflexive = $derived(!!key?.startsWith('sich '));
  const inf = $derived(key?.replace(/^sich /, '') ?? '');
  const prefix = $derived(t ? separablePrefix(t) : '');
  const refl = $derived(reflexive ? (DATIVE_REFLEXIVE.has(key!) ? ['mir', 'dir', 'sich', 'uns', 'euch', 'sich'] : ['mich', 'dich', 'sich', 'uns', 'euch', 'sich']) : null);

  /** Insert the reflexive pronoun after the first word: "freue mich", "sehe mir … an". */
  const withRefl = (form: string, p: string | undefined) => {
    if (!p) return { pre: '', main: form, post: '' };
    const [first, ...rest] = form.split(' ');
    return { pre: '', main: first!, post: ` ${p}${rest.length ? ` ${rest.join(' ')}` : ''}` };
  };

  const tenses = $derived.by<Tense[]>(() => {
    if (!t) return [];
    const r = regularForms(inf, prefix, t.pp);
    const simple = (forms: string[], reg: string[]): Row[] =>
      forms.map((f, i) => {
        // Highlight the verb itself; the separable prefix and reflexive pronoun sit outside.
        const c = cell(f, reg[i]!);
        const w = withRefl(f, refl?.[i]);
        const full = `${w.main}${w.post}`;
        return { who: PRON[i]!, say: `${SAY[i]} ${full}`, c: w.post && refl ? cell(w.main, reg[i]!.split(' ')[0]!) : c, pre: '', post: refl ? w.post : '', full };
      });
    const auxForms = t.aux === 's' ? ['bin', 'bist', 'ist', 'sind', 'seid', 'sind'] : ['habe', 'hast', 'hat', 'haben', 'habt', 'haben'];
    const ppCell = cell(t.pp, r.pp);
    const perfect: Row[] = auxForms.map((a, i) => {
      const aux = t.aux === 'hs' ? `${a}/${['bin', 'bist', 'ist', 'sind', 'seid', 'sind'][i]}` : a;
      const pre = `${aux}${refl ? ` ${refl[i]}` : ''} `;
      return { who: PRON[i]!, say: `${SAY[i]} ${a}${refl ? ` ${refl[i]}` : ''} ${t.pp}`, c: ppCell, pre, post: '', full: `${pre}${t.pp}` };
    });
    const impDu = fixImperative(inf, t.imp[0], prefix);
    const imp: Row[] = [];
    if (impDu) {
      const sie = t.pres[5]!.split(' ');
      const sieForm = [sie[0], 'Sie', ...(refl ? ['sich'] : []), ...sie.slice(1)].join(' ');
      const rows: [string, string, string | string[], string | undefined][] = [
        ['du', impDu, r.impDu, refl?.[1]],
        ['ihr', t.imp[1], r.impIhr, refl?.[4]],
      ];
      for (const [who, f, reg, p] of rows) {
        if (!f) continue;
        const w = withRefl(f, p);
        const regFirst = (Array.isArray(reg) ? reg : [reg]).map((x) => x.split(' ')[0]!);
        const c = cell(w.main.split(' ')[0]!, regFirst);
        const full = `${w.main}${w.post}`;
        imp.push({ who, say: `${full.charAt(0).toUpperCase()}${full.slice(1)}!`, c: { ...c, parts: [c.parts[0], c.parts[1], `${c.parts[2]}${w.main.slice(w.main.split(' ')[0]!.length)}`], form: w.main }, pre: '', post: w.post, full });
      }
      imp.push({ who: 'Sie', say: `${sieForm.charAt(0).toUpperCase()}${sieForm.slice(1)}!`, c: { form: sieForm, parts: [sieForm, '', ''], irregular: false }, pre: '', post: '', full: sieForm });
    }
    const k2same = t.k2.every((f, i) => f === t.pret[i]);
    return [
      { id: 'pres', de: 'Präsens', en: 'present', rows: simple(t.pres, r.pres) },
      { id: 'pret', de: 'Präteritum', en: 'simple past', rows: simple(t.pret, r.pret) },
      { id: 'perf', de: 'Perfekt', en: 'perfect', rows: perfect, note: t.aux === 'hs' ? 'sein for movement from A to B, haben otherwise.' : undefined },
      { id: 'k2', de: 'Konjunktiv II', en: 'would, if', rows: simple(t.k2, r.k2), note: k2same ? `The same as the Präteritum, so in speech people say würde + infinitive: ich würde ${refl ? `${refl[0]} ` : ''}${inf}.` : undefined },
      { id: 'k1', de: 'Konjunktiv I', en: 'reported speech', rows: simple(t.k1, r.k1), note: 'Mostly the er/sie/es form, in reported speech: er sagt, er ' + (refl ? `${t.k1[2]!.split(' ')[0]} sich` : t.k1[2]) + ' …' },
      { id: 'imp', de: 'Imperativ', en: 'commands', rows: imp, note: imp.length ? undefined : 'No imperative.' },
    ];
  });

  const aux3 = $derived(!t ? '' : t.aux === 's' ? 'ist' : t.aux === 'hs' ? 'hat/ist' : 'hat');
  const parts = $derived.by(() => {
    if (!t || !key) return [];
    const r3 = (f: string) => withRefl(f, reflexive ? 'sich' : undefined);
    const p = r3(t.pres[2]!);
    const q = r3(t.pret[2]!);
    return [key, p.main + p.post, q.main + q.post, `${aux3}${reflexive ? ' sich' : ''} ${t.pp}`];
  });
  const gloss = $derived(key ? (lookup(key)?.g ?? '') : '');
  const say = (s: string) => void speech.say(s);
</script>

<Shell label="Conjugator" icon="book" title={key ?? 'Verb tables'}>
  {#if picker}
    <div class="search">
      <label class="ui" for="cj-q">Find a verb</label>
      <input id="cj-q" type="search" class="ui" bind:value={query} placeholder="e.g. fahren, anrufen, sich freuen" autocomplete="off" lang="de" />
    </div>
    {#if given && !find(given)}<p class="ui miss">There is no table for <span lang="de">{given}</span> yet.</p>{/if}
    {#if matches.length}
      <div class="matches" role="listbox" aria-label="Verbs">
        {#each matches as v (v)}
          <button type="button" role="option" aria-selected={v === key} class="chip" class:on={v === key} lang="de" onclick={() => ((key = v), (query = ''))}>{v}</button>
        {/each}
      </div>
    {:else if query.trim()}
      <p class="ui miss">No verb in the course matches “{query}”.</p>
    {/if}
  {/if}

  {#if t && key}
    <div class="parts">
      <p class="pp" lang="de">
        {#each parts as p, i (i)}{#if i}<span class="dot" aria-hidden="true">·</span>{/if}<button type="button" class="part" onclick={() => say(p)}>{p}</button>{/each}
      </p>
      {#if gloss}<p class="gloss ui">{gloss}{prefix ? ` · separable (${prefix}-)` : ''}{reflexive ? ' · reflexive' : ''}</p>{/if}
    </div>
    <div class="grid">
      {#each tenses as ts (ts.id)}
        <section class="tense" aria-label="{ts.de} ({ts.en})">
          <h4 class="ui"><span lang="de">{ts.de}</span> <small>{ts.en}</small></h4>
          <table>
            <tbody>
              {#each ts.rows as r (r.who)}
                <tr>
                  <th scope="row" class="ui" lang="de">{r.who}</th>
                  <td>
                    <button type="button" class="form" class:irr={r.c.irregular} onclick={() => say(r.say)} aria-label="{r.who} {r.full}{r.c.irregular ? ' (irregular)' : ''}. Listen" lang="de"
                      >{r.pre}{r.c.parts[0]}{#if r.c.parts[1]}<mark>{r.c.parts[1]}</mark>{/if}{r.c.parts[2]}{r.post}</button
                    >
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
          {#if ts.note}<p class="note ui">{ts.note}</p>{/if}
        </section>
      {/each}
    </div>
    <p class="legend ui"><span class="sw"></span> differs from the regular pattern · <Icon name="speaker" size={13} /> tap a form to hear it</p>
  {:else if !picker}
    <p class="ui miss">There is no table for this verb yet.</p>
  {/if}
</Shell>

<style>
  .search {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.6rem;
  }
  .search label {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--mute);
  }
  .search input {
    flex: 1 1 12rem;
    min-width: 0;
    font-size: 1rem;
    padding: 0.4rem 0.65rem;
    border-radius: 9px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
  }
  .matches {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-top: 0.5rem;
  }
  .chip {
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 999px;
    padding: 0.18rem 0.65rem;
    font-family: var(--font-body);
    font-size: 0.92rem;
    cursor: pointer;
  }
  .chip.on {
    background: var(--fg);
    color: var(--bg);
  }
  .miss {
    color: var(--mute);
    font-size: 0.88rem;
    margin: 0.5rem 0 0;
  }
  .parts {
    margin: 0.8rem 0 0.7rem;
  }
  .pp {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.1rem 0.35rem;
    margin: 0;
    font-size: 1.35rem;
    font-weight: 650;
  }
  .part {
    border: none;
    background: none;
    color: inherit;
    font: inherit;
    padding: 0 0.15rem;
    border-radius: 6px;
    cursor: pointer;
  }
  .part:hover {
    background: var(--pn);
  }
  .dot {
    color: var(--mute);
  }
  .gloss {
    margin: 0.1rem 0 0;
    font-size: 0.88rem;
    color: var(--mute);
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(13.5rem, 1fr));
    gap: 0.55rem;
  }
  .tense {
    border: 1px solid var(--line);
    border-radius: 12px;
    background: var(--bg);
    padding: 0.55rem 0.6rem 0.5rem;
    min-width: 0;
  }
  h4 {
    margin: 0 0 0.3rem;
    font-size: 0.78rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--accent-ink);
  }
  h4 small {
    font-weight: 500;
    text-transform: none;
    letter-spacing: 0;
    color: var(--mute);
  }
  table {
    display: table;
    width: 100%;
    border-collapse: collapse;
    margin: 0;
    font-size: 1rem;
  }
  th,
  td {
    border: none;
    padding: 0;
    vertical-align: middle;
  }
  th {
    width: 4.6rem;
    font-size: 0.76rem;
    font-weight: 500;
    color: var(--mute);
    text-transform: none;
    letter-spacing: 0;
    white-space: nowrap;
  }
  .form {
    border: none;
    background: none;
    color: var(--fg);
    font-family: var(--font-body);
    font-size: 1rem;
    font-weight: 560;
    padding: 0.12rem 0.3rem;
    margin: 0.05rem 0;
    border-radius: 6px;
    cursor: pointer;
    text-align: left;
  }
  .form:hover {
    background: color-mix(in srgb, var(--accent) 9%, transparent);
  }
  .form.irr {
    background: var(--gold-soft);
  }
  .form mark {
    background: none;
    color: var(--accent-ink);
    font-weight: 800;
    text-decoration: underline;
    text-decoration-thickness: 2px;
    text-underline-offset: 0.16em;
  }
  .note {
    font-size: 0.76rem;
    color: var(--mute);
    margin: 0.35rem 0 0;
    line-height: 1.45;
  }
  .legend {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.35rem;
    font-size: 0.78rem;
    color: var(--mute);
    margin: 0.7rem 0 0;
  }
  .sw {
    display: inline-block;
    width: 1.1rem;
    height: 0.8rem;
    border-radius: 3px;
    background: var(--gold-soft);
    border: 1px solid color-mix(in srgb, var(--gold) 40%, transparent);
  }
</style>
