# Brief: shadow style touches (a smoke trail, names over named shadows), 2D and 3D, no power

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). A top-level name declared twice, or a
`const` declared twice inside one function, stops a whole script loading; `bash tools/check_names.sh` lists top-level clashes and
`node --check <file>` catches the rest. Both pages load the same `js/*.js`; the 3D page draws with `3d/render3d.js` instead of
`js/11-render-world.js`, and draws particles from the same `particles` array (type `'smoke'` included), so a particle spawned in
`js/` shows in both views.

## What the player sees
1. A shadow soldier that is moving leaves a thin trail of dark violet smoke behind it, a little brighter while the legion is
   unleashed or the hunter is Awakened. Standing shadows leave none.
2. A shadow the player has named (SHADOWS tab, NAME; saved as `nick`) shows that name in small, faint violet letters above it in
   a fight, in 2D and 3D. Unnamed shadows show nothing.
Nothing else changes: no damage, speed, range, cooldown, target choice or count changes.

## Build
1. Trail, `js/07-skills-shadows.js` `updateShadows(dt)`: inside `active.forEach`, after the `switch` has run (so `s.moving` is
   known), add: when `s.moving`, `s.trailT = (s.trailT || 0) + dt`; when `s.trailT >= (berserk ? 0.08 : 0.14) * (isMobile ? 2 : 1)`,
   set `s.trailT = 0` and, only if `particles.length < 700` (combat effects keep the rest of the 1100 cap), call
   `spawnParticle(s.x + rand(-6, 6), s.y + rand(-4, 4), berserk ? '#3a0f55' : '#1a0a2e', { vx:rand(-10, 10), vy:rand(-30, -10), size:rand(6, 11), life:rand(0.4, 0.7), type:'smoke', drag:1, alpha:0.35 })`
   (same option names as `smoke()` in `js/04-player-fx.js` line 99). Check first that `isMobile`, `rand` and `spawnParticle` exist
   in the global scope under those names (`grep -n`); `trailT` is not saved (do not add it to `saveGame`).
2. Names in 2D, `js/11-render-world.js` `drawShadowSoldier(s)`: at the end, after the body is drawn and every `save` is restored,
   when `s.nick` is set and the shadow is fully up (`!(s.riseT > 0)`): `ctx.font = '9px Orbitron, monospace'`,
   `ctx.textAlign = 'center'`, `ctx.globalAlpha = 0.55`, `ctx.fillStyle = '#bb99ee'`,
   `ctx.fillText(s.nick, s.x, s.y - r * 2.2 - 6)` (r as computed at the top of the function), then put `globalAlpha` back to 1
   and `textAlign` back to `'left'`.
3. Names in 3D, `3d/render3d.js` `drawFx3D()`: next to the remnant "[E] ARISE" block (about line 1863), the same for every
   `player.shadows` entry with `s.active && s.nick && !(s.riseT > 0)`: `const p = toScreen(s.x, s.y, s.kind === 'boss' ? 95 : 52)`,
   skip when `p` is null, then the same font, alpha, colour and centred `fillText` at `p[0], p[1]`; restore alpha and alignment.
   Guard with `typeof player !== 'undefined' && player`.

## Test (new file `tools/test_shadow_style.js`, modelled on `tools/test_army.js` and `tools/lib/headless.js`)
- Set up a hunter with three active shadows (one `melee`, one `ranged`, one `charger`) and a few live enemies placed 600 away so
  the shadows walk, with the player counted as engaged and moving the way `tools/test_army.js` does it. Clear `particles`.
  Step `updateShadows(1/60)` for 120 steps: smoke particles were added, and no more than `3 * ceil(2 / 0.14) + 3`.
- Same with no live enemies (shadows stand): no smoke particles added by the shadows.
- With `particles` already holding 700 entries: stepping adds none.
- Damage unchanged: with the same seed and set-up, total enemy HP lost over 300 steps is identical to a run where
  `spawnParticle` is replaced by a no-op (proves the trail touches nothing in the fight).
- `trailT` never appears in `JSON.parse(` the saved game `)` (stub `saveGame`'s storage the way the other tests do).
Print `PASS <cases>` at the end.

## Constraints
- Touch only `js/07-skills-shadows.js`, `js/11-render-world.js`, `3d/render3d.js` and the new test. Do not edit `index.html` or
  `3d/index.html`; do NOT run `tools/stamp.sh`.
- Canvas text is not markup, so `fillText(s.nick, ...)` needs no escaping; do not add any DOM elements.
- Art rule: nothing occult or religious, in pictures or in words; the smoke is soft round puffs, no symbols.
- Match the surrounding style: compact statements, short names, one short comment per numbered item saying what the player sees.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`; `node --check` on every file you touched prints nothing.
- `node tools/test_shadow_style.js` prints `PASS <n>`; `node tools/test_army.js` (PASS 570), `node tools/test_shadow_names.js`
  (PASS 16), `node tools/test_record.js`, `node tools/test_layout.js` (ends `PASS 8000`) pass.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.

## Done when
All three items are in and every check passes. Commit nothing yourself.
