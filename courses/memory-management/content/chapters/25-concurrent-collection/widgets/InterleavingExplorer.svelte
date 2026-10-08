<!--
  The interleaving explorer: for each barrier and each small starting heap, try every interleaving of collector
  scans and program writes (up to three writes) and report whether any of them loses an object. For a barrier
  that fails, show the shortest losing interleaving.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { BARRIERS, SMALL_HEAPS, explore, type Step } from '$lib/mm/explore/tricolour';

  import { onMount } from 'svelte';
  import type { ExploreResult } from '$lib/mm/explore/tricolour';

  const NAMES = ['O0', 'O1', 'O2'];
  let results = $state<{ id: string; label: string; runs: ({ heap: string } & ExploreResult)[] }[]>([]);
  onMount(async () => {
    for (const [id, b] of Object.entries(BARRIERS)) {
      await new Promise((r) => setTimeout(r, 0));
      results = [...results, { id, label: b.label, runs: SMALL_HEAPS.map((h) => ({ heap: h.name, ...explore(h.model, b.fn) })) }];
    }
  });
  let open = $state<string | null>('none');

  const say = (s: Step) =>
    s.kind === 'scan' ? `the collector scans ${NAMES[s.o]}` : s.kind === 'write' ? `the program writes ${NAMES[s.holder]}.f${s.field} = ${s.value === null ? 'null' : NAMES[s.value]}` : `the program writes r${s.r + 1} = ${s.value === null ? 'null' : NAMES[s.value]}`;
</script>

<Widget title="Every interleaving" kind="Explore" n="25.2" caption="Each starting heap has three objects with two pointer fields and one root pointing to O0. The explorer tries every order of collector scans and up to three program writes, breadth first, and stops at the first lost object.">
  <div class="table-scroll">
    <table class="ui">
      <thead><tr><th>Barrier</th>{#each SMALL_HEAPS as h (h.name)}<th>{h.name}</th>{/each}</tr></thead>
      <tbody>
        {#each results as r (r.id)}
          <tr class:sel={open === r.id}>
            <th scope="row"><button class="link" onclick={() => (open = open === r.id ? null : r.id)}>{r.label}</button></th>
            {#each r.runs as run (run.heap)}
              <td class:bad={!!run.counterexample}>{run.counterexample ? '✗ loses an object' : '✓ safe'} <span class="mute">({run.states.toLocaleString('en-GB')} states)</span></td>
            {/each}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  {#if open}
    {@const r = results.find((x) => x.id === open)}
    {@const bad = r?.runs.find((x) => x.counterexample)}
    {#if r}<div class="detail ui">
      {#if bad}
        <p><strong>{r.label}, starting from {bad.heap}:</strong> the shortest interleaving that loses an object.</p>
        <ol>
          {#each bad.counterexample!.steps as s, i (i)}<li>{say(s)}</li>{/each}
          <li>no object is grey, so the collector finishes; {bad.counterexample!.lost.map((o) => NAMES[o]).join(', ')} is still white but reachable, and would be freed.</li>
        </ol>
      {:else}
        <p><strong>{r.label}:</strong> no interleaving of up to three writes loses an object on any of these heaps.</p>
      {/if}
    </div>{/if}
  {/if}
  {#if results.length < Object.keys(BARRIERS).length}<p class="mute ui">Exploring…</p>{/if}
</Widget>

<style>
  .table-scroll {
    overflow-x: auto;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.82rem;
  }
  th,
  td {
    padding: 0.35rem 0.5rem;
    border-bottom: 1px solid var(--line);
    text-align: left;
    white-space: nowrap;
  }
  td {
    color: var(--green);
  }
  td.bad {
    color: var(--uaf);
    font-weight: 600;
  }
  .mute {
    color: var(--mute);
    font-weight: 400;
    font-size: 0.74rem;
  }
  tr.sel th {
    color: var(--copper);
  }
  .link {
    font: inherit;
    font-weight: 600;
    border: 0;
    background: none;
    color: inherit;
    cursor: pointer;
    padding: 0;
    text-decoration: underline dotted;
  }
  .detail {
    margin-top: 0.8rem;
    font-size: 0.86rem;
    padding: 0.6rem 0.8rem;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 6px;
  }
  .detail p {
    margin: 0 0 0.3rem;
  }
  .detail ol {
    margin: 0;
    padding-left: 1.3rem;
  }
</style>
