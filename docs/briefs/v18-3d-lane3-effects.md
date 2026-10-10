# 3D lane, job 3: draw the fight effects in the 3D view (hit sparks, damage numbers, rings, slashes, lightning)

## Goal
The 3D view (`3d/render3d.js`) draws bodies, shots and warning areas only. The game already keeps every effect as plain data that the 2D view draws; the 3D view ignores it, so a 3D fight is hard to read. Draw those effects in the 3D view by projecting them onto a transparent 2D canvas that sits on top of the 3D picture.

## Not in this job
Only `3d/render3d.js` changes. Do not touch `index.html`, `3d/index.html`, anything in `js/`, `tools/`, `assets/` or `docs/`. Do not run `tools/stamp.sh`. No new files. No afterimages, no light pillars, no hub backdrop, no new 3D meshes for effects.

## What already exists (read before you start)
- The 3D page loads every game script except `js/11-render-world.js` and `js/12-render-fx.js`. So these globals exist and are updated every frame by the game: `particles`, `rings`, `arcs`, `bolts`, `texts`, `screenFlash`, `clock`, `W`, `H`, `DPR`, `canvas` (the 2D game canvas, id `gameCanvas`) and `ctx` (its 2D context). Use `typeof` guards like the rest of this file.
- Their shapes (from `js/04-player-fx.js`), all positions in world units where world x is 3D x and world y is 3D z:
  - `particles`: `{ x, y, vx, vy, size, life, max, color, type, alpha }`; `type` is `'glow'`, `'spark'` or `'smoke'`.
  - `rings`: `{ x, y, color, r0, r1, t, dur, w }`.
  - `arcs` (slash crescents): `{ x, y, r, a, span, dir, color, w, t, dur }`; `a` is the centre angle on the ground, measured like `Math.atan2(dy, dx)` in world x and y.
  - `bolts` (lightning): `{ pts: [[x, y], ...], t, dur, color }`.
  - `texts` (damage numbers and other floating text): `{ x, y, text, color, size, t, dur }`.
  - `screenFlash`: `{ alpha, color }`.
- How the 2D view draws each one: `js/12-render-fx.js`, the loops `for (const r of rings)`, `for (const a of arcs)`, `for (const b of bolts)`, `for (const p of particles)` and `for (const t of texts)`. Copy the same formulas for alpha, line width, radius growth and the text "pop"; only the positions change (projected, see below).
- Near the top of `3d/render3d.js` the game canvas is hidden: `if (_gameCanvas) _gameCanvas.style.display = 'none';`. The 3D canvas has id `gl` and `z-index: 1`. In the page CSS every `canvas` is `position: fixed; z-index: 1`, the HUD layers are `z-index: 10` and above.

## Changes (all in `3d/render3d.js`)

### 1. Turn the game canvas into the effects overlay
Replace the line that hides `_gameCanvas` with code that keeps it visible, transparent and above the 3D canvas but below the HUD:
`_gameCanvas.style.display = 'block'; _gameCanvas.style.background = 'transparent'; _gameCanvas.style.zIndex = '2';`
Leave `#gl` at `z-index: 1`. Mouse events must keep reaching the game: the overlay being on top is intended (the game's own `mousedown` handler only acts when the event target is the game canvas, so this also makes left-click attack work in the 3D view). In the existing `wheel` listener the check `e.target === renderer.domElement || e.target === _gameCanvas` already covers it.

### 2. A projection helper
```js
const _pv = new THREE.Vector3();
// World (x, y) at height h -> overlay pixels, or null when behind the camera
function toScreen(x, y, h) {
  _pv.set(x, h || 0, y).project(camera3D);
  if (_pv.z > 1 || _pv.z < -1) return null;
  return [(_pv.x + 1) / 2 * W, (1 - _pv.y) / 2 * H];
}
```

### 3. `drawFx3D()`, called at the very end of `draw()`, after the final `renderer.render(scene, camera3D)`
(After rendering, so the camera matrices are current.) Also call it, to clear the overlay, in the early-return branch at the top of `draw()` (not in a dungeon): in that branch just clear the overlay and return.

Inside `drawFx3D()`:
1. `ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';`
2. A local scale helper: pixels per world unit near a point, `pxPer(x, y)` = distance on screen between `toScreen(x, y, 0)` and `toScreen(x, y, 10)` divided by 10 (return 1 if either is null). Use it for particle sizes and line widths so far effects are smaller.
3. **Rings**: for each ring compute the 2D view's `p`, `rad`, alpha and line width, then stroke a closed polyline through 40 points around the circle of radius `rad` on the ground at height 2 (project each with `toScreen`; skip the ring if any point is null).
4. **Slash arcs**: same three strokes as the 2D view (radii `a.r*0.76`, `a.r*0.86`, `a.r*0.92`; same colours, alphas and widths), each as a projected polyline of 16 points from angle `lo` to `hi`, at height 16. A ground point at angle `ang` and radius `rr` is `(a.x + Math.cos(ang)*rr, a.y + Math.sin(ang)*rr)`.
5. **Bolts**: projected polyline through `b.pts` at height 18, two strokes as in the 2D view.
6. **Particles**: skip none. Project at height 12. `'spark'`: a line from the particle to `(p.x - p.vx*0.045, p.y - p.vy*0.045)`, width `Math.max(1, p.size*0.7*pxPer)`. `'glow'`: a filled circle of radius `Math.max(1, p.size*(0.4 + 0.6*k)*pxPer)` plus the faint wider halo as in the 2D view. `'smoke'`: switch to `'source-over'` for it, a filled circle of radius `p.size*(1.7 - k*0.7)*pxPer` at alpha `p.alpha*k`, then switch back. Cap the work: if there are more than 600 particles draw only every second one.
7. Set `ctx.globalCompositeOperation = 'source-over'`.
8. **Texts**: at `toScreen(t.x, t.y, 36)`. Same font, pop, alpha, black outline and fill as the 2D view (`bold ${Math.round(t.size*pop)}px Orbitron, monospace`, `textAlign = 'center'`). The text size is in screen pixels and does not scale with distance, so numbers stay readable.
9. **Screen flash**: if `screenFlash.alpha > 0`, fill the whole overlay with `screenFlash.color` at that alpha.
10. End with `ctx.globalAlpha = 1;`.

Wrap the body of `drawFx3D()` in `try { ... } catch (err) { if (!drawFx3D.warned) { drawFx3D.warned = true; console.error('[ARISE 3D fx]', err); } }` so a fault in the overlay can never stop the 3D picture.

## Checks to run before you finish
```bash
for f in js/*.js 3d/render3d.js; do node --check "$f" || echo "FAIL $f"; done
grep -c "function drawFx3D" 3d/render3d.js                  # expect 1
grep -c "function toScreen" 3d/render3d.js                  # expect 1
grep -c "_gameCanvas.style.display = 'none'" 3d/render3d.js # expect 0
grep -c "drawFx3D()" 3d/render3d.js                         # expect 2 or more (the calls)
git status --short                                          # expect only 3d/render3d.js
```

## Done looks like
No `FAIL` lines, the greps match, one file changed. In the 3D view a hit shows sparks and a damage number above the enemy, a slash shows its crescent in front of the hunter lying in the ground plane, rings spread flat on the floor in correct perspective at any camera angle, and nothing is drawn on the overlay outside a dungeon.
