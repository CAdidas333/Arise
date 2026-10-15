# Brief: 3D view leftovers — minimap, hub backdrop, dodge afterimages, Arise light pillars, floor on the first frame

## Goal
The game has two views over the same rules: the 2D canvas page (`index.html`) and the 3D page (`3d/index.html`, generated
from `index.html` by `tools/sync3d.py`, which swaps `js/11-render-world.js` and `js/12-render-fx.js` for three.js and
`3d/render3d.js`). The 3D view is missing five things the 2D view has. Add them, without changing how the 2D view looks.

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step, no npm). A top-level name declared in
two files stops a whole script loading; `bash tools/check_names.sh` lists clashes. Use exactly the new names below.

In the 3D view the game canvas (`ctx`, size `W` by `H`, already scaled by `DPR`) is a transparent overlay above the
three.js canvas; `drawFx3D()` in `3d/render3d.js` (starts line 1110) draws on it every frame, mostly with
`ctx.globalCompositeOperation = 'lighter'`. `toScreen(x, y, h)` (line 1104) turns a world point at height `h` into
`[sx, sy]` screen pixels or `null`; `pxPer(x, y)` inside `drawFx3D` gives screen pixels per world unit there.

## 1. A shared overlay script: `js/12b-overlay.js` (new file)
Move these, unchanged except as noted, OUT of `js/12-render-fx.js` INTO the new file `js/12b-overlay.js`
(start it with `'use strict';` and a short header comment like the other files):
- `const motes = [];`, the `for` loop that fills it, and `function drawMotes` (lines 6-18)
- `function drawPortal` (lines 20-42) — change it to take the hub picture as an argument: `function drawPortal(hub)`, and use
  `hub` where it now uses `ART.hub` (`if (hub) { const img = hub, ...`).
- `function drawMinimap` (lines 154-199)
In the moved code, replace every call of `disc(` with `dot2(` and define at the top of the new file:
`const dot2 = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };`
(`disc` lives in `js/11-render-world.js`, which the 3D page does not load.)
- In `js/12-render-fx.js` line 231 the call becomes `drawPortal(ART.hub);`. Line 150 (`drawMotes(...)`) and line 230
  (`drawMinimap()`) stay as they are.
- `index.html`: add `<script src="js/12b-overlay.js?v=STAMP"></script>` on the line right after the `js/12-render-fx.js`
  script tag, where STAMP is the same number the other tags carry. Do NOT edit `3d/index.html`; the orchestrator regenerates it.
  The new tag survives `tools/sync3d.py`, so the 3D page will load the new file after `3d/render3d.js`.
- The minimap turns with the 3D camera, so "up" on the map is "away from the camera", as the movement keys already are.
  `viewYaw` (shared, `js/03-state.js`) is 0 in the 2D view, so the 2D minimap does not change. In `drawMinimap`, clip to the
  map rectangle in BOTH cases (today it clips only when there is a layout), then
  `ctx.translate(cx, cy); ctx.rotate(viewYaw || 0); ctx.translate(-cx, -cy);` before drawing rooms, dots and the boss marker,
  and `ctx.restore()` after the hunter's dot (as now, but always). The "MOVE!" warning text under the map stays unrotated.

## 2. `3d/render3d.js` — use them
- Hub backdrop. Near the top of the file (after the scene is set up) add
  `const hubImg3D = new Image(); hubImg3D.src = 'assets/bg/hub.webp';`.
  In `drawFx3D`, the branch that returns early when the game is not in a dungeon (after `ctx.clearRect`): before `return`, draw
  `ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, w, h);`
  then `drawPortal(hubImg3D.complete && hubImg3D.naturalWidth ? hubImg3D : null); drawMotes(COLORS.primary, COLORS.accent, 0);`
  inside a `try` so a missing function can never break the frame.
- Minimap. In the dungeon part of `drawFx3D`, right before the `// 9. Screen flash` block: `ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; drawMinimap();`
- Dodge afterimages. `ghosts` (shared, filled by `ghost()` in `js/04-player-fx.js` and by the dash skill) hold `{ x, y, t, dur }`.
  In the dungeon part of `drawFx3D`, with `'lighter'` composite (put it next to the rings block, section 3), for each ghost:
  `p0 = toScreen(g.x, g.y, 0)`, `p1 = toScreen(g.x, g.y, 75)`; skip if either is null; `hh = p0[1] - p1[1]` (pixel height);
  alpha `(1 - g.t/g.dur)*0.4`, colour `'#00d4ff'`: an ellipse for the body centred at `(p0[0], p0[1] - hh*0.42)` with radii
  `(hh*0.17, hh*0.34)` and a circle for the head at `(p0[0], p0[1] - hh*0.86)` radius `hh*0.11`. A faint wider glow first
  (same shapes, radii x1.6, alpha x0.35). Reset `ctx.globalAlpha = 1` after.
- Arise light pillars. In `js/04-player-fx.js` add `let pillarFx = [];` on the line above `function arisePillar` (line 114);
  in `arisePillar` push `pillarFx.push({ x, y, big, t:0, dur:big ? 1.1 : 0.8 });`; in `updateFx` add `tick(pillarFx);` to
  the `tick(rings); tick(arcs); ...` line (line 130). The 2D view ignores `pillarFx` (it already shows the particles).
  In `drawFx3D` (dungeon part, `'lighter'`), for each `pl` of `pillarFx`: height `pl.big ? 380 : 240` world units, width
  `(pl.big ? 70 : 40) * pxPer(pl.x, pl.y)` pixels; `p0 = toScreen(pl.x, pl.y, 0)`, `p1 = toScreen(pl.x, pl.y, height)`; skip
  if null; strength `s = Math.sin(Math.PI * pl.t/pl.dur)`; a vertical linear gradient from p0 to p1, colour `COLORS.accent`
  at alpha `0.55*s` at the bottom to transparent at the top, filled as a rectangle `width` wide centred on the line p0-p1
  (it is close to vertical on screen; use `ctx.save(); translate to p0; rotate so p1 is straight up; fillRect; ctx.restore()`),
  then a core `width*0.28` wide in `'#ddbbff'` at alpha `0.7*s`. Plain column of light only: no symbols, no rings of marks.
- Floor on the first frame (thread G5). `buildFloor(g)` (line 191) starts a new `THREE.TextureLoader().load` every time a gate
  starts, so the floor is plain dark until the file arrives. Add `const floorTexCache = {};` and a helper that loads a floor url
  once into the cache (`floorTexCache[url] = tex` in the load callback, with `wrapS = wrapT = THREE.RepeatWrapping`). At
  script load, warm the cache for every gate: `GATE_DEFS.forEach(g => warmFloor('assets/floors/' + (g.floor || g.id) + '.webp'))`.
  In `buildFloor`, when the texture for the url is already in the cache, apply it at once (set `tex.repeat` exactly as the
  load callback does now, `tex.needsUpdate = true`, `floorMaterial.map = tex`, colour white, `needsUpdate`); otherwise keep the
  present path but store the loaded texture in the cache. Keep the error path as it is. Name the helper `warmFloor`.

## Constraints
- The 2D view must look exactly as before (the only 2D-visible change allowed is that the minimap is now always clipped to its box).
- Do not touch `js/05-enemies.js`, `js/08-dungeon.js`, `js/03-state.js`, `js/13-loop.js`, `js/11-render-world.js`, or the
  telegraph block inside `draw()` in `3d/render3d.js` (lines 1073-1096): another job is changing those right now.
- Do not edit `3d/index.html` and do NOT run `tools/stamp.sh`. No new dependencies.
- Match the surrounding style: compact statements, short names, a comment only where the reason is not obvious.
- Art rule: no star shapes, runes, glyph-like marks, crosses, halos, occult or religious imagery.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`.
- `node tools/test_layout.js` ends with `PASS 8000`; `node tools/test_gear.js` and `node tools/test_army.js` pass.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error (it loads every `js/` script, including the new one).
- `python3 tools/sync3d.py` runs, then `git diff --stat 3d/index.html` shows the new script tag; then `git checkout 3d/index.html`
  so you leave it unchanged.
- Look at your work: serve the repo (`python3 -m http.server 8790` from the repo root, in the background), take a headless
  Chrome screenshot of `http://127.0.0.1:8790/3d/` (the title screen should show the gate backdrop, not black) and of
  `http://127.0.0.1:8790/` (unchanged), e.g.
  `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --window-size=1280,800 --virtual-time-budget=4000 --screenshot=.worker/arise3d.png http://127.0.0.1:8790/3d/`.
  Save screenshots only inside `.worker/` (it is never committed) and LOOK at them. Stop the server afterwards.

## Done when
The five items are in, the checks pass, both pages load with no console errors, and the 3D title screen shows the backdrop.
Commit nothing yourself.
