<!--
  Vue-style reactivity on ordinary objects. A Proxy records which effect read which property in one table; a write
  looks up that property and re-runs those effects. Do an action and watch which effects ran, and how the table is
  rebuilt as the effects run again and read again.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import { Reactivity, type DepEntry, type ReactiveEffect } from '$lib/rx/reactive';

  let { n, title = 'The dependency table', caption }: { n?: string | number; title?: string; caption?: string } = $props();

  interface State {
    count: number;
    user: { name: string; age: number; email?: string };
  }

  let r: Reactivity;
  let rs: State;
  let effects: ReactiveEffect[] = [];
  let table = $state.raw<DepEntry[]>([]);
  let ran = $state.raw<string[]>([]);
  let last = $state('');
  let runCounts = $state.raw<Record<string, number>>({});

  const EFFECTS: { label: string; reads: string; fn: (s: State) => void }[] = [
    { label: 'heading', reads: 'state.user.name', fn: (s) => void s.user.name },
    { label: 'summary', reads: 'state.user.name, state.user.age', fn: (s) => void (s.user.name, s.user.age) },
    { label: 'badge', reads: 'state.count > 5 ? state.user.age : 0', fn: (s) => void (s.count > 5 ? s.user.age : 0) },
    { label: 'fields', reads: 'Object.keys(state.user)', fn: (s) => void Object.keys(s.user) },
  ];

  const ACTIONS: { label: string; code: string; run: (s: State) => void }[] = [
    { label: 'Rename', code: "state.user.name = 'Grace'", run: (s) => (s.user.name = s.user.name === 'Ada' ? 'Grace' : 'Ada') },
    { label: 'Birthday', code: 'state.user.age++', run: (s) => void s.user.age++ },
    { label: 'Count + 1', code: 'state.count++', run: (s) => void s.count++ },
    { label: 'Add a property', code: "state.user.email = 'a@b.c'", run: (s) => (s.user.email = 'a@b.c') },
    { label: 'Delete it', code: 'delete state.user.email', run: (s) => delete s.user.email },
    { label: 'Replace the object', code: "state.user = { name: 'Edsger', age: 70 }", run: (s) => (s.user = { name: 'Edsger', age: 70 }) },
    { label: 'Write the same value', code: 'state.count = state.count', run: (s) => (s.count = s.count) },
  ];

  function reset() {
    r = new Reactivity({ debug: true });
    rs = r.reactive<State>({ count: 0, user: { name: 'Ada', age: 36 } }, 'state');
    effects = EFFECTS.map((e) => r.effect(() => e.fn(rs), e.label));
    ran = [];
    last = '';
    refresh();
  }
  function refresh() {
    table = r.snapshot();
    runCounts = Object.fromEntries(effects.map((e) => [e.label, e.runs]));
  }
  function act(i: number) {
    const before = { ...runCounts };
    ACTIONS[i]!.run(rs);
    refresh();
    ran = effects.filter((e) => e.runs > (before[e.label] ?? 0)).map((e) => e.label);
    last = ACTIONS[i]!.code;
  }
  reset();
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="Four effects read a reactive object. Write to it in different ways and see who is notified.">
  <div class="effects ui">
    {#each EFFECTS as e (e.label)}
      <div class="fx" class:ran={ran.includes(e.label)}>
        <b>{e.label}</b><code>{e.reads}</code><span class="runs">ran {runCounts[e.label] ?? 0}×</span>
      </div>
    {/each}
  </div>

  <div class="actions ui">
    {#each ACTIONS as a, i (a.label)}<Button size="sm" variant="primary" onclick={() => act(i)} title={a.code}>{a.label}</Button>{/each}
    <Button size="sm" variant="ghost" onclick={reset}>Reset</Button>
  </div>

  <p class="out ui" aria-live="polite">
    {#if last}<code>{last}</code> → {#if ran.length}re-ran <b>{ran.join(', ')}</b>{:else}<b>nothing ran</b>{/if}.{:else}Pick an action.{/if}
  </p>

  <table class="ui deps">
    <caption>The table: (object, property) → effects that read it</caption>
    <thead><tr><th>Object</th><th>Property</th><th>Subscribed effects</th></tr></thead>
    <tbody>
      {#each table as t (t.target + '.' + t.key)}
        <tr>
          <td><code>{t.target}</code></td>
          <td><code>{t.key}</code></td>
          <td>{#each t.effects as e (e)}<span class="chip" class:ran={ran.includes(e)}>{e}</span>{/each}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</Widget>

<style>
  .effects {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
    gap: 0.4rem;
    margin-bottom: 0.7rem;
  }
  .fx {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: baseline;
    gap: 0.5rem;
    border: 1px solid var(--line);
    border-radius: 7px;
    padding: 0.35rem 0.55rem;
    background: var(--panel);
    font-size: 0.82rem;
  }
  .fx.ran {
    border-color: var(--flash);
    box-shadow: inset 0 0 0 1px var(--flash);
    background: var(--flash-soft);
  }
  .fx code {
    font-size: 0.74rem;
    color: var(--ink-2);
    overflow-wrap: anywhere;
  }
  .runs {
    font-size: 0.72rem;
    color: var(--mute);
    white-space: nowrap;
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .out {
    margin: 0.6rem 0;
    font-size: 0.85rem;
    color: var(--ink-2);
  }
  .deps {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.82rem;
  }
  .deps caption {
    text-align: left;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--mute);
    padding-bottom: 0.3rem;
  }
  .deps th,
  .deps td {
    text-align: left;
    padding: 0.28rem 0.5rem;
    border-top: 1px solid var(--line);
  }
  .deps th {
    font-weight: 600;
    color: var(--ink-2);
  }
  .chip {
    display: inline-block;
    font-size: 0.76rem;
    border: 1px solid var(--effect);
    background: var(--effect-soft);
    border-radius: 999px;
    padding: 0 0.5rem;
    margin-right: 0.25rem;
  }
  .chip.ran {
    border-color: var(--flash);
    background: var(--flash-soft);
    font-weight: 700;
  }
</style>
