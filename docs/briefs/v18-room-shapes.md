# Brief: room shapes (L, notched and cross-shaped chambers)

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). Both pages, `index.html` (2D) and
`3d/index.html` (3D), load the same `js/` game logic; the 3D page swaps the 2D renderer for `3d/render3d.js`. A top-level name
declared twice, or a `const` declared twice inside one function, stops a whole script loading; `bash tools/check_names.sh` lists
top-level clashes and `node --check <file>` catches the rest.

Goal: more variety WITHOUT more difficulty. Today every chamber in a gate is a plain rectangle (`genLayout` in `js/03a-layout.js`).
Make some of them L-shaped, notched or cross-shaped by cutting corners off the rectangle. Nothing else about a fight changes: the
same waves, the same enemies, the same number of chambers.

## What the player sees
About half the fight chambers (never the entry room, index 0) lose one or more corners: one corner (an L, about 25 percent of
chambers), two corners (about 15 percent), or all four (a cross, about 15 percent); the rest stay rectangles. A cut corner is solid
wall like any other: the hunter, enemies, shadows and shots stay out of it, the stone walls and their dressing (pilasters, torches,
rubble, floor inlay) follow the new outline in 2D and in 3D, and the floor is only drawn inside the chamber. Corridors still meet the
chamber exactly where they did; a cut never touches a corridor mouth.

## Build
1. Data: every room keeps its bounding rectangle (`x0, y0, x1, y1`; all spacing and corridor placement keep using it, unchanged)
   and gains `parts`, an array of non-overlapping rectangles whose union is the room's real floor (`[{ x0, y0, x1, y1 }]` equal to
   the bounding rectangle for a plain room). Decide the cuts in `genLayout` AFTER all halls and the stub are placed, from the same
   seeded `rng` (so a seed still gives the same layout, and an old seed's rooms, halls and doors are the same as before apart from
   the cuts). A cut is a corner rectangle 25 to 38 percent of the room's width by 25 to 38 percent of its height. Skip any cut that
   would come within 60 of a hall's rectangle (both the hall in and the hall out, and the stub on the last room), and never cut room
   0. The room's centre must stay in its floor (it does when each cut is under half of each side; the reward box spawns at the
   centre, `js/08-dungeon.js`). Store `shape` (`'rect'`, `'L'`, `'two'`, `'cross'`) on each room for the test.
2. Everything that treats a room as its rectangle must use `parts` where the floor matters. Find every reader (`grep -n "rooms"`
   across `js/` and `3d/render3d.js`; at the time of writing: `mapRects`, `roomAt`, `pointInRoom`, `layout.rects` and `computeWalls`
   input in `js/03a-layout.js`; `buildLayoutDecor` (floor inlay, pilasters, props) in `js/03a-layout.js`; the 2D draw in
   `js/11-render-world.js`; in `3d/render3d.js` the room floor pieces (around line 231), the hall floor pieces that leave out the room
   area (around 233), the darker not-yet-reached rooms (around 259) and the room props (`dc.rooms`)). In detail:
   `layout.rects` = every room's `parts` plus the halls; `computeWalls` gets the same list; `mapRects()` while a room is locked
   returns that room's `parts`; `roomAt` tests the parts; `pointInRoom` picks a point inside a part (inset 70 as now, weighted by
   part area); the floor inlay is drawn only where it fits inside the parts (dropping a strip that would cross a cut is fine);
   props never stand in a cut corner. Room-centre readers (boss arrow, reward box) stay as they are.
3. Doors (`doors` in `genLayout`) stay where they are: they sit on the bounding edges at corridor mouths, which the cut rules keep.
4. Test: extend `tools/test_layout.js` (keep every existing rule and its count passing, PASS 8000 or more) with, for every seed it
   already runs: every room has `parts`; parts lie inside the bounding rectangle and do not overlap; the parts of one room are
   connected; room 0 is `'rect'`; no part's cut corner comes within 60 of any hall; the room centre is inside a part; 200
   `pointInRoom` samples per room fall inside a part; a point in a cut corner gives `roomAt` -1 and `inMap` false; across the seeds
   the share of non-rect fight rooms is between 0.4 and 0.65 and every shape occurs. Print `PASS <n>` as now.

## Constraints
- Touch only `js/03a-layout.js`, `js/11-render-world.js`, `js/08-dungeon.js` (only if a reader there needs it), `3d/render3d.js` and
  `tools/test_layout.js`. Do not edit `index.html` or `3d/index.html`; do NOT run `tools/stamp.sh`. No change to enemies, waves,
  damage, rewards or the boss arena; the open arena (`layout === null`) is untouched.
- In three.js r149 an `InstancedMesh` is culled by its base geometry at the origin; any new instanced mesh needs
  `frustumCulled = false` (lesson G9).
- Art rule: no star symbols, runes, occult or religious imagery. Plain stone walls only; a cross-shaped room is a floor plan, so do
  not mark, decorate or name it as a cross anywhere a player can see (the `shape` value is internal).
- Match the surrounding style: compact statements, one short comment per item saying what the player sees.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`; `node --check` on every file you touched prints nothing.
- `node tools/test_layout.js` prints `PASS <n>` with n at least 8000; `node tools/test_rift.js` (PASS 310), `node tools/test_record.js`
  (PASS 123 or more), `node tools/test_equip_best.js` (PASS 22), `node tools/test_shadow_names.js` (PASS 16), `node tools/test_titles.js`
  (PASS 71), `node tools/test_boxes.js` (PASS 3595), `node tools/test_army.js` (PASS 570), `node tools/test_gear.js` (PASS 626220) pass.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.

## Done when
All four items are in and every check passes.
