'use strict';

// Checks the gear rules in js/01-data.js: what rollGear makes, what cleanGear lets through, how often each rarity turns up.
// Run: node tools/test_gear.js   (prints PASS <number of items checked>)

const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '../js/01-data.js'), 'utf8');
const stubs = 'let player = null;\n';

// A seeded generator in place of Math.random, so every run checks the same items
let seed = 20261011;
Math.random = () => {
  seed = (seed + 0x6D2B79F5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const testBody = `
const fail = msg => { throw new Error(msg); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// Words the art and naming rule keeps out of item names
const BANNED = /rune|sigil|hex|curse|holy|bless|demon|devil|soul|spirit|star|glyph|cross|halo|occult|angel|saint|sacred|divine|witch|hell|pentagram/i;
let checked = 0;
const maxSeen = {};

function checkItem(it, lvl, minRarity, tag) {
  const where = tag + ' ' + JSON.stringify(it);
  if (!GEAR_SLOTS.includes(it.slot)) fail('bad slot: ' + where);
  if (!Number.isInteger(it.rarity) || it.rarity < 0 || it.rarity > 3) fail('bad rarity: ' + where);
  if (it.rarity < minRarity) fail('rarity under the minimum ' + minRarity + ': ' + where);
  if (!Number.isInteger(it.lvl) || it.lvl !== Math.max(1, Math.min(100, lvl))) fail('bad lvl: ' + where);
  if (typeof it.name !== 'string' || !it.name || it.name.length > 40 || it.name !== it.name.trim()) fail('bad name: ' + where);
  if (BANNED.test(it.name)) fail('banned word in name: ' + where);
  const keys = Object.keys(it.mods);
  if (keys.length !== 1 + it.rarity || new Set(keys).size !== keys.length) fail('wrong number of mods: ' + where);
  if (!GEAR_FIRST[it.slot].includes(keys[0])) fail('first mod does not fit the slot: ' + where);
  for (const k of keys) {
    const v = it.mods[k];
    if (!(k in GEAR_CAPS)) fail('unknown mod ' + k + ': ' + where);
    if (typeof v !== 'number' || !(v > 0) || v > GEAR_CAPS[k]) fail('mod ' + k + ' out of range: ' + where);
    if (Math.abs(v*100 - Math.round(v*100)) > 1e-9) fail('mod ' + k + ' is not a whole percent: ' + where);
    if (it.rarity === 3) maxSeen[k] = Math.max(maxSeen[k] || 0, v);
    if (!gearModText(k, v).includes(GEAR_LABEL[k])) fail('no label for ' + k);
  }
  const price = gearValue(it);
  if (!Number.isInteger(price) || price <= 0) fail('bad sell price ' + price + ': ' + where);
  if (price !== Math.round((20 + it.lvl*6) * (1 + it.rarity*1.5))) fail('sell price off the formula: ' + where);
  // a save and load must hand back the same item
  const back = cleanGear(JSON.parse(JSON.stringify(it)));
  if (!same(back, it)) fail('did not survive a save: ' + where + ' -> ' + JSON.stringify(back));
  checked++;
}

// 1. Every kind of roll, at every gate level
const LEVELS = [1, 10, 25, 45, 70, 90];
for (let i = 0; i < 4000; i++) for (const lvl of LEVELS) {
  const luck = i % 3, minRarity = luck === 2 ? 1 : 0;
  checkItem(rollGear(lvl, minRarity, luck), lvl, minRarity, 'roll');
}
for (let i = 0; i < 2000; i++) { const m = i % 4; checkItem(rollGear(50, m), 50, m, 'minRarity'); }
for (const lvl of [0, -5, 1000, NaN, undefined, 2.7]) checkItem(rollGear(lvl), (lvl|0), 0, 'odd lvl');
checkItem(rollGear(30, 9, 9), 30, 3, 'odd minRarity and luck');

// 2. Three Legendary items give about +40% damage at most, and no mod gets near its cap
if (!(maxSeen.dmg <= 0.14)) fail('a Legendary gave ' + maxSeen.dmg + ' damage; three would pass +42%');
for (const k of GEAR_KEYS) {
  if (!maxSeen[k]) fail('no Legendary ever rolled ' + k);
  if (maxSeen[k] > GEAR_CAPS[k]*0.75 + 0.005) fail('Legendary ' + k + ' reached ' + maxSeen[k]);
}

// 3. How often each rarity turns up
const N = 60000;
const freq = (lvl, minRarity, luck) => { const c = [0, 0, 0, 0]; for (let i = 0; i < N; i++) c[rollGear(lvl, minRarity, luck).rarity]++; checked += N; return c.map(x => x/N); };
for (const lvl of [1, 90]) {
  const plain = freq(lvl, 0, 0), elite = freq(lvl, 0, 1), boss = freq(lvl, 1, 2), rare = freq(lvl, 1, 0);
  const at = ' at lvl ' + lvl + ': ';
  if (!(plain[3] < 0.005)) fail('plain Legendary' + at + plain[3]);
  if (!(plain[0] > 0.7)) fail('plain rolls are not mostly Common' + at + plain[0]);
  if (!(plain[0] > plain[1] && plain[1] > plain[2] && plain[2] > plain[3] && plain[3] > 0)) fail('plain order' + at + plain);
  if (!(elite[3] < 0.012 && elite[3] > plain[3])) fail('elite Legendary' + at + elite[3]);
  if (!(elite[0] > 0.5 && elite[0] < plain[0])) fail('elite Common' + at + elite[0]);
  if (boss[0] !== 0) fail('a boss dropped a Common' + at + boss[0]);
  if (!(boss[3] < 0.05 && boss[3] > 0.015)) fail('boss Legendary' + at + boss[3]);
  if (!(boss[1] > boss[2] && boss[2] > boss[3])) fail('boss order' + at + boss);
  if (rare[0] !== 0 || !(rare[3] < 0.05)) fail('minRarity 1 on a plain roll' + at + rare);
}
// higher gates lean towards the better rarities
if (!(freq(90, 0, 0)[0] < freq(1, 0, 0)[0])) fail('gate level does not improve the odds');

// 4. cleanGear: junk is thrown out or repaired
const good = () => ({ slot:'ring', name:'Tempered Iron Band', rarity:1, lvl:25, mods:{ dmg:0.07, crit:0.04 } });
if (!same(cleanGear(good()), good())) fail('a good item was changed');
for (const junk of [null, undefined, 7, 'ring', true, [], {}, { slot:'ring' }, { slot:'ring', mods:null }, { slot:'ring', mods:{} },
  Object.assign(good(), { slot:'helmet' }), Object.assign(good(), { slot:['ring'] }), Object.assign(good(), { slot:'__proto__' }),
  Object.assign(good(), { mods:{ dmg:0, crit:-1 } }), Object.assign(good(), { mods:{ dmg:'x', crit:null } }), Object.assign(good(), { mods:{ power:0.5 } }), Object.assign(good(), { mods:'dmg' })]) {
  if (cleanGear(junk) !== null) fail('junk got through: ' + JSON.stringify(junk));
}
let c = cleanGear(Object.assign(good(), { mods:{ dmg:99, crit:1e308, hp:Infinity } }));
if (!same(c.mods, { dmg:0.18, crit:0.10 })) fail('huge values were not cut to the caps (and to 1 + rarity mods): ' + JSON.stringify(c));
c = cleanGear(Object.assign(good(), { mods:{ dmg:0.07, toString:1, constructor:2, power:9, crit:0.04 }, extra:'x', onclick:'alert(1)' }));
if (!same(c, good())) fail('extra keys survived: ' + JSON.stringify(c));
c = cleanGear(Object.assign(good(), { name:'x'.repeat(500) }));
if (c.name !== 'x'.repeat(40)) fail('a 500-character name was not cut to 40');
for (const name of [undefined, null, 42, {}, '', '   ']) { c = cleanGear(Object.assign(good(), { name })); if (typeof c.name !== 'string' || !c.name || c.name.length > 40) fail('bad name not repaired: ' + JSON.stringify(c)); }
c = cleanGear(Object.assign(good(), { rarity:99, lvl:1e9 })); if (c.rarity !== 3 || c.lvl !== 100) fail('rarity and lvl not clamped high: ' + JSON.stringify(c));
c = cleanGear(Object.assign(good(), { rarity:-4, lvl:-4 })); if (c.rarity !== 0 || c.lvl !== 1 || Object.keys(c.mods).length !== 1) fail('rarity and lvl not clamped low: ' + JSON.stringify(c));
c = cleanGear(Object.assign(good(), { rarity:'2', lvl:'30.9' })); if (c.rarity !== 2 || c.lvl !== 30) fail('rarity and lvl not made whole numbers: ' + JSON.stringify(c));
c = cleanGear(Object.assign(good(), { rarity:{}, lvl:[] })); if (c.rarity !== 0 || c.lvl !== 1) fail('odd rarity and lvl: ' + JSON.stringify(c));
c = cleanGear(Object.assign(good(), { mods:{ dmg:0.0712345, crit:0.0001 } })); if (!same(c.mods, { dmg:0.07, crit:0.01 })) fail('values not rounded to whole percents: ' + JSON.stringify(c));
c = cleanGear(cleanGear(Object.assign(good(), { mods:{ dmg:5, cdr:5, gold:5 }, rarity:2 }))); if (!same(c.mods, { dmg:0.18, cdr:0.08, gold:0.30 })) fail('cleaning twice changed the item: ' + JSON.stringify(c));

// 5. gearMod: nothing equipped means 0 for every mod
for (const k of GEAR_KEYS) if (gearMod(k) !== 0) fail('gearMod with no hunter');
player = { gear:{ armor:null, boots:null, ring:null } };
for (const k of GEAR_KEYS) if (gearMod(k) !== 0) fail('gearMod with nothing equipped');
player.gear.ring = { slot:'ring', name:'a', rarity:1, lvl:1, mods:{ dmg:0.07, crit:0.04 } };
player.gear.armor = { slot:'armor', name:'b', rarity:1, lvl:1, mods:{ hp:0.1, dmg:0.05 } };
if (Math.abs(gearMod('dmg') - 0.12) > 1e-12 || gearMod('crit') !== 0.04 || gearMod('hp') !== 0.1 || gearMod('spd') !== 0) fail('gearMod sums wrong');
if (gearMod('dmg', { gear:{ armor:null, boots:null, ring:null } }) !== 0) fail('gearMod ignored the hunter it was given');
if (gearModText('dmg', 0.12) !== '+12% damage' || gearModText('cdr', 0.05) !== '-5% cooldowns') fail('gearModText');

// 6. gearScore, gearBetter, gearWeaker, and BAG_MAX
if (BAG_MAX !== 24) fail('BAG_MAX expected 24, got ' + BAG_MAX);
if (gearScore(null) !== 0) fail('gearScore(null)');
for (const k of GEAR_KEYS) {
  if (Math.abs(gearScore({ slot:'ring', mods:{ [k]:GEAR_CAPS[k] } }) - 1) > 1e-12) fail('gearScore of one mod at cap for ' + k);
  checked++;
}
for (let i = 0; i < 200; i++) {
  if (!(gearScore(rollGear(100, 3)) > gearScore(rollGear(1)))) fail('Legendary at lvl 100 did not outscore rollGear(1)');
  checked++;
}
const worn = { slot:'ring', name:'w', rarity:1, lvl:20, mods:{ dmg:0.09, crit:0.05 } };
const sameIt = { slot:'ring', name:'s', rarity:1, lvl:20, mods:{ dmg:0.09, crit:0.05 } };
const betterIt = { slot:'ring', name:'b', rarity:1, lvl:20, mods:{ dmg:0.12, crit:0.05 } };
const weakerIt = { slot:'ring', name:'k', rarity:0, lvl:1, mods:{ dmg:0.04 } };
const bootIt = { slot:'boots', name:'bt', rarity:0, lvl:1, mods:{ spd:0.03 } };
player = { gear:{ armor:null, boots:null, ring:worn } };
if (!gearBetter(bootIt) || gearWeaker(bootIt)) fail('empty slot must be better and never weaker');
if (gearBetter(sameIt) || gearWeaker(sameIt)) fail('equal item is neither better nor weaker');
if (!gearBetter(betterIt) || gearWeaker(betterIt)) fail('better item');
if (gearBetter(weakerIt) || !gearWeaker(weakerIt)) fail('weaker item');
const kept = [weakerIt, sameIt, betterIt, bootIt].filter(it => !gearWeaker(it));
if (kept.length !== 3 || kept.includes(weakerIt) || !kept.includes(sameIt) || !kept.includes(betterIt) || !kept.includes(bootIt)) fail('sellWeakerGear filter');
checked += 5;

return checked;
`;

try {
  const checked = new Function(stubs + src + testBody)();
  console.log('PASS ' + checked);
} catch (err) {
  console.error('FAIL');
  console.error(err.stack);
  process.exit(1);
}
