# Weft and synth in the course

The course's hardware language is **Weft** and its FPGA toolchain is **synth**, an open-source Rust toolchain
for iCE40 (and Artix-7 and ECP5) FPGAs. Weft's full specification is synth's `docs/WEFT.md`; Appendix F is the
part the course uses. This page is about how the course runs them.

## Building synth

synth is not vendored: `synth.json` pins a commit of its repository, and `scripts/synth.mjs` builds the
`synth-playground` crate to WebAssembly into `static/synth/` (git-ignored), with a `VERSION` stamp.

```sh
rustup target add wasm32-unknown-unknown
npm run synth                         # clone the pinned commit into .cache/ and build it
SYNTH_DIR=../../../synth npm run synth   # or build a local checkout (stamped +local if it is not the pin)
```

`npm test`, `npm run dev` and `npm run build` run `scripts/synth.mjs --check` first and stop with this
instruction when the module is missing or stale. CI builds it the same way (cached by the pin).

To move the course to a new version of synth: build it, run `npm test`, re-record the numbers that moved
(each chapter's `numbers.test.ts` names its `UPDATE_*` variable), read the chapters that quote them, and update
`synth.json`.

## The interface

`src/lib/synth/api.ts` types every method of the module:

| Method | What it does | Used by |
|---|---|---|
| `analyze` | diagnostics, outline and hover data for a set of files | the editor (`src/lib/weft/editor`) |
| `format` | synth's formatter | the editor, and every test that checks a Weft block |
| `run` | the whole flow: RTL, gates, LUTs, placement, routing, timing, bitstream, and (with `trace`) the annealer's and router's progress | the playgrounds' Cost and Circuit tabs, the FPGA studio, Chapters 28–31 |
| `tb_start`, `tb_run`, `tb_stop` | testbench sessions on the source, or on a bitstream decoded back to cells (with bits flipped) | tests, playgrounds, the boards, the corrupt-bits and by-hand figures |
| `bram_load` | rewrites block RAM contents in a bitstream | Chapter 31's Octet board |
| `delays` | the iCE40 timing model | Chapter 28's wire-reach figure, Appendix G |

Pages run the module in three workers (`client.ts`: `check`, `run`, `sim`), so that a long build does not
stop a running board. Tests use one synchronous instance (`node.ts`).

## Tests in the course

Weft has no test syntax; the course has a small test language (`src/lib/weft/testbench.ts`):
`test "name" { set a = 1, b = true; step; step 10; expect y == 3; for i in 0..8 { … } }`, with
`test "name" <N: 8> { … }` for generics. Tests run in synth's testbench sessions, with the top's inputs
synchronous and a clock added to a module without one.

Every Weft block of a chapter or appendix is compiled by synth, must be in synth's format, and its tests must
pass (`weft-blocks.test.ts`, `snippets.test.ts` and `$lib/weft/snippets-check.ts`). Every number the text quotes
about a synth result is checked by the chapter's `numbers.test.ts`.

## Where the designs are

- `content/designs/*.weft` (+ `.tests`): the shared designs (counter, traffic light, ALU, register file,
  debouncer, the RV32I core), loaded by `src/lib/widgets/weft/designs.ts`.
- Chapter designs next to their chapters: Octet's ALU (21), control logic (22), the whole Octet and the RV32I
  board (31).
- `src/lib/studio/ice40/`: the FPGA studio (`::fpga-studio`), the boards (`boards.ts`, synth's pin files) and the
  designs it opens (`designs.ts`).
