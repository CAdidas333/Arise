'use strict';

// balance_bot.js — headlessly plays every Arise gate with a scripted hunter, seeded and
// repeatable, and prints a balance table: how hard each gate actually is at its required
// level, and how generous the game is with levels, for a given bot "player skill" (the
// chance to read and dodge a telegraph that is about to land).
//
// Usage:
//   node tools/balance_bot.js                     # all six gates, skill 0 / 0.5 / 0.9, 5 seeds each
//   node tools/balance_bot.js --gate e_gate       # one gate only (skips the endless block)
//   node tools/balance_bot.js --seeds 3           # fewer seeds per gate (faster)
//   node tools/balance_bot.js --skill 0.5         # one skill level instead of the default three
//   node tools/balance_bot.js --json              # machine-readable output
//
// Exit code 0 on a clean run, 1 on a script error or a bot self-check failure ("BOT ERROR").
// Node built-ins only (the loader lives in tools/lib/headless.js).
//
// A run: a fresh hunter at the gate's required level, no gear, weapon 0, one potion, stat
// points spent the way the game's auto-assign button spreads them, and skill points spent
// round-robin across the three tree branches. The bot walks the dungeon (BFS over the room
// and hall rects), closes on the nearest live enemy, slashes in range, uses its other skills
// when they are off cooldown and an enemy is near, casts the Awakening at 100, drinks a
// potion below 35% HP, raises any shattered remnant it stands on, takes the first boon, and
// dodges a telegraph that is about to land with probability = skill. Stat points earned
// mid-run stay unspent, exactly like a hunter who never opens the menu mid-fight.

const { createGame } = require('./lib/headless.js');

const args = process.argv.slice(2);
const flag = (name, def) => {
  const i = args.indexOf('--' + name);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : def;
};
const GATE_PICK = flag('gate', '');
const RUNS = Math.max(1, Math.min(40, parseInt(flag('seeds', '5'), 10) || 5));
const SKILL_FLAG = flag('skill', null);
// Default policy sweep: a bot that never dodges, one that dodges half the time, one that
// dodges almost always. --skill turns this into a single value.
const SKILLS = SKILL_FLAG === null
  ? [0, 0.5, 0.9]
  : [Math.max(0, Math.min(1, parseFloat(SKILL_FLAG) || 0))];
const JSON_OUT = args.includes('--json');

const DT = 1 / 60;                        // in-game step, seconds
const GATE_CAP = 900;                     // 15 game minutes before a gate run is declared stuck
const ENDLESS_CAP = 600;                  // 10 game minutes per endless run
const ENDLESS_SKILL = 0.5;                // the endless block always plays at skill 0.5
const REACH = 92;                         // slash effectively connects within ~92px

// Host-side PRNG for the bot's dodge decisions — independent of the game's seed, so the
// skill probability is exactly what it claims to be while staying repeatable per run.
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

// Movement goes through the touch joystick, which is exactly what updatePlayer reads (it
// folds keys + joystick into moveDir and moves the hunter). Setting moveDir alone would be
// overwritten by that fold, so the joystick is the honest input channel here.
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

// Does a telegraph's warned area cover the hunter right now?
function covers(g, p) {
  if (g.type === 'circle') return Math.hypot(g.x - p.x, g.y - p.y) < g.r + 8;
  const px = p.x - g.x, py = p.y - g.y;
  const along = px * g.ax + py * g.ay, across = Math.abs(py * g.ax - px * g.ay);
  return along > -8 && along < g.len + 8 && across < g.w / 2 + 8;
}

// A unit vector pointing out of a warned area.
function escapeDir(g, p) {
  if (g.type === 'circle') {
    const dx = p.x - g.x, dy = p.y - g.y, d = Math.hypot(dx, dy);
    return d > 1 ? { x: dx / d, y: dy / d } : { x: 1, y: 0 };
  }
  const s = p.y * g.ax - p.x * g.ay; // signed perpendicular offset from the lane axis
  return s >= 0 ? { x: -g.ay, y: g.ax } : { x: g.ay, y: -g.ax };
}

// Decide once per telegraph, in its last 0.25s, dodge with probability = skill.
function tryDodge(api, skill, rng, seen) {
  const p = api.player;
  if (p.dodgeCd > 0) return false;
  for (const g of api.telegraphs) {
    if (seen.has(g)) continue;
    const rem = g.dur - g.t;
    if (rem <= 0 || rem > 0.25) continue;          // only when it is about to land
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
  if (d.state !== 'fight') return;
  if (p.hp < p.maxHp * 0.35) api.usePotion();
  if (api.nearRemnant()) api.tryArise();

  const dodging = tryDodge(api, skill, rng, seen);

  // In the open arena (endless mode, or the boss hunt) chase the boss if there is one,
  // else the nearest live enemy. With a layout, follow the dungeon's own flow.
  const nearest = nearestLive(api);
  const tgt = d.bossRef || nearest.e;
  const layout = api.layout;
  let mx = null, my = null;

  if (layout === null) {
    if (tgt) { mx = tgt.x; my = tgt.y; }
  } else if (layout.lock < 0) {
    if (!d.endless && d.wave === d.maxWaves) { const wp = walkToExit(api); mx = wp.x; my = wp.y; }
    else { const wp = walkToRoom(api, d.wave); mx = wp.x; my = wp.y; }
  } else if (tgt) {
    mx = tgt.x; my = tgt.y;                         // locked in: fight the nearest enemy
  }

  if (dodging) { /* dodge already set the escape direction */ }
  else if (mx === null) halt(api);
  else steer(api, mx, my);

  if (tgt) {
    const dx = tgt.x - p.x, dy = tgt.y - p.y, dist = Math.hypot(dx, dy);
    if (dist > 1) p.facing = { x: dx / dist, y: dy / dist };
    if (dist <= REACH) api.useSkill(api.SKILL.slash);
    if (dist <= api.SKILL.dash_strike.range && (p.cds.dash_strike || 0) <= 0 && p.mp >= api.SKILL.dash_strike.manaCost) api.useSkill(api.SKILL.dash_strike);
    if (dist <= api.SKILL.shadow_strike.range && (p.cds.shadow_strike || 0) <= 0 && p.mp >= api.SKILL.shadow_strike.manaCost) api.useSkill(api.SKILL.shadow_strike);
    if (dist <= api.SKILL.rulers.range && (p.cds.rulers || 0) <= 0 && p.mp >= api.SKILL.rulers.manaCost) api.useSkill(api.SKILL.rulers);
    // Legion commands the roster; shadows no longer linger on the field, so the test is a
    // non-empty roster (useSkill itself still checks cooldown, mana and unlock level).
    if (p.shadows.length > 0 && (p.cds.legion || 0) <= 0 && p.mp >= api.SKILL.legion.manaCost) api.useSkill(api.SKILL.legion);
    if (p.level >= api.SKILL.ult.unlockLevel && p.ult >= 100 && p.ultT <= 0) api.castUlt();
  }
}

// Spend the hunter's skill points round-robin across the three branches, respecting each
// node's rank cap and its prerequisite (buyNode enforces both; the check just avoids loops).
function spendTree(api, p) {
  while (p.skillPoints > 0) {
    let spent = false;
    for (const branch of api.TREE) {
      for (const n of branch.nodes) {
        if (p.skillPoints <= 0) break;
        if ((p.tree[n.id] || 0) >= n.max) continue;
        if (n.prev && !(p.tree[n.prev] > 0)) continue;
        api.buyNode(n.id); spent = true;
      }
    }
    if (!spent) break;
  }
}

// Play one run. `gate` is the gate to start (ignored by the game in endless mode, which
// opens its own first gate); `cap` is the hard in-game time limit in seconds.
function sim(api, gate, skill, seed, endless, cap) {
  api.reseed(seed);
  api.resetWorld();
  const rng = makeRng(seed * 7919 + Math.round(skill * 1000));

  const p = api.createPlayer('Bot');
  api.player = p;
  p.story.opening = true;
  if (endless) {
    p.level = 1; p.statPoints = 0; p.skillPoints = 0; p.tree = {};
  } else {
    p.level = gate.reqLevel;
    p.statPoints = 5 * (gate.reqLevel - 1);
    api.autoAssign();                       // the game's own auto-assign spread
    p.skillPoints = Math.floor(gate.reqLevel / 2);
    p.tree = {};
    spendTree(api, p);
  }
  const entryLevel = p.level, entryPotions = p.potions;

  api.startDungeon(gate, endless);
  const gateId = api.dungeon.gate.id;       // read back from the live dungeon, not the argument

  const seen = new Set();
  let t = 0, bossSeen = false;
  while (t < cap) {
    const d = api.dungeon;
    if (!d || api.gameState !== 'DUNGEON') break;
    if (d.bossRef) bossSeen = true;
    if (d.state === 'cleared' || d.state === 'dead') break;
    if (d.state === 'boon') api.chooseBoon(0);          // always take the first offered
    else if (d.state === 'fight') act(api, skill, rng, seen);
    api.step(DT);
    t += DT;
  }

  const d = api.dungeon, pl = api.player;
  const cleared = !!(d && d.state === 'cleared');
  const end = cleared ? 'cleared' : (d && d.state === 'dead') ? 'dead' : 'stuck';
  return {
    gateId,
    cleared,
    end,
    wave: d ? d.wave : 0,
    maxWaves: d && d.maxWaves !== Infinity ? d.maxWaves : null,
    bossKilled: bossSeen && !(d && d.bossRef),
    time: api.run ? api.run.time : t,
    levelUp: pl.level - entryLevel,
    level: pl.level,
    dmgPct: pl.maxHp > 0 ? (api.run ? api.run.dmgTaken : 0) / pl.maxHp * 100 : 0,
    potions: entryPotions - pl.potions,
    shadows: pl.shadows.length,
    skillPointsEarned: Math.floor(pl.level / 2),
  };
}

const median = arr => {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};
const fmtTime = sec => {
  if (sec === null || sec === undefined) return '—';
  const total = Math.round(sec);              // round once, so 59.6s reads 1:00 not 0:60
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

function botFail(msg) {
  console.error('BOT ERROR: ' + msg);
  process.exit(1);
}

// The table's per-gate, per-skill summary.
function summarize(rows) {
  const cleared = rows.filter(r => r.cleared).length;
  return {
    cleared,
    waves: median(rows.map(r => r.wave)),
    maxWaves: rows.length ? rows[0].maxWaves : null,
    time: median(rows.filter(r => r.cleared).map(r => r.time)),
    levelUp: median(rows.map(r => r.levelUp)),
    dmgPct: median(rows.map(r => r.dmgPct)),
    potions: median(rows.map(r => r.potions)),
    deaths: rows.filter(r => r.end === 'dead').length,
    stuck: rows.filter(r => r.end === 'stuck').length,
  };
}

function main() {
  const { api } = createGame();

  let gates = api.GATE_DEFS;
  if (GATE_PICK) {
    gates = gates.filter(g => g.id === GATE_PICK);
    if (!gates.length) { console.error(`unknown gate: ${GATE_PICK}`); process.exit(1); }
  }

  // Gates: every pick of gate x skill x seed, each on its own gate.
  const gateBlocks = [];
  for (const gate of gates) {
    for (const skill of SKILLS) {
      const rows = [];
      for (let i = 1; i <= RUNS; i++) {
        const r = sim(api, gate, skill, i, false, GATE_CAP);
        // Self-check: make a wrong-gate or impossible "cleared" claim impossible to miss.
        if (r.gateId !== gate.id) botFail(`asked for ${gate.id}, but the run started ${r.gateId}`);
        if (r.end === 'cleared' && (r.wave !== r.maxWaves || !r.bossKilled)) {
          botFail(`${gate.id} counted as cleared but wave ${r.wave}/${r.maxWaves}, bossKilled=${r.bossKilled}`);
        }
        rows.push(r);
      }
      gateBlocks.push({ gate: gate.id, level: gate.reqLevel, skill, rows, summary: summarize(rows) });
    }
  }

  // Endless: GATE_DEFS[0] with endless = true, one skill (0.5), 10 game minutes a run.
  const endlessRows = [];
  if (!GATE_PICK) {
    for (let i = 1; i <= RUNS; i++) endlessRows.push(sim(api, api.GATE_DEFS[0], ENDLESS_SKILL, i, true, ENDLESS_CAP));
  }

  // Totals from the game's own data: one point every 2 levels (js/04-player-fx.js:58).
  const treeTotal = api.TREE.reduce((a, b) => a + b.nodes.reduce((x, n) => x + n.max, 0), 0);
  const treeLevel = treeTotal * 2;

  if (JSON_OUT) {
    const endlessSummary = endlessRows.length ? {
      floor: median(endlessRows.map(r => r.wave)),
      level: median(endlessRows.map(r => r.level)),
      skillPoints: median(endlessRows.map(r => r.skillPointsEarned)),
      shadows: median(endlessRows.map(r => r.shadows)),
      diedBeforeCap: endlessRows.filter(r => r.end === 'dead').length,
      medianTimeOfDeath: median(endlessRows.filter(r => r.end === 'dead').map(r => r.time)),
    } : null;
    process.stdout.write(JSON.stringify({
      seeds: RUNS,
      skills: SKILLS,
      gateRuns: gateBlocks.map(b => ({ gate: b.gate, reqLevel: b.level, skill: b.skill, runs: b.rows, summary: b.summary })),
      endless: { skill: ENDLESS_SKILL, runs: endlessRows, summary: endlessSummary },
      totals: { skillPointsToFillTree: treeTotal, earnedByLevel: treeLevel },
    }, null, 2) + '\n');
    return;
  }

  const pad = (s, n) => String(s).padStart(n);
  console.log(`Arise balance bot — ${RUNS} seeded runs per gate per skill level`);
  console.log(`Gates at their required level, no gear, weapon 0; bot dodge skill ${SKILLS.join(', ')}`);
  console.log('');
  console.log(
    `${pad('gate', 9)}${pad('lvl', 5)}${pad('skill', 6)}${pad('cleared', 9)}${pad('waves', 7)}` +
    `${pad('time', 7)}${pad('lvl gain', 9)}${pad('dmg taken', 10)}${pad('potions', 9)}${pad('deaths', 8)}${pad('stuck', 6)}`
  );
  for (const b of gateBlocks) {
    const s = b.summary;
    console.log(
      `${pad(b.gate, 9)}${pad(b.level, 5)}${pad(b.skill.toFixed(1), 6)}${pad(s.cleared + '/' + b.rows.length, 9)}` +
      `${pad(s.waves + '/' + s.maxWaves, 7)}${pad(fmtTime(s.time), 7)}${pad(s.levelUp, 9)}` +
      `${pad(Math.round(s.dmgPct) + '%', 10)}${pad(s.potions, 9)}${pad(s.deaths, 8)}${pad(s.stuck, 6)}`
    );
  }

  if (endlessRows.length) {
    const ef = median(endlessRows.map(r => r.wave));
    const el = median(endlessRows.map(r => r.level));
    const es = median(endlessRows.map(r => r.skillPointsEarned));
    const eh = median(endlessRows.map(r => r.shadows));
    const died = endlessRows.filter(r => r.end === 'dead').length;
    const deadT = median(endlessRows.filter(r => r.end === 'dead').map(r => r.time));
    console.log('');
    console.log(`ENDLESS (Demon Castle, skill ${ENDLESS_SKILL}, ${endlessRows.length} x ${fmtTime(ENDLESS_CAP)}): ` +
      `floor ${ef} · level ${el} · skill points ${es} · shadows ${eh}  (medians)`);
    console.log(`  died before the ${fmtTime(ENDLESS_CAP)} cap: ${died}/${endlessRows.length}` +
      (died ? ` · median time of death ${fmtTime(deadT)}` : ''));
  }

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
