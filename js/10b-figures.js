'use strict';

// ================================================================
//  FIGURES — enemy and boss drawing, shared by the 2D and 3D pages (the Record pictures)
// ================================================================
const line = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
const disc = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };

// Body silhouettes, one per archetype — drawn twice (colour, then a dark core)
function enemyPath(e, r) {
  ctx.beginPath();
  switch (e.kind) {
    case 'melee': case 'flee': ctx.arc(0, 0, r, 0, TAU); break; // a Gilded Goblin is a small round goblin
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
    // The greatsword is held low in the right hand, point down and out, with a guard swept toward the blade,
    // so it never sits upright on the body's centre line, where blade and guard could read as a cross (art rule)
    ctx.save();
    ctx.translate(0.72 * r, 0.2 * r);
    ctx.rotate(-0.38);
    ctx.fillStyle = pal.light;
    ctx.beginPath();
    ctx.moveTo(-0.14 * r, 0.06 * r);
    ctx.lineTo(0.14 * r, 0.06 * r);
    ctx.lineTo(0.1 * r, 1.12 * r);
    ctx.lineTo(0, 1.32 * r);
    ctx.lineTo(-0.1 * r, 1.12 * r);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = pal.dark;
    ctx.beginPath(); ctx.moveTo(0, 0.1 * r); ctx.lineTo(0, 1.15 * r); ctx.stroke();
    ctx.fillStyle = pal.light;
    ctx.beginPath();
    ctx.moveTo(-0.26 * r, 0.22 * r);
    ctx.quadraticCurveTo(0, -0.1 * r, 0.26 * r, 0.22 * r);
    ctx.quadraticCurveTo(0, 0.04 * r, -0.26 * r, 0.22 * r);
    ctx.fill();
    disc(0, -0.08 * r, 0.1 * r);
    disc(0, -0.25 * r, 0.06 * r);
    ctx.restore();
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
  if (player && e === player.target) { // the floor mark under the enemy the hunter has squared up to
    ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(0,212,255,0.55)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(e.x, e.y + sz*0.85, sz + 10, (sz + 10)*0.45, 0, 0, TAU); ctx.stroke();
  }
  ctx.globalAlpha = grow*0.4; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(e.x, e.y + sz*0.85, sz*0.95, sz*0.32, 0, 0, TAU); ctx.fill();
  if (e.elite || e.isBoss) { // aura
    ctx.globalAlpha = grow*(0.1 + 0.05*Math.sin(clock*4)); ctx.fillStyle = e.isBoss ? (e.phase >= 2 ? '#ff2222' : COLORS.danger) : '#ffcc66';
    disc(e.x, e.y, sz*(e.isBoss ? 2.1 : 1.8));
    ctx.globalAlpha = grow*0.7; ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(e.x, e.y, sz*1.5, clock*2, clock*2 + 4.2); ctx.stroke();
  }
  if (e.kind === 'flee') { // a Gilded Goblin: a faint round gold glow, no ring
    ctx.globalAlpha = grow*(0.14 + 0.05*Math.sin(clock*5 + e.animT)); ctx.fillStyle = e.color; disc(e.x, e.y, sz*1.9);
    ctx.globalAlpha = grow*0.12; disc(e.x, e.y, sz*2.7);
  }
  ctx.globalAlpha = grow;
  ctx.save(); ctx.translate(e.x, e.y + (e.isBoss ? 0 : Math.sin(e.animT*6)*1.5)); ctx.scale(grow, grow);
  if (e.isBoss) {
    drawBoss(e.def.name, sz, e.animT, e.facing.x, e.facing.y, { body: col, dark: e.hitFlash > 0 ? '#ffffff' : '#07070c', light: e.hitFlash > 0 ? '#ffffff' : bossTrim(e.color), eye: e.phase >= 2 ? '#ffee66' : '#ff3344' });
  } else {
    ctx.fillStyle = col;
    if (e.kind === 'melee' || e.kind === 'flee') { // horns
      ctx.beginPath(); ctx.moveTo(-sz*0.95, -sz*0.3); ctx.lineTo(-sz*0.75, -sz*1.35); ctx.lineTo(-sz*0.3, -sz*0.8);
      ctx.moveTo(sz*0.95, -sz*0.3); ctx.lineTo(sz*0.75, -sz*1.35); ctx.lineTo(sz*0.3, -sz*0.8); ctx.fill();
    }
    enemyPath(e, sz); ctx.fill();
    ctx.fillStyle = e.hitFlash > 0 ? '#ffffff' : '#07070c'; enemyPath(e, sz*0.66); ctx.fill();
    if (e.kind === 'caster') { ctx.fillStyle = col; for (let i = 0; i < 3; i++) { const a = e.animT*3 + i*TAU/3; disc(Math.cos(a)*sz*1.5, Math.sin(a)*sz*0.6 - sz*0.2, 2.5); } }
    // Eyes track the player
    const ox = e.facing.x*sz*0.16, oy = e.facing.y*sz*0.16 - sz*0.08, er = Math.max(1.6, sz*0.11);
    ctx.fillStyle = e.elite ? '#ffdd66' : e.kind === 'flee' ? '#fff3b0' : '#ff8844';
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

// Record tab picture: each enemy or boss drawn facing the viewer in a 96x96 square, or as a flat dark silhouette if never slain
const RECORD_PICS = {};
function recordPic(def, boss, known) {
  const k = def.name + (known ? '' : '?');
  if (RECORD_PICS[k]) return RECORD_PICS[k];
  const S = 96, sc = S*0.35/def.size;
  ctx.save();
  try { // a picture that cannot be drawn (seen once on the first frame after load) leaves the row without one and is tried again next time; the tab still opens
    ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0, 0, S, S);
    ctx.translate(S/2, S/2); ctx.scale(sc, sc);
    drawEnemy({ x:0, y:0, size:def.size, kind:def.kind, color:def.color, facing:{ x:0, y:1 }, animT:0, spawnT:0, hitFlash:0, state:'chase', elite:false, isBoss:!!boss, def, phase:1, name:def.name });
    if (!known) { ctx.setTransform(1,0,0,1,0,0); ctx.globalCompositeOperation = 'source-atop'; ctx.fillStyle = '#1a1d2a'; ctx.fillRect(0, 0, S, S); }
    const off = document.createElement('canvas'); off.width = off.height = S;
    off.getContext('2d').drawImage(canvas, 0, 0, S, S, 0, 0, S, S);
    return RECORD_PICS[k] = off.toDataURL();
  } catch (e) { return ''; } finally { ctx.restore(); }
}
