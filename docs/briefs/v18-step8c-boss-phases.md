# Brief: hand-designed boss fights — three phases and an arena trick per boss (V18 step 8, part C)

## Goal
Each of the six bosses gets a fight of its own: a **third phase** at 25 percent health, a **scripted move** when it enters
phase 2 (50 percent) and phase 3 (25 percent), and an **arena trick**: patches of floor that stay after its attacks land
(webs that slow, fire and blood that burn, rubble that slows). Everything is built from what is already in the game:
warning telegraphs, the zones system (`addZone`, and a telegraph's `zone:{...}` field, see below), shots and spawns.
Bosses must stay fair: every new hit is warned first and can be walked or dodged out of. Do NOT raise any damage number.

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). A top-level name declared twice
stops a whole script loading; `bash tools/check_names.sh` lists clashes. Use exactly the new names below.

## What already exists (read these first)
- `js/05-enemies.js`: `bossAI(e, dt, d, ux, uy)` (phase change at 50 percent, then the state machine), `startPattern(e, d, ux, uy)`
  (one `case` per pattern, the six signature attacks at the end: `brood`, `pound`, `cleave`, `firewall`, `breath`, `pillars`),
  `endPattern`, `bossCharge`, `bossPound`, `lane(e, x, y, ax, ay, len, w, dur, dmg, color)`, `telegraph(o)`.
- Zones (added by the previous job, in `js/05-enemies.js`): `addZone(o)` pushes a floor patch; ANY telegraph may carry
  `zone:{ kind, dur, slow, dps }` and leaves a zone of its own shape where it lands (`kind` is `'web' | 'fire' | 'rubble' | 'blood'`;
  `slow` 0 to 0.6 cuts walking speed; `dps` is damage per second while standing in it, ticked twice a second, never during a
  dodge; a zone dies with its `owner`). A line telegraph with a `zone` leaves its zone even when it has no `dmg`.
- `after(sec, fn)` runs `fn` later on the game clock. `spawnQueue.push({ t, def, x, y, o:{ scale:dungeon.scale, elite:true } })`
  spawns an enemy (`elite:true` makes it an elite). `dungeon.gate.enemies` is the gate's enemy list. `arenaW`, `arenaH` are the
  arena size (the boss arena is centred on 0, 0). `inMap(x, y)` is true on walkable floor. `ring`, `shake`, `flash`, `slowmo`,
  `toast`, `playSfx`, `rand`, `pick`, `dist`, `TAU` are global helpers already used in this file.
- Boss data is in `js/01-data.js` (`GATE_DEFS[i].boss`). Do NOT change it.

## Exact changes

### 1. Phases: `phase` becomes 1, 2 or 3
- `bossAI`: keep the phase-2 change at 50 percent exactly as it is, and after its effects add
  `after(0.6, () => { if (e.alive && e.phase === 2) bossPhaseMove(e, 2); });` (before its `return`).
  Add a phase-3 change right after it: when `e.phase === 2 && e.hp < e.maxHp*0.25`: `e.phase = 3; e.speed *= 1.1; e.state = 'cast'; e.st = 1.0; e.cd = 0.6;`
  `toast(`${e.name.toUpperCase()} — LAST STAND`, 'red', 2600, true); playSfx('boss'); ring(e.x, e.y, COLORS.danger, e.size, 640, 0.8, 12); shake(24); flash('#ff2222', 0.4); slowmo(0.35, 0.5);`
  `projectiles = projectiles.filter(p => !p.fromEnemy);` then `after(0.6, () => { if (e.alive && e.phase === 3) bossPhaseMove(e, 3); });` and `return;`.
- Everywhere in `js/05-enemies.js` that tests `e.phase === 2` to mean "enraged" (the `P2` constants in `bossAI` and
  `startPattern`, and `endPattern`), use `e.phase >= 2`, so phase 3 keeps every phase-2 strengthening. Add `const P3 = e.phase === 3;`
  next to `P2` in `startPattern`. The `breath` pattern's `e.phase !== ph` check stays as it is (it cancels a sweep when the phase changes).
- `js/11-render-world.js` lines 1000 and 1008, and `3d/render3d.js` line 760: `e.phase === 2` becomes `e.phase >= 2` (the enraged look holds in phase 3).
- The `leap` state ends the pound chain at `e.step < (P2 ? 4 : 3)`: change it to `e.step < (e.poundN || 3)`, and in `case 'pound'` set
  `e.poundN = P2 ? 4 : 3;` before `bossPound(e)`.

### 2. `function bossPhaseMove(e, ph)` (new, after `endPattern`)
A `switch (e.def.name)` with one case per boss. Each case starts the move, sets `e.state = 'cast'` and `e.st` to the move's
length (given below) so the boss holds still while it plays, and ends with `playSfx('tele');`. Every spawn, telegraph or timer
callback must check `e.alive` first (copy how `cleave` does it). The moves:

- **Spider Queen**
  - ph 2, "Web the floor": 7 web patches round the hunter: for i in 0..6, angle `a0 + i/7*TAU` (`a0 = rand(0,TAU)`), distance
    `rand(220, 520)` from the hunter; skip a spot that is not `inMap`; `telegraph({ type:'circle', x, y, r:110, dur:0.9, dmg:0, color:'#cc77cc', owner:e, zone:{ kind:'web', dur:12, slow:0.45 } })`. `e.st = 1.0`.
  - ph 3, "The whole clutch": the brood attack with 9 eggs where EVERY egg hatches. Refactor the body of `case 'brood'` into
    `function bossBrood(e, n, every)` (`every` true = all eggs hatch, false = every other egg as today), call it from the case as
    `bossBrood(e, P2 ? 7 : 6, false)` and from here as `bossBrood(e, 9, true)`. `e.st = 1.5`.
- **Orc Chieftain**
  - ph 2, "War cry": `ring(e.x, e.y, '#ff7733', e.size, 700, 0.6, 12); shake(16);` and two elite orcs rise beside him:
    for i in 0..1, `spawnQueue.push({ t:0.3 + i*0.2, def:dungeon.gate.enemies[0], x:e.x + (i ? 140 : -140), y:e.y, o:{ scale:dungeon.scale, elite:true } })`. `e.st = 1.0`.
  - ph 3, "Berserk": a five-jump pound chain at once: `e.step = 0; e.poundN = 5; bossPound(e);` (this sets the `leap` state itself; do not set `cast` after it).
- **Death Knight**
  - ph 2, "Raise the fallen": two elite enemies from `dungeon.gate.enemies[1] || dungeon.gate.enemies[0]` rise at 160 to the
    left and right of him (`spawnQueue`, `elite:true`, `t:0.4` and `0.6`), with `ring(x, y, '#aa55ff', 10, 140, 0.5, 6)` at each spot. `e.st = 1.2`.
  - ph 3, "Crossing cuts": one set of cleave lanes along the hunter direction AND one set across it, both at once, so only the
    squares between them are safe: the same lane loop as `cleave` (k from -3 to 3, spacing 230, width 86, dur `1.1 + Math.abs(k)*0.06`,
    dmg `e.damage*1.3`, colour `'#aa55ff'`), first with direction `(ux, uy)` and offsets along `(-uy, ux)`, then with direction
    `(-uy, ux)` and offsets along `(ux, uy)`; both sets based on the hunter's position (`bx = player.x - ux*1000`, `by = player.y - uy*1000`
    for the first; `player.x + uy*1000`, `player.y - ux*1000` for the second, so each lane runs the full arena). `e.st = 1.6`. `ux, uy`
    here is the unit vector from the boss to the hunter (compute it in the move).
- **Demon Lord**
  - ph 2, "Ring of fire": fire round the edge of the arena that stays 30 seconds, so the floor shrinks: circles of radius 130
    every 220 units along the rectangle inset 120 from the arena edge (x from `-arenaW/2+120` to `arenaW/2-120`, y likewise);
    each `telegraph({ type:'circle', x, y, r:130, dur:1.1, dmg:e.damage*0.8, color:'#ff6622', owner:e, zone:{ kind:'fire', dur:30, dps:e.damage*0.4 } })`. `e.st = 1.2`.
  - ph 3, "Hellfire": a second ring inset 460 from the edge, the same way, `zone` dur 20. `e.st = 1.2`.
- **Ancient Dragon**
  - ph 2, "Fire rain": 12 meteors, one every 0.25 s (`after(i*0.25, ...)`), each a circle on the hunter's position AT THAT MOMENT:
    `r:100, dur:0.9, dmg:e.damage*0.9, color:'#ffaa33', owner:e, zone:{ kind:'fire', dur:4, dps:e.damage*0.35 }`. `e.st = 1.0`
    (the rain keeps falling while it moves again).
  - ph 3, "Firestorm": the same with 18 meteors, one every 0.18 s. `e.st = 1.0`.
- **Statue of God**
  - ph 2, "The gaze": a beam of light sweeps once round the statue like a clock hand: 24 steps, `after(i*0.15, ...)`, each a lane
    from the statue outward: `lane(e, e.x, e.y, Math.cos(a), Math.sin(a), 1700, 80, 0.5, e.damage*0.9, '#ffcc55')` with
    `a = a0 + s*i/24*TAU` (`a0` = the angle to the hunter minus `s*0.6`, `s = e.strafe`). The warning moves round; the hunter
    runs ahead of it or slips behind it. `e.st = 1.0` (it may move while the beam turns; recompute `e.x, e.y` at each step).
  - ph 3, "Twin gaze": two beams opposite each other (`a` and `a + Math.PI`), same sweep, 24 steps. `e.st = 1.0`.
  - Art rule: a plain beam of gold light. No halo, no rays round the head, no cross, nothing religious.

### 3. Arena tricks on the existing signature attacks (add a `zone` to their telegraphs)
- `brood` (in `bossBrood`): eggs that do NOT hatch leave a web: on the egg telegraphs for odd `i` (when `every` is false) add
  `zone:{ kind:'web', dur:7, slow:0.45 }`.
- `pound` (`bossPound`): from phase 2 on (`e.phase >= 2`), each landing leaves rubble: `zone:{ kind:'rubble', dur:6, slow:0.3 }`.
- `cleave`: from phase 2 on, each lane leaves blood for 2.5 s: give `lane()` an optional last parameter `zone` and pass it into the
  telegraph; pass `{ kind:'blood', dur:2.5, dps:e.damage*0.5 }` when `e.phase >= 2` (also for the phase-3 crossing cuts).
- `firewall`: the BACK row only (`j === rows-1`) leaves fire: `zone:{ kind:'fire', dur:3.5, dps:e.damage*0.4 }`.
- `breath`: the two edge lanes leave fire along the arc's edges: add `zone:{ kind:'fire', dur:4, dps:e.damage*0.3 }` to the `edge()` telegraph.
- `pillars`: in phase 3 there are 4 waves instead of 3 (`P3 ? 4 : P2 ? 3 : 2`). No zones (it would cover the floor).
- In `js/05-enemies.js` the zone cap in `addZone` (`zones.length < 90`) becomes `< 120` (the Demon Lord's two rings need room).

## Constraints
- Only `js/05-enemies.js` changes, plus the three one-word `phase >= 2` edits in `js/11-render-world.js` and `3d/render3d.js`.
- No change to damage numbers, boss data, `index.html`, `3d/index.html` or the `?v=` stamps. Do NOT run `tools/stamp.sh`.
- No new files. Match the surrounding style: compact statements, short names, one short comment per new move saying what the
  player sees (like the comments on the signature attacks).

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`.
- `node tools/test_layout.js` ends with `PASS 8000`; `node tools/test_gear.js` and `node tools/test_army.js` pass.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.
- `node tools/balance_bot.js` runs to the end with no error (about 20 seconds). Report its boss lines in your summary.
- A Node check that every phase move runs: write a throwaway script under `.worker/` (never committed) that uses
  `require('./tools/lib/headless.js').createGame()` like `tools/balance_bot.js` does, starts each gate's boss fight, drops the boss
  to 49 percent and then 24 percent health, steps the game 6 seconds after each, and asserts no error was thrown and that zones
  appeared where this brief says they should (webs for the Spider Queen at phase 2, fire for the Demon Lord's ring, and so on).

## Done when
All three sections are in, every check passes, and the throwaway check shows each boss reaching phase 3 and each phase move
running without an error. Commit nothing yourself.
