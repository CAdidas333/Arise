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

for (let seed = 1; seed <= 1000; seed++) {
  for (let nFight = 2; nFight <= 9; nFight++) {
    const l = genLayout(nFight, seed);
    checkedCount++;

    // --- Rule 1 ---
    if (l.rooms.length !== nFight + 1) throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 1: rooms.length is \${l.rooms.length}\`);
    if (l.halls.length !== nFight + 1) throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 1: halls.length is \${l.halls.length}\`);
    if (l.rects.length !== 2 * nFight + 2) throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 1: rects.length is \${l.rects.length}\`);
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
    for (let k = 0; k < l.rooms.length; k++) {
      if (l.rects[k] !== l.rooms[k]) throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 1: rects does not match rooms at \${k}\`);
    }
    for (let j = 0; j < l.halls.length; j++) {
      if (l.rects[l.rooms.length + j] !== l.halls[j]) throw new Error(\`Seed \${seed}, nFight \${nFight}, Rule 1: rects does not match halls at \${j}\`);
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
          for (let oIdx = 0; oIdx < l.rects.length; oIdx++) {
            if (oIdx === rIdx) continue;
            const o = l.rects[oIdx];
            if (isVert) {
              if (o.x0 < C && C < o.x1) {
                if (o.y0 >= vMin && o.y0 <= vMax) intervalEnds.push(o.y0);
                if (o.y1 >= vMin && o.y1 <= vMax) intervalEnds.push(o.y1);
              }
            } else {
              if (o.y0 < C && C < o.y1) {
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
              if (px > o.x0 && px < o.x1 && py > o.y0 && py < o.y1) {
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

console.log('PASS ' + checkedCount);
`;

new Function(stubs + src + '\n' + testBody)();
