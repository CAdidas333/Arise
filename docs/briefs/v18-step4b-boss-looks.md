# V18 step 4, second half: a look for each boss

## Goal
All six bosses are drawn as the same spiky many-pointed blob (`enemyPath`, case `'boss'`, in `js/11-render-world.js`). Give each boss its own body, drawn with canvas shapes, so the player can tell at a glance which boss this is. The boss shadow soldiers (extracted bosses that fight for the player) must use the same bodies in shadow colours.

## Hard limits
- Change ONLY `js/11-render-world.js`. No other file. Do not run `tools/stamp.sh`. Commit nothing else.
- Do not change `drawHunter`, `drawHunterClassic`, `drawArena`, `buildFloor` or the non-boss enemy shapes.
- Plain canvas 2D paths, fills and strokes. No images, no `shadowBlur`, no filters, no gradients. Up to six bosses' worth of shapes run every frame, so keep each boss under about 60 path operations.
- **Art rule, strict: no star symbols, no runes, no occult or religious imagery.** Concretely: no star polygons or evenly spaced radial spikes around a centre; no pentagrams, circles with inscribed shapes or glyphs; no halos, crosses or angel wings; no goat heads, no skulls with symbols. These are creature and armour designs only.
- Bosses face the viewer (front view), like the other enemies: a body with two eyes that slide a little toward the player.
- Each body must sit mostly inside a circle of radius `1.45*r` around the origin (the hit area is the circle of radius `r`), with the bulk of the mass inside `r`.

## The code structure

### 1. New function `drawBoss(name, r, t, fx, fy, pal)`
Add it directly above `function drawEnemy(e) {`. It draws one boss centred on the origin (the caller has already translated). Arguments:
- `name`: the boss's name string (see the six below). Unknown name: draw the Orc Chieftain.
- `r`: body radius in pixels. `t`: animation time in seconds (use it for small idle motion only).
- `fx, fy`: facing, a unit vector toward the player; slide the eyes by `fx*r*0.12, fy*r*0.12`.
- `pal`: `{ body, dark, light, eye }` colours. `body` is the main fill, `dark` the inner shadow shapes, `light` the trim and highlights, `eye` the glowing eyes.

### 2. `drawEnemy(e)`: use it for bosses
Today, after `ctx.fillStyle = col;`, it draws horns for the melee kind, then `enemyPath(e, sz); ctx.fill();`, the dark core, the caster's dots, six orbiting dots for a boss, and the eyes. Change it so that when `e.isBoss`:
- call `drawBoss(e.def.name, sz, e.animT, e.facing.x, e.facing.y, { body: col, dark: e.hitFlash > 0 ? '#ffffff' : '#07070c', light: e.hitFlash > 0 ? '#ffffff' : bossTrim(e.color), eye: e.phase === 2 ? '#ffee66' : '#ff3344' })`
- and skip the old shape, the dark core, the six orbiting dots and the shared eye code for bosses. Delete the six-orbiting-dots line entirely.
The shadow under the body, the aura disc and arc, the spawn `grow` scaling and the non-boss drawing stay exactly as they are.

`bossTrim(hex)` is a small new helper next to `drawBoss`: it returns the colour mixed 45 percent toward white (parse `#rrggbb`, return an `rgb(...)` string).

### 3. `drawShadowSoldier(s)`: use it for boss shadows
When `boss` is true, in place of the two `enemyPath` fills, the outline stroke and the eye code, call
`drawBoss(s.name, r, s.animT, s.facing.x, s.facing.y, { body: berserk ? '#2a0a3e' : '#1a0a2e', dark: '#0a0414', light: berserk ? '#dd77ff' : '#8855dd', eye: berserk ? '#ff88ff' : '#bb88ff' })`.
Read the function first and keep whatever it does after the eyes. Non-boss shadows are unchanged. The temporary object `e` built there no longer needs `isBoss` or `def` for bosses; simplify it if that is clean, otherwise leave it.

### 4. `enemyPath`: remove the `'boss'` case
After the changes above nothing calls it for a boss. Remove `case 'boss': {...}` and change `switch (e.isBoss ? 'boss' : e.kind)` to `switch (e.kind)`.

## The six bodies (all sizes in units of `r`; "up" is negative y)

1. **`'Spider Queen'`** (cave spider). A large round abdomen (radius 0.95, centred at y = +0.15) with a smaller head lobe in front and below it (radius 0.45, centred at y = +0.75). Eight legs, four per side, each a two-segment bent line (width 0.09) starting at the body's side, rising to a knee above and outside, then down to a foot outside the body at about 1.4 from the centre; the legs sway a few degrees with `sin(t*3 + i)`. On the abdomen, in `dark`, two or three plain curved bands. Six small eyes in two rows of three on the head (`eye` colour), sliding with facing. Two short fangs under the head in `light`.
2. **`'Orc Chieftain'`** (hulking warlord). A very wide body: massive rounded shoulders (total width 2.5, shoulder top at y = −0.55), tapering to a waist (width 1.2 at y = +0.95). A small head sunk between the shoulders (radius 0.36, centre y = −0.5). Two tusks in `light` curving up from the jaw past the cheeks. A heavy brow line in `dark` over the eyes. A plain shoulder plate in `light` on each shoulder, each with two blunt studs. A wide belt in `dark`.
3. **`'Death Knight'`** (armoured commander). A tall narrow figure: a pointed great helm (a tall rounded shape narrowing to a ridge at the top, y from −1.35 to −0.35) with a single horizontal visor slit; the two eyes glow inside the slit. Layered pauldrons in `light` at the shoulders (width 1.9 at y = −0.3). A long cloak body below, flaring slightly, whose hem at y = +1.1 is ragged (five or six uneven notches). A greatsword held point-down in front of the body, on the centre line: a long narrow blade in `light` with a `dark` centre line and a plain straight crossguard.
4. **`'Demon Lord'`** (a burning king in armour; a tyrant, not a goat or bat creature). A broad armoured torso with a flared collar. A jagged crown of five uneven tines in `light` on the head (a crown along the top of the head, clearly a crown, not spikes all the way round). A mantle of flame on each shoulder: three flame tongues per side that flicker (their tips move with `sin(t*7 + i)`). Slanted eyes. A wide jaw line in `dark` with four blunt teeth in `light`. Cracks of `light` across the chest (three thin jagged lines) to suggest molten armour.
5. **`'Ancient Dragon'`** (seen from the front, wings spread). A wedge-shaped head low in the centre (snout pointing down, width 0.7), with two swept-back horns in `light` and a row of three small back plates above it. A long neck and chest behind the head (an oval, radius about 0.7). Two large wings, one each side, each a membrane of three scalloped panels between four ribs fanning from the shoulder out to about 1.45; the wings beat slowly (the rib angles change by a few degrees with `sin(t*2)`). Rib lines in `light`, membrane in `body`, the inside fold in `dark`. Two slit eyes. Two nostril dots.
6. **`'Statue of God'`** (a colossal carved stone figure; calm and geometric; no halo, no wings, no cross). A tall rectangular block of a body with squared shoulders (width 1.9, y from −0.35 to +1.15), a heavy squared head with a tall flat-topped headdress (y from −1.4 to −0.35), and a serene mask face: a straight nose line, a thin straight mouth, and the two eyes as narrow horizontal slits that glow. Three or four jagged cracks in `dark` across the stone. Carved straight vertical grooves in `light` down the body like folds of a robe. Four small broken stone fragments floating near the shoulders that bob gently up and down (`sin(t*1.5 + i)`), not circling.

Give every boss a thin outline in `light` (line width `max(1.5, r*0.05)`) around its main silhouette so the shadow versions (dark purple on a dark floor) still read.

## Checks to run before you finish
```bash
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done
grep -c "^function drawBoss" js/11-render-world.js     # expect 1
grep -c "case 'boss'" js/11-render-world.js            # expect 0
grep -c "drawBoss(" js/11-render-world.js              # expect 3 (the definition and two calls)
grep -c "shadowBlur" js/11-render-world.js             # expect 1 (the arena wall line that is already there)
grep -c "'Spider Queen'\|'Orc Chieftain'\|'Death Knight'\|'Demon Lord'\|'Ancient Dragon'\|'Statue of God'" js/11-render-world.js   # expect 6 or more
git status --short                                     # expect only js/11-render-world.js
```

## Done looks like
No `FAIL` lines, the greps match, one file changed. The orchestrator will judge every boss from captured frames at boss size and at shadow size (radius 28), in normal, hit-flash, enraged and shadow colours, so make each of those work for all six.
