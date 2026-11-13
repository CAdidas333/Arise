'use strict';

// Checks controller rumble on big hits and its Controller rumble setting (ON, OFF).
// Run: node tools/test_rumble.js   (prints PASS <number of cases checked>)

const vm = require('vm');
const { createGame } = require('./lib/headless.js');

const fail = msg => { throw new Error(msg); };

(async () => {
  const { ctx, api } = createGame();
  const at = expr => vm.runInContext(expr, ctx);
  let checked = 0;
  const ok = (cond, msg) => { if (!cond) fail(msg); checked++; };
  const tick = () => new Promise(r => setImmediate(r));
  let unhandled = 0; process.on('unhandledRejection', () => { unhandled++; });

  // A fake pad that records every rumble; readPads serves it
  at('globalThis.__pad = { mapping:"standard", axes:[0,0,0,0], buttons:[], vibrationActuator:{ calls:[], playEffect(type, p){ this.calls.push([type, p]); return Promise.resolve(); } } }; globalThis.__list = [__pad]; readPads = () => __list;');
  const calls = () => at('__pad.vibrationActuator.calls');
  const reset = () => at('__pad.vibrationActuator.calls.length = 0; padRumbleT = -1; clock = 100; settings.rumble = "on"; settings.shake = "full";');
  const sh = n => at(`clock += 0.1; shake(${n});`);

  // 1. Default is on
  ok(at('settings.rumble') === 'on', `default rumble ${at('settings.rumble')}, expected on`);

  // 2. shake(14): strength 0.5, duration 130; shake(28): 1 and 200
  reset(); sh(14);
  ok(calls().length === 1 && calls()[0][0] === 'dual-rumble', 'shake(14) did not make one dual-rumble call');
  ok(calls()[0][1].strongMagnitude === 0.5 && calls()[0][1].duration === 130, `shake(14) gave ${JSON.stringify(calls()[0][1])}`);
  sh(28);
  ok(calls()[1][1].strongMagnitude === 1 && calls()[1][1].duration === 200, `shake(28) gave ${JSON.stringify(calls()[1][1])}`);

  // 3. Two shakes inside 0.05 s give one call
  reset(); at('shake(10); clock += 0.01; shake(10);');
  ok(calls().length === 1, `two quick shakes gave ${calls().length} calls`);

  // 4. Off: no call; shake off with rumble on: still a call
  reset(); at('settings.rumble = "off";'); sh(20);
  ok(calls().length === 0, 'rumble off still rumbled');
  reset(); at('settings.shake = "off";'); sh(20);
  ok(calls().length === 1, 'shake off stopped the rumble');

  // 5. Bad pads: no actuator, a throwing playEffect, a rejected promise
  reset(); at('__list = [{ mapping:"standard", axes:[], buttons:[] }]; readPads = () => __list;');
  let threw = false; try { sh(20); } catch (e) { threw = true; }
  ok(!threw, 'a pad without vibrationActuator threw');
  at('__list = [{ mapping:"standard", axes:[], buttons:[], vibrationActuator:{ playEffect(){ throw new Error("no"); } } }];');
  threw = false; try { sh(20); } catch (e) { threw = true; }
  ok(!threw, 'a throwing playEffect escaped');
  at('__list = [{ mapping:"standard", axes:[], buttons:[], vibrationActuator:{ playEffect(){ return Promise.reject(new Error("no")); } } }];');
  threw = false; try { sh(20); } catch (e) { threw = true; }
  await tick(); await tick();
  ok(!threw && unhandled === 0, 'a rejected playEffect escaped');

  // 6. No pads: shake(10) sets camera.shake as before
  reset(); at('__list = []; camera.shake = 0;'); threw = false;
  try { sh(10); } catch (e) { threw = true; }
  ok(!threw && at('camera.shake') === 10, `no pads: threw ${threw}, camera.shake ${at('camera.shake')}`);

  // 7. toggleRumble twice from on: off, on
  at('settings.rumble = "on"; toggleRumble();');
  ok(at('settings.rumble') === 'off', 'first toggle did not give off');
  at('toggleRumble();');
  ok(at('settings.rumble') === 'on', 'second toggle did not give on');

  // 8. Save round trip keeps off; 'maybe' or a missing key loads as on
  api.player = api.createPlayer('RumbleBot');
  at('settings.rumble = "off"; saveGame(); settings.rumble = "on"; loadGame();');
  ok(at('settings.rumble') === 'off', 'save round trip lost off');
  const edit = body => at(`(() => { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); ${body}; localStorage.setItem(SAVE_KEY, JSON.stringify(d)); loadGame(); })()`);
  edit('d.settings.rumble = "maybe"');
  ok(at('settings.rumble') === 'on', `'maybe' loaded as ${at('settings.rumble')}`);
  at('settings.rumble = "off"; saveGame(); settings.rumble = "on";'); edit('delete d.settings.rumble'); // a fresh start holds the default on, and loadGame keeps it
  ok(at('settings.rumble') === 'on', `a missing key loaded as ${at('settings.rumble')}`);

  // 9. The Controls tab has the row
  ok(at('tabControls()').includes('data-act="rumble"'), 'tabControls has no rumble row');

  console.log('PASS ' + checked);
})().catch(err => { console.error('FAIL'); console.error(err.stack); process.exit(1); });
