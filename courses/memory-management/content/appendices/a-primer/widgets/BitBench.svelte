<!--
  The bit bench: one 32-bit number as bits, grouped four by four under their hex digits. Click a bit to flip it,
  or type a number in decimal, hex (0x…) or binary (0b…). Below, the handful of bit tricks the course uses on
  addresses, each with its result; picking one highlights the bits it reads.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';

  const BITS = 32;
  const MASK = (1n << BigInt(BITS)) - 1n;
  let x = $state(0x12345678n);
  let text = $state('0x12345678');
  let bad = $state(false);
  let pick = $state(0);

  function parse(s: string): bigint | null {
    const t = s.trim().replace(/_/g, '').toLowerCase();
    if (!/^(0x[0-9a-f]+|0b[01]+|[0-9]+)$/.test(t)) return null;
    try {
      return BigInt(t);
    } catch {
      return null;
    }
  }
  function onText(s: string) {
    text = s;
    const v = parse(s);
    bad = v === null || v > MASK;
    if (!bad && v !== null) x = v;
  }
  function flip(i: number) {
    x = x ^ (1n << BigInt(i));
    text = hex(x);
    bad = false;
  }
  const hex = (v: bigint) => '0x' + v.toString(16);
  const dec = (v: bigint) => Number(v).toLocaleString('en-GB');

  interface Recipe {
    code: string;
    say: string;
    f: (v: bigint) => bigint;
    bits?: [number, number];
    yesno?: (r: bigint) => string;
  }
  const RECIPES: Recipe[] = [
    { code: 'x >> 12', say: 'the page number (4 KiB pages)', f: (v) => v >> 12n, bits: [12, 31] },
    { code: 'x & 0xfff', say: 'the offset inside the page', f: (v) => v & 0xfffn, bits: [0, 11] },
    { code: '(x >> 12) & 0x1ff', say: 'Sv39’s VPN[0]: nine bits, one of 512 entries', f: (v) => (v >> 12n) & 0x1ffn, bits: [12, 20] },
    { code: '(x >> 21) & 0x1ff', say: 'Sv39’s VPN[1]', f: (v) => (v >> 21n) & 0x1ffn, bits: [21, 29] },
    { code: 'x & 15', say: 'zero if x is a multiple of 16', f: (v) => v & 15n, bits: [0, 3], yesno: (r) => (r === 0n ? '16-byte aligned' : 'not aligned') },
    { code: '(x + 15) & ~15', say: 'x rounded up to a multiple of 16', f: (v) => (v + 15n) & ~15n & MASK, bits: [0, 3] },
    { code: 'x & ~15', say: 'a block header’s size, with the flag bits cleared (chapter 10)', f: (v) => v & ~15n & MASK, bits: [4, 31] },
    { code: 'x & 1', say: 'a block header’s “allocated” flag', f: (v) => v & 1n, bits: [0, 0] },
    { code: 'x & (x - 1)', say: 'x with its lowest 1 cleared: zero only for a power of two', f: (v) => (v === 0n ? 0n : v & (v - 1n)), yesno: (r) => (r === 0n && x !== 0n ? 'a power of two' : 'not a power of two') },
  ];
  const cur = $derived(RECIPES[pick]!);
  const result = $derived(cur.f(x));
  const lit = (i: number) => !!cur.bits && i >= cur.bits[0] && i <= cur.bits[1];
  const bitAt = (i: number) => (x >> BigInt(i)) & 1n;
</script>

<Widget title="The bit bench" kind="Play" n="A.1" caption="Click any bit to flip it, or type a number. Each hex digit is exactly the four bits above it. Pick a recipe to see which bits it reads.">
  <label class="in ui">Number <input class="mono" class:bad value={text} oninput={(e) => onText(e.currentTarget.value)} spellcheck="false" aria-invalid={bad} /></label>
  {#if bad}<p class="err ui">Type a whole number below 2³², in decimal, 0x hex or 0b binary.</p>{/if}
  <div class="row" role="group" aria-label="Bits 31 to 0">
    {#each Array.from({ length: BITS / 4 }, (_, k) => BITS / 4 - 1 - k) as nib (nib)}
      <div class="nib">
        <div class="bits">
          {#each [3, 2, 1, 0] as b (b)}
            {@const i = nib * 4 + b}
            <button class="bit mono" class:one={bitAt(i) === 1n} class:lit={lit(i)} onclick={() => flip(i)} aria-label="bit {i}: {bitAt(i)}" title="bit {i}, worth {(1n << BigInt(i)).toLocaleString('en-GB')}">{bitAt(i)}</button>
          {/each}
        </div>
        <div class="hx mono">{((x >> BigInt(nib * 4)) & 15n).toString(16)}</div>
        <div class="idx mono">{nib * 4 + 3}…{nib * 4}</div>
      </div>
    {/each}
  </div>
  <p class="vals ui"><span>decimal <b class="mono">{dec(x)}</b></span><span>hex <b class="mono">{hex(x)}</b></span></p>
  <div class="recipes ui" role="radiogroup" aria-label="Recipe">
    {#each RECIPES as r, i (r.code)}
      <button role="radio" aria-checked={pick === i} class:on={pick === i} class="mono" onclick={() => (pick = i)}>{r.code}</button>
    {/each}
  </div>
  <p class="out ui" aria-live="polite"><code>{cur.code}</code> = <b class="mono">{hex(result)}</b> ({dec(result)}): {cur.say}{cur.yesno ? `, so x is ${cur.yesno(result)}` : ''}.</p>
</Widget>

<style>
  .in {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.85rem;
  }
  input {
    font-size: 0.95rem;
    padding: 0.2rem 0.5rem;
    border: 1px solid var(--line-strong);
    border-radius: 5px;
    background: var(--panel);
    color: var(--fg);
    width: 13rem;
  }
  input.bad {
    border-color: var(--uaf);
  }
  .err {
    color: var(--uaf);
    font-size: 0.8rem;
    margin: 0.3rem 0 0;
  }
  .row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.45rem;
    margin: 0.8rem 0 0.4rem;
  }
  .nib {
    text-align: center;
  }
  .bits {
    display: flex;
    gap: 2px;
  }
  .bit {
    width: 1.35rem;
    height: 1.7rem;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--mute);
    border-radius: 3px;
    font-size: 0.85rem;
    cursor: pointer;
    padding: 0;
  }
  .bit.one {
    color: var(--fg);
    font-weight: 700;
    background: color-mix(in srgb, var(--copper) 22%, var(--panel));
  }
  .bit.lit {
    outline: 2px solid var(--violet);
    outline-offset: -1px;
  }
  .hx {
    font-size: 1rem;
    font-weight: 700;
    color: var(--copper);
    margin-top: 0.15rem;
  }
  .idx {
    font-size: 0.6rem;
    color: var(--mute);
  }
  .vals {
    display: flex;
    gap: 1.4rem;
    font-size: 0.85rem;
    margin: 0.3rem 0 0.7rem;
  }
  .recipes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
  }
  .recipes button {
    font-size: 0.78rem;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    color: var(--fg);
    border-radius: 99px;
    padding: 0.15rem 0.6rem;
    cursor: pointer;
  }
  .recipes button.on {
    background: var(--violet);
    border-color: var(--violet);
    color: var(--on-accent);
  }
  .out {
    font-size: 0.88rem;
    margin: 0.7rem 0 0;
    min-height: 2.6rem;
  }
</style>
