---
number: 11
title: 'Place and route'
summary: 'Rows of cells, wirelength, simulated annealing, and maze routing on layers of metal.'
duration: 70 minutes
prerequisites: [synthesis]
---

:::check
If you can do these without the chapter, skim it and move on.

```answer
id: physical/check-hpwl
title: Half-perimeter wirelength
prompt: 'A net connects three pins at (0, 0), (4, 1) and (2, 5), in micrometres. What is its half-perimeter wirelength, in micrometres?'
answer: 9
why: 'The bounding box runs from x = 0 to 4 and from y = 0 to 5: half its perimeter is 4 + 5 = 9 µm. For two- and three-pin nets this is exactly the shortest possible wiring with horizontal and vertical segments; for larger nets it is a lower bound.'
```

```quiz
q: Simulated annealing sometimes accepts a move that makes the placement worse. Why?
options:
  - text: To escape local minima, placements from which every single move makes things worse but a better one exists further away.
    correct: true
    why: 'A greedy search stops at the first local minimum. Accepting some uphill moves, with a probability that falls as the temperature drops, lets the search wander out of poor regions early and settle into a good one late.'
  - text: Because the wirelength is only an estimate, so worse moves may really be better.
    why: 'The cost is an estimate, but annealing would accept uphill moves even with an exact cost; it is a property of the search, not of the estimate.'
  - text: To make the placement more random, which spreads the heat.
    why: 'Placements are judged on wirelength, timing and congestion; randomness is only a means of exploring.'
```
:::

The netlist of chapter 10 says which cells exist and how they connect, but not where they are. Here are the decade counter's 29 cells, dealt into four rows at random. Each fan of thin lines is a net, joining all the pins on it. Swap cells to make the nets shorter (select one cell, then another), then press **Anneal** and watch an algorithm do it.

::placer

Annealing typically cuts the random placement's wirelength roughly in half. The flip-flops end up near the logic that feeds them, the inputs' cells near the left edge, and the nets pull tight. On a real chip the same problem has millions of cells, and it is the first step of **physical design**: turning a netlist into the geometry of the masks.

## Floorplan and rows

Before placing cells, the chip is **floorplanned**. Large blocks (processor cores, memories, analogue circuits, the input/output ring at the edge) are given regions. Power is planned: a grid of wide metal straps on the upper layers carries the supply from the package's bumps down to every cell, and must not drop too much voltage on the way. Memories, delivered as pre-designed **macros** by a memory compiler, are placed by hand or by tools that try many arrangements.

Standard cells go into **rows**. Every cell in a library has the same height, with a supply rail along its top edge and a ground rail along its bottom, so cells placed side by side in a row connect their rails automatically. Alternate rows are flipped upside down so that neighbouring rows share a rail. A cell's width varies with its complexity: an inverter is narrow, a flip-flop wide. In the widget, an INV is one site wide and a DFF eight.

## Placement

A placer decides where every cell goes, in a legal position (in a row, not overlapping anything) that keeps wires short, meets timing and leaves room for routing. Its usual stand-in for wire length is the **half-perimeter wirelength** (HPWL): for each net, half the perimeter of the smallest rectangle containing all its pins. It is cheap to compute and close to the length a router will need.

**Simulated annealing** borrows its idea from metallurgy, where a metal cooled slowly settles into a low-energy crystal and one quenched freezes full of defects.:cite[kirkpatrick1983] Start with any placement and a high "temperature". Repeatedly propose a small random change (swap two cells, or move one to another row) and compute the change in cost, $\Delta$. Always accept an improvement; accept a worsening with probability $e^{-\Delta/T}$. Lower the temperature slowly. Early on, almost anything is accepted and the placement wanders widely; later, only improvements survive and it settles. The widget shows the temperature and the fraction of moves accepted as it cools.

Annealing placers dominated the 1980s and early 1990s; the best known, TimberWolf, came from Berkeley.:cite[sechen1985] Modern placers are **analytic**: they write the wirelength as a smooth function of all the cells' coordinates, add a penalty for crowding, and minimise the whole thing at once with numerical optimisation, like the electrostatics of charged particles repelling each other while their wires pull them together. Then a **legaliser** snaps cells into rows without overlap, and a detailed placer polishes locally, much as you did by hand.

:::key
Placement is an optimisation: put every cell in a legal site to minimise wirelength (and later delay and congestion). Simulated annealing explores by random moves, accepting some worse ones while hot so as not to get stuck; modern placers optimise smooth approximations of the cost for millions of cells at once.
:::

## The clock tree

One net is special: the clock, which must reach every flip-flop at the same moment. If it arrives at one flip-flop earlier than at another, the difference, the **clock skew**, eats into the time available for logic between them, or worse (chapter 12). A wire is not instantaneous: it has resistance along its length and capacitance to everything around it, so a clock edge reaches the far end of a long wire later than the near end, and later still if the wire also has many flip-flops to charge. Here is a block with 64 flip-flops and one clock source; the delays come from Elmore's formula for a tree of resistances and capacitances.:cite[elmore1948]

::clock-tree

The tree with the least wire is the worst: flip-flops near the source receive the edge tens of picoseconds before those at the end of a long chain, a large slice of a 250 ps clock period. A spine is fairer, but a flip-flop at the end of the trunk still waits for everything before it. The **H-tree** gives every leaf the same path: a fractal H that splits into four equal arms, again and again. Over a regular array of flip-flops, one under each leaf, its skew is exactly zero; over scattered flip-flops, what remains comes from the short local wires at the leaves and their uneven loads. The price is wire, two or three times as much as the least, and the clock charges all of it every cycle: on large chips the clock network can draw a large share of the total power.

After placement, **clock tree synthesis** builds such a tree from buffers and wires, balancing each branch's delay by sizing its buffers and, where needed, adding detours of wire. Buffers also cut the long RC delays into short ones and shield each branch from the others' loads, which the unbuffered wires in the widget do not. Good trees hold the skew to a few picoseconds across a whole block.

```quiz
q: In the widget, why does the H-tree use more wire than the least-wire tree, and why is it worth it?
options:
  - text: Its branches go out to fixed points of the H whether or not a flip-flop is nearby, so it is longer; in exchange every leaf is the same distance from the source, and skew costs clock period on the paths it hurts.
    correct: true
    why: 'Skew is lost from the clock period of the paths it hurts (chapter 12), all the time; the extra wire costs some power and area once. The least-wire tree minimises the wrong thing.'
  - text: Longer wires are faster, because they have more capacitance.
    why: 'More capacitance makes a wire slower: the delay grows with resistance times capacitance, which for a wire grows with the square of its length.'
  - text: The H-tree uses more wire only because it is drawn larger; electrically it is the same.
    why: 'The wire lengths are real and so are their capacitances: compare the clock power of the trees.'
```

## Routing

Finally, every net must become real wires. Chips have many layers of metal (a dozen or more in advanced processes), insulated from each other, joined by **vias**. Each layer has a **preferred direction**: on one, wires run horizontally; on the next, vertically; and so on alternately. A net that needs to turn drops through a via to the next layer.

Routing is done in two steps. **Global routing** divides the chip into tiles and assigns each net a sequence of tiles, balancing how many wires cross each tile boundary (the **congestion**), so that no region needs more tracks than it has. **Detailed routing** then lays out exact wires on exact tracks within each tile.

The classic detailed-routing algorithm is C. Y. Lee's **maze router** of 1961.:cite[lee1961] Lay a grid over the routing area. From the first pin, label every free neighbouring cell with 1, their free neighbours with 2, and so on: a wavefront spreading outwards, around obstacles. When it reaches the target, trace back along decreasing labels. That gives a shortest path if one exists. With costs (more for going against a layer's preferred direction, more still for a via), the wavefront becomes Dijkstra's algorithm. Try it:

::maze-router

Each net is routed alone, and the wires it lays become obstacles for the nets after it, so the order matters. On one layer, wires cannot cross at all; with two, a wire can pass under another on the other layer.

```quiz
q: 'In the widget, on a single layer, which net has to be routed first for all four to succeed?'
options:
  - text: C
    correct: true
    why: 'C’s pins are close together but sit where other nets’ cheapest paths pass. Routed later, it finds its way blocked; routed first, it takes its short path and the others go around. Real routers handle such conflicts by ripping up and rerouting the nets in the way, many times over.'
  - text: A
    why: 'Try A first: whatever the rest of the order, one of the nets is cut off on one layer.'
  - text: D
    why: 'Try D first: on one layer, one of the nets is always cut off.'
```

Real routers do not rely on a lucky order. When a net fails, they **rip up** the nets in its way and reroute them, with costs raised in congested places, repeating until everything fits, and they check every wire against the manufacturing rules as they go.

:::fab[The metal stack]
A leading-edge chip of the mid-2020s has around fifteen or more metal layers. The lowest, connecting neighbouring cells, are a few tens of nanometres wide, patterned with extreme-ultraviolet light, often several exposures per layer (chapter 14). Above them the layers get progressively thicker and wider, for longer distances; the top few, micrometres thick, carry power and global signals. Some processes now deliver power from the back of the wafer instead, freeing the front layers for signals. Building the stack, layer after layer of copper in insulating glass, is most of the steps of the whole process (chapter 16).
:::

## Summary

- Floorplanning places big blocks and plans power; standard cells sit in rows of equal height, sharing supply rails.
- Placement puts cells in legal sites to minimise wirelength (measured as HPWL), timing and congestion. Simulated annealing accepts worse moves with probability $e^{-\Delta/T}$ while cooling; modern placers are analytic, then legalise.
- Clock tree synthesis balances the clock's arrival at every flip-flop.
- Routing is global (regions, congestion) then detailed (tracks, vias). Lee's maze router finds shortest paths by a spreading wavefront; nets routed in sequence block each other, and real routers rip up and reroute.
