# Feedback on pass 1 of the hunter's body: it still reads as a glowing stick figure

Pass 1 was implemented exactly as briefed, so the faults are in the brief, not in your work. Seen in the browser, the result has seven problems. This pass replaces the function again with corrected numbers.

1. The glow rim is too thick and too bright, so every part looks like an outlined capsule. It becomes thinner and fainter.
2. Each joint shows a ring, because the second piece's rim is drawn over the first piece. Both rims are now drawn first, then both parts.
3. Limbs are too thin. They get thicker and taper (thigh wider than shin, upper arm wider than forearm).
4. The vest is too narrow and too dark to read on dark floors. It gets wider and every colour is lifted.
5. The head is too big. It gets smaller.
6. The blades look like light tubes. They become tapered steel blades with a faint glow.
7. Standing still, the two legs overlap into one and the far blade crosses the chest. The idle stance spreads the legs slightly and the far blade points forward.

## The change: replace the whole of `drawHunter` in `js/11-render-world.js` with this

```js
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
  // Lifted from the approved picture's near-black navy so the body still reads on dark floors
  const PAL = { vest:'#23224a', trim:'#34336a', pants:'#2a2a4c', far:'#1b1b33', boot:'#12101f', skin:'#4a3466', skinFar:'#33254a', wrap:'#6a63a0', wrapFar:'#4a4474', hair:'#0d0915', head:'#241634', strap:'#0c0a16', steel:'#b9bbd6' };
  const pc = n => mono ? col : PAL[n];
  const headR = 5.4*s, headY = -29.5*s, shY = -20*s, hipY = -4*s, uArm = 7*s, fArm = 6.5*s, thigh = 8.5*s, shin = 8.5*s;
  const rim = (x1, y1, x2, y2, w) => { if (mono) return; ctx.globalAlpha = ga*0.35; ctx.strokeStyle = col; ctx.lineWidth = w + 0.9*s; line(x1, y1, x2, y2); ctx.globalAlpha = ga; };
  const part = (x1, y1, x2, y2, w, fill) => { ctx.strokeStyle = fill; ctx.lineWidth = w; line(x1, y1, x2, y2); };
  // A two-piece limb from (x0, y0). Angles are from straight down, positive = forward. Both rims go down first so none cuts across the joint.
  const limb = (x0, y0, a, bend, l1, l2, w1, w2, c1, c2) => {
    const jx = x0 + S(a)*l1, jy = y0 + C(a)*l1, ex = jx + S(a+bend)*l2, ey = jy + C(a+bend)*l2;
    rim(x0, y0, jx, jy, w1); rim(jx, jy, ex, ey, w2);
    part(x0, y0, jx, jy, w1, c1); part(jx, jy, ex, ey, w2, c2);
    return [jx, jy, ex, ey];
  };
  const knee = a => -(0.12 + (a < 0 ? -a*0.9 : a*0.5)), elbow = a => 0.3 + Math.abs(a)*0.25;
  const leg = (hx, a, w, c) => {
    const [jx, jy, ex, ey] = limb(hx, hipY, a, knee(a), thigh, shin, w, w*0.8, c, c);
    rim(ex, ey, ex + 3.4*s, ey, w*0.62);
    part(jx + (ex-jx)*0.4, jy + (ey-jy)*0.4, ex, ey, w*0.8, pc('boot')); part(ex, ey, ex + 3.4*s, ey, w*0.62, pc('boot')); // boot, then the foot
  };
  const blade = (hx, hy, a, len, alpha) => {
    if (!o.blade) return;
    const dx = S(a), dy = -C(a), nx = C(a), ny = S(a), tx = hx + dx*len, ty = hy + dy*len, gx = hx + dx*2.2*s, gy = hy + dy*2.2*s;
    ctx.globalAlpha = ga*0.22*alpha; ctx.strokeStyle = o.blade; ctx.lineWidth = 4.6*s; line(gx, gy, tx, ty); // faint glow in the weapon's colour
    ctx.globalAlpha = ga*alpha; ctx.fillStyle = PAL.steel;
    ctx.beginPath(); ctx.moveTo(gx - nx*1.5*s, gy - ny*1.5*s); ctx.lineTo(tx, ty); ctx.lineTo(gx + nx*1.5*s, gy + ny*1.5*s); ctx.closePath(); ctx.fill(); // tapered steel
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.7*s; line(gx + nx*0.2*s, gy + ny*0.2*s, tx, ty); // edge highlight
    ctx.strokeStyle = PAL.strap; ctx.lineWidth = 1.7*s; line(gx - nx*2.6*s, gy - ny*2.6*s, gx + nx*2.6*s, gy + ny*2.6*s); // crossguard
    ctx.lineWidth = 1.5*s; line(hx - dx*1.2*s, hy - dy*1.2*s, gx, gy); // grip
    ctx.globalAlpha = ga;
  };
  // Back to front: far arm and its blade, both legs, the vest, the head, then the near arm and its blade
  { const [, , hx, hy] = limb(-2*s, shY + 1.2*s, lA, elbow(lA), uArm, fArm, 3.9*s, 3.4*s, pc('skinFar'), pc('wrapFar')); blade(hx, hy, lA + 0.9, 18*s, 0.8); }
  leg(-1.2*s, lL, 5.2*s, pc('far'));
  leg(1.2*s, rL, 6.2*s, pc('pants'));
  if (!mono) { const mx = 1.2*s + S(rL)*thigh*0.55, my = hipY + C(rL)*thigh*0.55; ctx.strokeStyle = PAL.strap; ctx.lineWidth = 1.3*s; line(mx - C(rL)*2.6*s, my + S(rL)*2.6*s, mx + C(rL)*2.6*s, my - S(rL)*2.6*s); } // thigh strap
  ctx.beginPath(); ctx.moveTo(-6*s, shY - 1.2*s); ctx.lineTo(5.4*s, shY - 1.2*s); ctx.lineTo(4.2*s, hipY + 1.8*s); ctx.lineTo(-4.2*s, hipY + 1.8*s); ctx.closePath();
  ctx.fillStyle = pc('vest'); ctx.fill();
  if (!mono) {
    ctx.globalAlpha = ga*0.4; ctx.strokeStyle = col; ctx.lineWidth = 0.9*s; ctx.stroke(); ctx.globalAlpha = ga;
    ctx.fillStyle = PAL.trim; ctx.fillRect(-4.2*s, shY + 3.5*s, 3.4*s, 3.6*s); // chest pocket
    ctx.strokeStyle = PAL.trim; ctx.lineWidth = 4.4*s; line(-0.6*s, shY - 0.5*s, 0.6*s, shY - 3.6*s); // high collar
    ctx.strokeStyle = PAL.strap; ctx.lineWidth = 1.9*s; line(-3.2*s, hipY + 0.2*s, 3.2*s, hipY + 0.2*s); // belt
    ctx.strokeStyle = col; ctx.lineWidth = 1.2*s; line(3*s, shY - 0.6*s, 2.5*s, hipY - 1.2*s); // the glowing zip
  }
  const hx0 = 0.6*s; // the head sits a touch forward of the spine
  ctx.fillStyle = pc('head'); ctx.beginPath(); ctx.arc(hx0, headY, headR, 0, TAU); ctx.fill();
  if (!mono) { ctx.globalAlpha = ga*0.45; ctx.strokeStyle = col; ctx.lineWidth = 0.9*s; ctx.stroke(); ctx.globalAlpha = ga; }
  // Short spiky hair over the top and back of the head; points are in head radii from the head's centre
  const hair = [[0.95,-0.3],[0.25,-1.3],[-0.3,-1.02],[-0.85,-1.4],[-0.95,-0.62],[-1.6,-0.5],[-1.02,0.1],[-1.3,0.72],[-0.55,0.45],[-0.15,-0.25],[0.5,-0.5]];
  ctx.beginPath(); hair.forEach(([px, py], i) => { if (i) ctx.lineTo(hx0 + px*headR, headY + py*headR); else ctx.moveTo(hx0 + px*headR, headY + py*headR); }); ctx.closePath();
  ctx.fillStyle = pc('hair'); ctx.fill();
  if (!mono) {
    ctx.globalAlpha = ga*0.4; ctx.strokeStyle = col; ctx.lineWidth = 0.8*s; ctx.stroke(); ctx.globalAlpha = ga;
    ctx.fillStyle = o.eye || col; ctx.fillRect(hx0 + 1.8*s, headY - 1.1*s, 2.8*s, 1.6*s);
  }
  { const [, , hx, hy] = limb(2*s, shY + 1.2*s, rA, elbow(rA), uArm, fArm, 4.6*s, 4*s, pc('skin'), pc('wrap')); blade(hx, hy, sw, 20*s, 1); }
  ctx.globalAlpha = ga;
  ctx.restore();
}
```

Use the code as written. Change only `js/11-render-world.js`, and in it only `drawHunter`. Do not touch any other file. Commit nothing but that one file.

## Checks to run before you finish
```bash
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done
grep -c "const rim = " js/11-render-world.js       # expect 1
grep -c "const seg = " js/11-render-world.js       # expect 0
grep -c "PAL.steel" js/11-render-world.js          # expect 1
grep -c "^function " js/11-render-world.js         # expect 9
git status --short                                 # expect only js/11-render-world.js
```

## Done looks like
No `FAIL` lines, the greps match, one file changed, changes only inside `drawHunter`.
