'use strict';

// Checks the Recent runs list: a row per gate clear, rift end and fall, once per run, the newest 10, save/load cleaning, and the STATUS block.
// Run: node tools/test_recent_runs.js   (prints PASS <number of cases checked>)

const vm = require('vm');
const { createGame } = require('./lib/headless.js');

const fail = msg => { throw new Error(msg); };

try {
  const { ctx, api, soak } = createGame();
  api.reseed(20261113);
  const at = expr => vm.runInContext(expr, ctx);
  let checked = 0;
  const ok = (cond, msg) => { if (!cond) fail(msg); checked++; };

  // A page that keeps the text written to its elements; anything else done to an element is swallowed
  const els = {};
  const el = id => els[id] || (els[id] = new Proxy({ textContent:'', innerHTML:'', style:{}, value:'' }, { get: (t, k) => k in t ? t[k] : soak }));
  ctx.document = new Proxy({ getElementById: el }, { get: (t, k) => k in t ? t[k] : soak });

  const hunter = () => { const p = api.createPlayer('RunBot'); api.player = p; api.resetWorld(); return p; };
  const gate = (i = 0, endless = false) => { api.startDungeon(api.GATE_DEFS[i], endless); at('run.kills = 38; run.time = 64.4'); };

  // 1. a new hunter has no runs and the tab says so
  let p = hunter();
  ok(Array.isArray(p.runs) && p.runs.length === 0, 'a new hunter has runs');
  ok(at('tabStatus()').includes('No runs yet'), 'the empty STATUS tab does not say No runs yet');

  // 2. a gate clear logs one gate row, and a second showVictory for the same run adds nothing
  gate(0); at('showVictory()');
  let r = p.runs[0];
  ok(p.runs.length === 1 && r.t === 'gate' && r.id === 'e_gate' && 'SABC'.includes(r.grade) && r.kills === 38 && r.time === 64, `gate row wrong: ${JSON.stringify(p.runs)}`);
  at('showVictory()');
  ok(p.runs.length === 1, 'a second showVictory added a row');

  // 3. a rift end logs a rift row (once); a death logs a fell row (once); endless is marked
  api.startDungeon(api.GATE_DEFS[0]); p.rift = true; at('enterRift()'); at('dungeon.rift.caught = 5'); at('showRiftEnd()'); at('showRiftEnd()');
  r = p.runs[0];
  ok(p.runs.length === 2 && r.t === 'rift' && r.grade === 'B' && r.caught === 5 && r.total === 8, `rift row wrong: ${JSON.stringify(r)}`);
  gate(1); at('dungeon.wave = 3; run.kills = 12; showDeath(); showDeath()');
  r = p.runs[0];
  ok(p.runs.length === 3 && r.t === 'fell' && r.id === 'd_gate' && r.endless === false && r.wave === 3 && r.max === 6 && r.kills === 12, `fell row wrong: ${JSON.stringify(r)}`);
  gate(0, true); at('dungeon.wave = 7; run.kills = 40; showDeath()');
  r = p.runs[0];
  ok(p.runs.length === 4 && r.t === 'fell' && r.endless === true && r.wave === 7 && r.max === 0 && r.kills === 40, `endless fell row wrong: ${JSON.stringify(r)}`);

  // 4. twelve runs keep the newest ten
  p = hunter();
  for (let i = 1; i <= 12; i++) { gate(0); at(`run.kills = ${i}; showVictory()`); }
  ok(p.runs.length === 10 && p.runs[0].kills === 12 && p.runs[9].kills === 3, 'twelve runs do not keep the newest ten');

  // 5. save round trip keeps the rows
  at('saveGame()');
  ok(JSON.parse(at('localStorage.getItem(SAVE_KEY)')).runs.length === 10, 'the save does not hold the runs');
  at('loadGame()');
  ok(api.player.runs.length === 10 && api.player.runs[0].kills === 12 && api.player !== p, 'runs did not round trip');

  // 6. an edited save: bad rows dropped or cleaned; no runs loads []
  const loadRuns = runs => {
    at(`(() => { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); ${runs === undefined ? 'delete d.runs' : `d.runs = ${JSON.stringify(runs)}`}; localStorage.setItem(SAVE_KEY, JSON.stringify(d)); loadGame(); })()`);
    return api.player.runs;
  };
  let s = loadRuns([
    { t:'gate', id:'nope', grade:'A', time:1, kills:1 }, { t:'boss', id:'e_gate', grade:'A' }, { t:'gate', id:'e_gate', grade:'X', time:1, kills:1 },
    { t:'gate', id:'d_gate', grade:'S', time:-5, kills:'12' }, { t:'fell', id:'e_gate', endless:false, wave:2.9, max:5, kills:-3 }, { t:'rift', grade:'C', caught:2, total:8 }, null, 7,
  ]);
  ok(s.length === 3, `bad rows survived: ${JSON.stringify(s)}`);
  ok(s[0].id === 'd_gate' && s[0].time === 0 && s[0].kills === 12, 'a negative or string number was not cleaned');
  ok(s[1].wave === 2 && s[1].kills === 0, 'a fraction or negative in a fell row was not cleaned');
  ok(s[2].t === 'rift' && s[2].caught === 2, 'the rift row was lost');
  ok(loadRuns(Array.from({ length: 15 }, () => ({ t:'rift', grade:'A', caught:6, total:8 }))).length === 10, 'more than 10 rows loaded');
  ok(loadRuns(undefined).length === 0, 'a save with no runs did not load []');

  // 7. the tab lists newest first, with names and colours
  p = hunter(); p.runs = [{ t:'gate', id:'e_gate', grade:'S', time:64, kills:38 }, { t:'rift', grade:'B', caught:6, total:8 }, { t:'fell', id:'d_gate', endless:false, wave:3, max:6, kills:12 }, { t:'fell', id:'e_gate', endless:true, wave:7, max:0, kills:40 }];
  const h = at('tabStatus()');
  const pos = ['Recent runs', 'E-RANK · Goblin Cavern', '1:04 · 38 kills', 'GILDED RIFT', '6/8 caught', 'D-RANK · Orc Fortress', 'wave 3/6 · 12 kills', 'DEMON CASTLE', 'floor 7 · 40 kills'].map(x => h.indexOf(x));
  ok(pos.every((x, i) => x >= 0 && (i === 0 || x > pos[i - 1])), `the tab rows are missing or out of order: ${pos}`);
  ok(h.includes('#bb66ff') && h.includes('FELL') && !h.includes('No runs yet'), 'grade colour or FELL missing');
  ok(h.indexOf('Recent runs') > h.indexOf('Records') && h.indexOf('Recent runs') < h.indexOf('Titles'), 'the block is not between Records and Titles');

  console.log(`PASS ${checked}`);
} catch (e) { console.error('FAIL', e.message); process.exit(1); }
