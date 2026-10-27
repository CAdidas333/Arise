'use strict';

// Checks the System reward box rules in js/01-data.js and the open/fade behaviour in the live game.
// Run: node tools/test_boxes.js   (prints PASS <number of cases checked>)

const vm = require('vm');
const { createGame } = require('./lib/headless.js');

const fail = msg => { throw new Error(msg); };

try {
  const { ctx, api } = createGame();
  api.reseed(20261027); // the game's own seeded RNG, so every run checks the same gates
  const at = expr => vm.runInContext(expr, ctx);
  const CHANCE = at('BOX_CHANCE');
  let checked = 0;

  // 1. boxDue: room 0 never pays, a low roll always does, the last chamber guarantees one, one decision per chamber
  for (let nFight = 3; nFight <= 8; nFight++) {
    for (let given = 0; given <= nFight; given++) {
      for (let i = 0; i <= 20; i++) {
        const roll = i / 20;
        if (at(`boxDue(0, ${nFight}, ${given}, ${roll})`)) fail(`room 0 gave a box (nFight ${nFight}, given ${given}, roll ${roll})`);
        checked++;
      }
    }
    for (let room = 1; room <= nFight; room++) {
      for (let given = 0; given <= nFight; given++) {
        if (!at(`boxDue(${room}, ${nFight}, ${given}, ${CHANCE/2})`)) fail(`no box under the chance (room ${room}, nFight ${nFight}, given ${given})`);
        if ((room !== nFight || given > 0) && at(`boxDue(${room}, ${nFight}, ${given}, ${CHANCE})`)) fail(`box at the chance (room ${room}, nFight ${nFight}, given ${given})`);
        if ((room !== nFight || given > 0) && at(`boxDue(${room}, ${nFight}, ${given}, 0.99)`)) fail(`box on a high roll (room ${room}, nFight ${nFight}, given ${given})`);
        checked += 3;
      }
    }
    for (let i = 0; i <= 20; i++) {
      const roll = i / 20;
      if (!at(`boxDue(${nFight}, ${nFight}, 0, ${roll})`)) fail(`the last chamber gave nothing (nFight ${nFight}, roll ${roll})`);
      checked++;
    }
    for (let trial = 0; trial < 50; trial++) {
      let given = 0;
      for (let room = 1; room <= nFight; room++) {
        const before = given;
        if (at(`boxDue(${room}, ${nFight}, ${given}, Math.random())`)) given++;
        if (given - before > 1) fail(`more than one box from one chamber (room ${room}, nFight ${nFight})`);
        checked++;
      }
    }
  }

  // 2. A box at the hunter's feet opens on the next step and pays at least 20 gold
  const p = api.createPlayer('BoxBot');
  api.player = p;
  api.startDungeon(api.GATE_DEFS[0]);
  if (at('gameState') !== 'DUNGEON') fail('the E gate did not start');
  const gold0 = p.gold;
  at(`rewardBoxes.length = 0; rewardBoxes.push({ x: player.x, y: player.y, t: BOX_RISE, open: -1 });`);
  api.step(1/60);
  if (!(at('rewardBoxes[0] && rewardBoxes[0].open >= 0'))) fail('the box did not open');
  if (p.gold - gold0 < 20) fail(`the box paid ${p.gold - gold0} gold, under 20`);
  checked += 2;
  for (let i = 0; i < 48; i++) api.step(1/60); // 0.8 s more
  if (at('rewardBoxes.length') !== 0) fail('the open box did not fade away');
  checked++;

  // 3. Three hundred gates: every one gives a box, and the average stays between one and three
  let total = 0;
  for (let g = 0; g < 300; g++) {
    const gate = api.GATE_DEFS[g % api.GATE_DEFS.length];
    const nFight = gate.waves - 1;
    let given = 0;
    for (let room = 1; room <= nFight; room++) if (at(`boxDue(${room}, ${nFight}, ${given}, Math.random())`)) given++;
    if (given < 1) fail(`gate ${gate.id} gave no box`);
    total += given;
    checked++;
  }
  const average = total / 300;
  if (!(average >= 1 && average <= 3)) fail(`the average box count is ${average}, outside 1..3`);
  checked++;

  console.log('PASS ' + checked);
} catch (err) {
  console.error('FAIL');
  console.error(err.stack);
  process.exit(1);
}
