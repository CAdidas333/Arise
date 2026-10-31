'use strict';

// Checks shadow names: cleaning, the save round trip and old saves without a nick.
// Run: node tools/test_shadow_names.js   (prints PASS <number of cases checked>)

const vm = require('vm');
const { createGame } = require('./lib/headless.js');

const fail = msg => { throw new Error(msg); };

try {
  const { ctx, api } = createGame();
  const at = expr => vm.runInContext(expr, ctx);
  let checked = 0;

  // 1. cleanNick strips markup characters and controls, trims, caps at 16, and an absent name is empty
  const nickCases = [
    ['<b>x</b>', 'bx/b'],
    ['A&B"C\'D`E', 'ABCDE'],
    ['  Igris  ', 'Igris'],
    ['\u0000\u001fIgris\t', 'Igris'],
    ['abcdefghijklmnopqrstuvwxyz', 'abcdefghijklmnop'],
    ['', ''],
  ];
  for (const [input, want] of nickCases) {
    const got = at(`cleanNick(${JSON.stringify(input)})`);
    if (got !== want) fail(`cleanNick(${JSON.stringify(input)}) gave ${JSON.stringify(got)}, not ${JSON.stringify(want)}`);
    checked++;
  }
  if (at('cleanNick(undefined)') !== '') fail('cleanNick(undefined) is not empty');
  checked++;

  // 2. save round trip: names come back cleaned, while enemy name, kind and grade stay as they were
  const p = api.createPlayer('NickBot');
  p.shadows = [
    { name:'Ogre', nick:'Igris', kind:'brute', damage:9, level:3, color:'#9988bb', size:16, grade:'Soldier' },
    { name:'Iron Golem', nick:'<b>x</b>', kind:'brute', damage:7, level:2, color:'#9988bb', size:16, grade:'Elite' },
    { name:'Shadow Mage', kind:'caster', damage:5, level:1, color:'#9988bb', size:14, grade:'Marshal' },
  ];
  api.player = p;
  at('saveGame(); loadGame()');
  const loaded = api.player.shadows;
  if (loaded.length !== 3) fail(`the save brought back ${loaded.length} shadows, not 3`);
  if (loaded[0].nick !== 'Igris') fail(`the first name came back as ${JSON.stringify(loaded[0].nick)}`);
  if (loaded[1].nick !== 'bx/b') fail(`the second name came back as ${JSON.stringify(loaded[1].nick)}`);
  if (loaded[2].nick !== '') fail(`an unnamed shadow came back with ${JSON.stringify(loaded[2].nick)}`);
  if (loaded.map(s => s.name).join(',') !== 'Ogre,Iron Golem,Shadow Mage') fail(`the enemy names changed: ${loaded.map(s => s.name).join(',')}`);
  if (loaded.map(s => s.kind).join(',') !== 'brute,brute,caster') fail(`the kinds changed: ${loaded.map(s => s.kind).join(',')}`);
  if (loaded.map(s => s.grade).join(',') !== 'Soldier,Elite,Marshal') fail(`the grades changed: ${loaded.map(s => s.grade).join(',')}`);
  checked += 6;

  // 3. a save from before nicknames loads every shadow with an empty name
  at(`(() => {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    d.shadows.forEach(s => { delete s.nick; });
    localStorage.setItem(SAVE_KEY, JSON.stringify(d));
    loadGame();
  })()`);
  const old = api.player.shadows;
  if (old.length !== 3) fail(`the old save brought back ${old.length} shadows, not 3`);
  old.forEach((s, i) => { if (s.nick !== '') fail(`old shadow ${i} came back with ${JSON.stringify(s.nick)}`); checked++; });

  console.log('PASS ' + checked);
} catch (err) {
  console.error('FAIL');
  console.error(err.stack);
  process.exit(1);
}
