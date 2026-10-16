# Brief: 3D view — the ten things the 2D view shows that the 3D view does not

## Goal
`docs/briefs/v18-3d-parity-audit.md` (read it first) compared the two views. Build its ten "Top gaps" in the 3D view so a
player in 3D sees the same warnings, targets and prompts as in 2D. Change ONLY `3d/render3d.js`. Copy the 2D look given below;
the 2D view must not change.

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). A top-level name declared twice stops
a whole script loading; `bash tools/check_names.sh` lists clashes. Put helpers INSIDE `drawFx3D` or `draw` as local functions,
or use exactly the new top-level names below.

## How the 3D view draws (read these parts of `3d/render3d.js`)
- `draw()` places meshes every frame (hunter at "// Hunter" about line 1226, projectiles at "// Projectiles" about line 1268).
- `drawFx3D()` (about line 1395) draws on the 2D overlay canvas `ctx` (size `w` by `h`), mostly with
  `ctx.globalCompositeOperation = 'lighter'`. `toScreen(x, y, h)` turns a world point at height `h` into `[sx, sy]` or `null`;
  `pxPer(x, y)` (inside `drawFx3D`) is screen pixels per world unit there. See section "3. Rings" for how a world circle is
  drawn as a projected polyline, section "3b" for the ring under the target, "8b" for the edge arrow, and `drawMinimap()` near the end.
- Shared globals you may read: `player`, `enemies`, `projectiles`, `remnants`, `orbs`, `dungeon`, `clock`, `isMobile`, `COLORS`,
  `GEAR_COLORS` (CSS colours by rarity, `js/01-data.js`), and `glowTex3D()` (a soft round CanvasTexture, already in `render3d.js`).

## The ten changes
1. **Enemy health bars** (2D: `drawEnemy` in `js/11-render-world.js`, the block `if (!e.isBoss && e.hp < e.maxHp)`). In
   `drawFx3D`, with `source-over`, after section 3b: for each living enemy that is not a boss, has finished spawning
   (`e.spawnT <= 0`) and has `e.hp < e.maxHp`: `p = toScreen(e.x, e.y, (e.size || 14)*2.4 + 12)`; skip if null. Bar width
   `clamp((e.size || 14)*2.4*pxPer(e.x, e.y), 16, 80)` pixels, 4 high, centred on `p`. Back `rgba(0,0,0,0.65)`, fill
   `e.elite ? '#ffcc66' : e.hp > e.maxHp*0.3 ? COLORS.health : COLORS.danger`, filled to `e.hp/e.maxHp`.
2. **"[E] ARISE" prompt** (2D: `drawPickups`, the `if (dist(player.x, player.y, r.x, r.y) < 95)` block). In `drawFx3D` with
   `source-over`: for each remnant within 95 of the hunter, `fade = Math.min(1, (r.dur - r.t)/2)`, `p = toScreen(r.x, r.y, 60)`,
   `ctx.globalAlpha = fade*(0.7 + 0.3*Math.sin(clock*8))`, `fillStyle '#ddbbff'`, `font 'bold 12px Orbitron, monospace'`,
   centred, text `isMobile ? 'ARISE' : '[E]  ARISE'`.
3. **Edge arrow to the boss during the hunt** (2D: `drawIndicators` in `js/12-render-fx.js`). Section 8b only runs between
   chambers (it needs `layout`, which is null in the boss arena, and it skips when a boss is alive). Turn the arrow drawing in
   8b into a local function `edgeArrow(tx, ty, col)` inside `drawFx3D` (same look: distance in metres above, the arrow shape),
   keep 8b calling it as now, and add: when `dungeon.state === 'fight'` and `dungeon.bossRef && dungeon.bossRef.alive`, call
   `edgeArrow(b.x, b.y, '#ff3344')` ONLY when the boss is off screen: `toScreen(b.x, b.y, 20)` is null or outside
   `[70, w-70] x [70, h-70]`.
4. **Low health and Awakening at the screen edge** (2D: `drawPost`). In `drawFx3D`, right after `drawMinimap()` and before the
   screen flash: `hp = player.hp/player.maxHp`; `c = toScreen(player.x, player.y, 30) || [w/2, h/2]`, `R = Math.max(w, h)`; a
   radial gradient at `c` from radius `R*0.16` (transparent) to `R*0.75`: `'rgba(50,0,0,0.78)'` when `hp < 0.3`, else
   `'rgba(22,0,48,0.5)'` when `player.ultT > 0`, else draw nothing (the 3D scene has its own lighting, so no plain dark
   vignette). Then, when `hp < 0.25 && player.hp > 0`, a red full-screen fill `#ff0000` at alpha `(Math.sin(clock*4)*0.5 + 0.5)*0.14`.
5. **Elite and boss aura arc** (2D: `drawEnemy`, the rotating `ctx.arc(e.x, e.y, sz*1.5, clock*2, clock*2 + 4.2)`). In
   `drawFx3D` with `lighter`, for each living elite or boss that has finished spawning: a projected polyline of 24 points on the
   circle of radius `e.size*1.5` round `(e.x, e.y)` at height 2, angles from `clock*2` to `clock*2 + 4.2`, lineWidth 1.5,
   alpha 0.7, colour `e.isBoss ? (e.phase >= 2 ? '#ff2222' : COLORS.danger) : '#ffcc66'` (copy the polyline method of section 3).
6. **Projectile glow** (2D: the projectile loop in `drawWorld`, `js/12-render-fx.js`). In `drawFx3D` with `lighter`, for each
   projectile without `p.crescent`: `q = toScreen(p.x, p.y, 12)`, `s = (p.size || 5)*pxPer(p.x, p.y)`; a disc of radius `s*2.6`
   in `p.color` at alpha 0.3, then a white core disc of radius `s*0.45` at alpha 1. For `p.crescent` projectiles: hide their
   sphere in `draw()` (`m.visible = !p.crescent`) and draw the crescent on the overlay like 2D: an arc of radius
   `p.size*1.2*pxPer` centred `p.size*pxPer` behind `q` along the shot's screen direction, spanning ±0.9 radians round that
   direction, lineWidth 9 in `p.color` (alpha `Math.min(1, p.life*4)`), then lineWidth 2.5 in white. The screen direction is the
   angle from `q` to `toScreen(p.x + Math.cos(p.a)*20, p.y + Math.sin(p.a)*20, 12)`.
7. **The hunter blinks while invulnerable** (2D: `drawPlayer`, alpha `0.5 + Math.sin(clock*40)*0.3` when
   `player.inv > 0 && player.dodgeT <= 0 && player.hitFlash <= 0`). In `draw()` under "// Hunter", after the position is set:
   `hunterGroup.visible = !(player.inv > 0 && player.dodgeT <= 0 && player.hitFlash <= 0 && Math.sin(clock*40) < -0.3);`
   (it must still be `true` the rest of the time, and the existing non-dungeon branch still hides it).
8. **Light under the hunter, violet when Awakened** (2D: the radial gradient in `drawPlayer`: radius 64 cyan
   `rgba(0,212,255,0.17)`, Awakened radius 120 violet `rgba(136,68,255,0.5)`). New top-level `const hunterGlow3D`: a flat
   `PlaneGeometry(2, 2)` rotated `rotateX(-Math.PI/2)`, `MeshBasicMaterial({ map: glowTex3D(), color: 0x00d4ff, transparent:true,
   opacity:0.35, blending:THREE.AdditiveBlending, depthWrite:false })`, added to the scene once. Each frame in the dungeon:
   position `(player.x, 0.7, player.y)`, scale `R` on x and z (64, or 120 when `player.ultT > 0`), colour `0x8844ff` and opacity
   0.6 when Awakened, else `0x00d4ff` and 0.35; hidden outside a dungeon (where `hunterGroup.visible = false` is set).
9. **Gear drop glow** (2D: `drawPickups`, the gem over a soft glow). In `drawFx3D` with `lighter`: for each `orbs` entry with
   `o.type === 'gear'`: a radial glow at `toScreen(o.x, o.y, 8)` of radius `22*pxPer` in `GEAR_COLORS[o.item.rarity] || GEAR_COLORS[0]`
   at alpha 0.35 (centre) fading to 0.
10. **Remnant glow** (2D: `drawPickups`, the disc `COLORS.accent` at alpha `0.25*fade`, radius `26 + Math.sin(clock*7 + r.x)*3`).
   In `drawFx3D` with `lighter`: a radial glow at `toScreen(r.x, r.y, 10)` of radius `(26 + Math.sin(clock*7 + r.x)*3)*pxPer`
   in `COLORS.accent`, alpha `0.25*fade` at the centre fading to 0.

Never create a gradient or object per frame that you can make once, EXCEPT radial gradients for the overlay glows (they depend on
the screen position; that is what the existing overlay code does too). Wrap nothing in new try/catch: `drawFx3D` already has one.

## Constraints
- Only `3d/render3d.js` changes. Do not edit `index.html`, `3d/index.html` or any `js/` file, and do NOT run `tools/stamp.sh`.
- Art rule: plain glows, bars, text and arcs only. No star shapes, runes, glyph-like marks, crosses, halos, occult or religious imagery.
- Match the surrounding style: compact statements, short names, a comment per numbered item saying what the player sees.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`.
- `node tools/test_layout.js` ends with `PASS 8000`; `node tools/test_gear.js` and `node tools/test_army.js` pass.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.
- Look at your work if your sandbox can run Chrome: serve the repo (`python3 -m http.server 8790`, background), copy
  `3d/index.html` to `.worker/shot3d.html` with `<base href="../../">` in place of `<base href="../">`, and before `</body>` add a
  script that on `load` plus 800 ms runs `gameState='HUB'; hide('title-screen'); player=createPlayer('Shot'); player.story.opening=true; startDungeon(GATE_DEFS[1]); for(let i=0;i<240;i++) step(1/60); enemies.forEach(e => e.hp = e.maxHp*0.5); player.hp = player.maxHp*0.2;`
  then capture `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --user-data-dir=.worker/chprof --hide-scrollbars --window-size=1280,800 --virtual-time-budget=1300 --run-all-compositor-stages-before-draw --screenshot=.worker/parity3d.png http://127.0.0.1:8790/.worker/shot3d.html#debug`
  and look: health bars over the enemies, the red low-health edge. Keep every file you make inside `.worker/`. Stop the server.

## Done when
All ten items are in, the checks pass, the 3D page loads with no console errors, and nothing in the 2D view changed. Commit nothing yourself.
