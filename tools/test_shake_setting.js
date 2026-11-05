'use strict';

// Checks the Screen shake setting: default, scaling, cap, cycling, save/load, and Controls tab markup.
// Run: node tools/test_shake_setting.js   (prints PASS <number of cases checked>)

const vm = require('vm');
const { createGame } = require('./lib/headless.js');

const fail = msg => { throw new Error(msg); };

try {
  const { ctx, api } = createGame();
  const at = expr => vm.runInContext(expr, ctx);
  let checked = 0;

  // 1. Default settings.shake === 'full'
  if (at('settings.shake') !== 'full') fail(`expected default shake 'full', got ${at('settings.shake')}`);
  checked++;

  // 2. With camera.shake = 0: shake(10) gives 10 under full, 4 under low, 0 under off
  at('settings.shake = "full"; camera.shake = 0; shake(10);');
  if (at('camera.shake') !== 10) fail(`expected shake 10 under full, got ${at('camera.shake')}`);
  checked++;

  at('settings.shake = "low"; camera.shake = 0; shake(10);');
  if (at('camera.shake') !== 4) fail(`expected shake 4 under low, got ${at('camera.shake')}`);
  checked++;

  at('settings.shake = "off"; camera.shake = 0; shake(10);');
  if (at('camera.shake') !== 0) fail(`expected shake 0 under off, got ${at('camera.shake')}`);
  checked++;

  // 3. shake(100) under full is capped at 28 (unchanged behaviour)
  at('settings.shake = "full"; camera.shake = 0; shake(100);');
  if (at('camera.shake') !== 28) fail(`expected shake capped at 28, got ${at('camera.shake')}`);
  checked++;

  // 4. Cycling calls cycleShake() three times from full: low, off, full
  at('settings.shake = "full";');
  at('cycleShake();');
  if (at('settings.shake') !== 'low') fail(`expected shake 'low' after 1st cycle, got ${at('settings.shake')}`);
  checked++;

  at('cycleShake();');
  if (at('settings.shake') !== 'off') fail(`expected shake 'off' after 2nd cycle, got ${at('settings.shake')}`);
  checked++;

  at('cycleShake();');
  if (at('settings.shake') !== 'full') fail(`expected shake 'full' after 3rd cycle, got ${at('settings.shake')}`);
  checked++;

  // 5. Save round trip keeps low; a save whose settings.shake is 'wild' loads as 'full'; a save with no shake key loads as 'full'
  const newPlayer = () => { const p = api.createPlayer('ShakeBot'); api.player = p; api.resetWorld(); return p; };
  newPlayer();

  at('settings.shake = "low"; saveGame();');
  at('settings.shake = "full"; loadGame();');
  if (at('settings.shake') !== 'low') fail(`save round trip did not keep 'low', got ${at('settings.shake')}`);
  checked++;

  at(`(() => {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    d.settings.shake = 'wild';
    localStorage.setItem(SAVE_KEY, JSON.stringify(d));
    loadGame();
  })()`);
  if (at('settings.shake') !== 'full') fail(`save with 'wild' shake did not load as 'full', got ${at('settings.shake')}`);
  checked++;

  at(`(() => {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY));
    delete d.settings.shake;
    localStorage.setItem(SAVE_KEY, JSON.stringify(d));
    loadGame();
  })()`);
  if (at('settings.shake') !== 'full') fail(`save with no shake key did not load as 'full', got ${at('settings.shake')}`);
  checked++;

  // 6. tabControls returns markup containing data-act="shake" and descriptions
  at('settings.shake = "full";');
  let html = at('tabControls()');
  if (!html.includes('data-act="shake"')) fail('tabControls markup does not contain data-act="shake"');
  if (!html.includes('Screen shake')) fail('tabControls markup does not contain label "Screen shake"');
  if (!html.includes('The screen shakes on big hits.')) fail('tabControls markup missing description for full');
  checked += 3;

  at('settings.shake = "low";');
  html = at('tabControls()');
  if (!html.includes('A gentle shake on big hits.')) fail('tabControls markup missing description for low');
  checked++;

  at('settings.shake = "off";');
  html = at('tabControls()');
  if (!html.includes('The screen never shakes.')) fail('tabControls markup missing description for off');
  checked++;

  console.log('PASS ' + checked);
} catch (err) {
  console.error('FAIL');
  console.error(err.stack);
  process.exit(1);
}
