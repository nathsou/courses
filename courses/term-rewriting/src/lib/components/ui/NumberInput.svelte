<!--
  A labelled integer input that accepts arbitrarily large numbers (as text), with commas, spaces and
  underscores ignored. `value` is the raw text; `parsed` is a bigint or null when the text is not an integer
  within [min, max].
-->
<script lang="ts">
  let {
    value = $bindable(''),
    label,
    min,
    max,
    width = '12ch',
    onenter,
    parsed = $bindable<bigint | null>(null),
  }: {
    value?: string;
    label: string;
    min?: bigint;
    max?: bigint;
    width?: string;
    onenter?: () => void;
    parsed?: bigint | null;
  } = $props();

  const id = $props.id();

  export function parse(text: string): bigint | null {
    const t = text.replace(/[\s,_]/g, '');
    if (!/^-?\d+$/.test(t)) return null;
    const v = BigInt(t);
    if (min !== undefined && v < min) return null;
    if (max !== undefined && v > max) return null;
    return v;
  }

  $effect(() => {
    parsed = parse(value);
  });
  const invalid = $derived(value.trim() !== '' && parsed === null);
</script>

<label class="num-input ui" for={id}>
  <span class="lbl">{label}</span>
  <input
    {id}
    type="text"
    inputmode="numeric"
    autocomplete="off"
    spellcheck="false"
    bind:value
    style:width
    aria-invalid={invalid}
    onkeydown={(e) => {
      if (e.key === 'Enter') onenter?.();
    }}
  />
</label>

<style>
  .num-input {
    display: inline-flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.8rem;
    color: var(--ink-2);
  }
  .lbl {
    font-weight: 500;
  }
  input {
    font-family: var(--font-mono);
    font-size: 0.92rem;
    padding: 0.3rem 0.55rem;
    border: 1px solid var(--line-strong);
    border-radius: var(--radius-sm);
    background: var(--bg);
    color: var(--ink);
    max-width: 100%;
  }
  input[aria-invalid='true'] {
    border-color: var(--bad);
    background: var(--bad-soft);
  }
</style>
