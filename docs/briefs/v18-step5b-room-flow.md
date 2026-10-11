# V18 step 5, job B: one wave per room, doors that shut, and the way to the boss

## Goal
A gate is becoming a chain of rooms joined by corridors (a "layout"). This job changes the wave flow so that, when a layout exists: nothing spawns until the hunter walks into the next room; then that room's doors shut and the wave spawns inside it; when the wave is cleared the doors open; after the last room the hunter walks to the exit and the boss fight starts in the open arena exactly as it does today. Endless mode and the boss fight keep the open arena and must behave exactly as they do today.

## Not in this job
Only `js/08-dungeon.js` and `js/13-loop.js` change. Do not touch any other file. Do not create `js/03a-layout.js` (another job is adding it at the same time). Do not run `tools/stamp.sh`. No drawing code, no new HUD elements, no new sounds or voice lines, no save data.

## What will exist when your work is merged (treat these as existing globals; do not define them)
From `js/03a-layout.js`, loaded right after `js/03-state.js`:
- `let layout` : `null` in the open arena, otherwise an object with (among others) `rooms` (array of rectangles `{ x0, y0, x1, y1 }`; `rooms[0]` is the entry room centred on the world origin, `rooms[1]`..`rooms[n]` are the fight rooms in order), `exit` (`{ x, y }`, the way to the boss, beyond the last room), `lock` (index of the room whose doors are shut, or `-1`), `cleared` (index of the last fight room cleared, starts at `0`).
- `genLayout(nFight, seed)` : returns a new layout with `nFight` fight rooms. Does not assign `layout`.
- `roomAt(x, y, m = 0)` : index of the room containing the point (room shrunk by `m`), or `-1`.
- `pointInRoom(i, ax, ay, minD)` : a random `{ x, y }` inside `rooms[i]`, at least `minD` from `(ax, ay)` when possible.
- `keepIn(x, y, m)`, `inMap(x, y, m)` : position limits (already wired into movement by the other job; while `layout.lock >= 0` they confine everything to that one room).
Wave number and room index line up: wave `w` (1-based) is fought in `rooms[w]`. A non-endless gate has `gateDef.waves` waves and the LAST one is the boss, so it has `gateDef.waves - 1` fight rooms.

## Changes in `js/08-dungeon.js` (line numbers are for the current file)

### 1. `startDungeon` (starts line 12)
Directly after line 13 (`arenaW = 1400; arenaH = 1000; // reset to normal, expands for boss`) insert:
```js
  layout = (endless || typeof THREE !== 'undefined') ? null : genLayout(gateDef.waves - 1); // rooms and corridors; the open arena stays for endless mode, boss fights and (for now) the 3D view
```
Replace line 29 (`  spawnWave();`) with:
```js
  if (!layout) spawnWave(); // with a layout, wave 1 starts when the hunter walks into the first chamber (roomStep)
```

### 2. `spawnWave` (starts line 32)
Replace lines 40 to 45 (the `for` loop and the `toast` after it) with:
```js
  for (let i = 0; i < count; i++) {
    const a = rand(0, TAU), r = rand(300, 520);
    const elite = lw >= 3 && Math.random() < Math.min(0.14, 0.04 + 0.012*w);
    const pt = layout ? pointInRoom(layout.lock, player.x, player.y, 280) : { x:player.x + Math.cos(a)*r, y:player.y + Math.sin(a)*r };
    spawnQueue.push({ t:0.3 + i*0.07, def:pick(pool), x:pt.x, y:pt.y, o:{ scale:dungeon.scale, elite } });
  }
  toast(dungeon.endless ? `FLOOR ${w}` : layout ? `CHAMBER ${w} OF ${dungeon.maxWaves-1}` : `WAVE ${w}`, 'blue', 1500);
```
Keep the order of the `rand` and `Math.random` calls as shown.

### 3. `nextWave` (starts line 53)
Insert as the FIRST statement of the function, before `dungeon.wave++;`:
```js
  if (layout) { layout.cleared = dungeon.wave; layout.lock = -1; } // the chamber is clear: its doors open
```
Insert as the LAST statement of the function, after the `if (...) showBoons(); else { ... }` line:
```js
  if (layout && isBossWave()) toast('THE WAY TO THE BOSS IS OPEN', 'red', 2600);
```

### 4. Two new functions, placed directly after `nextWave` and before `startBoss`
```js
// Between chambers nothing spawns. When the hunter walks into the next chamber its doors shut and the wave starts.
function roomStep() {
  if (isBossWave()) { if (dist(player.x, player.y, layout.exit.x, layout.exit.y) < 70) enterBossArena(); return; }
  if (roomAt(player.x, player.y, 70) !== dungeon.wave) return;
  layout.lock = dungeon.wave; dungeon.wait = 0;
  shake(6); playSfx('deny');
  spawnWave();
}
// The way out of the last chamber leads to the open arena, where the boss hunt runs as it always has
function enterBossArena() {
  layout = null; dungeon.wait = 0;
  remnants = []; projectiles = []; telegraphs = [];
  player.x = 0; player.y = 0; camera.x = 0; camera.y = 0; lastMovePos = { x:0, y:0 }; lastMoveTime = gameTime;
  player.shadows.forEach(s => { if (s.active) { s.x = rand(-50, 50); s.y = rand(20, 70); } });
  flash('#ffffff', 0.5); playSfx('tele');
  spawnWave(); // this is the boss wave, so it goes straight to startBoss()
}
```

### 5. `returnToHub` (starts line 192)
In line 197 replace `dungeon = null; run = null;` with `dungeon = null; run = null; layout = null;` (leave the rest of the line as it is).

## Changes in `js/13-loop.js`

### 6. `step` (starts line 73)
Replace lines 86 to 89:
```js
    if (dungeon.state === 'fight') {
      if (dungeon.wait > 0) { dungeon.wait -= dt; if (dungeon.wait <= 0) spawnWave(); }
      else checkWave();
    }
```
with:
```js
    if (dungeon.state === 'fight') {
      if (layout && layout.lock < 0) roomStep(); // between chambers: wait for the hunter to walk in
      else if (dungeon.wait > 0) { dungeon.wait -= dt; if (dungeon.wait <= 0) spawnWave(); }
      else checkWave();
    }
```

### 7. The `#debug` hook (the `window.__arise = { ... }` object, lines 103 to 107)
Add to the getters line (line 105), at its end: ` get layout() { return layout; }, set layout(v) { layout = v; },`
Add to the list on line 106, after `saveGame,`: ` genLayout, keepIn, inMap, roomAt, pointInRoom, mapRects, roomStep, enterBossArena,`

Change nothing else.

## Checks to run before you finish
```bash
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done
grep -c '^function roomStep\|^function enterBossArena' js/08-dungeon.js   # expect 2
grep -c 'layout' js/08-dungeon.js                                          # expect at least 10
grep -c 'roomStep' js/13-loop.js                                           # expect 2
grep -c 'genLayout' js/13-loop.js                                          # expect 1
git status --short                                                         # expect only js/08-dungeon.js and js/13-loop.js
```

## Done looks like
No `FAIL` lines, the greps match, two files changed. The code cannot be run in this worktree (the layout file comes from the other job); that is expected. Do not commit; leave the changes in the working tree.
