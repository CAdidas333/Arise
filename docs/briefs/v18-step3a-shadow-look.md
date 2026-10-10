# Brief: a shadow soldier looks like the enemy it was

Everything you need is in this repo. Do not read or write anything outside it. Read only the functions named below (line numbers are given); do not browse the rest of the code.

## Background
`Arise` is a canvas action game. The script is split into classic `<script>` files in `js/` that share one global scope (no modules, no imports). When the player defeats an enemy it can be raised as a "shadow" that fights for the player. Today every shadow is drawn as a small copy of the player (a stick-figure hunter). It should instead be drawn as a dark purple version of the enemy it used to be, using the same silhouette the enemy had.

Each enemy has a `kind`: `'melee'`, `'ranged'`, `'charger'`, `'bomber'`, `'brute'` or `'caster'`. Bosses have `isBoss: true`. `enemyPath(e, r)` in `js/11-render-world.js` (line 124) builds the silhouette path for an enemy-like object `e` at radius `r`, centred on the origin. It reads `e.isBoss`, `e.kind`, `e.facing` (`{x, y}`), `e.animT`, `e.state`, and for a boss `e.def.patterns.length`.

## Changes

### 1. Remember what each shadow was
- `js/06-combat.js`, `killEnemy` (line 39): on line 58 the object passed to `remnants.push({...})` gains `kind:e.kind`.
- `js/07-skills-shadows.js`, `tryArise` (line 160): the object passed to `addShadow({...})` on line 165 gains `kind:r.kind`.
- `js/08-dungeon.js`, `doExtract` (line 129): the object passed to `addShadow({...})` on line 135 gains `kind:'boss'`.
- `js/03-state.js`, `saveGame` (line 47): the per-shadow object on line 53 gains `kind:s.kind`.
- `js/07-skills-shadows.js`: add, directly above `function addShadow`, a function `shadowKindFor(name)`. It returns `'boss'` if any `GATE_DEFS[i].boss.name === name`; otherwise the `kind` of the first entry in any `GATE_DEFS[i].enemies` whose `name === name`; otherwise `'melee'`.
- `js/03-state.js`, `loadGame` (line 65): in the per-shadow object built on line 75, add `kind:` set to the saved `s.kind` when it is one of `'melee','ranged','charger','bomber','brute','caster','boss'`, and to `shadowKindFor(s.name)` otherwise. Old saves have no `kind`, so this is what upgrades them. Keep every existing field on that line as it is.

### 2. Draw the shadow as its old self
Replace the body of `drawShadowSoldier(s)` in `js/11-render-world.js` (lines 176 to 184). Keep the function name and its single argument. New behaviour:
- `const berserk = legionTimer > 0`, `const boss = s.kind === 'boss'`.
- Radius `r`: 28 for a boss shadow, 16 if `s.grade === 'Elite'`, otherwise 12. If `s.atkT > 0`, multiply `r` by 1.15 (a small lunge while attacking).
- Ground glow first, as today: a flat ellipse under the shadow at `(s.x, s.y + r*0.85)`, radii `r*1.2` by `r*0.4`, fill `'#cc44ff'` when berserk else `COLORS.accent`, `globalAlpha` 0.35 when berserk else 0.2.
- A boss shadow also gets a faint aura: a filled disc of radius `r*1.9` at `(s.x, s.y)`, same colour, `globalAlpha` 0.12. Use the existing helper `disc(x, y, r)`.
- Build a small stand-in object for `enemyPath`: `{ isBoss:boss, kind:boss ? 'melee' : (s.kind || 'melee'), facing:s.facing, animT:s.animT, state:'', def:... }`. For a boss shadow `def` is the matching boss definition (`GATE_DEFS.find(g => g.boss.name === s.name)`, then `.boss`), or `{ patterns:[0,0,0] }` if there is no match. For other shadows `def` can be `{ patterns:[] }`.
- `ctx.save()`, `ctx.translate(s.x, s.y + Math.sin(s.animT*6)*1.5)`, `globalAlpha` 0.95 when berserk else 0.85.
- Body: `ctx.fillStyle = berserk ? '#2a0a3e' : '#1a0a2e'`, `enemyPath(e, r)`, `ctx.fill()`. Then an outline on the same path: `ctx.strokeStyle = berserk ? '#dd77ff' : '#8855dd'`, `ctx.lineWidth = 2`, `ctx.stroke()`.
- Core: `ctx.fillStyle = '#0a0414'`, `enemyPath(e, r*0.62)`, `ctx.fill()`.
- Eyes, the same placement `drawEnemy` uses (see lines 139 to 175 for the pattern): two discs of radius `Math.max(1.6, r*0.11)` at `(ox - r*0.24, oy)` and `(ox + r*0.24, oy)` where `ox = s.facing.x*r*0.16` and `oy = s.facing.y*r*0.16 - r*0.08`. Fill `'#ff66ff'` when berserk else `'#cc99ff'`.
- `ctx.restore()`, then `ctx.globalAlpha = 1`.

## Constraints
- Change only the four files named: `js/03-state.js`, `js/06-combat.js`, `js/07-skills-shadows.js`, `js/08-dungeon.js`, `js/11-render-world.js` (five with the render file). Do not edit `index.html`, do not create files, do not touch `assets/`, `docs/` or `tools/`.
- Do not change how shadows move or attack (`updateShadows` stays as it is). This job is data and drawing only.
- No star shapes, runes or symbols in anything drawn.
- Match the surrounding style: 2-space indent, compact lines, a comment only where it explains why.
- Commit nothing but those five source files. No notes, logs or scratch files.

## Checks to run before you finish
```bash
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done
grep -c "kind:e.kind" js/06-combat.js          # expect 1
grep -c "kind:r.kind" js/07-skills-shadows.js  # expect 1
grep -c "shadowKindFor" js/07-skills-shadows.js js/03-state.js   # expect at least 1 in each
grep -c "drawHunter(s.x" js/11-render-world.js # expect 0
git status --short                              # expect only the five js files
```

## Done looks like
No `FAIL` lines, the greps match, five files changed, under 60 lines added.
