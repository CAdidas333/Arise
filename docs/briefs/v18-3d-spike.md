# Brief: a 3D view of the same game (experiment)

Everything you need is in this repo. Do not read or write anything outside it, and do not download anything. Read only what is named below.

## Goal
`Arise` is a 2D canvas action game. Its scripts in `js/` are classic `<script>` files that share one global scope. The game rules (movement, enemies, combat, menus, HUD) live in `js/01` to `js/10` and `js/13`; the 2D drawing lives in `js/11-render-world.js` and `js/12-render-fx.js`.

Build an experimental page, `3d/index.html`, that runs the **same game rules** but draws the fight in 3D with three.js, seen from a third-person camera behind and above the hunter. Simple solid shapes stand in for characters. The 2D game must keep working exactly as it does now.

three.js r149 is already in the repo as `3d/vendor/three.min.js` (a classic script that defines the global `THREE`). Use only what is in that file: no loaders, no addons, no imports.

## Files
1. **`3d/index.html`** — start from a copy of the root `index.html` (`cp index.html 3d/index.html`). Then, in the copy only:
   - change `href="manifest.json"` to `href="../manifest.json"`;
   - change every `src="js/` to `src="../js/`;
   - delete the two script tags for `11-render-world.js` and `12-render-fx.js`;
   - directly before the `13-loop.js` tag add `<script src="vendor/three.min.js"></script>` and `<script src="render3d.js"></script>`;
   - in the title screen, change the text `MONARCH UPDATE &nbsp;·&nbsp; V17` to `3D EXPERIMENT`.
   Leave all CSS and other markup alone.
2. **`3d/render3d.js`** — new classic script (no `import`/`export`). It must define two global functions the game calls: `buildFloor(g)` and `draw()`.
3. **`js/07-skills-shadows.js` line 7** — the one line `const mouseWorld = () => ({ x:(mouse.x-W/2)/camera.zoom + camera.x, y:(mouse.y-H/2)/camera.zoom + camera.y });` becomes `const mouseWorld = () => window.mouseWorld3D ? window.mouseWorld3D() : ({ x:(mouse.x-W/2)/camera.zoom + camera.x, y:(mouse.y-H/2)/camera.zoom + camera.y });`. Nothing else in `js/` changes.

## Game state you can read (globals; read them, never replace them)
- `gameState`: `'TITLE'`, `'CREATE'`, `'HUB'` or `'DUNGEON'`. `dungeon` is `null` outside a gate; inside, `dungeon.gate.id` (for example `'e_gate'`), `dungeon.gate.floor` (optional file name override), `dungeon.gate.theme.line` (a colour string), `dungeon.state`.
- `W`, `H` (viewport size in CSS pixels), `DPR`, `clock` (seconds since load), `arenaW`, `arenaH` (the arena is centred on the origin and grows for boss fights), `COLORS.primary`, `COLORS.accent`, `legionTimer`.
- `camera`: `{ x, y, shake, zoom }` — the game's own smoothed 2D camera. Use `camera.x, camera.y` as the point to look at (it already follows the hunter and pans to bosses).
- `player`: `{ x, y, facing:{x,y}, anim ('idle'|'run'|'attack'|'dash'), atkT, atkDur, inv, hitFlash, ultT, hp, shadows:[...] }`.
- `enemies`: array of `{ x, y, size, color, kind ('melee'|'ranged'|'charger'|'bomber'|'brute'|'caster'), isBoss, elite, alive, spawnT, hitFlash, facing:{x,y}, animT, state }`. Skip entries with `alive === false`.
- `player.shadows`: array of `{ x, y, active, kind (as above, or 'boss'), grade, facing, atkT }`. Draw only `active` ones.
- `projectiles`: `{ x, y, size, color, fromEnemy }`. `orbs`: `{ x, y, type ('gold'|'hp') }`. `remnants`: `{ x, y }`.
- `telegraphs`: `{ type:'circle', x, y, r, t, dur, color }` or `{ type:'line', x, y, ax, ay, len, w, t, dur, color }` (a warning area on the ground; `t/dur` is how far through its countdown it is).

Mapping: game `x` → three `x`, game `y` → three `z`, up is three `y`. Use game units directly (the hunter is about 45 units tall, a small enemy has `size` 14, a boss 34 to 66).

## What `render3d.js` does
- **Setup (once, at load):** create a `THREE.WebGLRenderer({ antialias:true })`, give its canvas `id="gl"` and the style `position:fixed; top:0; left:0; z-index:1; display:block`, append it to `document.body`, and hide the 2D canvas (`document.getElementById('gameCanvas').style.display = 'none'`). Scene background `0x06060c`, `THREE.Fog(0x06060c, 900, 2600)`. Lights: a dim `AmbientLight`, a `DirectionalLight` from above, and a `PointLight` in `COLORS.primary` that follows the hunter. A `PerspectiveCamera` (fov 50, near 10, far 6000).
- **`buildFloor(g)`:** remember the gate. Load `'../assets/floors/' + (g.floor || g.id) + '.webp'` with `new THREE.TextureLoader().load(...)`, set `wrapS = wrapT = THREE.RepeatWrapping`, and use it on the floor material. Until it loads (or if it fails) the floor is a plain dark colour.
- **Floor and walls:** a flat plane of `arenaW` by `arenaH` on the ground, texture repeating once every 384 units, plus four thin glowing walls about 30 units high around the edge in `g.theme.line`. `arenaW/arenaH` change during a fight, so check each frame and rebuild the floor and walls when they change.
- **`draw()`** (called every frame):
  - if the renderer size differs from `W, H`, call `renderer.setPixelRatio(DPR)`, `renderer.setSize(W, H)` and update the camera aspect;
  - if `gameState !== 'DUNGEON'` or there is no `dungeon`, just render the empty scene and return;
  - camera: look-at point `L = (camera.x, 20, camera.y)`; position `L + (0, 430, 560)` divided by nothing fancy, plus a random offset of up to `camera.shake` on x and y; `lookAt(L)`;
  - **hunter:** a group: a cylinder body, a sphere head, a thin box sword held to one side. Colour `COLORS.primary` with a matching emissive; purple while `player.ultT > 0`; red while `player.hitFlash > 0`. Place at the hunter's position and turn it to face `player.facing`. While `player.atkT > 0` swing the sword (rotate it through about 140 degrees over `player.atkDur`). Hide it when `dungeon.state === 'dead'`;
  - **enemies:** one mesh each, shape by kind — `melee` sphere, `ranged` cone, `charger` cone lying on its side pointing along `facing`, `bomber` icosahedron that pulses, `brute` box, `caster` octahedron floating a little above the ground; a boss is a large dodecahedron with a flat ring under it. Radius about `size`. Colour `e.color`; white emissive while `e.hitFlash > 0`; scale up from 0 while `e.spawnT > 0`; elites get a gold emissive tint;
  - **shadows:** the same shapes by `kind` (a `'boss'` shadow uses the dodecahedron at radius 28), dark purple with a purple emissive, brighter while `legionTimer > 0`;
  - **projectiles:** small emissive spheres about 12 units above the ground in `p.color`; **orbs:** small spheres (gold or green); **remnants:** a small purple cone;
  - **telegraphs:** flat shapes just above the ground (a `CircleGeometry` or a `PlaneGeometry` laid flat), in `g.color`, transparent, with opacity rising from 0.15 to 0.55 as `t/dur` goes from 0 to 1. A `'line'` telegraph is a rectangle `len` long and `w` wide starting at `(x, y)` and pointing along `(ax, ay)`;
  - keep a `Map` from each game object to its mesh for every list above: create the mesh the first time an object is seen, update it each frame, and remove (and `dispose` the geometry of) meshes whose object is gone or dead. Share materials and geometries where that is easy;
  - finally `renderer.render(scene, cam)`.
- **`window.mouseWorld3D`:** return `{ x, y }` in game coordinates for where the mouse points on the ground: build a `THREE.Raycaster` from `mouse.x, mouse.y` (CSS pixels; the global `mouse` has them) through the camera and intersect the plane `y = 0`; return `{ x: point.x, y: point.z }`. If there is no hit, return `{ x: player.x, y: player.y }`.

## Constraints
- New or changed files are exactly: `3d/index.html`, `3d/render3d.js`, and the one line in `js/07-skills-shadows.js`. Do not touch the root `index.html`, other `js/` files, `assets/`, `docs/`, `tools/` or `3d/vendor/`.
- No star shapes, runes or symbols.
- `render3d.js` must not throw when `player` is `null` (title screen) or lists are empty.
- Commit only those three files.

## Checks to run before you finish
```bash
node --check 3d/render3d.js && echo RENDER_OK
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done
grep -c "vendor/three.min.js" 3d/index.html                       # expect 1
grep -c "11-render-world\|12-render-fx" 3d/index.html             # expect 0
grep -c 'src="../js/' 3d/index.html                               # expect 11
grep -c "function buildFloor\|function draw" 3d/render3d.js       # expect 2
grep -c "mouseWorld3D" js/07-skills-shadows.js 3d/render3d.js     # expect 1 in each
git status --short                                                # expect only the three files
```

## Done looks like
`RENDER_OK`, no `FAIL` lines, the greps match, and `3d/render3d.js` is roughly 200 to 300 lines.
