'use strict';

// ================================================================
//  PLAYER
// ================================================================
function createPlayer(name) {
  const p = {
    name, level:1, xp:0, xpToNext:xpNeed(1), rank:'E',
    stats:{ STR:5, AGI:5, INT:5, VIT:5, PER:5 }, statPoints:0, skillPoints:0, tree:{},
    weapon:0, gold:0, potions:1, shadows:[], cleared:{},
    titles:[], title:'', feats:{ perfects:0, boxes:0, flawless:0 },
    gear:{ armor:null, boots:null, ring:null }, bag:[],
    story:{ opening:false, gates:{} }, // what the story has shown: the opening once, each gate's chapter card once
    hp:1, maxHp:1, mp:1, maxMp:1, x:0, y:0, facing:{ x:1, y:0 },
    cds:{}, inv:0, hitFlash:0, anim:'idle', animT:0, atkT:0, atkDur:0.2, atkDir:1,
    combo:0, comboWin:0, dodgeCd:0, dodgeT:0, ddx:0, ddy:0, ghostAcc:0, perfect:false, perfectUsed:false,
    ult:0, ultT:0, moving:false,
  };
  recalcPlayer(p); p.hp = p.maxHp; p.mp = p.maxMp;
  return p;
}
function recalcPlayer(p) {
  const mp = gearMod('mp', p);
  p.maxHp = Math.floor((80 + p.stats.VIT*22) * (1 + 0.05*(p.tree.aegis || 0)) * (1 + gearMod('hp', p)));
  p.maxMp = mp ? Math.floor((30 + p.stats.INT*12) * (1 + mp)) : 30 + p.stats.INT*12;
}
// Call after equipment changes. In a gate the hunter keeps the health they have, within the new maximum.
function gearChanged() {
  recalcPlayer(player);
  const full = gameState !== 'DUNGEON';
  player.hp = full ? player.maxHp : Math.min(player.hp, player.maxHp);
  player.mp = full ? player.maxMp : Math.min(player.mp, player.maxMp);
}
// AGI has diminishing returns on speed — fast, but still controllable at 100+
// Gear multiplies in last: with nothing equipped every gearMod is 0, so each of these is exactly what it was without gear
const pSpeed    = () => (215 + 290*(1 - Math.exp(-player.stats.AGI/60))) * (1 + 0.04*tr('swift')) * (1 + 0.1*bn('haste')) * (player.ultT > 0 ? 1.25 : 1) * (1 + gearMod('spd'));
const pDamage   = () => (8 + player.stats.STR*2.5) * WEAPONS[player.weapon].mult * (1 + 0.06*tr('edge')) * (1 + 0.15*bn('might')) * (player.ultT > 0 ? 2 : 1) * (1 + gearMod('dmg'));
const pCrit     = () => Math.min(0.8, 0.05 + player.stats.PER*0.012 + 0.03*tr('lethal') + 0.08*bn('focus') + gearMod('crit'));
const pCritMult = () => 1.8 + player.stats.PER*0.02 + 0.1*tr('lethal');
const pDefense  = () => player.stats.VIT*0.8 * (1 + 0.1*tr('aegis')) * (1 + gearMod('def'));
const cdMult    = () => (1 - 0.04*tr('flow')) * (1 - Math.min(0.25, gearMod('cdr')));
const armyCap   = () => 6 + 2*tr('army');
const rankFor   = lvl => { for (let i = RANKS.length-1; i >= 0; i--) if (lvl >= RANK_LEVELS[i]) return RANKS[i]; return 'E'; };
const healPlayer = n => { player.hp = Math.min(player.maxHp, player.hp + n); };

function gainUlt(n) {
  if (player.level < SKILL.ult.unlockLevel || player.ultT > 0 || player.ult >= 100) return;
  player.ult = Math.min(100, player.ult + n * (1 + 0.15*tr('sovereign')) * (1 + 0.4*bn('surge')));
  if (player.ult >= 100) { toast(isMobile ? 'AWAKENING READY' : 'AWAKENING READY — PRESS R', 'purple', 2200); say('awakening_ready'); playSfx('boon'); }
}

function playerGainXp(amount) {
  const multi = 1 + Math.min(comboCount, 50) * 0.02; // combo XP bonus
  player.xp += Math.floor(amount * multi);
  let leveled = false, gotSp = 0, rankUp = null;
  while (player.xp >= player.xpToNext) {
    player.xp -= player.xpToNext;
    player.level++; player.statPoints += 5;
    if (player.level % 2 === 0) { player.skillPoints++; gotSp++; } // one skill point every 2 levels — the tree fills out around S-rank
    player.xpToNext = xpNeed(player.level);
    leveled = true;
    const r = rankFor(player.level);
    if (r !== player.rank) {
      rankUp = r; say('rank_'+r.toLowerCase(), true);
      player.rank = r; flash('#8844ff', 0.6); spawnBurst(player.x, player.y, COLORS.accent, 50, 420);
    }
    SKILL_DEFS.forEach(s => { if (player.level === s.unlockLevel && s.unlockLevel > 1) { toast(`NEW SKILL: ${s.name} [${s.key}]`, 'blue', 3200); say('skill_unlocked'); } });
    if (player.level === ENDLESS.reqLevel) { toast('NEW GATE: DEMON CASTLE — ENDLESS', 'purple', 3500); say('new_gate'); }
  }
  if (leveled) {
    recalcPlayer(player); healPlayer(player.maxHp*0.35); player.mp = player.maxMp; // a second wind, not a full reset
    const sub = '+5 STAT POINTS' + (gotSp ? ' · +' + gotSp + ' SKILL POINT' + (gotSp > 1 ? 'S' : '') : '');
    if (rankUp) systemPop('RANK UP', rankUp + '-RANK HUNTER', 'LV. ' + player.level + ' · ' + sub, 'violet'); else systemPop('LEVEL UP', 'LV. ' + player.level, sub);
    playSfx('levelup'); say('level_up');
    spawnBurst(player.x, player.y, COLORS.xp, 30, 360); spawnBurst(player.x, player.y, COLORS.primary, 20, 260);
    ring(player.x, player.y, COLORS.xp, 10, 180, 0.5, 5);
    flash('#ffcc00', 0.3); shake(10);
    if (player.level > highScores.bestLevel) highScores.bestLevel = player.level;
    saveGame();
  }
}

// ================================================================
//  EFFECTS — particles, rings, slash arcs, afterimages, lightning, numbers
// ================================================================
function spawnParticle(x, y, color, o = {}) {
  if (particles.length > 1100) return;
  const life = o.life ?? rand(0.3, 0.7);
  particles.push({ x, y, vx:o.vx ?? rand(-90,90), vy:o.vy ?? rand(-90,90), size:o.size ?? rand(2,5), life, max:life, color, type:o.type || 'glow', drag:o.drag ?? 2.5, grav:o.grav || 0, alpha:o.alpha ?? 1 });
}
function spawnBurst(x, y, color, count = 15, speed = 280, type = 'spark') {
  for (let i = 0; i < count; i++) {
    const a = rand(0, TAU), sp = rand(speed*0.2, speed);
    spawnParticle(x, y, color, { vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, size:rand(2,5), life:rand(0.25,0.7), type });
  }
}
function smoke(x, y, color, n = 6, spread = 20) {
  for (let i = 0; i < n; i++) spawnParticle(x+rand(-spread,spread), y+rand(-spread,spread), color, { vx:rand(-25,25), vy:rand(-70,-20), size:rand(8,18), life:rand(0.5,1.1), type:'smoke', drag:1, alpha:0.5 });
}
const ring = (x, y, color, r0, r1, dur = 0.4, w = 4) => rings.push({ x, y, color, r0, r1, t:0, dur, w });
const shake = n => { camera.shake = Math.min(28, Math.max(camera.shake, n)); };
const flash = (color, alpha) => { if (alpha > screenFlash.alpha) screenFlash = { alpha, color }; };
const hitstop = s => { hitStop = Math.max(hitStop, s); };
const slowmo = (scale, sec) => { timeScale = scale; slowT = sec; };
function floatText(x, y, text, color = '#fff', size = 16) {
  if (texts.length > 70) texts.shift();
  texts.push({ x:x+rand(-10,10), y, text, color, size, t:0, dur:0.85, vx:rand(-25,25), vy:-95 });
}
function ghost(x, y) { ghosts.push({ x, y, fx:player.facing.x, anim:player.anim, animT:player.animT, t:0, dur:0.3 }); }
function bolt(x1, y1, x2, y2, color) {
  const d = dist(x1,y1,x2,y2), n = Math.max(2, Math.ceil(d/26)), pts = [[x1,y1]];
  for (let i = 1; i < n; i++) pts.push([lerp(x1,x2,i/n)+rand(-13,13), lerp(y1,y2,i/n)+rand(-13,13)]);
  pts.push([x2,y2]);
  bolts.push({ pts, t:0, dur:0.2, color });
}
// A pillar of shadow — used for every "Arise"
let pillarFx = [];
function arisePillar(x, y, big = false) {
  pillarFx.push({ x, y, big, t:0, dur:big ? 1.1 : 0.8 });
  ring(x, y, COLORS.accent, 8, big ? 220 : 110, 0.6, big ? 8 : 5);
  for (let i = 0; i < (big ? 70 : 28); i++) spawnParticle(x+rand(-22,22), y+rand(-10,10), i%3 ? COLORS.accent : '#220044', { vx:rand(-30,30), vy:rand(-520,-120), size:rand(3,9), life:rand(0.5,1.2), type:i%3?'glow':'smoke', drag:0.8 });
}

function updateFx(dt) {
  let n = 0;
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.life -= dt; if (p.life <= 0) continue;
    const k = Math.max(0, 1 - p.drag*dt);
    p.vx *= k; p.vy = p.vy*k + p.grav*dt; p.x += p.vx*dt; p.y += p.vy*dt;
    particles[n++] = p;
  }
  particles.length = n;
  const tick = arr => { let m = 0; for (let i = 0; i < arr.length; i++) { const o = arr[i]; o.t += dt; if (o.t < o.dur) arr[m++] = o; } arr.length = m; };
  tick(rings); tick(arcs); tick(ghosts); tick(bolts); tick(pillarFx);
  for (const t of texts) { t.x += t.vx*dt; t.y += t.vy*dt; t.vy += 110*dt; }
  tick(texts);
  if (screenFlash.alpha > 0) screenFlash.alpha -= dt*1.4;
  camera.shake *= Math.pow(0.0015, dt); if (camera.shake < 0.4) camera.shake = 0;
}
