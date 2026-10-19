'use strict';

// ================================================================
//  SKILLS
// ================================================================
const canAct = () => gameState === 'DUNGEON' && !paused && dungeon && dungeon.state === 'fight' && player.hp > 0;
const mouseWorld = () => window.mouseWorld3D ? window.mouseWorld3D() : ({ x:(mouse.x-W/2)/camera.zoom + camera.x, y:(mouse.y-H/2)/camera.zoom + camera.y });
// Aim mode — 'keys': face where you move. 'mouse': face the pointer. 'auto': keys, unless the pointer was moved in the last few seconds
const AIM_MODES = ['auto','keys','mouse'];
const mouseAiming = () => !isMobile && (settings.aim === 'mouse' || (settings.aim === 'auto' && clock - mouse.lastMove < 4));
const liveEnemies = () => enemies.filter(e => e.alive && e.spawnT <= 0);
let lastWarn = 0;
function warn(msg) { if (clock - lastWarn > 1.2) { lastWarn = clock; toast(msg, 'red', 1100); playSfx('deny'); } }

const LOCK_RANGE = 260, LOCK_KEEP = 340;
const COUNTER_WINDOW = 1.6; // how long a perfect dodge leaves the counter strike open
// Lock-on: the hunter squares up to the nearest enemy. Returns the enemy he faces, or null.
function lockTarget() {
  if (mouseAiming() || !dungeon) { player.target = null; return null; }
  const range = e => e.isBoss ? 420 : LOCK_RANGE, keep = e => e.isBoss ? 520 : LOCK_KEEP;
  const edge = e => dist(player.x, player.y, e.x, e.y) - e.size;
  const cur = player.target;
  if (cur && cur.alive && cur.spawnT <= 0 && edge(cur) <= keep(cur)) { // stay on the current target while it is close, unless another enemy is far nearer
    let best = null, bestD = edge(cur)*0.6;
    for (const e of enemies) { if (e === cur || !e.alive || e.spawnT > 0) continue; const d = edge(e); if (d < bestD && d <= range(e)) { best = e; bestD = d; } }
    player.target = best || cur; return player.target;
  }
  let best = null, bestD = Infinity;
  for (const e of enemies) { if (!e.alive || e.spawnT > 0) continue; const d = edge(e); if (d <= range(e) && d < bestD) { best = e; bestD = d; } }
  player.target = best; return best;
}
// Touch has no cursor — face the locked enemy, or snap attacks onto the nearest one instead
function aimAssist() {
  if (!isMobile) return;
  const t = player.target || null;
  if (t) { const dx = t.x-player.x, dy = t.y-player.y, d = Math.hypot(dx,dy) || 1; player.facing = { x:dx/d, y:dy/d }; return; }
  let near = null, td = 240;
  for (const e of enemies) { if (!e.alive || e.spawnT > 0) continue; const d = dist(player.x, player.y, e.x, e.y) - e.size; if (d < td) { near = e; td = d; } }
  if (near) { const dx = near.x-player.x, dy = near.y-player.y, d = Math.hypot(dx,dy) || 1; player.facing = { x:dx/d, y:dy/d }; }
}
const movePlayerTo = (x, y) => { const p = keepIn(x, y, 20); player.x = p.x; player.y = p.y; };

function useSkill(sd) {
  if (!sd || !canAct() || player.level < sd.unlockLevel) return;
  if (sd.type === 'ult') { castUlt(); return; }
  if ((player.cds[sd.id] || 0) > 0) return;
  if (player.mp < sd.manaCost) { warn('NOT ENOUGH MANA'); return; }
  if (sd.type === 'legion' && !player.shadows.length) { warn('NO SHADOWS TO COMMAND'); return; }
  aimAssist();
  const fx = player.facing.x, fy = player.facing.y, ang = Math.atan2(fy, fx);
  const dmg = pDamage() * sd.damage, wc = player.ultT > 0 ? '#bb66ff' : WEAPONS[player.weapon].color;
  player.mp -= sd.manaCost; player.cds[sd.id] = sd.cooldown * cdMult();
  lastPlayerAttackTime = gameTime; // shadows only fight while you do

  switch (sd.type) {
    case 'melee': {
      const counter = player.counterT > 0;
      let cfx = fx, cfy = fy, cang = ang;
      if (counter) { // a perfect dodge opens a closing counter strike
        player.counterT = 0;
        if (player.target && dist(player.x, player.y, player.target.x, player.target.y) - player.target.size <= 260) {
          const t = player.target, tdx = t.x-player.x, tdy = t.y-player.y, tl = Math.hypot(tdx,tdy) || 1;
          cfx = tdx/tl; cfy = tdy/tl; cang = Math.atan2(cfy, cfx); player.facing = { x:cfx, y:cfy };
          const close = Math.max(0, tl - t.size - 40); // step to just short of the enemy's edge
          movePlayerTo(player.x + cfx*close, player.y + cfy*close);
        }
      }
      const step = player.comboWin > 0 ? player.combo : 0, fin = counter || step === 2;
      player.combo = (step+1) % 3; player.comboWin = fin ? 0 : 0.75;
      player.cds.slash = (fin ? 0.46 : 0.26) * (1 - Math.min(0.3, player.stats.AGI*0.002));
      player.anim = 'attack'; player.atkDur = fin ? 0.3 : 0.19; player.atkT = player.atkDur; player.atkDir = step === 1 ? -1 : 1;
      const reach = fin ? 124 : 90, span = fin ? Math.PI*1.3 : Math.PI*0.85;
      movePlayerTo(player.x + cfx*(fin ? 26 : 10), player.y + cfy*(fin ? 26 : 10));
      arcs.push({ x:player.x, y:player.y-14, a:cang, r:reach, span, dir:player.atkDir, t:0, dur:fin ? 0.26 : 0.17, color:wc, w:fin ? 30 : 18 });
      let hits = 0;
      for (const e of liveEnemies()) {
        const ex = e.x-player.x, ey = e.y-player.y, ed = Math.hypot(ex, ey);
        if (ed > reach+e.size) continue;
        if (ed < 32+e.size || Math.abs(angDiff(Math.atan2(ey,ex), cang)) < span/2) {
          damageEnemy(e, dmg*(counter ? 2.2 : fin ? 1.7 : 1), { kb:fin ? 520 : 150, stun:counter ? 1.0 : undefined });
          if (counter && e.isBoss && (e.staggerCd || 0) <= 0) { e.stun = Math.max(e.stun, 0.7); e.staggerCd = 4; } // a boss is too heavy to launch, so it buckles instead
          hits++;
        }
      }
      if (hits) { hitstop(fin ? 0.07 : 0.03); shake(fin ? 9 : 3.5); }
      if (counter && hits) { floatText(player.x, player.y-56, 'COUNTER', '#ffd866', 20); hitstop(0.09); shake(10); flash('#ffffff', 0.15); } // a counter that hits nothing is just a big swing
      if (player.ultT > 0) projectiles.push({ x:player.x+cfx*30, y:player.y-12+cfy*30, vx:cfx*820, vy:cfy*820, damage:dmg*0.8, size:fin ? 46 : 30, color:'#bb66ff', life:0.55, fromEnemy:false, hit:new Set(), crescent:true, a:cang });
      playSfx(fin ? 'slash3' : 'slash', 1 + step*0.15);
      break;
    }
    case 'dash': {
      const sx = player.x, sy = player.y, k0 = run.kills;
      { const n = Math.ceil(sd.range/16), stp = sd.range/n; for (let i = 0; i < n; i++) movePlayerTo(player.x + fx*stp, player.y + fy*stp); } // in short steps, so a dash slides along a wall instead of passing through it
      for (let i = 0; i < 6; i++) ghosts.push({ x:lerp(sx,player.x,i/6), y:lerp(sy,player.y,i/6), fx, anim:'dash', animT:player.animT, t:0, dur:0.2+i*0.04 });
      for (let i = 0; i < 16; i++) spawnParticle(lerp(sx,player.x,Math.random()), lerp(sy,player.y,Math.random())-12, wc, { vx:rand(-60,60), vy:rand(-60,60), size:rand(2,5), life:0.4 });
      player.inv = Math.max(player.inv, 0.3); player.anim = 'dash'; player.atkDur = player.atkT = 0.18;
      for (const e of liveEnemies()) if (segDist(e.x, e.y, sx, sy, player.x, player.y) < 46+e.size) damageEnemy(e, dmg, { kb:220, ox:sx, oy:sy });
      ring(player.x, player.y, wc, 10, 80, 0.25, 4); shake(8); hitstop(0.04); playSfx('dash'); playSfx('slash3');
      if (tr('phantom') && run.kills > k0) { player.cds.dash_strike = 0; floatText(player.x, player.y-60, 'RESET', COLORS.primary, 14); }
      break;
    }
    case 'teleport': {
      const aim = mouseAiming() ? mouseWorld() : player;
      const cands = liveEnemies().filter(e => dist(player.x, player.y, e.x, e.y) < sd.range).sort((a,b) => dist(aim.x,aim.y,a.x,a.y) - dist(aim.x,aim.y,b.x,b.y));
      if (!cands.length) { player.mp += sd.manaCost; player.cds[sd.id] = 0; warn('NO TARGET IN RANGE'); break; }
      cands.slice(0, 1 + tr('phantom')).forEach((t, i) => {
        const px = player.x, py = player.y;
        smoke(px, py-10, '#220044', 5, 12); ghost(px, py);
        movePlayerTo(t.x - t.facing.x*(t.size+26), t.y - t.facing.y*(t.size+26));
        bolt(px, py-12, player.x, player.y-12, COLORS.accent);
        const dx = t.x-player.x, dy = t.y-player.y, d = Math.hypot(dx,dy) || 1;
        player.facing = { x:dx/d, y:dy/d };
        arcs.push({ x:player.x, y:player.y-14, a:Math.atan2(dy,dx), r:80, span:2.6, dir:i%2?-1:1, t:0, dur:0.2, color:COLORS.accent, w:24 });
        damageEnemy(t, dmg*(i ? 0.7 : 1), { kb:260, crit:true }); // a strike from behind always crits
      });
      player.inv = Math.max(player.inv, 0.25); player.anim = 'attack'; player.atkDur = player.atkT = 0.2;
      spawnBurst(player.x, player.y-12, COLORS.accent, 18, 300); shake(10); hitstop(0.07); playSfx('dash');
      break;
    }
    case 'aoe': {
      const mult = 1 + 0.2*tr('domain'), R = sd.range*mult;
      ring(player.x, player.y, COLORS.primary, R*1.35, 20, 0.35, 3); playSfx('tele');
      for (const e of liveEnemies()) {
        const dx = player.x-e.x, dy = player.y-e.y, d = Math.hypot(dx,dy) || 1;
        if (d < R*1.4 && !e.isBoss) { e.kx += dx/d*Math.min(700, d*3.2); e.ky += dy/d*Math.min(700, d*3.2); e.stun = 0.6; }
      }
      after(0.35, () => {
        if (!canAct()) return;
        const x = player.x, y = player.y;
        for (const e of liveEnemies()) if (dist(x, y, e.x, e.y) < R+e.size) damageEnemy(e, dmg*mult, { kb:640 });
        projectiles = projectiles.filter(p => !p.fromEnemy || dist(x, y, p.x, p.y) > R);
        ring(x, y, COLORS.primary, 20, R*1.1, 0.4, 12); ring(x, y, '#ffffff', 10, R*0.8, 0.25, 4);
        spawnBurst(x, y, COLORS.primary, 50, R*3); shake(18); flash(COLORS.primary, 0.3); hitstop(0.09); playSfx('explode');
      });
      break;
    }
    case 'legion': {
      legionTimer = LEGION_DURATION + 3*tr('march');
      player.cds.legion = legionTimer + (sd.cooldown - 3*tr('march')) * cdMult();
      playSfx('legion'); toast('ARISE — SHADOW LEGION UNLEASHED', 'purple', 3000, true); say('legion', true, 0.4);
      flash('#8844ff', 0.5); shake(15); arisePillar(player.x, player.y, true);
      syncShadowField();
      break;
    }
  }
}

function castUlt() {
  if (player.ultT > 0) return;
  if (player.ult < 100) { warn('AWAKENING NOT READY'); return; }
  player.ult = 0; player.ultT = 8 + 2*tr('sovereign'); lastPlayerAttackTime = gameTime;
  slowmo(0.2, 0.7); flash('#8844ff', 0.6); shake(24); playSfx('ult');
  arisePillar(player.x, player.y, true);
  ring(player.x, player.y, '#bb66ff', 20, 460, 0.6, 14); ring(player.x, player.y, '#ffffff', 10, 300, 0.4, 5);
  projectiles = projectiles.filter(p => !p.fromEnemy);
  for (const e of liveEnemies()) if (dist(player.x, player.y, e.x, e.y) < 440) damageEnemy(e, pDamage()*1.5, { kb:760, stun:1.0 });
  syncShadowField();
  toast("MONARCH'S AWAKENING", 'purple', 2600, true);
}

function dodge() {
  if (!canAct() || player.dodgeCd > 0) return;
  let dx = moveDir.x, dy = moveDir.y;
  if (!dx && !dy) { // no input: a backstep away from the locked enemy, else a step forward
    if (player.target) { const bdx = player.x-player.target.x, bdy = player.y-player.target.y, b = Math.hypot(bdx,bdy) || 1; dx = bdx/b; dy = bdy/b; }
    else { dx = player.facing.x; dy = player.facing.y; }
  }
  player.ddx = dx; player.ddy = dy; player.dodgeT = 0.2; player.ghostAcc = 0;
  player.inv = Math.max(player.inv, 0.32); player.dodgeCd = 0.85 * (1 - 0.06*tr('swift'));
  player.perfectUsed = false; player.dodgeAt = gameTime; player.dodgeX = player.x; player.dodgeY = player.y; playSfx('dash');
}

// ================================================================
//  SHADOW ARMY
// ================================================================
const ESCORT_SIZE = 3;
const shadowDmg = s => s.damage * (1 + 0.03*player.level) * (1 + 0.12*tr('might')) * (1 + 0.25*bn('tide'));

// Pure: the weakest of the deployed set escort, the strongest answer the Legion call, the rest wait in reserve
function shadowRole(sortedRoster, cap, inLegion, inUlt) {
  const dep = Math.min(sortedRoster.length, cap);
  const escortCount = Math.min(dep, ESCORT_SIZE);
  const escortStart = dep - escortCount;
  return sortedRoster.map((s, i) => {
    const role = i >= dep ? 'reserve' : i >= escortStart ? 'escort' : 'legion';
    const active = role === 'escort' || (role === 'legion' && (inLegion || inUlt)) || inUlt || ((s.lingerT || 0) > 0);
    return { shadow: s, role, active };
  });
}

function deployShadows() {
  const ranked = [...player.shadows].sort((a,b) => b.damage - a.damage);
  shadowRole(ranked, armyCap(), legionTimer > 0, player.ultT > 0).forEach(r => { r.shadow.role = r.role; });
  syncShadowField();
}

function syncShadowField() {
  if (!player || !player.shadows) return;
  const ranked = [...player.shadows].sort((a,b) => b.damage - a.damage);
  let pillars = 0;
  shadowRole(ranked, armyCap(), legionTimer > 0, player.ultT > 0).forEach(({ shadow: s, role, active: want }) => {
    s.role = role;
    const was = !!s.active;
    if (!was && want) {
      s.riseT = s.riseDur = 0.5; // it climbs out of a dark pool instead of simply appearing
      const a = rand(0, TAU), r = rand(60, 140);
      const p = keepIn(player.x + Math.cos(a)*r, player.y + Math.sin(a)*r, 14);
      s.x = p.x; s.y = p.y; s.attackCd = 0;
      if (pillars < 8) { arisePillar(s.x, s.y); pillars++; }
      else { ring(s.x, s.y, COLORS.accent, 6, 50, 0.3, 3); spawnBurst(s.x, s.y, COLORS.accent, 8, 160); }
    } else if (was && !want) {
      ring(s.x, s.y, '#8844ff', 8, 30, 0.25, 2);
      for (let i = 0; i < 4; i++) spawnParticle(s.x + rand(-6,6), s.y + rand(-6,6), '#8844ff', { vx:rand(-25,25), vy:rand(-35,10), size:rand(2,4), life:0.35 });
    }
    s.active = want;
  });
}

function shadowKindFor(name) {
  for (const g of GATE_DEFS) if (g.boss && g.boss.name === name) return 'boss';
  for (const g of GATE_DEFS) for (const e of g.enemies || []) if (e.name === name) return e.kind;
  return 'melee';
}
function addShadow(s) {
  const ns = { ...s, active:true, attackCd:0, animT:rand(0,9), facing:{ x:1, y:0 }, lingerT:3, riseT:0.8, riseDur:0.8 }; // on the field where it rose for 3 seconds, then it follows its role; riseT is not saved
  player.shadows.push(ns);
  if (player.shadows.length > 40) { let wi = 0; player.shadows.forEach((x,i) => { if (x.damage < player.shadows[wi].damage) wi = i; }); player.shadows.splice(wi, 1); }
  deployShadows(); ns.x = s.x; ns.y = s.y;
  floatText(ns.x, ns.y - 50, 'ARISE', '#bb88ff', 30);
}
function nearRemnant() {
  let r = null, rd = 95;
  for (const m of remnants) { const d = dist(player.x, player.y, m.x, m.y); if (d < rd) { r = m; rd = d; } }
  return r;
}
function tryArise() {
  if (!canAct()) return;
  const r = nearRemnant(); if (!r) return;
  remnants.splice(remnants.indexOf(r), 1);
  player.story.arose = true;
  arisePillar(r.x, r.y); playSfx('arise'); flash('#8844ff', 0.2); shake(6);
  addShadow({ name:r.name, kind:r.kind, damage:Math.max(3, Math.floor(r.damage*(r.elite ? 0.35 : 0.25))), level:player.level, color:r.color, size:Math.min(r.size*0.6, 18), grade:r.elite ? 'Elite' : 'Soldier', x:r.x, y:r.y });
  toast(`ARISE — ${r.name.toUpperCase()} JOINS YOUR ARMY`, 'purple', 2000); say('army_grows');
}

function updateShadows(dt) {
  player.shadows.forEach(s => { if (s.lingerT > 0) s.lingerT -= dt; if (s.riseT > 0) s.riseT = Math.max(0, s.riseT - dt); });
  syncShadowField();
  const alive = liveEnemies();
  // Shadows only attack if the player is actively fighting AND moving, OR legion mode is active
  const playerEngaged = (gameTime - lastPlayerAttackTime) < SHADOW_IDLE_TIMEOUT;
  const playerMoving = (gameTime - lastMoveTime) < STATIONARY_TIMEOUT;
  const berserk = legionTimer > 0 || player.ultT > 0;
  const canAttack = ((playerEngaged && playerMoving) || berserk) && alive.length > 0;
  if (legionTimer > 0) legionTimer -= dt;
  const active = player.shadows.filter(s => s.active), total = active.length;

  active.forEach((s, i) => {
    s.animT += dt;
    if (s.riseT > 0) return; // still climbing out: it neither moves nor attacks until it is up
    s.attackCd -= dt; s.moving = false;
    if (canAttack) {
      const target = alive[i % alive.length]; // spread the army across the enemy line
      const dx = target.x-s.x, dy = target.y-s.y, d = Math.hypot(dx,dy) || 1;
      s.facing = { x:dx/d, y:dy/d };
      const mult = berserk ? 1.8 : 1, dmg = shadowDmg(s)*mult, cdK = berserk ? 0.45 : 1, walk = berserk ? 330 : 190;
      const so = { shadow:true, crit:false, ox:s.x, oy:s.y };
      const ux = dx/d, uy = dy/d;
      switch (s.kind) {
        case 'ranged':
          if (d > 300) { s.x += ux*walk*dt; s.y += uy*walk*dt; s.moving = true; }
          else if (d < 180) { s.x -= ux*walk*0.6*dt; s.y -= uy*walk*0.6*dt; s.moving = true; }
          if (s.attackCd <= 0 && d < 440) {
            projectiles.push({ x:s.x, y:s.y, vx:ux*460, vy:uy*460, damage:dmg, size:5, color:'#bb88ff', life:1.4, fromEnemy:false, hit:new Set(), shadow:true });
            s.attackCd = 1.4*cdK; s.atkT = 0.18; playSfx('shoot');
          }
          break;
        case 'caster':
          if (d > 340) { s.x += ux*walk*dt; s.y += uy*walk*dt; s.moving = true; }
          else if (d < 200) { s.x -= ux*walk*0.6*dt; s.y -= uy*walk*0.6*dt; s.moving = true; }
          if (s.attackCd <= 0 && d < 480) {
            telegraph({ type:'circle', x:target.x, y:target.y, r:70, dur:0.7, dmg:dmg*1.6, color:'#7744cc', friendly:true });
            s.attackCd = 3.2*cdK; s.atkT = 0.18;
          }
          break;
        case 'charger':
          if (d > target.size+24) {
            const sp = (d > 110 && s.attackCd <= 0) ? 560 : walk;
            s.x += ux*sp*dt; s.y += uy*sp*dt; s.moving = true;
          } else if (s.attackCd <= 0) {
            damageEnemy(target, dmg*1.3, { ...so, kb:260 });
            s.attackCd = 1.6*cdK; s.atkT = 0.18;
            arcs.push({ x:s.x, y:s.y-10, a:Math.atan2(dy,dx), r:34, span:2.2, dir:i%2?1:-1, t:0, dur:0.15, color:berserk ? '#ff66ff' : COLORS.accent, w:10 });
          }
          break;
        case 'brute':
          if (d > target.size+24) { s.x += ux*walk*dt; s.y += uy*walk*dt; s.moving = true; }
          else if (s.attackCd <= 0) {
            damageEnemy(target, dmg*1.4, { ...so, kb:320 });
            for (const en of alive) if (en.alive && en !== target && dist(en.x, en.y, target.x, target.y) <= 70) damageEnemy(en, dmg*0.6, { ...so, kb:200 });
            ring(target.x, target.y, '#bb66ff', 10, 80, 0.3, 5);
            s.attackCd = 1.9*cdK; s.atkT = 0.18;
          }
          break;
        case 'bomber':
          if (d > target.size+24) { s.x += ux*walk*1.3*dt; s.y += uy*walk*1.3*dt; s.moving = true; }
          else if (s.attackCd <= 0) {
            for (const en of alive) if (en.alive && dist(en.x, en.y, s.x, s.y) <= 75) damageEnemy(en, dmg*1.2, { ...so, kb:240 });
            ring(s.x, s.y, '#ff66cc', 10, 90, 0.3, 6);
            spawnBurst(s.x, s.y, '#ff66cc', 14, 360);
            playSfx('explode');
            s.attackCd = 2.4*cdK; s.atkT = 0.18;
          }
          break;
        case 'boss':
          s.specialCd = (s.specialCd ?? 4) - dt;
          if (s.specialCd <= 0) {
            for (let k = 0; k < 10; k++) {
              const a = k/10*TAU;
              projectiles.push({ x:s.x, y:s.y, vx:Math.cos(a)*380, vy:Math.sin(a)*380, damage:dmg*0.8, size:6, color:'#bb88ff', life:1.2, fromEnemy:false, hit:new Set(), shadow:true });
            }
            ring(s.x, s.y, '#bb66ff', 12, 120, 0.4, 6);
            playSfx('shoot');
            s.specialCd = 8*cdK;
          }
          // falls through
        default:
          if (d > target.size+24) { s.x += ux*walk*dt; s.y += uy*walk*dt; s.moving = true; }
          else if (s.attackCd <= 0) {
            damageEnemy(target, shadowDmg(s)*(berserk ? 1.8 : 1), { shadow:true, crit:false, kb:berserk ? 120 : 0 });
            s.attackCd = berserk ? 0.5 : 1.2; s.atkT = 0.18;
            arcs.push({ x:s.x, y:s.y-10, a:Math.atan2(dy,dx), r:34, span:2.2, dir:i%2?1:-1, t:0, dur:0.15, color:berserk ? '#ff66ff' : COLORS.accent, w:10 });
          }
          break;
      }
    } else {
      // Military formation behind the player
      const perRow = total <= 3 ? total : total <= 9 ? 3 : total <= 16 ? 4 : 5;
      const row = Math.floor(i/perRow), colCount = Math.min(perRow, total - row*perRow), col = (i % perRow) - (colCount-1)/2;
      const sx = col*(34 + row*4), sy = (row+1)*36;
      const tx = player.x - player.facing.x*sy - player.facing.y*sx, ty = player.y - player.facing.y*sy + player.facing.x*sx;
      const k = 1 - Math.exp(-5*dt), mvd = dist(s.x, s.y, tx, ty);
      s.x += (tx-s.x)*k; s.y += (ty-s.y)*k; s.moving = mvd > 12;
      if (mvd > 12) s.facing = { x:Math.sign(tx-s.x) || 1, y:0 }; else s.facing = { x:player.facing.x, y:0 };
    }
    { const p = keepIn(s.x, s.y, 14); s.x = p.x; s.y = p.y; }
    if (s.atkT > 0) s.atkT -= dt;
    if (Math.random() < (berserk ? 14 : 4)*dt) spawnParticle(s.x+rand(-6,6), s.y-rand(0,24), berserk ? '#cc55ff' : COLORS.accent, { vx:rand(-15,15), vy:rand(-70,-25), size:rand(2, berserk ? 6 : 4), life:0.5, alpha:0.6 });
  });
}
