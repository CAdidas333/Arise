# Brief: each gate dresses its rooms its own way (both views)

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). A top-level name declared twice, or a
`const` declared twice inside one function, stops a whole script loading; `bash tools/check_names.sh` lists top-level clashes and
`node --check <file>` catches the rest. Room dressing is built once per layout by `buildLayoutDecor(L)` in `js/03a-layout.js`
(read it: pilasters, inlays, rubble, cracks, runners, all placed by a seeded generator and kept clear of doors and corridor
mouths), drawn in 2D by `js/11-render-world.js` and in 3D by `3d/render3d.js` (`rebuildLayout3D`, which builds rubble and cracks
from the same data). Add one more kind of dressing the same way.

## What the player sees
Every room gets three to five props that belong to its gate, placed near walls and in corners like the rubble:
- `e_gate` Goblin Cavern: clusters of small glowing mushrooms (pale green caps, a soft glow).
- `d_gate` Orc Fortress: wooden crates and barrels, single or stacked two high.
- `c_gate` Undead Crypt: cobwebs spanning room corners (thin pale lines, a fan of threads with a few cross-threads).
- `b_gate` Demon Realm: small glowing floor vents (dark rims, an orange-red glow that breathes slowly).
- `a_gate` Dragon's Lair: low heaps of gold coins catching the light.
- `s_gate` Cartenon Temple: broken stone column stumps.
Endless mode has no layout, so nothing changes there. No prop blocks movement (they are dressing, like the rubble).

## Build
1. `js/03a-layout.js`, `buildLayoutDecor(L)`: `rd.props = []`, filled per room after the rubble with the same rules (near a wall
   or in a corner, never within 100 of a door or in a corridor mouth, inside the room by at least 30), using the room's seeded
   `rng`: `{ t, x, y, s, ph }` (t the type below, s a size 0.8..1.3, ph a phase 0..2 pi). The type comes from the gate:
   `const gid = (typeof dungeon !== 'undefined' && dungeon && dungeon.gate) ? dungeon.gate.id : '';` and a map
   `{ e_gate:'shroom', d_gate:'crate', c_gate:'web', b_gate:'vent', a_gate:'gold', s_gate:'column' }`; no type, no props. Cobwebs
   go only in corners, with x, y the corner itself and a `q` field (0 to 3) saying which corner.
2. 2D, `js/11-render-world.js`: draw `rd.props` where the rubble is drawn (search `rd.rubble`), after it, with canvas shapes in the
   style of the rubble and torches there (muted colours from the gate theme where it fits; glows with `'lighter'` and low alpha;
   the vents' glow breathing with `Math.sin(clock*1.5 + ph)`). Skip props outside the view like the rubble does.
3. 3D, `3d/render3d.js`, `rebuildLayout3D`, where the rubble is built (search `rd.rubble`): one `THREE.InstancedMesh` per prop type
   present, from geometries made once at top level (mushroom: a short stem cylinder and a flattened sphere cap; crate: a box;
   barrel: a cylinder; vent: a flat ring plus an additive glow plane using `glowTex3D()`; gold: a few flattened spheres in a low
   heap; column stump: a cylinder with a slanted top; cobweb: `LineSegments` of thin lines in the corner, 30 to 40 high), pushed
   into `layoutMeshes` so `clearFloorAndWalls` frees them. Glowing parts use additive materials at low opacity; the vents breathe
   by setting one shared material's opacity each frame where the torch flicker is set.

## Constraints
- Touch only `js/03a-layout.js`, `js/11-render-world.js` and `3d/render3d.js`. Do not edit `index.html` or `3d/index.html`; do NOT
  run `tools/stamp.sh`.
- `node tools/test_layout.js` must still end `PASS 8000` (it checks the layouts; the decor must not change any room, door or wall).
- Nothing created per frame. Phones must stay cheap: instanced meshes in 3D, view culling in 2D, at most 5 props per room.
- Art rule: no skulls, bones, star shapes, runes, glyph-like marks, crosses, altars, statues of figures, occult or religious imagery.
- Match the surrounding style: compact statements, short names, one short comment per prop type saying what the player sees.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`; `node --check` on the three files prints nothing.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.
- `node tools/test_layout.js` ends `PASS 8000`; `node tools/test_boxes.js` and `node tools/test_titles.js` pass.

## Done when
All three items are in and every check passes. Commit nothing yourself.
