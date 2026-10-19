# Brief: "ARISE" — a raised shadow climbs up out of a dark pool (both views)

## Goal
Raising a shadow is the game's signature moment (Solo Leveling's "Arise"). Today, pressing E by a remnant makes a purple pillar
and the new shadow soldier simply appears, standing where the enemy fell. Make it rise: the soldier climbs up out of a dark pool
on the floor over 0.8 seconds, with the word ARISE over the spot. Shadows called onto the field later (Arise: Legion, the
Awakening) rise the same way, quicker (0.5 seconds). Both views. Difficulty does not change: a rising shadow neither attacks nor
moves until it is up (a 0.8-second pause is fine).

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). A top-level name declared twice stops a
whole script loading; `bash tools/check_names.sh` lists clashes. The 2D page draws with `js/11-render-world.js`; the 3D page
(`3d/index.html`, generated, never edit) draws with `3d/render3d.js` instead. Both load `js/07-skills-shadows.js`.

## Exact changes
1. **The rise timer** (`js/07-skills-shadows.js`). Two new fields on a shadow: `riseT` (seconds left) and `riseDur` (its length).
   - `addShadow(s)` (about line 223): set `ns.riseT = ns.riseDur = 0.8` and, after the position is set, `floatText(ns.x, ns.y - 50, 'ARISE', '#bb88ff', 30);`.
   - `syncShadowField()` (about line 197): in the branch where a shadow comes onto the field (`!was && want`), set `s.riseT = s.riseDur = 0.5`.
   - `updateShadows(dt)` (about line 244): next to the `lingerT` countdown, `if (s.riseT > 0) s.riseT = Math.max(0, s.riseT - dt);`;
     and in the per-shadow loop, a shadow with `s.riseT > 0` skips its move and attack for that frame (`if (s.riseT > 0) return;`
     at the top of the `active.forEach` callback, after `s.animT += dt`).
   - Saves already store only named shadow fields (`js/03-state.js` line 55), so the two new fields are never saved; treat a missing
     `riseT` as 0 everywhere.
2. **2D** (`js/11-render-world.js`, `drawShadowSoldier(s)`, about line 932). When `s.riseT > 0`, with `p = 1 - s.riseT/s.riseDur`
   (0 at the start, 1 when up), `r` the soldier's size as computed there:
   - Before the body: a dark pool on the floor, `ctx.ellipse(s.x, s.y + r*0.85, r*(1.6 - 0.4*p), r*0.5, 0, 0, TAU)` filled
     `'#120022'` at alpha `0.85*(1 - p*p)`, with a thin `COLORS.accent` edge at alpha `0.6*(1 - p)`.
   - The body rises out of it: clip to everything above the floor line (`ctx.save(); ctx.beginPath(); ctx.rect(s.x - r*3, s.y - r*6, r*6, r*6 + r*0.85); ctx.clip();`)
     and draw the body translated down by `(1 - p)*r*2.4` (so it slides up into view), then `ctx.restore()`.
   - When `riseT` is 0 the drawing is exactly as today.
3. **3D** (`3d/render3d.js`, `function shadow(fig, s, dt, berserk, fx, fy)` inside the `Fig` block, about line 997): when
   `s.riseT > 0`, `p = 1 - s.riseT/s.riseDur`, place the figure at `y = -(1 - p) * ud.h * r` instead of 0 (the same way an enemy
   rises when it spawns: see `function enemy` just above, `fig.position.set(e.x, -(1 - grow) * ud.h * k, e.y)`). The floor hides
   the part below ground. Also a dark pool: one new top-level `const risePools3D` InstancedMesh of `PlaneGeometry(1, 1)` rotated
   flat, `MeshBasicMaterial({ color:0x120022, alphaMap: glowTex3D(), transparent:true, opacity:0.85, depthWrite:false })`,
   capacity 40, added to the scene once. In `draw()`, in the "// Shadows" block, write one instance per shadow with `riseT > 0`
   at `(s.x, 0.6, s.y)` scaled `r*3.2*(1 - 0.25*p)`; set `count` each frame (0 when none, and 0 outside a dungeon).
4. The "ARISE" word is drawn by the existing damage-number system in both views (`texts`, drawn in 2D by `drawWorld` and in 3D by
   `drawFx3D` section 8), so nothing more is needed for it; check it shows in both.

## Constraints
- Touch only `js/07-skills-shadows.js`, `js/11-render-world.js`, `3d/render3d.js`. Do not edit `index.html` or `3d/index.html` and do NOT run `tools/stamp.sh`.
- Do not change any damage, health, cooldown or cap number.
- Nothing created per frame (no geometry or material per frame); no gradient per frame in 2D beyond what the file already does.
- Art rule: a dark pool, a plain edge, the word ARISE. No star shapes, runes, glyph-like marks, circles of symbols, crosses,
  halos, occult or religious imagery. The pool is a plain dark ellipse, nothing drawn inside it.
- Match the surrounding style: compact statements, short names, one short comment per change.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`.
- `node tools/test_army.js` passes (it covers the shadow field); `node tools/test_layout.js` ends with `PASS 8000`; `node tools/test_gear.js` passes.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.
- `node tools/balance_bot.js` runs to the end with no error.

## Done when
All four changes are in and every check passes. Commit nothing yourself.
