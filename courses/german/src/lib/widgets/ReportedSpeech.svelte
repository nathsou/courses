<script lang="ts">
  /**
   * Direct → indirect speech: each change highlighted in both sentences and named (pronoun,
   * Konjunktiv I, the switch to Konjunktiv II or würde, time words, ob/W-words, commands).
   * A second view lines up Konjunktiv I with the indicative to show when the switch happens.
   */
  import { REPORTS, CHANGE_NAMES, K1_VERBS, type ChangeKind } from './data/reported-speech';
  import Shell from './kit/Shell.svelte';
  import HiText from './kit/HiText.svelte';
  import Rich from '$lib/components/exercise/Rich.svelte';
  import Icon from '$lib/components/ui/Icon.svelte';
  import type { Tone } from './kit/marks';

  const TONE: Record<ChangeKind, Tone> = { pron: 'purple', k1: 'jade', k2: 'accent', wuerde: 'accent', time: 'blue', conn: 'gold', cmd: 'gold', past: 'jade' };

  let tab = $state(0);
  let idx = $state(0);
  let focus = $state(-1);
  let verbId = $state('haben');

  const r = $derived(REPORTS[idx]!);
  const tones = (m: number[]) => m.map((c) => TONE[r.changes[c]!.kind]);
  const on = (m: number[]) => (focus < 0 ? undefined : m.map((c, i) => (c === focus ? i : -1)).filter((i) => i >= 0));
  const verb = $derived(K1_VERBS.find((v) => v.id === verbId)!);
  const PERSONS = ['ich', 'du', 'er/sie/es', 'wir', 'ihr', 'sie/Sie'];

  function go(d: number) {
    idx = (idx + d + REPORTS.length) % REPORTS.length;
    focus = -1;
  }
</script>

<Shell label="Reported speech" icon="chat" tabs={['Examples', 'Konjunktiv I forms']} bind:tab>
  {#if tab === 0}
    <div class="nav">
      <button type="button" class="btn small ghost" aria-label="Previous example" onclick={() => go(-1)}><Icon name="back" size={16} /></button>
      <label class="pick ui">
        <span class="sr-only">Example</span>
        <select value={idx} onchange={(e) => {
          idx = Number(e.currentTarget.value);
          focus = -1;
        }} lang="de">
          {#each REPORTS as x, i (x.id)}<option value={i}>{x.direct.replace(/[{}]/g, '')}</option>{/each}
        </select>
      </label>
      <button type="button" class="btn small ghost" aria-label="Next example" onclick={() => go(1)}><Icon name="arrow" size={16} /></button>
    </div>

    <div class="stage">
      <p class="tag ui">Direct speech</p>
      <p class="s"><HiText text={r.direct} tones={tones(r.dm)} on={on(r.dm)} size="md" play /></p>
      <div class="arrow" aria-hidden="true"><Icon name="arrow" size={18} /></div>
      <p class="tag ui out">Indirect speech</p>
      <p class="s"><HiText text={r.indirect} tones={tones(r.im)} on={on(r.im)} size="md" play /></p>
      <p class="en ui">{r.en}</p>
    </div>

    <p class="hint ui">What changed? Tap a change to see only its words.</p>
    <ul class="changes">
      {#each r.changes as c, i (i)}
        <li>
          <button type="button" class="change t-{TONE[c.kind]}" class:on={focus === i} aria-pressed={focus === i} onclick={() => (focus = focus === i ? -1 : i)}>
            <span class="badge ui">{CHANGE_NAMES[c.kind].label}</span>
            <span class="lab"><Rich text={c.label} plain /></span>
            <span class="note"><Rich text={c.note} plain /></span>
          </button>
        </li>
      {/each}
    </ul>
  {:else}
    <div class="verbs" role="radiogroup" aria-label="Verb">
      {#each K1_VERBS as v (v.id)}
        <button type="button" role="radio" aria-checked={verbId === v.id} class="chip" class:on={verbId === v.id} onclick={() => (verbId = v.id)} lang="de">{v.de}</button>
      {/each}
    </div>
    <div class="scroll">
      <table class="tbl">
        <thead>
          <tr><th scope="col" class="ui">Konj. I</th><th scope="col" class="ui">indicative</th><th scope="col" class="ui">reported speech uses</th></tr>
        </thead>
        <tbody lang="de">
          {#each verb.rows as row, i (i)}
            {@const same = row.k1 === row.ind}
            <tr class:same aria-label={PERSONS[i]}>
              <td class="k1">{row.k1}</td>
              <td class="ind">{row.ind}</td>
              <td class="use" class:sub={row.use !== row.k1}>{row.use}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
    {#if verb.note}<p class="vnote"><Rich text={verb.note} /></p>{/if}
    <p class="rule ui">Where Konjunktiv I looks exactly like the indicative (struck through), indirect speech borrows Konjunktiv II; if that looks like the past tense too, <em lang="de">würde</em> + infinitive. In practice the <em lang="de">du</em> and <em lang="de">ihr</em> forms (<em lang="de">habest, kommet</em>) sound stilted and are usually replaced as well. In everyday speech many people just use the indicative or <em lang="de">würde</em>.</p>
  {/if}
</Shell>

<style>
  .nav {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    margin-bottom: 0.7rem;
  }
  .pick {
    flex: 1;
    min-width: 0;
  }
  select {
    width: 100%;
    font-family: var(--font-body);
    font-size: 0.95rem;
    padding: 0.4rem 0.5rem;
    border-radius: 10px;
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
  }
  .stage {
    background: var(--pn);
    border-radius: 12px;
    padding: 0.8rem 1rem;
  }
  .tag {
    margin: 0;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--mute);
  }
  .tag.out {
    color: var(--accent-ink);
  }
  .s {
    margin: 0.1rem 0 0;
  }
  .arrow {
    color: var(--mute);
    transform: rotate(90deg);
    width: 18px;
    margin: 0.35rem 0 0.25rem 0.4rem;
  }
  .en {
    margin: 0.15rem 0 0;
    font-size: 0.88rem;
    color: var(--mute);
  }
  .hint {
    font-size: 0.8rem;
    color: var(--mute);
    margin: 0.8rem 0 0.4rem;
  }
  .changes {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.35rem;
  }
  .change {
    width: 100%;
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 0.15rem 0.6rem;
    align-items: baseline;
    text-align: left;
    padding: 0.5rem 0.7rem;
    border: 1px solid var(--line);
    border-left: 4px solid var(--c);
    border-radius: 10px;
    background: var(--panel);
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 0.95rem;
    line-height: 1.5;
  }
  .change:hover {
    border-color: var(--line-strong);
    border-left-color: var(--c);
  }
  .change.on {
    background: color-mix(in srgb, var(--c) 9%, var(--panel));
    border-color: var(--c);
  }
  .badge {
    font-size: 0.68rem;
    font-weight: 700;
    color: var(--c);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    white-space: nowrap;
  }
  .lab {
    font-weight: 600;
  }
  .note {
    grid-column: 1 / -1;
    color: var(--ink-2);
    font-size: 0.92rem;
  }
  .t-accent {
    --c: var(--accent);
  }
  .t-jade {
    --c: var(--jade);
  }
  .t-gold {
    --c: var(--gold);
  }
  .t-blue {
    --c: var(--g-m);
  }
  .t-purple {
    --c: var(--g-pl);
  }
  .verbs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    margin-bottom: 0.7rem;
  }
  .chip {
    border: 1.5px solid var(--line-strong);
    background: var(--panel);
    border-radius: 999px;
    padding: 0.2rem 0.75rem;
    cursor: pointer;
    font-family: var(--font-body);
    font-size: 0.95rem;
    font-weight: 560;
  }
  .chip.on {
    border-color: var(--accent);
    background: var(--accent-soft);
  }
  .scroll {
    overflow-x: auto;
    container-type: inline-size;
  }
  .tbl {
    border-collapse: collapse;
    width: 100%;
    margin: 0;
  }
  th {
    text-align: left;
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--mute);
    padding: 0.3rem 0.5rem;
    border-bottom: 1px solid var(--line-strong);
  }
  td {
    padding: 0.3rem 0.5rem;
    border-bottom: 1px solid var(--line);
    font-size: 0.98rem;
    white-space: nowrap;
  }
  tr.same .k1 {
    text-decoration: line-through;
    color: var(--mute);
  }
  .ind {
    color: var(--mute);
  }
  .use {
    font-weight: 600;
    color: var(--jade);
  }
  .use.sub {
    color: var(--accent-ink);
  }
  @container (max-width: 24rem) {
    td {
      font-size: 0.86rem;
      padding: 0.3rem 0.25rem;
      white-space: normal;
    }
    th {
      padding: 0.3rem 0.25rem;
    }
  }
  .vnote {
    margin: 0.6rem 0 0;
    font-size: 0.95rem;
  }
  .rule {
    margin: 0.7rem 0 0;
    font-size: 0.82rem;
    color: var(--ink-2);
  }
</style>
