# Keep the old stick-figure hunter one switch away

## Goal
The hunter got a new body. The player must be able to switch back to the old stick-figure drawing from the Controls tab, and the choice must be saved. The new body stays the default.

## Not in this job
Do not change `drawHunter` itself (another job is editing it right now). Do not touch `index.html`, anything in `3d/`, `tools/`, `assets/` or `docs/`. Do not run `tools/stamp.sh`. No new files.

## Changes (five files, all in `js/`)

### 1. `js/02-audio.js`, line 8
`const settings = { music:0.4, sfx:0.6, aim:'auto' };` becomes
`const settings = { music:0.4, sfx:0.6, aim:'auto', hunter:'new' };`

### 2. `js/03-state.js`
Directly after the line `if (!AIM_MODES.includes(settings.aim)) settings.aim = 'auto';` add:
`if (settings.hunter !== 'classic') settings.hunter = 'new';`

### 3. `js/11-render-world.js`
Append the function below at the very END of the file (after the last line; do not put it anywhere else and do not edit any existing line in this file). It is the old drawing, copied from git history, renamed `drawHunterClassic`. Copy it exactly.

```js
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
```

### 4. `js/12-render-fx.js`, the two calls to `drawHunter`
There are exactly two calls (one draws the player, one draws the afterimages in the `for (const g of ghosts)` loop). Directly above the line that starts `drawHunter(player.x, player.y, {` add:

`const classicLook = settings.hunter === 'classic', hunterFn = classicLook ? drawHunterClassic : drawHunter, hunterScale = classicLook ? 1.15 : 1.35;`

Then in BOTH calls replace the function name `drawHunter` with `hunterFn` and replace `scale:1.15` with `scale:hunterScale`. Change nothing else on those lines. Make sure the new `const` line is in the same function scope as both calls (both calls are in the same function; check that before you finish).

### 5. `js/09-ui.js`, function `tabControls`
In the `right` string, the Settings section currently goes: `'<h3>Settings</h3>' + (isMobile ? '' : ...aim row...) + slider('music', 'Music') + ...`. Insert a new row between the aim row and `slider('music', 'Music')`, shown on every device (not inside the `isMobile` check):

```js
    + `<div class="stat-row"><span class="stat-name">Hunter look</span><button class="sys-btn" data-act="look">${settings.hunter === 'classic' ? 'CLASSIC' : 'NEW'}</button></div><div style="font-size:12px;color:rgba(255,255,255,0.45);padding:4px 0 8px">${settings.hunter === 'classic' ? 'The original stick-figure hunter.' : 'The hunter with a full body.'}</div>`
```

### 6. `js/10-actions.js`
- In the `switch` that has `case 'aim': cycleAim(); break;` add directly after that line: `case 'look': cycleLook(); break;`
- Directly after the closing brace of `function cycleAim() { ... }` add:

```js
function cycleLook() {
  settings.hunter = settings.hunter === 'classic' ? 'new' : 'classic';
  saveGame(); playSfx('ui');
  toast(settings.hunter === 'classic' ? 'HUNTER LOOK: CLASSIC' : 'HUNTER LOOK: NEW', 'blue', 2000);
}
```

## Checks to run before you finish
```bash
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done
grep -c "^function drawHunterClassic" js/11-render-world.js   # expect 1
grep -c "^function drawHunter(" js/11-render-world.js          # expect 1
grep -c "hunterFn(" js/12-render-fx.js                         # expect 2
grep -c "drawHunter(" js/12-render-fx.js                       # expect 0
grep -c "scale:1.15" js/12-render-fx.js                        # expect 0
grep -c "case 'look'" js/10-actions.js                         # expect 1
grep -c "data-act=\"look\"" js/09-ui.js                        # expect 1
git status --short                                             # expect exactly the five js files above
```

## Done looks like
No `FAIL` lines, every grep matches, exactly five files changed, and `git diff js/11-render-world.js` shows only added lines at the end of the file.
