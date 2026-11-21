---
number: 10
title: 'Synthesis: from RTL to gates'
summary: 'Bit-blasting, Boolean minimisation and technology mapping onto a library of standard cells.'
duration: 75 minutes
prerequisites: [verification]
---

:::check
If you can do these without the chapter, skim it and move on.

```quiz
q: The decade counter never holds the values 10 to 15. How can synthesis use that?
options:
  - text: It can treat the next-state logic’s outputs for those values as don’t-cares, and choose whatever makes the logic smallest.
    correct: true
    why: 'Since those states are unreachable, nobody can observe what the logic does in them. Freeing those outputs often lets larger groups of 1s be covered by fewer, simpler terms.'
  - text: It can remove one of the four flip-flops.
    why: 'Ten values still need four bits: three bits hold only eight.'
  - text: Nothing; synthesis must preserve the RTL’s behaviour in every state.
    why: 'It must preserve the behaviour that can be observed, from power-on, with any inputs. Unreachable states are not observable.'
```

```answer
id: synthesis/check-aoi
title: A compound gate
prompt: 'Y = ¬(A·B + C) can be built as an AOI21 compound gate, or as a NAND2 (for ¬(A·B)), an inverter on C, and a NAND2 combining them, followed by an inverter. How many transistors does the AOI21 save?'
answer: 6
why: 'AOI21 takes 6 transistors. NAND2 (4) + INV (2) + NAND2 (4) + INV (2) = 12. Compound gates are why technology mapping looks for patterns larger than one gate.'
```
:::

Here is the clock digit of chapters 8 and 9, synthesised. The design is turned into a graph of logic operations, simplified, and covered with cells from a small library; the result is drawn with every cell in the column of its logic depth. Edit the design, or try the other examples, and watch the gates change.

::synth-lab

The four flip-flops become four DFF cells; the incrementer, the comparator and the three multiplexers become about twenty-five gates; the whole thing is about 260 transistors. Switch the mapping goal between area and delay and the netlist changes shape: the delay goal buys a slightly shallower circuit with a few more transistors. That is synthesis: from a description of behaviour to a **netlist**, a list of cell instances and the wires that connect them, chosen to be small and fast.

## Three steps

A synthesis tool does three things in turn.

1. **Elaboration.** The RTL's operators become generic logic, one bit at a time: `q + 1` becomes a chain of four half adders, `q == 9` four XNORs (or inverters) and an AND, each `?:` a column of multiplexers. This step is often called **bit-blasting**.
2. **Logic optimisation.** The generic logic is simplified without regard to any library: constants are propagated, identical sub-expressions are merged, redundant logic is removed, Boolean expressions are restructured.
3. **Technology mapping.** The optimised logic is covered with cells from the standard-cell library, choosing cells for area or delay or a mix.

Real tools then iterate: they size cells, buffer long nets and restructure critical paths, with timing information from the placement (chapter 11).

:::software[A compiler, all the way down]
Elaboration is parsing and lowering to an intermediate representation; optimisation is the compiler's middle end (constant propagation, common-subexpression elimination, dead-code removal); technology mapping is instruction selection. They are literally the same algorithms: the tree-covering dynamic programming below is how compilers pick machine instructions for expression trees.:cite[aho1989] The cell library is the instruction set, transistor count is code size, and gate delay is latency.
:::

## Bit-blasting

The widget's first readout counts the nodes of the logic graph: AND, OR, XOR, NOT and multiplexer nodes, each one bit wide. Two techniques keep it small as it is built.

- **Structural hashing**: before creating a node, look it up; if an identical node (same operation, same inputs) exists, reuse it. `q == 9` appears twice in the counter, once for `tc` and once for the wrap, but it is built once.
- **Local simplification**: $x \cdot 0 = 0$, $x \cdot 1 = x$, $x \cdot \bar{x} = 0$, $\overline{\overline{x}} = x$, a multiplexer with equal inputs is a wire, and so on, applied as each node is created. Comparisons with constants shrink to a few gates this way.

## Two-level minimisation

The classic way to minimise a single Boolean function is to write it as a **sum of products**, an OR of AND terms, and find the cover with the fewest terms. On paper, for up to four or five variables, it is done with a **Karnaugh map**: the truth table laid out so that neighbouring cells differ in one variable (rows and columns in Gray-code order, 00, 01, 11, 10, wrapping round at the edges). A rectangle of 1, 2, 4 or 8 cells of 1s is a single product term; the larger the rectangle, the fewer variables in the term.

Here are the counter's four next-state bits, as functions of its current value. Because the counter never reaches 10 to 15, those cells are **don't-cares** (×): they may be covered or not, whichever helps.

::k-map

```answer
id: synthesis/kmap-terms
title: How much the don't-cares save
prompt: 'Use the map for the next value of q3. With values 10–15 as don’t-cares, the minimum cover has 2 terms: q3·¬q0 and q2·q1·q0. How many terms does it need if you turn the don’t-cares off (so that the logic must also produce the values the RTL gives in states 10–15)?'
answer: 4
why: 'Four terms and twelve literals, against two terms and five. Without don’t-cares, the 1 at 7 cannot borrow 15, and the cells 10–14 must be covered exactly. Real synthesis tools derive don’t-cares from unreachable states and from values that are never observed.'
```

Finding a minimum cover is a set-cover problem, NP-hard in general. Exact methods (Quine and McCluskey's, in the 1950s) list every prime implicant and choose among them; the program Espresso, from Berkeley in the early 1980s, uses heuristics that are close to optimal and fast enough for functions of dozens of inputs.:cite[brayton1984]

:::history{year=1953 title="Maps, tables and covers" people="Maurice Karnaugh, Willard Quine, Edward McCluskey"}
Maurice Karnaugh at Bell Labs published his map method in 1953, refining a chart by Edward Veitch of the year before.:cite[karnaugh1953] Willard Van Orman Quine, a philosopher of logic, had shown in 1952 how to find all the prime implicants of a function by repeatedly merging terms; Edward McCluskey turned it into a tabular procedure in 1956. The Quine–McCluskey method is still taught, and still the basis of exact minimisation.
:::

## Many levels

Two-level logic is not how chips are built: a sum of fifty products would need an OR gate with fifty inputs. Real logic is **multi-level**: factored, shared, deep. Modern tools represent it as a graph of two-input ANDs with inverters on the edges (an **and-inverter graph**), and optimise it by rewriting small subgraphs into better equivalents, millions of times, checking each rewrite's equivalence as they go.

## Technology mapping

Now the logic must become cells. The library is the vocabulary:

| Cell | Function | Transistors | Delay (ps) |
| --- | --- | --- | --- |
| INV | $\bar A$ | 2 | 10 |
| NAND2 | $\overline{A B}$ | 4 | 14 |
| NOR2 | $\overline{A + B}$ | 4 | 18 |
| NAND3 | $\overline{A B C}$ | 6 | 18 |
| AOI21 | $\overline{AB + C}$ | 6 | 20 |
| OAI21 | $\overline{(A + B)C}$ | 6 | 20 |
| AND2, OR2 | $AB$, $A + B$ | 6 | 22, 26 |
| XOR2, XNOR2 | $A \oplus B$, $\overline{A \oplus B}$ | 10 | 28 |
| MUX2 | $S\,?\,A : B$ | 12 | 26 |
| DFF | $Q \leftarrow D$ at each clock edge | 24 | 40 clock to Q |

(Each delay grows by 4 ps for every unit of load the cell drives; chapter 12 uses that. A real library has hundreds of cells, each in several drive strengths.)

The mapper works on a **subject graph**: the logic rewritten in a few primitive forms (here NAND2, inverter, XOR2 and MUX2). Each library cell is described as a pattern in the same primitives: NOR2 is an inverter of a NAND of two inverters; AOI21 is an inverter of a NAND of a NAND and an inverter. Then:

1. Cut the subject graph into **trees** wherever a node feeds more than one place (those values must exist as real wires).
2. For each node of each tree, from the inputs up, find every cell whose pattern matches there, and compute its cost: the cell's own area plus the best cost of covering each subtree below the pattern's inputs. Keep the cheapest. This is **dynamic programming**: each node's best cover is computed once and reused.
3. Read the chosen cells back down from the roots.

Covering for area minimises total transistors; covering for delay minimises the arrival time at each node instead. The method is due to Kurt Keutzer, whose DAGON program of 1987 borrowed it from compilers' instruction selection.:cite[keutzer1987]

:::key
Synthesis lowers RTL to bit-level logic, optimises it independently of any technology, then covers it with library cells by pattern matching and dynamic programming. Unreachable states and unobservable values become don't-cares, which make logic smaller. The result is a netlist that equivalence checking proves equal to the RTL.
:::

:::fab[What the tools really do]
Commercial synthesis (since the late 1980s, when the company that became Synopsys made it a product) reads millions of lines of RTL and produces netlists of tens of millions of cells, optimising area, timing and power together with a placement-aware model of the wires. Every netlist it produces is formally checked for equivalence with the RTL before anyone trusts it.
:::

## Summary

- Synthesis turns RTL into a netlist of library cells: elaboration (bit-blasting), technology-independent optimisation, technology mapping.
- Structural hashing and local rules keep the logic graph small as it is built.
- Two-level minimisation covers the 1s of a function with the fewest product terms; Karnaugh maps do it by eye, Quine–McCluskey exactly, Espresso heuristically. Don't-cares from unreachable states shrink the logic.
- Technology mapping covers a subject graph with cell patterns by dynamic programming over trees, for area or delay, as compilers select instructions.
