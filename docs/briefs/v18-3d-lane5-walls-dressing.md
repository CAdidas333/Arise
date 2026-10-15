# Brief: 3D view — thick stone walls and room dressing (thread U3)

## Goal
In the 2D view a gate's rooms have heavy dark stone walls and are dressed with pilasters, wall torches, rubble, cracks, floor
inlays and corridor runners. In the 3D view (`3d/render3d.js`) the same rooms have thin glowing walls 2 units thick and no
dressing. Make the 3D rooms look like the 2D ones: thick stone walls, and the same dressing in the same places, built from the
same seeded data. Movement and collisions do not change (the dressing is drawing only, in both views).

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step, no npm). A top-level name declared in
two files stops a whole script loading; `bash tools/check_names.sh` lists clashes. The 3D page loads `js/01` to `js/10`,
three.js r149 (`THREE`), `3d/render3d.js`, `js/12b-overlay.js`, `js/12a-card.js`, `js/13-loop.js`; it does NOT load
`js/11-render-world.js` or `js/12-render-fx.js` (the 2D drawing scripts).

## 1. Share the dressing data (move, do not copy)
`buildLayoutDecor(L)` (in `js/11-render-world.js`, the block starting at the comment "Room dressing for the 2D dungeon", about
line 228) builds the dressing data once per layout; 2D caches it as `layout.decor`. It uses only shared helpers (`mulberry32`,
`subtract1D` from `js/03a-layout.js`, and `clamp`, `dist`, `TAU`) plus `distSeg`, which sits just above it.
MOVE `distSeg` and `buildLayoutDecor` (with their comment block) unchanged to the end of `js/03a-layout.js`, and delete them
from `js/11-render-world.js`. The 2D view keeps calling `buildLayoutDecor` exactly as now (line 77), so it must look the same.
What it returns: `{ rooms:[{ r, inlay:[[x0,y0,x1,y1,...],[...]], rubble:[x,y, x,y, x,y, x,y, ...] (4 corners per stone),
cracks:[[x,y,x,y,...], ...] }], pil:[{ x, y, torch, ph }] (on north walls, y = the room's top edge), runners:[{ s:[8 numbers: two lines] }] }`.

## 2. Thick stone walls in `rebuildLayout3D` (3d/render3d.js, about line 148)
Today each `L.walls` segment becomes a 2-unit glowing box 30 high (`wallMat`, opacity 0.65). Replace that loop:
- Wall size: thickness `WT = 30` (the 2D wall band), height `WH = 70`.
- For each segment find its outside: test the point 6 units off the segment's midpoint on each side with `inMap(x, y)`; the side
  where `inMap` is false is outside. Place the box so its inner face sits ON the segment and it extends `WT` outward
  (centre = midpoint + outward normal * WT/2). Lengthen every box by `WT` at each end (so corners close).
- Material: one shared `MeshLambertMaterial` (the scene has an ambient and a directional light; check what `scene` already has
  near the top of the file) in dark stone `0x1a1a24`, `transparent:true, opacity:0.95`.
- A thin top edge on each wall in the gate's line colour (the `line` argument): a box `WT` wide, 2 high, on top of the wall,
  `MeshBasicMaterial({ color:line, transparent:true, opacity:0.35 })`. North walls (outside is -y) get a brighter edge (opacity 0.6),
  like the lit north face in 2D.
- Store each wall mesh's outward normal in `m.userData.nx, m.userData.nz` and push walls into `wallMeshes` as now.
- **Cutaway, so tall walls never hide the hunter.** Each frame in `draw()` (after `camera3D.position.set(...)`, about line 996), for each
  mesh in `wallMeshes` that has `userData.nx` defined: `toCam` = the ground direction from the hunter to the camera
  (`camera3D.position.x - player.x`, `camera3D.position.z - player.y`, normalised); if `nx*toCam.x + nz*toCam.z > 0.35` (the
  wall stands between the camera and the room) its target opacity is 0.18, else 0.95; ease the opacity toward the target
  (`op += (target - op) * Math.min(1, dt*8)`). The walls need their own material per mesh for this (do not share one material
  across walls; the top edges may share theirs). Dispose them in `clearFloorAndWalls` as now.
- Open-arena walls (`rebuildFloorAndWalls`, for boss fights and endless mode) stay as they are.

## 3. Room dressing in 3D (also in `rebuildLayout3D`, after the walls)
`const dc = L.decor || (L.decor = buildLayoutDecor(L));` then build, all pushed into `layoutMeshes` so `clearFloorAndWalls`
disposes them (give InstancedMesh and LineSegments their own geometry and material):
- **Pilasters** (`dc.pil`): a `THREE.InstancedMesh` of unit boxes, each 18 wide (x), `WH - 4` high, 8 deep (z), standing against
  the north wall's inner face: centre `(p.x, (WH-4)/2, p.y + 4)`. `MeshLambertMaterial` colour `0x2a2a38`.
- **Torches** (pilasters with `p.torch`): a small dark bracket box (4 x 10 x 6) at height 44 on the pilaster's face
  (`p.y + 10`), and a flame: an `InstancedMesh` of small cones (`ConeGeometry(4, 12, 6)`) just above the bracket, with
  `MeshBasicMaterial({ color: the gate's ember colour (dungeon.gate.theme.ember, default '#ffcc66'), transparent:true, opacity:0.9, blending:THREE.AdditiveBlending, depthWrite:false })`,
  plus a soft glow: an `InstancedMesh` of flat planes 60 x 60 facing +z (the room side) with the same colour at opacity 0.18,
  additive. Each frame make the flames flicker: flame material opacity `0.75 + 0.2*Math.sin(clock*11)` and glow opacity
  `0.14 + 0.06*Math.sin(clock*7)` (keep references in module-level variables named `torchFlameMat3D` and `torchGlowMat3D`;
  set them to null in `clearFloorAndWalls`). No real point lights (too slow on phones).
- **Rubble** (`rd.rubble`, every 8 numbers are one stone's 4 corners): an `InstancedMesh` of unit boxes; each stone's centre
  is the mean of its 4 corners, its width the larger corner spread, its height `3 + width*0.35`, its turn about y the angle of
  its first edge. Colour `0x24242e` (`MeshLambertMaterial`).
- **Cracks** (`rd.cracks`, each a polyline): one `THREE.LineSegments` for all rooms (consecutive point pairs), colour `0x050508`,
  `transparent:true, opacity:0.7`, at height 0.4.
- **Inlays** (`rd.inlay[0]` and `[1]`, every 4 numbers are one segment): one `LineSegments`, the gate's line colour, opacity 0.22, height 0.4.
- **Runners** (`dc.runners[i].s`, two segments each): one `LineSegments`, line colour, opacity 0.18, height 0.4.

## Constraints
- 2D must look exactly as before. Movement, doors, collisions, the minimap and the exit light do not change.
- Touch only `js/03a-layout.js` (the moved functions appended), `js/11-render-world.js` (the moved block deleted) and `3d/render3d.js`.
- Do not edit `index.html` or `3d/index.html` and do NOT run `tools/stamp.sh`. No new dependencies.
- Art rule: plain stone shapes, flame and light only. No star shapes, runes, glyph-like marks, crosses, halos, occult or religious imagery.
- Match the surrounding style: compact statements, short names, a comment only where the reason is not obvious.
- Phones: keep it cheap. Instanced meshes and merged line geometry; nothing created per frame.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`.
- `node tools/test_layout.js` ends with `PASS 8000`; `node tools/test_gear.js` and `node tools/test_army.js` pass.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.
- Look at your work. Serve the repo (`python3 -m http.server 8790` from the repo root, in the background). Make a throwaway copy
  of `3d/index.html` at `.worker/shot3d.html` with `<base href="../../">` in place of `<base href="../">`, and before `</body>`
  add a script that waits for `load` plus 800 ms, then runs:
  `gameState='HUB'; hide('title-screen'); player=createPlayer('Shot'); player.story.opening=true; startDungeon(GATE_DEFS[1]); for(let i=0;i<120;i++) step(1/60);`
  Capture it with
  `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --user-data-dir=.worker/chprof --hide-scrollbars --window-size=1280,800 --virtual-time-budget=1500 --run-all-compositor-stages-before-draw --screenshot=.worker/room3d.png http://127.0.0.1:8790/.worker/shot3d.html#debug`
  and LOOK at the picture: thick dark walls, pilasters with torches on the north wall, stones near walls, cracks, and the hunter
  visible (the walls between the camera and the hunter faded). Also capture the 2D page the same way (copy `index.html`, no
  base change needed beyond the folder: `<base href="../">`) and check it looks as before. Keep every file you make inside `.worker/`.
  Stop the server afterwards.

## Done when
Sections 1 to 3 are in, the checks pass, both pages load with no console errors, and your 3D picture shows the dressed room
with the hunter in view. Commit nothing yourself.
