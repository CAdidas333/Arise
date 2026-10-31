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

// One soft white blob, made the first time weather is drawn
let weatherBlob = null;
function weatherSprite() {
  if (!weatherBlob) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), rg = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    rg.addColorStop(0, 'rgba(255,255,255,0.9)'); rg.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = rg; g.fillRect(0, 0, 128, 128);
    weatherBlob = c;
  }
  return weatherBlob;
}

const weather = [];
for (let i = 0; i < 48; i++) weather.push({ x:Math.random(), y:Math.random(), z:rand(0.4,1), ph:rand(0,TAU), s:rand(0.6,1.6) });
function drawWeather(id, par) {
  if (id === 'e_gate') { // water drips off the cave roof
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#9fe8a8';
    for (const m of weather) {
      const x = (((m.x*W - camera.x*m.z*par) % W) + W) % W, y = (((m.y*H + clock*(220 + m.z*260) - camera.y*m.z*par) % H) + H) % H;
      ctx.globalAlpha = 0.08 + 0.14*m.z; ctx.fillRect(x, y, 1, 5 + m.s*7);
    }
  } else if (id === 'd_gate') { // grey ash flakes drift sideways
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#cfcfcf';
    for (const m of weather) {
      const x = (((m.x*W + clock*(14 + m.z*20) - camera.x*m.z*par) % W) + W) % W, y = (((m.y*H + clock*(26 + m.z*34) - camera.y*m.z*par) % H) + H) % H;
      ctx.globalAlpha = 0.12 + 0.2*m.z; dot2(x, y, m.s*0.9);
    }
  } else if (id === 'c_gate') { // low violet-grey fog drifts across the lower half
    ctx.globalCompositeOperation = 'source-over';
    const img = weatherSprite(), span = W*1.6;
    for (let i = 0; i < 5; i++) {
      const m = weather[i], x = ((((m.x*W + clock*(8 + m.z*10) - camera.x*m.z*par) % span) + span) % span) - W*0.3;
      const w = W*(0.35 + m.z*0.2), h = H*(0.16 + m.z*0.12);
      ctx.globalAlpha = 0.05 + m.z*0.06; ctx.drawImage(img, x - w/2, H*(0.6 + m.y*0.34) - h/2, w, h);
    }
  } else if (id === 'b_gate') { // embers rise and flicker, warm glow along the floor
    ctx.globalCompositeOperation = 'lighter';
    for (const m of weather) {
      const x = (((m.x*W + Math.sin(clock*1.6 + m.ph)*22*m.z - camera.x*m.z*par) % W) + W) % W, y = (((m.y*H - clock*(180 + m.z*280) - camera.y*m.z*par) % H) + H) % H;
      const f = 0.5 + 0.5*Math.sin(clock*(7 + m.z*6) + m.ph);
      ctx.globalAlpha = (0.16 + 0.3*m.z)*f; ctx.fillStyle = m.z > 0.7 ? '#ffaa33' : '#ff5522';
      dot2(x, y, m.s*(0.8 + f*0.8));
    }
    const img = weatherSprite();
    for (let i = 0; i < 5; i++) {
      const m = weather[i], w = W*(0.5 + m.z*0.3), h = H*(0.16 + m.z*0.1);
      ctx.globalAlpha = 0.05 + 0.05*(0.5 + 0.5*Math.sin(clock*1.5 + m.ph));
      ctx.drawImage(img, W*(i/4) + Math.sin(clock*0.7 + m.ph)*20 - w/2, H - h*0.5, w, h);
    }
  } else if (id === 'a_gate') { // gold cinders fall slowly, swaying
    ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = '#ffcc55';
    for (const m of weather) {
      const x = (((m.x*W + Math.sin(clock*0.9 + m.ph)*26*m.z - camera.x*m.z*par) % W) + W) % W, y = (((m.y*H + clock*(30 + m.z*46) - camera.y*m.z*par) % H) + H) % H;
      ctx.globalAlpha = 0.14 + 0.24*m.z; dot2(x, y, m.s*0.9);
      ctx.globalAlpha *= 0.3; dot2(x, y, m.s*3);
    }
  } else if (id === 's_gate') { // cold pale-blue dust hangs, faint mist low
    ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = '#a9d4ee';
    for (const m of weather) {
      const x = (((m.x*W + Math.sin(clock*0.5 + m.ph)*14*m.z - camera.x*m.z*par) % W) + W) % W, y = (((m.y*H + Math.sin(clock*0.4 + m.ph)*10*m.z - camera.y*m.z*par) % H) + H) % H;
      ctx.globalAlpha = 0.1 + 0.18*m.z; dot2(x, y, m.s*0.8);
    }
    const img = weatherSprite(), span = W*1.6;
    for (let i = 0; i < 5; i++) {
      const m = weather[i], x = ((((m.x*W + clock*(6 + m.z*8) - camera.x*m.z*par) % span) + span) % span) - W*0.3;
      const w = W*(0.4 + m.z*0.2), h = H*(0.14 + m.z*0.1);
      ctx.globalAlpha = 0.05 + m.z*0.04; ctx.drawImage(img, x - w/2, H*(0.68 + m.y*0.26) - h/2, w, h);
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
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

// Where the minimap sits: dropped 10px on upright phones so the boss name above it never crowds it
function minimapBox() {
  const L = layout, mw = isMobile ? 90 : 130, mh = L ? Math.round(mw*0.75) : mw*arenaH/arenaW;
  const my = (H > W && W <= 520) ? 70 : 60, mx = W - mw - 20;
  return { x0: mx, y0: my, x1: mx + mw, y1: my + mh + 18 };
}

// An edge arrow that would land on the minimap is nudged down to just under it instead
function edgeClear(x, y) {
  const b = minimapBox();
  if (x < b.x0 - 34 || x > b.x1 || y < b.y0 || y > b.y1 + 34) return [x, y];
  return [Math.min(x, W - 70), b.y1 + 40];
}
function drawMinimap() {
  const L = layout, box = minimapBox(), mx = box.x0, my = box.y0, mw = box.x1 - box.x0, mh = box.y1 - box.y0 - 18;
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
  rewardBoxes.forEach(b => { if (b.open < 0) { ctx.fillStyle = COLORS.primary; ctx.globalAlpha = 0.9; ctx.fillRect(px(b.x) - 2, py(b.y) - 2, 4, 4); } }); // unopened reward boxes
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
