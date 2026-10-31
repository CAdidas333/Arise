'use strict';

// Checks the Gilded Rift: when it opens, the GATES card, the run (eight goblins that flee, 60 seconds, nothing that hurts),
// the rewards, the end screen, and that a rift run is not a gate clear.
// Run: node tools/test_rift.js   (prints PASS <number of cases checked>)

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { createGame, ROOT } = require('./lib/headless.js');

const fail = msg => { throw new Error(msg); };

try {
  const { ctx, api, soak } = createGame();
  api.reseed(20261101); // the game's own seeded RNG, so every run checks the same rift
  const at = expr => vm.runInContext(expr, ctx);
  let checked = 0;
  const ok = (cond, msg) => { if (!cond) fail(msg); checked++; };

  // A page that keeps the text written to its elements (the HUD line, the end screen); anything else done to an element is swallowed
  const els = {};
  const el = id => els[id] || (els[id] = new Proxy({ textContent:'', innerHTML:'', style:{}, value:'' }, { get: (t, k) => k in t ? t[k] : soak }));
  ctx.document = new Proxy({ getElementById: el }, { get: (t, k) => k in t ? t[k] : soak });

  const frames = n => { for (let i = 0; i < n; i++) api.step(1/60); };
  const seconds = s => frames(Math.round(s*60));
  const hunter = (level = 1) => { const p = api.createPlayer('RiftBot'); p.level = level; api.player = p; api.resetWorld(); return p; };
  const clearOnce = () => { api.startDungeon(api.GATE_DEFS[0]); at('clearGate(makeEnemy(GATE_DEFS[0].boss, 0, 0, { boss:true }))'); }; // a normal gate, won
  const goblins = () => at('enemies').filter(e => e.kind === 'flee' && e.alive); // the ones still running
  const live = e => { e.spawnT = 0; return e; }; // out of its rise, so it can act and be hit
  const strike = (e, dmg = 1e12) => at(`damageEnemy(enemies[${at('enemies').indexOf(e)}], ${dmg}, { crit:false })`);
  const enter = (p, level) => { p.level = level; p.rift = true; at('enterRift()'); };
  const randomIs = v => at(`Math.random = () => ${v}`);
  at('__realRandom = Math.random');
  const restoreRandom = () => at('Math.random = __realRandom');

  // 1. the table: one rift, its numbers, no boss and no enemy list to read, and the art rule in its words
  const RIFT = at('RIFT');
  ok(RIFT.id === 'rift' && RIFT.name === 'Gilded Rift' && RIFT.rank === 'RIFT' && RIFT.rift === true, 'RIFT has the wrong identity');
  ok(RIFT.time === 60 && RIFT.goblins === 8 && RIFT.reqLevel === 1 && RIFT.waves === 1, 'RIFT has the wrong numbers');
  ok(RIFT.boss === undefined && RIFT.enemies === undefined, 'RIFT has a boss or an enemy list, which nothing may read');
  ok(RIFT.theme.line === '#ffcc33' && RIFT.theme.ember === '#ffe58a' && RIFT.ambientColor === '#332a00', 'RIFT colours are wrong');
  ok(fs.existsSync(path.join(ROOT, 'assets/floors', RIFT.floor + '.webp')), `RIFT floor ${RIFT.floor} is not in assets/floors`);
  ok(RIFT.floor === 'a_gate', 'the rift should wear the Dragon\'s Lair floor');
  ok(RIFT.desc === 'Gold goblins flee. 60 seconds. Catch what you can.', 'the card text is wrong');
  const banned = /STAR|RUNE|GOD|HOLY|SAINT|ANGEL|CROSS|PRAY|CHURCH|TEMPLE|DIVINE|SACRED|CURSE|OCCULT|SPELL|DEVIL/i;
  for (const s of [RIFT.name, RIFT.desc, 'GILDED RIFT', 'A RIFT OF GOLD HAS OPENED', 'FIND IT UNDER GATES', 'Gilded Goblin', 'Goblins Caught', 'RIFT CLOSED', 'EVERY GOBLIN CAUGHT', 'THE RIFT CLOSES', 'ENTERING THE GILDED RIFT']) ok(!banned.test(s), `"${s}" uses a banned word`);
  ok(at('typeof AI.flee') === 'function', 'there is no flee AI');
  ok(at('riftClock(60)') === '1:00' && at('riftClock(42)') === '0:42' && at('riftClock(0.2)') === '0:01' && at('riftClock(0)') === '0:00' && at('riftClock(-3)') === '0:00', 'riftClock is wrong');

  // 2. a new hunter has no rift; the first clear always opens one, whatever the dice say
  let p = hunter();
  ok(p.rift === false && p.rifts === 0 && p.riftSeen === false, 'a new hunter starts with a rift field set');
  at('__pops = []; systemPop = function (...a) { __pops.push(a); };');
  randomIs(0.99); // a roll that never opens a rift by chance
  clearOnce();
  ok(p.rift === true && p.riftSeen === true && p.rifts === 0, `the first clear did not open a rift (rift ${p.rift}, seen ${p.riftSeen})`);
  ok(at('__pops.length') === 0, 'the System spoke over the clear, not in the hub');

  // 3. it is announced when the hunter is back in the hub, once, with the words of the brief
  at('returnToHub()');
  const pops = at('__pops');
  ok(pops.length === 1 && pops[0][0] === 'GILDED RIFT' && pops[0][1] === 'A RIFT OF GOLD HAS OPENED' && pops[0][2] === 'FIND IT UNDER GATES', `the hub announcement was ${JSON.stringify(pops)}`);
  at('returnToHub()');
  ok(at('__pops.length') === 1, 'the hub announced the rift twice');

  // 4. only one can be open: a clear with a rift already open leaves it as it is, and no pop is queued
  randomIs(0);
  clearOnce();
  ok(p.rift === true && p.rifts === 0 && at('riftNews') === false, 'a second clear stacked or re-announced a rift');

  // 5. the GATES tab: a card after ENDLESS only while a rift is open
  const open = at('tabGates()'), card = open.slice(open.indexOf('data-act="rift"') - 40);
  ok(open.includes('data-act="rift"') && open.indexOf('data-act="rift"') > open.indexOf('data-act="endless"'), 'the rift card is missing or not after ENDLESS');
  ok(card.includes('>RIFT<') && card.includes('Gilded Rift') && card.includes('Gold goblins flee. 60 seconds. Catch what you can.') && card.includes('>OPEN<') && card.includes('border-left:3px solid #ffcc33'), 'the rift card text or colour is wrong');
  ok(open.trimEnd().endsWith('</div>') && (open.match(/<div/g) || []).length === (open.match(/<\/div>/g) || []).length, 'the GATES tab markup is unbalanced');
  p.rift = false;
  const shut = at('tabGates()');
  ok(!shut.includes('data-act="rift"') && !shut.includes('Gilded Rift') && (shut.match(/<div/g) || []).length === (shut.match(/<\/div>/g) || []).length, 'a rift card shows with no rift open');
  p.rift = true;

  // 6. entering: not with no rift or during a story card; the rift is used up at once, counted, and saved
  at('returnToHub()'); // back in the hub from the last clear (this also ends its extraction)
  p.rift = false; at('enterRift()');
  ok(at('gameState') === 'HUB' && p.rifts === 0, 'enterRift started with no rift open');
  p.rift = true; at('storyRun = {}; enterRift()'); at('storyRun = null');
  ok(at('gameState') === 'HUB' && p.rift === true && p.rifts === 0, 'enterRift started during a story card');
  p.bag = Array.from({ length:at('BAG_MAX') }, () => at('rollGear(1)')); // a full bag asks first
  at('enterRift()');
  ok(at('gameState') === 'HUB' && p.rift === true && at('gateAsk').rift === true, 'a full bag did not ask before the rift');
  at('gateAsk = { ...gateAsk, ok:true }; enterRift()'); // what ENTER ANYWAY does
  ok(at('gameState') === 'DUNGEON' && p.rift === false && p.rifts === 1 && at('dungeon.rift') && at('gateAsk') === null, 'ENTER ANYWAY did not start the rift');
  ok(JSON.parse(at('localStorage.getItem(SAVE_KEY)')).rifts === 1 && JSON.parse(at('localStorage.getItem(SAVE_KEY)')).rift === false, 'entering did not save');
  p.bag = [];

  // 7. the run: an open arena of 1800 by 1300, no chambers, no boss, no waves, and the first line of the HUD
  const g0 = at('dungeon');
  ok(g0.gate.id === 'rift' && g0.endless === false && g0.maxWaves === Infinity && at('layout') === null, 'the rift is not an open arena with no waves');
  ok(at('arenaW') === 1800 && at('arenaH') === 1300, 'the rift arena is not 1800 by 1300');
  ok(g0.rift.t === 60 && g0.rift.caught === 0 && g0.rift.total === 8 && g0.rift.done === false, 'the rift state is wrong at the start');
  ok(els['hud-gate-name'].textContent === 'GILDED RIFT — 1:00 · 0 / 8 CAUGHT', `the HUD line began as "${els['hud-gate-name'].textContent}"`);
  ok(at('spawnQueue').length === 0 && at('enemies').length === 8 && goblins().length === 8, 'the rift did not spawn exactly eight goblins');
  ok(!at('enemies').some(e => e.isBoss || e.elite) && at('dungeon.bossRef') === null, 'the rift has a boss or an elite');
  ok(at('pendingExtraction') === null, 'a rift run has an extraction pending');

  // 8. the goblins: no damage, kind flee, 300 to 600 from the hunter, 90 percent of his speed, health and XP from the top gate his level opens
  const speed = at('pSpeed()');
  for (const e of goblins()) {
    const d = Math.hypot(e.x - p.x, e.y - p.y);
    ok(e.damage === 0 && e.kind === 'flee' && e.name === 'Gilded Goblin' && e.color === '#ffcc33', 'a goblin has the wrong make');
    ok(d >= 300 - 1e-6 && d <= 600 + 1e-6, `a goblin spawned ${d} from the hunter, outside 300 to 600`);
    ok(Math.abs(e.speed - speed*0.9) < 1e-9, `a goblin runs at ${e.speed}, not 90% of ${speed}`);
  }
  const tiers = [[1, 0], [9, 0], [10, 1], [24, 1], [25, 2], [45, 3], [70, 4], [89, 4], [90, 5], [100, 5]];
  for (const [level, gi] of tiers) {
    p = hunter(level); p.rift = true; at('enterRift()');
    const gate = api.GATE_DEFS[gi], base = gate.enemies[0], rift = at('dungeon.rift');
    ok(rift.tier.id === gate.id, `level ${level} got the ${rift.tier.id} tier, not ${gate.id}`);
    ok(rift.spill === Math.ceil(gate.boss.xp*0.25), `level ${level}: the spill is ${rift.spill}`);
    for (const e of goblins()) ok(e.hp === base.hp*2 && e.maxHp === base.hp*2 && e.xp === base.xp*3 && e.damage === 0, `level ${level}: a goblin has ${e.hp} hp and ${e.xp} xp`);
  }

  // 9. the flee AI. A goblin within 420 runs straight away from the hunter
  p = hunter(); p.rift = true; at('enterRift()');
  let gb = live(goblins()[0]); gb.x = 300; gb.y = 0; gb.cd = 99; gb.stun = 0;
  api.step(1/60);
  ok(gb.x > 300 && Math.abs(gb.y) < 1e-9, `a goblin 300 away moved to (${gb.x}, ${gb.y}) instead of straight away`);
  ok(Math.abs((gb.x - 300) - gb.speed/60) < 1e-6, 'a fleeing goblin does not run at its full speed');
  gb.x = 100; gb.y = 100; const before = Math.hypot(gb.x, gb.y);
  frames(30);
  ok(Math.hypot(gb.x, gb.y) > before + 20, 'a goblin close to the hunter did not get away from him');
  // further out it wanders at half speed
  gb.x = 500; gb.y = 0; gb.cd = 99; const wx0 = gb.x, wy0 = gb.y; p.x = 0; p.y = 0;
  frames(30);
  const wandered = Math.hypot(gb.x - wx0, gb.y - wy0);
  ok(wandered > 1 && wandered <= gb.speed*0.5*0.5 + 1, `a goblin 500 away moved ${wandered} in half a second, not a half-speed wander`);
  // it never touches the hunter: standing on him for two seconds does nothing
  gb.x = p.x; gb.y = p.y; gb.cd = 99; const hp0 = p.hp; seconds(2);
  ok(at('run.dmgTaken') === 0 && p.hp >= hp0 && at('telegraphs').length === 0 && at('projectiles').length === 0 && at('zones').length === 0, 'a goblin hurt the hunter or made a warning');
  // at a wall it bends along it instead of pressing into it, and never leaves the floor
  gb = live(goblins()[1]); gb.x = 850; gb.y = 0; gb.cd = 99; gb.stun = 0; p.x = 700; p.y = 0;
  let maxX = 0; for (let i = 0; i < 60; i++) { api.step(1/60); maxX = Math.max(maxX, Math.abs(gb.x)); gb.cd = 99; }
  ok(Math.abs(gb.y) > 60 && maxX <= 1800/2 - gb.size + 1e-6, `a goblin at the wall ended at (${gb.x}, ${gb.y}) instead of sliding along it`);
  // it stumbles: 0.6 s still, then runs again with a new 2.5 to 4 s timer
  p.x = 0; p.y = 0; gb = live(goblins()[2]); gb.x = 300; gb.y = 0; gb.stun = 0; gb.cd = 0.01; gb.state = 'chase';
  frames(2);
  ok(gb.state === 'stumble', 'a goblin did not stumble when its timer ran out');
  const sx = gb.x, sy = gb.y; let still = 0, newCd = null;
  for (let i = 0; i < 80 && newCd === null; i++) { api.step(1/60); if (gb.state === 'stumble') { still++; ok(gb.x === sx && gb.y === sy, 'a stumbling goblin moved'); } else newCd = gb.cd; }
  ok(still + 2 >= 35 && still + 2 <= 37, `a goblin stood still ${still + 2} frames, not 0.6 s (36)`); // the 2 frames before the loop were already in the stumble
  ok(newCd !== null && newCd >= 2.5 - 1e-9 && newCd <= 4 + 1e-9 && gb.state === 'chase', `after a stumble the timer was ${newCd}, not 2.5 to 4`);
  // within the arena all the time: eight goblins, a hunter standing still, 20 seconds
  for (const e of goblins()) live(e);
  let outside = 0; for (let i = 0; i < 20*60; i++) { api.step(1/60); for (const e of goblins()) if (Math.abs(e.x) > 900 || Math.abs(e.y) > 650) outside++; }
  ok(outside === 0, `${outside} goblin positions were outside the arena`);

  // 10. hits spill one small gold orb each, at most 5 a goblin; a catch spills 6 more worth the spill together, plus the normal kill gold
  p = hunter(); p.rift = true; at('enterRift()');
  let rift = at('dungeon.rift');
  gb = live(goblins()[0]); gb.hp = gb.maxHp = 1e9;
  const orbsOf = () => at('orbs').filter(o => o.type === 'gold');
  for (let i = 0; i < 7; i++) strike(gb, 1);
  ok(orbsOf().length === 5 && orbsOf().every(o => o.val === rift.hit), `7 hits spilled ${orbsOf().length} orbs, not 5 of ${rift.hit}`);
  at('orbs.length = 0');
  gb.hp = 10; gb.spills = 5; // the caught one: 5 spills already, so only the catch pays
  strike(gb, 1e12);
  const paid = orbsOf(), total = paid.reduce((a, o) => a + o.val, 0), killGold = Math.ceil(gb.xp*0.35*0.8);
  ok(!gb.alive && rift.caught === 1, 'a killed goblin was not counted as caught');
  ok(paid.length === 7 && !at('orbs').some(o => o.type === 'hp'), `a catch left ${paid.length} gold orbs, not 1 kill orb and 6 spill orbs (or left a health orb)`); // an item may also have dropped
  const spillOrbs = paid.slice(1);
  ok(spillOrbs.reduce((a, o) => a + o.val, 0) === rift.spill, `the 6 spill orbs are worth ${spillOrbs.reduce((a, o) => a + o.val, 0)}, not ${rift.spill}`);
  ok(paid[0].val >= killGold && total === paid[0].val + rift.spill, 'the normal kill gold is missing');
  ok(p.slain['Gilded Goblin'] === undefined && Object.keys(p.slain).length === 0, 'a goblin was added to the Hunter\'s Record');
  ok(at('remnants').length === 0 && at('highScores.totalKills') === 1 && at('run.kills') === 1 && at('run.xp') === gb.xp, 'a catch is not a plain kill, or left a shadow, or paid the wrong XP');

  // 11. a caught goblin sometimes drops an item (1 in 4), at the elite odds
  randomIs(0.1);
  p = hunter(); p.rift = true; at('enterRift()');
  gb = live(goblins()[0]); strike(gb);
  ok(at('orbs').some(o => o.type === 'gear'), 'a catch with a good roll dropped no item');
  at('orbs.length = 0');
  randomIs(0.9);
  gb = live(goblins()[1]); strike(gb);
  ok(!at('orbs').some(o => o.type === 'gear'), 'a catch with a bad roll dropped an item');
  restoreRandom();

  // 12. catching all eight ends the run at once with grade S, a final item, and no gate clear counted anywhere
  api.reseed(7);
  p = hunter(); p.rift = true; at('gameState = "HUB"; enterRift()');
  const cleared0 = JSON.stringify(p.cleared), gc0 = at('highScores.gatesCleared'), qc0 = at('questProgress.gatesCleared'), bg0 = at('highScores.bestGate'), fl0 = p.feats.flawless, titles0 = p.titles.length;
  for (const e of goblins()) live(e);
  seconds(12.2); // some time passes: the clock runs
  rift = at('dungeon.rift');
  ok(rift.t < 47.9 && rift.t > 47.7 && !rift.done, `after 12.2 s the clock reads ${rift.t}`);
  ok(els['hud-gate-name'].textContent === 'GILDED RIFT — 0:48 · 0 / 8 CAUGHT', `the HUD line after 12.2 s was "${els['hud-gate-name'].textContent}"`);
  for (let i = 0; i < 3; i++) { strike(goblins()[0]); }
  frames(2);
  ok(els['hud-gate-name'].textContent.endsWith('· 3 / 8 CAUGHT'), `the HUD line after 3 catches was "${els['hud-gate-name'].textContent}"`);
  while (goblins().length) strike(goblins()[0]);
  ok(rift.caught === 8 && !rift.done, 'eight catches did not count to eight, or ended the run before the next step');
  api.step(1/60);
  ok(rift.done && at('dungeon.state') === 'cleared', 'catching all eight did not end the run');
  ok(at('orbs').every(o => o.type === 'gear'), 'a gold orb was left on the floor at the end');
  seconds(2); // the end screen comes after a moment
  ok(at('run.grade') === 'S' && els['victory-grade'].textContent === 'S', `all eight caught gave grade ${els['victory-grade'].textContent}`);
  ok(els['victory-title'].textContent === 'RIFT CLOSED' && els['victory-overlay'].style.display === 'flex' && els['victory-share'].style.display === 'none', 'the end screen is not up, or offers a result card');
  const stats = els['victory-stats'].innerHTML;
  ok(stats.includes('Goblins Caught: <span>8 / 8</span>') && stats.includes('Time: <span>0:') && stats.includes('XP Earned: <span>') && stats.includes('Gold: <span>'), `the end stats are wrong: ${stats}`);
  ok(stats.includes('Loot: <span>') && at('run.loot').some(it => it.rarity >= 1), 'the final item (rarity 1 or better) is missing');
  ok(!stats.includes('Enemies Defeated') && !stats.includes('Damage Taken') && !stats.includes('Infinity'), 'the end stats show a line of a normal gate');
  ok(JSON.stringify(p.cleared) === cleared0 && at('highScores.gatesCleared') === gc0 && at('questProgress.gatesCleared') === qc0 && at('highScores.bestGate') === bg0 && p.feats.flawless === fl0, 'a rift run counted as a gate clear');
  ok(p.titles.length === titles0, 'a rift run earned a title for a clear');
  ok(p.gold === at('run.gold') && at('run.gold') > 0, 'the gold of the run did not reach the hunter');
  ok(at('pendingExtraction') === null, 'a rift run raised an extraction');
  at('returnToHub()');
  ok(at('gameState') === 'HUB' && at('dungeon') === null, 'the rift end screen does not return to the hub');
  ok(p.rift === false || p.rifts === 1, 'the hub changed the rift count');

  // 13. every score from 0 to 8 catches: S for 8, A for 6 or 7, B for 3 to 5, C below; a run left to time out ends at 60 seconds and the rest are gone, uncounted
  for (let n = 0; n <= 8; n++) {
    p = hunter(); p.rift = true; at('enterRift()');
    for (const e of goblins()) live(e);
    for (let i = 0; i < n; i++) strike(goblins()[0]);
    const want = n >= 8 ? 'S' : n >= 6 ? 'A' : n >= 3 ? 'B' : 'C';
    if (n < 8) {
      const steps0 = at('run.time');
      seconds(61);
      ok(at('dungeon.rift.done') === true && at('dungeon.rift.t') === 0, `n=${n}: the rift did not end when the 60 seconds ran out`);
      ok(at('run.time') - steps0 < 60.2 + 1.0, `n=${n}: the clock ran on`);
      ok(at('enemies').every(e => !e.alive) && at('dungeon.rift.caught') === n && at('run.kills') === n, `n=${n}: a goblin that ran out the clock was counted or is still there`);
    } else frames(3);
    seconds(2);
    ok(els['victory-grade'].textContent === want && at('run.grade') === want, `n=${n}: grade ${els['victory-grade'].textContent}, not ${want}`);
    const html = els['victory-stats'].innerHTML;
    ok(html.includes(`Goblins Caught: <span>${n} / 8</span>`), `n=${n}: the stats line is "${html.slice(0, 80)}"`);
    if (n < 8) ok(html.includes('Time: <span>1:00</span>'), `n=${n}: a timed-out run did not show 1:00`);
    ok(p.cleared.e_gate === undefined && at('highScores.gatesCleared') === 0, `n=${n}: counted as a gate clear`);
  }

  // 14. nothing in a rift can hurt the hunter: left alone for the whole minute, no damage and no warning shown
  p = hunter(); p.rift = true; at('enterRift()');
  for (const e of goblins()) live(e);
  seconds(61);
  ok(at('run.dmgTaken') === 0 && p.hp === p.maxHp && at('dungeon.state') === 'cleared', 'the hunter was hurt in a rift');
  seconds(2);
  ok(els['victory-grade'].textContent === 'C' && els['victory-stats'].innerHTML.includes('Goblins Caught: <span>0 / 8</span>'), 'a run with nothing caught is not grade C');

  // 15. pause and quit: the pause window counts goblins, the HUD shows the clock, quitting goes to the hub
  p = hunter(); p.rift = true; at('enterRift()');
  seconds(5.2);
  at('togglePause()');
  ok(at('paused') === true && els['pause-stats'].innerHTML.includes('Goblins Caught: 0 / 8') && !els['pause-stats'].innerHTML.includes('Infinity'), 'the pause window is wrong in a rift');
  at('togglePause()');
  at('updateHUD()');
  ok(els['hud-wave'].textContent === '0:55' && els['hud-enemies'].textContent === '', `the HUD showed "${els['hud-wave'].textContent}" / "${els['hud-enemies'].textContent}"`);
  at('returnToHub()');
  ok(at('gameState') === 'HUB' && p.rift === false && p.rifts === 1, 'quitting a rift gave the rift back or broke the hub');

  // 16. the rift does not disturb a normal gate: the same chambers, enemies and boss as before, and the end screen reads GATE CLEARED again
  p = hunter(); api.startDungeon(api.GATE_DEFS[0]);
  ok(at('layout') !== null && at('arenaW') === 1400 && at('arenaH') === 1000 && at('dungeon.rift') === undefined && at('dungeon.maxWaves') === 5, 'a normal gate changed shape');
  at('showVictory()');
  ok(els['victory-title'].textContent === 'GATE CLEARED', 'a normal victory does not say GATE CLEARED');

  // 17. save and load: the three fields round trip; an old save, or an edited one, loads clean
  p = hunter(); p.rift = true; p.rifts = 3; p.riftSeen = true;
  at('saveGame()');
  const d = JSON.parse(at('localStorage.getItem(SAVE_KEY)'));
  ok(d.rift === true && d.rifts === 3 && d.riftSeen === true, 'the save does not hold the rift fields');
  at('loadGame()');
  ok(api.player.rift === true && api.player.rifts === 3 && api.player.riftSeen === true && api.player !== p, 'the rift fields did not round trip');
  const loadWith = edit => { at(`(() => { const d = JSON.parse(localStorage.getItem(SAVE_KEY)); ${edit}; localStorage.setItem(SAVE_KEY, JSON.stringify(d)); loadGame(); })()`); return api.player; };
  let q = loadWith('delete d.rift; delete d.rifts; delete d.riftSeen');
  ok(q.rift === false && q.rifts === 0 && q.riftSeen === false, 'an old save without the fields did not load as false, 0');
  q = loadWith('d.rift = "yes"; d.rifts = -5; d.riftSeen = 1');
  ok(q.rift === false && q.rifts === 0 && q.riftSeen === false, `an edited save loaded rift ${q.rift}, rifts ${q.rifts}, seen ${q.riftSeen}`);
  q = loadWith('d.rift = true; d.rifts = 2.9; delete d.riftSeen');
  ok(q.rift === true && q.rifts === 2 && q.riftSeen === true, 'a count of 2.9 should load as 2 with the first rift counted as seen');

  // 18. the dice: after the first rift, 35 percent of clears open one (never while one is open); the first is guaranteed once only
  p = hunter(); p.rifts = 1; p.riftSeen = true;
  api.startDungeon(api.GATE_DEFS[0]);
  let opened = 0; const N = 1000;
  for (let i = 0; i < N; i++) { p.rift = false; at('clearGate(makeEnemy(GATE_DEFS[0].boss, 0, 0, { boss:true }))'); if (p.rift) opened++; }
  ok(opened/N > 0.30 && opened/N < 0.40, `${opened} of ${N} clears opened a rift, not about 35%`);
  p = hunter(); p.rifts = 0; p.riftSeen = true; p.rift = false; randomIs(0.99); clearOnce();
  ok(p.rift === false, 'the guaranteed first rift came again after it had been seen');
  restoreRandom();

  // 19. a hunter on foot can catch them: a plain chase-and-slash bot, level 1, 60 seconds
  api.reseed(11);
  p = hunter(); p.rift = true; at('enterRift()');
  const J = api.touchJoystick;
  for (let i = 0; i < 61*60 && !at('dungeon.rift.done'); i++) {
    let near = null, nd = Infinity;
    for (const e of goblins()) { if (!e.alive) continue; const dd = Math.hypot(e.x - p.x, e.y - p.y); if (dd < nd) { near = e; nd = dd; } }
    if (near) { J.active = true; J.dx = (near.x - p.x)/nd; J.dy = (near.y - p.y)/nd; if (nd < 110) api.useSkill(api.SKILL.slash); if (nd > 140 && nd < 190) api.useSkill(api.SKILL.dash_strike); }
    api.step(1/60);
  }
  J.active = false; J.dx = J.dy = 0;
  const caught = at('dungeon.rift.caught');
  ok(caught >= 2, `a level 1 hunter chasing on foot caught only ${caught}`);
  console.log(`(a plain chase-and-slash bot at level 1 caught ${caught} of 8)`);

  console.log('PASS ' + checked);
} catch (err) {
  console.error('FAIL');
  console.error(err.stack);
  process.exit(1);
}
