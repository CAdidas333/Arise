# Feedback on boss looks, pass 1: three bosses are right, three need a second pass

Seen in captured frames at large size, boss size and shadow size. The code structure, the call sites and the checks are all correct; keep them. **Spider Queen, Death Knight and Ancient Dragon are accepted: do not change them** except point 4. Change only `drawBoss` in `js/11-render-world.js`.

1. **Statue of God fails the art rule and reads as a refrigerator.**
   - The face is a vertical nose line standing on a horizontal mouth line with an eye dash on each side. Together they read as a cross. Remove the nose line completely. The face is only: a heavy straight brow bar in `dark` across the head, the two narrow glowing eye slits directly under it, and a short thin mouth line lower down, well separated from the eyes.
   - The cracks are drawn as separate `>` and `<` chevrons, which read as carved symbols. Replace them with three long irregular cracks, each a jagged polyline of five to seven points that STARTS AT AN EDGE of the body or head and wanders inward, like broken stone. No floating marks.
   - The body is a plain rectangle. Make it a figure: a head with a tall flat-topped headdress that is wider than the head at the top; a neck; broad squared shoulders; two arms hanging straight down at the sides as separate tall blocks with a gap of `0.08*r` between each arm and the torso, ending in squared hands; the torso tapering slightly to the base; a plain rectangular plinth under it, wider than the torso. Keep the vertical robe grooves on the torso only (four, not eight), and keep them shorter than the torso.
2. **Orc Chieftain reads as a bowl with a ball on top.** Rebuild the silhouette as a hulking brute: a barrel chest (wider at the top), two thick arms hanging out from the shoulders and bent so the big fists (radius `0.3*r`) rest at about waist height outside the body, a short thick neck, and the head as it is. The two tusks must be clearly visible: each `0.34*r` long and `0.1*r` thick at the base, curving up from the corners of the mouth to beside the eyes, in `light`. Make each shoulder plate a clear half-disc in `light` covering the top of the shoulder (radius `0.42*r`) with the two studs on it. Keep the brow and the belt.
3. **Demon Lord reads as a red bucket.** Rebuild it as an armoured king: a torso that is widest at the shoulders and narrows to the waist, with a separate armoured skirt flaring out below the belt; two arms held slightly away from the body ending in clawless gauntlet fists; large layered shoulder guards. The flame mantle must look like fire: on each shoulder three pointed, curved tongues of different heights (tallest in the middle, about `0.6*r` high), drawn in `light` with a smaller inner tongue in `body`, their tips swaying with `sin(t*7 + i)`. Replace the three floating zigzag lines on the chest with two irregular glowing cracks that start at the collar and the belt and wander inward (same rule as the statue: cracks start at an edge). Keep the crown (make its five tines taller, the middle one tallest, `0.35*r`), the slanted eyes and the jaw with four teeth.
4. **Spider Queen, small change only:** the legs are bunched against the body. Spread them: the four on each side should fan from pointing up-and-out to pointing down-and-out, with knees clearly above the body line for the top two, and feet reaching `1.35*r` to `1.45*r` from the centre. Leg line width `0.1*r`. Nothing else on the spider changes.

The strict art rule still applies to everything: no star shapes, no evenly spaced radial spikes, no runes or glyph-like marks, no crosses, no halos, no wings on the statue.

## Checks to run before you finish
```bash
for f in js/*.js; do node --check "$f" || echo "FAIL $f"; done
grep -c "^function drawBoss" js/11-render-world.js     # expect 1
grep -c "case 'boss'" js/11-render-world.js            # expect 0
grep -c "drawBoss(" js/11-render-world.js              # expect 3
grep -c "shadowBlur" js/11-render-world.js             # expect 1
git status --short                                     # expect only js/11-render-world.js
```

## Done looks like
No `FAIL` lines, the greps match, one file changed, and the Death Knight and Ancient Dragon code is byte-for-byte what it was in your pass 1.
