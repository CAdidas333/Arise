'use strict';

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../js/03a-layout.js'), 'utf8');
const stubs = 'let arenaW = 1400, arenaH = 1000;\nconst clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));\n';

const testBody = `
function testRectDist(a, b) {
  const dx = Math.max(0, a.x0 - b.x1, b.x0 - a.x1);
  const dy = Math.max(0, a.y0 - b.y1, b.y0 - a.y1);
  return Math.hypot(dx, dy);
}

// Rule 12: Arena check (runs once)
layout = null;
const p1 = keepIn(5000, 0, 20);
if (p1.x !== 680 || p1.y !== 0) throw new Error('Rule 12: keepIn(5000, 0, 20) expected {x:680,y:0}, got ' + JSON.stringify(p1));
const p2 = keepIn(-5000, -5000, 40);
if (p2.x !== -660 || p2.y !== -460) throw new Error('Rule 12: keepIn(-5000, -5000, 40) expected {x:-660,y:-460}, got ' + JSON.stringify(p2));
const p3 = keepIn(10, 20, 20);
if (p3.x !== 10 || p3.y !== 20) throw new Error('Rule 12: keepIn(10, 20, 20) expected {x:10,y:20}, got ' + JSON.stringify(p3));
if (!inMap(739, 0, -40)) throw new Error('Rule 12: inMap(739, 0, -40) expected true');
if (inMap(741, 0, -40)) throw new Error('Rule 12: inMap(741, 0, -40) expected false');
if (roomAt(0, 0) !== -1) throw new Error('Rule 12: roomAt(0, 0) expected -1, got ' + roomAt(0, 0));

let checkedCount = 0;
const shapeCount = { rect: 0, L: 0, two: 0 };

for (let seed = 1; seed <= 1000; seed++) {
  for (let nFight = 2; nFight <= 9; nFight++) {
    const l = genLayout(nFight, seed);
    checkedCount++;

    // --- Rule 1 ---
    if (l.rooms.length !== nFight + 1) throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 1: rooms.length is \${l.rooms.length}\`);
    if (l.halls.length !== nFight + 1) throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 1: halls.length is \${l.halls.length}\`);
    const nParts = l.rooms.reduce((n, rm) => n + rm.parts.length, 0);
    if (l.rects.length !== nParts + nFight + 1) throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 1: rects.length is \${l.rects.length}\`);
    if (l.doors.length !== 2 * nFight + 1) throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 1: doors.length is \${l.doors.length}\`);
    const r0 = l.rooms[0];
    if (r0.x0 !== -280 || r0.y0 !== -230 || r0.x1 !== 280 || r0.y1 !== 230 || r0.kind !== 'room' || r0.i !== 0) {
      throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 1: rooms[0] mismatch\`);
    }
    for (let k = 1; k <= nFight; k++) {
      const r = l.rooms[k];
      const w = r.x1 - r.x0, h = r.y1 - r.y0;
      if (w < 900 || w > 1300 || h < 700 || h > 1000 || r.kind !== 'room' || r.i !== k) {
        throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 1: fight room \${k} invalid size or metadata\`);
      }
    }
    for (let j = 0; j <= nFight; j++) {
      const h = l.halls[j];
      const w = h.x1 - h.x0, ht = h.y1 - h.y0;
      if (w !== 220 && ht !== 220) {
        throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 1: hall \${j} width across is not 220\`);
      }
      if (h.kind !== 'hall' || h.i !== j) {
        throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 1: hall \${j} invalid metadata\`);
      }
    }
    let ri = 0;
    for (let k = 0; k < l.rooms.length; k++) {
      for (const pt of l.rooms[k].parts) {
        if (l.rects[ri++] !== pt) throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 1: rects does not match the parts of room \${k}\`);
      }
    }
    for (let j = 0; j < l.halls.length; j++) {
      if (l.rects[ri + j] !== l.halls[j]) throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 1: rects does not match halls at \${j}\`);
    }

    // --- Rule 2: Clearance ---
    for (let i = 0; i < l.rooms.length; i++) {
      for (let j = i + 1; j < l.rooms.length; j++) {
        if (testRectDist(l.rooms[i], l.rooms[j]) < 160 - 1e-7) {
          throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 2: rooms \${i} and \${j} clearance < 160\`);
        }
      }
    }
    for (let j = 0; j < nFight; j++) {
      for (let k = 0; k <= nFight; k++) {
        if (k !== j && k !== j + 1) {
          if (testRectDist(l.halls[j], l.rooms[k]) < 160 - 1e-7) {
            throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 2: hall \${j} and unjoined room \${k} clearance < 160\`);
          }
        }
      }
    }
    for (let k = 0; k < nFight; k++) {
      if (testRectDist(l.halls[nFight], l.rooms[k]) < 160 - 1e-7) {
        throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 2: stub and room \${k} clearance < 160\`);
      }
    }
    for (let i = 0; i < l.halls.length; i++) {
      for (let j = i + 2; j < l.halls.length; j++) {
        if (testRectDist(l.halls[i], l.halls[j]) < 160 - 1e-7) {
          throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 2: halls \${i} and \${j} clearance < 160\`);
        }
      }
    }

    // --- Rule 3: Overlaps & corners ---
    for (let j = 0; j < nFight; j++) {
      const h = l.halls[j];
      const rA = l.rooms[j], rB = l.rooms[j + 1];
      if (h.y1 - h.y0 === 220) {
        // Horizontal hall (east)
        if (rA.x1 - h.x0 !== 120 || h.x1 - rB.x0 !== 120) {
          throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 3: hall \${j} does not overlap rooms by 120\`);
        }
        if (h.y0 < rA.y0 + 60 || h.y1 > rA.y1 - 60 || h.y0 < rB.y0 + 60 || h.y1 > rB.y1 - 60) {
          throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 3: hall \${j} closer than 60 to room corners\`);
        }
      } else {
        // Vertical hall (north or south)
        if (rB.y1 < rA.y0) {
          // north
          if (rB.y1 - h.y0 !== 120 || h.y1 - rA.y0 !== 120) {
            throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 3: north hall \${j} overlap mismatch\`);
          }
        } else {
          // south
          if (rA.y1 - h.y0 !== 120 || h.y1 - rB.y0 !== 120) {
            throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 3: south hall \${j} overlap mismatch\`);
          }
        }
        if (h.x0 < rA.x0 + 60 || h.x1 > rA.x1 - 60 || h.x0 < rB.x0 + 60 || h.x1 > rB.x1 - 60) {
          throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 3: vertical hall \${j} closer than 60 to room corners\`);
        }
      }
    }
    const stub = l.halls[nFight];
    const rN = l.rooms[nFight];
    if (stub.y1 - stub.y0 === 220) {
      if (rN.x1 - stub.x0 !== 120) throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 3: stub overlap mismatch\`);
    } else {
      if (stub.y0 < rN.y0) {
        if (stub.y1 - rN.y0 !== 120) throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 3: north stub overlap mismatch\`);
      } else {
        if (rN.y1 - stub.y0 !== 120) throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 3: south stub overlap mismatch\`);
      }
    }

    // --- Rule 5: Doors ---
    for (let k = 0; k < l.doors.length; k++) {
      const d = l.doors[k];
      const room = l.rooms[d.room];
      const dLen = Math.hypot(d.x1 - d.x0, d.y1 - d.y0);
      if (Math.abs(dLen - 220) > 1e-6) throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 5: door \${k} length is \${dLen}\`);

      const onEdge =
        (d.y0 === d.y1 && (d.y0 === room.y0 || d.y0 === room.y1) && Math.min(d.x0, d.x1) >= room.x0 && Math.max(d.x0, d.x1) <= room.x1) ||
        (d.x0 === d.x1 && (d.x0 === room.x0 || d.x0 === room.x1) && Math.min(d.y0, d.y1) >= room.y0 && Math.max(d.y0, d.y1) <= room.y1);
      if (!onEdge) throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 5: door \${k} not on room edge\`);

      const h = l.halls[Math.floor(k / 2)];
      const mx = (d.x0 + d.x1) / 2, my = (d.y0 + d.y1) / 2;
      if (!(mx > h.x0 && mx < h.x1 && my > h.y0 && my < h.y1)) {
        throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 5: door \${k} midpoint not strictly inside hall\`);
      }
    }

    // --- Rule 6: Exit & Bounds ---
    if (!(l.exit.x > stub.x0 && l.exit.x < stub.x1 && l.exit.y > stub.y0 && l.exit.y < stub.y1)) {
      throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 6: exit not strictly inside stub\`);
    }
    for (let k = 0; k < l.rooms.length; k++) {
      const rm = l.rooms[k];
      if (l.exit.x >= rm.x0 && l.exit.x <= rm.x1 && l.exit.y >= rm.y0 && l.exit.y <= rm.y1) {
        throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 6: exit inside room \${k}\`);
      }
    }
    for (let k = 0; k < l.rects.length; k++) {
      const r = l.rects[k];
      if (r.x0 < l.bounds.x0 || r.x1 > l.bounds.x1 || r.y0 < l.bounds.y0 || r.y1 > l.bounds.y1) {
        throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 6: rect \${k} outside bounds\`);
      }
    }
    if (!l.rects.some(r => r.x0 === l.bounds.x0) ||
        !l.rects.some(r => r.x1 === l.bounds.x1) ||
        !l.rects.some(r => r.y0 === l.bounds.y0) ||
        !l.rects.some(r => r.y1 === l.bounds.y1)) {
      throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 6: bounds does not touch rectangles on all 4 sides\`);
    }

    // --- Rule 11: Determinism ---
    const lRepeat = genLayout(nFight, seed);
    if (JSON.stringify(l) !== JSON.stringify(lRepeat)) {
      throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 11: non-deterministic output\`);
    }

    // --- Rule 13: Room shapes (parts, cuts, cover) ---
    for (let k = 0; k < l.rooms.length; k++) {
      const rm = l.rooms[k], tag = 'Seed ' + seed + ', nFight ' + nFight + ', Rule 13: room ' + k + ' ';
      const bw = rm.x1 - rm.x0, bh = rm.y1 - rm.y0;
      if (!Array.isArray(rm.parts) || !rm.parts.length || !Array.isArray(rm.cuts) || !Array.isArray(rm.cover) || !rm.cover.length) throw new Error(tag + 'has no parts, cuts or cover');
      if (k === 0 && (rm.shape !== 'rect' || rm.parts.length !== 1 || rm.cuts.length !== 0)) throw new Error(tag + 'the entry room is not a plain rectangle');
      if (rm.cuts.length > 2) throw new Error(tag + 'has more than two cut corners');
      if (rm.shape !== ['rect', 'L', 'two'][rm.cuts.length]) throw new Error(tag + 'shape ' + rm.shape + ' does not match ' + rm.cuts.length + ' cuts');
      if (k >= 1) shapeCount[rm.shape]++;
      let partArea = 0;
      for (let a = 0; a < rm.parts.length; a++) {
        const pa = rm.parts[a];
        if (!(pa.x1 > pa.x0 && pa.y1 > pa.y0)) throw new Error(tag + 'part ' + a + ' is empty');
        if (pa.x0 < rm.x0 || pa.x1 > rm.x1 || pa.y0 < rm.y0 || pa.y1 > rm.y1) throw new Error(tag + 'part ' + a + ' is outside the bounding rectangle');
        if (pa.kind !== 'room' || pa.i !== k) throw new Error(tag + 'part ' + a + ' is not tagged as the room');
        partArea += (pa.x1 - pa.x0) * (pa.y1 - pa.y0);
        for (let b = a + 1; b < rm.parts.length; b++) {
          const pb = rm.parts[b];
          if (pa.x0 < pb.x1 && pa.x1 > pb.x0 && pa.y0 < pb.y1 && pa.y1 > pb.y0) throw new Error(tag + 'parts ' + a + ' and ' + b + ' overlap');
        }
      }
      let cutArea = 0;
      for (let a = 0; a < rm.cuts.length; a++) {
        const c = rm.cuts[a], cw = c.x1 - c.x0, ch = c.y1 - c.y0;
        if ((c.x0 !== rm.x0 && c.x1 !== rm.x1) || (c.y0 !== rm.y0 && c.y1 !== rm.y1) || c.x0 < rm.x0 || c.x1 > rm.x1 || c.y0 < rm.y0 || c.y1 > rm.y1) throw new Error(tag + 'cut ' + a + ' is not a corner of the room');
        if (cw < Math.round(bw * 0.25) || cw > Math.round(bw * 0.38) || ch < Math.round(bh * 0.25) || ch > Math.round(bh * 0.38)) throw new Error(tag + 'cut ' + a + ' is ' + cw + ' by ' + ch + ' in a ' + bw + ' by ' + bh + ' room');
        cutArea += cw * ch;
        for (let b = a + 1; b < rm.cuts.length; b++) {
          const d = rm.cuts[b];
          if (c.x0 < d.x1 && c.x1 > d.x0 && c.y0 < d.y1 && c.y1 > d.y0) throw new Error(tag + 'cuts ' + a + ' and ' + b + ' overlap');
        }
        for (let j = 0; j < l.halls.length; j++) {
          if (testRectDist(c, l.halls[j]) < 60 - 1e-7) throw new Error(tag + 'cut ' + a + ' comes within 60 of hall ' + j);
        }
        // a cut corner is not floor: no cover rectangle reaches into it
        for (const cv of rm.cover) if (cv.x0 < c.x1 && cv.x1 > c.x0 && cv.y0 < c.y1 && cv.y1 > c.y0) throw new Error(tag + 'cover reaches into cut ' + a);
      }
      if (Math.abs(partArea - (bw * bh - cutArea)) > 1e-6) throw new Error(tag + 'parts cover ' + partArea + ' but the floor is ' + (bw * bh - cutArea));
      // the parts are connected: they share edges of positive length
      const seen = new Set([0]), todo = [0];
      while (todo.length) {
        const a = rm.parts[todo.pop()];
        rm.parts.forEach((pb, b) => {
          if (seen.has(b)) return;
          const shareX = Math.min(a.x1, pb.x1) - Math.max(a.x0, pb.x0), shareY = Math.min(a.y1, pb.y1) - Math.max(a.y0, pb.y0);
          if ((shareX > 0 && (a.y1 === pb.y0 || a.y0 === pb.y1)) || (shareY > 0 && (a.x1 === pb.x0 || a.x0 === pb.x1))) { seen.add(b); todo.push(b); }
        });
      }
      if (seen.size !== rm.parts.length) throw new Error(tag + 'parts are not connected');
      // the centre is floor, and every cover rectangle lies inside the floor
      const cx = (rm.x0 + rm.x1) / 2, cy = (rm.y0 + rm.y1) / 2;
      const inPart = (x, y) => rm.parts.some(pa => x >= pa.x0 && x <= pa.x1 && y >= pa.y0 && y <= pa.y1);
      if (!inPart(cx, cy)) throw new Error(tag + 'centre is not in a part');
      for (const cv of rm.cover) for (const fx of [0, 0.25, 0.5, 0.75, 1]) for (const fy of [0, 0.25, 0.5, 0.75, 1]) {
        if (!inPart(cv.x0 + fx * (cv.x1 - cv.x0), cv.y0 + fy * (cv.y1 - cv.y0))) throw new Error(tag + 'a cover rectangle leaves the floor');
      }
      for (const pa of rm.parts) for (const fx of [0, 0.25, 0.5, 0.75, 1]) for (const fy of [0, 0.25, 0.5, 0.75, 1]) {
        const x = pa.x0 + fx * (pa.x1 - pa.x0), y = pa.y0 + fy * (pa.y1 - pa.y0);
        if (!rm.cover.some(cv => x >= cv.x0 && x <= cv.x1 && y >= cv.y0 && y <= cv.y1)) throw new Error(tag + 'part point (' + x + ',' + y + ') is not covered');
      }
      if (rm.shape === 'rect' && (rm.parts.length !== 1 || rm.cover.length !== 1)) throw new Error(tag + 'a plain room has more than one part');
    }

    // Slower rules run when seed % 20 === 0
    if (seed % 20 === 0) {
      // --- Rule 4: Walls ---
      for (let wIdx = 0; wIdx < l.walls.length; wIdx++) {
        const w = l.walls[wIdx];
        if (w.x0 !== w.x1 && w.y0 !== w.y1) throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 4: wall \${wIdx} not axis-aligned\`);
        const len = Math.hypot(w.x1 - w.x0, w.y1 - w.y0);
        if (len <= 1) throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 4: wall \${wIdx} length <= 1\`);
      }

      for (let rIdx = 0; rIdx < l.rects.length; rIdx++) {
        const r = l.rects[rIdx];
        // 4 edges: [isVert, fixedCoord, minVar, maxVar]
        const edges = [
          [false, r.y0, r.x0, r.x1],
          [false, r.y1, r.x0, r.x1],
          [true, r.x0, r.y0, r.y1],
          [true, r.x1, r.y0, r.y1]
        ];

        for (let eIdx = 0; eIdx < edges.length; eIdx++) {
          const [isVert, C, vMin, vMax] = edges[eIdx];
          const intervalEnds = [vMin, vMax];
          const side = eIdx % 2; // 0: top or left edge, 1: bottom or right edge
          const across = (o) => isVert ? ((o.x0 < C && C < o.x1) || (side ? o.x0 : o.x1) === C) : ((o.y0 < C && C < o.y1) || (side ? o.y0 : o.y1) === C); // o crosses the edge or lies right against it
          for (let oIdx = 0; oIdx < l.rects.length; oIdx++) {
            if (oIdx === rIdx) continue;
            const o = l.rects[oIdx];
            if (isVert) {
              if (across(o)) {
                if (o.y0 >= vMin && o.y0 <= vMax) intervalEnds.push(o.y0);
                if (o.y1 >= vMin && o.y1 <= vMax) intervalEnds.push(o.y1);
              }
            } else {
              if (across(o)) {
                if (o.x0 >= vMin && o.x0 <= vMax) intervalEnds.push(o.x0);
                if (o.x1 >= vMin && o.x1 <= vMax) intervalEnds.push(o.x1);
              }
            }
          }

          for (let v = vMin; v <= vMax; v += 10) {
            let nearEnd = false;
            for (let endIdx = 0; endIdx < intervalEnds.length; endIdx++) {
              if (Math.abs(v - intervalEnds[endIdx]) <= 2) {
                nearEnd = true;
                break;
              }
            }
            if (nearEnd) continue;

            const px = isVert ? C : v;
            const py = isVert ? v : C;

            let strictlyInside = false;
            for (let oIdx = 0; oIdx < l.rects.length; oIdx++) {
              if (oIdx === rIdx) continue;
              const o = l.rects[oIdx];
              if (across(o) && (isVert ? (py > o.y0 && py < o.y1) : (px > o.x0 && px < o.x1))) {
                strictlyInside = true;
                break;
              }
            }

            let onWall = false;
            for (let wIdx = 0; wIdx < l.walls.length; wIdx++) {
              const w = l.walls[wIdx];
              if (isVert) {
                if (w.x0 === C && w.x1 === C && py >= Math.min(w.y0, w.y1) && py <= Math.max(w.y0, w.y1)) {
                  onWall = true;
                  break;
                }
              } else {
                if (w.y0 === C && w.y1 === C && px >= Math.min(w.x0, w.x1) && px <= Math.max(w.x0, w.x1)) {
                  onWall = true;
                  break;
                }
              }
            }

            if (onWall !== !strictlyInside) {
              throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 4: sample point (\${px},\${py}) strictlyInside=\${strictlyInside}, onWall=\${onWall}\`);
            }
          }
        }
      }

      // --- Rule 7: keepIn and inMap ---
      layout = l;
      let testRngState = (seed * 37 + 1013904223) | 0;
      function nextTestRng() {
        testRngState = (testRngState + 0x6D2B79F5) | 0;
        let t = Math.imul(testRngState ^ (testRngState >>> 15), testRngState | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      }

      const gx0 = l.bounds.x0 - 300, gx1 = l.bounds.x1 + 300;
      const gy0 = l.bounds.y0 - 300, gy1 = l.bounds.y1 + 300;
      const mValues = [0, 20, 40];
      for (let pt = 0; pt < 100; pt++) {
        const qx = gx0 + nextTestRng() * (gx1 - gx0);
        const qy = gy0 + nextTestRng() * (gy1 - gy0);
        for (let mIdx = 0; mIdx < mValues.length; mIdx++) {
          const m = mValues[mIdx];
          const kept = keepIn(qx, qy, m);
          if (!inMap(kept.x, kept.y, m - 0.001)) {
            throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 7: keepIn result (\${kept.x},\${kept.y}) not inMap(m=\${m})\`);
          }
          if (inMap(qx, qy, m)) {
            if (Math.abs(kept.x - qx) > 1e-6 || Math.abs(kept.y - qy) > 1e-6) {
              throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 7: keepIn altered already-valid point (\${qx},\${qy})\`);
            }
          }
        }
      }

      // --- Rule 8: Walkability ---
      layout = l;
      const targets = [];
      for (let j = 0; j < nFight; j++) {
        const d0 = l.doors[2 * j];
        targets.push({ x: (d0.x0 + d0.x1) / 2, y: (d0.y0 + d0.y1) / 2 });
        const d1 = l.doors[2 * j + 1];
        targets.push({ x: (d1.x0 + d1.x1) / 2, y: (d1.y0 + d1.y1) / 2 });
        const rNext = l.rooms[j + 1];
        targets.push({ x: (rNext.x0 + rNext.x1) / 2, y: (rNext.y0 + rNext.y1) / 2 });
      }
      const dStub = l.doors[2 * nFight];
      targets.push({ x: (dStub.x0 + dStub.x1) / 2, y: (dStub.y0 + dStub.y1) / 2 });
      targets.push({ x: l.exit.x, y: l.exit.y });

      let cur = { x: 0, y: 0 };
      for (let tIdx = 0; tIdx < targets.length; tIdx++) {
        const tgt = targets[tIdx];
        let steps = 0;
        while (Math.hypot(cur.x - tgt.x, cur.y - tgt.y) > 30) {
          steps++;
          if (steps > 4000) {
            throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 8: target \${tIdx} exceeded 4000 steps\`);
          }
          const dx = tgt.x - cur.x, dy = tgt.y - cur.y;
          const d = Math.hypot(dx, dy);
          const step = Math.min(12, d);
          const nx = cur.x + (dx / d) * step;
          const ny = cur.y + (dy / d) * step;
          cur = keepIn(nx, ny, 20);
        }
      }

      // --- Rule 9: Lock ---
      layout = l;
      for (let k = 1; k <= nFight; k++) {
        layout.lock = k;
        const rk = l.rooms[k];
        for (let pt = 0; pt < 50; pt++) {
          const rx = gx0 + nextTestRng() * (gx1 - gx0);
          const ry = gy0 + nextTestRng() * (gy1 - gy0);
          const p = keepIn(rx, ry, 20);
          if (p.x < rk.x0 + 19.999 || p.x > rk.x1 - 19.999 || p.y < rk.y0 + 19.999 || p.y > rk.y1 - 19.999) {
            layout.lock = -1;
            throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 9: point outside locked room \${k}\`);
          }
        }
        const hk = l.halls[k];
        const hx = (hk.x0 + hk.x1) / 2, hy = (hk.y0 + hk.y1) / 2;
        if (inMap(hx, hy)) {
          layout.lock = -1;
          throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 9: inMap returned true for hall center of \${k}\`);
        }
        const cx = (rk.x0 + rk.x1) / 2, cy = (rk.y0 + rk.y1) / 2;
        if (roomAt(cx, cy) !== k) {
          layout.lock = -1;
          throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 9: roomAt returned \${roomAt(cx, cy)} instead of \${k}\`);
        }
      }
      layout.lock = -1;

      // --- Rule 14: a cut corner is outside every chamber, and a seam between two parts can be walked with a margin ---
      layout = l;
      for (let k = 0; k < l.rooms.length; k++) {
        const rm = l.rooms[k], tag = 'Seed ' + seed + ', nFight ' + nFight + ', Rule 14: room ' + k + ' ';
        for (const c of rm.cuts) {
          for (const [fx, fy] of [[0.5, 0.5], [0.1, 0.1], [0.9, 0.9], [0.1, 0.9], [0.9, 0.1]]) {
            const x = c.x0 + fx * (c.x1 - c.x0), y = c.y0 + fy * (c.y1 - c.y0);
            if (roomAt(x, y) !== -1) throw new Error(tag + 'roomAt is ' + roomAt(x, y) + ' in a cut corner');
            if (inMap(x, y)) throw new Error(tag + 'inMap is true in a cut corner');
            layout.lock = k;
            const inLocked = inMap(x, y);
            layout.lock = -1;
            if (inLocked) throw new Error(tag + 'inMap is true in a cut corner of the locked room');
          }
        }
        for (let a = 0; a < rm.parts.length; a++) for (let b = a + 1; b < rm.parts.length; b++) {
          const pa = rm.parts[a], pb = rm.parts[b];
          let sx0, sx1, sy0, sy1;
          if (pa.y1 === pb.y0 || pa.y0 === pb.y1) { sy0 = sy1 = pa.y1 === pb.y0 ? pa.y1 : pa.y0; sx0 = Math.max(pa.x0, pb.x0); sx1 = Math.min(pa.x1, pb.x1); }
          else if (pa.x1 === pb.x0 || pa.x0 === pb.x1) { sx0 = sx1 = pa.x1 === pb.x0 ? pa.x1 : pa.x0; sy0 = Math.max(pa.y0, pb.y0); sy1 = Math.min(pa.y1, pb.y1); }
          else continue;
          if (Math.max(sx1 - sx0, sy1 - sy0) < 100) continue; // a short seam has no room for a margin of 40
          const mx = (sx0 + sx1) / 2, my = (sy0 + sy1) / 2;
          if (!inMap(mx, my, 40)) throw new Error(tag + 'the seam between parts ' + a + ' and ' + b + ' is not walkable with a margin of 40');
          const kept = keepIn(mx, my, 40);
          if (Math.abs(kept.x - mx) > 1e-6 || Math.abs(kept.y - my) > 1e-6) throw new Error(tag + 'keepIn moves a hunter standing on the seam between parts ' + a + ' and ' + b);
        }
        for (let t = 0; t < 200; t++) { // spawn points are floor, 70 inside a part
          const pt = pointInRoom(k);
          if (!rm.parts.some(pa => pt.x >= pa.x0 + 70 - 1e-6 && pt.x <= pa.x1 - 70 + 1e-6 && pt.y >= pa.y0 + 70 - 1e-6 && pt.y <= pa.y1 - 70 + 1e-6)) throw new Error(tag + 'pointInRoom gave a point outside the floor: (' + pt.x + ',' + pt.y + ')');
        }
      }

      // --- Rule 10: pointInRoom ---
      layout = l;
      for (let k = 1; k <= nFight; k++) {
        const rk = l.rooms[k];
        const cx = (rk.x0 + rk.x1) / 2, cy = (rk.y0 + rk.y1) / 2;
        for (let t = 0; t < 50; t++) {
          const p = pointInRoom(k, cx, cy, 280);
          if (p.x < rk.x0 + 70 || p.x > rk.x1 - 70 || p.y < rk.y0 + 70 || p.y > rk.y1 - 70) {
            throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 10: point outside room shrunk by 70\`);
          }
          if (Math.hypot(p.x - cx, p.y - cy) < 280) {
            throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 10: point closer than 280 to centre\`);
          }
        }
      }
    }
  }
}

// --- Rule 13, across all seeds: about half of the fight chambers are cut, and every shape occurs ---
const fightRooms = shapeCount.rect + shapeCount.L + shapeCount.two, cutShare = (shapeCount.L + shapeCount.two) / fightRooms;
if (cutShare < 0.4 || cutShare > 0.65) throw new Error('Rule 13: share of cut fight rooms is ' + cutShare + ' (' + JSON.stringify(shapeCount) + ')');
if (!shapeCount.rect || !shapeCount.L || !shapeCount.two) throw new Error('Rule 13: a shape never occurs ' + JSON.stringify(shapeCount));
console.error('shapes ' + JSON.stringify(shapeCount) + ' cut share ' + cutShare.toFixed(3));
console.log('PASS ' + checkedCount);
`;

new Function(stubs + src + '\n' + testBody)();
