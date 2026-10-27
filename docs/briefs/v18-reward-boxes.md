# Brief: System reward boxes (new content, both views)

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). A top-level name declared twice, or a
`const` declared twice inside one function, stops a whole script loading; `bash tools/check_names.sh` lists top-level clashes and
`node --check <file>` catches the rest. Use exactly the new names below. The 2D page (`index.html`) loads `js/01` to `js/13`; the 3D
page (`3d/index.html`, generated, never edit) loads the same minus `js/11-render-world.js` and `js/12-render-fx.js`, plus three.js
and `3d/render3d.js`. `js/12b-overlay.js` is loaded by both.

## What the player sees
Sometimes when a chamber is cleared, a glowing System box rises out of the floor in the middle of that chamber: a see-through cyan
cube with bright edges, hovering and turning slowly over a soft pool of light. Walking into it opens it: the lid lifts, the box
breaks into rising cyan motes, the System window says `[ REWARD BOX ]` with the gold gained, and now and then an item drops as
well. Every gate gives at least one box. Enemies, waves and bosses are NOT changed in any way.

## The rules (js/01-data.js, js/03-state.js, js/08-dungeon.js, js/13-loop.js)
1. `js/03-state.js` line 21: add `rewardBoxes = []` to the `let telegraphs = [], orbs = [], remnants = [] ...` line.
2. `js/01-data.js`, near the other gameplay constants: `const BOX_CHANCE = 0.35, BOX_RISE = 0.8, BOX_REACH = 46;` and
   `function boxDue(roomI, nFight, given, roll) { return roomI >= 1 && (roll < BOX_CHANCE || (roomI === nFight && given === 0)); }`
   (roomI: the chamber just cleared, 1..nFight; nFight: the number of fight chambers in the gate; given: boxes already given this
   run; roll: a number in [0, 1)). One box at most per chamber.
3. `js/08-dungeon.js`, `nextWave()`: on its first line the chamber's doors open (`layout.cleared = dungeon.wave`). Right after that
   line, only when `layout` is set and the run is not endless: if `boxDue(layout.cleared, layout.rooms.length - 1, run.boxes || 0, Math.random())`
   push `{ x, y, t: 0, open: -1 }` onto `rewardBoxes`, where `x, y` is the centre of `layout.rooms[layout.cleared]`, and add one to
   `run.boxes` (start it at 0 where `run` is created if that is simpler; read it as `run.boxes || 0` otherwise).
4. Everywhere `remnants = []` is reset in `js/08-dungeon.js` (lines 15, 79 and 224), reset `rewardBoxes = []` too.
5. `js/13-loop.js`, right after the remnants line (`if (remnants.length) { ... }`, about line 64): update the boxes:
   - every box: `b.t += dt`.
   - a closed box (`b.open < 0`) with `b.t >= BOX_RISE` and the hunter within `BOX_REACH` of `(b.x, b.y)` opens: `b.open = 0` and
     call `openRewardBox(b)`.
   - an open box: `b.open += dt`; remove it once `b.open > 0.7`.
6. `function openRewardBox(b)` in `js/08-dungeon.js`: gold `g = Math.max(20, Math.ceil(run.gold * 0.2))`; `player.gold += g; run.gold += g;`
   with 15 percent chance also `dropGear(b.x, b.y, 0)` (it spills a gear gem the usual way). Then
   `systemPop('REWARD BOX', '+' + fmtNum(g) + ' GOLD', gear ? 'AND AN ITEM' : 'THE SYSTEM REWARDS THE HUNTER')`,
   `playSfx('buy')`, `floatText(b.x, b.y - 40, '+' + fmtNum(g), '#ffcc33', 16)`, and 24 cyan particles rising from the box with the
   existing `spawnParticle(x, y, COLORS.primary, { vx, vy, size, alpha, life })` (vy upwards, -60 to -160; vx -60 to 60; life 0.6
   to 1.1). Check `floatText`'s real signature in the code and match it.

## Drawing
7. 2D (`js/11-render-world.js`, inside `drawPickups()`, after the remnants loop): for each box, with `k = Math.min(1, b.t / BOX_RISE)`
   (it rises: scale and alpha grow with `k`) and a bob `Math.sin(clock * 2.4 + b.x) * 3`:
   a soft cyan pool on the floor (`disc`, alpha 0.18, radius 34); the box drawn as a cube seen from above and in front: a front face
   about 26 wide and 22 high and a top face (a parallelogram about 8 deep) above it, filled `rgba(0,212,255,0.12)`, edges
   `COLORS.primary` at line width 1.5 with `ctx.shadowColor = COLORS.primary; ctx.shadowBlur = 12` (reset shadowBlur to 0 after);
   a thin brighter line where the lid meets the box. When open (`b.open >= 0`, `o = b.open / 0.7`): the lid (top face) lifts by
   `o * 18` and the whole box fades with `1 - o`. Plain cube shapes only.
8. 3D (`3d/render3d.js`): next to `remnantMeshes`, a new `const boxMeshes = new Map();`, and add it to the list pruned when the
   dungeon is empty (the line with `[enemyMeshes, shadowMeshes, ..., zoneMeshes].forEach(m => pruneMap(m, emptySet))`). Shared,
   made once at top level: `const geoBox3D = new THREE.BoxGeometry(22, 16, 22), geoBoxLid3D = new THREE.BoxGeometry(22, 3, 22), edgesBox3D = new THREE.EdgesGeometry(geoBox3D), edgesLid3D = new THREE.EdgesGeometry(geoBoxLid3D);`
   Right after the Remnants block in `draw()`, for each box: a `THREE.Group` per box, made once (cache in `boxMeshes`), holding the
   body (`geoBox3D`, `MeshBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.16, depthWrite: false })`), its edges
   (`LineSegments(edgesBox3D, LineBasicMaterial({ color: 0x66e6ff, transparent: true }))`), a lid group at y 9.5 with the lid
   body and lid edges, and a flat glow plane on the floor (`PlaneGeometry(1, 1)` rotated flat, `map: glowTex3D()`, additive,
   opacity 0.3, scale 70, at y 0.6, kept upright: do not let it turn with the box). Each frame: position `(b.x, 12 * k + 2 + bob, b.y)`
   with the same `k` and bob as 2D, `scale.setScalar(Math.max(0.01, k))` on the box part, `rotation.y = clock * 0.8`; when open,
   the lid rises `o * 18` and every material's opacity is multiplied by `1 - o`. Each box gets its own materials (so one fades
   without the others), disposed when pruned: check that `pruneMap`/`disposeNode` frees a group's children and their materials,
   and mark what it needs (`userData.disposeGeom` must NOT be set on the shared geometries).
9. Minimap (`js/12b-overlay.js`, `drawMinimap`, right after the remnants dots line): unopened boxes as small cyan squares,
   `ctx.fillStyle = COLORS.primary; ctx.globalAlpha = 0.9;` and a 4 by 4 square at `px(b.x), py(b.y)`.

## Test (new file `tools/test_boxes.js`, modelled on `tools/test_army.js` and the headless loader `tools/lib/headless.js`)
10. `boxDue` rules: for nFight 3 to 8 and many rolls, never a box for room 0; a box when `roll < BOX_CHANCE`; the last chamber
    always gives one when none was given; never more than one decision per chamber. Then with the headless game
    (`const { ctx, api } = require('./lib/headless.js').createGame()`, reach globals with `require('vm').runInContext('...', ctx)`):
    start the E gate (`api.startDungeon(api.GATE_DEFS[0])`), push a box at the hunter's position with `t = BOX_RISE`, step once:
    the gold goes up by at least 20, the box opens, and after 0.8 s of steps it is gone. Over 300 simulated gates (call `boxDue` the
    way `nextWave` does, with `Math.random()`), every gate gives at least one box and the average is between 1 and 3. Print
    `PASS <cases>` at the end, as the other tests do.

## Constraints
- Touch only `js/01-data.js`, `js/03-state.js`, `js/08-dungeon.js`, `js/11-render-world.js`, `js/12b-overlay.js`, `js/13-loop.js`,
  `3d/render3d.js` and the new `tools/test_boxes.js`. Do not edit `index.html` or `3d/index.html`; do NOT run `tools/stamp.sh`.
- No change to enemies, waves, bosses, damage, health, XP or drop rates of anything that exists.
- Nothing created per frame (no geometry or material per frame; a box's group and materials are made once, when it first shows).
- Art rule: a plain cube, edges, light and motes. No star shapes, runes, glyph-like marks, crosses, halos, occult or religious imagery.
- Match the surrounding style: compact statements, short names, one short comment per numbered item saying what the player sees.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`.
- `node --check` on every file you touched prints nothing.
- `node tools/test_boxes.js` prints `PASS <n>`; `node tools/test_layout.js` ends with `PASS 8000`; `node tools/test_gear.js` and
  `node tools/test_army.js` pass.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.

## Done when
All ten items are in and every check passes. Commit nothing yourself.
