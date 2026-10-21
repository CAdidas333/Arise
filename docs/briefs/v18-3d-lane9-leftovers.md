# Brief: the 3D view's last three leftovers (dark edge, darker rooms ahead, the classic hunter)

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). A top-level name declared twice, or a
`const` declared twice inside one function, stops a whole script loading; `bash tools/check_names.sh` lists top-level clashes and
`node --check 3d/render3d.js` catches the rest. Use exactly the new names below. The 3D page (`3d/index.html`, generated, never
edit) loads `js/01` to `js/13` minus `js/11-render-world.js` and `js/12-render-fx.js`, plus three.js and `3d/render3d.js`.
`window.mouseWorld3D` is set only on the 3D page.

## Part 1: the plain dark screen edge in 3D (only `3d/render3d.js`, `drawFx3D`)
The 2D view always darkens the screen edge around the hunter (`drawPost` in `js/12-render-fx.js`, read it): a radial gradient
from `R*0.16` to `R*0.75` around the hunter, eased each frame with `vignetteIntensity = lerp(vignetteIntensity, low ? 0.78 : 0.52, 0.05)`,
coloured `50,0,0` when health is under 30 percent, `22,0,48` while Awakened (`player.ultT > 0`), else `0,0,6`. The 3D view draws
it only at low health or while Awakened (`drawFx3D`, the block commented `// 4. The screen edge closes in red ...`, about line 1925).
1. Make that block always draw, the same way as 2D, with one new top-level `let vignette3D = 0.15;` eased exactly like 2D but to
   `low ? 0.78 : 0.4` (the 3D scene has its own lighting, so the resting edge is a little lighter than 2D's 0.52). Keep the centre
   `c` and radius `R` it already uses. Keep the red pulse under 25 percent that follows it unchanged.

## Part 2: corridors and rooms not yet reached a little darker in 3D (only `3d/render3d.js`)
2D does this in `drawLayout` (`js/11-render-world.js`, steps "2. Corridors a little darker" and "3. Rooms not yet reached a little
darker"): black at alpha 0.28 over every hall, black at alpha 0.22 over every room with `r.i > layout.cleared && r.i !== layout.lock`.
2. In `rebuildLayout3D`, after the floor pieces are made: build two `THREE.InstancedMesh`es of `new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2)`,
   each with its own `MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28 /* halls */ or 0.22 /* rooms */, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 })`.
   The halls mesh gets one instance per hall piece, using exactly the clipped rectangle `x0, y0, x1, y1` already computed for
   `floorPiece` in the halls loop (so it never covers a room); the rooms mesh gets one instance per entry of `L.rooms` with
   `r.i > L.cleared && r.i !== L.lock`. Instance: position `((x0 + x1) / 2, 0.2, (y0 + y1) / 2)`, scale `(x1 - x0, 1, y1 - y0)`.
   Capacity = the number of instances (at least 1); set `.count`, `instanceMatrix.needsUpdate = true`. Skip a mesh with no
   instances. Push both into `layoutMeshes` so `clearFloorAndWalls` frees them (it already disposes instanced meshes and materials).
   The floor decoration (cracks, inlays, runners at y 0.4), ground shadows (0.4) and torch pools (0.5) stay above them.
3. The rebuild must follow progress: in `draw()`, the `floorKey` line (about line 1257), add `+ '|' + L3.cleared` to the layout
   key so a cleared room lightens at once.

## Part 3: the classic hunter look in 3D (`3d/render3d.js`, one line in `js/09-ui.js`)
The 2D game has a setting `settings.hunter` (`'new'` or `'classic'`), switched in the System menu, Controls tab ("Hunter look",
`data-act="look"`). Classic is the original stick figure, `drawHunterClassic` in `js/11-render-world.js` (read it): glowing cyan
lines for legs and arms, a dark trapezoid torso and a dark round head outlined in cyan, one glowing eye slit, a dark cape behind
the shoulders, one blade in the right hand (a wide soft glow in the weapon colour with a thin white core). The 3D view always
draws the new hunter and hides the setting.
4. `js/09-ui.js`, the line building the "Hunter look" row (about line 190): remove the `window.mouseWorld3D ? '' :` condition so
   the row shows on both pages. Change nothing else there.
5. Inside the `Fig` closure, next to `const HM = {}, HB = {};`, add `const CM = {}, CB = {};` (classic materials and bones), and
   after `(function buildHunter() { ... })();` add `(function buildClassic() { ... })();` that builds the stick figure on a new
   group `CB.root = new THREE.Group()` added to `hunterGroup` (so it shares the hunter's position, turn, blink and its 1.25 scale;
   add it AFTER `bake(hunterGroup)` has run, so the bake never touches it; start with `CB.root.visible = false`). Use the
   existing helpers `B` for bones, and make meshes with `new THREE.Mesh(<geometry>, CM.<name>)` directly (not `P`, whose meshes
   get their material from `HM` by role). Make each geometry once. Local units: feet at y 0, the figure faces +z (the new hunter's
   eyes are at +z), heights match the new hunter's.
   - Materials: `CM.line = MeshBasicMaterial({ color: CYAN })` (limbs); `CM.rim = MeshBasicMaterial({ color: CYAN, side: THREE.BackSide })`
     (outline shells); `CM.body = MeshBasicMaterial({ color: 0x0b1020 })`; `CM.eye = MeshBasicMaterial({ color: 0xaaeeff })`;
     `CM.cape = MeshBasicMaterial({ color: 0x0a0a18, side: THREE.DoubleSide })`; `CM.core = MeshBasicMaterial({ color: 0xffffff })`;
     `CM.glow = MeshBasicMaterial({ color: 0xaaddff, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })`.
   - Bones and parts: `CB.hip` at (0, 16, 0) on `CB.root`. Legs: `CB.legL` / `CB.legR` at (±1.6, 0, 0) on the hip, each a
     cylinder radius 1.3, length 16, centred at y -8 (`CM.line`). Torso on the hip: a cylinder `radiusTop 4.5, radiusBottom 3,
     height 18`, 8 sides, centred at y 8 (`CM.body`), plus the same geometry scaled 1.12 on x and z, 1.04 on y (`CM.rim`).
     Head: a sphere radius 7 at y 26 on the hip (`CM.body`) plus a sphere radius 7.7 at the same place (`CM.rim`); the eye slit a
     box 5 wide, 1.6 high, 0.6 deep on the front of the head at (0, 25.5, 6.9) (`CM.eye`). Arms: `CB.armL` / `CB.armR` at
     (±4.6, 16, 0) on the hip, `rotation.order = 'YXZ'`, each a cylinder radius 1.2, length 13, centred at y -6.5 (`CM.line`).
     Blade: `CB.blade` at (0, -13, 0) on `CB.armR`; along its local +y, exactly like the new hunter's `sword` bones (whose blade
     sits at +y, so `rotation.x` = the wrist angle points it forward): a core box 0.8 wide, 19 long, 0.5 deep centred at y 10
     (`CM.core`) and a glow box 3.2 wide, 19 long, 1.6 deep at the same place (`CM.glow`). Cape: `CB.cape` at (0, 16, -3.2) on the
     hip, a `PlaneGeometry(9, 20)` translated `(0, -10, 0)` so it hangs from the bone (`CM.cape`).
6. Add `function poseClassic(p, dt)` in the closure, called from `poseHunter` at its end (so it uses the freshly eased `HP`):
   `CB.hip.position.y = 16 + HP.bob; CB.hip.rotation.x = HP.lean; CB.hip.rotation.y = HP.twist;` legs `rotation.x = -HP.lL` / `-HP.rL`.
   Arms: the classic has one blade, in the right hand, so during an attack (`p.atkT > 0` and `p.anim !== 'dash'`) the right arm
   takes the values of the swinging arm, the one with the larger A (`HP.lA > HP.rA` ? the l values : the r values), and the left arm
   takes the other one's; otherwise each arm takes its own. Right arm `rotation.set(-A, Y, -0.1)`, left `rotation.set(-A, Y, 0.1)`;
   `CB.blade.rotation.x` = that right-hand W. Cape: `CB.cape.rotation.x` so its lower edge swings back, away from the face
   (toward -z): about 0.15 rad standing, about 0.6 running or dodging (`p.moving` or `p.dodgeT > 0`), plus
   `Math.sin((p.animT || 0) * (fast ? 14 : 3)) * 0.06`; ease it with the same `k` as the rest of the pose.
7. Colours follow the state in `tintHunter`: when the state changes, `CM.line` and `CM.rim` take the same `glow` colour as
   `HM.glow`, `CM.eye` the same colour as `HM.eye`, `CM.cape` becomes `0x1a0633` while Awakened (state 2), else `0x0a0a18`; when the
   blade colour changes, `CM.glow` takes it.
8. Add `setLook(classic)` to the closure and to the object `Fig` returns: `HB.hip.visible = !classic; CB.root.visible = classic;`
   (remember the last value; do nothing when unchanged). In `draw()`, the hunter block (right before `Fig.poseHunter(player, dt);`),
   call `Fig.setLook(typeof settings !== 'undefined' && settings.hunter === 'classic');`.

## Constraints
- Touch only `3d/render3d.js` and the one condition in `js/09-ui.js`. Do not edit `index.html` or `3d/index.html`, do NOT run
  `tools/stamp.sh`, and do not touch any 2D drawing code.
- Nothing created per frame (no new geometry, material, gradient object kept, or array per frame beyond what the existing code
  already does). Phones must stay cheap.
- The new hunter must look and move exactly as before when the look is `'new'`.
- Art rule: plain glows, edges, shadows only. No star shapes, runes, glyph-like marks, crosses, halos, occult or religious
  imagery. The blade is held in the hand along the arm's line, never upright on the body's centre line.
- Match the surrounding style: compact statements, short names, one short comment per numbered item saying what the player sees.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`.
- `node --check 3d/render3d.js` and `node --check js/09-ui.js` print nothing.
- `node tools/test_layout.js` ends with `PASS 8000`; `node tools/test_gear.js` and `node tools/test_army.js` pass.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.

## Done when
All eight items are in and every check passes. Commit nothing yourself.
