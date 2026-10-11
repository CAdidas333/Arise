# V18 step 5, job C: draw the rooms and corridors in the 2D view, the minimap, and an arrow to the next door

## Goal
A gate is becoming a chain of rectangular rooms joined by rectangular corridors (a "layout"). This job draws it in the 2D view: the painted floor in every rectangle, glowing walls along the outline, a bar across each shut door, a doorway of light at the exit; a minimap that shows the rooms around the hunter; and an edge-of-screen arrow that points to where to go next. When `layout` is `null` (endless mode, boss fights) everything must be drawn exactly as it is today.

## Not in this job
Only `js/11-render-world.js` and `js/12-render-fx.js` change. Do not touch any other file. Do not create `js/03a-layout.js` (another job is adding it at the same time). Do not run `tools/stamp.sh`. No room decoration (pillars, rubble, props), no fog of war, no new images, no changes to `buildFloor`, `drawHunter`, `drawBoss` or anything else in these files.

**Strict art rule for everything you draw: plain rectangles, straight lines and soft glows only. No star shapes, no runes or glyph-like marks, no crosses, no circles with marks or spokes inside them, no pentagons or hexagons, nothing that could read as a magic circle or an occult or religious symbol.**

## What will exist when your work is merged (treat these as existing globals; do not define them)
From `js/03a-layout.js`:
- `let layout` : `null` in the open arena, otherwise an object:
  - `rects`: every walkable rectangle, `{ x0, y0, x1, y1, kind, i }`; `kind` is `'room'` or `'hall'`; `i` is its index among rooms or among halls. Halls overlap 120 units into the rooms they join.
  - `rooms`: the rooms in visiting order. `rooms[0]` is the entry room (centred on the world origin); `rooms[1]`..`rooms[n]` are fight rooms.
  - `walls`: axis-aligned segments `{ x0, y0, x1, y1 }` forming the outline of the whole layout.
  - `doors`: segments `{ x0, y0, x1, y1, room }`, each lying across a corridor mouth on the edge of `rooms[room]`. `doors[2*k]` is the door OUT of `rooms[k]` toward the next room (for the last room it leads to the exit).
  - `exit`: `{ x, y }`, the way to the boss, in a short dead-end corridor beyond the last room.
  - `lock`: index of the room whose doors are shut right now, or `-1`.
  - `cleared`: index of the last fight room cleared (starts at `0`).
- `roomAt(x, y, m = 0)`: index of the room containing the point, or `-1`.
Other facts: wave `w` is fought in `rooms[w]`. `dungeon.wave` is the current wave (1-based), `dungeon.maxWaves` is the boss wave, so "every chamber is clear and the boss is next" is `dungeon.wave >= dungeon.maxWaves`. World coordinates are in the same units the hunter moves in; world y grows downward.

## Changes in `js/11-render-world.js`

### 1. `drawArena` (starts line 53)
Insert as the first statement of the function:
```js
  if (layout) { drawLayout(vx0, vy0, vx1, vy1); return; }
```
(the existing line `const hw = arenaW/2, hh = arenaH/2, th = floorTheme;` and everything after it stay exactly as they are).

### 2. New function `drawLayout(vx0, vy0, vx1, vy1)`, placed directly after `drawArena`
`vx0..vy1` is the visible world rectangle; skip anything wholly outside it. `ctx` is already transformed to world coordinates. Use `const th = floorTheme;`. Draw in this order:
1. **Floors.** If `floorPat` is set: `ctx.fillStyle = floorPat;` and for every rectangle in `layout.rects` fill the part that is inside the view (clamp its corners to the view the same way `drawArena` does on its line 55 to 56).
2. **Corridors a little darker.** For every rectangle with `kind === 'hall'`: fill the same visible part with `rgba(0,0,0,0.28)`. (Where a hall overlaps a room this darkens a strip just inside the doorway; that is fine and reads as a threshold.)
3. **Rooms not yet reached a little darker.** For every room with `i > layout.cleared` and `i !== layout.lock`: fill its visible part with `rgba(0,0,0,0.22)`.
4. **Walls.** One path, one stroke, so the glow costs one pass: `ctx.save(); ctx.strokeStyle = th.line; ctx.lineWidth = 3; ctx.lineCap = 'square'; ctx.globalAlpha = 0.55 + 0.15*Math.sin(clock*2); ctx.shadowColor = th.line; ctx.shadowBlur = 22; ctx.beginPath();` then `moveTo`/`lineTo` for every wall segment that touches the view, then `ctx.stroke(); ctx.restore();`. These are the same style values `drawArena` uses for its wall rectangle.
5. **Doors.** For every door in `layout.doors`:
   - if `door.room === layout.lock`: a shut door. A bright bar along the segment: `strokeStyle = COLORS.danger`, `lineWidth = 9`, `lineCap = 'butt'`, `shadowColor = COLORS.danger`, `shadowBlur = 26`, `globalAlpha = 0.75 + 0.25*Math.sin(clock*5)`. Then a thin `#ffffff` line (`lineWidth = 2`, alpha 0.8, no shadow) along the same segment.
   - else if `layout.lock < 0` and the door is `layout.doors[2*(dungeon.wave-1)]` (the door the hunter should go through next): a pulsing line in `COLORS.primary`, `lineWidth = 4`, `shadowBlur = 18`, `globalAlpha = 0.45 + 0.35*Math.sin(clock*4)`.
   - else: a faint threshold line in `th.line`, `lineWidth = 2`, `globalAlpha = 0.16`, no shadow.
   Wrap the door drawing in one `ctx.save()` / `ctx.restore()` and reset `shadowBlur` to 0 where a door needs none.
6. **The exit: a doorway of light.** At `layout.exit` (`ex`, `ey`). Let `open = dungeon.wave >= dungeon.maxWaves` and `k = open ? 1 : 0.22`. Draw, with `ctx.save()` / `ctx.restore()` and `ctx.globalCompositeOperation = 'lighter'`:
   - a soft pool of light on the floor: `ctx.ellipse(ex, ey, 70, 26, 0, 0, TAU)` filled with a radial gradient from `th.ember` (centre) to transparent, `globalAlpha = k*(0.5 + 0.15*Math.sin(clock*3))`. To build a transparent version of a hex colour use `globalAlpha` on the fill, not string concatenation, for the solid stops; for the outer gradient stop use `'rgba(0,0,0,0)'`.
   - a standing rectangle of light: 84 wide, 170 tall, its bottom edge at `ey` (so it spans `ex-42 .. ex+42`, `ey-170 .. ey`), filled with a vertical linear gradient: `'rgba(0,0,0,0)'` at the top, `th.ember` at the bottom; `globalAlpha = k*(0.55 + 0.2*Math.sin(clock*2.2))`.
   - when `open`, two thin vertical lines in `#ffffff` at `ex-42` and `ex+42` from `ey-150` to `ey`, `lineWidth = 2`, `globalAlpha = 0.5`.
   Nothing else: no ring, no arch ornament, no symbol.

Do NOT draw the four pulsing rings that `drawArena` draws at the origin; they belong to the open arena only.

## Changes in `js/12-render-fx.js`

### 3. `drawMinimap` (starts line 153)
Today the minimap shows the whole arena, centred on the world origin. With a layout it must show a window of the world around the hunter instead. Replace lines 154 and 155 with:
```js
  const L = layout, mw = isMobile ? 90 : 130, mh = L ? Math.round(mw*0.75) : mw*arenaH/arenaW, mx = W - mw - 20, my = 60;
  const sx = L ? mw/3600 : mw/arenaW, sy = L ? sx : mh/arenaH, cx = mx + mw/2, cy = my + mh/2;
  const ox = L ? player.x : 0, oy = L ? player.y : 0; // with a layout the map is centred on the hunter
  const px = x => cx + (x-ox)*sx, py = y => cy + (y-oy)*sy;
```
Then, in the rest of the function, replace every `cx + <something>.x*sx` with `px(<something>.x)` and every `cy + <something>.y*sy` with `py(<something>.y)` (shadows line 159, enemies line 160, remnants line 162, the boss lines 165, the hunter line 169). The stationary warning at the end (lines 171 to 176) keeps using `cx`, `my` and `mh` unchanged.

Directly after the two lines that draw the frame (the `fillRect` and `strokeRect` on lines 156 and 157), insert the layout drawing, active only when `L` is set:
- `ctx.save(); ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();` so nothing is drawn outside the frame. Keep this clip active for ALL the dots that follow as well, and `ctx.restore()` it just before the `// Stationary warning` comment. (When `L` is null do not save, clip or restore; the arena map is drawn exactly as today.)
- For every rectangle `r` in `L.rects`, `ctx.fillRect(px(r.x0), py(r.y0), (r.x1-r.x0)*sx, (r.y1-r.y0)*sy)` with `globalAlpha = 1` and fill colour: hall `rgba(255,255,255,0.07)`; room with `r.i === L.lock` `rgba(255,60,80,0.32)`; room with `r.i <= L.cleared` `rgba(0,212,255,0.22)`; any other room `rgba(255,255,255,0.11)`.
- When `dungeon.wave >= dungeon.maxWaves`: a 5 by 5 square in `#ffcc33` centred on `px(L.exit.x), py(L.exit.y)`, `globalAlpha = 0.6 + 0.4*Math.sin(clock*5)`.
After this block the existing code sets its own `fillStyle` and `globalAlpha` for the shadow dots, so no reset is needed beyond what you set.

### 4. `drawIndicators` (starts line 181)
Today it draws an arrow at the screen edge pointing at the boss. Make it also point to where the hunter should go between chambers. Replace lines 182 to 184:
```js
  const b = dungeon.bossRef;
  if (!b || !b.alive || dungeon.state !== 'fight') return;
  const dx = (b.x-camera.x)*camera.zoom, dy = (b.y-camera.y)*camera.zoom;
```
with:
```js
  const b = dungeon.bossRef;
  let tx, ty, col = '#ff3344';
  if (dungeon.state !== 'fight') return;
  if (b && b.alive) { tx = b.x; ty = b.y; }
  else if (layout && layout.lock < 0) {
    // Between chambers: the door out of the chamber the hunter stands in, then the next chamber, and at the end the way to the boss
    const k = dungeon.wave - 1, d = layout.doors[2*k], boss = dungeon.wave >= dungeon.maxWaves;
    if (roomAt(player.x, player.y) === k) { tx = (d.x0+d.x1)/2; ty = (d.y0+d.y1)/2; }
    else if (boss) { tx = layout.exit.x; ty = layout.exit.y; }
    else { const r = layout.rooms[dungeon.wave]; tx = (r.x0+r.x1)/2; ty = (r.y0+r.y1)/2; }
    col = boss ? '#ffcc33' : COLORS.primary;
  } else return;
  const dx = (tx-camera.x)*camera.zoom, dy = (ty-camera.y)*camera.zoom;
```
In the rest of the function replace `ctx.fillStyle = '#ff3344';` with `ctx.fillStyle = col;` and `dist(player.x, player.y, b.x, b.y)` with `dist(player.x, player.y, tx, ty)`. Nothing else changes; the arrow still hides while its target is on screen.

Update the comment above the function to: `// Edge-of-screen arrow: the boss you are hunting, or the way to the next chamber`.

## Checks to run before you finish
```bash
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done
grep -c '^function drawLayout' js/11-render-world.js      # expect 1
grep -c 'drawLayout(' js/11-render-world.js               # expect 2
grep -c 'cx + \|cy + ' js/12-render-fx.js                 # expect 2  (line 39 in drawPortal, which you leave alone, and the px/py helper line)
grep -c 'b\.x, b\.y' js/12-render-fx.js                   # expect 0
grep -c '\[56, 130, 205, 280\]' js/11-render-world.js     # expect 1 (the arena rings, untouched, inside drawArena)
git status --short                                        # expect only js/11-render-world.js and js/12-render-fx.js
```

## Done looks like
No `FAIL` lines, the greps match, two files changed. The code cannot be run in this worktree (the layout file comes from the other job); that is expected. Do not commit; leave the changes in the working tree.
