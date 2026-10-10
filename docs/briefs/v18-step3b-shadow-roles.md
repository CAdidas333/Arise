# Brief: each shadow fights the way its enemy fought

Everything you need is in this repo. Do not read or write anything outside it. Read only the functions named below (line numbers given); do not browse the rest of the code.

## Background
`Arise` is a canvas action game. Scripts in `js/` are classic `<script>` files sharing one global scope (no modules). Raised enemies ("shadows") fight for the player. Every shadow has `s.kind`: `'melee'`, `'ranged'`, `'charger'`, `'bomber'`, `'brute'`, `'caster'` or `'boss'`. Today all of them fight the same way (walk up, hit). Give each kind its own behaviour.

Helpers that already exist and may be used: `damageEnemy(e, dmg, opts)`, `shadowDmg(s)`, `telegraph({...})`, `ring(x, y, color, r0, r1, dur, width)`, `spawnBurst(x, y, color, count, speed)`, `playSfx(name)`, `dist(x1, y1, x2, y2)`, `TAU`, and the arrays `projectiles`, `arcs`, `enemies`.

## Change 1 — `updateShadows(dt)` in `js/07-skills-shadows.js` (starts line 174)
Inside `active.forEach((s, i) => {...})`, in the `if (canAttack) {...}` branch, the code picks `target`, computes `dx, dy, d`, sets `s.facing`, then has one `if (d > target.size+24) {...} else if (s.attackCd <= 0) {...}` block that walks and hits. Keep everything before that block. Replace that block with a `switch (s.kind)`; the existing block becomes the `default:` case, unchanged (it also serves `'melee'`).

Define just above the switch: `const mult = berserk ? 1.8 : 1, dmg = shadowDmg(s)*mult, cdK = berserk ? 0.45 : 1, walk = berserk ? 330 : 190;` and `const so = { shadow:true, crit:false, ox:s.x, oy:s.y };` (options for `damageEnemy`; spread it and add `kb`). `alive` (already defined at the top of the function) is the list of live enemies.

- **`'ranged'`** — keeps its distance and shoots. If `d > 300` walk toward the target at `walk`; if `d < 180` walk away at `walk*0.6`; otherwise stand. Set `s.moving` when it walks. If `s.attackCd <= 0 && d < 440`: push `{ x:s.x, y:s.y, vx:dx/d*460, vy:dy/d*460, damage:dmg, size:5, color:'#bb88ff', life:1.4, fromEnemy:false, hit:new Set(), shadow:true }` onto `projectiles`; `s.attackCd = 1.4*cdK; s.atkT = 0.18; playSfx('shoot');`
- **`'caster'`** — keeps its distance and drops a blast. Walk toward if `d > 340`, away at `walk*0.6` if `d < 200`. If `s.attackCd <= 0 && d < 480`: `telegraph({ type:'circle', x:target.x, y:target.y, r:70, dur:0.7, dmg:dmg*1.6, color:'#7744cc', friendly:true });` then `s.attackCd = 3.2*cdK; s.atkT = 0.18;`
- **`'charger'`** — rushes in. If `d > target.size+24`: move toward the target at `560` when `d > 110 && s.attackCd <= 0`, otherwise at `walk`. Else if `s.attackCd <= 0`: `damageEnemy(target, dmg*1.3, { ...so, kb:260 }); s.attackCd = 1.6*cdK; s.atkT = 0.18;` and push the same `arcs` entry the default case pushes.
- **`'brute'`** — slow heavy slam. Approach like the default case. On the hit: `damageEnemy(target, dmg*1.4, { ...so, kb:320 });` then every other enemy in `alive` that is still `alive` and within 70 of the target takes `damageEnemy(en, dmg*0.6, { ...so, kb:200 })`; `ring(target.x, target.y, '#bb66ff', 10, 80, 0.3, 5); s.attackCd = 1.9*cdK; s.atkT = 0.18;`
- **`'bomber'`** — runs in and bursts (it survives). Approach at `walk*1.3`. When in reach and `s.attackCd <= 0`: every enemy in `alive` that is still `alive` and within 75 of the shadow takes `damageEnemy(en, dmg*1.2, { ...so, kb:240 })`; `ring(s.x, s.y, '#ff66cc', 10, 90, 0.3, 6); spawnBurst(s.x, s.y, '#ff66cc', 14, 360); playSfx('explode'); s.attackCd = 2.4*cdK; s.atkT = 0.18;`
- **`'boss'`** — fights like the default case, and also has a signature attack on a timer. Before running the default walk-and-hit code for it: `s.specialCd = (s.specialCd ?? 4) - dt;` and when `s.specialCd <= 0`: fire 10 projectiles in a ring from the shadow, each like the ranged one but with `vx: Math.cos(a)*380, vy: Math.sin(a)*380` for `a = k/10*TAU`, `damage:dmg*0.8`, `size:6`, `life:1.2`; then `ring(s.x, s.y, '#bb66ff', 12, 120, 0.4, 6); playSfx('shoot'); s.specialCd = 8*cdK;`. Write it so the default code is not duplicated (for example, handle the timer first, then `// falls through` to `default:`).

Moving a shadow means `s.x += ux*speed*dt; s.y += uy*speed*dt; s.moving = true;` exactly as the default case does.

## Change 2 — shadow arrows in `updateProjectiles(dt)`, `js/06-combat.js` (line 95)
Line 105 is `p.hit.add(e); damageEnemy(e, p.damage, { kb:140, ox:p.x-p.vx, oy:p.y-p.vy });`. When `p.shadow` is true, call `damageEnemy(e, p.damage, { shadow:true, crit:false, kb:100, ox:p.x-p.vx, oy:p.y-p.vy })` instead, then set `p.life = 0` and `break` out of the enemy loop so the arrow stops at the first enemy it hits. Player projectiles (no `p.shadow`) behave exactly as today.

## Change 3 — friendly blasts in `updateTelegraphs(dt)`, `js/05-enemies.js` (line 161)
Line 170 is `if (dist(g.x, g.y, player.x, player.y) < g.r+8) hurtPlayer(g.dmg);`. When `g.friendly` is true, do not hurt the player; instead every enemy with `en.alive && en.spawnT <= 0` within `g.r + en.size` of `(g.x, g.y)` takes `damageEnemy(en, g.dmg, { shadow:true, crit:false, kb:200, ox:g.x, oy:g.y })`. Other telegraphs behave exactly as today.

## Constraints
- Change only `js/05-enemies.js`, `js/06-combat.js`, `js/07-skills-shadows.js`. Do not edit `index.html`, do not create files, do not touch `assets/`, `docs/`, `tools/` or `3d/`.
- The formation code in the `else` branch of `if (canAttack)` and everything after the branch stay as they are.
- Match the surrounding style: 2-space indent, compact lines, a comment only where it explains why.
- Commit nothing but those three files.

## Checks to run before you finish
```bash
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done
grep -c "friendly" js/05-enemies.js js/07-skills-shadows.js   # expect at least 1 in each
grep -c "p.shadow" js/06-combat.js                             # expect at least 1
grep -c "specialCd" js/07-skills-shadows.js                    # expect at least 2
git status --short                                             # expect only the three js files
```

## Done looks like
No `FAIL` lines, the greps match, three files changed, under 70 lines added.
