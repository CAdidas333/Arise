'use strict';

// ================================================================
//  COMBAT RESOLUTION
// ================================================================
// o: { crit, kb, ox, oy, stun, shadow (dealt by a shadow), indirect (explosion / chain / nova), chained }
function damageEnemy(e, dmg, o = {}) {
  if (!e.alive || e.spawnT > 0) return;
  const direct = !o.shadow && !o.indirect;
  let isCrit = o.crit ?? (Math.random() < pCrit());
  if (direct && player.perfect) { isCrit = true; player.perfect = false; }
  const fd = Math.max(1, Math.floor(dmg * (isCrit ? pCritMult() : 1) * rand(0.93, 1.07)));
  e.hp -= fd; e.hitFlash = 0.12;
  if (!e.isBoss) {
    e.stun = Math.max(e.stun, o.stun ?? 0.12);
    if (o.kb) {
      const a = Math.atan2(e.y - (o.oy ?? player.y), e.x - (o.ox ?? player.x));
      e.kx += Math.cos(a)*o.kb; e.ky += Math.sin(a)*o.kb;
      // heavy hits interrupt a windup — and cancel whatever it was telegraphing
      if (e.state === 'wind' && e.kind !== 'bomber' && o.kb >= 300) { e.state = 'chase'; e.cd = 0.5; telegraphs = telegraphs.filter(g => g.owner !== e); }
    }
  }
  floatText(e.x, e.y-e.size-8, isCrit ? `${fmtNum(fd)}!` : fmtNum(fd), o.shadow ? '#bb88ff' : isCrit ? '#ffcc00' : '#ffffff', isCrit ? 24 : o.shadow ? 13 : 16);
  spawnBurst(e.x, e.y, isCrit ? '#ffee88' : e.color, isCrit ? 9 : 4, isCrit ? 380 : 240);
  playSfx(isCrit ? 'crit' : 'hit');
  if (direct) {
    gainUlt(isCrit ? 1.3 : 0.7);
    const leech = 0.01*tr('leech') + 0.02*bn('vamp');
    if (leech) healPlayer(fd*leech);
    if (bn('chain')) {
      let t = null, td = 190;
      for (const en of enemies) { if (en === e || !en.alive || en.spawnT > 0) continue; const d = dist(e.x, e.y, en.x, en.y); if (d < td) { t = en; td = d; } }
      if (t) { bolt(e.x, e.y, t.x, t.y, '#aaddff'); damageEnemy(t, fd*(0.2+0.2*bn('chain')), { crit:false, indirect:true, chained:true }); }
    }
  }
  if (e.hp <= 0) killEnemy(e, o);
}

function killEnemy(e, o = {}) {
  if (!e.alive) return;
  e.alive = false; e.hp = 0;
  if (!o.quiet) playSfx('kill');
  spawnBurst(e.x, e.y, e.color, e.isBoss ? 80 : 20, e.isBoss ? 700 : 340);
  spawnBurst(e.x, e.y, '#ffffff', 6, 200); smoke(e.x, e.y, '#110818', e.isBoss ? 16 : 4, e.size);
  ring(e.x, e.y, e.color, e.size*0.5, e.size*(e.isBoss ? 6 : 2.6), e.isBoss ? 0.8 : 0.3, e.isBoss ? 10 : 3);
  playerGainXp(e.xp);
  run.xp += e.xp; run.kills++; questProgress.kills++; highScores.totalKills++;
  comboCount++; comboTimer = 3;
  if (comboCount > run.bestCombo) run.bestCombo = comboCount;
  if (comboCount > highScores.bestCombo) highScores.bestCombo = comboCount;
  KILL_STREAKS.forEach(ks => { if (comboCount === ks.count) { toast(ks.label, ks.color, 2500, true); shake(12); } });
  gainUlt(2);
  // Drops
  const gold = Math.ceil(e.xp*0.35*(1 + 0.5*bn('greed'))*(1 + gearMod('gold'))*rand(0.8, 1.2)), n = e.isBoss ? 10 : e.elite ? 3 : 1;
  for (let i = 0; i < n; i++) orbs.push({ type:'gold', val:Math.ceil(gold/n), x:e.x, y:e.y, vx:rand(-240,240), vy:rand(-240,240), t:0 });
  if (e.elite || e.isBoss || Math.random() < 0.07) orbs.push({ type:'hp', val:0, x:e.x, y:e.y, vx:rand(-200,200), vy:rand(-200,200), t:0 });
  // Gear: a boss always drops one item, Rare or better; an elite often does; anything else rarely
  if (Math.random() < (e.isBoss ? 1 : e.elite ? 0.22 : 0.015)) dropGear(e.x, e.y, e.isBoss ? 2 : e.elite ? 1 : 0);
  // A fallen enemy sometimes leaves a shadow behind — walk over and say the word
  if (!e.isBoss && remnants.length < 4 && (e.elite || Math.random() < 0.05)) {
    remnants.push({ x:e.x, y:e.y, name:e.baseName, kind:e.kind, damage:e.damage, color:e.color, size:e.size, elite:e.elite, t:0, dur:14 });
    // Until the hunter has raised one this way, say how it is done: once a gate
    if (!player.story.arose && !run.ariseHint) { run.ariseHint = true; toast(isMobile ? 'A SHADOW LINGERS — WALK TO IT AND TAP ARISE' : 'A SHADOW LINGERS — STAND ON IT AND PRESS E', 'purple', 5000); }
  }
  const { x, y } = e;
  if (e.kind === 'bomber' && !e.detonated) { e.detonated = true; const dmg = e.damage*1.6; after(0.06, () => explodeAt(x, y, 95, dmg, false)); }
  if (bn('nova')) after(0.08, () => {
    ring(x, y, '#ff66aa', 8, 110, 0.3, 5); spawnBurst(x, y, '#ff66aa', 12, 360);
    for (const en of enemies) if (en.alive && dist(x, y, en.x, en.y) < 100+en.size) damageEnemy(en, pDamage()*0.6*bn('nova'), { crit:false, indirect:true, kb:260, ox:x, oy:y });
  });
  if (e.elite) { floatText(x, y-e.size-30, 'ELITE SLAIN', '#ffcc66', 18); shake(10); hitstop(0.06); }
  if (e.isBoss) onBossDeath(e);
}

function hurtPlayer(dmg) {
  if (!dungeon || dungeon.state !== 'fight' || player.hp <= 0) return false;
  if (player.inv > 0) {
    if (player.dodgeT > 0 && !player.perfectUsed) { player.perfectUsed = true; perfectDodge(); }
    return false;
  }
  // Standing still = compounding damage (enemies hit the same spot)
  const st = gameTime - lastMoveTime, stationaryMulti = st > 3 ? 1 + Math.min((st-3)*0.15, 2.0) : 1;
  const mitigated = dmg * 100/(100 + pDefense()*1.5); // defense is a percentage cut, so enemies stay dangerous at every rank
  const fd = Math.max(1, Math.floor(mitigated * stationaryMulti * (1 - 0.15*bn('ward')) * (player.ultT > 0 ? 0.5 : 1)));
  player.hp -= fd; player.hitFlash = 0.2; player.inv = 0.4;
  if (player.hp > 0 && player.hp < player.maxHp*0.25) say('low_hp'); else if (st > 3) say('keep_moving');
  questProgress.damageTaken += fd; highScores.damageTaken += fd; run.dmgTaken += fd;
  playSfx('hurt');
  floatText(player.x, player.y-46, `-${fmtNum(fd)}`, COLORS.danger, 18);
  shake(Math.min(16, 5 + fd/player.maxHp*60));
  spawnBurst(player.x, player.y-12, COLORS.danger, 8, 260); flash('#ff0000', 0.12);
  if (player.hp <= 0) { player.hp = 0; showDeath(); }
  return true;
}

function perfectDodge() {
  slowmo(0.3, 0.5); player.perfect = true; gainUlt(8); player.counterT = COUNTER_WINDOW;
  floatText(player.x, player.y-56, 'PERFECT DODGE — STRIKE!', COLORS.primary, 18);
  ring(player.x, player.y, COLORS.primary, 10, 130, 0.35, 4); playSfx('perfect');
}

function updateProjectiles(dt) {
  const live = [];
  for (const p of projectiles) {
    p.life -= dt; p.x += p.vx*dt; p.y += p.vy*dt;
    if (p.life <= 0 || !inMap(p.x, p.y, -40)) continue;
    if (p.fromEnemy) {
      if (dist(p.x, p.y, player.x, player.y-12) < p.size+13 && hurtPlayer(p.damage)) { spawnBurst(p.x, p.y, p.color, 6, 200); continue; }
    } else {
      for (const e of enemies) {
        if (!e.alive || e.spawnT > 0 || p.hit.has(e) || dist(p.x, p.y, e.x, e.y) > e.size+p.size) continue;
        p.hit.add(e);
        if (p.shadow) {
          damageEnemy(e, p.damage, { shadow:true, crit:false, kb:100, ox:p.x-p.vx, oy:p.y-p.vy });
          p.life = 0;
          break;
        }
        damageEnemy(e, p.damage, { kb:140, ox:p.x-p.vx, oy:p.y-p.vy });
      }
    }
    live.push(p);
  }
  projectiles = live;
}

function updateOrbs(dt) {
  const live = [];
  for (const o of orbs) {
    o.t += dt;
    const dx = player.x-o.x, dy = player.y-12-o.y, d = Math.hypot(dx,dy) || 1;
    if (o.t > 0.35 && (d < 170 || o.t > 5 || dungeon.state !== 'fight')) {
      const sp = Math.min(950, 280 + o.t*520);
      o.vx = lerp(o.vx, dx/d*sp, 0.22); o.vy = lerp(o.vy, dy/d*sp, 0.22);
      if (d < 26) {
        if (o.type === 'gold') { player.gold += o.val; run.gold += o.val; playSfx('pickup', rand(0.9,1.3)); }
        else if (o.type === 'gear') takeGear(o.item);
        else { healPlayer(player.maxHp*0.12); floatText(player.x, player.y-50, `+${fmtNum(player.maxHp*0.12)}`, COLORS.health, 15); playSfx('heal'); }
        continue;
      }
    } else { const k = Math.pow(0.02, dt); o.vx *= k; o.vy *= k; }
    o.x += o.vx*dt; o.y += o.vy*dt;
    live.push(o);
  }
  orbs = live;
}

// --- GEAR DROPS ---
// luck: 0 any enemy, 1 elite, 2 boss. The item's level is the gate's level.
function dropGear(x, y, luck = 0) {
  const item = rollGear(Math.max(1, (dungeon && dungeon.gate.reqLevel)|0), luck >= 2 ? 1 : 0, luck);
  orbs.push({ type:'gear', item, val:0, x, y, vx:rand(-200,200), vy:rand(-200,200), t:0 });
}
// A found item goes on if its slot is empty, into the bag if there is room, and is sold on the spot if there is not
function takeGear(item) {
  const slot = item.slot, name = item.name.toUpperCase(), style = ['blue','blue','purple','gold'][item.rarity];
  if (run && run.loot) run.loot.push(item);
  if (!player.gear[slot]) { player.gear[slot] = item; gearChanged(); toast(`EQUIPPED: ${name}`, style, 2600); }
  else if (player.bag.length < BAG_MAX) { player.bag.push(item); toast(`LOOT: ${name}`, style, 2600); }
  else {
    const v = gearValue(item);
    player.gold += v; if (run) run.gold += v;
    toast(`BAG FULL. SOLD ${name} FOR ◈ ${fmtNum(v)}`, 'gold', 2600);
  }
  floatText(player.x, player.y-62, item.name, GEAR_COLORS[item.rarity], 15); playSfx('boon');
  saveGame(); // a find is kept even if the page is closed mid-gate
}
// Called when a gate is cleared: nothing dropped is left behind on the floor
function sweepGear() {
  const left = orbs.filter(o => o.type === 'gear');
  if (!left.length) return;
  orbs = orbs.filter(o => o.type !== 'gear');
  left.forEach(o => takeGear(o.item));
}

function updateSpawns(dt) {
  const wait = [];
  for (const s of spawnQueue) {
    s.t -= dt;
    if (s.t > 0) { wait.push(s); continue; }
    s.o.scale = s.o.scale || 1;
    const sp = keepIn(s.x, s.y, 40), e = makeEnemy(s.def, sp.x, sp.y, s.o);
    enemies.push(e);
    ring(e.x, e.y, e.elite ? '#ffcc66' : COLORS.danger, 4, e.size*2.4, 0.5, 3); smoke(e.x, e.y, '#220011', 4, 10);
  }
  spawnQueue = wait;
}

function usePotion() {
  if (!dungeon || dungeon.state !== 'fight' || player.hp <= 0) return;
  if (player.potions <= 0) { toast('NO POTIONS — BUY MORE IN THE ARMORY', 'red', 1500); say('no_potions'); playSfx('deny'); return; }
  if (player.hp >= player.maxHp) return;
  player.potions--; healPlayer(player.maxHp*0.4);
  floatText(player.x, player.y-50, `+${fmtNum(player.maxHp*0.4)}`, COLORS.health, 20);
  ring(player.x, player.y, COLORS.health, 10, 90, 0.4, 4); spawnBurst(player.x, player.y, COLORS.health, 18, 240); playSfx('heal');
}
