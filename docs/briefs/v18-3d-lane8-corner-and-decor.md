# Brief: the top-right corner clash (U12) and the 3D view's last decoration (U13)

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). A top-level name declared twice stops
a whole script loading; `bash tools/check_names.sh` lists clashes. Use exactly the new names below. The 2D page loads `js/01`
to `js/13` including `js/11-render-world.js` and `js/12-render-fx.js`; the 3D page (`3d/index.html`, generated, never edit)
loads the same minus those two, plus three.js and `3d/render3d.js`. `js/12b-overlay.js` is loaded by both.

## Part 1 (U12): the edge arrow must never land on the minimap; the minimap clears the boss name on upright phones
Today the minimap sits at the top right (`drawMinimap` in `js/12b-overlay.js`: `mx = W - mw - 20, my = 60`). The edge arrow that
points at an off-screen boss or the next door is drawn at the screen edge (2D: `drawIndicators` in `js/12-render-fx.js`, the
point `ix, iy`; 3D: the local function `edgeArrow` inside `drawFx3D` in `3d/render3d.js`, the point it translates to). When the
target is up and to the right, the arrow and its distance text land on the minimap. On upright phones (portrait, 520 wide or
less) the boss name above the minimap ends exactly where the minimap starts.
1. In `js/12b-overlay.js` add `function minimapBox()` returning `{ x0, y0, x1, y1 }` of the minimap on screen, computed exactly as
   `drawMinimap` computes `mx, my, mw, mh` today, with `y1` extended by 18 to cover the "MOVE!" warning line under it. Change
   `drawMinimap` to take `mx, my, mw, mh` from `minimapBox()` so the two can never disagree.
2. Upright phones: in that computation `my = (H > W && W <= 520) ? 70 : 60` (W and H are the canvas size in CSS pixels, the same
   values the rest of the overlay uses).
3. Add `function edgeClear(x, y)` in `js/12b-overlay.js`: given the screen point where an edge arrow would be drawn, return
   `[x, y]` unchanged unless the point lies inside the minimap box grown by 34 pixels to the left and below (the arrow is about
   26 pixels long and its distance text sits 22 above it); then return `[Math.min(x, W - 70), b.y1 + 40]` (straight down to just
   under the minimap). Call it in both views right before the arrow is translated: 2D `drawIndicators`
   (`const [ix, iy] = edgeClear(W/2 + Math.cos(a)*k, H/2 + Math.sin(a)*k);`) and 3D `edgeArrow` (same idea with its `w, h`).

## Part 2 (U13): the 3D view's decoration (only `3d/render3d.js`)
4. **Floor motes and embers.** In `drawFx3D`, the dungeon part, with `'lighter'` composite, before the minimap: the same drifting
   motes as 2D: `drawMotes(th.ember, th.line, 0.5)` where `th = (dungeon.gate && dungeon.gate.theme) || {}`, falling back to
   `COLORS.accent` and `COLORS.primary` when a colour is missing. Reset to `'source-over'` after.
5. **Torch light pools on the floor.** In `rebuildLayout3D`, where the torches are built (the `torches` list, about line 245): one
   more `THREE.InstancedMesh` of flat planes (`PlaneGeometry(1, 1)` rotated `rotateX(-Math.PI/2)`) lying on the floor in front of
   each torch: centre `(p.x, 0.5, p.y + 70)`, scale 200 wide (x) by 140 deep (z), material
   `MeshBasicMaterial({ color: ember, map: glowTex3D(), transparent:true, opacity:0.22, blending:THREE.AdditiveBlending, depthWrite:false })`
   kept in a new top-level `let torchPoolMat3D = null;` (set to null in `clearFloorAndWalls` like `torchGlowMat3D`). Each frame,
   where the flame and glow flicker is set, `torchPoolMat3D.opacity = 0.18 + 0.05*Math.sin(clk * 5)`. Push it into `layoutMeshes`.
6. **Soft ground shadows** under the hunter, every living enemy and boss, and every active shadow soldier. One new top-level
   `const groundShadows3D`: a `THREE.InstancedMesh` of `PlaneGeometry(1, 1)` rotated flat, material
   `MeshBasicMaterial({ color:0x000000, alphaMap: glowTex3D(), transparent:true, opacity:0.45, depthWrite:false })`, capacity 160,
   added to the scene once. Each frame in the dungeon part of `draw()` (after the hunter, enemies and shadows are placed): write one
   instance per figure at `(x, 0.4, y)` scaled `r*2.4` on x and z where `r` is the figure's size (`e.size`, the hunter 16, a shadow
   soldier its `size` or 14), set `groundShadows3D.count` to the number written, and `instanceMatrix.needsUpdate = true`. Outside a
   dungeon set `count = 0`. Spawning enemies (`e.spawnT > 0`) get no shadow yet.
7. **Bright outlines on warnings.** 2D draws every telegraph (warning circle or lane) with a bright edge; 3D only fills it. In the
   telegraph block of `draw()` (about line 1324), when a telegraph mesh is first made, add ONE child to it: for a circle a
   `THREE.Mesh(new THREE.RingGeometry((g.r || 50)*0.965, g.r || 50, 48).rotateX(-Math.PI/2), MeshBasicMaterial({ color, transparent:true, opacity:0.9, side:THREE.DoubleSide, depthWrite:false }))`
   raised 0.2; for a lane `new THREE.LineSegments(new THREE.EdgesGeometry(<the same rotated PlaneGeometry>), new THREE.LineBasicMaterial({ color, transparent:true, opacity:0.9 }))`
   raised 0.2. Mark the child `userData.disposeGeom = true` (`disposeNode` already frees one level of children). Keep the outline's
   colour in step with the fill when the fill's colour is set each frame.

## Constraints
- Touch only `js/12b-overlay.js`, `js/12-render-fx.js` (only the `edgeClear` call in `drawIndicators`) and `3d/render3d.js`.
  Do not edit `index.html` or `3d/index.html`, and do NOT run `tools/stamp.sh`.
- The 2D view must look exactly as before except for the arrow position near the minimap and the minimap 10 pixels lower on
  upright phones.
- Nothing created per frame (no new geometry or material per frame). Phones must stay cheap: instanced meshes, a fixed capacity.
- Art rule: plain glows, shadows, motes and edges only. No star shapes, runes, glyph-like marks, crosses, halos, occult or religious imagery.
- Match the surrounding style: compact statements, short names, one short comment per numbered item saying what the player sees.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`.
- `node tools/test_layout.js` ends with `PASS 8000`; `node tools/test_gear.js` and `node tools/test_army.js` pass.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.

## Done when
All seven items are in and every check passes. Commit nothing yourself.
