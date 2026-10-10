# Feedback on hunter body pass 3: accepted in shape, four small fixes

Seen in captured frames, the new body is a clear step toward the picture: the outline doll is gone, the vest, trousers, boots and swords read correctly, and every state works. Keep everything as it is except the four points below. Change only `drawHunter` in `js/11-render-world.js`.

1. **The blade glow is too heavy; the swords read as light tubes again.** Make the glow behind each blade thinner and fainter: line width `3.6*s` (not `5*s`) and alpha `ga*0.12*alpha` (not 0.2). The steel shape itself stays as it is.
2. **The eye sticks out past the front of the face.** The head radius is now `4.6*s`, so the glowing eye rectangle must end inside it: draw it from `hx0 + 1.1*s` to `hx0 + 3.7*s` (width `2.6*s`), height `1.5*s`, vertical position unchanged. Use whatever your head-centre x variable is called in place of `hx0`.
3. **The belt is wider than the waist and sticks out on both sides like a bar.** Draw it only between the vest's two waist edges (inset `0.4*s` from each edge), and use `lineCap = 'butt'` for it. Restore `lineCap = 'round'` afterwards.
4. **The sole line reads as a bright dash floating under each boot.** Use the colour `#262438` for it (replace the `sole` entry in `PAL`), keep it `0.8*s` thick, and make sure it sits on the bottom edge of the foot shape, not below it.

Also put back the two comment lines above the function, which were deleted by mistake:
```js
// The hunter — also used, darker, for every shadow soldier
// o: { face, anim, t, scale, color, body, blade, eye, cape, atkP, atkDir }
```

## Checks to run before you finish
```bash
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done
grep -c "^function " js/11-render-world.js      # expect 9
grep -c "#262438" js/11-render-world.js         # expect 1
grep -c "^// The hunter" js/11-render-world.js  # expect 1
git status --short                              # expect only js/11-render-world.js
```

## Done looks like
No `FAIL` lines, the greps match, one file changed, and nothing outside these five points is different from your pass 1.
