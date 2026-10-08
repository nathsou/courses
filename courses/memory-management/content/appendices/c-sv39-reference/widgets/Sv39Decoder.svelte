<!--
  The Sv39 decoder: paste a virtual address and see its three VPN fields and offset; paste a page-table entry
  and see its PPN and flags, and what kind of entry it is.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { splitVa, FLAG_NAMES, PTE } from '$lib/mm/machine/sv39';

  let vaText = $state('0x3f_8040_1a48');
  let pteText = $state('0x8001_04d7');

  const num = (s: string): number | null => {
    const t = s.trim().replace(/_/g, '').toLowerCase();
    if (!/^(0x[0-9a-f]+|[0-9]+)$/.test(t)) return null;
    const v = Number(t);
    return Number.isSafeInteger(v) ? v : null;
  };
  const hex = (v: number, w = 0) => '0x' + v.toString(16).padStart(w, '0');

  const va = $derived(num(vaText));
  const parts = $derived(va === null ? null : splitVa(va));

  const pte = $derived(num(pteText));
  const ppn = $derived(pte === null ? 0 : Math.floor(pte / 1024));
  const flags = $derived(pte === null ? 0 : pte % 256);
  const rsw = $derived(pte === null ? 0 : Math.floor(pte / 256) % 4);
  const on = (f: keyof typeof PTE) => (flags & PTE[f]) !== 0;
  const kind = $derived.by(() => {
    if (pte === null) return '';
    if (!on('V')) return 'Invalid (V = 0): any access through it faults. The other 63 bits are free for the kernel to use.';
    if (on('W') && !on('R')) return 'Reserved: W without R. Any access through it faults.';
    if (!on('R') && !on('W') && !on('X')) return `A pointer to the next-level table, in frame ${hex(ppn)} (physical address ${hex(ppn * 4096)}).`;
    const perms = [on('R') && 'read', on('W') && 'write', on('X') && 'execute'].filter(Boolean).join(', ');
    return `A leaf mapping frame ${hex(ppn)} (physical address ${hex(ppn * 4096)}): ${perms}${on('U') ? ', user' : ', supervisor only'}${on('G') ? ', global' : ''}. ${on('A') ? 'Accessed' : 'Not yet accessed'}, ${on('D') ? 'dirty' : 'clean'}.`;
  });
</script>

<Widget title="Sv39 decoder" kind="Tool" n="C.1" caption="Type a virtual address or a page-table entry, in hex or decimal. Underscores are ignored.">
  <div class="cols">
    <section>
      <label class="ui">Virtual address <input class="mono" bind:value={vaText} spellcheck="false" aria-invalid={va === null} /></label>
      {#if parts}
        <table class="mono">
          <thead><tr><th>VPN[2]</th><th>VPN[1]</th><th>VPN[0]</th><th>offset</th></tr></thead>
          <tbody>
            <tr><td>{parts.vpn[2]}</td><td>{parts.vpn[1]}</td><td>{parts.vpn[0]}</td><td>{hex(parts.offset, 3)}</td></tr>
            <tr class="sub"><td>bits 38–30</td><td>29–21</td><td>20–12</td><td>11–0</td></tr>
          </tbody>
        </table>
        <p class="ui note">{parts.canonical ? `Entry ${parts.vpn[2]} of the root table, then entry ${parts.vpn[1]}, then entry ${parts.vpn[0]}; byte ${parts.offset} of the page.` : 'Not a lower-half Sv39 address: bits 63–39 must equal bit 38, and this tool takes addresses below 2³⁸.'}</p>
      {:else}<p class="ui bad">Type a whole number.</p>{/if}
    </section>
    <section>
      <label class="ui">Page-table entry <input class="mono" bind:value={pteText} spellcheck="false" aria-invalid={pte === null} /></label>
      {#if pte !== null}
        <div class="flags mono" aria-label="Flags">
          <span class="ppn">PPN {hex(ppn)}</span><span class="rsw" title="Reserved for software">RSW {rsw.toString(2).padStart(2, '0')}</span>
          {#each [...FLAG_NAMES].reverse() as f (f)}<span class="flag" class:on={on(f)}>{f}</span>{/each}
        </div>
        <p class="ui note">{kind}</p>
      {:else}<p class="ui bad">Type a whole number.</p>{/if}
    </section>
  </div>
</Widget>

<style>
  .cols {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
    gap: 1.2rem;
  }
  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.8rem;
    font-weight: 600;
  }
  input {
    font-size: 0.95rem;
    padding: 0.2rem 0.5rem;
    border: 1px solid var(--line-strong);
    border-radius: 5px;
    background: var(--panel);
    color: var(--fg);
  }
  input[aria-invalid='true'] {
    border-color: var(--uaf);
  }
  table {
    border-collapse: collapse;
    margin-top: 0.6rem;
    font-size: 0.9rem;
    width: 100%;
  }
  th,
  td {
    border: 1px solid var(--line);
    padding: 0.2rem 0.4rem;
    text-align: center;
  }
  th {
    font-size: 0.72rem;
    color: var(--copper);
  }
  tr.sub td {
    font-size: 0.66rem;
    color: var(--mute);
  }
  .flags {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin-top: 0.6rem;
    font-size: 0.82rem;
  }
  .flags span {
    border: 1px solid var(--line-strong);
    border-radius: 3px;
    padding: 0.1rem 0.35rem;
  }
  .ppn {
    background: color-mix(in srgb, var(--copper) 18%, var(--panel));
  }
  .rsw {
    color: var(--mute);
  }
  .flag {
    color: var(--mute);
    width: 1.5rem;
    text-align: center;
  }
  .flag.on {
    color: var(--on-accent);
    background: var(--violet);
    border-color: var(--violet);
    font-weight: 700;
  }
  .note {
    font-size: 0.84rem;
    margin: 0.5rem 0 0;
  }
  .bad {
    color: var(--uaf);
    font-size: 0.82rem;
  }
</style>
