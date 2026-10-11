# V18 step 5, job A: the dungeon layout (rooms and corridors) and one "keep inside the map" function

## Goal
Today the playing area is one rectangle centred on the world origin (`arenaW` by `arenaH`, declared in `js/03-state.js`). We are adding generated dungeons: a chain of rectangular rooms joined by rectangular corridors. This job adds the layout data, the generator, and ONE function that keeps a point inside the walkable area, then routes every existing position limit through it. With `layout === null` the game must behave exactly as it does today (the open arena). Nothing in this job turns a layout on; another job does that.

## Not in this job
Do not touch `js/08-dungeon.js`, `js/11-render-world.js`, `js/12-render-fx.js`, `js/13-loop.js`, `3d/`, `assets/`, `docs/`, `tools/stamp.sh`, `tools/sync3d.py`. Do not edit `3d/index.html` (it is generated). Do not run `tools/stamp.sh`. No tile grid, no pathfinding, no new save data, no drawing code. No libraries.

## Files you change
- NEW `js/03a-layout.js`
- NEW `tools/test_layout.js` (a node script, no dependencies)
- `index.html`: one new script tag
- `js/05-enemies.js`: one line
- `js/06-combat.js`: two lines
- `js/07-skills-shadows.js`: three edits

## Part 1: `js/03a-layout.js`
A classic script (no modules, no `export`), starting with `'use strict';` and a banner comment in the style of the other files in `js/`. All scripts share one global scope. This file may use ONLY: `Math`, and the globals `clamp(v, mn, mx)` (from `js/01-data.js`), `arenaW`, `arenaH` (from `js/03-state.js`, read at call time, never at load time). It must not touch the DOM, `player`, `dungeon` or anything else, so it can be tested in node.

### Data
```js
let layout = null; // null = the open arena (boss fights, endless mode). Otherwise the object built by genLayout().
```
A layout object has exactly these fields:
- `seed`: the integer seed used.
- `rooms`: array of rectangles. `rooms[0]` is the entry room; `rooms[1]` .. `rooms[n]` are the fight rooms in the order they are visited (`n` = number of fight rooms).
- `halls`: array of `n + 1` rectangles. `halls[j]` for `j < n` joins `rooms[j]` to `rooms[j+1]`. `halls[n]` is a dead-end stub leading out of `rooms[n]` (the way to the boss).
- `rects`: all rooms followed by all halls (same objects, `rooms` first).
- Every rectangle is `{ x0, y0, x1, y1, kind, i }` with `x0 < x1`, `y0 < y1`, `kind` either `'room'` or `'hall'`, and `i` its index in `rooms` or `halls`. World y grows downward (canvas convention): "north" means smaller y.
- `walls`: array of axis-aligned segments `{ x0, y0, x1, y1 }` (either `x0 === x1` or `y0 === y1`): the outline of the union of all rectangles.
- `doors`: array of `2n + 1` segments `{ x0, y0, x1, y1, room }`. `doors[2*j]` is the mouth of `halls[j]` on the edge of `rooms[j]` (`room: j`); `doors[2*j + 1]` is the mouth of `halls[j]` on the edge of `rooms[j+1]` (`room: j+1`), for `j < n`. `doors[2*n]` is the mouth of the stub on the edge of `rooms[n]` (`room: n`). A mouth is the part of the room's edge that lies inside the hall, so it is exactly as long as the hall is wide.
- `exit`: `{ x, y }`, a point inside the stub, centred across it, 80 units short of its dead end.
- `bounds`: `{ x0, y0, x1, y1 }`, the bounding box of all rectangles.
- `lock`: `-1`. Other code sets it to a room index while that room's doors are shut.
- `cleared`: `0`. Other code sets it to the index of the last fight room cleared.

### Sizes (constants at the top of the file)
- Entry room: 560 wide, 460 high, centred on the origin (`x0:-280, y0:-230, x1:280, y1:230`).
- Fight room: width a random integer 900..1300, height 700..1000.
- Hall width `HALL_W = 220`. Gap between two joined rooms (the hall's visible length) random 280..460.
- Overlap `OV = 120`: a hall extends exactly 120 units INTO each room it joins, so the walkable rectangles overlap. (This overlap is what lets a point slide from a room into a hall; do not remove it.)
- Stub: extends 120 into `rooms[n]` and 260 beyond its edge.
- Clearance `GAP = 160`: any two rectangles that are not joined to each other must be at least 160 apart (rectangle-to-rectangle distance).

### `genLayout(nFight, seed)`
Returns a NEW layout object (it does not assign the global `layout`). `seed` defaults to `(Math.random() * 2147483647) | 0`. All randomness inside comes from a small seeded generator local to the file (mulberry32 is fine) so the same seed always gives the same layout. Never call `Math.random()` after the seed is chosen.

Algorithm: start with the entry room. For each next room pick a direction of travel from east, north, south (never west; and never the reverse of the previous direction, so no north straight after south or south straight after north). Place the new room on that side of the previous room, the chosen gap away, shifted sideways by a random offset such that the two rooms' spans across the direction of travel overlap by at least `HALL_W + 120`. Put the hall inside that overlap, at least 60 from every room corner, extending `OV` into both rooms. Reject and retry the step (up to 40 tries with fresh random choices) if the new room is closer than `GAP` to any existing room or hall other than its own hall, or the new hall is closer than `GAP` to any rectangle other than the two rooms it joins. If a step fails 40 times, start the whole layout again with `seed + 1` (at most 60 restarts; the returned `seed` field is the one that worked). The stub is placed the same way (direction east, north or south under the same no-reverse rule, same clearance test, no room at its end).

Then compute `walls`, `doors`, `exit`, `bounds`.

Walls rule: take the four edges of every rectangle. From each edge remove every part that lies STRICTLY inside another rectangle (for a vertical edge at `x = c`, another rectangle `r` covers it where `r.x0 < c && c < r.x1`, over the y-interval `[r.y0, r.y1]`). What is left, in pieces longer than 1 unit, are the wall segments.

### Helpers (all global, all in this file)
```js
// The rectangles a body may stand in right now: the locked room alone while its doors are shut, the whole layout otherwise, or the arena.
function mapRects()            // returns an array of { x0, y0, x1, y1 }
// True when (x, y) is inside a walkable rectangle shrunk by m on every side. m may be negative (grows the rectangles).
function inMap(x, y, m = 0)
// The nearest point to (x, y) that is inside a walkable rectangle shrunk by m. Returns a new { x, y }. If (x, y) already qualifies, returns the same coordinates.
function keepIn(x, y, m = 0)
// Index of the room containing (x, y), with the room shrunk by m; -1 if none or if layout is null.
function roomAt(x, y, m = 0)
// A random point in rooms[i] at least 70 from its walls and, if possible within 24 tries, at least minD from (ax, ay). Uses Math.random (this one is not seeded). Returns { x, y }.
function pointInRoom(i, ax, ay, minD)
```
Exact behaviour:
- `mapRects()`: `layout === null` gives one rectangle `{ x0:-arenaW/2, y0:-arenaH/2, x1:arenaW/2, y1:arenaH/2 }`; `layout.lock >= 0` gives `[layout.rooms[layout.lock]]`; otherwise `layout.rects`.
- `keepIn`: for each rectangle of `mapRects()`, skip it if it is narrower or shorter than `2*m`; clamp the point into the shrunk rectangle (`clamp(x, r.x0+m, r.x1-m)`, same for y); keep the candidate with the smallest distance to `(x, y)`. If every rectangle was skipped, return `keepIn(x, y, 0)`.
- In the arena this makes `keepIn(x, y, 20)` equal to `{ x: clamp(x, -arenaW/2+20, arenaW/2-20), y: clamp(y, -arenaH/2+20, arenaH/2-20) }`, and `!inMap(x, y, -40)` equal to `Math.abs(x) > arenaW/2+40 || Math.abs(y) > arenaH/2+40`. Those identities are what keep today's behaviour unchanged.

## Part 2: `index.html`
Add ONE line directly after the `js/03-state.js` script tag (currently line 596), copying the `?v=` value from that tag:
```html
<script src="js/03a-layout.js?v=20261010033539"></script>
```

## Part 3: route the existing limits through the new functions (exact replacements)
1. `js/05-enemies.js` line 17, replace the whole line with:
```js
const clampArena = e => { const p = keepIn(e.x, e.y, e.size); e.x = p.x; e.y = p.y; };
```
2. `js/06-combat.js`, in `updateProjectiles`, line 100, replace with:
```js
    if (p.life <= 0 || !inMap(p.x, p.y, -40)) continue;
```
3. `js/06-combat.js`, in `updateSpawns`, line 146, replace with:
```js
    const sp = keepIn(s.x, s.y, 40), e = makeEnemy(s.def, sp.x, sp.y, s.o);
```
4. `js/07-skills-shadows.js` line 22, replace the whole line with:
```js
const movePlayerTo = (x, y) => { const p = keepIn(x, y, 20); player.x = p.x; player.y = p.y; };
```
5. `js/07-skills-shadows.js`, in `useSkill`, `case 'dash'`, line 58 (`movePlayerTo(sx + fx*sd.range, sy + fy*sd.range);`), replace with:
```js
      { const n = Math.ceil(sd.range/16), stp = sd.range/n; for (let i = 0; i < n; i++) movePlayerTo(player.x + fx*stp, player.y + fy*stp); } // in short steps, so a dash slides along a wall instead of passing through it
```
6. `js/07-skills-shadows.js`, in `updateShadows`, inside the `active.forEach((s, i) => { ... })` callback, directly BEFORE the line `if (s.atkT > 0) s.atkT -= dt;` (currently line 270), insert:
```js
    { const p = keepIn(s.x, s.y, 14); s.x = p.x; s.y = p.y; }
```
Change nothing else in those three files.

## Part 4: `tools/test_layout.js`
A node script with no dependencies. It reads `js/03a-layout.js` as text and runs it together with stubs and the test body in one scope, for example:
```js
const src = require('fs').readFileSync(__dirname + '/../js/03a-layout.js', 'utf8');
const stubs = 'let arenaW = 1400, arenaH = 1000; const clamp = (v,mn,mx) => Math.max(mn, Math.min(mx, v));\n';
new Function(stubs + src + '\n' + testBody)();   // testBody is a string of test code that can read and assign `layout`
```
For every seed 1..1000 and every `nFight` in 2..9 it must check rules 1, 2, 3, 5, 6 and 11; the slower rules 4, 7, 8, 9 and 10 run only when `seed % 20 === 0`. Rule 12 runs once. Throw with a clear message (seed, nFight, which rule) on the first failure. The whole script should finish in well under a minute.
1. `rooms.length === nFight + 1`, `halls.length === nFight + 1`, `rects.length === 2*nFight + 2`, `doors.length === 2*nFight + 1`; `rooms[0]` is exactly the entry rectangle above; every fight room's width is 900..1300 and height 700..1000; every hall is 220 across.
2. Clearance: any two rooms are at least 160 apart; any hall is at least 160 from every room it does not join; any two halls that do not share a room are at least 160 apart.
3. Each `halls[j]` (`j < n`) overlaps `rooms[j]` and `rooms[j+1]` by exactly 120 along its length and lies at least 60 inside each room's corners across its width. The stub overlaps `rooms[n]` by exactly 120.
4. Walls: every wall segment is axis-aligned and longer than 1; walking each rectangle edge in 10-unit steps, a sample point lies on some wall segment if and only if it is not strictly inside another rectangle (skip samples within 2 units of an interval end).
5. Doors: each door lies on an edge of `rooms[door.room]`, is 220 long, and its midpoint is strictly inside the hall it belongs to.
6. `exit` is inside the stub and outside every room; `bounds` contains every rectangle and touches at least one on each side.
7. With `layout` set to the generated object: for 100 seeded-random points in `bounds` grown by 300 and `m` in `[0, 20, 40]`, `keepIn(x, y, m)` returns a point for which `inMap(px, py, m - 0.001)` is true, and if `inMap(x, y, m)` was already true it returns the same coordinates.
8. Walkability: starting at the origin, repeatedly move 12 units toward the centre of the next target and apply `keepIn(..., 20)`; targets in order: for each `j` the midpoint of `doors[2*j]`, the midpoint of `doors[2*j+1]`, the centre of `rooms[j+1]`; finally the midpoint of `doors[2*n]` and `exit`. The walker must come within 30 of every target in under 4000 steps each.
9. Lock: with `layout.lock = k` for each fight room `k`: `keepIn` of 50 random points (m = 20) lands inside `rooms[k]` shrunk by 19.999; `inMap(hx, hy)` for the centre `(hx, hy)` of `halls[k]` is false (a hall's centre is never inside a room); `roomAt(centre of rooms[k]) === k`. Reset `lock` to -1 afterwards.
10. `pointInRoom(k, cx, cy, 280)` for the centre `(cx, cy)` of `rooms[k]`, 50 times: always inside `rooms[k]` shrunk by 70, and at least 280 from the centre.
11. Same seed and `nFight` twice gives identical `JSON.stringify` output.
12. Arena: with `layout = null`: `keepIn(5000, 0, 20)` is `{ x:680, y:0 }`; `keepIn(-5000, -5000, 40)` is `{ x:-660, y:-460 }`; `keepIn(10, 20, 20)` is `{ x:10, y:20 }`; `inMap(739, 0, -40)` is true and `inMap(741, 0, -40)` is false; `roomAt(0, 0) === -1`.
On success print one line: `PASS <number of layouts checked>` and exit 0. Any failure must exit non-zero.

## Checks to run before you finish
```bash
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done
node tools/test_layout.js                                   # expect: PASS 8000
grep -c 'js/03a-layout.js' index.html                       # expect 1
grep -c 'arenaW\|arenaH' js/05-enemies.js js/06-combat.js js/07-skills-shadows.js   # expect 0 in each file
grep -n 'document\.\|window\.\|player\.\|dungeon\.' js/03a-layout.js   # expect no output
git status --short    # expect exactly: js/03a-layout.js, tools/test_layout.js, index.html, js/05-enemies.js, js/06-combat.js, js/07-skills-shadows.js
```

## Done looks like
No `FAIL` lines, `PASS 8000`, the greps match, six files changed and nothing else. Do not commit; leave the changes in the working tree.
