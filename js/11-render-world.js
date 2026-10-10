'use strict';

// ================================================================
//  RENDERING — world
// ================================================================
let floorPat = null, floorTheme = GATE_DEFS[0].theme, floorSides = 6;
const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
const disc = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };

const ART = {};
function loadArt(key, src) {
  const img = new Image();
  img.onload = () => {
    ART[key] = img;
    if (dungeon && dungeon.gate.id === key) buildFloor(dungeon.gate);
  };
  img.src = src;
}
GATE_DEFS.forEach(g => loadArt(g.id, 'assets/floors/' + (g.floor || g.id) + '.webp')); // g.floor names a regenerated tile; new art always gets a new file name
loadArt('hub', 'assets/bg/hub.webp');

// Each gate gets its own floor, painted once into a repeating tile
function buildFloor(g) {
  const th = g.theme;
  if (ART[g.id]) {
    floorPat = ctx.createPattern(ART[g.id], 'repeat');
    floorPat.setTransform(new DOMMatrix().scale(0.6)); // draw the tile smaller so the ground detail suits the hunter's size
  } else {
    const oc = document.createElement('canvas'), ts = 60, n = 8;
  oc.width = oc.height = ts*n;
  const c = oc.getContext('2d');
  for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) {
    c.fillStyle = (x+y) % 2 ? th.a : th.b; c.fillRect(x*ts, y*ts, ts, ts);
    c.fillStyle = `rgba(255,255,255,${Math.random()*0.03})`; c.fillRect(x*ts, y*ts, ts, ts);
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(x*ts, y*ts, ts, 1.5); c.fillRect(x*ts, y*ts, 1.5, ts);
  }
  c.strokeStyle = th.line; c.lineWidth = 1;
  for (let i = 0; i < 16; i++) { // cracks
    c.globalAlpha = rand(0.05, 0.14); c.beginPath();
    let x = rand(0, ts*n), y = rand(0, ts*n); c.moveTo(x, y);
    for (let k = 0; k < 5; k++) { x += rand(-34, 34); y += rand(-34, 34); c.lineTo(x, y); }
    c.stroke();
  }
  for (let i = 0; i < 5; i++) { // marked tiles — a plain inset diamond
    const x = randInt(0, n-1)*ts + ts/2, y = randInt(0, n-1)*ts + ts/2;
    c.globalAlpha = 0.16; c.beginPath(); c.moveTo(x, y-18); c.lineTo(x+18, y); c.lineTo(x, y+18); c.lineTo(x-18, y); c.closePath(); c.stroke();
  }
    floorPat = ctx.createPattern(oc, 'repeat');
  }
  floorTheme = th; floorSides = GATE_DEFS.indexOf(g) % 2 ? 8 : 6;
}

function drawArena(vx0, vy0, vx1, vy1) {
  const hw = arenaW/2, hh = arenaH/2, th = floorTheme;
  const x0 = Math.max(vx0, -hw), y0 = Math.max(vy0, -hh), x1 = Math.min(vx1, hw), y1 = Math.min(vy1, hh);
  if (x1 > x0 && y1 > y0 && floorPat) { ctx.fillStyle = floorPat; ctx.fillRect(x0, y0, x1-x0, y1-y0); }
  // The gate circle at the heart of the arena: nested rings, four orbiting circles and a turning polygon.
  // Deliberately no star shapes of any kind (no pentagram / hexagram).
  ctx.save();
  ctx.strokeStyle = th.line; ctx.lineWidth = 2; ctx.globalAlpha = 0.12 + 0.04*Math.sin(clock*1.5);
  const ringAt = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke(); };
  ringAt(0, 0, 280); ringAt(0, 0, 268); ringAt(0, 0, 130); ringAt(0, 0, 56);
  ctx.save(); ctx.rotate(clock*0.06);
  ctx.beginPath();
  for (let i = 0; i < 48; i++) { const a = i*TAU/48, r0 = i % 4 ? 258 : 246; ctx.moveTo(Math.cos(a)*r0, Math.sin(a)*r0); ctx.lineTo(Math.cos(a)*268, Math.sin(a)*268); }
  ctx.stroke();
  for (let i = 0; i < 4; i++) {
    const a = i*TAU/4, x = Math.cos(a)*205, y = Math.sin(a)*205;
    ringAt(x, y, 26); ringAt(x, y, 8);
    ctx.beginPath(); ctx.arc(0, 0, 205, a + 0.2, a + TAU/4 - 0.2); ctx.stroke();
  }
  ctx.restore();
  ctx.rotate(-clock*0.09);
  const sides = floorSides, ap = 130*Math.cos(Math.PI/sides);
  ctx.beginPath(); for (let i = 0; i <= sides; i++) { const a = i*TAU/sides; ctx.lineTo(Math.cos(a)*130, Math.sin(a)*130); } ctx.stroke();
  ctx.beginPath(); for (let i = 0; i < sides; i++) { const a = (i+0.5)*TAU/sides; ctx.moveTo(Math.cos(a)*56, Math.sin(a)*56); ctx.lineTo(Math.cos(a)*ap, Math.sin(a)*ap); } ctx.stroke();
  ctx.restore();
  // Walls
  ctx.save();
  ctx.strokeStyle = th.line; ctx.lineWidth = 3; ctx.globalAlpha = 0.55 + 0.15*Math.sin(clock*2);
  ctx.shadowColor = th.line; ctx.shadowBlur = 22;
  ctx.strokeRect(-hw, -hh, arenaW, arenaH);
  ctx.restore();
}

// The hunter — also used, darker, for every shadow soldier
// o: { face, anim, t, scale, color, body, blade, eye, cape, atkP, atkDir }
function drawHunter(x, y, o) {
  const s = o.scale || 1, t = o.t, ga = ctx.globalAlpha, S = Math.sin, C = Math.cos;
  let lA = 0.2, rA = -0.3, lL = 0, rL = 0, lean = 0, bob = 0, sw = -0.5;
  if (o.anim === 'idle') { bob = S(t*2)*1.5*s; lA = S(t*1.5)*0.08 + 0.2; rA = -S(t*1.5)*0.08 - 0.3; sw = -0.5 + S(t*1.5)*0.05; }
  else if (o.anim === 'run') { const sp = 13; lA = S(t*sp)*0.7; rA = -S(t*sp)*0.6; lL = -S(t*sp)*0.65; rL = S(t*sp)*0.65; lean = 0.14; sw = rA - 0.3; bob = -Math.abs(S(t*sp))*3*s; }
  else if (o.anim === 'attack') { const k = o.atkDir < 0 ? 1-o.atkP : o.atkP; rA = -1.5 + k*3.0; sw = rA + 0.4; lA = 0.5 - k*0.4; lean = 0.18*(1-o.atkP); lL = -0.35; rL = 0.4; }
  else if (o.anim === 'dash') { lean = 0.45; lA = -0.9; rA = 0.7; lL = -0.7; rL = 0.35; sw = -1.1; }
  ctx.save();
  ctx.translate(x, y + bob); ctx.scale(o.face < 0 ? -1 : 1, 1); ctx.rotate(lean);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const headR = 7*s, headY = -29*s, shY = -19*s, hipY = -3*s, arm = 13*s, leg = 16*s;
  if (o.cape) {
    const fast = o.anim === 'run' || o.anim === 'dash', wv = S(t*(fast ? 14 : 3))*3*s, ln = (fast ? 21 : 12)*s;
    ctx.fillStyle = o.cape; ctx.beginPath();
    ctx.moveTo(-1*s, shY - 1*s); ctx.quadraticCurveTo(-ln*0.9, shY + 6*s + wv, -ln, hipY + 8*s + wv);
    ctx.lineTo(-ln*0.35, hipY + 10*s - wv); ctx.lineTo(2*s, hipY); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = o.color; ctx.lineWidth = s; ctx.globalAlpha = ga*0.35; ctx.stroke(); ctx.globalAlpha = ga;
  }
  ctx.strokeStyle = o.color; ctx.lineWidth = 2.6*s;
  line(0, hipY, S(lL)*leg, hipY + C(lL)*leg); line(0, hipY, S(rL)*leg, hipY + C(rL)*leg);
  ctx.fillStyle = o.body || '#0b1020';
  ctx.beginPath(); ctx.moveTo(-4.5*s, shY); ctx.lineTo(4.5*s, shY); ctx.lineTo(3*s, hipY + 2*s); ctx.lineTo(-3*s, hipY + 2*s); ctx.closePath(); ctx.fill(); ctx.stroke();
  line(0, shY, S(lA)*arm, shY + C(lA)*arm);
  ctx.beginPath(); ctx.arc(0, headY, headR, 0, TAU); ctx.fill(); ctx.stroke();
  ctx.fillStyle = o.eye || o.color; ctx.fillRect(2*s, headY - 2*s, 3.4*s, 2*s);
  const rax = S(rA)*arm, ray = shY + C(rA)*arm;
  line(0, shY, rax, ray);
  if (o.blade) {
    const bl = 19*s, bx = rax + S(sw)*bl, by = ray - C(sw)*bl;
    ctx.strokeStyle = o.blade; ctx.lineWidth = 7*s; ctx.globalAlpha = ga*0.35; line(rax, ray, bx, by);
    ctx.globalAlpha = ga; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2*s; line(rax, ray, bx, by);
  }
  ctx.restore();
}

// Body silhouettes, one per archetype — drawn twice (colour, then a dark core)
function enemyPath(e, r) {
  ctx.beginPath();
  switch (e.isBoss ? 'boss' : e.kind) {
    case 'melee': ctx.arc(0, 0, r, 0, TAU); break;
    case 'ranged': ctx.moveTo(0, -r*1.1); ctx.lineTo(r, 0); ctx.lineTo(0, r*1.1); ctx.lineTo(-r, 0); break;
    case 'charger': { const a = Math.atan2(e.facing.y, e.facing.x), c = Math.cos(a), s = Math.sin(a), P = (px, py) => ctx.lineTo(px*c - py*s, px*s + py*c);
      P(r*1.35, 0); P(-r*0.9, r*0.9); P(-r*0.45, 0); P(-r*0.9, -r*0.9); break; }
    case 'bomber': ctx.arc(0, 0, r*(1 + 0.12*Math.sin(e.animT*(e.state === 'wind' ? 40 : 10))), 0, TAU); break;
    case 'brute': for (let i = 0; i < 8; i++) { const a = i*TAU/8 + TAU/16; ctx.lineTo(Math.cos(a)*r*1.08, Math.sin(a)*r*1.08); } break;
    case 'caster': ctx.moveTo(0, -r*1.3); ctx.lineTo(r*0.8, 0); ctx.lineTo(0, r*1.3); ctx.lineTo(-r*0.8, 0); break;
    case 'boss': { const n = 7 + (e.def.patterns.length % 3); for (let i = 0; i < n*2; i++) { const a = i*Math.PI/n + e.animT*0.4, rr = i % 2 ? r*0.8 : r*1.12; ctx.lineTo(Math.cos(a)*rr, Math.sin(a)*rr); } break; }
  }
  ctx.closePath();
}

function drawEnemy(e) {
  const sz = e.size, grow = e.spawnT > 0 ? 1 - e.spawnT/0.55 : 1;
  const wind = e.state === 'wind' || e.state === 'cwind';
  const col = e.hitFlash > 0 ? '#ffffff' : wind && Math.sin(clock*45) > 0 ? '#ffe0cc' : e.color;
  ctx.globalAlpha = grow*0.4; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(e.x, e.y + sz*0.85, sz*0.95, sz*0.32, 0, 0, TAU); ctx.fill();
  if (e.elite || e.isBoss) { // aura
    ctx.globalAlpha = grow*(0.1 + 0.05*Math.sin(clock*4)); ctx.fillStyle = e.isBoss ? (e.phase === 2 ? '#ff2222' : COLORS.danger) : '#ffcc66';
    disc(e.x, e.y, sz*(e.isBoss ? 2.1 : 1.8));
    ctx.globalAlpha = grow*0.7; ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(e.x, e.y, sz*1.5, clock*2, clock*2 + 4.2); ctx.stroke();
  }
  ctx.globalAlpha = grow;
  ctx.save(); ctx.translate(e.x, e.y + (e.isBoss ? 0 : Math.sin(e.animT*6)*1.5)); ctx.scale(grow, grow);
  ctx.fillStyle = col;
  if (e.kind === 'melee' && !e.isBoss) { // horns
    ctx.beginPath(); ctx.moveTo(-sz*0.95, -sz*0.3); ctx.lineTo(-sz*0.75, -sz*1.35); ctx.lineTo(-sz*0.3, -sz*0.8);
    ctx.moveTo(sz*0.95, -sz*0.3); ctx.lineTo(sz*0.75, -sz*1.35); ctx.lineTo(sz*0.3, -sz*0.8); ctx.fill();
  }
  enemyPath(e, sz); ctx.fill();
  ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : '#07070c'; enemyPath(e, sz*0.66); ctx.fill();
  if (e.kind === 'caster' && !e.isBoss) { ctx.fillStyle = col; for (let i = 0; i < 3; i++) { const a = e.animT*3 + i*TAU/3; disc(Math.cos(a)*sz*1.5, Math.sin(a)*sz*0.6 - sz*0.2, 2.5); } }
  if (e.isBoss) { ctx.fillStyle = col; for (let i = 0; i < 6; i++) { const a = -e.animT*0.9 + i*TAU/6; disc(Math.cos(a)*sz*1.5, Math.sin(a)*sz*1.5, 3.5); } }
  // Eyes track the player
  const ox = e.facing.x*sz*0.16, oy = e.facing.y*sz*0.16 - sz*0.08, er = Math.max(1.6, sz*0.11);
  ctx.fillStyle = e.isBoss ? '#ff3344' : e.elite ? '#ffdd66' : '#ff8844';
  disc(ox - sz*0.24, oy, er); disc(ox + sz*0.24, oy, er);
  ctx.restore();
  ctx.globalAlpha = 1;
  if (!e.isBoss && e.hp < e.maxHp) {
    const bw = sz*2.4, by = e.y - sz - 14;
    ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(e.x - bw/2, by, bw, 3.5);
    ctx.fillStyle = e.elite ? '#ffcc66' : e.hp > e.maxHp*0.3 ? COLORS.health : COLORS.danger;
    ctx.fillRect(e.x - bw/2, by, bw*Math.max(0, e.hp/e.maxHp), 3.5);
  }
}

function drawShadowSoldier(s) {
  const berserk = legionTimer > 0, sc = s.grade === 'Marshal' ? 1.0 : s.grade === 'Elite' ? 0.85 : 0.7;
  ctx.globalAlpha = berserk ? 0.35 : 0.2; ctx.fillStyle = berserk ? '#cc44ff' : COLORS.accent;
  ctx.beginPath(); ctx.ellipse(s.x, s.y + 12*sc, 16*sc, 6*sc, 0, 0, TAU); ctx.fill();
  ctx.globalAlpha = berserk ? 0.95 : 0.8;
  drawHunter(s.x, s.y, { face:s.facing.x, anim:s.atkT > 0 ? 'attack' : s.moving ? 'run' : 'idle', t:s.animT, scale:sc, color:berserk ? '#dd77ff' : '#7755cc',
    body:'#0a0414', blade:s.color, eye:berserk ? '#ff66ff' : '#cc99ff', cape:s.grade === 'Marshal' ? '#12041f' : null, atkP:s.atkT > 0 ? 1 - s.atkT/0.18 : 0, atkDir:1 });
  ctx.globalAlpha = 1;
}

function drawTelegraph(g) {
  const p = clamp(g.t/g.dur, 0, 1);
  ctx.fillStyle = g.color; ctx.strokeStyle = g.color;
  if (g.type === 'circle') {
    ctx.globalAlpha = 0.1; disc(g.x, g.y, g.r);
    ctx.globalAlpha = 0.28 + 0.2*p; disc(g.x, g.y, g.r*p);
    ctx.globalAlpha = 0.9; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.x, g.y, g.r, 0, TAU); ctx.stroke();
  } else {
    ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(Math.atan2(g.ay, g.ax));
    ctx.globalAlpha = 0.1; ctx.fillRect(0, -g.w/2, g.len, g.w);
    ctx.globalAlpha = 0.3 + 0.2*p; ctx.fillRect(0, -g.w/2, g.len*p, g.w);
    ctx.globalAlpha = 0.9; ctx.lineWidth = 2; ctx.strokeRect(0, -g.w/2, g.len, g.w);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

function drawPickups() {
  for (const r of remnants) { // shadow remnants — a wisp waiting for the word
    const fade = Math.min(1, (r.dur - r.t)/2), fl = Math.sin(clock*7 + r.x);
    ctx.globalAlpha = 0.25*fade; ctx.fillStyle = COLORS.accent; disc(r.x, r.y, 26 + fl*3);
    ctx.globalAlpha = 0.85*fade; ctx.fillStyle = '#1a0530';
    ctx.beginPath(); ctx.moveTo(r.x - 10, r.y + 8); ctx.quadraticCurveTo(r.x - 14 + fl*3, r.y - 10, r.x + fl*4, r.y - 30 - fl*3); ctx.quadraticCurveTo(r.x + 14 + fl*3, r.y - 10, r.x + 10, r.y + 8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#bb88ff'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#ddbbff'; disc(r.x - 4, r.y - 8, 1.8); disc(r.x + 4, r.y - 8, 1.8);
    if (dist(player.x, player.y, r.x, r.y) < 95) {
      ctx.globalAlpha = fade*(0.7 + 0.3*Math.sin(clock*8)); ctx.fillStyle = '#ddbbff';
      ctx.font = 'bold 12px Orbitron, monospace'; ctx.textAlign = 'center';
      ctx.fillText(isMobile ? 'ARISE' : '[E]  ARISE', r.x, r.y - 44);
    }
  }
  for (const o of orbs) {
    const gold = o.type === 'gold';
    ctx.globalAlpha = 0.3; ctx.fillStyle = gold ? COLORS.gold : COLORS.health; disc(o.x, o.y, 9);
    ctx.globalAlpha = 1;
    if (gold) { ctx.beginPath(); ctx.moveTo(o.x, o.y - 5); ctx.lineTo(o.x + 4, o.y); ctx.lineTo(o.x, o.y + 5); ctx.lineTo(o.x - 4, o.y); ctx.fill(); }
    else { ctx.fillRect(o.x - 1.5, o.y - 5, 3, 10); ctx.fillRect(o.x - 5, o.y - 1.5, 10, 3); }
  }
  ctx.globalAlpha = 1;
}
