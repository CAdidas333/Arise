'use strict';

// ================================================================
//  ENEMIES — six archetypes, elites, telegraphed attacks
// ================================================================
function makeEnemy(def, x, y, o = {}) {
  const s = o.scale || 1;
  const e = { name:def.name, baseName:def.name, kind:def.kind, color:def.color, def, x, y,
    hp:Math.floor(def.hp*s), damage:Math.floor(def.damage*(1+(s-1)*0.6)), speed:def.speed, size:def.size, xp:Math.floor(def.xp*(1+(s-1)*0.5)),
    isBoss:!!o.boss, elite:!!o.elite, alive:true, spawnT:o.boss?0:0.55, hitFlash:0, stun:0, kx:0, ky:0,
    facing:{ x:1, y:0 }, animT:rand(0,10), cd:rand(0.5,1.5), mcd:0, state:'chase', st:0, tx:0, ty:0, strafe:Math.random()<0.5?1:-1 };
  if (e.elite) { e.hp *= 3; e.damage = Math.floor(e.damage*1.4); e.size *= 1.3; e.xp *= 3; e.name = 'Elite ' + e.name; }
  if (e.isBoss) { e.patterns = def.patterns; e.title = def.title; e.phase = 1; e.cd = 2.2; }
  e.maxHp = e.hp;
  return e;
}
const clampArena = e => { e.x = clamp(e.x, -arenaW/2+e.size, arenaW/2-e.size); e.y = clamp(e.y, -arenaH/2+e.size, arenaH/2-e.size); };
const mv = (e, ux, uy, spd, dt) => { e.x += ux*spd*dt; e.y += uy*spd*dt; };
const telegraph = o => telegraphs.push(Object.assign({ t:0 }, o));
function shoot(e, ang, speed, dmg, size, color) {
  projectiles.push({ x:e.x, y:e.y, vx:Math.cos(ang)*speed, vy:Math.sin(ang)*speed, damage:dmg, size, color, life:3.2, fromEnemy:true });
}
function keepRange(e, dt, d, ux, uy, want) {
  if (d > want+40) mv(e, ux, uy, e.speed, dt);
  else if (d < want-70) mv(e, -ux, -uy, e.speed*0.8, dt);
  else mv(e, -uy*e.strafe, ux*e.strafe, e.speed*0.5, dt);
}

const AI = {
  melee(e, dt, d, ux, uy) {
    if (e.state === 'wind') { e.st -= dt; if (e.st <= 0) { e.state = 'chase'; e.cd = 1.0; arcs.push({ x:e.x, y:e.y, a:Math.atan2(uy,ux), r:e.size+26, span:1.9, dir:1, t:0, dur:0.16, color:'#ff7755', w:9 }); if (d < e.size+40) hurtPlayer(e.damage); } return; }
    if (d > e.size+22) mv(e, ux, uy, e.speed, dt); else if (e.cd <= 0) { e.state = 'wind'; e.st = 0.32; }
  },
  ranged(e, dt, d, ux, uy) {
    if (e.state === 'wind') { e.st -= dt; if (e.st <= 0) { e.state = 'chase'; e.cd = rand(2,2.8); shoot(e, Math.atan2(uy,ux), 280, e.damage*0.8, 5, '#ff8844'); playSfx('shoot'); } return; }
    keepRange(e, dt, d, ux, uy, 230);
    if (e.cd <= 0 && d < 470) { e.state = 'wind'; e.st = 0.4; }
  },
  charger(e, dt, d, ux, uy) {
    if (e.state === 'wind') { e.st -= dt; if (e.st <= 0) { e.state = 'dash'; e.st = 0.55; e.hitP = false; playSfx('dash'); } return; }
    if (e.state === 'dash') {
      e.st -= dt; mv(e, e.tx, e.ty, e.speed*7, dt);
      spawnParticle(e.x, e.y, e.color, { vx:rand(-40,40), vy:rand(-40,40), size:rand(3,6), life:0.3 });
      if (!e.hitP && d < e.size+20) { e.hitP = true; hurtPlayer(e.damage*1.3); }
      if (e.st <= 0) { e.state = 'chase'; e.cd = rand(2.2,3.2); e.stun = 0.5; }
      return;
    }
    if (d > 300) mv(e, ux, uy, e.speed, dt);
    else if (e.cd <= 0) { e.state = 'wind'; e.st = 0.6; e.tx = ux; e.ty = uy; e.facing = { x:ux, y:uy }; telegraph({ type:'line', x:e.x, y:e.y, ax:ux, ay:uy, len:e.speed*7*0.55, w:e.size*1.7, dur:0.6, color:'#ff5544', owner:e }); }
    else mv(e, -uy*e.strafe, ux*e.strafe, e.speed*0.6, dt);
  },
  bomber(e, dt, d, ux, uy) {
    if (e.state === 'wind') { e.st -= dt; if (e.st <= 0) { e.detonated = true; explodeAt(e.x, e.y, 95, e.damage*1.6, true); e.hp = 0; killEnemy(e, { quiet:true }); } return; }
    mv(e, ux, uy, e.speed, dt);
    if (d < 54) { e.state = 'wind'; e.st = 0.55; playSfx('tele'); }
  },
  brute(e, dt, d, ux, uy) {
    if (e.state === 'wind') { e.st -= dt; if (e.st <= 0) { e.state = 'chase'; e.cd = 2.4; } return; }
    if (d > e.size+52) mv(e, ux, uy, e.speed, dt);
    else if (e.cd <= 0) { e.state = 'wind'; e.st = 0.85; telegraph({ type:'circle', x:e.x+ux*50, y:e.y+uy*50, r:105, dur:0.8, dmg:e.damage*1.5, color:'#ff5544', owner:e }); }
  },
  caster(e, dt, d, ux, uy) {
    if (e.state === 'wind') { e.st -= dt; if (e.st <= 0) { e.state = 'chase'; e.cd = rand(3,4); } return; }
    keepRange(e, dt, d, ux, uy, 280);
    if (e.cd <= 0 && d < 540) { e.state = 'wind'; e.st = 0.5; telegraph({ type:'circle', x:player.x, y:player.y, r:85, dur:1.0, dmg:e.damage, color:'#bb66ff', owner:e }); playSfx('tele'); }
  },
};

// --- BOSSES: pattern-driven, enrage at half health ---
function bossAI(e, dt, d, ux, uy) {
  const P2 = e.phase === 2;
  if (!P2 && e.hp < e.maxHp*0.5) {
    e.phase = 2; e.speed *= 1.25; e.state = 'cast'; e.st = 1.0; e.cd = 0.6;
    toast(`${e.name.toUpperCase()} IS ENRAGED`, 'red', 2600, true); playSfx('boss');
    ring(e.x, e.y, COLORS.danger, e.size, 520, 0.7, 10); shake(20); flash('#ff2222', 0.35); slowmo(0.35, 0.5);
    projectiles = projectiles.filter(p => !p.fromEnemy);
    return;
  }
  e.mcd -= dt;
  switch (e.state) {
    case 'chase':
      if (d > e.size+34) mv(e, ux, uy, e.speed, dt);
      else if (e.mcd <= 0) { e.mcd = 2.2; e.state = 'cast'; e.st = 0.65; telegraph({ type:'circle', x:e.x, y:e.y, r:e.size+85, dur:0.55, dmg:e.damage, color:'#ff5544', owner:e }); }
      if (e.cd <= 0 && e.state === 'chase') startPattern(e, d, ux, uy);
      break;
    case 'cast': e.st -= dt; if (e.st <= 0) endPattern(e); break;
    case 'spiral':
      e.st -= dt; e.sa += dt*(P2 ? 3.1 : 2.3); e.sacc += dt;
      while (e.sacc > 0.075) { e.sacc -= 0.075; const arms = P2 ? 3 : 2; for (let k = 0; k < arms; k++) shoot(e, e.sa + k*TAU/arms, 190, e.damage*0.45, 6, COLORS.accent); }
      if (e.st <= 0) endPattern(e);
      break;
    case 'cwind': e.st -= dt; if (e.st <= 0) { e.state = 'cdash'; e.st = 0.6; e.hitP = false; playSfx('dash'); shake(6); } break;
    case 'cdash':
      e.st -= dt; mv(e, e.tx, e.ty, 760, dt);
      spawnParticle(e.x, e.y, e.color, { size:rand(5,10), life:0.35 });
      if (!e.hitP && d < e.size+24) { e.hitP = true; hurtPlayer(e.damage*1.5); }
      if (e.st <= 0) { if (e.charges-- > 0) bossCharge(e); else endPattern(e); }
      break;
  }
}
function bossCharge(e) {
  const dx = player.x-e.x, dy = player.y-e.y, d = Math.hypot(dx,dy) || 1;
  e.state = 'cwind'; e.st = 0.65; e.tx = dx/d; e.ty = dy/d; e.facing = { x:e.tx, y:e.ty };
  telegraph({ type:'line', x:e.x, y:e.y, ax:e.tx, ay:e.ty, len:460, w:e.size*1.8, dur:0.65, color:'#ff3333', owner:e });
}
function startPattern(e, d, ux, uy) {
  let p = pick(e.patterns); if (p === e.lastP) p = e.patterns[(e.patterns.indexOf(p)+1) % e.patterns.length];
  e.lastP = p; const P2 = e.phase === 2;
  e.state = 'cast'; e.st = 0.6;
  switch (p) {
    case 'burst': {
      const fire = off => { if (!e.alive) return; const n = P2 ? 20 : 14; for (let i = 0; i < n; i++) shoot(e, off + i/n*TAU, 210, e.damage*0.5, 6, COLORS.danger); ring(e.x, e.y, COLORS.danger, e.size, e.size*3, 0.3, 5); shake(7); playSfx('shoot'); };
      fire(rand(0,TAU)); after(0.35, () => fire(rand(0,TAU))); if (P2) after(0.7, () => fire(rand(0,TAU)));
      e.st = P2 ? 1.0 : 0.7; break;
    }
    case 'spiral': e.state = 'spiral'; e.st = P2 ? 3.2 : 2.4; e.sa = rand(0,TAU); e.sacc = 0; break;
    case 'slam':
      telegraph({ type:'circle', x:player.x, y:player.y, r:150, dur:0.9, dmg:e.damage*1.4, color:'#ff5544', owner:e });
      if (P2) for (let i = 0; i < 2; i++) after(0.3+i*0.3, () => { if (e.alive) telegraph({ type:'circle', x:player.x, y:player.y, r:120, dur:0.8, dmg:e.damage*1.2, color:'#ff5544', owner:e }); });
      playSfx('tele'); e.st = 1.0; break;
    case 'nova': {
      const n = P2 ? 10 : 6;
      for (let i = 0; i < n; i++) { const a = rand(0,TAU), r = rand(0,380); telegraph({ type:'circle', x:player.x+Math.cos(a)*r, y:player.y+Math.sin(a)*r, r:90, dur:0.8+i*0.12, dmg:e.damage*1.1, color:'#bb66ff', owner:e }); }
      playSfx('tele'); e.st = 1.2; break;
    }
    case 'charge': e.charges = P2 ? 2 : 0; bossCharge(e); break;
    case 'summon': {
      const g = dungeon.gate, n = P2 ? 5 : 3;
      for (let i = 0; i < n; i++) { const a = rand(0,TAU); spawnQueue.push({ t:i*0.12, def:pick(g.enemies.slice(0,2)), x:e.x+Math.cos(a)*120, y:e.y+Math.sin(a)*120, o:{ scale:dungeon.scale } }); }
      ring(e.x, e.y, COLORS.accent, e.size, 200, 0.5, 5); e.st = 0.8; break;
    }
  }
}
function endPattern(e) { e.state = 'chase'; e.cd = e.phase === 2 ? rand(1.3,2.1) : rand(2.2,3.2); }

function updateEnemies(dt) {
  for (const e of enemies) {
    if (!e.alive) continue;
    if (e.spawnT > 0) { e.spawnT -= dt; continue; }
    if (e.hitFlash > 0) e.hitFlash -= dt;
    e.animT += dt;
    if (e.kx || e.ky) { e.x += e.kx*dt; e.y += e.ky*dt; const k = Math.pow(0.002, dt); e.kx *= k; e.ky *= k; if (Math.abs(e.kx)+Math.abs(e.ky) < 6) e.kx = e.ky = 0; }
    if (e.stun > 0) { e.stun -= dt; clampArena(e); continue; }
    const dx = player.x-e.x, dy = player.y-e.y, d = Math.hypot(dx,dy) || 1, ux = dx/d, uy = dy/d;
    if (e.state === 'chase') e.facing = { x:ux, y:uy };
    e.cd -= dt;
    if (e.isBoss) bossAI(e, dt, d, ux, uy); else AI[e.kind](e, dt, d, ux, uy);
    clampArena(e);
  }
  // Keep the horde from stacking into one blob
  for (let i = 0; i < enemies.length; i++) {
    const a = enemies[i]; if (!a.alive || a.isBoss || a.state === 'dash') continue;
    for (let j = i+1; j < enemies.length; j++) {
      const b = enemies[j]; if (!b.alive || b.isBoss || b.state === 'dash') continue;
      const dx = b.x-a.x, dy = b.y-a.y, min = a.size+b.size, d2 = dx*dx+dy*dy;
      if (d2 < min*min && d2 > 0.01) { const d = Math.sqrt(d2), p = (min-d)/d*0.5; a.x -= dx*p; a.y -= dy*p; b.x += dx*p; b.y += dy*p; }
    }
  }
}

function updateTelegraphs(dt) {
  const live = [];
  for (const g of telegraphs) {
    g.t += dt;
    if (g.owner && !g.owner.alive) continue;
    if (g.t < g.dur) { live.push(g); continue; }
    if (g.type === 'circle') {
      ring(g.x, g.y, g.color, g.r*0.3, g.r*1.15, 0.3, 6); spawnBurst(g.x, g.y, g.color, 14, g.r*2.4);
      shake(g.r > 120 ? 10 : 5); playSfx('explode');
      if (dist(g.x, g.y, player.x, player.y) < g.r+8) hurtPlayer(g.dmg);
    }
  }
  telegraphs = live;
}

function explodeAt(x, y, r, dmg, hurtsPlayer) {
  ring(x, y, '#ff8833', 10, r*1.2, 0.35, 8); spawnBurst(x, y, '#ffaa44', 26, 520); smoke(x, y, '#331100', 6, r*0.4);
  shake(11); playSfx('explode');
  if (hurtsPlayer && dist(x, y, player.x, player.y) < r+10) hurtPlayer(dmg);
  for (const en of enemies) if (en.alive && en.spawnT <= 0 && dist(x, y, en.x, en.y) < r+en.size) damageEnemy(en, dmg*2.5, { crit:false, indirect:true, kb:380, ox:x, oy:y });
}
