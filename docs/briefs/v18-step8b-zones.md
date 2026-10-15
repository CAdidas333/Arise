# Brief: floor hazards that stay on the ground ("zones") — V18 step 8, part B

## Goal
Bosses need arena tricks: webs that slow the hunter, fire that burns while he stands in it, rubble, blood. Build the
general system for a **zone**: a patch of floor (a circle or a long lane) that stays for a few seconds after an attack
lands, slows and/or hurts the hunter while he stands in it, and is drawn in BOTH views (2D canvas and 3D three.js).
This job builds the system only. Do NOT change any boss pattern or `js/01-data.js`; a later job uses zones in the bosses.

The game is plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step, no npm). Two
top-level names that are the same in two files stop a whole script loading, so use exactly the names below.

## The zone object
```
{ type:'circle', x, y, r }                 or  { type:'line', x, y, ax, ay, len, w }   // same shape fields as a telegraph
  dur      seconds it stays on the floor
  t        age in seconds (starts at 0)
  kind     'web' | 'fire' | 'rubble' | 'blood'   (only changes how it is drawn)
  color    fallback colour string, e.g. '#ff6622'
  slow     0 to 0.6: fraction cut from the hunter's WALKING speed while he stands in it (0 = none). Dodging is not slowed
  dps      damage per second while he stands in it (0 = none)
  owner    the enemy that made it (optional); the zone vanishes when its owner dies
  tick     internal damage timer (starts at 0)
```

## Exact changes

### 1. `js/05-enemies.js`
- After line 19 (`const telegraph = o => telegraphs.push(...)`) add:
  - `let zones = [];`
  - `const addZone = o => { if (zones.length < 90) zones.push(Object.assign({ t:0, tick:0, slow:0, dps:0 }, o)); };`
  - `function inZone(z, x, y, pad)` returning true when (x, y) is inside the zone grown by `pad`:
    circle: `dist(z.x, z.y, x, y) < z.r + pad`; line: the same along/across test used in `updateTelegraphs`
    (lines 262-264: `along > -pad && along < z.len + pad && across < z.w/2 + pad`).
  - `function zoneSlow()` returning the walking-speed multiplier: `1 - (largest slow of every zone the hunter is in, pad 0)`,
    never below 0.4. Returns 1 when there are no zones or no player.
  - `function updateZones(dt)`: build a new list; for each zone: `z.t += dt`; drop it when `z.t >= z.dur` or
    `(z.owner && !z.owner.alive)`. If `z.dps > 0` and `dungeon && dungeon.state === 'fight'` and the hunter is in it (pad 8):
    `z.tick += dt; if (z.tick >= 0.5) { z.tick -= 0.5; if (player.inv <= 0) hurtPlayer(z.dps*0.5); }`;
    when the hunter is NOT in it set `z.tick = 0` (walking straight through costs nothing; standing in it hurts).
    The `player.inv <= 0` check matters: `hurtPlayer` turns a hit during a dodge into a free perfect dodge, and a
    floor patch must never do that. Assign the kept list back to `zones`.
- In `updateTelegraphs` (starts line 240): when a telegraph lands, after its damage code (after the whole
  `if (g.type === 'circle') { ... } else if (g.dmg) { ... }` chain, still inside the loop), add:
  `if (g.zone) addZone(Object.assign({ type:g.type, x:g.x, y:g.y, r:g.r, ax:g.ax, ay:g.ay, len:g.len, w:g.w, owner:g.owner }, g.zone));`
  So any telegraph can carry `zone:{ kind, dur, slow, dps, color }` and leaves a zone of its own shape where it landed.
  A line telegraph WITHOUT `dmg` must still leave its zone (today such lines are skipped by the `else if (g.dmg)`; the
  new line goes after that chain so it runs for every landed telegraph).

### 2. `js/13-loop.js`
- Line 94: add `updateZones(dt);` right after `updateTelegraphs(dt);`.
- Line 18: multiply the walking speed by `zoneSlow()`: `const sp = pSpeed() * Math.min(1, mag) * (player.atkT > 0 ? 0.55 : 1) * zoneSlow();`
- Debug hook (line 113 onward): add `get zones() { return zones; },` next to `get telegraphs()`, and add `addZone, updateZones, zoneSlow` to the list of functions.

### 3. `js/08-dungeon.js`
Every line that sets `telegraphs = [];` (lines 15, 79, 98, 115, 224) also sets `zones = [];` on the same line.

### 4. `js/11-render-world.js` — 2D drawing
After `drawTelegraph` (ends line 1072) add `function drawZone(z)`:
- Fade: `const a = clamp(Math.min(z.t/0.3, (z.dur - z.t)/0.6), 0, 1);` multiply every alpha by `a`.
- A stable per-zone random from its position (never `Math.random` in drawing; it would flicker):
  `const h = k => { const s = Math.sin(z.x*12.9898 + z.y*78.233 + k*37.719)*43758.5453; return s - Math.floor(s); };`
- circle zones, by kind:
  - `web`: colour `#d8d0e8`. 7 spokes from the centre to the edge at angles `i/7*TAU + (h(i)-0.5)*0.5`, then 3 rings made of
    straight segments joining the spoke points at 0.3, 0.6 and 0.95 of the radius (a real cobweb, not circles). lineWidth 1.2, alpha 0.45*a.
    A faint fill disc under it, alpha 0.08*a. It must read as a cobweb; never draw a regular star or symbol.
  - `fire`: disc colour `#ff6622` alpha 0.2*a, then an inner disc radius 0.7*r colour `#ffaa33` alpha `(0.12 + 0.08*Math.sin(clock*9 + z.x))*a`, then a stroke of the edge `#ff6622` alpha 0.5*a lineWidth 2.
  - `rubble`: disc colour `#8a7a66` alpha 0.22*a, then 6 stones: discs of radius `4 + h(i)*5` colour `#3a332b` alpha 0.8*a at angle `h(i+10)*TAU`, distance `h(i+20)*0.8*r` from the centre.
  - `blood`: disc colour `#aa1133` alpha 0.25*a, edge stroke `#ff3355` alpha 0.5*a lineWidth 1.5.
  - anything else: disc `z.color` alpha 0.2*a.
- line zones: the same colours as a rectangle, drawn like the line branch of `drawTelegraph` (translate to x, y, rotate by
  `Math.atan2(z.ay, z.ax)`, `fillRect(0, -z.w/2, z.len, z.w)` with the kind's fill alpha, then `strokeRect` with its edge alpha;
  web and rubble lines: fill only). Fire lines get the same flicker on a second, narrower rect (`w*0.6`).
- Reset `ctx.globalAlpha = 1` at the end. Use the existing helpers `disc`, `clamp`, `TAU`, `clock`.

### 5. `js/12-render-fx.js`
Lines 75-76 draw the telegraphs (inside a clip when there is a layout). Draw the zones FIRST, inside the same clip, in both branches:
`... ctx.clip(); zones.forEach(drawZone); telegraphs.forEach(drawTelegraph); ctx.restore(); }` and `else { zones.forEach(drawZone); telegraphs.forEach(drawTelegraph); }`.

### 6. `3d/render3d.js` — 3D drawing
- Line 890: add `zoneMeshes = new Map()` to the `const orbMeshes = ..., telegraphMeshes = new Map();` line.
- Line 951: add `zoneMeshes` to the array passed to `pruneMap` there.
- Right after the telegraph block (it ends at line 1096 with `pruneMap(telegraphMeshes, activeTele);`) and before
  `renderer.render(...)`, add a zone block in the same style:
  - For each `z` of `(typeof zones !== 'undefined' ? zones : [])`: get or make a mesh in `zoneMeshes`.
    Geometry: circle → `new THREE.CircleGeometry(z.r || 50, 32)` rotated `rotateX(-Math.PI/2)`; line → `new THREE.PlaneGeometry(z.w || 20, z.len || 100)` rotated the same.
    Material: `new THREE.MeshBasicMaterial({ color, transparent:true, opacity:0.3, side:THREE.DoubleSide, depthWrite:false })`
    with colour by kind: web `0xd8d0e8`, fire `0xff6622`, rubble `0x8a7a66`, blood `0xaa1133`, else `z.color || 0xff4444`.
    `m.userData.disposeGeom = true`.
  - For a `web` circle make a `THREE.Group` holding that disc (opacity 0.12) and a second mesh with
    `new THREE.CircleGeometry(z.r, 7)` rotated flat and `new THREE.MeshBasicMaterial({ color:0xd8d0e8, wireframe:true, transparent:true, opacity:0.6, depthWrite:false })`
    raised 0.3 above the disc (each child `userData.disposeGeom = true`; `disposeNode` already disposes one level of children).
  - Every frame: fade `a = clamp(Math.min(z.t/0.3, (z.dur - z.t)/0.6), 0, 1)`; set the opacity of the mesh (or of each child)
    to its base opacity times `a`; fire flickers: base `0.3 + 0.12*Math.sin(clock*9 + z.x)`.
    Position: circle at `(z.x, 0.8, z.y)` (under the telegraphs, which sit at 1.2); line placed exactly like the telegraph
    line branch (lines 1090-1094) but at height 0.8.
  - `pruneMap(zoneMeshes, activeZones);` at the end of the block.

## Constraints
- Do not touch `js/01-data.js`, any boss pattern, `index.html`, `3d/index.html`, or the `?v=` stamps. Do NOT run `tools/stamp.sh`.
- No new files. No new dependencies.
- Match the surrounding code style: compact one-line statements, short names, a short comment only where the reason is not obvious.
- Keep the 2D look tasteful: zones sit under everything else and never cover the hunter.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints no duplicate names.
- `node tools/test_layout.js` ends with `PASS 8000`; `node tools/test_gear.js` and `node tools/test_army.js` pass.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error (it loads every `js/` script in a
  Node sandbox; the zone code must not touch the DOM).
- `node tools/balance_bot.js` still runs to the end without an error (about 20 seconds; numbers may vary).

## Done when
All six changes are in, the checks pass, and a zone pushed by hand with `addZone({ type:'circle', x:player.x, y:player.y, r:120, dur:5, kind:'fire', dps:100 })`
would hurt a standing hunter twice a second, not hurt one who is dodging, and slow him when `slow` is set. Commit nothing yourself.
