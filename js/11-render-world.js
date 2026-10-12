'use strict';

// ================================================================
//  RENDERING — world
// ================================================================
let floorPat = null, floorTheme = GATE_DEFS[0].theme;
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
  floorTheme = th;
}

function drawArena(vx0, vy0, vx1, vy1) {
  if (layout) { drawLayout(vx0, vy0, vx1, vy1); return; }
  const hw = arenaW/2, hh = arenaH/2, th = floorTheme;
  const x0 = Math.max(vx0, -hw), y0 = Math.max(vy0, -hh), x1 = Math.min(vx1, hw), y1 = Math.min(vy1, hh);
  if (x1 > x0 && y1 > y0 && floorPat) { ctx.fillStyle = floorPat; ctx.fillRect(x0, y0, x1-x0, y1-y0); }
  // The mark at the heart of the arena: plain rings only, with a slow pulse moving outward.
  // Deliberately nothing else (no polygons, spokes, tick dials or orbiting circles): it must never read as a magic circle.
  ctx.save();
  ctx.strokeStyle = th.line; ctx.lineWidth = 2;
  [56, 130, 205, 280].forEach((r, i) => {
    ctx.globalAlpha = 0.11 + 0.05*Math.sin(clock*1.5 - i*0.9);
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
  });
  ctx.restore();
  // Walls
  ctx.save();
  ctx.strokeStyle = th.line; ctx.lineWidth = 3; ctx.globalAlpha = 0.55 + 0.15*Math.sin(clock*2);
  ctx.shadowColor = th.line; ctx.shadowBlur = 22;
  ctx.strokeRect(-hw, -hh, arenaW, arenaH);
  ctx.restore();
}

function drawLayout(vx0, vy0, vx1, vy1) {
  const th = floorTheme;

  // 0. Wall mass. Every rectangle is drawn grown outward in dark stone first; the floors painted over it afterwards leave a band
  //    of wall around the whole outline, correct at every corner with no extra geometry. North walls get a taller, lit face.
  const WT = 30, WF = 70, FACE = 46; // wall thickness seen from above; how far the north wall reaches up; height of its lit face
  const near = r => r.x1 + WT > vx0 && r.x0 - WT < vx1 && r.y1 + WT > vy0 && r.y0 - WF < vy1;
  const grown = () => { ctx.beginPath(); for (const r of layout.rects) if (near(r)) ctx.rect(r.x0 - WT, r.y0 - WF, r.x1 - r.x0 + 2*WT, r.y1 - r.y0 + WF + WT); };
  if (floorPat) { ctx.fillStyle = floorPat; grown(); ctx.fill(); }      // the same stone as the floor...
  ctx.fillStyle = floorPat ? 'rgba(4,4,10,0.74)' : '#08080e'; grown(); ctx.fill(); // ...much darker. One path, one fill, so overlaps do not darken twice
  for (const r of layout.rects) { // the lit face of each north wall, directly above the rectangle's top edge
    if (!near(r)) continue;
    const g = ctx.createLinearGradient(0, r.y0 - FACE, 0, r.y0);
    g.addColorStop(0, 'rgba(255,255,255,0.11)'); g.addColorStop(1, 'rgba(0,0,0,0.38)');
    ctx.fillStyle = g; ctx.fillRect(r.x0, r.y0 - FACE, r.x1 - r.x0, FACE);
    ctx.globalAlpha = 0.28; ctx.fillStyle = th.line; ctx.fillRect(r.x0, r.y0 - FACE - 2, r.x1 - r.x0, 2); ctx.globalAlpha = 1; // the top edge of the face catches the light
  }

  // 1. Floors
  if (floorPat) {
    ctx.fillStyle = floorPat;
    layout.rects.forEach(r => {
      const x0 = Math.max(vx0, r.x0), y0 = Math.max(vy0, r.y0);
      const x1 = Math.min(vx1, r.x1), y1 = Math.min(vy1, r.y1);
      if (x1 > x0 && y1 > y0) ctx.fillRect(x0, y0, x1-x0, y1-y0);
    });
  }

  // 2. Corridors a little darker
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  layout.rects.forEach(r => {
    if (r.kind !== 'hall') return;
    const x0 = Math.max(vx0, r.x0), y0 = Math.max(vy0, r.y0);
    const x1 = Math.min(vx1, r.x1), y1 = Math.min(vy1, r.y1);
    if (x1 > x0 && y1 > y0) ctx.fillRect(x0, y0, x1-x0, y1-y0);
  });

  // 3. Rooms not yet reached a little darker
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  layout.rects.forEach(r => {
    if (r.kind !== 'room' || r.i <= layout.cleared || r.i === layout.lock) return;
    const x0 = Math.max(vx0, r.x0), y0 = Math.max(vy0, r.y0);
    const x1 = Math.min(vx1, r.x1), y1 = Math.min(vy1, r.y1);
    if (x1 > x0 && y1 > y0) ctx.fillRect(x0, y0, x1-x0, y1-y0);
  });

  // 4. Walls
  ctx.save();
  ctx.strokeStyle = th.line;
  ctx.lineWidth = 3;
  ctx.lineCap = 'square';
  ctx.globalAlpha = 0.55 + 0.15*Math.sin(clock*2);
  ctx.shadowColor = th.line;
  ctx.shadowBlur = 22;
  ctx.beginPath();
  layout.walls.forEach(w => {
    const minX = Math.min(w.x0, w.x1), maxX = Math.max(w.x0, w.x1);
    const minY = Math.min(w.y0, w.y1), maxY = Math.max(w.y0, w.y1);
    if (maxX >= vx0 && minX <= vx1 && maxY >= vy0 && minY <= vy1) {
      ctx.moveTo(w.x0, w.y0);
      ctx.lineTo(w.x1, w.y1);
    }
  });
  ctx.stroke();
  ctx.restore();

  // 5. Doors
  ctx.save();
  layout.doors.forEach((door, idx) => {
    if (door.room === layout.lock) {
      ctx.strokeStyle = COLORS.danger;
      ctx.lineWidth = 9;
      ctx.lineCap = 'butt';
      ctx.shadowColor = COLORS.danger;
      ctx.shadowBlur = 26;
      ctx.globalAlpha = 0.75 + 0.25*Math.sin(clock*5);
      ctx.beginPath(); ctx.moveTo(door.x0, door.y0); ctx.lineTo(door.x1, door.y1); ctx.stroke();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.moveTo(door.x0, door.y0); ctx.lineTo(door.x1, door.y1); ctx.stroke();
    } else if (layout.lock < 0 && idx === 2*(dungeon.wave-1)) {
      ctx.strokeStyle = COLORS.primary;
      ctx.lineWidth = 4;
      ctx.shadowColor = COLORS.primary;
      ctx.shadowBlur = 18;
      ctx.globalAlpha = 0.45 + 0.35*Math.sin(clock*4);
      ctx.beginPath(); ctx.moveTo(door.x0, door.y0); ctx.lineTo(door.x1, door.y1); ctx.stroke();
    } else {
      ctx.strokeStyle = th.line;
      ctx.lineWidth = 2;
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 0.16;
      ctx.beginPath(); ctx.moveTo(door.x0, door.y0); ctx.lineTo(door.x1, door.y1); ctx.stroke();
    }
  });
  ctx.restore();

  // 5b. A short stone post at each end of every doorway
  ctx.save();
  for (const d of layout.doors) for (const [px, py] of [[d.x0, d.y0], [d.x1, d.y1]]) {
    if (px + 20 < vx0 || px - 20 > vx1 || py + 20 < vy0 || py - 40 > vy1) continue;
    ctx.globalAlpha = 1; ctx.fillStyle = '#0b0b12'; ctx.fillRect(px - 13, py - 34, 26, 44);
    ctx.fillStyle = 'rgba(255,255,255,0.09)'; ctx.fillRect(px - 13, py - 34, 26, 6);
    ctx.globalAlpha = 0.45; ctx.strokeStyle = th.line; ctx.lineWidth = 1.5; ctx.strokeRect(px - 13, py - 34, 26, 44);
  }
  ctx.restore();

  // 6. The exit: a doorway of light
  const ex = layout.exit.x, ey = layout.exit.y;
  const open = dungeon.wave >= dungeon.maxWaves;
  const k = open ? 1 : 0.22;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // pool of light on the floor
  const rg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 70);
  rg.addColorStop(0, th.ember);
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg;
  ctx.globalAlpha = k*(0.5 + 0.15*Math.sin(clock*3));
  ctx.beginPath();
  ctx.ellipse(ex, ey, 70, 26, 0, 0, TAU);
  ctx.fill();

  // standing rectangle of light
  const lg = ctx.createLinearGradient(ex, ey-170, ex, ey);
  lg.addColorStop(0, 'rgba(0,0,0,0)');
  lg.addColorStop(1, th.ember);
  ctx.fillStyle = lg;
  ctx.globalAlpha = k*(0.55 + 0.2*Math.sin(clock*2.2));
  ctx.fillRect(ex-42, ey-170, 84, 170);

  // vertical lines when open
  if (open) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(ex-42, ey-150); ctx.lineTo(ex-42, ey);
    ctx.moveTo(ex+42, ey-150); ctx.lineTo(ex+42, ey);
    ctx.stroke();
  }
  ctx.restore();
}

// The hunter — also used, darker, for every shadow soldier
// o: { face, anim, t, scale, color, body, blade, eye, cape, atkP, atkDir }
function drawHunter(x, y, o) {
  const s = o.scale || 1, t = o.t, ga = ctx.globalAlpha, S = Math.sin, C = Math.cos;
  let lA = 0.2, rA = -0.3, lL = 0, rL = 0, lean = 0, bob = 0, sw = -0.5;
  if (o.anim === 'idle') { bob = S(t*2)*1.5*s; lA = S(t*1.5)*0.08 + 0.2; rA = -S(t*1.5)*0.08 - 0.3; sw = -0.5 + S(t*1.5)*0.05; lL = -0.16; rL = 0.14; }
  else if (o.anim === 'run') { const sp = 13; lA = S(t*sp)*0.7; rA = -S(t*sp)*0.6; lL = -S(t*sp)*0.65; rL = S(t*sp)*0.65; lean = 0.14; sw = rA - 0.3; bob = -Math.abs(S(t*sp))*3*s; }
  else if (o.anim === 'attack') { const k = o.atkDir < 0 ? 1-o.atkP : o.atkP; rA = -1.5 + k*3.0; sw = rA + 0.4; lA = 0.5 - k*0.4; lean = 0.18*(1-o.atkP); lL = -0.35; rL = 0.4; }
  else if (o.anim === 'dash') { lean = 0.45; lA = -0.9; rA = 0.7; lL = -0.7; rL = 0.35; sw = -1.1; }
  ctx.save();
  ctx.translate(x, y + bob); ctx.scale(o.face < 0 ? -1 : 1, 1); ctx.rotate(lean);
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  // Afterimages pass one colour for everything: draw them as a plain silhouette of the same parts
  const col = o.color, mono = o.body === col;
  const PAL = { vest:'#2b2a58', trim:'#3d3c78', shirt:'#14132a', pants:'#32325a', far:'#20203c', boot:'#15131f', sole:'#262438', skin:'#54407a', skinFar:'#3a2b55', wrap:'#7a72b4', wrapFar:'#544d84', wrapLine:'#3f3a6c', hair:'#0d0915', head:'#2a1b3e', strap:'#0c0a16', steel:'#d4d6ea', steelDark:'#8f92b8', pommel:'#6b4a3a' };
  const pc = n => mono ? col : PAL[n];
  const headR = 4.6*s, headY = -30.5*s, shY = -21*s, hipY = -5*s, uArm = 7*s, fArm = 6.5*s, thigh = 9*s, shin = 9*s;
  const rim = (x1, y1, x2, y2, w) => { if (mono) return; ctx.globalAlpha = ga*0.18; ctx.strokeStyle = col; ctx.lineWidth = w + 0.6*s; line(x1, y1, x2, y2); ctx.globalAlpha = ga; };
  const part = (x1, y1, x2, y2, w, fill) => { ctx.strokeStyle = fill; ctx.lineWidth = w; line(x1, y1, x2, y2); };
  
  const knee = a => -(0.12 + (a < 0 ? -a*0.9 : a*0.5)), elbow = a => 0.3 + Math.abs(a)*0.25;

  const arm = (hx, hy, a, w1, w2, c1, c2, c3, isNear) => {
    const bend = elbow(a);
    const jx = hx + S(a)*uArm, jy = hy + C(a)*uArm, ex = jx + S(a+bend)*fArm, ey = jy + C(a+bend)*fArm;
    if (!isNear) { rim(hx, hy, jx, jy, w1); rim(jx, jy, ex, ey, w2); }
    part(hx, hy, jx, jy, w1, c1); part(jx, jy, ex, ey, w2, c2);
    if (isNear && !mono) {
      ctx.save(); ctx.translate(jx, jy); ctx.rotate(a+bend);
      ctx.strokeStyle = PAL.wrapLine; ctx.lineWidth = 1*s;
      for (let i = 1; i <= 3; i++) {
        const yLine = fArm * (i / 4);
        line(-w2*0.4, yLine, w2*0.4, yLine + 1.5*s);
      }
      ctx.restore();
    }
    ctx.fillStyle = c3; disc(ex, ey, 2.2*s);
    return [jx, jy, ex, ey];
  };

  const leg = (hx, a, c, isNear) => {
    const bend = knee(a);
    const jx = hx + S(a)*thigh, jy = hipY + C(a)*thigh;
    const sx = jx + S(a+bend)*(shin*0.5), sy = jy + C(a+bend)*(shin*0.5);
    const ex = jx + S(a+bend)*shin, ey = jy + C(a+bend)*shin;
    
    rim(hx, hipY, jx, jy, 6.6*s); 
    rim(jx, jy, sx, sy, 7*s);

    part(hx, hipY, jx, jy, 6.6*s, c);
    
    if (isNear && !mono) {
      ctx.save(); ctx.translate(hx, hipY); ctx.rotate(a);
      ctx.fillStyle = PAL.trim; ctx.fillRect(-1.5*s, 3.5*s, 3*s, 4*s);
      ctx.strokeStyle = PAL.strap; ctx.lineWidth = 0.8*s;
      line(-3.3*s, 2*s, 3.3*s, 2*s); line(-3.3*s, 2.8*s, 3.3*s, 2.8*s);
      ctx.restore();
    }

    ctx.lineCap = 'butt'; part(jx, jy, sx, sy, 7*s, c); ctx.lineCap = 'round';
    part(sx, sy, ex, ey, 4.6*s, pc('boot'));

    ctx.save(); ctx.translate(ex, ey);
    ctx.fillStyle = pc('boot');
    ctx.beginPath();
    ctx.moveTo(-1.6*s, -2*s);
    ctx.lineTo(-1.6*s, 0.8*s);
    ctx.lineTo(5.2*s, 0.8*s);
    ctx.bezierCurveTo(5.2*s, -1.5*s, 3*s, -2.5*s, 1*s, -2.5*s);
    ctx.lineTo(-1.6*s, -2*s);
    ctx.fill();
    
    if (!mono) {
      ctx.strokeStyle = PAL.sole; ctx.lineWidth = 0.8*s; ctx.lineCap = 'butt';
      line(-1.6*s, 0.4*s, 5.2*s, 0.4*s);
      ctx.lineCap = 'round';
    }
    ctx.restore();
  };

  const blade = (hx, hy, a, len, alpha) => {
    if (!o.blade) return;
    const dx = S(a), dy = -C(a), nx = C(a), ny = S(a), tx = hx + dx*len, ty = hy + dy*len, gx = hx + dx*2.2*s, gy = hy + dy*2.2*s;
    
    ctx.globalAlpha = ga*0.12*alpha; ctx.strokeStyle = o.blade; ctx.lineWidth = 3.6*s; line(gx, gy, tx, ty);
    ctx.globalAlpha = ga*alpha;
    
    ctx.fillStyle = mono ? col : PAL.steel;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx - nx*1.7*s, gy - ny*1.7*s); ctx.lineTo(tx, ty); ctx.closePath(); ctx.fill();

    ctx.fillStyle = mono ? col : PAL.steelDark;
    ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + nx*1.7*s, gy + ny*1.7*s); ctx.lineTo(tx, ty); ctx.closePath(); ctx.fill();

    if (!mono) {
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.5*s;
      line(gx - nx*1.5*s, gy - ny*1.5*s, tx - nx*0.2*s, ty - ny*0.2*s);
    }

    ctx.strokeStyle = pc('strap'); ctx.lineWidth = 1.4*s; 
    line(gx - nx*3.3*s, gy - ny*3.3*s, gx + nx*3.3*s, gy + ny*3.3*s);

    ctx.lineWidth = 1.5*s; line(hx - dx*1.5*s, hy - dy*1.5*s, gx, gy);

    ctx.fillStyle = pc('pommel');
    disc(hx - dx*1.5*s, hy - dy*1.5*s, 1.2*s);
    ctx.globalAlpha = ga;
  };

  const farBladeA = o.anim === 'run' ? 1.2 + lA*0.25 : lA + 0.9;
  { const [, , hx, hy] = arm(-2*s, shY + 1.2*s, lA, 4.9*s, 4.3*s, pc('skinFar'), pc('wrapFar'), pc('skinFar'), false); blade(hx, hy, farBladeA, 22*s, 0.8); }
  leg(-1.2*s, lL, pc('far'), false);
  leg(1.2*s, rL, pc('pants'), true);

  ctx.beginPath(); ctx.moveTo(-4*s, shY); ctx.lineTo(5*s, shY); ctx.lineTo(7.5*s, shY + 5*s); ctx.lineTo(4*s, hipY); ctx.lineTo(-4*s, hipY); ctx.closePath();
  if (!mono) { ctx.globalAlpha = ga*0.18; ctx.strokeStyle = col; ctx.lineWidth = 1.6*s; ctx.stroke(); ctx.globalAlpha = ga; }
  ctx.fillStyle = pc('vest'); ctx.fill();

  ctx.beginPath(); ctx.moveTo(-2*s, shY); ctx.lineTo(3.4*s, shY); ctx.lineTo(3.4*s, -25*s); ctx.lineTo(-2*s, -23*s); ctx.closePath();
  ctx.fillStyle = pc('vest'); ctx.fill();

  if (!mono) {
    ctx.beginPath(); ctx.moveTo(5*s, shY); ctx.lineTo(7.5*s, shY + 5*s); ctx.lineTo(4*s, hipY);
    ctx.lineTo(2.4*s, hipY); ctx.lineTo(5.9*s, shY + 5*s); ctx.lineTo(3.4*s, shY); ctx.closePath();
    ctx.fillStyle = PAL.shirt; ctx.fill();

    ctx.strokeStyle = col; ctx.lineWidth = 1*s;
    line(3.4*s, shY, 5.9*s, shY + 5*s);
    line(5.9*s, shY + 5*s, 2.4*s, hipY - 0.5*s);
    line(3.4*s, shY, 3.4*s, -25*s);

    ctx.fillStyle = PAL.trim; ctx.fillRect(0.5*s, shY + 0.5*s, 3*s, 3.5*s);
    ctx.fillRect(1*s, shY + 4*s, 2.5*s, 3*s);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(1*s, shY + 4.8*s, 2.5*s, 1);
    ctx.fillStyle = PAL.trim; ctx.fillRect(-2*s, hipY - 5*s, 3*s, 3.5*s);
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(-2*s, hipY - 4.2*s, 3*s, 1);
    ctx.lineCap = 'butt';
    ctx.strokeStyle = PAL.strap; ctx.lineWidth = 1.8*s;
    line(-3.6*s, hipY - 0.6*s, 3.6*s, hipY - 0.6*s);
    ctx.lineCap = 'round';
    ctx.fillStyle = PAL.steel; ctx.fillRect(2.6*s, hipY - 1.5*s, 1*s, 1.8*s);
  }

  const hx0 = 0.6*s;
  ctx.fillStyle = pc('head'); ctx.beginPath(); ctx.arc(hx0, headY, headR, 0, TAU); ctx.fill();
  const hair = [[-1.0,0.4],[-1.2,0.0],[-1.4,-0.6],[-1.0,-0.8],[-1.1,-1.3],[-0.5,-1.1],[-0.2,-1.5],[0.3,-1.1],[0.9,-1.3],[0.8,-0.8],[1.2,-0.5],[0.8,-0.4],[1.1,-0.1],[0.6,-0.2],[0.8,0.2],[0.4,0.0]];
  ctx.beginPath(); hair.forEach(([px, py], i) => { if (i) ctx.lineTo(hx0 + px*headR, headY + py*headR); else ctx.moveTo(hx0 + px*headR, headY + py*headR); }); ctx.closePath();
  ctx.fillStyle = pc('hair'); ctx.fill();
  if (!mono) { ctx.fillStyle = o.eye || col; ctx.fillRect(hx0 + 1.1*s, headY - 1.1*s, 2.6*s, 1.5*s); }

  { const [, , hx, hy] = arm(2*s, shY + 1.2*s, rA, 4.9*s, 4.3*s, pc('skin'), pc('wrap'), pc('skin'), true); blade(hx, hy, sw, 24*s, 1); }
  ctx.globalAlpha = ga;
  ctx.restore();
}

// Body silhouettes, one per archetype — drawn twice (colour, then a dark core)
function enemyPath(e, r) {
  ctx.beginPath();
  switch (e.kind) {
    case 'melee': ctx.arc(0, 0, r, 0, TAU); break;
    case 'ranged': ctx.moveTo(0, -r*1.1); ctx.lineTo(r, 0); ctx.lineTo(0, r*1.1); ctx.lineTo(-r, 0); break;
    case 'charger': { const a = Math.atan2(e.facing.y, e.facing.x), c = Math.cos(a), s = Math.sin(a), P = (px, py) => ctx.lineTo(px*c - py*s, px*s + py*c);
      P(r*1.35, 0); P(-r*0.9, r*0.9); P(-r*0.45, 0); P(-r*0.9, -r*0.9); break; }
    case 'bomber': ctx.arc(0, 0, r*(1 + 0.12*Math.sin(e.animT*(e.state === 'wind' ? 40 : 10))), 0, TAU); break;
    case 'brute': for (let i = 0; i < 8; i++) { const a = i*TAU/8 + TAU/16; ctx.lineTo(Math.cos(a)*r*1.08, Math.sin(a)*r*1.08); } break;
    case 'caster': ctx.moveTo(0, -r*1.3); ctx.lineTo(r*0.8, 0); ctx.lineTo(0, r*1.3); ctx.lineTo(-r*0.8, 0); break;
  }
  ctx.closePath();
}

function bossTrim(hex) {
  if (hex.length === 4) hex = '#' + hex[1]+hex[1]+hex[2]+hex[2]+hex[3]+hex[3];
  const c = parseInt(hex.slice(1), 16);
  const r = c >> 16, g = (c >> 8) & 255, b = c & 255;
  return `rgb(${Math.round(r + (255 - r) * 0.45)}, ${Math.round(g + (255 - g) * 0.45)}, ${Math.round(b + (255 - b) * 0.45)})`;
}

function drawBoss(name, r, t, fx, fy, pal) {
  ctx.save();
  ctx.lineWidth = Math.max(1.5, r * 0.05);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  
  const fillOutline = () => { ctx.fill(); ctx.strokeStyle = pal.light; ctx.stroke(); };
  
  const ox = fx * r * 0.12, oy = fy * r * 0.12;
  const bossName = ['Spider Queen', 'Orc Chieftain', 'Death Knight', 'Demon Lord', 'Ancient Dragon', 'Statue of God'].includes(name) ? name : 'Orc Chieftain';

  if (bossName === 'Spider Queen') {
    for (let i = 0; i < 4; i++) {
      for (let side of [-1, 1]) {
        const sway = Math.sin(t * 3 + i) * 0.1;
        const kneeX = side * (0.8 + i * 0.05) * r;
        const kneeY = (-0.5 + i * 0.35 + sway) * r;
        const footX = side * (1.35 + i * 0.03) * r;
        const footY = (-0.1 + i * 0.4 + sway) * r;
        const startX = side * 0.7 * r;
        const startY = 0.15 * r;
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(kneeX, kneeY);
        ctx.lineTo(footX, footY);
        ctx.lineWidth = 0.1 * r + Math.max(1.5, r * 0.05) * 2;
        ctx.strokeStyle = pal.light;
        ctx.stroke();
        ctx.lineWidth = 0.1 * r;
        ctx.strokeStyle = pal.body;
        ctx.stroke();
      }
    }
    ctx.lineWidth = Math.max(1.5, r * 0.05);
    ctx.fillStyle = pal.body;
    ctx.beginPath(); ctx.arc(0, 0.15 * r, 0.95 * r, 0, TAU); fillOutline();
    ctx.beginPath(); ctx.arc(0, 0.75 * r, 0.45 * r, 0, TAU); fillOutline();
    ctx.strokeStyle = pal.dark;
    ctx.lineWidth = 0.1 * r;
    ctx.beginPath();
    for (let i = 1; i <= 3; i++) {
      ctx.moveTo(-0.7 * r, (0.15 - 0.4 + i * 0.3) * r);
      ctx.quadraticCurveTo(0, (0.15 - 0.1 + i * 0.3) * r, 0.7 * r, (0.15 - 0.4 + i * 0.3) * r);
    }
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, r * 0.05);
    ctx.fillStyle = pal.light;
    ctx.beginPath();
    ctx.moveTo(-0.15 * r, 1.1 * r); ctx.lineTo(-0.05 * r, 1.3 * r); ctx.lineTo(0, 1.1 * r);
    ctx.moveTo(0.15 * r, 1.1 * r); ctx.lineTo(0.05 * r, 1.3 * r); ctx.lineTo(0, 1.1 * r);
    ctx.fill();
    ctx.fillStyle = pal.eye;
    for (let i = 0; i < 3; i++) {
      const ex = (-0.2 + i * 0.2) * r + ox;
      disc(ex, 0.65 * r + oy, 0.06 * r);
      disc(ex, 0.8 * r + oy, 0.06 * r);
    }
  } else if (bossName === 'Orc Chieftain') {
    ctx.fillStyle = pal.body;
    for (let side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 0.8 * r, -0.4 * r);
      ctx.lineTo(side * 1.3 * r, 0.1 * r);
      ctx.lineTo(side * 1.1 * r, 0.4 * r);
      ctx.lineTo(side * 0.6 * r, 0.1 * r);
      ctx.closePath();
      fillOutline();
      ctx.beginPath(); ctx.arc(side * 1.1 * r, 0.45 * r, 0.3 * r, 0, TAU); fillOutline();
    }
    ctx.beginPath();
    ctx.moveTo(-0.6 * r, 0.95 * r);
    ctx.lineTo(0.6 * r, 0.95 * r);
    ctx.lineTo(0.9 * r, -0.5 * r);
    ctx.lineTo(-0.9 * r, -0.5 * r);
    ctx.closePath();
    fillOutline();
    ctx.beginPath();
    ctx.rect(-0.3 * r, -0.7 * r, 0.6 * r, 0.3 * r);
    fillOutline();
    ctx.beginPath(); ctx.arc(0, -0.5 * r, 0.36 * r, 0, TAU); fillOutline();
    ctx.fillStyle = pal.dark;
    ctx.fillRect(-0.65 * r, 0.65 * r, 1.3 * r, 0.3 * r);
    ctx.fillStyle = pal.light;
    for (let side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * 0.9 * r, -0.5 * r, 0.42 * r, Math.PI, 0); // a dome over the top of each shoulder
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = pal.dark;
      disc(side * 0.7 * r, -0.6 * r, 0.05 * r);
      disc(side * 1.1 * r, -0.6 * r, 0.05 * r);
      ctx.fillStyle = pal.light;
    }
    ctx.fillStyle = pal.light;
    for (let side of [-1, 1]) {
      ctx.beginPath();
      // a tusk curving up from the corner of the mouth to beside the eye
      ctx.moveTo(side * 0.08 * r, -0.24 * r);
      ctx.quadraticCurveTo(side * 0.44 * r, -0.2 * r, side * 0.46 * r, -0.66 * r);
      ctx.quadraticCurveTo(side * 0.3 * r, -0.38 * r, side * 0.08 * r, -0.36 * r);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = pal.eye;
    disc(-0.15 * r + ox, -0.5 * r + oy, 0.06 * r);
    disc(0.15 * r + ox, -0.5 * r + oy, 0.06 * r);
    ctx.strokeStyle = pal.dark;
    ctx.lineWidth = 0.08 * r;
    ctx.beginPath();
    ctx.moveTo(-0.3 * r, -0.6 * r + oy);
    ctx.lineTo(0, -0.55 * r + oy);
    ctx.lineTo(0.3 * r, -0.6 * r + oy);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, r * 0.05);
  } else if (bossName === 'Death Knight') {
    ctx.fillStyle = pal.body;
    ctx.beginPath();
    ctx.moveTo(-0.6 * r, -0.3 * r);
    ctx.lineTo(0.6 * r, -0.3 * r);
    ctx.lineTo(0.85 * r, 1.1 * r);
    for(let i = 0; i < 5; i++) {
      ctx.lineTo(0.85 * r - (1.7 * r) * (i + 0.5) / 5, 0.9 * r);
      ctx.lineTo(0.85 * r - (1.7 * r) * (i + 1) / 5, 1.1 * r);
    }
    ctx.lineTo(-0.85 * r, 1.1 * r);
    ctx.closePath();
    fillOutline();
    ctx.fillStyle = pal.light;
    ctx.beginPath();
    ctx.moveTo(-0.95 * r, -0.3 * r); ctx.lineTo(-0.5 * r, -0.5 * r); ctx.lineTo(-0.5 * r, -0.1 * r); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0.95 * r, -0.3 * r); ctx.lineTo(0.5 * r, -0.5 * r); ctx.lineTo(0.5 * r, -0.1 * r); ctx.closePath(); ctx.fill();
    ctx.fillStyle = pal.body;
    ctx.beginPath();
    ctx.moveTo(-0.35 * r, -0.35 * r);
    ctx.quadraticCurveTo(-0.35 * r, -1.35 * r, 0, -1.35 * r);
    ctx.quadraticCurveTo(0.35 * r, -1.35 * r, 0.35 * r, -0.35 * r);
    ctx.closePath();
    fillOutline();
    ctx.fillStyle = pal.dark;
    ctx.fillRect(-0.25 * r, -0.6 * r, 0.5 * r, 0.15 * r);
    ctx.fillStyle = pal.eye;
    disc(-0.1 * r + ox, -0.52 * r + oy, 0.05 * r);
    disc(0.1 * r + ox, -0.52 * r + oy, 0.05 * r);
    ctx.fillStyle = pal.light;
    ctx.beginPath();
    ctx.moveTo(-0.12 * r, -0.1 * r);
    ctx.lineTo(0.12 * r, -0.1 * r);
    ctx.lineTo(0.08 * r, 1.3 * r);
    ctx.lineTo(0, 1.45 * r);
    ctx.lineTo(-0.08 * r, 1.3 * r);
    ctx.closePath();
    ctx.fill();
    ctx.fillRect(-0.3 * r, -0.1 * r, 0.6 * r, 0.08 * r);
    ctx.strokeStyle = pal.dark;
    ctx.beginPath(); ctx.moveTo(0, -0.1 * r); ctx.lineTo(0, 1.4 * r); ctx.stroke();
  } else if (bossName === 'Demon Lord') {
    for (let side of [-1, 1]) {
      for (let pass = 0; pass < 2; pass++) {
        ctx.fillStyle = pass === 0 ? pal.light : pal.body;
        const scale = pass === 0 ? 1 : 0.6;
        for (let i = 0; i < 3; i++) {
          const sway = Math.sin(t * 7 + i) * 0.15 * r;
          const h = (i === 1 ? 0.6 : 0.4) * r * scale;
          const w = 0.15 * r * scale;
          const bx = side * (0.8 + (i - 1) * 0.25) * r;
          const by = -0.5 * r;
          ctx.beginPath();
          ctx.moveTo(bx - w, by);
          ctx.quadraticCurveTo(bx + sway, by - h, bx + sway, by - h);
          ctx.quadraticCurveTo(bx + w, by - h * 0.5, bx + w, by);
          ctx.fill();
        }
      }
    }
    ctx.fillStyle = pal.body;
    for (let side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * 0.8 * r, -0.4 * r);
      ctx.lineTo(side * 1.2 * r, 0.2 * r);
      ctx.lineTo(side * 0.9 * r, 0.3 * r);
      ctx.lineTo(side * 0.6 * r, -0.1 * r);
      ctx.closePath();
      fillOutline();
      ctx.beginPath(); ctx.arc(side * 1.1 * r, 0.4 * r, 0.25 * r, 0, TAU); fillOutline();
    }
    ctx.beginPath();
    ctx.moveTo(-0.5 * r, 0.6 * r);
    ctx.lineTo(-0.8 * r, 1.2 * r);
    ctx.lineTo(0.8 * r, 1.2 * r);
    ctx.lineTo(0.5 * r, 0.6 * r);
    ctx.closePath();
    fillOutline();
    ctx.beginPath();
    ctx.moveTo(-0.9 * r, -0.4 * r);
    ctx.lineTo(0.9 * r, -0.4 * r);
    ctx.lineTo(0.5 * r, 0.5 * r);
    ctx.lineTo(-0.5 * r, 0.5 * r);
    ctx.closePath();
    fillOutline();
    ctx.fillStyle = pal.light;
    for (let side of [-1, 1]) {
      for (let layer = 0; layer < 3; layer++) {
        ctx.beginPath();
        ctx.moveTo(side * (0.5 + layer * 0.15) * r, -0.5 * r + layer * 0.1 * r);
        ctx.lineTo(side * (1.1 + layer * 0.1) * r, -0.3 * r + layer * 0.1 * r);
        ctx.lineTo(side * (0.9 + layer * 0.1) * r, 0.1 * r + layer * 0.1 * r);
        ctx.lineTo(side * (0.4 + layer * 0.15) * r, -0.1 * r + layer * 0.1 * r);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = pal.dark;
        ctx.stroke();
      }
    }
    ctx.fillStyle = pal.dark;
    ctx.fillRect(-0.55 * r, 0.45 * r, 1.1 * r, 0.2 * r);
    ctx.fillStyle = pal.body;
    ctx.beginPath(); ctx.arc(0, -0.5 * r, 0.35 * r, 0, TAU); fillOutline();
    ctx.fillStyle = pal.light;
    ctx.beginPath();
    ctx.moveTo(-0.35 * r, -0.6 * r);
    for(let i = 0; i < 5; i++) {
      const tx = -0.35 * r + (0.7 * r) * (i + 0.5) / 5;
      const th = i === 2 ? 0.35 * r : (i % 2 === 0 ? 0.15 * r : 0.25 * r);
      ctx.lineTo(tx, -0.6 * r - th);
      ctx.lineTo(-0.35 * r + (0.7 * r) * (i + 1) / 5, -0.6 * r);
    }
    ctx.fill();
    ctx.strokeStyle = pal.light;
    ctx.lineWidth = 0.05 * r;
    ctx.beginPath();
    ctx.moveTo(-0.3 * r, -0.4 * r);
    ctx.lineTo(-0.1 * r, -0.2 * r);
    ctx.lineTo(-0.2 * r, 0.1 * r);
    ctx.lineTo(0, 0.3 * r);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0.2 * r, 0.45 * r);
    ctx.lineTo(0.3 * r, 0.2 * r);
    ctx.lineTo(0.1 * r, -0.1 * r);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, r * 0.05);
    ctx.fillStyle = pal.dark;
    ctx.beginPath();
    ctx.moveTo(-0.25 * r, -0.35 * r);
    ctx.lineTo(0.25 * r, -0.35 * r);
    ctx.lineTo(0.15 * r, -0.2 * r);
    ctx.lineTo(-0.15 * r, -0.2 * r);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = pal.light;
    for(let i = 0; i < 4; i++) {
      ctx.fillRect(-0.15 * r + i * 0.08 * r, -0.35 * r, 0.05 * r, 0.08 * r);
    }
    ctx.fillStyle = pal.eye;
    ctx.beginPath();
    ctx.moveTo(-0.25 * r + ox, -0.55 * r + oy);
    ctx.lineTo(-0.05 * r + ox, -0.45 * r + oy);
    ctx.lineTo(-0.15 * r + ox, -0.4 * r + oy);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(0.25 * r + ox, -0.55 * r + oy);
    ctx.lineTo(0.05 * r + ox, -0.45 * r + oy);
    ctx.lineTo(0.15 * r + ox, -0.4 * r + oy);
    ctx.fill();
  } else if (bossName === 'Ancient Dragon') {
    for (let side of [-1, 1]) {
      const beat = Math.sin(t * 2) * 0.1;
      const ribs = [];
      for (let i = 0; i < 4; i++) {
        const angle = side * (Math.PI / 4 + i * Math.PI / 6 + beat);
        ribs.push({ x: Math.sin(angle) * 1.45 * r, y: -Math.cos(angle) * 1.45 * r });
      }
      ctx.fillStyle = pal.body;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      for (let i = 0; i < 4; i++) {
        ctx.lineTo(ribs[i].x, ribs[i].y);
        if (i < 3) {
          const mx = (ribs[i].x + ribs[i+1].x) / 2 * 0.8;
          const my = (ribs[i].y + ribs[i+1].y) / 2 * 0.8;
          ctx.quadraticCurveTo(mx, my, ribs[i+1].x, ribs[i+1].y);
        }
      }
      ctx.closePath();
      fillOutline();
      ctx.fillStyle = pal.dark;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(ribs[0].x, ribs[0].y);
      const mx = (ribs[0].x + ribs[1].x) / 2 * 0.8;
      const my = (ribs[0].y + ribs[1].y) / 2 * 0.8;
      ctx.quadraticCurveTo(mx, my, ribs[1].x, ribs[1].y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = pal.light;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ribs[i].x, ribs[i].y); ctx.stroke();
      }
    }
    ctx.fillStyle = pal.body;
    ctx.beginPath();
    ctx.ellipse(0, -0.2 * r, 0.5 * r, 0.7 * r, 0, 0, TAU);
    fillOutline();
    ctx.fillStyle = pal.light;
    for(let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(0, -0.8 * r - i * 0.2 * r);
      ctx.lineTo(-0.15 * r, -0.6 * r - i * 0.2 * r);
      ctx.lineTo(0.15 * r, -0.6 * r - i * 0.2 * r);
      ctx.fill();
    }
    ctx.fillStyle = pal.body;
    ctx.beginPath();
    ctx.moveTo(-0.35 * r, -0.2 * r);
    ctx.lineTo(0.35 * r, -0.2 * r);
    ctx.lineTo(0.15 * r, 0.6 * r);
    ctx.lineTo(-0.15 * r, 0.6 * r);
    ctx.closePath();
    fillOutline();
    ctx.fillStyle = pal.light;
    ctx.beginPath(); ctx.moveTo(-0.2 * r, -0.2 * r); ctx.quadraticCurveTo(-0.5 * r, -0.6 * r, -0.8 * r, -0.5 * r); ctx.quadraticCurveTo(-0.4 * r, -0.3 * r, -0.35 * r, -0.2 * r); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0.2 * r, -0.2 * r); ctx.quadraticCurveTo(0.5 * r, -0.6 * r, 0.8 * r, -0.5 * r); ctx.quadraticCurveTo(0.4 * r, -0.3 * r, 0.35 * r, -0.2 * r); ctx.fill();
    ctx.fillStyle = pal.eye;
    ctx.fillRect(-0.25 * r + ox, -0.1 * r + oy, 0.05 * r, 0.15 * r);
    ctx.fillRect(0.2 * r + ox, -0.1 * r + oy, 0.05 * r, 0.15 * r);
    ctx.fillStyle = pal.dark;
    disc(-0.08 * r, 0.4 * r, 0.04 * r);
    disc(0.08 * r, 0.4 * r, 0.04 * r);
  } else if (bossName === 'Statue of God') {
    ctx.fillStyle = pal.body;
    ctx.beginPath();
    ctx.rect(-1.1 * r, 1.2 * r, 2.2 * r, 0.3 * r);
    fillOutline();
    ctx.beginPath();
    ctx.moveTo(-0.7 * r, -0.3 * r);
    ctx.lineTo(0.7 * r, -0.3 * r);
    ctx.lineTo(0.55 * r, 1.2 * r);
    ctx.lineTo(-0.55 * r, 1.2 * r);
    ctx.closePath();
    fillOutline();
    for (let side of [-1, 1]) {
      ctx.beginPath();
      ctx.rect(side * 0.78 * r - (side < 0 ? 0.25 * r : 0), -0.3 * r, 0.25 * r, 1.2 * r);
      fillOutline();
    }
    ctx.beginPath();
    ctx.rect(-0.2 * r, -0.45 * r, 0.4 * r, 0.15 * r);
    fillOutline();
    ctx.beginPath();
    ctx.moveTo(-0.35 * r, -0.45 * r);
    ctx.lineTo(0.35 * r, -0.45 * r);
    ctx.lineTo(0.35 * r, -0.9 * r);
    ctx.lineTo(0.5 * r, -1.4 * r);
    ctx.lineTo(-0.5 * r, -1.4 * r);
    ctx.lineTo(-0.35 * r, -0.9 * r);
    ctx.closePath();
    fillOutline();
    ctx.strokeStyle = pal.light;
    ctx.lineWidth = 0.04 * r;
    for (let i = 1; i <= 4; i++) {
      const tx = -0.5 * r + (1.0 * r) * (i / 5);
      ctx.beginPath();
      ctx.moveTo(tx, -0.2 * r);
      ctx.lineTo(tx * 0.8, 1.0 * r);
      ctx.stroke();
    }
    ctx.fillStyle = pal.dark;
    ctx.fillRect(-0.25 * r, -0.7 * r, 0.5 * r, 0.08 * r);
    ctx.fillStyle = pal.eye; // the eye slits barely move up or down, so they always stay between the brow and the mouth
    ctx.fillRect(-0.25 * r + ox, -0.6 * r + oy * 0.25, 0.15 * r, 0.04 * r);
    ctx.fillRect(0.1 * r + ox, -0.6 * r + oy * 0.25, 0.15 * r, 0.04 * r);
    ctx.strokeStyle = pal.dark;
    ctx.lineWidth = 0.03 * r;
    ctx.beginPath();
    ctx.moveTo(-0.15 * r, -0.44 * r);
    ctx.lineTo(0.15 * r, -0.44 * r);
    ctx.stroke();
    ctx.lineWidth = 0.04 * r;
    ctx.beginPath();
    ctx.moveTo(0.2 * r, -1.4 * r);
    ctx.lineTo(0.1 * r, -1.2 * r);
    ctx.lineTo(0.15 * r, -1.0 * r);
    ctx.lineTo(0, -0.8 * r);
    ctx.lineTo(-0.1 * r, -0.8 * r);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-0.6 * r, -0.3 * r);
    ctx.lineTo(-0.4 * r, -0.1 * r);
    ctx.lineTo(-0.5 * r, 0.2 * r);
    ctx.lineTo(-0.3 * r, 0.4 * r);
    ctx.lineTo(-0.2 * r, 0.3 * r);
    ctx.lineTo(0.1 * r, 0.5 * r);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0.64 * r, 0.3 * r);
    ctx.lineTo(0.4 * r, 0.4 * r);
    ctx.lineTo(0.45 * r, 0.6 * r);
    ctx.lineTo(0.2 * r, 0.8 * r);
    ctx.lineTo(0.2 * r, 0.9 * r);
    ctx.stroke();
    ctx.lineWidth = Math.max(1.5, r * 0.05);
  }
  
  ctx.restore();
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
  if (e.isBoss) {
    drawBoss(e.def.name, sz, e.animT, e.facing.x, e.facing.y, { body: col, dark: e.hitFlash > 0 ? '#ffffff' : '#07070c', light: e.hitFlash > 0 ? '#ffffff' : bossTrim(e.color), eye: e.phase === 2 ? '#ffee66' : '#ff3344' });
  } else {
    ctx.fillStyle = col;
    if (e.kind === 'melee') { // horns
      ctx.beginPath(); ctx.moveTo(-sz*0.95, -sz*0.3); ctx.lineTo(-sz*0.75, -sz*1.35); ctx.lineTo(-sz*0.3, -sz*0.8);
      ctx.moveTo(sz*0.95, -sz*0.3); ctx.lineTo(sz*0.75, -sz*1.35); ctx.lineTo(sz*0.3, -sz*0.8); ctx.fill();
    }
    enemyPath(e, sz); ctx.fill();
    ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : '#07070c'; enemyPath(e, sz*0.66); ctx.fill();
    if (e.kind === 'caster') { ctx.fillStyle = col; for (let i = 0; i < 3; i++) { const a = e.animT*3 + i*TAU/3; disc(Math.cos(a)*sz*1.5, Math.sin(a)*sz*0.6 - sz*0.2, 2.5); } }
    // Eyes track the player
    const ox = e.facing.x*sz*0.16, oy = e.facing.y*sz*0.16 - sz*0.08, er = Math.max(1.6, sz*0.11);
    ctx.fillStyle = e.elite ? '#ffdd66' : '#ff8844';
    disc(ox - sz*0.24, oy, er); disc(ox + sz*0.24, oy, er);
  }
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
  const berserk = legionTimer > 0, boss = s.kind === 'boss';
  let r = boss ? 28 : s.grade === 'Elite' ? 16 : 12;
  if (s.atkT > 0) r *= 1.15;
  ctx.globalAlpha = berserk ? 0.35 : 0.2; ctx.fillStyle = berserk ? '#cc44ff' : COLORS.accent;
  ctx.beginPath(); ctx.ellipse(s.x, s.y + r*0.85, r*1.2, r*0.4, 0, 0, TAU); ctx.fill();
  if (boss) { ctx.globalAlpha = 0.12; disc(s.x, s.y, r*1.9); }
  ctx.save(); ctx.translate(s.x, s.y + Math.sin(s.animT*6)*1.5);
  ctx.globalAlpha = berserk ? 0.95 : 0.85;
  if (boss) {
    drawBoss(s.name, r, s.animT, s.facing.x, s.facing.y, { body: berserk ? '#2a0a3e' : '#1a0a2e', dark: '#0a0414', light: berserk ? '#dd77ff' : '#8855dd', eye: berserk ? '#ff88ff' : '#bb88ff' });
  } else {
    const e = { kind:s.kind || 'melee', facing:s.facing, animT:s.animT, state:'' };
    ctx.fillStyle = berserk ? '#2a0a3e' : '#1a0a2e'; enemyPath(e, r); ctx.fill();
    ctx.strokeStyle = berserk ? '#dd77ff' : '#8855dd'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#0a0414'; enemyPath(e, r*0.62); ctx.fill();
    const ox = s.facing.x*r*0.16, oy = s.facing.y*r*0.16 - r*0.08, er = Math.max(1.6, r*0.11);
    ctx.fillStyle = berserk ? '#ff66ff' : '#cc99ff';
    disc(ox - r*0.24, oy, er); disc(ox + r*0.24, oy, er);
  }
  ctx.restore();
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
    if (o.type === 'gear') { // a dropped item: a cut gem in its rarity colour, bobbing over a soft glow
      const s = 9, x = o.x, y = o.y - 5 + Math.sin(clock*3 + o.x*0.05)*3, col = GEAR_COLORS[o.item.rarity] || GEAR_COLORS[0];
      const gem = (...p) => { ctx.beginPath(); ctx.moveTo(x + p[0]*s, y + p[1]*s); for (let i = 2; i < p.length; i += 2) ctx.lineTo(x + p[i]*s, y + p[i+1]*s); ctx.closePath(); ctx.fill(); };
      ctx.globalAlpha = 0.25; ctx.fillStyle = '#000000'; ctx.beginPath(); ctx.ellipse(o.x, o.y + 9, 7, 2.5, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = col;
      ctx.globalAlpha = 0.13 + 0.05*Math.sin(clock*4 + o.x); disc(x, y, 22);
      ctx.globalAlpha = 0.28; disc(x, y, 13);
      ctx.globalAlpha = 1; gem(-0.45,-0.8, 0.45,-0.8, 0.85,-0.25, 0,1, -0.85,-0.25);       // the whole stone
      ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.5; gem(-0.45,-0.8, 0.45,-0.8, 0.3,-0.25, -0.3,-0.25); // the lit top face
      ctx.globalAlpha = 0.22; gem(-0.85,-0.25, -0.3,-0.25, 0,1);                               // a lit side
      ctx.fillStyle = '#000000'; ctx.globalAlpha = 0.3; gem(0.85,-0.25, 0.3,-0.25, 0,1);      // a shaded side
      ctx.globalAlpha = 1;
      continue;
    }
    const gold = o.type === 'gold';
    ctx.globalAlpha = 0.3; ctx.fillStyle = gold ? COLORS.gold : COLORS.health; disc(o.x, o.y, 9);
    ctx.globalAlpha = 1;
    if (gold) { ctx.beginPath(); ctx.moveTo(o.x, o.y - 5); ctx.lineTo(o.x + 4, o.y); ctx.lineTo(o.x, o.y + 5); ctx.lineTo(o.x - 4, o.y); ctx.fill(); }
    else { ctx.fillRect(o.x - 1.5, o.y - 5, 3, 10); ctx.fillRect(o.x - 5, o.y - 1.5, 10, 3); }
  }
  ctx.globalAlpha = 1;
}

// The old stick-figure hunter, kept so the player can switch back to it (Controls tab, "Hunter look")
function drawHunterClassic(x, y, o) {
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
