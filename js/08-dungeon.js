'use strict';

// ================================================================
//  DUNGEON FLOW — waves, boons, boss hunt, extraction
// ================================================================
const baseZoom = () => clamp(Math.min(W, H*1.5)/820, 0.62, 1.05);
const isBossWave = () => dungeon.endless ? dungeon.wave % 5 === 0 : dungeon.wave === dungeon.maxWaves;
const show = (id, mode = 'block') => { $(id).style.display = mode; };
const hide = id => { $(id).style.display = 'none'; };
const endlessGate = floor => GATE_DEFS[Math.min(GATE_DEFS.length-1, Math.floor((floor-1)/5))];

function startDungeon(gateDef, endless = false) {
  arenaW = 1400; arenaH = 1000; // reset to normal, expands for boss
  layout = endless ? null : genLayout(gateDef.waves - 1); // rooms and corridors; the open arena stays for endless mode and boss fights
  enemies = []; projectiles = []; telegraphs = []; orbs = []; remnants = []; spawnQueue = []; timers = [];
  particles = []; texts = []; rings = []; arcs = []; ghosts = []; bolts = [];
  run = { boons:{}, gold:0, kills:0, xp:0, bestCombo:0, time:0, dmgTaken:0, loot:[] };
  dungeon = { gate:endless ? endlessGate(1) : gateDef, wave:1, maxWaves:endless ? Infinity : gateDef.waves, state:'fight', wait:0, bossRef:null, endless, scale:1, introT:0, alive:0, picks:[] };
  Object.assign(player, { x:0, y:0, hp:player.maxHp, mp:player.maxMp, cds:{}, ult:0, ultT:0, inv:0, combo:0, comboWin:0, dodgeCd:0, dodgeT:0, atkT:0, perfect:false, hitFlash:0 });
  comboCount = 0; comboTimer = 0; legionTimer = 0; lastPlayerAttackTime = -99; lastMoveTime = gameTime; lastMovePos = { x:0, y:0 };
  camera.x = 0; camera.y = 0; camera.focus = null; camera.zoom = baseZoom()*1.3; camera.targetZoom = baseZoom();
  timeScale = 1; slowT = 0; hitStop = 0; paused = false;
  player.shadows.forEach(s => { s.active = false; }); deployShadows();
  buildFloor(dungeon.gate);
  gameState = 'DUNGEON';
  hide('system-menu'); show('hud'); hide('boss-bar-wrap');
  $('hud-gate-name').textContent = endless ? 'DEMON CASTLE — ENDLESS' : `${gateDef.rank}-RANK: ${gateDef.name.toUpperCase()}`;
  toast(endless ? 'ENTERING THE DEMON CASTLE' : `ENTERING ${gateDef.rank}-RANK GATE: ${gateDef.name.toUpperCase()}`, 'blue', 2000); say('gate_enter');
  initAudio(); setMusic('battle'); renderBoons(); buildSkillBar();
  if (!layout) spawnWave(); // with a layout, wave 1 starts when the hunter walks into the first chamber (roomStep)
}

function spawnWave() {
  const w = dungeon.wave;
  enemies = enemies.filter(e => e.alive);
  dungeon.scale = dungeon.endless ? 1 + 0.08*((w-1) % 5) + 0.02*(w-1) : 1 + (w-1)*0.12; // tougher every wave
  if (isBossWave()) { startBoss(); return; }
  const lw = dungeon.endless ? ((w-1) % 5) + 3 : w;
  const count = dungeon.endless ? Math.min(26, 7 + Math.floor(w*0.9)) : 4 + w*2 + Math.floor(w/3);
  const pool = dungeon.gate.enemies.filter(d => d.w <= lw);
  for (let i = 0; i < count; i++) {
    const a = rand(0, TAU), r = rand(300, 520);
    const elite = lw >= 3 && Math.random() < Math.min(0.14, 0.04 + 0.012*w);
    const pt = layout ? pointInRoom(layout.lock, player.x, player.y, 280) : { x:player.x + Math.cos(a)*r, y:player.y + Math.sin(a)*r };
    spawnQueue.push({ t:0.3 + i*0.07, def:pick(pool), x:pt.x, y:pt.y, o:{ scale:dungeon.scale, elite } });
  }
  toast(dungeon.endless ? `FLOOR ${w}` : layout ? `CHAMBER ${w} OF ${dungeon.maxWaves-1}` : `WAVE ${w}`, 'blue', 1500);
}

function checkWave() {
  dungeon.alive = enemies.reduce((n, e) => n + (e.alive ? 1 : 0), 0) + spawnQueue.length;
  if (dungeon.alive > 0 || dungeon.bossRef) return; // boss waves resolve through onBossDeath
  nextWave();
}
function nextWave() {
  if (layout) { layout.cleared = dungeon.wave; layout.lock = -1; } // the chamber is clear: its doors open
  dungeon.wave++;
  if (dungeon.endless) {
    highScores.bestFloor = Math.max(highScores.bestFloor, dungeon.wave-1);
    const g = endlessGate(dungeon.wave);
    if (g !== dungeon.gate) { dungeon.gate = g; buildFloor(g); toast(`THE CASTLE SHIFTS — ${g.name.toUpperCase()}`, 'purple', 2500); say('castle_shifts', true); }
  }
  // A System reward every second wave, and always right before the boss
  if ((dungeon.wave-1) % 2 === 0 || isBossWave()) showBoons(); else { dungeon.wait = 1.2; say('wave_clear'); }
  if (layout && isBossWave()) toast('THE WAY TO THE BOSS IS OPEN', 'red', 2600);
}

// Between chambers nothing spawns. When the hunter walks into the next chamber its doors shut and the wave starts.
function roomStep() {
  if (isBossWave()) { if (dist(player.x, player.y, layout.exit.x, layout.exit.y) < 70) enterBossArena(); return; }
  if (roomAt(player.x, player.y, 70) !== dungeon.wave) return;
  layout.lock = dungeon.wave; dungeon.wait = 0;
  shake(6); playSfx('deny');
  spawnWave();
}
// The way out of the last chamber leads to the open arena, where the boss hunt runs as it always has
function enterBossArena() {
  layout = null; dungeon.wait = 0;
  remnants = []; projectiles = []; telegraphs = [];
  player.x = 0; player.y = 0; camera.x = 0; camera.y = 0; lastMovePos = { x:0, y:0 }; lastMoveTime = gameTime;
  player.shadows.forEach(s => { if (s.active) { s.x = rand(-50, 50); s.y = rand(20, 70); } });
  flash('#ffffff', 0.5); playSfx('tele');
  spawnWave(); // this is the boss wave, so it goes straight to startBoss()
}

function startBoss() {
  const g = dungeon.gate;
  arenaW = 3000; arenaH = 2200; // expand arena for the boss hunt
  // Boss spawns far away — player must hunt it down
  const a = rand(0, TAU), r = rand(1000, 1300), cl = (v, lim) => clamp(v, -lim/2+90, lim/2-90);
  let bx = cl(player.x + Math.cos(a)*r, arenaW), by = cl(player.y + Math.sin(a)*r, arenaH);
  if (dist(bx, by, player.x, player.y) < 700) { bx = cl(player.x - Math.cos(a)*r, arenaW); by = cl(player.y - Math.sin(a)*r, arenaH); }
  const b = makeEnemy(g.boss, bx, by, { boss:true, scale:dungeon.endless ? 1 + 0.03*dungeon.wave : 1 });
  enemies.push(b); dungeon.bossRef = b;
  dungeon.state = 'intro'; dungeon.introT = 3.2;
  camera.focus = b; camera.targetZoom = baseZoom()*1.15;
  $('cine-name').textContent = b.name.toUpperCase(); $('cine-title').textContent = b.title;
  show('cine'); projectiles = []; telegraphs = []; mouse.down = false; touchAttack = false;
  playSfx('boss'); setMusic('boss'); shake(12);
}
function updateIntro(dt) {
  dungeon.introT -= dt;
  if (dungeon.introT < 1.0) { camera.focus = null; camera.targetZoom = baseZoom(); }
  if (dungeon.introT <= 0) {
    dungeon.state = 'fight'; hide('cine'); show('boss-bar-wrap');
    $('boss-bar-name').textContent = dungeon.bossRef.name; $('boss-bar-title').textContent = dungeon.bossRef.title;
    toast('⚠ BOSS DETECTED — HUNT IT DOWN ⚠', 'red', 3000, true); say('boss_detected', true);
  }
}

function onBossDeath(b) {
  dungeon.bossRef = null; dungeon.state = 'dying'; say('boss_defeated', true, 0.6);
  hide('boss-bar-wrap');
  enemies.forEach(e => { if (e.alive) { e.alive = false; spawnBurst(e.x, e.y, e.color, 10, 260); } });
  spawnQueue = []; projectiles = []; telegraphs = [];
  slowmo(0.18, 1.7); shake(28); flash('#ffffff', 0.7); hitstop(0.12); playSfx('explode');
  camera.focus = { x:b.x, y:b.y }; camera.targetZoom = baseZoom()*1.3;
  for (let i = 1; i <= 5; i++) after(0.28*i, () => { const x = b.x+rand(-50,50), y = b.y+rand(-50,50); spawnBurst(x, y, b.color, 30, 620); ring(x, y, '#ffffff', 10, 160, 0.4, 6); shake(12); playSfx('explode'); }, true);
  after(2.3, () => { camera.targetZoom = baseZoom(); if (dungeon.endless) endlessBossCleared(); else clearGate(b); }, true);
}

function endlessBossCleared() {
  camera.focus = null; arenaW = 1400; arenaH = 1000;
  movePlayerTo(player.x, player.y);
  dungeon.state = 'fight'; setMusic('battle');
  toast(`FLOOR ${dungeon.wave} CONQUERED`, 'gold', 2500, true); say('floor_cleared'); playSfx('victory');
  healPlayer(player.maxHp*0.3);
  nextWave();
}

function clearGate(b) {
  const g = dungeon.gate;
  dungeon.state = 'cleared';
  questProgress.gatesCleared++; highScores.gatesCleared++;
  player.cleared[g.id] = (player.cleared[g.id] || 0) + 1;
  if (RANKS.indexOf(g.rank) > RANKS.indexOf(highScores.bestGate)) highScores.bestGate = g.rank;
  setMusic('off'); playSfx('victory');
  if (g.boss.shadow) { pendingExtraction = { def:g.boss, x:b.x, y:b.y }; extractTries = 3; showExtraction(); }
  else { camera.focus = null; showVictory(); }
}

// --- "ARISE." Three attempts, like the System allows ---
// The first shadow never refuses the call — nobody should miss the signature moment
const extractChance = () => player.shadows.length ? clamp(0.62 + (player.level - dungeon.gate.reqLevel)*0.015 + player.stats.INT*0.003, 0.45, 0.95) : 1;
function updateExtractInfo() { $('extract-info').textContent = `SUCCESS ${Math.round(extractChance()*100)}%  ·  ${extractTries} ATTEMPT${extractTries === 1 ? '' : 'S'} REMAIN`; }
function showExtraction() {
  extractBusy = false; say('extract_prompt', false, 0.3);
  $('extract-name').textContent = pendingExtraction.def.name;
  updateExtractInfo(); show('extraction-overlay', 'flex');
  camera.focus = { x:pendingExtraction.x, y:pendingExtraction.y }; camera.targetZoom = baseZoom()*1.4;
}
let extractBusy = false;
function doExtract() {
  if (!pendingExtraction || extractBusy) return;
  const p = pendingExtraction;
  extractBusy = true; extractTries--; updateExtractInfo();
  arisePillar(p.x, p.y, true); shake(6);
  // The System announces the attempt, then the wait: the result word lands with the result on screen
  playClip('s_extract_charge', 0.5); say('extract_start', true);
  after(clips.v_extract_start ? 2.0 : 0.05, () => {
    extractBusy = false;
    if (pendingExtraction !== p) return;
    shake(10);
    if (Math.random() < extractChance()) {
      if (!playClip('s_extract_success', 0.7)) playSfx('extract');
      say('extract_success', true, 0.1); flash('#8844ff', 0.6);
      addShadow({ name:p.def.name, kind:'boss', damage:Math.floor(p.def.damage*0.4), level:player.level, color:p.def.color, size:Math.min(p.def.size*0.4, 18), grade:'Marshal', x:p.x, y:p.y });
      toast(`SHADOW EXTRACTED: ${p.def.name}`, 'purple', 3000);
      // second beat, timed to the second hit in the sound
      after(1.1, () => { arisePillar(p.x, p.y, true); ring(p.x, p.y, '#ffffff', 20, 420, 0.7, 10); flash('#bb66ff', 0.55); shake(18); }, true);
      endExtraction(2600);
    } else {
      if (!playClip('s_extract_fail', 0.8)) playSfx('fail');
      say('extract_fail', true, 0.1); flash('#330000', 0.3);
      if (extractTries <= 0) { toast('EXTRACTION FAILED — THE SHADOW IS LOST', 'red', 2500); say('extract_lost', false, 1.3); endExtraction(900); }
      else { toast('EXTRACTION FAILED', 'red', 1500); updateExtractInfo(); }
    }
  }, true);
}
function endExtraction(delay) {
  pendingExtraction = null; hide('extraction-overlay');
  setTimeout(() => { if (gameState === 'DUNGEON' && dungeon && dungeon.state === 'cleared') { camera.focus = null; camera.targetZoom = baseZoom(); showVictory(); } }, delay);
}

function showVictory() {
  say('gate_cleared');
  const g = dungeon.gate, par = g.waves*26;
  storyVictoryLine(g);
  const score = 100 - Math.min(60, run.dmgTaken/player.maxHp*30) - Math.min(30, Math.max(0, (run.time-par)/par*30));
  const grade = score >= 90 ? 'S' : score >= 75 ? 'A' : score >= 55 ? 'B' : 'C';
  const bonus = Math.floor(g.boss.xp*0.5*{ S:2, A:1.5, B:1.2, C:1 }[grade]);
  run.grade = grade; run.bonus = bonus; if (typeof armResultCard === 'function') armResultCard('victory'); // for the result card
  player.gold += bonus;
  const ge = $('victory-grade'); ge.textContent = grade; ge.style.color = { S:'#bb66ff', A:'#ffcc00', B:'#00d4ff', C:'#8899aa' }[grade];
  const mm = Math.floor(run.time/60), ss = String(Math.floor(run.time%60)).padStart(2, '0');
  sweepGear(); // loot still on the floor is picked up before the count
  const loot = run.loot, best = loot.reduce((m, it) => Math.max(m, it.rarity), 0);
  $('victory-stats').innerHTML = `
    <div>Enemies Defeated: <span>${run.kills}</span> &nbsp; Best Combo: <span>${run.bestCombo}x</span></div>
    <div>Time: <span>${mm}:${ss}</span> &nbsp; Damage Taken: <span>${fmtNum(run.dmgTaken)}</span></div>
    <div>XP Earned: <span>${fmtNum(run.xp)}</span> &nbsp; Gold: <span>${fmtNum(run.gold)} + ${fmtNum(bonus)}</span></div>
    <div>Level: <span>${player.level}</span> &nbsp; Rank: <span>${player.rank}</span></div>
    ${loot.length ? `<div>Loot: <span>${loot.length} item${loot.length > 1 ? 's' : ''}</span> &nbsp; Best: <span style="color:${GEAR_COLORS[best]}">${GEAR_RARITY[best]}</span></div>` : ''}`;
  show('victory-overlay', 'flex'); saveGame();
}

function showDeath() {
  dungeon.state = 'dead'; hide('cine'); hide('boss-bar-wrap');
  setMusic('off'); playSfx('death'); say('death', true, 0.8); slowmo(0.25, 1.2); flash('#ff0000', 0.4); shake(20);
  spawnBurst(player.x, player.y-12, COLORS.primary, 40, 420); smoke(player.x, player.y, '#000', 10, 20);
  if (dungeon.endless) highScores.bestFloor = Math.max(highScores.bestFloor, dungeon.wave-1);
  $('death-stats').innerHTML = dungeon.endless
    ? `Reached floor ${dungeon.wave} &nbsp;·&nbsp; ${run.kills} kills &nbsp;·&nbsp; best floor ${highScores.bestFloor}`
    : `Fell on wave ${dungeon.wave} of ${dungeon.maxWaves} &nbsp;·&nbsp; ${run.kills} kills`;
  if (typeof armResultCard === 'function') armResultCard('death'); // shows SAVE RESULT CARD in endless mode
  after(1.1, () => show('death-overlay', 'flex'), true);
  saveGame();
}

function returnToHub() {
  gameState = 'HUB'; paused = false; timeScale = 1; slowT = 0; hitStop = 0;
  ['hud','victory-overlay','death-overlay','extraction-overlay','boon-overlay','pause-overlay','cine'].forEach(hide);
  show('system-menu');
  enemies = []; projectiles = []; telegraphs = []; orbs = []; remnants = []; spawnQueue = []; timers = [];
  dungeon = null; run = null; layout = null; legionTimer = 0; pendingExtraction = null; camera.focus = null; mouse.down = false; touchAttack = false;
  player.hp = player.maxHp; player.mp = player.maxMp;
  player.shadows.forEach(s => { s.active = false; });
  if (AC && AC.state !== 'running') AC.resume();
  setMusic('hub'); renderSystemMenu(); saveGame();
}

// --- BOONS ---
function showBoons() {
  dungeon.state = 'boon';
  const pool = BOONS.filter(b => b.instant ? player.hp < player.maxHp*0.8 : (run.boons[b.id] || 0) < b.max), picks = [];
  while (picks.length < 3 && pool.length) picks.push(pool.splice(randInt(0, pool.length-1), 1)[0]);
  dungeon.picks = picks;
  $('boon-cards').innerHTML = picks.map((b, i) => `<div class="boon-card" data-boon="${i}"><div class="b-ico">${b.icon}</div><div class="b-name">${b.name}</div><div class="b-desc">${b.desc}</div><div class="b-key">${run.boons[b.id] ? `OWNED ×${run.boons[b.id]} · ` : ''}[ ${i+1} ]</div></div>`).join('');
  show('boon-overlay', 'flex'); playSfx('boon'); say('reward'); mouse.down = false; touchAttack = false;
}
function chooseBoon(i) {
  if (!dungeon || dungeon.state !== 'boon') return;
  const b = dungeon.picks[i]; if (!b) return;
  if (b.instant) healPlayer(player.maxHp*0.5); else run.boons[b.id] = (run.boons[b.id] || 0) + 1;
  hide('boon-overlay'); dungeon.state = 'fight'; dungeon.wait = 0.9;
  playSfx('buy'); toast(`${b.icon} ${b.name.toUpperCase()}`, 'blue', 1600); renderBoons();
  ring(player.x, player.y, COLORS.primary, 10, 140, 0.4, 4);
}
function renderBoons() {
  $('hud-boons').innerHTML = Object.entries(run.boons).map(([id, n]) => { const b = BOONS.find(x => x.id === id); return `<div class="boon-chip" title="${b.name}">${b.icon}<b>${n > 1 ? '×'+n : ''}</b></div>`; }).join('');
}

function togglePause() {
  if (gameState !== 'DUNGEON' || !dungeon) return;
  if (!paused && dungeon.state !== 'fight') return;
  paused = !paused; mouse.down = false; touchAttack = false;
  if (paused) {
    $('pause-stats').innerHTML = `
      <div>Level: ${player.level} &nbsp; Rank: ${player.rank}</div>
      <div>${dungeon.endless ? `Floor: ${dungeon.wave}` : `Wave: ${dungeon.wave} / ${dungeon.maxWaves}`}</div>
      <div>Kills: ${run.kills} &nbsp; XP: ${fmtNum(run.xp)} &nbsp; Gold: ${fmtNum(run.gold)}</div>`;
    show('pause-overlay', 'flex'); if (AC) AC.suspend();
  } else { hide('pause-overlay'); if (AC) AC.resume(); }
}
