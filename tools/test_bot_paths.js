'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const src = fs.readFileSync(path.join(__dirname, '../js/03a-layout.js'), 'utf8');
const stubs = 'let arenaW = 1400, arenaH = 1000;\nconst clamp = (v, mn, mx) => Math.max(mn, Math.min(mx, v));\n';
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(stubs + src, sandbox);
const { genLayout } = sandbox;

const { link, pathTo, floorPoint, stepToward } = require('./balance_bot.js');

function assert(cond, msg) {
  if (!cond) {
    console.error('FAIL: ' + msg);
    process.exit(1);
  }
}

// --- Test link ---
// 1. Two rects sharing a 100-unit edge link (both vertical and horizontal)
assert(link({ x0: 0, y0: 0, x1: 100, y1: 100 }, { x0: 100, y0: 0, x1: 200, y1: 100 }), 'sharing 100-unit vertical edge must link');
assert(link({ x0: 0, y0: 0, x1: 100, y1: 100 }, { x0: 0, y0: 100, x1: 100, y1: 200 }), 'sharing 100-unit horizontal edge must link');

// 2. Sharing only a corner do not link
assert(!link({ x0: 0, y0: 0, x1: 100, y1: 100 }, { x0: 100, y0: 100, x1: 200, y1: 200 }), 'sharing only a corner must not link');

// 3. Sharing a 30-unit edge do not link
assert(!link({ x0: 0, y0: 0, x1: 100, y1: 100 }, { x0: 100, y0: 70, x1: 200, y1: 150 }), 'sharing 30-unit vertical edge must not link');
assert(!link({ x0: 0, y0: 0, x1: 100, y1: 100 }, { x0: 70, y0: 100, x1: 150, y1: 200 }), 'sharing 30-unit horizontal edge must not link');

// 4. Overlapping link
assert(link({ x0: 0, y0: 0, x1: 100, y1: 100 }, { x0: 50, y0: 50, x1: 150, y1: 150 }), 'overlapping rects must link');

// 5. Apart do not link
assert(!link({ x0: 0, y0: 0, x1: 100, y1: 100 }, { x0: 150, y0: 0, x1: 250, y1: 100 }), 'separated vertical rects must not link');
assert(!link({ x0: 0, y0: 0, x1: 100, y1: 100 }, { x0: 0, y0: 150, x1: 100, y1: 250 }), 'separated horizontal rects must not link');

// Walk simulation helper
function walk(layout, startPt, goalPt, maxTicks, seed, room) {
  let cur = { x: startPt.x, y: startPt.y };
  let ticks = 0;
  while (Math.hypot(goalPt.x - cur.x, goalPt.y - cur.y) > 12) {
    ticks++;
    if (ticks > maxTicks) {
      console.error(`Walk exceeded ${maxTicks} ticks. Seed: ${seed}, room: ${room ? room.i : 'end-to-end'}, start: (${startPt.x}, ${startPt.y}), goal: (${goalPt.x}, ${goalPt.y}), cur: (${cur.x}, ${cur.y})`);
      process.exit(1);
    }
    const wp = stepToward(layout, cur.x, cur.y, goalPt.x, goalPt.y);
    const dx = wp.x - cur.x, dy = wp.y - cur.y;
    const d = Math.hypot(dx, dy);
    if (d > 0) {
      const step = Math.min(8, d);
      cur.x += (dx / d) * step;
      cur.y += (dy / d) * step;
    }
    const onRect = layout.rects.some(r => cur.x >= r.x0 && cur.x <= r.x1 && cur.y >= r.y0 && cur.y <= r.y1);
    if (!onRect) {
      console.error(`Left rects at tick ${ticks}. Seed: ${seed}, room: ${room ? room.i : 'end-to-end'}, start: (${startPt.x}, ${startPt.y}), goal: (${goalPt.x}, ${goalPt.y}), cur: (${cur.x}, ${cur.y})`);
      process.exit(1);
    }
  }
}

function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let shapedRoomsCount = 0;
let walksCount = 0;

for (let seed = 1; seed <= 300; seed++) {
  const rng = makeRng((seed * 37) >>> 0);
  for (let nFight = 2; nFight <= 9; nFight++) {
    const layout = genLayout(nFight, seed);
    for (const rm of layout.rooms) {
      if (rm.shape === 'rect') continue;
      shapedRoomsCount++;
      for (let p = 0; p < 6; p++) {
        const p1 = rm.parts[Math.floor(rng() * rm.parts.length)];
        const pt1 = {
          x: p1.x0 + 30 + rng() * (p1.x1 - p1.x0 - 60),
          y: p1.y0 + 30 + rng() * (p1.y1 - p1.y0 - 60),
        };
        const p2 = rm.parts[Math.floor(rng() * rm.parts.length)];
        const pt2 = {
          x: p2.x0 + 30 + rng() * (p2.x1 - p2.x0 - 60),
          y: p2.y0 + 30 + rng() * (p2.y1 - p2.y0 - 60),
        };
        walk(layout, pt1, pt2, 600, seed, rm);
        walksCount++;
      }
    }
    const ep = floorPoint(layout.rooms[0]);
    const lp = floorPoint(layout.rooms[layout.rooms.length - 1]);
    walk(layout, ep, lp, 4000, seed, null);
    walksCount++;
  }
}

console.log(`${shapedRoomsCount} shaped rooms, ${walksCount} walks`);
console.log(`PASS ${walksCount}`);
