# Feedback on pass 1 of the 3D experiment: two small fixes

Pass 1 works: it ran a whole gate through to the boss in the browser with no errors, and the floor, walls, enemies, shadows, shots and warning circles all draw. Keep everything as it is except the two numbered fixes below. Change only `3d/render3d.js`. Do not touch any other file.

The problem: the hunter is far too small on screen. It is a thin 37-unit figure seen from 700 units away, next to enemies drawn 30 to 60 units wide, so the player cannot find their own character.

1. **Make the hunter bigger.** Right after the line `const hunterGroup = new THREE.Group(); scene.add(hunterGroup);` add `hunterGroup.scale.set(1.6, 1.6, 1.6);`. Nothing else about the hunter changes.

2. **Bring the camera closer.** In `draw()`, the line
   `camera3D.position.set(camX + sx, 20 + 430 + sy, camY + 560);`
   becomes
   `camera3D.position.set(camX + sx, 20 + 300 + sy, camY + 400);`
   The `lookAt` line after it stays as it is.

## Checks to run before you finish
```bash
node --check 3d/render3d.js && echo RENDER_OK
grep -c "hunterGroup.scale.set(1.6, 1.6, 1.6)" 3d/render3d.js   # expect 1
grep -c "20 + 300 + sy, camY + 400" 3d/render3d.js              # expect 1
git status --short                                              # expect only 3d/render3d.js
```

## Done looks like
`RENDER_OK`, both greps print 1, one file changed, two lines different.
