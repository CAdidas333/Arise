# Brief: give the hunter a real body (jointed parts) in place of the stick figure

Everything you need is in this repo. Do not read or write anything outside it. Read only `drawHunter` in `js/11-render-world.js` (lines 88 to 121); do not browse the rest of the code.

## Background
`Arise` is a canvas action game. Scripts in `js/` are classic `<script>` files sharing one global scope (no modules, no build step). The player's hunter is drawn by `drawHunter(x, y, o)` as a glowing stick figure seen from the side. It becomes a character with a body: a dark combat vest with a glowing zip, bare upper arms, wrapped forearms, dark trousers, boots, short spiky black hair and a blade in each hand. The approved look is `docs/art-direction/hunter-style/hunter_style_c_v1.png` (do not open or change it; the numbers below already encode it).

The poses do not change: the same angles (`lA`, `rA` arms, `lL`, `rL` legs, `lean`, `bob`, `sw` blade) drive the new body. Arms and legs each become two pieces with an elbow or a knee.

Globals already available: `ctx`, `TAU`, and `line(x1, y1, x2, y2)` (strokes one line with the current stroke style).

The function is called in two ways, and both must keep working with no change to the callers:
- the player: `color` (glow colour), `body`, `blade`, `eye`, `cape`, `face`, `anim`, `t`, `scale`, `atkP`, `atkDir`;
- afterimages: `color`, `body` and `cape` all set to the same colour, and no `blade`. These must be drawn as a plain one-colour silhouette of the same parts.

## The change: replace the whole of `drawHunter` (lines 88 to 121 of `js/11-render-world.js`) with this

```js
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
  // Afterimages pass one colour for everything: draw them as a plain silhouette of the same parts
  const col = o.color, mono = o.body === col;
  const PAL = { vest:'#1b1a33', trim:'#2a2950', pants:'#20203a', far:'#15152a', boot:'#0c0814', skin:'#33224a', skinFar:'#241835', wrap:'#4a4474', wrapFar:'#353058', hair:'#0d0915', head:'#1a1026', strap:'#0c0a16' };
  const pc = n => mono ? col : PAL[n];
  const headR = 6.2*s, headY = -30*s, shY = -20*s, hipY = -4*s, uArm = 7*s, fArm = 6.5*s, thigh = 8.5*s, shin = 8.5*s;
  // One limb piece: a soft rim in the glow colour, then the part itself on top
  const seg = (x1, y1, x2, y2, w, fill) => {
    if (!mono) { ctx.globalAlpha = ga*0.5; ctx.strokeStyle = col; ctx.lineWidth = w + 1.6*s; line(x1, y1, x2, y2); }
    ctx.globalAlpha = ga; ctx.strokeStyle = fill; ctx.lineWidth = w; line(x1, y1, x2, y2);
  };
  // A two-piece limb from (x0, y0). Angles are from straight down, positive = forward. Returns [jointX, jointY, endX, endY]
  const limb = (x0, y0, a, bend, l1, l2, w, c1, c2) => {
    const jx = x0 + S(a)*l1, jy = y0 + C(a)*l1, ex = jx + S(a+bend)*l2, ey = jy + C(a+bend)*l2;
    seg(x0, y0, jx, jy, w, c1); seg(jx, jy, ex, ey, w*0.86, c2);
    return [jx, jy, ex, ey];
  };
  const knee = a => -(0.12 + (a < 0 ? -a*0.9 : a*0.5)), elbow = a => 0.3 + Math.abs(a)*0.25;
  const leg = (hx, a, w, c) => {
    const [jx, jy, ex, ey] = limb(hx, hipY, a, knee(a), thigh, shin, w, c, c);
    seg(jx + (ex-jx)*0.45, jy + (ey-jy)*0.45, ex, ey, w*0.9, pc('boot')); seg(ex, ey, ex + 3.2*s, ey, w*0.72, pc('boot')); // boot, then the foot
  };
  const blade = (hx, hy, a, len, alpha) => {
    if (!o.blade) return;
    const bx = hx + S(a)*len, by = hy - C(a)*len;
    ctx.strokeStyle = o.blade; ctx.lineWidth = 7*s; ctx.globalAlpha = ga*0.35*alpha; line(hx, hy, bx, by);
    ctx.globalAlpha = ga*alpha; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2*s; line(hx, hy, bx, by);
    ctx.strokeStyle = PAL.strap; ctx.lineWidth = 1.7*s; line(hx - C(a)*2.4*s, hy - S(a)*2.4*s, hx + C(a)*2.4*s, hy + S(a)*2.4*s); // crossguard
    ctx.globalAlpha = ga;
  };
  // Back to front: far arm and its blade, both legs, the vest, the head, then the near arm and its blade
  { const [, , hx, hy] = limb(-1.5*s, shY + 1*s, lA, elbow(lA), uArm, fArm, 3.6*s, pc('skinFar'), pc('wrapFar')); blade(hx, hy, lA - 0.5, 17*s, 0.75); }
  leg(-1*s, lL, 4.6*s, pc('far'));
  leg(1*s, rL, 5*s, pc('pants'));
  if (!mono) { const mx = 1*s + S(rL)*thigh*0.55, my = hipY + C(rL)*thigh*0.55; ctx.strokeStyle = PAL.strap; ctx.lineWidth = 1.3*s; line(mx - C(rL)*2.2*s, my + S(rL)*2.2*s, mx + C(rL)*2.2*s, my - S(rL)*2.2*s); } // thigh strap
  ctx.beginPath(); ctx.moveTo(-5*s, shY - 1*s); ctx.lineTo(4.6*s, shY - 1*s); ctx.lineTo(3.6*s, hipY + 1.5*s); ctx.lineTo(-3.6*s, hipY + 1.5*s); ctx.closePath();
  ctx.fillStyle = pc('vest'); ctx.fill();
  if (!mono) {
    ctx.globalAlpha = ga*0.5; ctx.strokeStyle = col; ctx.lineWidth = 1*s; ctx.stroke(); ctx.globalAlpha = ga;
    ctx.fillStyle = PAL.trim; ctx.fillRect(-3.4*s, shY + 3.5*s, 3*s, 3.4*s); // chest pocket
    ctx.strokeStyle = PAL.trim; ctx.lineWidth = 4.4*s; line(-0.6*s, shY - 0.5*s, 0.6*s, shY - 3.6*s); // high collar
    ctx.strokeStyle = PAL.strap; ctx.lineWidth = 1.9*s; line(-2.6*s, hipY, 2.6*s, hipY); // belt
    ctx.strokeStyle = col; ctx.lineWidth = 1.1*s; line(2.4*s, shY - 0.5*s, 2*s, hipY - 1.4*s); // the glowing zip
  }
  const hx0 = 0.6*s; // the head sits a touch forward of the spine
  ctx.fillStyle = pc('head'); ctx.beginPath(); ctx.arc(hx0, headY, headR, 0, TAU); ctx.fill();
  if (!mono) { ctx.globalAlpha = ga*0.55; ctx.strokeStyle = col; ctx.lineWidth = 1*s; ctx.stroke(); ctx.globalAlpha = ga; }
  // Short spiky hair over the top and back of the head; points are in head radii from the head's centre
  const hair = [[0.95,-0.3],[0.25,-1.3],[-0.3,-1.02],[-0.85,-1.4],[-0.95,-0.62],[-1.6,-0.5],[-1.02,0.1],[-1.3,0.72],[-0.55,0.45],[-0.15,-0.25],[0.5,-0.5]];
  ctx.beginPath(); hair.forEach(([px, py], i) => { if (i) ctx.lineTo(hx0 + px*headR, headY + py*headR); else ctx.moveTo(hx0 + px*headR, headY + py*headR); }); ctx.closePath();
  ctx.fillStyle = pc('hair'); ctx.fill();
  if (!mono) {
    ctx.globalAlpha = ga*0.45; ctx.strokeStyle = col; ctx.lineWidth = 0.8*s; ctx.stroke(); ctx.globalAlpha = ga;
    ctx.fillStyle = o.eye || col; ctx.fillRect(hx0 + 2*s, headY - 1.2*s, 3*s, 1.7*s);
  }
  { const [, , hx, hy] = limb(1.5*s, shY + 1*s, rA, elbow(rA), uArm, fArm, 4*s, pc('skin'), pc('wrap')); blade(hx, hy, sw, 19*s, 1); }
  ctx.globalAlpha = ga;
  ctx.restore();
}
```

Use the code as written. The first six lines of the function (down to the `dash` line) are the existing lines, unchanged. The cape is gone on purpose: the approved look has none, so `o.cape` is no longer read.

## Constraints
- Change only `js/11-render-world.js`, and in it only the function `drawHunter`. Every other function in the file stays byte for byte as it is.
- Do not edit `index.html` or any other file. Do not create files. Do not touch `assets/`, `docs/`, `tools/` or `3d/`.
- No star shapes, runes or symbols.
- Commit nothing but that one file.

## Checks to run before you finish
```bash
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done
grep -c "const mono = o.body === col" js/11-render-world.js    # expect 1
grep -c "const limb = " js/11-render-world.js                  # expect 1
grep -c "o.cape" js/11-render-world.js                         # expect 0
grep -c "^function " js/11-render-world.js                     # expect 9 (the same functions as before)
git status --short                                             # expect only js/11-render-world.js
```

## Done looks like
No `FAIL` lines, the greps match, one file changed, and `git diff --stat` shows changes only inside `drawHunter`.
