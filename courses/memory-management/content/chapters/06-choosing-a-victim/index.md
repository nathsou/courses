---
title: Choosing a victim
summary: When memory runs out, which page goes? FIFO, LRU, Clock, the impossible optimum, and an anomaly.
number: 6
duration: 55 minutes
prerequisites: [page-faults]
---

Every frame is in use. A program touches a page that is not in memory. Something has to go: one of the pages in memory must be written to disk (if it changed) and its frame reused, and the page table entry that mapped it marked invalid, so that the next touch faults and brings it back. Which page should it be?

This is the **replacement problem**, and it is the same problem a CPU cache solves for lines, a TLB for translations, a web browser for its cache of images, and a database for its buffer pool. Paging is where it was first studied seriously, because the price of a wrong answer was so high: a disk read takes millions of processor cycles, so every unnecessary fault is a disaster in miniature.

## The cost of a wrong choice

The pages a program uses form a **reference string**: the sequence of page numbers it touches, in order. Given a reference string and a number of frames, each policy produces a number of faults. Fewer is better.

Four policies are natural to try:

- **FIFO**: evict the page that has been in memory longest. Easy to implement: a queue.
- **LRU**: evict the page that has not been *used* for the longest time. It bets on temporal locality: the recent past predicts the near future.
- **Random**: evict any page. Surprisingly hard to beat on some workloads, and immune to pathological patterns.
- **OPT**: evict the page whose next use is furthest in the future (or that will never be used again).

OPT is the best possible: no policy can fault fewer times on any reference string. László Bélády described it in 1966, in a study of replacement algorithms for IBM’s virtual memory machines :cite[belady1966]. It cannot be implemented, because it needs to know the future, but it can be computed afterwards, which makes it the yardstick for every real policy. If this sounds familiar, it should: OPT is the paging version of the oracle line on chapter 0’s lifetime chart. Every memory manager in this course is trying, in one way or another, to approximate a decision that needs the future.

## Bélády’s anomaly

Surely more frames never hurt?

```predict
q: "FIFO replacement, reference string 1 2 3 4 1 2 5 1 2 3 4 5. With 3 frames it faults 9 times. With 4 frames, it faults:"
options:
  - text: Fewer than 9 times
    why: That is what intuition says, and for LRU and OPT it is always true. FIFO is different.
  - text: Exactly 9 times
    why: Run it in the figure.
  - text: 10 times
    correct: true
    why: More memory, more faults. Bélády, Nelson and Shedler published this anomaly in 1969.
```

Run Bélády’s string through the figure with 3 frames and then 4, and watch FIFO’s count go up.

::replacement-race

Bélády, Nelson and Shedler found strings like this one in 1969 :cite[belady1969]. The anomaly cannot happen to LRU or OPT. The reason was explained the following year by Richard Mattson and colleagues at IBM: LRU and OPT are **stack algorithms**, meaning that the set of pages in memory with *n* frames is always a subset of the set with *n* + 1 frames :cite[mattson1970]. Adding a frame can then only turn faults into hits. FIFO lacks the property: with an extra frame, it keeps a different set of pages, and the difference can cost it.

Try the loop of five pages with four frames. LRU faults on *every* reference: the page it just evicted is always the next one needed. That is the same LRU pathology the TLB showed in chapter 4, and it is why databases, which scan tables bigger than their buffer pools, use variants of LRU that resist scans.

## Clock: LRU on the cheap

LRU needs to know, for every page in memory, when it was last used. Hardware does not record that: it would mean writing a timestamp on every memory access. What it does record is one bit per page, the **accessed bit** (A in chapter 3’s page-table entry), set whenever the page is used.

The **Clock** algorithm, which Fernando Corbató described from the Multics system in 1968 :cite[corbato1968], makes do with that bit. Arrange the frames in a circle with a hand pointing at one of them. To find a victim:

1. Look at the frame under the hand.
2. If its accessed bit is set, the page was used recently: clear the bit (a second chance) and move the hand on.
3. If the bit is clear, the page has not been used since the hand last passed: evict it, and move the hand on.

Pages in use keep getting their bit set again before the hand comes round, so they survive; idle pages lose their bit on one pass and are evicted on the next. Clock behaves much like LRU at a fraction of the cost, and variations of it have been the basis of most real kernels’ page replacement since. Linux uses a related approximation, keeping pages on “active” and “inactive” lists and promoting them when their accessed bits show use; since version 6.1 it also offers a multi-generational LRU.

On RISC-V there is a subtlety. The specification allows hardware either to set the A bit itself or to raise a page fault when it would need setting, leaving the kernel to set it (chapter 3). On the second kind of machine, the accessed bit costs a fault per page per Clock pass, so kernels there sample accesses more sparingly.

## Build it: the Clock algorithm

```build
id: choosing-a-victim/clock
title: The Clock algorithm
prompt: |
  Implement `clockFaults(refs, nFrames)`: simulate Clock replacement on a reference string and return the number of page faults. Frames start empty and are filled in order (frame 0 first) before anything is evicted; a page brought in has its accessed bit set; a hit sets the page’s bit. When evicting, the hand starts where it was left, clears set bits as it passes, evicts the first page whose bit is clear, and then points just past the evicted frame. After a fill (no eviction), the hand points just past the filled frame. The starter implements FIFO.
starter: |
  export function clockFaults(refs: number[], nFrames: number): number {
    const frames: number[] = [];
    let faults = 0;
    for (const page of refs) {
      if (frames.includes(page)) continue;
      faults++;
      if (frames.length < nFrames) frames.push(page);
      else {
        frames.shift();
        frames.push(page);
      }
    }
    return faults;
  }
solution: |
  export function clockFaults(refs: number[], nFrames: number): number {
    const page: (number | null)[] = Array(nFrames).fill(null);
    const used: boolean[] = Array(nFrames).fill(false);
    let hand = 0;
    let faults = 0;
    for (const p of refs) {
      const at = page.indexOf(p);
      if (at >= 0) {
        used[at] = true;
        continue;
      }
      faults++;
      let slot = page.indexOf(null);
      if (slot < 0) {
        while (used[hand]) {
          used[hand] = false;
          hand = (hand + 1) % nFrames;
        }
        slot = hand;
      }
      page[slot] = p;
      used[slot] = true;
      hand = (slot + 1) % nFrames;
    }
    return faults;
  }
tests: |
  import { test, expect } from '@mm/test';
  import { simulate, faults } from '@mm/replace';
  import { clockFaults } from './solution';
  test('Bélády’s string with 3 frames', () => {
    expect(clockFaults([1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5], 3)).toBe(faults(simulate([1, 2, 3, 4, 1, 2, 5, 1, 2, 3, 4, 5], 3, 'clock')));
  });
  test('a hot page survives a scan that FIFO would evict it in', () => {
    // Page 1 is used constantly; Clock keeps it, FIFO evicts it.
    const refs = [1, 2, 1, 3, 1, 4, 1, 5, 1, 6, 1, 7, 1];
    expect(clockFaults(refs, 3)).toBe(faults(simulate(refs, 3, 'clock')));
    expect(clockFaults(refs, 3)).toBeLessThan(faults(simulate(refs, 3, 'fifo')));
  });
  test('agrees with the simulator on 200 random strings', () => {
    let s = 3;
    const rnd = (n: number) => ((s = (s * 1103515245 + 12345) % 2147483648), s % n);
    for (let k = 0; k < 200; k++) {
      const refs = Array.from({ length: 30 }, () => rnd(8));
      const n = 1 + rnd(5);
      expect(clockFaults(refs, n)).toBe(faults(simulate(refs, n, 'clock')));
    }
  });
hints:
  - "Keep three things: the page in each frame, each frame’s accessed bit, and the hand."
  - "Evicting: while the bit under the hand is set, clear it and advance. Then the hand points at the victim."
```

## Working sets and thrashing

In the 1960s, time-sharing machines ran many programs at once, and their designers found something alarming. Add one more user to a busy machine and, sometimes, throughput did not dip a little: it fell off a cliff. The machine would spend almost all of its time moving pages to and from the drum, and almost none running programs. They called it **thrashing**.

Peter Denning explained it in 1968 with the idea of a **working set**: the pages a program has used in its last τ references, the ones it needs in memory to make progress :cite[denning1968]. As long as the working sets of all running programs fit in memory together, faults are rare. As soon as they do not, every program, each time it gets the processor, finds that the others have evicted its pages, faults, waits, and is evicted in turn before it gets anything done. More processes then means *less* work, not more.

::thrashing

Denning’s remedy was to run only as many programs as have room for their working sets, and to swap whole programs out rather than letting all of them fight. Modern systems face the same cliff with different names: a laptop that slows to a crawl when one browser tab too many is open, a server in a container that hits its memory limit and starts swapping, a database whose working set outgrows its buffer pool. The shape of the curve is the same.

:::key
Replacement policies try to keep the pages that will be used soon, and can only guess, from the past. OPT, which knows the future, sets the bound. LRU is a good guess when the recent past predicts the near future, and a terrible one for loops slightly too big for memory. Clock gets close to LRU using one hardware bit per page. When the working sets of all running programs exceed memory, no policy can help: the system thrashes.
:::

:::whofrees
Under memory pressure, the kernel takes frames *back* from programs without asking: it evicts a page, writing it to swap first if it was modified, and frees the frame for someone else. The program still owns the page; the next touch faults and brings it back. This is the only layer of the stack where memory is reclaimed from a program that is still using it, and it is invisible except for the time it costs.
:::

## What’s next

Part I is done: we have the machine, its caches, its page tables and its page faults. Part II zooms out to a whole running process: what its address space contains, how its stack works, and how the kernel hands out its own memory.
