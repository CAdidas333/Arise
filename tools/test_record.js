'use strict';

// Checks the Hunter's Record: kills counted by name, save/load, the name list and the RECORD tab.
// Run: node tools/test_record.js   (prints PASS <number of cases checked>)

const vm = require('vm');
const { createGame } = require('./lib/headless.js');

const fail = msg => { throw new Error(msg); };

try {
  const { ctx, api } = createGame();
  api.reseed(20261031); // the game's own seeded RNG, so every run checks the same kills
  const at = expr => vm.runInContext(expr, ctx);
  let checked = 0;

  // A new hunter standing in the E gate, ready to kill things
  const newPlayer = () => { const p = api.createPlayer('RecBot'); api.player = p; api.resetWorld(); api.startDungeon(api.GATE_DEFS[0]); return p; };
  const kill = (def, o = '{}') => at(`(() => { const e = makeEnemy(${def}, 0, 0, ${o}); enemies.push(e); killEnemy(e); return e; })()`);
  const GOBLIN = 'GATE_DEFS[0].enemies[0]', QUEEN = 'GATE_DEFS[0].boss';

  // 1. a new hunter has slain nothing
  let p = newPlayer();
  if (Object.keys(p.slain).length !== 0) fail('a new hunter starts with kills in the Record');
  checked++;

  // 2. an ordinary kill and an elite of the same kind both count under the base name; a boss under its own
  const plain = kill(GOBLIN), elite = kill(GOBLIN, '{ elite:true }'), boss = kill(QUEEN, '{ boss:true }');
  if (elite.name !== 'Elite Goblin' || elite.baseName !== 'Goblin') fail(`an elite is named ${elite.name} / ${elite.baseName}, not Elite Goblin / Goblin`);
  if (plain.alive || elite.alive || boss.alive) fail('a killed enemy is still alive');
  if (p.slain['Goblin'] !== 2) fail(`Goblin counts ${p.slain['Goblin']}, not 2`);
  if (p.slain['Spider Queen'] !== 1) fail(`Spider Queen counts ${p.slain['Spider Queen']}, not 1`);
  if (p.slain['Elite Goblin'] !== undefined) fail('an elite was counted under its Elite name');
  if (Object.keys(p.slain).length !== 2) fail(`the Record holds ${Object.keys(p.slain).join(', ')}, not just Goblin and Spider Queen`);
  checked += 5;

  // 3. an enemy that is already dead is not counted again
  at('killEnemy(enemies[0])');
  if (p.slain['Goblin'] !== 2) fail('a second killEnemy on a dead enemy counted again');
  checked++;

  // 4. save round trip: the counts come back, and are in the saved data
  at('saveGame()');
  const saved = JSON.parse(at('localStorage.getItem(SAVE_KEY)'));
  if (!saved.slain || saved.slain['Goblin'] !== 2 || saved.slain['Spider Queen'] !== 1) fail('the save does not hold the counts');
  at('loadGame()');
  const loaded = api.player;
  if (loaded.slain['Goblin'] !== 2 || loaded.slain['Spider Queen'] !== 1 || Object.keys(loaded.slain).length !== 2) fail(`the counts did not round trip: ${JSON.stringify(loaded.slain)}`);
  if (loaded === p || loaded.slain === p.slain) fail('the loaded hunter shares the old Record object');
  checked += 4;

  // 5. an edited save: an unknown name is dropped, a negative count loads as 0, a fraction is cut, a word is 0
  const loadWith = slain => {
    at(`(() => { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); ${slain === undefined ? 'delete d.slain' : `d.slain = ${JSON.stringify(slain)}`}; localStorage.setItem(SAVE_KEY, JSON.stringify(d)); loadGame(); })()`);
    return api.player.slain;
  };
  let s = loadWith({ 'Goblin': -4, 'Not An Enemy': 9, 'Spider Queen': 3.9, 'Orc Shaman': 'many', 'Lich': 7 });
  if ('Not An Enemy' in s) fail('an unknown name survived the load');
  if (s['Goblin'] !== 0) fail(`a negative count loaded as ${s['Goblin']}, not 0`);
  if (s['Spider Queen'] !== 3) fail(`3.9 loaded as ${s['Spider Queen']}, not 3`);
  if (s['Orc Shaman'] !== 0) fail(`a word loaded as ${s['Orc Shaman']}, not 0`);
  if (s['Lich'] !== 7) fail(`a good count loaded as ${s['Lich']}, not 7`);
  if (Object.keys(s).sort().join(',') !== 'Goblin,Lich,Orc Shaman,Spider Queen') fail(`the loaded Record holds ${Object.keys(s).join(', ')}`);
  checked += 6;

  // 6. an old save with no Record, or a Record that is not an object, loads as empty
  for (const bad of [undefined, null, 'x', 5, [3, 4]]) {
    s = loadWith(bad);
    if (Object.keys(s).length !== 0) fail(`a save with slain ${JSON.stringify(bad)} loaded ${JSON.stringify(s)}`);
    checked++;
  }

  // 7. recordNames(): every enemy and every boss, each once, no name shared between gates
  const defs = at('GATE_DEFS');
  const all = defs.flatMap(g => [...g.enemies.map(e => e.name), g.boss.name]);
  const names = at('[...recordNames()]');
  if (new Set(all).size !== all.length) fail('two gates share an enemy name, so their kills would be counted together');
  if (names.length !== new Set(names).size) fail('recordNames() has duplicates');
  if (names.length !== all.length) fail(`recordNames() has ${names.length} names, the gates hold ${all.length}`);
  for (const g of defs) {
    if (!names.includes(g.boss.name)) fail(`recordNames() is missing the boss ${g.boss.name}`);
    for (const e of g.enemies) if (!names.includes(e.name)) fail(`recordNames() is missing ${e.name}`);
    checked += 1 + g.enemies.length;
  }
  checked += 3;

  // 8. every kind of enemy in the game can be killed and counted: one of each, ordinary and elite
  p = newPlayer();
  for (let i = 0; i < defs.length; i++) {
    for (let j = 0; j < defs[i].enemies.length; j++) { kill(`GATE_DEFS[${i}].enemies[${j}]`); kill(`GATE_DEFS[${i}].enemies[${j}]`, '{ elite:true }'); }
    kill(`GATE_DEFS[${i}].boss`, '{ boss:true }');
  }
  for (const n of names) {
    const want = defs.some(g => g.boss.name === n) ? 1 : 2;
    if (p.slain[n] !== want) fail(`${n} counts ${p.slain[n]}, not ${want}`);
    checked++;
  }

  // 9. the RECORD tab: seventh slot after SHADOWS in the list, drawn by tabRecord
  const tabs = at('TABS.map(t => t[0])');
  if (tabs.indexOf('record') !== tabs.indexOf('shadows') + 1) fail(`the RECORD tab is at ${tabs.indexOf('record')}, not right after SHADOWS: ${tabs.join(',')}`);
  if (at('TABS.find(t => t[0] === "record")[1]') !== 'RECORD') fail('the tab label is not RECORD');
  at('tabRecord = (orig => function () { __recordDrawn = true; return orig(); })(tabRecord); menuTab = "record"; renderSystemMenu();');
  if (at('__recordDrawn') !== true) fail('renderSystemMenu did not draw the RECORD tab');
  at('menuTab = "status"');
  checked += 3;

  // 10. what the tab says: a fresh hunter sees all ???, a count on every slain line, SHADOW RAISED only on a boss with a shadow
  p = newPlayer();
  const html0 = at('tabRecord()');
  if (!html0.includes(`Discovered 0 / ${names.length}`)) fail('a fresh hunter does not see Discovered 0 / total');
  if ((html0.match(/\?\?\?/g) || []).length !== names.length) fail(`a fresh hunter sees ${(html0.match(/\?\?\?/g) || []).length} ???, not ${names.length}`);
  if (html0.includes('SHADOW RAISED')) fail('SHADOW RAISED shows with no shadow owned');
  if (!html0.includes('BOSS') || !html0.includes('MELEE')) fail('the kind labels are missing');
  const shown = (html, n) => html.includes(`<span class="stat-name">${n}<`); // the name as a row shows it, not inside a gate heading
  for (const n of names) if (shown(html0, n)) fail(`${n} is shown though it was never slain`);
  checked += 4 + names.length;
  kill(GOBLIN); kill(GOBLIN); kill(QUEEN, '{ boss:true }');
  at(`player.shadows.push({ name:'Spider Queen', kind:'boss' })`);
  const html1 = at('tabRecord()');
  if (!html1.includes(`Discovered 2 / ${names.length}`)) fail('Discovered does not count the two names slain');
  if (!shown(html1, 'Goblin') || !shown(html1, 'Spider Queen')) fail('a slain name is not shown');
  if ((html1.match(/\?\?\?/g) || []).length !== names.length - 2) fail('the unslain names are not all ???');
  if ((html1.match(/SHADOW RAISED/g) || []).length !== 1) fail('SHADOW RAISED should show once, on the Spider Queen');
  checked += 4;

  console.log('PASS ' + checked);
} catch (err) {
  console.error('FAIL');
  console.error(err.stack);
  process.exit(1);
}
