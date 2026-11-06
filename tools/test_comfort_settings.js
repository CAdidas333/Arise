'use strict';

// Checks the comfort settings: screen flashes (full, low, off) and damage numbers (on, off).
// Run: node tools/test_comfort_settings.js   (prints PASS <number of cases checked>)

const vm = require('vm');
const { createGame } = require('./lib/headless.js');

const fail = msg => { throw new Error(msg); };

try {
  const { ctx, api } = createGame();
  const at = expr => vm.runInContext(expr, ctx);
  let checked = 0;

  // 1. Defaults: full flashes, damage numbers on
  if (at('settings.flashes') !== 'full') fail(`expected default flashes 'full', got ${at('settings.flashes')}`);
  if (at('settings.numbers') !== 'on') fail(`expected default numbers 'on', got ${at('settings.numbers')}`);
  checked += 2;

  // 2. flash() scales by full (0.5), low (0.2), off (none)
  at('settings.flashes = "full"; screenFlash = { alpha:0, color:"#fff" }; flash("#fff", 0.5);');
  if (at('screenFlash.alpha') !== 0.5) fail(`expected flash alpha 0.5 under full, got ${at('screenFlash.alpha')}`);
  checked++;

  at('settings.flashes = "low"; screenFlash = { alpha:0, color:"#fff" }; flash("#fff", 0.5);');
  if (at('screenFlash.alpha') !== 0.2) fail(`expected flash alpha 0.2 under low, got ${at('screenFlash.alpha')}`);
  checked++;

  at('settings.flashes = "off"; screenFlash = { alpha:0, color:"#fff" }; flash("#fff", 0.5);');
  if (at('screenFlash.alpha') !== 0) fail(`expected flash alpha 0 under off, got ${at('screenFlash.alpha')}`);
  checked++;

  // 3. cycleFlashes() three times from full: low, off, full
  at('settings.flashes = "full";');
  at('cycleFlashes();');
  if (at('settings.flashes') !== 'low') fail(`expected flashes 'low' after 1st cycle, got ${at('settings.flashes')}`);
  checked++;

  at('cycleFlashes();');
  if (at('settings.flashes') !== 'off') fail(`expected flashes 'off' after 2nd cycle, got ${at('settings.flashes')}`);
  checked++;

  at('cycleFlashes();');
  if (at('settings.flashes') !== 'full') fail(`expected flashes 'full' after 3rd cycle, got ${at('settings.flashes')}`);
  checked++;

  // 4. toggleNumbers() twice from on: off, on
  at('settings.numbers = "on";');
  at('toggleNumbers();');
  if (at('settings.numbers') !== 'off') fail(`expected numbers 'off' after 1st toggle, got ${at('settings.numbers')}`);
  checked++;

  at('toggleNumbers();');
  if (at('settings.numbers') !== 'on') fail(`expected numbers 'on' after 2nd toggle, got ${at('settings.numbers')}`);
  checked++;

  // A new hunter standing in the E gate with one ready enemy
  const newHunter = () => { const p = api.createPlayer('ComfortBot'); api.player = p; api.resetWorld(); api.startDungeon(api.GATE_DEFS[0]); return p; };
  const oneEnemy = () => at('enemies = [makeEnemy(GATE_DEFS[0].enemies[0], 100, 0)]; enemies[0].spawnT = 0; texts = [];');

  // 5. Damage numbers from damageEnemy(): one under on, none under off, same damage
  newHunter(); oneEnemy(); at('settings.numbers = "on";'); api.reseed(1234);
  at('damageEnemy(enemies[0], 10, { crit:false });');
  if (at('texts.length') !== 1) fail(`expected 1 damage number under on, got ${at('texts.length')}`);
  const onHp = at('enemies[0].hp');
  checked++;

  newHunter(); oneEnemy(); at('settings.numbers = "off";'); api.reseed(1234);
  at('damageEnemy(enemies[0], 10, { crit:false });');
  if (at('texts.length') !== 0) fail(`expected no damage numbers under off, got ${at('texts.length')}`);
  if (at('enemies[0].hp') !== onHp) fail(`damage changed with numbers off: ${onHp} under on, ${at('enemies[0].hp')} under off`);
  checked += 2;

  // 6. Damage numbers from hurtPlayer(): one under on, none under off, hunter survives
  newHunter(); at('settings.numbers = "on"; texts = []; player.hp = player.maxHp; player.inv = 0;'); api.reseed(77);
  at('hurtPlayer(5);');
  if (at('texts.length') !== 1) fail(`expected 1 hunter damage number under on, got ${at('texts.length')}`);
  if (at('player.hp') <= 0) fail('the hunter died from the test hit');
  checked += 2;

  newHunter(); at('settings.numbers = "off"; texts = []; player.hp = player.maxHp; player.inv = 0;'); api.reseed(77);
  at('hurtPlayer(5);');
  if (at('texts.length') !== 0) fail(`expected no hunter damage number under off, got ${at('texts.length')}`);
  if (at('player.hp') <= 0) fail('the hunter died from the test hit');
  checked++;

  // 7. Other messages still show under off (PERFECT DODGE)
  newHunter(); at('settings.numbers = "off"; texts = [];');
  at('perfectDodge();');
  if (!at('texts.some(t => t.text.includes("PERFECT DODGE"))')) fail('PERFECT DODGE text disappeared with damage numbers off');
  checked++;

  // 8. Save round trip keeps low flashes and off damage numbers
  newHunter();
  at('settings.flashes = "low"; settings.numbers = "off"; saveGame();');
  at('settings.flashes = "full"; settings.numbers = "on"; loadGame();');
  if (at('settings.flashes') !== 'low') fail(`save round trip did not keep 'low', got ${at('settings.flashes')}`);
  if (at('settings.numbers') !== 'off') fail(`save round trip did not keep 'off', got ${at('settings.numbers')}`);
  checked += 2;

  // 9. Invalid saved flashes ('toString', 5) load as 'full' and stay finite
  at(`(() => {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    d.settings.flashes = 'toString';
    localStorage.setItem(SAVE_KEY, JSON.stringify(d));
    loadGame();
  })()`);
  if (at('settings.flashes') !== 'full') fail(`save with 'toString' flashes did not load as 'full', got ${at('settings.flashes')}`);
  at('screenFlash = { alpha:0, color:"#fff" }; flash("#fff", 0.5);');
  if (at('screenFlash.alpha') !== 0.5) fail(`expected finite flash 0.5 after 'toString' save, got ${at('screenFlash.alpha')}`);
  checked++;

  at(`(() => {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    d.settings.flashes = 5;
    localStorage.setItem(SAVE_KEY, JSON.stringify(d));
    loadGame();
  })()`);
  if (at('settings.flashes') !== 'full') fail(`save with number 5 flashes did not load as 'full', got ${at('settings.flashes')}`);
  at('screenFlash = { alpha:0, color:"#fff" }; flash("#fff", 0.5);');
  if (at('screenFlash.alpha') !== 0.5) fail(`expected finite flash 0.5 after number 5 save, got ${at('screenFlash.alpha')}`);
  checked++;

  // 10. Invalid saved numbers ('maybe') loads as 'on'
  at(`(() => {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    d.settings.numbers = 'maybe';
    localStorage.setItem(SAVE_KEY, JSON.stringify(d));
    loadGame();
  })()`);
  if (at('settings.numbers') !== 'on') fail(`save with 'maybe' numbers did not load as 'on', got ${at('settings.numbers')}`);
  checked++;

  // 11. A save with no flash or number keys loads as 'full' and 'on'
  at(`(() => {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    delete d.settings.flashes; delete d.settings.numbers;
    localStorage.setItem(SAVE_KEY, JSON.stringify(d));
    delete settings.flashes; delete settings.numbers;
    loadGame();
  })()`);
  if (at('settings.flashes') !== 'full') fail(`save with no flashes key did not load as 'full', got ${at('settings.flashes')}`);
  if (at('settings.numbers') !== 'on') fail(`save with no numbers key did not load as 'on', got ${at('settings.numbers')}`);
  checked += 2;

  // 12. tabControls markup contains both new controls and their descriptions
  at('settings.flashes = "full"; settings.numbers = "on";');
  const html = at('tabControls()');
  if (!html.includes('data-act="flashes"')) fail('tabControls markup does not contain data-act="flashes"');
  if (!html.includes('data-act="numbers"')) fail('tabControls markup does not contain data-act="numbers"');
  if (!html.includes('Big hits and skills flash the screen.')) fail('tabControls markup missing description for full flashes');
  if (!html.includes('Numbers rise from every hit.')) fail('tabControls markup missing description for numbers on');
  checked += 4;

  at('settings.flashes = "low"; settings.numbers = "off";');
  const htmlLow = at('tabControls()');
  if (!htmlLow.includes('Softer flashes.')) fail('tabControls markup missing description for low flashes');
  if (!htmlLow.includes('No damage numbers; messages such as PERFECT DODGE still show.')) fail('tabControls markup missing description for numbers off');
  checked += 2;

  at('settings.flashes = "off";');
  if (!at('tabControls()').includes('The screen never flashes.')) fail('tabControls markup missing description for off flashes');
  checked++;

  console.log('PASS ' + checked);
} catch (err) {
  console.error('FAIL');
  console.error(err.stack);
  process.exit(1);
}
