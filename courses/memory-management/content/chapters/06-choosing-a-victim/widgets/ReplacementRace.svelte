<!--
  The replacement race: every policy replays the same reference string with the same number of frames. Step
  through to see each one's frames, hits (✓) and faults; OPT (Bélády) looks into the future.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { simulate, faults, BELADY_STRING, phasedString, POLICY_NAMES, type Policy } from '$lib/mm/kernel/replace';

  const STRINGS: Record<string, number[]> = {
    'Bélády’s string': BELADY_STRING,
    'A loop of 5 pages': [1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3],
    'Locality that drifts': phasedString(30, 3, 9, 3),
    Random: Array.from({ length: 24 }, (_, i) => ((i * 7919) % 13) % 7),
  };
  const POLICIES: Policy[] = ['fifo', 'lru', 'clock', 'random', 'opt'];
  let which = $state('Bélády’s string');
  let frames = $state(3);
  let t = $state(0);
  const refs = $derived(STRINGS[which]!);
  const runs = $derived(Object.fromEntries(POLICIES.map((p) => [p, simulate(refs, frames, p, 5)])));
  const totals = $derived(Object.fromEntries(POLICIES.map((p) => [p, faults(runs[p]!)])));
  const shown = $derived(Math.min(t, refs.length));
  const faultsSoFar = (p: Policy) => runs[p]!.slice(0, shown).filter((s) => !s.hit).length;
  function setString(s: string) {
    which = s;
    t = 0;
  }
</script>

<Widget title="The replacement race" kind="Race" n="6.1" caption="Each column is memory with this many frames; each row is one reference. A tick is a hit; a coloured cell is a fault, with the page that was brought in. OPT evicts the page that will be used furthest in the future: unbeatable, and impossible to implement because it needs the future.">
  <div class="cfg ui">
    <div class="strs">{#each Object.keys(STRINGS) as s (s)}<button class:on={s === which} onclick={() => setString(s)}>{s}</button>{/each}</div>
    <label>Frames: <strong>{frames}</strong> <input type="range" min="1" max="6" bind:value={frames} /></label>
    <div class="step">
      <button onclick={() => (t = Math.max(0, t - 1))}>◀</button>
      <button class="primary" onclick={() => (t = Math.min(refs.length, t + 1))}>Next reference ▶</button>
      <button onclick={() => (t = refs.length)}>All</button>
      <button onclick={() => (t = 0)}>Reset</button>
    </div>
  </div>
  <div class="refs mono" aria-label="Reference string">
    {#each refs as r, i (i)}<span class:done={i < shown} class:now={i === shown - 1}>{r}</span>{/each}
  </div>
  <div class="cols">
    {#each POLICIES as p (p)}
      <div class="col" class:opt={p === 'opt'}>
        <h5 class="ui">{POLICY_NAMES[p]}</h5>
        <div class="steps mono">
          {#each runs[p]!.slice(Math.max(0, shown - 8), shown) as s, i (shown - Math.min(8, shown) + i)}
            <div class="st" class:hit={s.hit}>
              {#each s.frames as f, k (k)}<span class:new={!s.hit && f === s.page}>{f ?? '·'}</span>{/each}
              <em>{s.hit ? '✓' : s.evicted !== undefined ? `out ${s.evicted}` : 'fill'}</em>
            </div>
          {/each}
        </div>
        <p class="tot ui"><strong>{faultsSoFar(p)}</strong> faults so far · {totals[p]} in all</p>
      </div>
    {/each}
  </div>
</Widget>

<style>
  .cfg {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1.2rem;
    align-items: center;
    font-size: 0.84rem;
  }
  .strs,
  .step {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  button {
    font: inherit;
    font-size: 0.8rem;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    border-radius: 99px;
    padding: 0.15rem 0.7rem;
    cursor: pointer;
  }
  button.on,
  button.primary {
    background: var(--copper);
    border-color: var(--copper);
    color: var(--on-accent);
    font-weight: 600;
  }
  .refs {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin: 0.8rem 0;
    font-size: 0.85rem;
  }
  .refs span {
    width: 1.6rem;
    text-align: center;
    padding: 0.15rem 0;
    border-radius: 3px;
    background: var(--pn);
    color: var(--mute);
  }
  .refs span.done {
    color: var(--fg);
  }
  .refs span.now {
    background: var(--amber);
    color: var(--on-accent);
    font-weight: 700;
  }
  .cols {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 0.5rem;
  }
  @media (max-width: 720px) {
    .cols {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
  .col {
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 0.4rem;
    background: var(--panel);
  }
  .col.opt {
    border-style: dashed;
    border-color: var(--violet);
  }
  h5 {
    margin: 0 0 0.3rem;
    font-size: 0.78rem;
  }
  .steps {
    min-height: 13rem;
    font-size: 0.72rem;
  }
  .st {
    display: flex;
    gap: 2px;
    align-items: center;
    margin-bottom: 2px;
  }
  .st span {
    width: 1.2rem;
    text-align: center;
    background: var(--pn);
    border-radius: 2px;
  }
  .st span.new {
    background: color-mix(in srgb, var(--red) 55%, var(--panel));
    font-weight: 700;
  }
  .st em {
    font-style: normal;
    color: var(--mute);
    margin-left: 0.2rem;
    white-space: nowrap;
  }
  .st.hit em {
    color: var(--ok);
  }
  .tot {
    font-size: 0.76rem;
    margin: 0.3rem 0 0;
  }
</style>
