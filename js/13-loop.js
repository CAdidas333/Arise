'use strict';

// ================================================================
//  UPDATE — everything is in seconds, so 60Hz and 120Hz play the same
// ================================================================
function updatePlayer(dt) {
  // Movement (keyboard + touch joystick)
  let dx = 0, dy = 0;
  if (keys['w'] || keys['arrowup']) dy -= 1;
  if (keys['s'] || keys['arrowdown']) dy += 1;
  if (keys['a'] || keys['arrowleft']) dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;
  if (touchJoystick.active) { dx += touchJoystick.dx; dy += touchJoystick.dy; }
  if (viewYaw) { const c = Math.cos(viewYaw), s = Math.sin(viewYaw), rx = dx*c + dy*s; dy = -dx*s + dy*c; dx = rx; } // 3D view: "up" means away from the camera
  const mag = Math.hypot(dx, dy);
  if (mag > 0.12) {
    dx /= mag; dy /= mag; moveDir.x = dx; moveDir.y = dy; player.moving = true;
    if (player.dodgeT <= 0) { const sp = pSpeed() * Math.min(1, mag) * (player.atkT > 0 ? 0.55 : 1); movePlayerTo(player.x + dx*sp*dt, player.y + dy*sp*dt); }
  } else { moveDir.x = moveDir.y = 0; player.moving = false; }
  if (player.dodgeT > 0) {
    player.dodgeT -= dt; movePlayerTo(player.x + player.ddx*760*dt, player.y + player.ddy*760*dt);
    player.ghostAcc += dt; if (player.ghostAcc > 0.035) { player.ghostAcc = 0; ghost(player.x, player.y); }
  }
  // Track movement — standing still gets punished
  if (dist(player.x, player.y, lastMovePos.x, lastMovePos.y) > 15) { lastMovePos = { x:player.x, y:player.y }; lastMoveTime = gameTime; }

  // Facing: the direction you move (keys / joystick), or the pointer when mouse aim is active
  if (!mouseAiming()) { if (player.moving && (!isMobile || player.atkT <= 0)) player.facing = { x:dx, y:dy }; }
  else {
    const m = mouseWorld(), mdx = m.x - player.x, mdy = m.y - (player.y-12), ml = Math.hypot(mdx, mdy);
    if (ml > 30) player.facing = { x:mdx/ml, y:mdy/ml }; else if (player.moving) player.facing = { x:dx, y:dy };
  }

  player.animT += dt;
  if (player.atkT > 0) player.atkT -= dt;
  if (player.atkT <= 0) player.anim = player.dodgeT > 0 ? 'dash' : player.moving ? 'run' : 'idle';
  if (player.inv > 0) player.inv -= dt;
  if (player.hitFlash > 0) player.hitFlash -= dt;
  if (player.dodgeCd > 0) player.dodgeCd -= dt;
  if (player.comboWin > 0) { player.comboWin -= dt; if (player.comboWin <= 0) player.combo = 0; }
  for (const id in player.cds) if (player.cds[id] > 0) player.cds[id] -= dt;
  if (player.ultT > 0) {
    player.ultT -= dt;
    if (Math.random() < 40*dt) spawnParticle(player.x + rand(-14,14), player.y - rand(0,40), Math.random() < 0.5 ? '#bb66ff' : '#5522cc', { vx:rand(-25,25), vy:rand(-160,-60), size:rand(3,7), life:rand(0.4,0.8) });
    if (player.ultT <= 0) { toast('THE AWAKENING FADES', 'purple', 1500); ring(player.x, player.y, '#bb66ff', 120, 10, 0.4, 4); }
  }
  // Regen
  player.hp = Math.min(player.maxHp, player.hp + player.stats.VIT*0.05*dt);
  player.mp = Math.min(player.maxMp, player.mp + (1.5 + player.stats.INT*0.25) * (1 + 0.15*tr('flow')) * (1 + 0.6*bn('mana')) * dt);
  if (comboTimer > 0) { comboTimer -= dt; if (comboTimer <= 0) comboCount = 0; }

  // Hold-to-attack
  if ((mouse.down || touchAttack || keys['x'] || keys['j']) && (player.cds.slash || 0) <= 0) useSkill(SKILL.slash);

  if (remnants.length) { for (const r of remnants) r.t += dt; remnants = remnants.filter(r => r.t < r.dur); }
  if (player.moving && Math.random() < 12*dt) spawnParticle(player.x, player.y + 10, COLORS.primary, { vx:-dx*30, vy:-dy*30, size:rand(1,3), alpha:0.3, life:0.5 });
}

function updateCamera(dt) {
  const f = camera.focus, tx = f ? f.x : player.x + player.facing.x*24, ty = f ? f.y : player.y + player.facing.y*24;
  const k = 1 - Math.exp(-(f ? 3.5 : 7)*dt);
  camera.x += (tx - camera.x)*k; camera.y += (ty - camera.y)*k;
  camera.zoom += (camera.targetZoom - camera.zoom)*(1 - Math.exp(-4*dt));
}

function runTimers(dtGame, dtReal) {
  if (!timers.length) return;
  const list = timers; timers = [];
  for (const t of list) { t.t -= t.real ? dtReal : dtGame; if (t.t <= 0) t.fn(); else timers.push(t); }
  if (gameState !== 'DUNGEON') timers = [];
}

function step(raw) {
  clock += raw;
  if (gameState !== 'DUNGEON' || !player || !dungeon) { updateFx(raw); return; }
  if (paused) return;
  if (hitStop > 0) { hitStop -= raw; return; } // freeze-frame on heavy hits
  if (slowT > 0) { slowT -= raw; if (slowT <= 0) timeScale = 1; }
  const dt = raw*timeScale;
  runTimers(dt, raw);
  if (!dungeon) return;
  if (dungeon.state === 'intro') updateIntro(raw);
  if (dungeon.state === 'fight') {
    gameTime += dt; run.time += dt;
    updatePlayer(dt); updateSpawns(dt); updateEnemies(dt); updateTelegraphs(dt); updateProjectiles(dt); updateShadows(dt);
    if (dungeon.state === 'fight') {
      if (dungeon.wait > 0) { dungeon.wait -= dt; if (dungeon.wait <= 0) spawnWave(); }
      else checkWave();
    }
  }
  if (dungeon.state !== 'boon' && dungeon.state !== 'intro') updateOrbs(dt);
  updateFx(dt);
  updateCamera(raw);
  // Music follows the fight
  const heat = (dungeon.alive || 0)/14 + comboCount/30 + (player.ultT > 0 ? 0.4 : 0) + (dungeon.bossRef ? 0.5 : 0);
  musicIntensity = lerp(musicIntensity, clamp(heat, 0.2, 1), 0.02);
}

// ================================================================
//  GAME LOOP
// ================================================================
// Open the page with #debug to poke at internals from the console
if (location.hash === '#debug') window.__arise = {
  get player() { return player; }, get dungeon() { return dungeon; }, get enemies() { return enemies; }, get run() { return run; },
  get gameState() { return gameState; }, get particles() { return particles; }, get remnants() { return remnants; }, get telegraphs() { return telegraphs; },
  GATE_DEFS, ENDLESS, SKILL, startDungeon, step, useSkill, damageEnemy, chooseBoon, returnToHub, addShadow, tryArise, dodge, hurtPlayer, makeEnemy, saveGame,
};

let lastTime = performance.now(), loopErr = 0;
function gameLoop(now) {
  const raw = Math.min((now - lastTime)/1000, 0.05);
  lastTime = now;
  try { step(raw); draw(); updateHUD(); }
  catch (err) { if (loopErr++ < 5) console.error('[ARISE]', err); }
  requestAnimationFrame(gameLoop);
}
requestAnimationFrame(gameLoop);
