'use strict';

// ================================================================
//  DUNGEON LAYOUT & MAP BOUNDS
// ================================================================

let layout = null; // null = the open arena (boss fights, endless mode). Otherwise the object built by genLayout().

const ENTRY_W = 560;
const ENTRY_H = 460;
const HALL_W = 220;
const OV = 120;
const GAP = 160;

function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rectDist(a, b) {
  const dx = Math.max(0, a.x0 - b.x1, b.x0 - a.x1);
  const dy = Math.max(0, a.y0 - b.y1, b.y0 - a.y1);
  return Math.hypot(dx, dy);
}

function subtract1D(intervals, u, v) {
  const res = [];
  for (let i = 0; i < intervals.length; i++) {
    const a = intervals[i][0], b = intervals[i][1];
    if (v <= a || u >= b) {
      res.push([a, b]);
    } else {
      if (u > a) res.push([a, u]);
      if (v < b) res.push([v, b]);
    }
  }
  return res;
}

function computeWalls(rects) {
  const walls = [];
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    const horizEdges = [r.y0, r.y1];
    for (let h = 0; h < 2; h++) {
      const Y = horizEdges[h];
      let spans = [[r.x0, r.x1]];
      for (let j = 0; j < rects.length; j++) {
        if (i === j) continue;
        const o = rects[j];
        if (o.y0 < Y && Y < o.y1) {
          spans = subtract1D(spans, o.x0, o.x1);
        }
      }
      for (let s = 0; s < spans.length; s++) {
        const x0 = spans[s][0], x1 = spans[s][1];
        if (x1 - x0 > 1) {
          walls.push({ x0, y0: Y, x1, y1: Y });
        }
      }
    }
    const vertEdges = [r.x0, r.x1];
    for (let v = 0; v < 2; v++) {
      const X = vertEdges[v];
      let spans = [[r.y0, r.y1]];
      for (let j = 0; j < rects.length; j++) {
        if (i === j) continue;
        const o = rects[j];
        if (o.x0 < X && X < o.x1) {
          spans = subtract1D(spans, o.y0, o.y1);
        }
      }
      for (let s = 0; s < spans.length; s++) {
        const y0 = spans[s][0], y1 = spans[s][1];
        if (y1 - y0 > 1) {
          walls.push({ x0: X, y0, x1: X, y1 });
        }
      }
    }
  }
  return walls;
}

function genLayout(nFight, seed) {
  let initialSeed = (seed !== undefined) ? (seed | 0) : ((Math.random() * 2147483647) | 0);
  let curSeed = initialSeed;

  for (let restart = 0; restart <= 60; restart++) {
    const rng = mulberry32(curSeed);
    const randInt = (min, max) => min + Math.floor(rng() * (max - min + 1));

    const rooms = [
      { x0: -ENTRY_W / 2, y0: -ENTRY_H / 2, x1: ENTRY_W / 2, y1: ENTRY_H / 2, kind: 'room', i: 0 }
    ];
    const halls = [];
    const hallDirs = [];

    let prevDir = null;
    let buildOk = true;

    for (let step = 0; step < nFight; step++) {
      const rA = rooms[step];
      let stepPlaced = false;

      let allowedDirs;
      if (prevDir === 'north') allowedDirs = ['east', 'north'];
      else if (prevDir === 'south') allowedDirs = ['east', 'south'];
      else allowedDirs = ['east', 'north', 'south'];

      for (let attempt = 0; attempt < 40; attempt++) {
        const dir = allowedDirs[randInt(0, allowedDirs.length - 1)];
        const wB = randInt(900, 1300);
        const hB = randInt(700, 1000);
        const gap = randInt(280, 460);

        let rB, hall;
        if (dir === 'east') {
          const rx0 = rA.x1 + gap;
          const rx1 = rx0 + wB;
          const ry0 = randInt(rA.y0 + (HALL_W + 120) - hB, rA.y1 - (HALL_W + 120));
          const ry1 = ry0 + hB;
          rB = { x0: rx0, y0: ry0, x1: rx1, y1: ry1, kind: 'room', i: step + 1 };

          const oy0 = Math.max(rA.y0, rB.y0);
          const oy1 = Math.min(rA.y1, rB.y1);
          const hy0 = randInt(oy0 + 60, oy1 - 60 - HALL_W);
          const hy1 = hy0 + HALL_W;
          hall = { x0: rA.x1 - OV, y0: hy0, x1: rB.x0 + OV, y1: hy1, kind: 'hall', i: step };
        } else if (dir === 'north') {
          const ry1 = rA.y0 - gap;
          const ry0 = ry1 - hB;
          const rx0 = randInt(rA.x0 + (HALL_W + 120) - wB, rA.x1 - (HALL_W + 120));
          const rx1 = rx0 + wB;
          rB = { x0: rx0, y0: ry0, x1: rx1, y1: ry1, kind: 'room', i: step + 1 };

          const ox0 = Math.max(rA.x0, rB.x0);
          const ox1 = Math.min(rA.x1, rB.x1);
          const hx0 = randInt(ox0 + 60, ox1 - 60 - HALL_W);
          const hx1 = hx0 + HALL_W;
          hall = { x0: hx0, y0: rB.y1 - OV, x1: hx1, y1: rA.y0 + OV, kind: 'hall', i: step };
        } else {
          // south
          const ry0 = rA.y1 + gap;
          const ry1 = ry0 + hB;
          const rx0 = randInt(rA.x0 + (HALL_W + 120) - wB, rA.x1 - (HALL_W + 120));
          const rx1 = rx0 + wB;
          rB = { x0: rx0, y0: ry0, x1: rx1, y1: ry1, kind: 'room', i: step + 1 };

          const ox0 = Math.max(rA.x0, rB.x0);
          const ox1 = Math.min(rA.x1, rB.x1);
          const hx0 = randInt(ox0 + 60, ox1 - 60 - HALL_W);
          const hx1 = hx0 + HALL_W;
          hall = { x0: hx0, y0: rA.y1 - OV, x1: hx1, y1: rB.y0 + OV, kind: 'hall', i: step };
        }

        let clear = true;
        // rB clearance: >= GAP to existing rooms and existing halls
        for (let j = 0; j < rooms.length; j++) {
          if (rectDist(rB, rooms[j]) < GAP) { clear = false; break; }
        }
        if (clear) {
          for (let j = 0; j < halls.length; j++) {
            if (rectDist(rB, halls[j]) < GAP) { clear = false; break; }
          }
        }
        // hall clearance: >= GAP to all existing rooms except rA, and all existing halls
        if (clear) {
          for (let j = 0; j < rooms.length - 1; j++) {
            if (rectDist(hall, rooms[j]) < GAP) { clear = false; break; }
          }
        }
        if (clear) {
          for (let j = 0; j < halls.length; j++) {
            if (rectDist(hall, halls[j]) < GAP) { clear = false; break; }
          }
        }

        if (clear) {
          rooms.push(rB);
          halls.push(hall);
          hallDirs.push(dir);
          prevDir = dir;
          stepPlaced = true;
          break;
        }
      }

      if (!stepPlaced) {
        buildOk = false;
        break;
      }
    }

    if (buildOk) {
      // Place stub (halls[nFight])
      const rN = rooms[nFight];
      let allowedStubDirs;
      if (prevDir === 'north') allowedStubDirs = ['east', 'north'];
      else if (prevDir === 'south') allowedStubDirs = ['east', 'south'];
      else allowedStubDirs = ['east', 'north', 'south'];

      let stubPlaced = false;
      for (let attempt = 0; attempt < 40; attempt++) {
        const dir = allowedStubDirs[randInt(0, allowedStubDirs.length - 1)];
        let stub;
        if (dir === 'east') {
          const hy0 = randInt(rN.y0 + 60, rN.y1 - 60 - HALL_W);
          const hy1 = hy0 + HALL_W;
          stub = { x0: rN.x1 - OV, y0: hy0, x1: rN.x1 + 260, y1: hy1, kind: 'hall', i: nFight };
        } else if (dir === 'north') {
          const hx0 = randInt(rN.x0 + 60, rN.x1 - 60 - HALL_W);
          const hx1 = hx0 + HALL_W;
          stub = { x0: hx0, y0: rN.y0 - 260, x1: hx1, y1: rN.y0 + OV, kind: 'hall', i: nFight };
        } else {
          // south
          const hx0 = randInt(rN.x0 + 60, rN.x1 - 60 - HALL_W);
          const hx1 = hx0 + HALL_W;
          stub = { x0: hx0, y0: rN.y1 - OV, x1: hx1, y1: rN.y1 + 260, kind: 'hall', i: nFight };
        }

        let clear = true;
        for (let j = 0; j < rooms.length - 1; j++) {
          if (rectDist(stub, rooms[j]) < GAP) { clear = false; break; }
        }
        if (clear) {
          for (let j = 0; j < halls.length; j++) {
            if (rectDist(stub, halls[j]) < GAP) { clear = false; break; }
          }
        }

        if (clear) {
          halls.push(stub);
          hallDirs.push(dir);
          stubPlaced = true;
          break;
        }
      }

      if (stubPlaced) {
        // Complete layout
        const rects = rooms.concat(halls);
        const walls = computeWalls(rects);

        // Compute doors
        const doors = [];
        for (let j = 0; j < nFight; j++) {
          const h = halls[j];
          const dir = hallDirs[j];
          const r0 = rooms[j], r1 = rooms[j + 1];
          if (dir === 'east') {
            doors.push({ x0: r0.x1, y0: h.y0, x1: r0.x1, y1: h.y1, room: j });
            doors.push({ x0: r1.x0, y0: h.y0, x1: r1.x0, y1: h.y1, room: j + 1 });
          } else if (dir === 'north') {
            doors.push({ x0: h.x0, y0: r0.y0, x1: h.x1, y1: r0.y0, room: j });
            doors.push({ x0: h.x0, y0: r1.y1, x1: h.x1, y1: r1.y1, room: j + 1 });
          } else {
            // south
            doors.push({ x0: h.x0, y0: r0.y1, x1: h.x1, y1: r0.y1, room: j });
            doors.push({ x0: h.x0, y0: r1.y0, x1: h.x1, y1: r1.y0, room: j + 1 });
          }
        }
        // stub door
        const stub = halls[nFight];
        const stubDir = hallDirs[nFight];
        const rN = rooms[nFight];
        if (stubDir === 'east') {
          doors.push({ x0: rN.x1, y0: stub.y0, x1: rN.x1, y1: stub.y1, room: nFight });
        } else if (stubDir === 'north') {
          doors.push({ x0: stub.x0, y0: rN.y0, x1: stub.x1, y1: rN.y0, room: nFight });
        } else {
          // south
          doors.push({ x0: stub.x0, y0: rN.y1, x1: stub.x1, y1: rN.y1, room: nFight });
        }

        // Compute exit: inside stub, centred across it, 80 short of dead end
        let exit;
        if (stubDir === 'east') {
          exit = { x: stub.x1 - 80, y: (stub.y0 + stub.y1) / 2 };
        } else if (stubDir === 'north') {
          exit = { x: (stub.x0 + stub.x1) / 2, y: stub.y0 + 80 };
        } else {
          // south
          exit = { x: (stub.x0 + stub.x1) / 2, y: stub.y1 - 80 };
        }

        // Compute bounds
        let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
        for (let j = 0; j < rects.length; j++) {
          const r = rects[j];
          if (r.x0 < bx0) bx0 = r.x0;
          if (r.y0 < by0) by0 = r.y0;
          if (r.x1 > bx1) bx1 = r.x1;
          if (r.y1 > by1) by1 = r.y1;
        }
        const bounds = { x0: bx0, y0: by0, x1: bx1, y1: by1 };

        return {
          seed: curSeed,
          rooms,
          halls,
          rects,
          walls,
          doors,
          exit,
          bounds,
          lock: -1,
          cleared: 0
        };
      }
    }

    curSeed = (curSeed + 1) | 0;
  }

  throw new Error('genLayout: failed to generate after 60 restarts');
}

function mapRects() {
  if (layout === null) {
    return [{ x0: -arenaW / 2, y0: -arenaH / 2, x1: arenaW / 2, y1: arenaH / 2 }];
  }
  if (layout.lock >= 0) {
    return [layout.rooms[layout.lock]];
  }
  return layout.rects;
}

function inMap(x, y, m = 0) {
  const rects = mapRects();
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (r.x0 + m <= r.x1 - m && r.y0 + m <= r.y1 - m) {
      if (x >= r.x0 + m && x <= r.x1 - m && y >= r.y0 + m && y <= r.y1 - m) {
        return true;
      }
    }
  }
  return false;
}

function keepIn(x, y, m = 0) {
  const rects = mapRects();
  let bestX = x, bestY = y, bestD = Infinity, anyValid = false;
  for (let i = 0; i < rects.length; i++) {
    const r = rects[i];
    if (r.x1 - r.x0 < 2 * m || r.y1 - r.y0 < 2 * m) continue;
    anyValid = true;
    const cx = clamp(x, r.x0 + m, r.x1 - m);
    const cy = clamp(y, r.y0 + m, r.y1 - m);
    const dx = cx - x, dy = cy - y;
    const d2 = dx * dx + dy * dy;
    if (d2 < bestD) {
      bestD = d2;
      bestX = cx;
      bestY = cy;
      if (d2 === 0) break;
    }
  }
  if (!anyValid) return keepIn(x, y, 0);
  return { x: bestX, y: bestY };
}

function roomAt(x, y, m = 0) {
  if (layout === null) return -1;
  const rms = layout.rooms;
  for (let i = 0; i < rms.length; i++) {
    const r = rms[i];
    if (r.x0 + m <= r.x1 - m && r.y0 + m <= r.y1 - m) {
      if (x >= r.x0 + m && x <= r.x1 - m && y >= r.y0 + m && y <= r.y1 - m) {
        return i;
      }
    }
  }
  return -1;
}

function pointInRoom(i, ax, ay, minD) {
  const r = layout.rooms[i];
  const xMin = r.x0 + 70, xMax = r.x1 - 70;
  const yMin = r.y0 + 70, yMax = r.y1 - 70;
  let lastPt = null;
  const checkDist = (minD !== undefined && minD > 0 && ax !== undefined && ay !== undefined);
  for (let tryIdx = 0; tryIdx < 24; tryIdx++) {
    const x = xMin + Math.random() * (xMax - xMin);
    const y = yMin + Math.random() * (yMax - yMin);
    lastPt = { x, y };
    if (!checkDist) return lastPt;
    const dx = x - ax, dy = y - ay;
    if (Math.hypot(dx, dy) >= minD) return lastPt;
  }
  return lastPt;
}

// ----------------------------------------------------------------
//  Room dressing for the 2D dungeon. Drawing only: none of this feeds back into walls, doors or movement.
//  Plain shapes only (strips, quads, straight lines, soft glows). Every position comes from a seeded generator and is built
//  ONCE per layout (cached as layout.decor), so nothing moves between frames and Math.random() is never used here.
// ----------------------------------------------------------------
const distSeg = (px, py, x0, y0, x1, y1) => {
  const dx = x1 - x0, dy = y1 - y0, l2 = dx*dx + dy*dy, t = l2 ? clamp(((px - x0)*dx + (py - y0)*dy)/l2, 0, 1) : 0;
  return dist(px, py, x0 + t*dx, y0 + t*dy);
};

function buildLayoutDecor(L) {
  const dc = { rooms: [], pil: [], runners: [] };
  const gid = (typeof dungeon !== 'undefined' && dungeon && dungeon.gate) ? dungeon.gate.id : ''; // each gate dresses its rooms its own way; no gate (or no match), no props
  const kind = { e_gate:'shroom', d_gate:'crate', c_gate:'web', b_gate:'vent', a_gate:'gold', s_gate:'column' }[gid];
  for (const r of L.rooms) {
    const rng = mulberry32((L.seed*31 + r.i) | 0), rr = (a, b) => a + rng()*(b - a);
    const doors = L.doors.filter(d => d.room === r.i);
    const halls = L.halls.filter(h => h.x0 < r.x1 && h.x1 > r.x0 && h.y0 < r.y1 && h.y1 > r.y0); // corridors that join this room
    const nearDoor = (x, y, m) => doors.some(d => distSeg(x, y, d.x0, d.y0, d.x1, d.y1) < m);
    const inHall = (x, y, m) => halls.some(h => x > h.x0 - m && x < h.x1 + m && y > h.y0 - m && y < h.y1 + m);
    const rd = { r, inlay: [[], []], rubble: [], cracks: [], props: [] };

    // Pilasters along the north wall, one every 240 to 300 units, never within 40 of a door on that wall; every second one carries a torch
    const nd = doors.filter(d => d.y0 === r.y0 && d.y1 === r.y0);
    for (let x = r.x0 + rr(110, 160), k = 0; x < r.x1 - 110; x += rr(240, 300))
      if (!nd.some(d => x > d.x0 - 54 && x < d.x1 + 54)) dc.pil.push({ x, y: r.y0, torch: k++ % 2 === 0, ph: rr(0, TAU) });

    // Floor inlay in the fight rooms: two plain rectangles, 90 and 110 in from the walls, left open where a corridor mouth crosses them
    if (r.i >= 1) [90, 110].forEach((ins, k) => {
      const a = r.x0 + ins, b = r.x1 - ins, c = r.y0 + ins, d = r.y1 - ins;
      for (const y of [c, d]) {
        let spans = [[a, b]];
        for (const h of halls) if (h.y0 < y && y < h.y1) spans = subtract1D(spans, h.x0 - 14, h.x1 + 14);
        for (const [u, v] of spans) if (v - u > 6) rd.inlay[k].push(u, y, v, y);
      }
      for (const x of [a, b]) {
        let spans = [[c, d]];
        for (const h of halls) if (h.x0 < x && x < h.x1) spans = subtract1D(spans, h.y0 - 14, h.y1 + 14);
        for (const [u, v] of spans) if (v - u > 6) rd.inlay[k].push(x, u, x, v);
      }
    });

    // A spot near a wall or in a corner, 36 to 100 in from the wall
    const spot = () => {
      let cx, cy;
      if (rng() < 0.5) { cx = rng() < 0.5 ? r.x0 + rr(36, 100) : r.x1 - rr(36, 100); cy = rng() < 0.5 ? r.y0 + rr(36, 100) : r.y1 - rr(36, 100); } // a corner
      else {
        const side = Math.floor(rng()*4), t = rr(0.08, 0.92);
        if (side < 2) { cx = r.x0 + t*(r.x1 - r.x0); cy = side ? r.y1 - rr(36, 100) : r.y0 + rr(36, 100); }
        else { cy = r.y0 + t*(r.y1 - r.y0); cx = side === 2 ? r.x0 + rr(36, 100) : r.x1 - rr(36, 100); }
      }
      return [cx, cy];
    };

    // Rubble: 3 to 5 clusters of 3 to 6 small stones near a wall or in a corner, none within 60 of a door or in a corridor mouth
    for (let n = 3 + Math.floor(rng()*3), tries = 0; n > 0 && tries < 60; tries++) {
      const [cx, cy] = spot();
      if (nearDoor(cx, cy, 100) || inHall(cx, cy, 60)) continue;
      n--;
      for (let s = 3 + Math.floor(rng()*4); s > 0; s--) {
        const a = rr(0, TAU), d = rr(0, 1)*26, w = rr(6, 12);
        const x = clamp(cx + Math.cos(a)*d*1.2, r.x0 + 14, r.x1 - 14), y = clamp(cy + Math.sin(a)*d*0.8, r.y0 + 14, r.y1 - 14); // a stone never pokes into the wall
        if (nearDoor(x, y, 60) || inHall(x, y, 12)) continue;
        for (let k = 0; k < 4; k++) { // an irregular four-sided stone: top-left, top-right, bottom-right, bottom-left, each corner pulled in and turned a little
          const ang = (225 + 90*k + rr(-28, 28))*Math.PI/180, rad = w*rr(0.55, 1);
          rd.rubble.push(x + Math.cos(ang)*rad, y + Math.sin(ang)*rad*0.85);
        }
      }
    }

    // Cracks: 2 or 3 long jagged lines of 5 to 7 points that start at a wall and run inward
    for (let n = 2 + Math.floor(rng()*2), tries = 0; n > 0 && tries < 40; tries++) {
      const side = Math.floor(rng()*4), t = rr(0.1, 0.9);
      let x = side < 2 ? r.x0 + t*(r.x1 - r.x0) : side === 2 ? r.x0 + 2 : r.x1 - 2;
      let y = side >= 2 ? r.y0 + t*(r.y1 - r.y0) : side === 0 ? r.y0 + 2 : r.y1 - 2;
      let base = [Math.PI/2, -Math.PI/2, 0, Math.PI][side];
      if (nearDoor(x, y, 60) || inHall(x, y, 20)) continue;
      const pts = [x, y];
      for (let k = 4 + Math.floor(rng()*3); k > 0; k--) { // 4 to 6 more points: 5 to 7 in all
        const a = base + rr(-0.9, 0.9), l = rr(45, 90);
        x += Math.cos(a)*l; y += Math.sin(a)*l; base += rr(-0.15, 0.15);
        if (x < r.x0 + 4 || x > r.x1 - 4 || y < r.y0 + 4 || y > r.y1 - 4 || inHall(x, y, 10)) break;
        pts.push(x, y);
      }
      if (pts.length >= 10) { rd.cracks.push(pts); n--; }
    }

    // Gate props: 3 to 5 a room, { t, x, y, s: size 0.8..1.3, ph: phase }, placed like the rubble but never within 100 of a door or
    // in a corridor mouth, and 50 apart. A cobweb takes a whole corner (x, y the corner, q 0 NW, 1 NE, 2 SE, 3 SW), so it stops at 4.
    for (let n = 3 + Math.floor(rng()*3), tries = 0; kind && n > 0 && tries < 60; tries++) {
      let x, y, q = -1;
      if (kind === 'web') {
        q = Math.floor(rng()*4); x = q === 0 || q === 3 ? r.x0 : r.x1; y = q < 2 ? r.y0 : r.y1;
        const sx = q === 0 || q === 3 ? 1 : -1, sy = q < 2 ? 1 : -1; // the web reaches about 44 along both walls, so those ends count too
        if (rd.props.some(o => o.q === q) || [[0, 0], [44*sx, 0], [0, 44*sy]].some(([u, v]) => nearDoor(x + u, y + v, 100) || inHall(x + u, y + v, 40))) continue;
      } else {
        const [cx, cy] = spot(); x = clamp(cx, r.x0 + 30, r.x1 - 30); y = clamp(cy, r.y0 + 30, r.y1 - 30); // inside the room by at least 30
        if (nearDoor(x, y, 100) || inHall(x, y, 60) || rd.props.some(o => dist(x, y, o.x, o.y) < 50)) continue;
      }
      const o = { t: kind, x, y, s: rr(0.8, 1.3), ph: rr(0, TAU) };
      if (q >= 0) o.q = q;
      rd.props.push(o); n--;
    }
    dc.rooms.push(rd);
  }

  // Corridor runners: two thin guide lines down the centre, from room edge to room edge (a dead end stops short of the exit's light)
  for (const h of L.halls) {
    const horiz = h.x1 - h.x0 > h.y1 - h.y0;
    let a = horiz ? h.x0 : h.y0, b = horiz ? h.x1 : h.y1, openA = true, openB = true;
    const mid = (a + b)/2;
    for (const r of L.rooms) {
      if (!(r.x0 < h.x1 && r.x1 > h.x0 && r.y0 < h.y1 && r.y1 > h.y0)) continue;
      const lo = horiz ? r.x0 : r.y0, hi = horiz ? r.x1 : r.y1;
      if (hi < mid) { a = Math.max(a, hi); openA = false; } else if (lo > mid) { b = Math.min(b, lo); openB = false; }
    }
    if (openA) a += 140;
    if (openB) b -= 140;
    if (b - a < 40) continue;
    const c = horiz ? (h.y0 + h.y1)/2 : (h.x0 + h.x1)/2, s = horiz ? [a, c - 15, b, c - 15, a, c + 15, b, c + 15] : [c - 15, a, c - 15, b, c + 15, a, c + 15, b];
    dc.runners.push({ x0: horiz ? a : c - 15, y0: horiz ? c - 15 : a, x1: horiz ? b : c + 15, y1: horiz ? c + 15 : b, s });
  }
  return dc;
}

