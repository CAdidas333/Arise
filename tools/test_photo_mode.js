'use strict';

// Checks photo mode: a clean frozen frame from the pause menu (enter, leave, no attack, no minimap).
// Run: node tools/test_photo_mode.js   (prints PASS <number of cases checked>)

const vm = require('vm');
const fs = require('fs');
const path = require('path');
const { createGame, ROOT } = require('./lib/headless.js');

const fail = msg => { throw new Error(msg); };

try {
  const { ctx, api } = createGame();
  const at = expr => vm.runInContext(expr, ctx);
  let checked = 0;
  const is = (expr, want, what) => { const got = at(expr); if (got !== want) fail(`${what}: expected ${want}, got ${got}`); checked++; };

  const p = api.createPlayer('PhotoBot'); api.player = p; api.resetWorld(); api.startDungeon(api.GATE_DEFS[0]);
  const fakeEvent = { target: {}, preventDefault() {}, stopPropagation() {} };

  // 1. Not paused: enterPhoto does nothing
  at('paused = false; photoMode = false; enterPhoto();');
  is('photoMode', false, 'enterPhoto while not paused');

  // 2. Paused: enter sets photoMode, exit clears it, paused stays true
  at('paused = true; enterPhoto();');
  is('photoMode', true, 'photoMode after enterPhoto'); is('paused', true, 'paused after enterPhoto');
  at('exitPhoto();');
  is('photoMode', false, 'photoMode after exitPhoto'); is('paused', true, 'paused after exitPhoto');

  // 3. Any key leaves photo mode without attacking or unpausing
  at('globalThis.__atk = 0; const __u = useSkill; useSkill = function () { globalThis.__atk++; return __u.apply(this, arguments); };');
  ctx.__e = fakeEvent;
  for (const k of ['x', 'escape']) {
    at('enterPhoto();');
    at(`onKey(${JSON.stringify(k)}, __e);`);
    is('photoMode', false, `photoMode after key ${k}`); is('paused', true, `paused after key ${k}`); is('__atk', 0, `attacks after key ${k}`);
  }

  // 4. draw() runs in photo mode and skips the minimap
  at('globalThis.__mm = 0; const __d = drawMinimap; drawMinimap = function () { globalThis.__mm++; return __d.apply(this, arguments); };');
  at('enterPhoto(); draw();');
  is('__mm', 0, 'drawMinimap calls in photo mode');
  at('exitPhoto(); draw();');
  is('__mm', 1, 'drawMinimap calls outside photo mode');

  // 5. index.html has the button once, inside #pause-overlay
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  if ((html.match(/id="pause-photo"/g) || []).length !== 1) fail('id="pause-photo" must appear exactly once');
  const i = html.indexOf('<div id="pause-overlay">'), j = html.indexOf('id="pause-photo"'), k = html.indexOf('<div id="touch-controls">');
  if (!(i >= 0 && j > i && j < k)) fail('pause-photo is not inside #pause-overlay');
  checked++;

  console.log('PASS ' + checked);
} catch (err) {
  console.error('FAIL ' + err.message);
  process.exit(1);
}
