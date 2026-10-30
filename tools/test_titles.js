'use strict';

// Checks the System titles: the table, the feat gates, save/load and the one-at-a-time queue.
// Run: node tools/test_titles.js   (prints PASS <number of cases checked>)

const vm = require('vm');
const { createGame } = require('./lib/headless.js');

const fail = msg => { throw new Error(msg); };

try {
  const { ctx, api } = createGame();
  const at = expr => vm.runInContext(expr, ctx);
  let checked = 0;

  // 1. the table: twelve entries, unique ids, capitals, and none of the banned words
  const titles = at('TITLES');
  if (titles.length !== 12) fail(`TITLES has ${titles.length} entries, not 12`);
  const ids = new Set(titles.map(t => t.id));
  if (ids.size !== titles.length) fail('TITLES has duplicate ids');
  const banned = /STAR|RUNE|GOD|HOLY|SAINT|ANGEL|CROSS|PRAY|CHURCH|TEMPLE|DIVINE|SACRED|CURSE|OCCULT|SPELL|DEVIL/i;
  for (const t of titles) {
    if (t.name !== t.name.toUpperCase()) fail(`${t.id} name is not capitals: ${t.name}`);
    if (banned.test(t.name) || banned.test(t.how)) fail(`${t.id} uses a banned word`);
    checked += 3;
  }

  // 2. a new hunter has nothing yet
  const newPlayer = () => { const p = api.createPlayer('TitleBot'); api.player = p; api.resetWorld(); return p; };
  let p = newPlayer();
  if (p.titles.length !== 0 || p.title !== '') fail('a new player starts with a title');
  if (p.feats.perfects !== 0 || p.feats.boxes !== 0 || p.feats.flawless !== 0) fail('a new player starts with a feat');
  if (at('titleName(player)') !== 'HUNTER') fail('titleName did not fall back to HUNTER');
  checked += 2;

  // 3. 150 kills grants HUNDRED CUTS only, once
  p = newPlayer();
  at('highScores.totalKills = 150');
  if (at('checkTitles(true)') !== 1) fail('150 kills did not grant exactly one title');
  if (!p.titles.includes('cuts_100') || p.titles.includes('cuts_1000') || p.titles.length !== 1) fail(`150 kills granted ${p.titles.join(',')}`);
  if (at('checkTitles(true)') !== 0) fail('a second check granted a title again');
  if (p.titles.length !== 1) fail('a second check duplicated a title');
  checked += 2;

  // 4. each feat is true at its threshold and false just below it
  const cases = [
    ['gate_walker', (q, v) => at(`highScores.gatesCleared = ${v}`), 1, 0],
    ['cuts_100', (q, v) => at(`highScores.totalKills = ${v}`), 100, 99],
    ['cuts_1000', (q, v) => at(`highScores.totalKills = ${v}`), 1000, 999],
    ['chain_50', (q, v) => at(`highScores.bestCombo = ${v}`), 50, 49],
    ['ghost_step', (q, v) => { q.feats.perfects = v; }, 25, 24],
    ['captain', (q, v) => { q.shadows = Array.from({ length:v }, (_, i) => ({ name:'S'+i })); }, 10, 9],
    ['commander', (q, v) => { q.shadows = Array.from({ length:v }, (_, i) => ({ name:'S'+i })); }, 40, 39],
    ['seeker', (q, v) => { q.feats.boxes = v; }, 10, 9],
    ['breaker', (q, v) => at(`highScores.gatesCleared = ${v}`), 25, 24],
    ['untouchable', (q, v) => { q.feats.flawless = v; }, 1, 0],
    ['climber', (q, v) => at(`highScores.bestFloor = ${v}`), 20, 19],
    ['heir', (q, v) => { q.cleared.s_gate = v; }, 1, 0],
  ];
  for (const [id, setup, hi, lo] of cases) {
    let q = newPlayer(); setup(q, hi);
    if (!at(`TITLES.find(t => t.id === '${id}').has(player, highScores)`)) fail(`${id} is not true at its threshold`);
    q = newPlayer(); setup(q, lo);
    if (at(`TITLES.find(t => t.id === '${id}').has(player, highScores)`)) fail(`${id} is true below its threshold`);
    checked += 2;
  }

  // 5. save round trip: earned ids, the shown title and the feats all come back
  p = newPlayer();
  at('highScores.totalKills = 150; highScores.gatesCleared = 1');
  at('checkTitles(true)');
  p.title = 'cuts_100'; p.feats.perfects = 3; p.feats.boxes = 2; p.feats.flawless = 0;
  at('saveGame(); loadGame()');
  const loaded = api.player;
  if (loaded.titles.slice().sort().join(',') !== 'cuts_100,gate_walker') fail(`titles did not round trip: ${loaded.titles.join(',')}`);
  if (loaded.title !== 'cuts_100') fail(`the shown title did not round trip: ${loaded.title}`);
  if (loaded.feats.perfects !== 3 || loaded.feats.boxes !== 2 || loaded.feats.flawless !== 0) fail('the feats did not round trip');
  checked += 3;

  // 6. an edited save drops unknown ids and a title that was never earned
  at(`(() => {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    d.titles = ['cuts_100', 'not_a_title']; d.title = 'ghost_step';
    d.feats = { perfects:0, boxes:0, flawless:0 };
    d.highScores = { bestLevel:0, bestCombo:0, totalKills:0, gatesCleared:0, bestGate:'-', bestFloor:0, damageTaken:0 };
    localStorage.setItem(SAVE_KEY, JSON.stringify(d));
    loadGame();
  })()`);
  if (api.player.titles.join(',') !== 'cuts_100') fail(`an unknown id survived: ${api.player.titles.join(',')}`);
  if (api.player.title !== '') fail(`an unearned title survived: ${api.player.title}`);
  checked += 2;

  // 7. the queue shows two grants one at a time, 2.4 s apart
  p = newPlayer();
  at('highScores.totalKills = 150; highScores.gatesCleared = 1');
  at(`titleQueue.length = 0; titleGap = 0; titleCheckT = 0.5; __pops = 0; __popTimes = []; __clock = 0;
    systemPop = function () { __pops++; __popTimes.push(__clock); };`);
  if (at('checkTitles(false)') !== 2) fail('the queue setup did not grant two titles');
  const dt = 1/60;
  for (let t = 0; t < 3; t += dt) at(`__clock = ${t}; titleTick(${dt});`);
  const pops = at('__pops'), times = at('__popTimes');
  if (pops !== 2) fail(`the queue showed ${pops} titles, not 2`);
  if (times[1] - times[0] < 2.4) fail(`the two titles were ${times[1] - times[0]} s apart, under 2.4`);
  checked += 2;

  console.log('PASS ' + checked);
} catch (err) {
  console.error('FAIL');
  console.error(err.stack);
  process.exit(1);
}
