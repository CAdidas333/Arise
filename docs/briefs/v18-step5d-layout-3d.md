# V18 step 5, job D: the rooms and corridors in the 3D view

## Goal
The 2D game now plays a gate as a chain of rectangular rooms joined by corridors (a "layout"). The 3D view (`3d/render3d.js`) still only knows one rectangular arena, so layouts are switched off there. This job makes the 3D view build its floor, walls, shut doors and the exit from the layout, adds an arrow that shows the way to the next door, and switches layouts on for the 3D page. When `layout` is `null` (endless mode, boss fights) the 3D view must look exactly as it does today.

## Not in this job
Only `3d/render3d.js` and ONE line of `js/08-dungeon.js` change. Do not touch `index.html`, `3d/index.html` (generated), any other file in `js/`, `tools/`, `assets/`, `docs/`. Do not run `tools/stamp.sh`. No new files. No minimap in 3D, no new 3D figures, no changes to the camera, the lights, the fog or the effects that are already drawn.

**Strict art rule: plain boxes, flat strips and a plain triangle arrow only. No star shapes, runes, glyph-like marks, crosses, rings with marks in them, or anything that could read as a magic circle or an occult or religious symbol.**

## What already exists (read before you start)
- The 3D page loads every game script except `js/11-render-world.js` and `js/12-render-fx.js`. So these globals exist: `layout`, `roomAt`, `dungeon`, `player`, `camera`, `clock`, `COLORS`, `W`, `H`, `ctx`, `dist`. Keep using `typeof` guards in the style of the rest of this file.
- `layout` (from `js/03a-layout.js`) is `null` in the open arena, otherwise an object:
  - `rooms`: rectangles `{ x0, y0, x1, y1 }` in visiting order; `rooms[0]` is the entry room.
  - `halls`: rectangles; each overlaps 120 units INTO every room it joins. The last hall is a dead-end stub that holds the exit.
  - `walls`: axis-aligned segments `{ x0, y0, x1, y1 }`, the outline of the whole layout.
  - `doors`: segments `{ x0, y0, x1, y1, room }` across the corridor mouths. `doors[2*k]` is the door OUT of `rooms[k]`. The last entry (`doors[doors.length-1]`) is the stub's door on the last room.
  - `exit`: `{ x, y }`; `seed`: an integer; `lock`: index of the room whose doors are shut, or `-1`.
- World `(x, y)` maps to 3D `(x, 0, y)`: world y is 3D z.
- Wave `w` is fought in `rooms[w]`; "all chambers clear, boss next" is `dungeon.wave >= dungeon.maxWaves`.
- In `3d/render3d.js`: `rebuildFloorAndWalls(w, h, line)` (line 81) builds one floor plane and four wall boxes; `buildFloor(g)` (line 102) loads the floor texture and sets `tex.repeat` from the arena size; `draw()` (line 204) calls the rebuild at lines 243 to 251 when the arena size or wall colour changes; `toScreen(x, y, h)` (line 401) projects a world point to overlay pixels or returns `null`; `drawFx3D()` (line 407) draws the effects overlay with numbered sections `// 3. Rings` ... `// 9. Screen flash`.

## Changes in `3d/render3d.js`

### 1. Shared clean-up, and state for the layout
Directly after the line `let lastArenaW = 0, lastArenaH = 0, lastLine = '';` (line 79) add:
```js
let lastFloorKey = '', lastLayoutRef = null;
const layoutMeshes = []; // floor pieces, door bars and the exit light of a layout

function clearFloorAndWalls() {
  if (floorMesh) { floorGroup.remove(floorMesh); floorMesh.geometry.dispose(); floorMesh = null; }
  while (wallMeshes.length) { const wm = wallMeshes.pop(); floorGroup.remove(wm); wm.geometry.dispose(); wm.material.dispose(); }
  while (layoutMeshes.length) { const m = layoutMeshes.pop(); floorGroup.remove(m); m.geometry.dispose(); if (m.material !== floorMaterial) m.material.dispose(); }
}
```
In `rebuildFloorAndWalls`, replace its lines 83 and 84 (the two lines that remove the old floor mesh and the old wall meshes) with the single line `clearFloorAndWalls();`. Leave the rest of that function as it is.

### 2. New functions, placed directly after `rebuildFloorAndWalls`
```js
// A flat floor piece over the world rectangle (x0,y0)-(x1,y1), textured in world units so neighbouring pieces line up
function floorPiece(x0, y0, x1, y1) {
  const g = new THREE.PlaneGeometry(x1 - x0, y1 - y0); g.rotateX(-Math.PI / 2); g.translate((x0 + x1) / 2, 0, (y0 + y1) / 2);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / 384, -pos.getZ(i) / 384);
  uv.needsUpdate = true;
  const m = new THREE.Mesh(g, floorMaterial); floorGroup.add(m); layoutMeshes.push(m);
}

// Rooms and corridors: a floor piece per rectangle, a wall box per outline segment, a bar across each shut door, a slab of light at the exit
function rebuildLayout3D(line) {
  clearFloorAndWalls();
  const L = layout;
  if (floorTexture) floorTexture.repeat.set(1, 1);
  for (const r of L.rooms) floorPiece(r.x0, r.y0, r.x1, r.y1);
  for (const h of L.halls) { // only the part of a hall that lies outside the rooms, so two floors never share the same spot
    let x0 = h.x0, y0 = h.y0, x1 = h.x1, y1 = h.y1;
    for (const r of L.rooms) {
      if (r.x1 <= x0 || r.x0 >= x1 || r.y1 <= y0 || r.y0 >= y1) continue;
      if (r.x0 <= h.x0 && r.x1 >= h.x1) { if (r.y0 <= y0) y0 = Math.max(y0, r.y1); else y1 = Math.min(y1, r.y0); } // the hall runs north-south
      else { if (r.x0 <= x0) x0 = Math.max(x0, r.x1); else x1 = Math.min(x1, r.x0); }                               // the hall runs east-west
    }
    if (x1 > x0 && y1 > y0) floorPiece(x0, y0, x1, y1);
  }

  const wallMat = new THREE.MeshBasicMaterial({ color: line, transparent: true, opacity: 0.65 });
  const wallH = 30, t = 2;
  for (const s of L.walls) {
    const horiz = s.y0 === s.y1, len = horiz ? Math.abs(s.x1 - s.x0) : Math.abs(s.y1 - s.y0);
    const m = new THREE.Mesh(new THREE.BoxGeometry(horiz ? len : t, wallH, horiz ? t : len), wallMat);
    m.position.set((s.x0 + s.x1) / 2, wallH / 2, (s.y0 + s.y1) / 2); floorGroup.add(m); wallMeshes.push(m);
  }

  const danger = (typeof COLORS !== 'undefined' && COLORS.danger) ? COLORS.danger : '#ff3344';
  const primary = (typeof COLORS !== 'undefined' && COLORS.primary) ? COLORS.primary : '#00d4ff';
  const next = L.lock < 0 ? L.doors[2 * (dungeon.wave - 1)] : null; // the door the hunter should go through next
  for (const d of L.doors) {
    const shut = d.room === L.lock;
    if (!shut && d !== next) continue;
    const horiz = d.y0 === d.y1, len = horiz ? Math.abs(d.x1 - d.x0) : Math.abs(d.y1 - d.y0), hgt = shut ? 34 : 1.5, th = shut ? 6 : 10;
    const mat = new THREE.MeshBasicMaterial({ color: shut ? danger : primary, transparent: true, opacity: shut ? 0.85 : 0.7 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(horiz ? len : th, hgt, horiz ? th : len), mat);
    m.position.set((d.x0 + d.x1) / 2, hgt / 2 + 0.5, (d.y0 + d.y1) / 2); floorGroup.add(m); layoutMeshes.push(m);
  }

  const open = dungeon.wave >= dungeon.maxWaves;
  const ember = (dungeon.gate && dungeon.gate.theme && dungeon.gate.theme.ember) ? dungeon.gate.theme.ember : '#ffcc66';
  const sd = L.doors[L.doors.length - 1], eastward = sd.x0 === sd.x1; // the stub's door is a north-south segment when the stub runs east
  const em = new THREE.Mesh(new THREE.BoxGeometry(eastward ? 10 : 84, 150, eastward ? 84 : 10),
    new THREE.MeshBasicMaterial({ color: ember, transparent: true, opacity: open ? 0.5 : 0.12, blending: THREE.AdditiveBlending, depthWrite: false }));
  em.position.set(L.exit.x, 75, L.exit.y); floorGroup.add(em); layoutMeshes.push(em);
}
```

### 3. `buildFloor` (line 102)
Replace line 111 (`    tex.repeat.set(w / 384, h / 384);`) with:
```js
    if (typeof layout !== 'undefined' && layout) tex.repeat.set(1, 1); else tex.repeat.set(w / 384, h / 384);
```

### 4. `draw()`: when to rebuild (lines 243 to 251)
Keep the three `const` lines that compute `curArenaW`, `curArenaH` and `curLine`. Replace the comment on line 243 and the `if (...) { rebuildFloorAndWalls(...); }` block (lines 249 to 251) with:
```js
  // Floor and walls are rebuilt when the arena size, the layout, a door, the wave or the wall colour changes
  const L3 = (typeof layout !== 'undefined') ? layout : null;
  const floorKey = L3 ? 'L' + L3.seed + '|' + L3.lock + '|' + dungeon.wave + '|' + curLine : 'A' + curArenaW + 'x' + curArenaH + '|' + curLine;
  if (floorKey !== lastFloorKey || L3 !== lastLayoutRef || (!L3 && !floorMesh)) {
    lastFloorKey = floorKey; lastLayoutRef = L3;
    if (L3) rebuildLayout3D(curLine); else rebuildFloorAndWalls(curArenaW, curArenaH, curLine);
  }
```
(the `L3 ?` key must be built AFTER `curLine` is computed).

### 5. `drawFx3D()`: an arrow to the next door
Directly BEFORE the comment `// 9. Screen flash` (line 600) insert a new section. At this point `ctx.globalCompositeOperation` is already `'source-over'`.
```js
    // 8b. Between chambers: an arrow to the door out, then to the next chamber, and at the end to the way to the boss
    if (typeof layout !== 'undefined' && layout && layout.lock < 0 && dungeon.state === 'fight' && !(dungeon.bossRef && dungeon.bossRef.alive)) {
      const k = dungeon.wave - 1, d = layout.doors[2 * k], boss = dungeon.wave >= dungeon.maxWaves;
      let tx, ty;
      if (roomAt(player.x, player.y) === k) { tx = (d.x0 + d.x1) / 2; ty = (d.y0 + d.y1) / 2; }
      else if (boss) { tx = layout.exit.x; ty = layout.exit.y; }
      else { const r = layout.rooms[dungeon.wave]; tx = (r.x0 + r.x1) / 2; ty = (r.y0 + r.y1) / 2; }
      const col = boss ? '#ffcc33' : ((typeof COLORS !== 'undefined' && COLORS.primary) ? COLORS.primary : '#00d4ff');
      const far = dist(player.x, player.y, tx, ty), sp = toScreen(tx, ty, 70);
      ctx.fillStyle = col; ctx.font = 'bold 11px Orbitron, monospace'; ctx.textAlign = 'center';
      if (sp && sp[0] > 40 && sp[0] < w - 40 && sp[1] > 40 && sp[1] < h - 40) {
        // the target is on screen: a small marker bobbing above it, pointing down
        const bob = Math.sin(clock * 4) * 5;
        ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.moveTo(sp[0], sp[1] + 12 + bob); ctx.lineTo(sp[0] - 10, sp[1] - 6 + bob); ctx.lineTo(sp[0] + 10, sp[1] - 6 + bob); ctx.closePath(); ctx.fill();
      } else if (far > 1) {
        // off screen (or behind the camera): an arrow at the screen edge, in the direction the hunter must walk
        const ux = (tx - player.x) / far, uy = (ty - player.y) / far;
        const p0 = toScreen(player.x, player.y, 0), p1 = toScreen(player.x + ux * 150, player.y + uy * 150, 0);
        if (p0 && p1) {
          const a = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]), mg = 70;
          const kk = Math.min((w / 2 - mg) / Math.abs(Math.cos(a) || 1e-6), (h / 2 - mg) / Math.abs(Math.sin(a) || 1e-6));
          ctx.save(); ctx.translate(w / 2 + Math.cos(a) * kk, h / 2 + Math.sin(a) * kk);
          ctx.globalAlpha = 0.7 + 0.3 * Math.sin(clock * 6);
          ctx.fillText(Math.round(far / 10) + 'm', 0, -22);
          ctx.rotate(a); ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-8, -10); ctx.lineTo(-3, 0); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
      }
      ctx.textAlign = 'left'; ctx.globalAlpha = 1;
    }
```
`w` and `h` are the overlay size already declared at the top of `drawFx3D`. If a local named `k`, `d`, `a` or `r` is already declared in the enclosing scope at that point, rename yours so nothing is redeclared (run `node --check` to confirm).

## Change in `js/08-dungeon.js`
In `startDungeon`, replace the line
```js
  layout = (endless || typeof THREE !== 'undefined') ? null : genLayout(gateDef.waves - 1); // rooms and corridors; the open arena stays for endless mode, boss fights and (for now) the 3D view
```
with
```js
  layout = endless ? null : genLayout(gateDef.waves - 1); // rooms and corridors; the open arena stays for endless mode and boss fights
```

## Checks to run before you finish
```bash
node --check 3d/render3d.js || echo FAIL
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done
grep -c '^function clearFloorAndWalls\|^function floorPiece\|^function rebuildLayout3D' 3d/render3d.js   # expect 3
grep -c 'clearFloorAndWalls()' 3d/render3d.js        # expect 3 (the definition line does not count: two calls plus... see note)
grep -c 'typeof THREE' js/08-dungeon.js              # expect 0
grep -c '8b. Between chambers' 3d/render3d.js        # expect 1
git status --short                                   # expect only 3d/render3d.js and js/08-dungeon.js
```
Note on the second grep: it counts lines containing `clearFloorAndWalls()`: the `function clearFloorAndWalls() {` line, the call in `rebuildFloorAndWalls` and the call in `rebuildLayout3D`, so 3.

## Done looks like
No `FAIL` lines, the greps match, two files changed. Do not commit; leave the changes in the working tree.
