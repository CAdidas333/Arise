'use strict';

// balance_bot.js — headlessly plays every Arise gate with a scripted hunter, seeded and
// repeatable, and prints a balance table: how hard each gate actually is at its required
// level, for a given bot "player skill" (the chance to read and dodge a telegraph).
//
// Usage:
//   node tools/balance_bot.js                   # all gates, 20 seeds, skill 0.9
//   node tools/balance_bot.js --gate e_gate     # one gate
//   node tools/balance_bot.js --seeds 40        # more runs per gate (median basis)
//   node tools/balance_bot.js --skill 0.5       # harsher bot (dodge decision accuracy)
//   node tools/balance_bot.js --json            # machine-readable output
//
// Exit code 0 on success, 1 on any bug. Node built-ins only (tools/lib/headless.js).
//
// What a run looks like: a fresh hunter at the gate's required level, no gear, one free
// potion, stat points auto-assigned and skill points spent round-robin across the three
// trees. The bot walks the dungeon (BFS over the room/hall rects), kites in, slashes,
// uses dash/shadow on cooldown, awakening at 100, potion below 35% HP, "ARISE." on any
// shattered remnant, and dodges a telegraph that is about to land with probability = skill.
// Stat points earned mid-run stay unspent, exactly like a hunter who doesn't open menus
// mid-combat; the entry build is what fights.

const { createGame } = require('./lib/headless.js');

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : def;
};
const GATE_PICK = flag('gate', '');
const RUNS = Math.max(1, Math.min(40, parseInt(flag('seeds', '20'), 10) || 20));
const SKILL = Math.max(0, Math.min(1, parseFloat(flag('skill', '0.9')) || 0.9));
const JSON_OUT = args.includes('--json');

const DT = 1 / 60;                        // in-game step, seconds
const GATE_CAP = 1200;                    // in-game seconds before a run is declared stuck
const ENDLESS_CAP = 1200;
const REACH = 92;                         // slash effectively connects within ~92px

// Host-side PRNG for the bot's dodge decisions — independent of the game's seed, so skill
// probability is exactly what it claims to be.
function makeRng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const inside = (r, x, y) => x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
const overlap = (a, b) => a !== b && a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;

// BFS over the layout rects (rooms first, then halls) to the rect containing tx,ty.
function pathTo(layout, x, y, tx, ty) {
  const rects = layout.rects;
  const start = rects.findIndex(r => inside(r, x, y));
  const goal = rects.findIndex(r => inside(r, tx, ty));
  if (start < 0 || goal < 0 || start === goal) return null;
  const prev = new Map();
  const seen = new Set([start]);
  let frontier = [start];
  while (frontier.length) {
    const next = [];
    for (const i of frontier) {
      for (let j = 0; j < rects.length; j++) {
        if (seen.has(j) || !overlap(rects[i], rects[j])) continue;
        seen.add(j);
        prev.set(j, i);
        if (j === goal) {
          const path = [j];
          for (let k = j; prev.has(k); k = prev.get(k)) path.push(prev.get(k));
          return path.reverse(); // rects[start] .. rects[goal]
        }
        next.push(j);
      }
    }
    frontier = next;
  }
  return null;
}

function rectCenter(r) {
  return { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 };
}

// Walk from where the hunter stands toward the entry of chamber `wave` (0-based rooms[]).
function walkToRoom(api, wave) {
  const layout = api.layout, p = api.player;
  const target = layout.rooms[wave];
  const path = pathTo(layout, p.x, p.y, (target.x0 + target.x1) / 2, (target.y0 + target.y1) / 2);
  const wp = path && path.length > 1 ? rectCenter(layout.rects[path[1]]) : rectCenter(target);
  return wp;
}

// The dead-end stub that holds the exit portal: walk there for the boss hunt.
function walkToExit(api) {
  const layout = api.layout, p = api.player, e = layout.exit;
  if (inside(insideRect(layout, e.x, e.y), p.x, p.y)) return e;      // already in the stub
  const path = pathTo(layout, p.x, p.y, e.x, e.y);
  return path && path.length > 1 ? rectCenter(layout.rects[path[1]]) : e;
}

function insideRect(layout, x, y) {
  return layout.rects.find(r => inside(r, x, y)) || layout.rects[0];
}

function steer(api, x, y) {
  const p = api.player;
  const dx = x - p.x, dy = y - p.y, d = Math.hypot(dx, dy) || 1;
  api.touchJoystick.active = true;
  api.touchJoystick.dx = dx / d;
  api.touchJoystick.dy = dy / d;
}
function halt(api) {
  api.touchJoystick.active = false;
  api.touchJoystick.dx = 0;
  api.touchJoystick.dy = 0;
}

function nearestLive(api) {
  const p = api.player;
  let best = null, bd = Infinity;
  for (const e of api.enemies) {
    if (!e.alive || e.spawnT > 0) continue;
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    if (d < bd) { bd = d; best = e; }
  }
  return { e: best, d: bd };
}

function covers(g, p) {
  if (g.type === 'circle') return Math.hypot(g.x - p.x, g.y - p.y) < g.r + 8;
  const px = p.x - g.x, py = p.y - g.y;
  const along = px * g.ax + py * g.ay, across = Math.abs(py * g.ax - px * g.ay);
  return along > -8 && along < g.len + 8 && across < g.w / 2 + 8;
}

function escapeDir(g, p) {
  if (g.type === 'circle') {
    const dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy);
    return d > 1 ? { x: dx / d, y: dy / d } : { x: 1, y: 0 };
  }
  const s = p.y * g.ax - p.x * g.ay; // signed perpendicular offset from the lane axis
  return s >= 0 ? { x: -g.ay, y: g.ax } : { x: g.ay, y: -g.ax };
}

function tryDodge(api, skill, rng, seen) {
  const p = api.player;
  if (p.dodgeCd > 0) return false;
  for (const g of api.telegraphs) {
    if (seen.has(g)) continue;
    const rem = g.dur - g.t;
    if (rem <= 0 || rem > 0.25) continue;          // decide once, in the last 0.25s: imminent
    if (!covers(g, p)) continue;
    seen.add(g);                                    // "decide once per telegraph"
    if (rng() < skill) {
      const dir = escapeDir(g, p);
      api.moveDir.x = dir.x; api.moveDir.y = dir.y;
      api.dodge();
      return true;
    }
  }
  return false;
}

function act(api, skill, rng, seen) {
  const d = api.dungeon, p = api.player;
  if (d.state !== 'fight') { return; }
  if (p.hp < p.maxHp * 0.35) api.usePotion();
  if (api.nearRemnant()) api.tryArise();

  const dodging = tryDodge(api, skill, rng, seen);

  const { e: tgt } = nearestLive(api);
  const layout = api.layout;
  let mx = null, my = null;

  if (layout === null) {
    if (tgt) { mx = tgt.x; my = tgt.y; }            // boss arena: close on the boss
  } else if (layout.lock < 0) {
    if (!d.endless && d.wave === d.maxWaves) { const wp = walkToExit(api); mx = wp.x; my = wp.y; }
    else if (!d.endless) { const wp = walkToRoom(api, d.wave); mx = wp.x; my = wp.y; }
    else if (tgt) { mx = tgt.x; my = tgt.y; }
  } else {
    if (tgt) { mx = tgt.x; my = tgt.y; }            // locked in: fight the nearest enemy
  }

  if (dodging) { /* dodge already set moveDir */ }
  else if (mx === null) halt(api);
  else steer(api, mx, my);

  if (tgt) {
    const dx = tgt.x - p.x, dy = tgt.y - p.y, dist = Math.hypot(dx, dy);
    if (dist > 1) { p.facing = { x: dx / dist, y: dy / dist }; }
    if (dist <= REACH) api.useSkill(api.SKILL.slash);
    if (p.level >= 3 && dist <= api.SKILL.dash_strike.range && (p.cds.dash_strike || 0) <= 0 && p.mp >= 15) api.useSkill(api.SKILL.dash_strike);
    if (p.level >= 6 && dist <= api.SKILL.shadow_strike.range && (p.cds.shadow_strike || 0) <= 0 && p.mp >= 25) api.useSkill(api.SKILL.shadow_strike);
    if (p.level >= 10 && dist <= api.SKILL.rulers.range && (p.cds.rulers || 0) <= 0 && p.mp >= 50) api.useSkill(api.SKILL.rulers);
    if (p.shadows.some(s => s.active) && (p.cds.legion || 0) <= 0 && p.mp >= 40) api.useSkill(api.SKILL.legion);
    if (p.level >= api.SKILL.ult.unlockLevel && p.ult >= 100 && p.ultT <= 0) api.castUlt();
  }
}

function sim(api, startedAt, cap, skill, seed, endless) {
  api.reseed(seed);
  api.resetWorld();
  const rng = makeRng(seed * 7919);      // independent dodge stream, but still seeded

  const p = api.createPlayer('Bot');
  api.player = p;
  p.level = endless ? 1 : startedAt.level;
  p.statPoints = endless ? 0 : 5 * (startedAt.level - 1);
  if (!endless) api.autoAssign();        // balanced spread; full heal decided by the game
  p.skillPoints = endless ? 0 : Math.floor(startedAt.level / 2);
  p.tree = {};
  while (p.skillPoints > 0) {            // spend round-robin across the 3 branches
    let spent = false;
    for (const branch of api.TREE) for (const n of branch.nodes) {
      if (p.skillPoints <= 0) break;
      if ((p.tree[n.id] || 0) >= n.max || (n.prev && !(p.tree[n.prev] > 0))) continue;
      api.buyNode(n.id); spent = true;
    }
    if (!spent) break;
  }

  const entryLevel = p.level, entryPotions = p.potions;
  api.startDungeon(api.GATE_DEFS[0], endless);

  const seen = new Set();
  let t = 0;
  while (t < cap) {
    const d = api.dungeon;
    if (!d || api.gameState !== 'DUNGEON') break;
    if (d.state === 'cleared' || d.state === 'dead') break;
    if (d.state === 'boon') { api.chooseBoon(0); }
    else if (d.state === 'fight') act(api, skill, rng, seen);
    api.step(DT);
    t += DT;
  }

  const d = api.dungeon;
  const pl = api.player;
  const cleared = !!(d && d.state === 'cleared');
  const result = {
    cleared,
    wave: d ? d.wave : 0,
    time: d && api.run ? api.run.time : t,
    levelUp: pl.level - entryLevel,
    level: pl.level,
    skillPointsEarned: Math.floor(pl.level / 2),
    shadows: pl.shadows.length,
    dmgPct: pl.maxHp > 0 ? (api.run ? api.run.dmgTaken : 0) / pl.maxHp * 100 : 0,
    potions: Math.max(0, Math.min(entryPotions, entryPotions - pl.potions)),
  };
  result.treePoints = Object.values(pl.tree).reduce((a, b) => a + b, 0);
  return result;
}

const median = arr => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const fmtTime = sec => {
  if (sec === null || sec === undefined) return '—';
  const m = Math.floor(sec / 60), s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

function main() {
  const { api } = createGame();

  let gates = api.GATE_DEFS;
  if (GATE_PICK) {
    gates = gates.filter(g => g.id === GATE_PICK);
    if (!gates.length) { console.error(`unknown gate: ${GATE_PICK}`); process.exit(1); }
  }

  const gateRows = [];
  for (const gate of gates) {
    const rows = [];
    for (let i = 0; i < RUNS; i++) {
      rows.push(sim(api, { level: gate.reqLevel }, GATE_CAP, SKILL, i + 1, false));
    }
    gateRows.push({ gate: gate.id, level: gate.reqLevel, rows, seedBase: 1 });
  }

  const endlessRows = [];
  for (let i = 0; i < RUNS; i++) endlessRows.push(sim(api, null, ENDLESS_CAP, SKILL, i + 1, true));

  // Totals: every skill node ranks to its max, one point every 2 levels (js/04-player-fx.js:58)
  const treeTotal = api.TREE.reduce((a, b) => a + b.nodes.reduce((x, n) => x + n.max, 0), 0);
  const treeLevel = treeTotal * 2;

  if (JSON_OUT) {
    process.stdout.write(JSON.stringify({
      seeds: RUNS,
      skill: SKILL,
      gates: gateRows.map(g => ({ gate: g.gate, reqLevel: g.level, runs: g.rows })),
      endless: endlessRows,
      totals: { skillPointsToFillTree: treeTotal, earnedByLevel: treeLevel },
    }, null, 2) + '\n');
    return;
  }

  const pad = (s, n) => String(s).padStart(n);
  console.log(`Arise balance bot — ${RUNS} seeded runs per gate at a bot skill of ${SKILL}`);
  console.log('');
  console.log(`${pad('gate', 9)}${pad('lvl', 6)}${pad('cleared', 9)}${pad('median time', 12)}${pad('lvl gained', 11)}${pad('dmg taken', 10)}${pad('potions', 9)}${pad('deaths', 8)}`);
  for (const g of gateRows) {
    const rows = g.rows;
    const cleared = rows.filter(r => r.cleared).length;
    const t = median(rows.filter(r => r.cleared).map(r => r.time));
    console.log(
      `${pad(g.gate, 9)}${pad(g.level, 6)}${pad(cleared + '/' + rows.length, 9)}` +
      `${pad(fmtTime(t), 12)}${pad(median(rows.map(r => r.levelUp)), 11)}` +
      `${pad(median(rows.map(r => r.dmgPct)).toFixed(0) + '%', 10)}` +
      `${pad(median(rows.map(r => r.potions)), 9)}${pad(rows.length - cleared, 8)}`
    );
  }
  console.log('');
  const ef = median(endlessRows.map(r => r.wave)),
        el = median(endlessRows.map(r => r.level)),
        es = median(endlessRows.map(r => r.skillPointsEarned)),
        eh = median(endlessRows.map(r => r.shadows));
  console.log(`ENDLESS (Demon Castle, bot skill ${SKILL}): floor ${ef} · level ${el} · skill points ${es} · shadows ${eh}  (medians)`);
  console.log('');
  console.log(`TOTAL to fill every skill node: ${treeTotal} points — a hunter earns that at level ${treeLevel} (one point every 2 levels)`);
}

try {
  main();
  process.exitCode = 0;
} catch (err) {
  console.error('[balance_bot] ' + err.stack);
  process.exitCode = 1;
}