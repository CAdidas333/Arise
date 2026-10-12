'use strict';

// ================================================================
//  RENDERING — effects, lighting, overlays
// ================================================================
const motes = [];
for (let i = 0; i < 70; i++) motes.push({ x:Math.random(), y:Math.random(), z:rand(0.3,1), s:rand(1,2.8), ph:rand(0,9) });
function drawMotes(c1, c2, par) {
  motes.forEach((m, i) => {
    const px = (((m.x*W - camera.x*m.z*par + clock*8*m.z) % W) + W) % W, py = (((m.y*H - clock*22*m.z - camera.y*m.z*par) % H) + H) % H;
    const a = 0.1 + 0.22*m.z*(0.6 + 0.4*Math.sin(clock*2 + m.ph));
    ctx.fillStyle = i % 2 ? c1 : c2;
    ctx.globalAlpha = a; disc(px, py, m.s);
    ctx.globalAlpha = a*0.3; disc(px, py, m.s*3);
  });
  ctx.globalAlpha = 1;
}

// Title + hub backdrop: a gate, breathing
function drawPortal() {
  if (ART.hub) {
    const img = ART.hub, s = Math.max(W/img.width, H/img.height), w = img.width*s, h = img.height*s;
    ctx.globalAlpha = 0.65;
    ctx.drawImage(img, (W - w)/2, (H - h)/2, w, h);
    ctx.globalAlpha = 1;
  }
  const cx = W/2, cy = H*0.5, R = Math.min(W, H)*0.36;
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R*1.7);
  g.addColorStop(0, 'rgba(70,24,160,0.6)'); g.addColorStop(0.45, 'rgba(0,90,160,0.18)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = i % 2 ? 'rgba(0,212,255,0.22)' : 'rgba(136,68,255,0.3)'; ctx.lineWidth = 1.5 + i;
    ctx.beginPath(); ctx.ellipse(cx, cy, R*(0.45 + i*0.12), R*(0.6 + i*0.14), clock*(0.14 + i*0.05)*(i % 2 ? 1 : -1), 0, TAU*0.82); ctx.stroke();
  }
  for (let i = 0; i < 90; i++) { // matter spiralling into the gate
    const f = (clock*0.09 + i/90) % 1, r = R*1.25*(1-f), a = i*2.399 + clock*0.5 + f*5;
    ctx.globalAlpha = f*0.8; ctx.fillStyle = i % 3 ? '#8844ff' : '#00d4ff';
    disc(cx + Math.cos(a)*r*0.8, cy + Math.sin(a)*r, 1 + f*2.2);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

// Which hunter drawing to use, and how big: the full body, or the classic stick figure (Controls tab, "Hunter look")
const hunterLook = () => settings.hunter === 'classic' ? [drawHunterClassic, 1.15] : [drawHunter, 1.35];

function drawPlayer() {
  if (dungeon.state === 'dead') return;
  const ult = player.ultT > 0, wc = WEAPONS[player.weapon].color;
  ctx.globalAlpha = 0.4; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(player.x, player.y + 14, 16, 6, 0, 0, TAU); ctx.fill();
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'lighter';
  const R = ult ? 120 : 64, g = ctx.createRadialGradient(player.x, player.y-12, 0, player.x, player.y-12, R);
  g.addColorStop(0, ult ? 'rgba(136,68,255,0.5)' : 'rgba(0,212,255,0.17)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(player.x-R, player.y-12-R, R*2, R*2);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = player.inv > 0 && player.dodgeT <= 0 && player.hitFlash <= 0 ? 0.5 + Math.sin(clock*40)*0.3 : 1;
  const [hunterFn, hunterScale] = hunterLook();
  hunterFn(player.x, player.y, { face:player.facing.x, anim:player.anim, t:player.animT, scale:hunterScale,
    color:player.hitFlash > 0 ? COLORS.danger : ult ? '#cc88ff' : COLORS.primary, body:ult ? '#14062a' : '#0b1020',
    blade:ult ? '#dd88ff' : wc, eye:ult ? '#ff66ff' : '#aaeeff', cape:ult ? '#1a0633' : '#0a0a18',
    atkP:player.atkT > 0 ? 1 - player.atkT/player.atkDur : 0, atkDir:player.atkDir });
  ctx.globalAlpha = 1;
}

function drawWorld() {
  const z = camera.zoom, sh = camera.shake;
  ctx.save();
  ctx.translate(W/2 + (sh ? rand(-sh, sh) : 0), H/2 + (sh ? rand(-sh, sh) : 0));
  ctx.scale(z, z); ctx.translate(-camera.x, -camera.y);
  const vw = W/z/2 + 60, vh = H/z/2 + 60, vx0 = camera.x-vw, vx1 = camera.x+vw, vy0 = camera.y-vh, vy1 = camera.y+vh;
  const vis = (x, y, r = 0) => x+r > vx0 && x-r < vx1 && y+r > vy0 && y-r < vy1;

  drawArena(vx0, vy0, vx1, vy1);
  if (layout) { ctx.save(); ctx.beginPath(); for (const r of mapRects()) ctx.rect(r.x0, r.y0, r.x1-r.x0, r.y1-r.y0); ctx.clip(); telegraphs.forEach(drawTelegraph); ctx.restore(); } // warnings stay on the floor, never on the black outside a room
  else telegraphs.forEach(drawTelegraph);
  for (const r of rings) {
    const p = r.t/r.dur, rad = lerp(r.r0, r.r1, 1 - (1-p)*(1-p));
    ctx.globalAlpha = 1-p; ctx.strokeStyle = r.color; ctx.lineWidth = r.w*(1-p) + 1;
    ctx.beginPath(); ctx.arc(r.x, r.y, Math.max(1, rad), 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  drawPickups();
  for (const p of particles) if (p.type === 'smoke') { const k = p.life/p.max; ctx.globalAlpha = p.alpha*k; ctx.fillStyle = p.color; disc(p.x, p.y, p.size*(1.7 - k*0.7)); }
  const gc = player.ultT > 0 ? '#bb66ff' : COLORS.primary;
  const [hunterFn, hunterScale] = hunterLook();
  for (const g of ghosts) { ctx.globalAlpha = (1 - g.t/g.dur)*0.45; hunterFn(g.x, g.y, { face:g.fx, anim:g.anim, t:g.animT, scale:hunterScale, color:gc, body:gc, cape:gc }); }
  ctx.globalAlpha = 1;
  player.shadows.forEach(s => { if (s.active && vis(s.x, s.y, 40)) drawShadowSoldier(s); });
  enemies.forEach(e => { if (e.alive && vis(e.x, e.y, e.size*2.5)) drawEnemy(e); });
  drawPlayer();

  // Everything that glows is drawn additively
  ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round';
  for (const p of projectiles) {
    if (!vis(p.x, p.y, 60)) continue;
    if (p.crescent) {
      ctx.strokeStyle = p.color; ctx.globalAlpha = Math.min(1, p.life*4); ctx.lineWidth = 9;
      ctx.beginPath(); ctx.arc(p.x - Math.cos(p.a)*p.size, p.y - Math.sin(p.a)*p.size, p.size*1.2, p.a - 0.9, p.a + 0.9); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5; ctx.stroke();
    } else {
      ctx.fillStyle = p.color; ctx.globalAlpha = 0.3; disc(p.x, p.y, p.size*2.6);
      ctx.globalAlpha = 1; disc(p.x, p.y, p.size); ctx.fillStyle = '#ffffff'; disc(p.x, p.y, p.size*0.45);
    }
  }
  for (const a of arcs) { // slash crescents
    const p = a.t/a.dur, sweep = a.span*Math.min(1, p*2.4), s0 = a.a - a.dir*a.span/2, s1 = s0 + a.dir*sweep, lo = Math.min(s0, s1), hi = Math.max(s0, s1), al = 1-p;
    ctx.strokeStyle = a.color; ctx.globalAlpha = al*0.35; ctx.lineWidth = a.w*1.7;
    ctx.beginPath(); ctx.arc(a.x, a.y, a.r*0.76, lo, hi); ctx.stroke();
    ctx.globalAlpha = al*0.9; ctx.lineWidth = a.w*(1-p) + 1;
    ctx.beginPath(); ctx.arc(a.x, a.y, a.r*0.86, lo, hi); ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = al; ctx.lineWidth = a.w*(1-p)*0.35 + 1;
    ctx.beginPath(); ctx.arc(a.x, a.y, a.r*0.92, lo, hi); ctx.stroke();
  }
  for (const b of bolts) {
    const al = 1 - b.t/b.dur;
    ctx.beginPath(); b.pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
    ctx.strokeStyle = b.color; ctx.globalAlpha = al*0.6; ctx.lineWidth = 5; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.globalAlpha = al; ctx.lineWidth = 1.5; ctx.stroke();
  }
  for (const p of particles) {
    if (p.type === 'smoke' || !vis(p.x, p.y, 20)) continue;
    const k = p.life/p.max; ctx.globalAlpha = p.alpha*k;
    if (p.type === 'spark') { ctx.strokeStyle = p.color; ctx.lineWidth = p.size*0.7; line(p.x, p.y, p.x - p.vx*0.045, p.y - p.vy*0.045); }
    else { ctx.fillStyle = p.color; disc(p.x, p.y, p.size*(0.4 + 0.6*k)); ctx.globalAlpha *= 0.28; disc(p.x, p.y, p.size*2.6); }
  }
  ctx.globalCompositeOperation = 'source-over';

  ctx.textAlign = 'center'; ctx.lineJoin = 'round';
  for (const t of texts) {
    const pop = 1 + 0.6*Math.max(0, 1 - t.t/0.12);
    ctx.globalAlpha = Math.min(1, (t.dur - t.t)/0.3);
    ctx.font = `bold ${Math.round(t.size*pop)}px Orbitron, monospace`;
    ctx.strokeStyle = 'rgba(0,0,0,0.85)'; ctx.lineWidth = 3; ctx.strokeText(t.text, t.x, t.y);
    ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1; ctx.textAlign = 'left';
  ctx.restore();
}

function drawPost() {
  // The dark presses in; light follows the hunter
  const px = W/2 + (player.x-camera.x)*camera.zoom, py = H/2 + (player.y-camera.y)*camera.zoom, R = Math.max(W, H);
  const hpPct = player.hp/player.maxHp, low = hpPct < 0.3;
  vignetteIntensity = lerp(vignetteIntensity, low ? 0.78 : 0.52, 0.05);
  const vg = ctx.createRadialGradient(px, py, R*0.16, px, py, R*0.75);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, `rgba(${low ? '50,0,0' : player.ultT > 0 ? '22,0,48' : '0,0,6'},${vignetteIntensity})`);
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = 'lighter'; drawMotes(floorTheme.ember, floorTheme.line, 0.5); ctx.globalCompositeOperation = 'source-over';
  if (hpPct < 0.25 && player.hp > 0) { ctx.globalAlpha = (Math.sin(clock*4)*0.5 + 0.5)*0.14; ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}

function drawMinimap() {
  const L = layout, mw = isMobile ? 90 : 130, mh = L ? Math.round(mw*0.75) : mw*arenaH/arenaW, mx = W - mw - 20, my = 60;
  const sx = L ? mw/3600 : mw/arenaW, sy = L ? sx : mh/arenaH, cx = mx + mw/2, cy = my + mh/2;
  const ox = L ? player.x : 0, oy = L ? player.y : 0; // with a layout the map is centred on the hunter
  const px = x => cx + (x-ox)*sx, py = y => cy + (y-oy)*sy;
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#0a0a14'; ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = 'rgba(0,212,255,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(mx, my, mw, mh);
  if (L) {
    ctx.save(); ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
    L.rects.forEach(r => {
      ctx.globalAlpha = 1;
      if (r.kind === 'hall') ctx.fillStyle = 'rgba(255,255,255,0.07)';
      else if (r.i === L.lock) ctx.fillStyle = 'rgba(255,60,80,0.32)';
      else if (r.i <= L.cleared) ctx.fillStyle = 'rgba(0,212,255,0.22)';
      else ctx.fillStyle = 'rgba(255,255,255,0.11)';
      ctx.fillRect(px(r.x0), py(r.y0), (r.x1-r.x0)*sx, (r.y1-r.y0)*sy);
    });
    if (dungeon.wave >= dungeon.maxWaves) {
      ctx.fillStyle = '#ffcc33';
      ctx.globalAlpha = 0.6 + 0.4*Math.sin(clock*5);
      ctx.fillRect(px(L.exit.x) - 2.5, py(L.exit.y) - 2.5, 5, 5);
    }
  }
  ctx.fillStyle = COLORS.accent; ctx.globalAlpha = 0.6;
  player.shadows.forEach(s => { if (s.active) disc(px(s.x), py(s.y), 1.6); });
  enemies.forEach(e => { if (!e.alive || e.isBoss) return; ctx.fillStyle = e.elite ? '#ffcc66' : COLORS.danger; ctx.globalAlpha = 0.7; disc(px(e.x), py(e.y), e.elite ? 2.6 : 1.8); });
  ctx.fillStyle = '#bb88ff'; ctx.globalAlpha = 0.9;
  remnants.forEach(r => disc(px(r.x), py(r.y), 2));
  const b = dungeon.bossRef;
  if (b && b.alive) { // pulsing boss marker
    const bx = px(b.x), by = py(b.y);
    ctx.globalAlpha = 0.6 + Math.sin(clock*4)*0.3; ctx.fillStyle = '#ff2222'; disc(bx, by, 4.5);
    ctx.strokeStyle = '#ff4444'; ctx.beginPath(); ctx.arc(bx, by, 8 + Math.sin(clock*6)*2, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.fillStyle = COLORS.primary; disc(px(player.x), py(player.y), 3);
  if (L) ctx.restore();
  // Stationary warning
  const st = gameTime - lastMoveTime;
  if (st > 3 && dungeon.state === 'fight' && enemies.some(e => e.alive)) {
    ctx.globalAlpha = 0.85; ctx.fillStyle = '#ff4444'; ctx.font = '9px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.fillText('⚠ MOVE! DMG x' + (1 + Math.min((st-3)*0.15, 2.0)).toFixed(1), cx, my + mh + 14);
    ctx.textAlign = 'left';
  }
  ctx.globalAlpha = 1;
}

// Edge-of-screen arrow: the boss you are hunting, or the way to the next chamber
function drawIndicators() {
  const b = dungeon.bossRef;
  let tx, ty, col = '#ff3344';
  if (dungeon.state !== 'fight') return;
  if (b && b.alive) { tx = b.x; ty = b.y; }
  else if (layout && layout.lock < 0) {
    // Between chambers: the door out of the chamber the hunter stands in, then the next chamber, and at the end the way to the boss
    const k = dungeon.wave - 1, d = layout.doors[2*k], boss = dungeon.wave >= dungeon.maxWaves;
    if (roomAt(player.x, player.y) === k) { tx = (d.x0+d.x1)/2; ty = (d.y0+d.y1)/2; }
    else if (boss) { tx = layout.exit.x; ty = layout.exit.y; }
    else { const r = layout.rooms[dungeon.wave]; tx = (r.x0+r.x1)/2; ty = (r.y0+r.y1)/2; }
    col = boss ? '#ffcc33' : COLORS.primary;
  } else return;
  const dx = (tx-camera.x)*camera.zoom, dy = (ty-camera.y)*camera.zoom;
  if (Math.abs(dx) < W/2 - 30 && Math.abs(dy) < H/2 - 30) return;
  const a = Math.atan2(dy, dx), m = 70, k = Math.min((W/2-m)/Math.abs(Math.cos(a) || 1e-6), (H/2-m)/Math.abs(Math.sin(a) || 1e-6));
  const ix = W/2 + Math.cos(a)*k, iy = H/2 + Math.sin(a)*k;
  ctx.save(); ctx.translate(ix, iy);
  ctx.globalAlpha = 0.7 + 0.3*Math.sin(clock*6); ctx.fillStyle = col;
  ctx.font = 'bold 11px Orbitron, monospace'; ctx.textAlign = 'center';
  ctx.fillText(Math.round(dist(player.x, player.y, tx, ty)/10) + 'm', 0, -22);
  ctx.rotate(a); ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-8, -10); ctx.lineTo(-3, 0); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill();
  ctx.restore(); ctx.textAlign = 'left';
}

function draw() {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, W, H);
  if (gameState === 'DUNGEON' && player && dungeon) { drawWorld(); drawPost(); drawMinimap(); drawIndicators(); }
  else { drawPortal(); drawMotes(COLORS.primary, COLORS.accent, 0); }
  if (screenFlash.alpha > 0) { ctx.globalAlpha = Math.min(1, screenFlash.alpha); ctx.fillStyle = screenFlash.color; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
}
