# V18 step 5, job E: give the 2D dungeon real walls (a band of stone around every room, a lit face on north walls, posts at doorways)

## Goal
In the 2D view a generated dungeon is drawn by `drawLayout` in `js/11-render-world.js` as floor rectangles with a thin glowing outline, floating on a black void. It reads as a diagram, not a place. Make it read as rooms cut into stone: a dark band of wall around the whole outline, a taller lit wall face along every north edge, and a short stone post at each end of every doorway. Drawing only: nothing about movement or collisions changes.

## Not in this job
Only `js/11-render-world.js` changes, and inside it only the function `drawLayout`. Do not touch `drawArena`, any other function, or any other file. Do not run `tools/stamp.sh`. No props on the floor, no new images, no changes to the floors, the glowing wall lines, the door bars or the exit that are already drawn.

**Strict art rule: plain rectangles and soft gradients only. No star shapes, runes, glyph-like marks, crosses, circles with marks in them, or anything that could read as an occult or religious symbol.**

## What exists
`drawLayout(vx0, vy0, vx1, vy1)` draws, in order: `// 1. Floors`, `// 2. Corridors a little darker`, `// 3. Rooms not yet reached a little darker`, `// 4. Walls` (one glowing stroke along `layout.walls`), `// 5. Doors`, `// 6. The exit: a doorway of light`. `vx0..vy1` is the visible world rectangle. `th` is `floorTheme` (`th.line` is the gate's accent colour). `floorPat` is the repeating floor pattern (may be `null` before the image loads). `layout.rects` is every walkable rectangle `{ x0, y0, x1, y1, kind, i }` (rooms and corridors; corridors overlap 120 units into the rooms they join). `layout.doors` is a list of segments `{ x0, y0, x1, y1, room }`. World y grows downward, so "north" is smaller y.

## Change 1: the wall mass, drawn BEFORE the floors
Insert directly after the line `const th = floorTheme;` and before the comment `// 1. Floors`:
```js
  // 0. Wall mass. Every rectangle is drawn grown outward in dark stone first; the floors painted over it afterwards leave a band
  //    of wall around the whole outline, correct at every corner with no extra geometry. North walls get a taller, lit face.
  const WT = 30, WF = 70, FACE = 46; // wall thickness seen from above; how far the north wall reaches up; height of its lit face
  const near = r => r.x1 + WT > vx0 && r.x0 - WT < vx1 && r.y1 + WT > vy0 && r.y0 - WF < vy1;
  const grown = () => { ctx.beginPath(); for (const r of layout.rects) if (near(r)) ctx.rect(r.x0 - WT, r.y0 - WF, r.x1 - r.x0 + 2*WT, r.y1 - r.y0 + WF + WT); };
  if (floorPat) { ctx.fillStyle = floorPat; grown(); ctx.fill(); }      // the same stone as the floor...
  ctx.fillStyle = floorPat ? 'rgba(4,4,10,0.74)' : '#08080e'; grown(); ctx.fill(); // ...much darker. One path, one fill, so overlaps do not darken twice
  for (const r of layout.rects) { // the lit face of each north wall, directly above the rectangle's top edge
    if (!near(r)) continue;
    const g = ctx.createLinearGradient(0, r.y0 - FACE, 0, r.y0);
    g.addColorStop(0, 'rgba(255,255,255,0.11)'); g.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = g; ctx.fillRect(r.x0, r.y0 - FACE, r.x1 - r.x0, FACE);
    ctx.globalAlpha = 0.28; ctx.fillStyle = th.line; ctx.fillRect(r.x0, r.y0 - FACE - 2, r.x1 - r.x0, 2); ctx.globalAlpha = 1; // the top edge of the face catches the light
  }
```
Leave sections 1 to 4 exactly as they are. (The floors are drawn after this, so wherever a face or a band falls inside another rectangle it is painted over by that rectangle's floor. That is intended.)

## Change 2: posts at the doorways, drawn AFTER the doors
Insert directly after the `ctx.restore();` that ends section `// 5. Doors` and before the comment `// 6. The exit: a doorway of light`:
```js
  // 5b. A short stone post at each end of every doorway
  ctx.save();
  for (const d of layout.doors) for (const [px, py] of [[d.x0, d.y0], [d.x1, d.y1]]) {
    if (px + 20 < vx0 || px - 20 > vx1 || py + 20 < vy0 || py - 40 > vy1) continue;
    ctx.globalAlpha = 1; ctx.fillStyle = '#0b0b12'; ctx.fillRect(px - 13, py - 34, 26, 44);
    ctx.fillStyle = 'rgba(255,255,255,0.09)'; ctx.fillRect(px - 13, py - 34, 26, 6);
    ctx.globalAlpha = 0.45; ctx.strokeStyle = th.line; ctx.lineWidth = 1.5; ctx.strokeRect(px - 13, py - 34, 26, 44);
  }
  ctx.restore();
```

Change nothing else.

## Checks to run before you finish
```bash
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done
grep -c '// 0. Wall mass' js/11-render-world.js        # expect 1
grep -c '// 5b. A short stone post' js/11-render-world.js   # expect 1
grep -c '^function drawLayout' js/11-render-world.js   # expect 1
git diff --stat                                        # expect only js/11-render-world.js, insertions only (0 deletions)
```

## Done looks like
No `FAIL` lines, the greps match, one file changed with insertions only. Do not commit; leave the changes in the working tree.
