'use strict';

// ================================================================
//  OVERLAY — shared 2D/3D overlays (portal, motes, minimap)
// ================================================================
const dot2 = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };

const motes = [];
for (let i = 0; i < 70; i++) motes.push({ x:Math.random(), y:Math.random(), z:rand(0.3,1), s:rand(1,2.8), ph:rand(0,9) });
function drawMotes(c1, c2, par) {
  motes.forEach((m, i) => {
    const px = (((m.x*W - camera.x*m.z*par + clock*8*m.z) % W) + W) % W, py = (((m.y*H - clock*22*m.z - camera.y*m.z*par) % H) + H) % H;
    const a = 0.1 + 0.22*m.z*(0.6 + 0.4*Math.sin(clock*2 + m.ph));
    ctx.fillStyle = i % 2 ? c1 : c2;
    ctx.globalAlpha = a; dot2(px, py, m.s);
    ctx.globalAlpha = a*0.3; dot2(px, py, m.s*3);
  });
  ctx.globalAlpha = 1;
}

// Title + hub backdrop: a gate, breathing
function drawPortal(hub) {
  if (hub) {
    const img = hub, s = Math.max(W/img.width, H/img.height), w = img.width*s, h = img.height*s;
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
    dot2(cx + Math.cos(a)*r*0.8, cy + Math.sin(a)*r, 1 + f*2.2);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

function drawMinimap() {
  const L = layout, mw = isMobile ? 90 : 130, mh = L ? Math.round(mw*0.75) : mw*arenaH/arenaW, mx = W - mw - 20, my = 60;
  const sx = L ? mw/3600 : mw/arenaW, sy = L ? sx : mh/arenaH, cx = mx + mw/2, cy = my + mh/2;
  const ox = L ? player.x : 0, oy = L ? player.y : 0; // with a layout the map is centred on the hunter
  const px = x => cx + (x-ox)*sx, py = y => cy + (y-oy)*sy;
  ctx.globalAlpha = 0.5; ctx.fillStyle = '#0a0a14'; ctx.fillRect(mx, my, mw, mh);
  ctx.strokeStyle = 'rgba(0,212,255,0.25)'; ctx.lineWidth = 1; ctx.strokeRect(mx, my, mw, mh);
  ctx.save(); ctx.beginPath(); ctx.rect(mx, my, mw, mh); ctx.clip();
  ctx.translate(cx, cy); ctx.rotate(viewYaw || 0); ctx.translate(-cx, -cy);
  if (L) {
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
  player.shadows.forEach(s => { if (s.active) dot2(px(s.x), py(s.y), 1.6); });
  enemies.forEach(e => { if (!e.alive || e.isBoss) return; ctx.fillStyle = e.elite ? '#ffcc66' : COLORS.danger; ctx.globalAlpha = 0.7; dot2(px(e.x), py(e.y), e.elite ? 2.6 : 1.8); });
  ctx.fillStyle = '#bb88ff'; ctx.globalAlpha = 0.9;
  remnants.forEach(r => dot2(px(r.x), py(r.y), 2));
  const b = dungeon.bossRef;
  if (b && b.alive) { // pulsing boss marker
    const bx = px(b.x), by = py(b.y);
    ctx.globalAlpha = 0.6 + Math.sin(clock*4)*0.3; ctx.fillStyle = '#ff2222'; dot2(bx, by, 4.5);
    ctx.strokeStyle = '#ff4444'; ctx.beginPath(); ctx.arc(bx, by, 8 + Math.sin(clock*6)*2, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = 1; ctx.fillStyle = COLORS.primary; dot2(px(player.x), py(player.y), 3);
  ctx.restore();
  // Stationary warning
  const st = gameTime - lastMoveTime;
  if (st > 3 && dungeon.state === 'fight' && enemies.some(e => e.alive)) {
    ctx.globalAlpha = 0.85; ctx.fillStyle = '#ff4444'; ctx.font = '9px Orbitron, monospace'; ctx.textAlign = 'center';
    ctx.fillText('⚠ MOVE! DMG x' + (1 + Math.min((st-3)*0.15, 2.0)).toFixed(1), cx, my + mh + 14);
    ctx.textAlign = 'left';
  }
  ctx.globalAlpha = 1;
}
