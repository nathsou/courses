<!--
  Be the MMU: translate virtual addresses by hand through real Sv39 page tables in simulated physical memory.
  At each level, pick the entry the address's VPN bits select (or declare it invalid); at the leaf, decide whether
  the access is allowed; then compose the physical address. The machine's own walk checks every answer.
  "Flip a bit" re-enacts Rowhammer's page-table attack: one PPN bit flipped in a leaf entry.
-->
<script lang="ts">
  import Widget from '$lib/components/ui/Widget.svelte';
  import { PhysicalMemory, PAGE_SIZE } from '$lib/mm/machine/phys';
  import { PageTableBuilder, PTE, walk, splitVa, decodePte, encodePte, flagString, isLeaf, has, type Access, LEVEL_NAME } from '$lib/mm/machine/sv39';
  import { hex, bin } from '$lib/mm/util/format';
  import { progress } from '$lib/state/progress.svelte';

  // ── A hand-made address space ──
  const mem = new PhysicalMemory(4096);
  let nextTable = 2;
  const pt = new PageTableBuilder(mem, 1, () => nextTable++);
  const U = PTE.U | PTE.A | PTE.D;
  pt.map(0x1_0000, 0x40, PTE.R | PTE.X | U); // .text
  pt.map(0x1_1000, 0x41, PTE.R | PTE.X | U);
  pt.map(0x1_2000, 0x45, PTE.R | PTE.W | U); // .data
  pt.map(0x1_4000, 0x43, PTE.R | PTE.W | U); // heap
  pt.map(0x1_5000, 0x44, PTE.R | PTE.W | U);
  pt.map(0x3f_ffff_e000, 0x60, PTE.R | PTE.W | U); // stack
  pt.map(0x20_0000, 0x70, PTE.R | PTE.W | PTE.A | PTE.D); // a supervisor page
  pt.map(0x4000_0000, 0x400, PTE.R | U, 1); // a 2 MiB megapage
  const NAMES: [number, string][] = [
    [0x1_0000, '.text'],
    [0x1_1000, '.text'],
    [0x1_2000, '.data'],
    [0x1_4000, 'heap'],
    [0x1_5000, 'heap'],
    [0x3f_ffff_e000, 'stack'],
    [0x20_0000, 'kernel data'],
    [0x4000_0000, 'megapage'],
  ];

  interface Puzzle {
    va: number;
    access: Access;
    note: string;
  }
  const PUZZLES: Puzzle[] = [
    { va: 0x1_4018, access: 'r', note: 'A load from the heap.' },
    { va: 0x1_0120, access: 'w', note: 'A store into the program’s own code.' },
    { va: 0x3f_ffff_eff8, access: 'w', note: 'A store to the top of the stack.' },
    { va: 0x20_0010, access: 'r', note: 'User code reads a kernel page.' },
    { va: 0x1_3008, access: 'r', note: 'A load from a page nobody mapped.' },
    { va: 0x4012_3456, access: 'r', note: 'A load from inside a 2 MiB megapage.' },
    { va: 0x1_1404, access: 'x', note: 'Fetching an instruction.' },
  ];
  let pi = $state(0);
  let random = $state<Puzzle | null>(null);
  const puzzle = $derived(random ?? PUZZLES[pi]!);
  const parts = $derived(splitVa(puzzle.va));
  const truth = $derived(walk(mem, 1, puzzle.va, { access: puzzle.access, user: true, update: false }));

  type Stage = { k: 'level'; level: number; table: number } | { k: 'perm' } | { k: 'pa' } | { k: 'done'; ok: boolean; text: string };
  let stage = $state<Stage>({ k: 'level', level: 2, table: 1 });
  let chosen = $state<{ level: number; index: number; raw: number }[]>([]);
  let feedback = $state('');
  let paText = $state('');
  let score = $state(0);
  let streak = $state(0);
  let flipped = $state(false);

  function restart() {
    stage = { k: 'level', level: 2, table: 1 };
    chosen = [];
    feedback = '';
    paText = '';
  }
  function nextPuzzle() {
    if (random || pi === PUZZLES.length - 1) {
      // Random puzzles from the mapped pages (and the occasional unmapped one).
      const [base] = NAMES[Math.floor(Math.random() * NAMES.length)]!;
      const off = Math.floor(Math.random() * 512) * 8;
      const access = (['r', 'w', 'x'] as Access[])[Math.floor(Math.random() * 3)]!;
      random = { va: Math.random() < 0.15 ? base + 0x8000 + off : base + off, access, note: 'A random access.' };
    } else pi++;
    restart();
  }

  function entries(table: number): { index: number; raw: number }[] {
    const out: { index: number; raw: number }[] = [];
    for (let i = 0; i < 512; i++) {
      const raw = mem.load64(table * PAGE_SIZE + i * 8);
      if (raw % 2) out.push({ index: i, raw });
    }
    return out;
  }
  const current = $derived(stage.k === 'level' ? entries(stage.table) : []);

  function pick(index: number | 'invalid') {
    if (stage.k !== 'level') return;
    const want = parts.vpn[stage.level]!;
    const raw = mem.load64(stage.table * PAGE_SIZE + want * 8);
    if (index === 'invalid') {
      if (raw % 2) {
        feedback = `Entry ${want} is valid: look again for index ${want}.`;
        miss();
        return;
      }
      finish(true, `Right: entry ${want} of the level-${stage.level} table is not valid (V = 0). The MMU raises a page fault (cause ${truth.fault?.cause}), and the kernel decides what to do.`);
      return;
    }
    if (index !== want) {
      feedback = `That is entry ${index}, but VPN[${stage.level}] is ${want}: the ${['lowest', 'middle', 'top'][stage.level]} nine bits of the page number.`;
      miss();
      return;
    }
    feedback = '';
    chosen = [...chosen, { level: stage.level, index, raw }];
    const pte = decodePte(raw);
    if (isLeaf(pte.flags)) stage = { k: 'perm' };
    else stage = { k: 'level', level: stage.level - 1, table: pte.ppn };
  }
  function judge(answer: 'ok' | 'U' | 'R' | 'W' | 'X') {
    const leaf = decodePte(chosen.at(-1)!.raw);
    const f = leaf.flags;
    const right = !has(f, 'U') ? 'U' : puzzle.access === 'r' && !has(f, 'R') ? 'R' : puzzle.access === 'w' && !has(f, 'W') ? 'W' : puzzle.access === 'x' && !has(f, 'X') ? 'X' : 'ok';
    if (answer !== right) {
      feedback = right === 'ok' ? `The leaf allows it: U is set, and the access needs ${puzzle.access.toUpperCase()}, which is set.` : `Look at the flags: ${flagString(f)}. ${right === 'U' ? 'U = 0: a supervisor page.' : `${right} = 0, and this access needs it.`}`;
      miss();
      return;
    }
    feedback = '';
    if (right !== 'ok') finish(true, `Right: page fault (cause ${truth.fault?.cause}, ${truth.fault?.name}). ${truth.fault?.reason}.`);
    else stage = { k: 'pa' };
  }
  function checkPa() {
    const v = parseInt(paText.replace(/^0x/i, ''), 16);
    if (v === truth.pa) finish(true, `Right: ${hex(truth.pa!)}. Three memory reads to find it; the TLB (next chapter) remembers it so the next access needs none.`);
    else {
      feedback = Number.isFinite(v) ? `Not quite: the frame number times 4096 (0x1000), plus the offset. ${chosen.length < 3 ? `This is a ${LEVEL_NAME[chosen.at(-1)!.level]}: the offset is the low ${12 + 9 * chosen.at(-1)!.level} bits.` : ''}` : 'Type the address in hexadecimal.';
      miss();
    }
  }
  function miss() {
    streak = 0;
  }
  function finish(ok: boolean, text: string) {
    stage = { k: 'done', ok, text };
    if (ok) {
      score++;
      streak++;
      if (streak >= 3) progress.markSolved('virtual-memory/be-the-mmu');
    }
  }

  function flipBit() {
    // Rowhammer-style: flip PPN bit 6 in the heap page's leaf: 0x43 becomes 0x03, the level-0 table that holds
    // this very entry.
    const at = pt.leafAddr(0x1_4000)!;
    const pte = decodePte(mem.load64(at));
    mem.store64(at, encodePte(pte.ppn ^ 0x40, pte.flags));
    flipped = !flipped;
    restart();
  }
  const vaBits = $derived(bin(puzzle.va, 39));
  const acc = { r: 'load (read)', w: 'store (write)', x: 'instruction fetch' };
</script>

<Widget title="Be the MMU" kind="Game" n="3.1" caption="Real Sv39 page tables, stored in simulated physical memory as 64-bit entries. Only valid entries are listed; the other ones in each 512-entry table are zero. Your answers are checked against the simulator’s own page walk.">
  <div class="top ui">
    <div class="task">
      <span class="label-caps">Translate</span>
      <span class="va mono">{hex(puzzle.va)}</span>
      <span class="acc">{acc[puzzle.access]} in user mode</span>
      <span class="note">{puzzle.note}</span>
    </div>
    <div class="score"><span>score <strong>{score}</strong></span><span>streak <strong>{streak}</strong></span></div>
  </div>

  <div class="bits mono" aria-label="The address in binary">
    <span class="b v2" class:act={stage.k === 'level' && stage.level === 2}>{vaBits.slice(0, 9)}</span><span class="b v1" class:act={stage.k === 'level' && stage.level === 1}>{vaBits.slice(9, 18)}</span><span class="b v0" class:act={stage.k === 'level' && stage.level === 0}>{vaBits.slice(18, 27)}</span><span class="b off" class:act={stage.k === 'pa'}>{vaBits.slice(27)}</span>
  </div>
  <div class="bits-l mono">
    <span class="v2">VPN[2] = {parts.vpn[2]}</span><span class="v1">VPN[1] = {parts.vpn[1]}</span><span class="v0">VPN[0] = {parts.vpn[0]}</span><span class="off">offset = {hex(parts.offset)}</span>
  </div>

  <div class="trail mono">
    <span class="satp">satp → root table, frame {hex(1)}</span>
    {#each chosen as c (c.level)}
      {@const p = decodePte(c.raw)}
      <span class="arrow">→</span><span class="step">L{c.level}[{c.index}] = PPN {hex(p.ppn)} {flagString(p.flags)}</span>
    {/each}
  </div>

  <div class="panel ui">
    {#if stage.k === 'level'}
      <p class="q">Level {stage.level} table at physical address <span class="mono">{hex(stage.table * PAGE_SIZE)}</span>. Which entry does VPN[{stage.level}] select?</p>
      <ul class="entries mono">
        {#each current as e (e.index)}
          {@const p = decodePte(e.raw)}
          <li><button onclick={() => pick(e.index)}><span class="ix">[{e.index}]</span> PPN {hex(p.ppn)} <span class="fl">{flagString(p.flags)}</span> <span class="kind">{isLeaf(p.flags) ? 'leaf' : '→ next table'}</span></button></li>
        {/each}
        <li class="rest">… {512 - current.length} entries are 0 (invalid)</li>
      </ul>
      <button class="invalid" onclick={() => pick('invalid')}>The entry I need is not listed: it is invalid</button>
    {:else if stage.k === 'perm'}
      {@const leaf = decodePte(chosen.at(-1)!.raw)}
      <p class="q">A leaf: flags <span class="mono">{flagString(leaf.flags)}</span> (D A G U X W R V). The access is a {acc[puzzle.access]} from user mode. What happens?</p>
      <div class="choices">
        <button onclick={() => judge('ok')}>Allowed</button>
        <button onclick={() => judge('U')}>Fault: U = 0</button>
        <button onclick={() => judge('R')}>Fault: R = 0</button>
        <button onclick={() => judge('W')}>Fault: W = 0</button>
        <button onclick={() => judge('X')}>Fault: X = 0</button>
      </div>
    {:else if stage.k === 'pa'}
      <p class="q">Allowed. Now compose the physical address: the leaf’s PPN × 0x1000 plus the offset{chosen.at(-1)!.level > 0 ? ` (a ${LEVEL_NAME[chosen.at(-1)!.level]}: the low ${12 + 9 * chosen.at(-1)!.level} bits of the address pass through)` : ''}.</p>
      <form onsubmit={(e) => (e.preventDefault(), checkPa())}><label>Physical address: <input class="mono" bind:value={paText} placeholder="0x…" /></label> <button type="submit">Check</button></form>
    {:else}
      <p class="done" class:ok={stage.ok}>{stage.ok ? '✓' : '✗'} {stage.text}</p>
      <button class="next" onclick={nextPuzzle}>Next address →</button>
    {/if}
    {#if feedback}<p class="fb">✗ {feedback}</p>{/if}
  </div>

  <div class="flip ui">
    <button onclick={flipBit}>{flipped ? 'Repair the flipped bit' : 'Flip one bit of the heap page’s PTE'}</button>
    {#if flipped}<span class="warn">Bit 6 of the heap page’s PPN is flipped: the entry now names frame {hex(0x03)}, which is the level-0 <em>page table</em> holding that very entry. Translate a heap address to see where it lands. A program that can write its own page tables can map any frame in the machine.</span>{:else}<span class="dim">Re-enact Rowhammer’s target: one corrupted page-table entry.</span>{/if}
  </div>
</Widget>

<style>
  .top {
    display: flex;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: baseline;
  }
  .task {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 0.8rem;
    align-items: baseline;
  }
  .va {
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--copper);
  }
  .acc {
    font-weight: 600;
  }
  .note,
  .dim {
    color: var(--mute);
    font-size: 0.85rem;
  }
  .score {
    display: flex;
    gap: 1rem;
    font-size: 0.85rem;
  }
  .bits {
    display: flex;
    flex-wrap: wrap;
    gap: 3px;
    margin: 0.7rem 0 0.2rem;
    font-size: 0.8rem;
  }
  .b {
    padding: 0.2rem 0.35rem;
    border-radius: 3px;
    transition: box-shadow 200ms;
  }
  .b.act {
    box-shadow: 0 0 0 2px var(--amber);
  }
  .v2 {
    background: color-mix(in srgb, var(--series-1) 18%, transparent);
    color: var(--series-1);
  }
  .v1 {
    background: color-mix(in srgb, var(--series-6) 18%, transparent);
    color: var(--series-6);
  }
  .v0 {
    background: color-mix(in srgb, var(--series-4) 18%, transparent);
    color: var(--series-4);
  }
  .off {
    background: color-mix(in srgb, var(--series-5) 18%, transparent);
    color: var(--series-5);
  }
  .bits-l {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem 1rem;
    font-size: 0.75rem;
  }
  .bits-l span {
    background: none;
  }
  .trail {
    display: flex;
    flex-wrap: wrap;
    gap: 0.3rem;
    align-items: center;
    margin: 0.8rem 0;
    font-size: 0.74rem;
  }
  .satp,
  .step {
    background: var(--page-soft);
    border: 1px solid var(--page-c);
    border-radius: 3px;
    padding: 0.1rem 0.4rem;
  }
  .arrow {
    color: var(--mute);
  }
  .panel {
    border: 1px solid var(--line);
    border-radius: var(--radius);
    padding: 0.8rem 1rem;
    background: var(--pn);
  }
  .q {
    margin: 0 0 0.6rem;
    font-size: 0.92rem;
  }
  .entries {
    list-style: none;
    padding: 0;
    margin: 0 0 0.6rem;
    display: grid;
    gap: 3px;
    font-size: 0.78rem;
  }
  .entries button {
    width: 100%;
    text-align: left;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    border-radius: 3px;
    padding: 0.3rem 0.5rem;
    cursor: pointer;
    font: inherit;
    display: flex;
    gap: 0.8rem;
    flex-wrap: wrap;
  }
  .entries button:hover {
    border-color: var(--copper);
    background: var(--copper-soft);
  }
  .ix {
    color: var(--copper);
    font-weight: 700;
    min-width: 3rem;
  }
  .fl {
    color: var(--page-c);
  }
  .kind {
    color: var(--mute);
  }
  .rest {
    color: var(--mute);
    padding: 0.2rem 0.5rem;
  }
  button {
    font: inherit;
    font-size: 0.85rem;
    border: 1px solid var(--line-strong);
    background: var(--panel);
    border-radius: 99px;
    padding: 0.25rem 0.8rem;
    cursor: pointer;
  }
  .choices {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }
  .next,
  form button {
    background: var(--copper);
    border-color: var(--copper);
    color: var(--on-accent);
    font-weight: 600;
  }
  form input {
    font-family: var(--font-mono);
    border: 1px solid var(--line-strong);
    background: var(--panel);
    padding: 0.2rem 0.4rem;
    width: 10rem;
  }
  .done {
    font-size: 0.92rem;
    margin: 0 0 0.6rem;
  }
  .done.ok {
    color: var(--ok);
  }
  .fb {
    color: var(--bad);
    font-size: 0.86rem;
    margin: 0.5rem 0 0;
  }
  .flip {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
    align-items: center;
    margin-top: 0.9rem;
    font-size: 0.82rem;
  }
  .warn {
    color: var(--leak);
  }
</style>
