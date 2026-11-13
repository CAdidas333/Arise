'use strict';

// Checks the gamepad controls: safe pad reading, the left stick, hold-to-attack, dodge, pause,
// reward picks, analogue triggers, the title key and the Controls tab markup.
// Run: node tools/test_gamepad.js   (prints PASS <number of cases checked>)

const vm = require('vm');
const { createGame } = require('./lib/headless.js');

const fail = msg => { throw new Error(msg); };

try {
  const { ctx, api } = createGame();
  const at = expr => vm.runInContext(expr, ctx);
  let checked = 0;
  const ok = (cond, msg) => { if (!cond) fail(msg); checked++; };

  // 1. readPads() is safe in the headless sandbox: no Gamepad API, so [] and no throw
  let pads = at('readPads()');
  ok(Array.isArray(pads) && pads.length === 0, `readPads() returned ${JSON.stringify(pads)}, expected []`);

  // 2. pollPad with nothing or a null entry does not throw
  let threw = false;
  try { at('pollPad([]); pollPad([null]);'); } catch (e) { threw = true; }
  ok(!threw, 'pollPad([]) or pollPad([null]) threw');

  // The game reads the connected pads through navigator.getGamepads; a fake standard pad is served here.
  at('globalThis.__pads = []; globalThis.navigator = { getGamepads: () => globalThis.__pads };');
  const newPad = () => at('globalThis.__pads = [ { mapping:"standard", axes:[0,0,0,0], buttons: Array.from({length:17}, () => ({ pressed:false, value:0 })) } ]; PAD_PREV.length = 0; padMove.active = false; padAttack = false;');
  const press = (i, v = true) => at(`__pads[0].buttons[${i}].pressed = ${v};`);
  // Enter a gate, stepping past the intro until the fight is live
  const enterFight = () => { api.reseed(1); api.resetWorld(); api.player = api.createPlayer('PadBot'); api.player.story.opening = true; api.startDungeon(api.GATE_DEFS[0]); for (let i = 0; i < 300 && api.dungeon.state !== 'fight'; i++) api.step(1 / 60); };
  const stepOnce = () => at('pollPad(__pads); step(1/60);');

  // 3. Left stick at 0.9 for 30 steps walks the hunter right
  newPad(); enterFight(); at('__pads[0].axes[0] = 0.9;');
  const x0 = at('player.x');
  for (let i = 0; i < 30; i++) stepOnce();
  ok(at('player.x') > x0 + 5, `stick at 0.9 did not move the hunter right (x ${x0} -> ${at('player.x')})`);

  // 4. Left stick at 0.1 is inside the dead zone: the hunter does not move
  newPad(); enterFight(); at('__pads[0].axes[0] = 0.1;');
  const xd = at('player.x');
  for (let i = 0; i < 30; i++) stepOnce();
  ok(Math.abs(at('player.x') - xd) < 0.001, `stick at 0.1 moved the hunter (x ${xd} -> ${at('player.x')})`);

  // Count dodge() calls without changing what the game does
  at('globalThis.__dodges = 0; const __dodge0 = dodge; dodge = function () { globalThis.__dodges++; return __dodge0.apply(this, arguments); };');

  // 5. B held for 10 polls calls dodge once; release and press again makes it twice
  newPad(); enterFight(); at('globalThis.__dodges = 0;');
  press(1);
  for (let i = 0; i < 10; i++) stepOnce();
  ok(at('globalThis.__dodges') === 1, `B held called dodge ${at('globalThis.__dodges')} times, expected 1`);
  press(1, false); stepOnce(); press(1); stepOnce();
  ok(at('globalThis.__dodges') === 2, `B pressed again called dodge ${at('globalThis.__dodges')} times, expected 2`);

  // 6. A held: padAttack is true and slash is used; released: padAttack is false
  newPad(); enterFight(); at('player.cds.slash = 0;');
  press(0); at('pollPad(__pads);');
  ok(at('padAttack') === true, 'A held did not set padAttack');
  ok(at('player.cds.slash') > 0, 'A press did not start the slash cooldown');
  at('step(1/60);');
  ok(at('padAttack') === true, 'A still held did not keep padAttack');
  press(0, false); at('pollPad(__pads);');
  ok(at('padAttack') === false, 'A released did not clear padAttack');

  // 7. Start pressed once pauses; released and pressed again resumes
  newPad(); enterFight(); at('paused = false;');
  press(9); at('pollPad(__pads); step(1/60);');
  ok(at('paused') === true, 'Start did not pause');
  press(9, false); at('pollPad(__pads); step(1/60);');
  press(9); at('pollPad(__pads); step(1/60);');
  ok(at('paused') === false, 'Start did not resume');

  // 8. With a reward up, LB, RB and LT pick choices 1, 2 and 3
  newPad(); enterFight(); at('showBoons();');
  ok(at('dungeon.state') === 'boon', 'showBoons() did not raise a reward');
  at('globalThis.__pick = -1; globalThis.__boon0 = chooseBoon; chooseBoon = i => { globalThis.__pick = i; };');
  press(4); at('pollPad(__pads);');
  ok(at('globalThis.__pick') === 0, `LB picked ${at('globalThis.__pick')}, expected 0`);
  press(4, false); at('pollPad(__pads);');
  press(5); at('pollPad(__pads);');
  ok(at('globalThis.__pick') === 1, `RB picked ${at('globalThis.__pick')}, expected 1`);
  press(5, false); at('pollPad(__pads);');
  press(6); at('pollPad(__pads);');
  ok(at('globalThis.__pick') === 2, `LT picked ${at('globalThis.__pick')}, expected 2`);

  // 9. LT is an analogue trigger: value 0.8 with pressed false still counts as a press
  press(6, false); at('__pads[0].buttons[6].value = 0; pollPad(__pads);'); // release first, so the next trigger is a fresh edge
  at('__pads[0].buttons[6].value = 0.8; globalThis.__pick = -1;');
  at('pollPad(__pads);');
  ok(at('globalThis.__pick') === 2, `analogue LT (value 0.8) did not pick (got ${at('globalThis.__pick')})`);
  at('chooseBoon = globalThis.__boon0;');

  // 10. On the title screen A sends onKey('enter') instead of an attack
  at('globalThis.__seen = []; const __onKey0 = onKey; onKey = function (k, e) { globalThis.__seen.push(k); return __onKey0.apply(this, arguments); };');
  newPad(); at('gameState = "TITLE";');
  press(0); at('pollPad(__pads);');
  ok(at('globalThis.__seen.indexOf("enter")') >= 0, `title A sent ${JSON.stringify(at('globalThis.__seen'))}, expected "enter"`);
  at('onKey = __onKey0; gameState = "HUB";');

  // 11. The Controls tab lists the controller
  ok(at('tabControls()').includes('Controller'), 'tabControls markup does not contain "Controller"');

  // 12. Menus: a fake container with fake buttons stands in for the hub / pause menu
  at('globalThis.__mk = n => Array.from({length:n}, () => ({ offsetParent:{}, disabled:false, style:{}, clicks:0, click(){ this.clicks++; }, scrollIntoView(){} })); globalThis.__btns = __mk(3); globalThis.__box = { querySelectorAll: () => __btns }; globalThis.__menu0 = padMenu; padMenu = () => __box;');
  const tap = i => { press(i); at('pollPad(__pads);'); press(i, false); at('pollPad(__pads);'); };
  const clicks = () => at('__btns.map(b => b.clicks)').join();
  at('gameState = "HUB"; padFocus = -1;');
  newPad(); at('globalThis.__calls = []; const __ku0 = usePotion; usePotion = function () { globalThis.__calls.push("potion"); return __ku0.apply(this, arguments); }; const __ok1 = onKey; onKey = function (k) { globalThis.__calls.push(k); return __ok1.apply(this, arguments); };');
  tap(13); tap(13); tap(0);
  ok(clicks() === '0,1,0', `D-pad down twice then A clicked ${clicks()}, expected 0,1,0`);
  ok(at('__btns[0].style.outline') === '' && at('__btns[1].style.outline').includes('#00d4ff'), 'the old outline was not cleared or the new one not set');
  ok(at('__calls.indexOf("potion")') < 0 && at('__calls.indexOf("enter")') < 0 && at('__calls.indexOf("f")') < 0, `a driven menu still sent ${JSON.stringify(at('__calls'))}`);
  tap(15); tap(15);
  ok(at('padFocus') === 0, `wrapping past the end gave ${at('padFocus')}, expected 0`);
  at('padFocus = -1;'); tap(12);
  ok(at('padFocus') === 2, `D-pad up from -1 gave ${at('padFocus')}, expected 2`);
  at('__btns[1].offsetParent = null; padFocus = 0;'); tap(13);
  ok(at('padFocus') === 1 && at('padButtons(__box).length') === 2, 'a hidden button was not skipped');
  at('__btns[1].offsetParent = {}; menuTab = "status";'); tap(4);
  ok(at('menuTab') === 'record', `LB from tab 0 gave ${at('menuTab')}, expected record`);
  tap(5);
  ok(at('menuTab') === 'status', `RB gave ${at('menuTab')}, expected status`);
  tap(5);
  ok(at('menuTab') === 'gates', `RB from tab 0 gave ${at('menuTab')}, expected gates`);
  // 12b. In the hub only Start still sends its key: LT/RT do not jump tabs, X/Y/B send nothing
  at('menuTab = "status"; globalThis.__calls = [];');
  tap(6); tap(7); tap(2); tap(3); tap(1);
  ok(at('menuTab') === 'status', `LT/RT in the hub changed the tab to ${at('menuTab')}`);
  ok(at('__calls.length') === 0, `X/Y/B/LT/RT in the hub sent ${JSON.stringify(at('__calls'))}`);
  tap(9);
  ok(at('__calls.indexOf("escape")') >= 0, `Start in the hub sent ${JSON.stringify(at('__calls'))}, expected "escape"`);
  // 12c. Leaving the menu clears the outline on the button that was lit
  at('padFocus = -1;'); tap(13);
  ok(at('__btns[0].style.outline').includes('#00d4ff'), 'the pause-style button was not lit');
  at('globalThis.__m1 = padMenu; padMenu = () => null; pollPad(__pads); padMenu = __m1;');
  ok(at('__btns[0].style.outline') === '' && at('__btns[0].style.outlineOffset') === '' && at('padLit') === null, 'the outline lingered after the menu closed');
  at('onKey = __ok1; usePotion = __ku0; padMenu = __menu0;');

  // 13. In a fight (not paused) the D-pad still drinks a potion
  newPad(); enterFight(); at('paused = false; globalThis.__calls = []; onKey = function (k) { globalThis.__calls.push(k); }; padFocus = -1;');
  tap(13);
  ok(at('__calls.indexOf("f")') >= 0, `fight D-pad down sent ${JSON.stringify(at('__calls'))}, expected "f"`);
  ok(at('padMenu()') === null, 'padMenu() was not null in a fight');
  at('onKey = __ok1;');

  console.log('PASS ' + checked);
} catch (err) {
  console.error('FAIL');
  console.error(err.stack);
  process.exit(1);
}
