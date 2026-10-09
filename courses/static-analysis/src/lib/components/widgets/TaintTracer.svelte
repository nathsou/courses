<!--
  Taint analysis on an Express module, one kind of vulnerability at a time: the flows from request data to sinks,
  each with the path that explains it, statement by statement, across functions. `:::taint-tracer{rules="sql,xss"}`
  with a ```js block.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import CodeEditor from '$lib/editor/CodeEditor.svelte';
  import { analyseSource, RULES, type Flow } from '$lib/sa/taint/taint';

  let {
    code,
    rules = 'sql,xss,command,path,ssrf',
    initial,
    n,
    caption,
    title = 'Taint tracer',
    subtitle = 'Each flow is a path from request data to a sink. Click a step to find it in the code.',
  }: { code: string; rules?: string; initial?: string; n?: string; caption?: string; title?: string; subtitle?: string } = $props();

  const keys = $derived(rules.split(',').map((s) => s.trim()).filter((k) => k in RULES));
  // svelte-ignore state_referenced_locally
  let rule = $state(initial ?? rules.split(',')[0]!.trim());
  // svelte-ignore state_referenced_locally
  let source = $state(code);
  let selected = $state(0);
  let picked = $state<[number, number] | null>(null);

  const counts = $derived(Object.fromEntries(keys.map((k) => [k, analyseSource(source, RULES[k]!.config).length])));
  const flows = $derived<Flow[]>(RULES[rule] ? analyseSource(source, RULES[rule]!.config) : []);
  const flow = $derived(flows[Math.min(selected, flows.length - 1)]);
  const lineOf = (offset: number) => source.slice(0, offset).split('\n').length;
  const KIND: Record<string, string> = { start: 'starts', normal: '', call: 'into the call', return: 'back from the call', 'call-to-return': 'past the call' };
</script>

<Widget {title} {subtitle} {n} {caption} onreset={() => { source = code; selected = 0; picked = null; rule = initial ?? keys[0]!; }}>
  <div class="tt">
    <CodeEditor value={source} lang="js" minLines={10} label="Express module" onchange={(c) => { source = c; selected = 0; picked = null; }} highlight={picked ? { from: picked[0], to: picked[1] } : null} />
    <div class="ui">
      <div class="tabs" role="tablist" aria-label="Vulnerability">
        {#each keys as k (k)}<button role="tab" aria-selected={k === rule} class:on={k === rule} onclick={() => { rule = k; selected = 0; picked = null; }}>{RULES[k]!.title} <span class="count">{counts[k]}</span></button>{/each}
      </div>
      {#if !flows.length}
        <p class="ok">No request data reaches {RULES[rule]?.sink ?? 'a sink'} without a sanitizer or a validation.</p>
      {:else}
        <ul class="flows">
          {#each flows as f, i (i)}
            <li>
              <button class:on={i === selected} onclick={() => { selected = i; picked = f.call; }}>
                ⚠ line {lineOf(f.call[0])}: <code>{source.slice(f.argument[0], f.argument[1])}</code> reaches {RULES[rule]!.sink} in <code>{f.fn}</code>
              </button>
            </li>
          {/each}
        </ul>
        {#if flow}
          <ol class="steps">
            {#each flow.steps as s, i (i)}
              <li class={s.kind}>
                <button class="step" onclick={() => (picked = s.range ?? null)}>
                  <span class="where">{s.fn}{s.line ? `, line ${s.line}` : ''}</span>
                  <code>{s.text}</code>
                </button>
                <span class="fact">{i === 0 ? 'the source is read here' : s.kind === 'call' ? `tainted ${s.fact} enters the function` : s.kind === 'return' ? `the tainted result comes back as ${s.fact}` : `tainted: ${s.fact === '<ret>' ? 'the return value' : s.fact}`}{KIND[s.kind] && i > 0 && s.kind !== 'call' && s.kind !== 'return' ? ` (${KIND[s.kind]})` : ''}</span>
              </li>
            {/each}
          </ol>
        {/if}
      {/if}
    </div>
  </div>
</Widget>

<style>
  .tt {
    display: grid;
    gap: 0.7rem;
  }
  .tt > :global(*) {
    min-width: 0;
  }
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .tabs button {
    font: inherit;
    font-size: 0.8rem;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 999px;
    padding: 0.15rem 0.7rem;
    cursor: pointer;
  }
  .tabs button.on {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-fg, #fff);
  }
  .count {
    display: inline-block;
    min-width: 1.2em;
    font-size: 0.72rem;
    border-radius: 999px;
    padding: 0 0.3rem;
    background: color-mix(in srgb, var(--bad) 18%, transparent);
  }
  .flows {
    list-style: none;
    padding: 0;
    margin: 0.6rem 0;
    display: grid;
    gap: 0.25rem;
  }
  .flows button {
    font: inherit;
    font-size: 0.85rem;
    text-align: left;
    width: 100%;
    background: none;
    border: 1px solid var(--line);
    border-radius: 6px;
    padding: 0.3rem 0.5rem;
    color: var(--bad);
    cursor: pointer;
  }
  .flows button.on {
    border-color: var(--bad);
    background: color-mix(in srgb, var(--bad) 7%, transparent);
  }
  .steps {
    margin: 0.4rem 0;
    padding-left: 1.4rem;
    display: grid;
    gap: 0.35rem;
    font-size: 0.84rem;
  }
  .step {
    font: inherit;
    background: none;
    border: 0;
    padding: 0;
    text-align: left;
    cursor: pointer;
    color: inherit;
    display: block;
  }
  .where {
    display: block;
    font-size: 0.74rem;
    color: var(--ink-2);
  }
  .steps code {
    overflow-wrap: anywhere;
  }
  .fact {
    display: block;
    font-size: 0.78rem;
    color: var(--maybe);
  }
  .steps li.call .fact,
  .steps li.return .fact {
    color: var(--accent-ink, var(--accent));
  }
  .ok {
    color: var(--ok);
    font-size: 0.86rem;
  }
</style>
