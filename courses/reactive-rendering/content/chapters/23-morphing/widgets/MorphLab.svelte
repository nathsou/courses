<!--
  HTML over the wire. The server renders a new page after something happens; the browser must show it. Replacing the
  old page with `innerHTML` is simple and throws the page's own state away: typed text, focus, a ticked box. Morphing
  makes the old DOM look like the new HTML and keeps nodes that match. Type in the search box and tick the box first,
  then let the server "send" an update both ways.
-->
<script lang="ts">
  import { untrack } from 'svelte';
  import Widget from '$lib/components/ui/Widget.svelte';
  import Button from '$lib/components/ui/Button.svelte';
  import Segmented from '$lib/components/ui/Segmented.svelte';
  import LensPane from '$lib/components/lens/LensPane.svelte';
  import { Lens } from '$lib/components/lens/lens.svelte';
  import { createDocument, type MElement } from '$lib/rx/dom';
  import { morph } from '$lib/rx/morph';

  let { n, title = 'The server sends a new page', caption, how: initial = 'morph' }: { n?: string | number; title?: string; caption?: string; how?: string } = $props();

  interface Msg { id: number; from: string; subject: string; unread: boolean }
  const FROMS = ['Ada', 'Grace', 'Edsger', 'Barbara', 'Donald', 'Margaret'];
  const SUBJECTS = ['Lunch?', 'Review request', 'Build is green', 'Draft attached', 'Re: schedule', 'Quick question'];

  let how = $state<'morph' | 'innerHTML'>(initial === 'innerHTML' ? 'innerHTML' : 'morph');
  let preserveFields = $state(false);
  let msgs: Msg[] = [];
  let nextId = 1;
  let lens = $state.raw<Lens | null>(null);
  let root = $state.raw<MElement | null>(null);
  let doc: ReturnType<typeof createDocument>;
  let host: MElement;
  let result = $state<{ action: string; q: { before: string; after: string } | null; checked: { before: boolean; after: boolean } | null; focus: { before: boolean; after: boolean } | null; sameNodes: number; total: number } | null>(null);

  const page = () =>
    `<div id="app"><h3 id="title">Inbox (${msgs.filter((m) => m.unread).length} unread)</h3>` +
    `<input id="q" placeholder="Search"><label><input type="checkbox" id="urgent"> only urgent</label>` +
    `<ul id="list">${msgs.map((m) => `<li id="m${m.id}"${m.unread ? ' class="unread"' : ''}><b>${m.from}</b>: ${m.subject}</li>`).join('')}</ul></div>`;

  function reset() {
    lens?.destroy();
    doc = createDocument();
    host = doc.createElement('div');
    doc.body.appendChild(host);
    nextId = 1;
    msgs = Array.from({ length: 3 }, () => fresh());
    host.innerHTML = page();
    lens = new Lens(doc);
    root = host;
    result = null;
  }
  const fresh = (): Msg => {
    const id = nextId++;
    return { id, from: FROMS[id % FROMS.length]!, subject: SUBJECTS[(id * 2) % SUBJECTS.length]!, unread: true };
  };
  reset();
  $effect(() => {
    how;
    untrack(reset);
  });

  const ACTIONS: { label: string; run: () => void }[] = [
    { label: 'A message arrives', run: () => void msgs.unshift(fresh()) },
    { label: 'Mark the first as read', run: () => void (msgs[0] && (msgs[0].unread = false)) },
    { label: 'Reverse the order', run: () => void msgs.reverse() },
    { label: 'Delete the last', run: () => void msgs.pop() },
  ];

  function apply(i: number) {
    const q = host.querySelector('#q') as MElement | null;
    const urgent = host.querySelector('#urgent') as MElement | null;
    const nodes = [...host.querySelectorAll('*')];
    const before = { q: q?.value ?? '', checked: !!urgent?.checked, focus: !!q && doc.activeElement === q };
    ACTIONS[i]!.run();
    const html = page();
    lens!.act(() => {
      if (how === 'morph') morph(host, html, { preserve: preserveFields ? (el) => ['q', 'urgent'].includes(el.getAttribute('id') ?? '') : undefined });
      else host.innerHTML = html;
    });
    const q2 = host.querySelector('#q') as MElement | null;
    const urgent2 = host.querySelector('#urgent') as MElement | null;
    const now = [...host.querySelectorAll('*')];
    result = {
      action: ACTIONS[i]!.label,
      q: before.q ? { before: before.q, after: q2?.value ?? '' } : null,
      checked: before.checked ? { before: true, after: !!urgent2?.checked } : null,
      focus: before.focus ? { before: true, after: !!q2 && doc.activeElement === q2 } : null,
      sameNodes: now.filter((x) => nodes.includes(x)).length,
      total: now.length,
    };
  }
</script>

<Widget {title} {n} {caption} kind="Experiment" subtitle="Type in the search box, tick the box, then click back into the search box. Now let the server send an update. How much of what you did survives?">
  {#snippet controls()}
    <Segmented label="The browser applies the new HTML with" bind:value={how} options={[{ value: 'morph', label: 'Morphing' }, { value: 'innerHTML', label: 'innerHTML' }]} />
  {/snippet}

  {#if how === 'morph'}
    <label class="pres ui"><input type="checkbox" bind:checked={preserveFields} /> Mark the two form fields as preserved <span>(<code>hx-preserve</code>, <code>data-turbo-permanent</code>)</span></label>
  {/if}

  <div class="actions ui">
    {#each ACTIONS as a, i (a.label)}<Button size="sm" variant="primary" onmousedown={(e: MouseEvent) => e.preventDefault()} onclick={() => apply(i)}>{a.label}</Button>{/each}
    <Button size="sm" variant="ghost" onclick={reset}>Reset</Button>
  </div>

  {#if lens && root}<LensPane {lens} {root} title="The page" note="Do something in the page first, then press an action." />{/if}

  {#if result}
    <ul class="checks ui" aria-live="polite">
      <li class:bad={result.q && result.q.after !== result.q.before} class:na={!result.q}>
        Text typed in the search box: {#if result.q}{result.q.after === result.q.before ? `kept (“${result.q.after}”)` : `lost (“${result.q.before}” → “${result.q.after}”)`}{:else}type something first{/if}
      </li>
      <li class:bad={result.checked && !result.checked.after} class:na={!result.checked}>
        Ticked box: {#if result.checked}{result.checked.after ? 'kept' : 'lost'}{:else}tick it first{/if}
      </li>
      <li class:bad={result.focus && !result.focus.after} class:na={!result.focus}>
        Focus in the search box: {#if result.focus}{result.focus.after ? 'kept' : 'lost: the focused node was thrown away'}{:else}click into the search box first{/if}
      </li>
      <li>Elements that are still the same objects: <b>{result.sameNodes}</b> of {result.total}</li>
    </ul>
  {/if}
</Widget>

<style>
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    margin-bottom: 0.7rem;
  }
  .pres {
    display: block;
    font-size: 0.84rem;
    margin: 0 0 0.6rem;
  }
  .pres span {
    color: var(--ink-2);
  }
  .checks {
    list-style: none;
    margin: 0.8rem 0 0;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--panel);
    font-size: 0.86rem;
    display: grid;
    gap: 0.2rem;
  }
  .checks li::before {
    content: '✓ ';
    color: var(--signal);
    font-weight: 700;
  }
  .checks li.bad {
    color: var(--red);
  }
  .checks li.bad::before {
    content: '✗ ';
    color: var(--red);
  }
  .checks li.na {
    color: var(--mute);
  }
  .checks li.na::before {
    content: '· ';
    color: var(--mute);
  }
</style>
