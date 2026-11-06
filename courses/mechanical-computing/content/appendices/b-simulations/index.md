---
number: B
title: How the simulations work
summary: Kinematics without physics, a small WebGL2 renderer, and the performance budget.
---

Every machine in this course is drawn and animated in your browser from the course's own code. Nothing is a video or a photograph, and the course uses no 3D library: it has its own small renderer, about a thousand lines of TypeScript, written for these machines.

## Machines are state machines, not physics

None of the machines is simulated with rigid-body physics. Each is a **logical model** (in `src/lib/mech/`): the Pascaline is an array of digits and a queue of steps and carries; Difference Engine No. 2 is columns of digits, half-cycles and a spiral of carries; the Analytical Engine is a store, a mill and a card reader. These models are pure TypeScript with no DOM, and the course's tests run them in Node: the Pascaline's long carries, the engine's staggered set-up, Note G's result, the planimeter's areas.

The 3D view is a separate **kinematic model** (in `src/lib/models/`): a list of parts, each made of one or more meshes, and a `pose` function that, given the logical state (a wheel's position in digits, a lever's lift, a crank's angle), writes the position of every part. A pose function is a flat sequence of writes into one array of matrices, in the order the mechanism transmits motion: input wheel, shaft, crown wheel, pinion, drum. Because the logical model decides everything, the 3D view can never disagree with the readout beside it.

## Meshes are made, not modelled

Every part is generated from numbers when the page needs it (`src/lib/gl/mesh.ts`): involute gear teeth from a tooth count and a module, pin wheels, spoked wheels, stepped drums, lathed shafts, extruded plates (triangulated by ear clipping), and digits engraved as small textured quads that pick their glyph from an atlas drawn once per page. Meshes are cached by name, so a page with three Pascalines builds each wheel once. The slowest part in the course takes a few milliseconds to build.

## The renderer

`src/lib/gl/renderer.ts` draws with WebGL2:

- **Instancing.** Every (mesh, material) pair is one draw call, however many parts share it: the Pascaline's 75 parts take about 15 draws. Each frame writes all the parts' matrices into one array and uploads it in one call.
- **Shadows.** A depth map rendered from the light gives soft shadows (nine filtered samples), and a floor under each machine catches them and fades into the page.
- **Materials.** Brass, steel and iron are lit metals reflecting a simple studio (a gradient, an overhead soft box, a front soft box and a strip light); wood has a procedural grain.
- **Two looks.** *Brass* is the lit rendering; *Drawing* is an engineering drawing, flat fills with ink outlines drawn by the inverted-hull method, in the page's colours: cream and ink by day, a cyanotype by night.
- **Picking.** Tapping a part casts a ray through the pixel and tests it against each part's bounding sphere, then its triangles, on the CPU.

## The performance budget

The course was built to run at 60 frames a second on a current phone (the target was an iPhone 17), and to cost nothing when nothing moves.

- **Render on demand.** A view draws a frame only when something changes: the machine moves, the camera moves, the theme changes. A still machine costs no GPU time at all.
- **Contexts only near the screen.** Browsers allow only about sixteen WebGL contexts per page. A view creates its context when it comes within a few hundred pixels of the screen and destroys it when it leaves, and at most four are alive at once (`src/lib/gl/pool.ts`); meshes stay cached in memory, so coming back is quick.
- **No allocation per frame.** Matrices, tints and instance data live in arrays allocated once per view; the frame loop writes into them.
- **Resolution.** The pixel ratio is capped at 2 (a phone's 3× screen gains little for a lot of pixels), and lowered automatically if frames keep running long.
- **Measured.** Every view reports its draw calls, instance and triangle counts, CPU time per frame and the mesh build times on `window.__mcStats`, which the course's browser checks read.

## Accessibility

Every 3D view has a text readout beside it with the same information, which is also what you see if your browser has no WebGL2. Views respond to the keyboard (arrow keys to orbit, + and − to zoom) and to touch (a horizontal drag turns the machine; a vertical one scrolls the page). Every exercise works with a keyboard and on a touch screen.
