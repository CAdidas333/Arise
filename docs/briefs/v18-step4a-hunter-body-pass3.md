# Hunter body, pass 3: bring the in-game hunter closer to the picture Chris picked

## Goal
The hunter is drawn with canvas shapes by `drawHunter(x, y, o)` in `js/11-render-world.js` (it starts at the line `function drawHunter(x, y, o) {`). It works, but next to the approved picture it is too plain: capsule limbs with a glow outline, mitten-like boots, a big head, short light-tube blades. Redraw the body so that, in side view, it reads as the character in the picture.

Look at both images before you write anything:
- The target: `docs/art-direction/hunter-style/hunter_style_c_v1.png` (front view of the approved character).
- What the game draws today: `docs/previews/hunter_body_poses_v2.jpg`.

## Hard limits
- Change ONLY the inside of `drawHunter` in `js/11-render-world.js`. No other function, no other file. Do not run `tools/stamp.sh`. Commit nothing else.
- Keep the signature and the meaning of `o`: `{ face, anim, t, scale, color, body, blade, eye, cape, atkP, atkDir }`. Ignore `o.cape` (no cape).
- Keep the first block that sets `lA, rA, lL, rL, lean, bob, sw` for `idle`, `run`, `attack`, `dash` exactly as it is, and keep the `ctx.save(); ctx.translate(...); ctx.scale(...); ctx.rotate(lean);` lines. The animation timing must not change.
- Keep the `mono` rule: when `o.body === o.color` (afterimages) every part is filled with `o.color` only, with no outline, no detail lines and no blades unless `o.blade` is set. A plain one-colour silhouette of the same shapes.
- When `o.blade` is falsy draw no blades.
- Always leave `ctx.globalAlpha` as it was on entry (`ga`) and end with `ctx.restore()`.
- The figure faces right (+x); `ctx.scale` flips it. Everything is in units of `s` (`o.scale`). Feet rest at about `y = +13*s`, the top of the hair at about `y = -37*s`. Keep that overall height so effects and the ground shadow still line up.
- Plain canvas 2D only (paths, fills, strokes). No images, no gradients created per frame except at most one `createLinearGradient` per blade, no `shadowBlur`, no filters. This runs every frame.
- Art rule: no star symbols, no runes, no occult marks, no emblems of any kind. Plain clothing shapes only.

## What to change, part by part

1. **Proportions: less of a doll.** Head radius `4.6*s` (was 5.4), head centre `y = -30.5*s`. Shoulders at `shY = -21*s`, hips at `hipY = -5*s`, thigh `9*s`, shin `9*s`. Shoulders broad, waist narrow.
2. **Outline glow: nearly gone.** The picture has no outline. Halve the rim: alpha `ga*0.18`, width `w + 0.6*s`. Draw the rim only on the legs, the far arm and the torso, never on the head, hair, boots or the near arm. Lift readability with colour instead (see the palette below).
3. **Legs are baggy cargo trousers tucked into tall boots.**
   - Thigh `6.6*s` wide; the lower leg of the trousers is a little WIDER than the thigh (`7*s`) and stops with a square cuff (`lineCap = 'butt'` for that piece, or a filled polygon) about 50 percent of the way down the shin.
   - Below the cuff a tall boot shaft, narrower than the trousers (`4.6*s`), near-black.
   - The foot is a filled shape, not a stroked line: heel about `1.6*s` behind the ankle, toe about `5.2*s` in front, about `2.8*s` tall, flat on the bottom, rounded toe, with a thin lighter sole line along the bottom (`PAL.sole`). It must look like a boot with a toe and a heel, not a mitten or a ball.
   - On the near leg only: a cargo pocket on the outer thigh (a small rectangle in `PAL.trim`, rotated with the thigh) and two thin dark straps across the thigh above it.
   - The far leg is the same shape in the darker `far` colours, no pocket or straps.
4. **Torso is a sleeveless combat vest, worn open, with a high collar.**
   - A filled polygon with a chest: back nearly straight, front bulging forward at chest height, narrow at the belt. About `11.5*s` wide at the chest and `8*s` at the waist.
   - Along the front edge show the open vest: a strip of darker shirt (`PAL.shirt`, about `1.6*s` wide) at the very front, then the bright zip line (colour `o.color`, about `1*s` wide) just behind it, running from the collar to just above the belt. This glowing zip is the character's signature; keep it crisp.
   - A standing collar: a small filled shape rising from the shoulders to just under the jaw, with the zip colour along its front edge.
   - A darker shoulder patch on the near shoulder, one chest pocket and one lower pocket (rectangles in `PAL.trim` with a 1-pixel darker flap line), a belt (`PAL.strap`) with a small lighter buckle (`PAL.steel`) at the front.
5. **Arms are bare and strong.** Upper arm `4.9*s` wide in `PAL.skin`; forearm `4.3*s` in `PAL.wrap` (the cloth wrap) with three thin darker diagonal lines across it (`PAL.wrapLine`) so it reads as wrapped cloth; a fist (a filled circle, radius `2.2*s`, `PAL.skin`) at the end. The far arm uses the `Far` colours and has no cross lines.
6. **Twin blades: real short swords.** Near blade `24*s` long, far blade `22*s`. A tapered double-edged shape `3.4*s` wide at the guard coming to a point; fill it in two halves split along its length (one half `PAL.steel`, the other `PAL.steelDark`) so it has a centre ridge; a thin white edge highlight on the light half. A dark crossguard `6.6*s` wide, a grip through the fist, and a small brown pommel dot (`PAL.pommel`). Behind the blade keep a faint glow in `o.blade` (alpha `ga*0.2`, width `5*s`). The far blade is drawn at 0.8 alpha.
7. **The far blade while running.** Today its angle is `lA + 0.9`, so it whips around as the arm swings. Use `o.anim === 'run' ? 1.2 + lA*0.25 : lA + 0.9` so it stays pointing forward and slightly down in a run. (Blade angle `a`: direction is `(sin a, -cos a)`, so 0 is straight up and `PI/2` is straight ahead.)
8. **Head and hair.** A dark face. Messy, spiky hair like the picture: it covers the top and back of the head and a fringe falls FORWARD over the brow, with five to seven uneven spikes. Keep the small glowing eye rectangle (`o.eye || o.color`) just under the fringe.
9. **Draw order, back to front:** far arm with its blade, far leg, near leg, torso and its details, head and hair, near arm with its blade.

## Palette (use these; they are lifted so the body reads on dark floors)
```js
const PAL = { vest:'#2b2a58', trim:'#3d3c78', shirt:'#14132a', pants:'#32325a', far:'#20203c', boot:'#15131f', sole:'#3a3850', skin:'#54407a', skinFar:'#3a2b55', wrap:'#7a72b4', wrapFar:'#544d84', wrapLine:'#3f3a6c', hair:'#0d0915', head:'#2a1b3e', strap:'#0c0a16', steel:'#d4d6ea', steelDark:'#8f92b8', pommel:'#6b4a3a' };
```
Keep `const pc = n => mono ? col : PAL[n];` and use it for every body part so afterimages stay one colour.

## Checks to run before you finish
```bash
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done
grep -c "^function " js/11-render-world.js      # expect 9
grep -c "shadowBlur" js/11-render-world.js      # expect 1 (the arena wall line that is already there)
grep -c "PAL.pommel\|pc('pommel')" js/11-render-world.js   # expect 1 or more
git status --short                              # expect only js/11-render-world.js
git diff --stat                                 # one file
```

## Done looks like
No `FAIL` lines, the greps match, one file changed, and every change is inside `drawHunter`. The orchestrator will judge the look from captured frames (standing, running, attacking, dashing, the purple and red colour states, and the one-colour afterimage), so make each of those states work.
