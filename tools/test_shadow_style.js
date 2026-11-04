'use strict';

// Checks shadow style touches: smoke trails when moving, standing shadows leave none,
// particle cap at 700, combat damage unchanged, and trailT omitted from saveGame.
// Run: node tools/test_shadow_style.js   (prints PASS <number of cases checked>)

const vm = require('vm');
const { createGame } = require('./lib/headless.js');

const fail = msg => { throw new Error(msg); };

try {
  let checked = 0;

  // 1. Moving shadows leave a thin trail of dark violet smoke particles (within upper bound)
  {
    const { ctx, api } = createGame();
    api.reseed(1001);
    const at = expr => vm.runInContext(expr, ctx);

    const p = api.createPlayer('StyleBot');
    api.player = p;
    api.resetWorld();
    api.startDungeon(api.GATE_DEFS[0], true);

    p.shadows = [
      { name:'Soldier', nick:'Alpha', kind:'melee', damage:10, level:1, color:'#8844ff', size:14, grade:'Soldier', x:0, y:0, active:true, attackCd:0, animT:0, facing:{ x:1, y:0 }, riseT:0 },
      { name:'Archer', nick:'Beta', kind:'ranged', damage:10, level:1, color:'#8844ff', size:14, grade:'Soldier', x:0, y:0, active:true, attackCd:0, animT:0, facing:{ x:1, y:0 }, riseT:0 },
      { name:'Charger', nick:'Gamma', kind:'charger', damage:10, level:1, color:'#8844ff', size:14, grade:'Soldier', x:0, y:0, active:true, attackCd:0, animT:0, facing:{ x:1, y:0 }, riseT:0 },
    ];

    at('enemies = [makeEnemy(GATE_DEFS[0].enemies[0], 600, 0), makeEnemy(GATE_DEFS[0].enemies[0], 600, 50)]');
    at('enemies.forEach(e => { e.spawnT = 0; })');
    at('particles = []');

    const dt = 1 / 60;
    for (let i = 0; i < 120; i++) {
      at('gameTime += 1/60; lastPlayerAttackTime = gameTime; lastMoveTime = gameTime; updateShadows(1/60);');
    }

    const smoke = at('particles.filter(p => p.type === "smoke")');
    const maxSmoke = 3 * Math.ceil(2 / 0.14) + 3;
    if (smoke.length === 0) fail('no smoke particles added while shadows were moving');
    checked++;
    if (smoke.length > maxSmoke) fail(`smoke count ${smoke.length} exceeded cap ${maxSmoke}`);
    checked++;
    if (smoke[0].color !== '#1a0a2e') fail(`expected normal smoke color #1a0a2e, got ${smoke[0].color}`);
    checked++;
    if (smoke[0].alpha !== 0.35 || smoke[0].drag !== 1) fail('unexpected smoke particle options');
    checked++;
  }

  // 2. Standing shadows with no live enemies leave no smoke particles
  {
    const { ctx, api } = createGame();
    api.reseed(1002);
    const at = expr => vm.runInContext(expr, ctx);

    const p = api.createPlayer('StyleBot');
    api.player = p;
    api.resetWorld();
    api.startDungeon(api.GATE_DEFS[0], true);

    p.shadows = [
      { name:'Soldier', nick:'Alpha', kind:'melee', damage:10, level:1, color:'#8844ff', size:14, grade:'Soldier', x:0, y:0, active:true, attackCd:0, animT:0, facing:{ x:1, y:0 }, riseT:0 },
      { name:'Archer', nick:'Beta', kind:'ranged', damage:10, level:1, color:'#8844ff', size:14, grade:'Soldier', x:0, y:0, active:true, attackCd:0, animT:0, facing:{ x:1, y:0 }, riseT:0 },
      { name:'Charger', nick:'Gamma', kind:'charger', damage:10, level:1, color:'#8844ff', size:14, grade:'Soldier', x:0, y:0, active:true, attackCd:0, animT:0, facing:{ x:1, y:0 }, riseT:0 },
    ];

    at('enemies = []');
    // Allow shadows to settle in formation behind the stationary player
    for (let i = 0; i < 60; i++) at('updateShadows(1/60)');

    at('particles = []');
    for (let i = 0; i < 120; i++) {
      at('gameTime += 1/60; lastPlayerAttackTime = gameTime; lastMoveTime = gameTime; updateShadows(1/60);');
    }

    const smoke = at('particles.filter(p => p.type === "smoke")');
    if (smoke.length !== 0) fail(`standing shadows spawned ${smoke.length} smoke particles, want 0`);
    checked++;
  }

  // 3. With particles holding 700 entries: stepping adds none
  {
    const { ctx, api } = createGame();
    api.reseed(1003);
    const at = expr => vm.runInContext(expr, ctx);

    const p = api.createPlayer('StyleBot');
    api.player = p;
    api.resetWorld();
    api.startDungeon(api.GATE_DEFS[0], true);

    p.shadows = [
      { name:'Soldier', nick:'Alpha', kind:'melee', damage:10, level:1, color:'#8844ff', size:14, grade:'Soldier', x:0, y:0, active:true, attackCd:0, animT:0, facing:{ x:1, y:0 }, riseT:0 },
      { name:'Archer', nick:'Beta', kind:'ranged', damage:10, level:1, color:'#8844ff', size:14, grade:'Soldier', x:0, y:0, active:true, attackCd:0, animT:0, facing:{ x:1, y:0 }, riseT:0 },
      { name:'Charger', nick:'Gamma', kind:'charger', damage:10, level:1, color:'#8844ff', size:14, grade:'Soldier', x:0, y:0, active:true, attackCd:0, animT:0, facing:{ x:1, y:0 }, riseT:0 },
    ];

    at('enemies = [makeEnemy(GATE_DEFS[0].enemies[0], 600, 0), makeEnemy(GATE_DEFS[0].enemies[0], 600, 50)]');
    at('enemies.forEach(e => { e.spawnT = 0; })');
    at('particles = []');
    for (let i = 0; i < 700; i++) at('particles.push({ type: "dummy" })');

    for (let i = 0; i < 120; i++) {
      at('gameTime += 1/60; lastPlayerAttackTime = gameTime; lastMoveTime = gameTime; updateShadows(1/60);');
    }

    const smoke = at('particles.filter(p => p.type === "smoke")');
    if (smoke.length !== 0) fail(`cap at 700 was exceeded; spawned ${smoke.length} smoke particles`);
    checked++;
  }

  // 4. Damage unchanged over 300 steps between normal run and spawnParticle no-op
  {
    const runCombatSim = (noopSpawn) => {
      const { ctx, api } = createGame();
      api.reseed(20261104);
      const at = expr => vm.runInContext(expr, ctx);

      const p = api.createPlayer('DamageBot');
      api.player = p;
      api.resetWorld();
      api.startDungeon(api.GATE_DEFS[0], true);

      p.shadows = [
        { name:'Soldier', nick:'Alpha', kind:'melee', damage:10, level:1, color:'#8844ff', size:14, grade:'Soldier', x:0, y:0, active:true, attackCd:0, animT:0, facing:{ x:1, y:0 }, riseT:0 },
        { name:'Archer', nick:'Beta', kind:'ranged', damage:10, level:1, color:'#8844ff', size:14, grade:'Soldier', x:0, y:0, active:true, attackCd:0, animT:0, facing:{ x:1, y:0 }, riseT:0 },
        { name:'Charger', nick:'Gamma', kind:'charger', damage:10, level:1, color:'#8844ff', size:14, grade:'Soldier', x:0, y:0, active:true, attackCd:0, animT:0, facing:{ x:1, y:0 }, riseT:0 },
      ];

      at('enemies = [makeEnemy(GATE_DEFS[0].enemies[0], 600, 0), makeEnemy(GATE_DEFS[0].enemies[0], 600, 50)]');
      at('enemies.forEach(e => { e.spawnT = 0; e.hp = 100000; e.maxHp = 100000; })');
      at('particles = []');

      if (noopSpawn) {
        at('spawnParticle = () => {}');
      }

      for (let i = 0; i < 300; i++) {
        at('gameTime += 1/60; lastPlayerAttackTime = gameTime; lastMoveTime = gameTime; updateShadows(1/60);');
      }

      return at('enemies.reduce((acc, e) => acc + (100000 - e.hp), 0)');
    };

    const normalLost = runCombatSim(false);
    const noopLost = runCombatSim(true);
    if (normalLost <= 0) fail('no damage dealt during 300 steps of combat');
    checked++;
    if (normalLost !== noopLost) fail(`damage mismatch: normal dealt ${normalLost}, no-op dealt ${noopLost}`);
    checked++;
  }

  // 5. Berserk mode emits brighter smoke (#3a0f55) and at higher frequency (0.08s vs 0.14s)
  {
    const { ctx, api } = createGame();
    api.reseed(1005);
    const at = expr => vm.runInContext(expr, ctx);

    const p = api.createPlayer('StyleBot');
    api.player = p;
    api.resetWorld();
    api.startDungeon(api.GATE_DEFS[0], true);

    p.shadows = [
      { name:'Soldier', nick:'Alpha', kind:'melee', damage:10, level:1, color:'#8844ff', size:14, grade:'Soldier', x:0, y:0, active:true, attackCd:0, animT:0, facing:{ x:1, y:0 }, riseT:0 },
      { name:'Archer', nick:'Beta', kind:'ranged', damage:10, level:1, color:'#8844ff', size:14, grade:'Soldier', x:0, y:0, active:true, attackCd:0, animT:0, facing:{ x:1, y:0 }, riseT:0 },
      { name:'Charger', nick:'Gamma', kind:'charger', damage:10, level:1, color:'#8844ff', size:14, grade:'Soldier', x:0, y:0, active:true, attackCd:0, animT:0, facing:{ x:1, y:0 }, riseT:0 },
    ];

    at('enemies = [makeEnemy(GATE_DEFS[0].enemies[0], 600, 0), makeEnemy(GATE_DEFS[0].enemies[0], 600, 50)]');
    at('enemies.forEach(e => { e.spawnT = 0; })');
    at('particles = []');
    at('legionTimer = 10');

    for (let i = 0; i < 120; i++) {
      at('gameTime += 1/60; lastPlayerAttackTime = gameTime; lastMoveTime = gameTime; updateShadows(1/60);');
    }

    const smoke = at('particles.filter(p => p.type === "smoke")');
    if (smoke.length === 0) fail('no berserk smoke spawned');
    checked++;
    if (smoke[0].color !== '#3a0f55') fail(`expected berserk smoke color #3a0f55, got ${smoke[0].color}`);
    checked++;
    // Berserk spawns at 0.08 interval (120 * 1/60 = 2s, 2 / 0.08 = 25 per shadow), noticeably more than normal
    if (smoke.length < 40) fail(`expected >= 40 berserk smoke particles, got ${smoke.length}`);
    checked++;
  }

  // 6. trailT is never written to saved game storage
  {
    const { ctx, api } = createGame();
    const at = expr => vm.runInContext(expr, ctx);

    const p = api.createPlayer('SaveBot');
    api.player = p;
    p.shadows = [
      { name:'Soldier', nick:'Alpha', kind:'melee', damage:10, level:1, color:'#8844ff', size:14, grade:'Soldier', trailT: 0.12 },
      { name:'Archer', nick:'Beta', kind:'ranged', damage:10, level:1, color:'#8844ff', size:14, grade:'Soldier', trailT: 0.05 },
    ];

    at('saveGame()');
    const raw = at('localStorage.getItem(SAVE_KEY)');
    if (raw.includes('trailT')) fail('raw JSON save string contains trailT');
    checked++;

    const saved = JSON.parse(raw);
    if (!saved.shadows || saved.shadows.length !== 2) fail('shadows missing from saved game');
    checked++;
    if (saved.shadows.some(s => 'trailT' in s)) fail('trailT was saved on a shadow object');
    checked++;

    at('loadGame()');
    const loaded = api.player.shadows;
    if (loaded.some(s => 'trailT' in s)) fail('loaded shadows contained trailT');
    checked++;
  }

  console.log('PASS ' + checked);
} catch (err) {
  console.error('FAIL');
  console.error(err.stack);
  process.exit(1);
}
