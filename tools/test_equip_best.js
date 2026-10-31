'use strict';

// Checks the ARMORY tab's EQUIP BEST button: which items it puts on, what goes back in the bag, that it is safe to press twice.
// Run: node tools/test_equip_best.js   (prints PASS <number of checks>)

const vm = require('vm');
const { createGame } = require('./lib/headless.js');

const fail = msg => { throw new Error(msg); };

try {
  const { ctx, api } = createGame();
  const at = expr => vm.runInContext(expr, ctx);
  let checked = 0;
  const ok = (cond, msg) => { if (!cond) fail(msg); checked++; };

  // One item per call; every mod is a share of its cap, so the score is easy to read off
  const item = (slot, name, dmg, hp = 0) => ({ slot, name, rarity:hp ? 1 : 0, lvl:5, mods:hp ? { dmg, hp } : { dmg } });
  const fresh = () => { const p = api.createPlayer('EquipBot'); api.player = p; api.resetWorld(); return p; };
  at(`__toasts = []; toast = function (t) { __toasts.push(t); };`);

  // 1. a bag with a better and a worse armor, a better ring, a worse pair of boots
  let p = fresh();
  const wornArmor = item('armor', 'WORN ARMOR', 0.06), wornRing = item('ring', 'WORN RING', 0.05), wornBoots = item('boots', 'WORN BOOTS', 0.09);
  const goodArmor = item('armor', 'GOOD ARMOR', 0.12), badArmor = item('armor', 'BAD ARMOR', 0.03);
  const goodRing = item('ring', 'GOOD RING', 0.10), badBoots = item('boots', 'BAD BOOTS', 0.02);
  p.gear.armor = wornArmor; p.gear.ring = wornRing; p.gear.boots = wornBoots;
  p.bag = [badArmor, goodRing, badBoots, goodArmor];
  const bagSize = p.bag.length;
  ok(at('player.bag.some(it => gearBetter(it))'), 'the setup has no upgrade in the bag');

  // the button is offered while an upgrade is in the bag
  ok(at('gearSection()').includes('data-act="gear-best"'), 'EQUIP BEST is missing although the bag holds an upgrade');
  ok(at('gearSection()').indexOf('data-act="gear-best"') < at('gearSection()').indexOf('data-act="gear-sell-weaker"'), 'EQUIP BEST is not before SELL ALL WEAKER');

  // 2. pressing it puts on the better armor and ring, leaves the boots alone, one toast
  at('equipBestGear()');
  p = api.player;
  ok(p.gear.armor === goodArmor, 'the better armor is not worn');
  ok(p.gear.ring === goodRing, 'the better ring is not worn');
  ok(p.gear.boots === wornBoots, 'the boots changed although the bag boots are worse');
  ok(p.bag.includes(wornArmor) && p.bag.includes(wornRing), 'the old armor and ring did not go into the bag');
  ok(p.bag.includes(badArmor) && p.bag.includes(badBoots), 'a worse item left the bag');
  ok(!p.bag.includes(goodArmor) && !p.bag.includes(goodRing), 'a worn item is still in the bag');
  ok(p.bag.length === bagSize, `the bag changed size, ${bagSize} to ${p.bag.length}`);
  ok(at('__toasts').length === 1 && at('__toasts[0]') === 'EQUIPPED 2 UPGRADES', `the toast was ${JSON.stringify(at('__toasts'))}`);

  // 3. the stats follow the gear
  ok(Math.abs(at('gearMod("dmg")') - (0.12 + 0.10 + 0.09)) < 1e-9, `gear damage is ${at('gearMod("dmg")')}, not 0.31`);

  // 4. pressing it again changes nothing, and the button is gone
  const before = JSON.stringify([p.gear, p.bag]);
  at('equipBestGear()');
  ok(JSON.stringify([api.player.gear, api.player.bag]) === before, 'a second press changed the gear or the bag');
  ok(at('__toasts').length === 1, 'a second press showed a toast');
  ok(!at('gearSection()').includes('data-act="gear-best"'), 'EQUIP BEST is still offered with nothing to upgrade');

  // 5. an empty slot is filled with the best of several, and the bag shrinks by that one item
  p = fresh();
  const a = item('boots', 'BOOTS A', 0.04), b = item('boots', 'BOOTS B', 0.07, 0.10), c = item('boots', 'BOOTS C', 0.05);
  p.bag = [a, b, c];
  at('__toasts.length = 0; equipBestGear()');
  p = api.player;
  ok(p.gear.boots === b, 'the strongest boots were not put on an empty slot');
  ok(p.bag.length === 2 && p.bag.includes(a) && p.bag.includes(c), 'the bag is wrong after filling an empty slot');
  ok(at('__toasts[0]') === 'EQUIPPED 1 UPGRADE', `the one-upgrade toast was ${at('__toasts[0]')}`);

  // 6. nothing to upgrade: no change, no toast
  p = fresh();
  p.gear.ring = item('ring', 'WORN RING', 0.09); p.bag = [item('ring', 'WEAK RING', 0.02)];
  at('__toasts.length = 0; equipBestGear()');
  ok(api.player.gear.ring.name === 'WORN RING' && api.player.bag.length === 1 && at('__toasts').length === 0, 'it acted although the bag held no upgrade');

  // 7. an equal item is not an upgrade, and an empty bag is fine
  p = fresh();
  p.gear.armor = item('armor', 'WORN', 0.08); p.bag = [item('armor', 'SAME', 0.08)];
  at('equipBestGear()');
  ok(api.player.gear.armor.name === 'WORN' && api.player.bag[0].name === 'SAME', 'an equal item replaced the worn one');
  p.bag = [];
  at('equipBestGear()');
  ok(api.player.bag.length === 0, 'an empty bag changed');

  // 8. equipGear still swaps the same way (the shared step was pulled out of it)
  p = fresh();
  const w = item('armor', 'W', 0.05), n = item('armor', 'N', 0.01);
  p.gear.armor = w; p.bag = [item('ring', 'R', 0.01), n];
  at('equipGear(1)');
  ok(api.player.gear.armor === n && api.player.bag[1] === w && api.player.bag.length === 2, 'equipGear no longer swaps in place');

  console.log('PASS ' + checked);
} catch (err) {
  console.error('FAIL');
  console.error(err.stack);
  process.exit(1);
}
