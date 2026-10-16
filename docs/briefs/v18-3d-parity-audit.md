# 3D parity audit — what the 2D view draws that the 3D view does not

The 3D build (`3d/index.html`) loads `js/01`–`js/10`, then `three.min.js` + `3d/render3d.js`, then the shared
`js/12b-overlay.js`, `js/12a-card.js`, `js/13-loop.js`. It does **not** load `js/11-render-world.js` or
`js/12-render-fx.js`, so everything those two files draw is 2D-only. The meshes are built in `render3d.js`'s
`draw()`; flat overlays are drawn in `drawFx3D()` via `toScreen(x,y,h)` / `pxPer(x,y)`. `12b-overlay.js`
(`drawMotes`, `drawPortal`, `drawMinimap`) is shared and called by both. The DOM HUD is identical and excluded.

| # | What the player sees in 2D | 2D code (function, approx line) | In 3D? | 3D code or note | Worth adding? | Why |
|---|---|---|---|---|---|---|
| 1 | Per-gate floor texture on the ground | `buildFloor` 11:23 | yes | `buildFloor`/`floorPiece` 3d:397, 149 | low | already matches |
| 2 | Arena/endless floor mark: the pulsing rings at the centre | `drawArena` 11:60 | no | `rebuildFloorAndWalls` 3d:128 makes floor+walls only | low | pure decoration |
| 3 | Arena/endless wall border, glowing and pulsing | `drawArena` 11:68 | partly | wall boxes, static opacity 0.65 (3d:136–145); no pulse/glow | low | decoration; boundary still reads |
| 4 | Layout wall mass (dark band) and the lit north-wall face | `drawLayout` 11:79 | partly | wall boxes + a lit top strip on north edges (3d:176–203) | low | decoration |
| 5 | Corridors darkened a little | `drawLayout` 11:105 | no | no corridor tinting in 3d | low | decoration |
| 6 | Rooms not yet reached darkened | `drawLayout` 11:114 | no | no unreached-room tinting in 3d | low | progress also shown on shared minimap |
| 7 | Floor inlay lines in rooms | `drawRoomDetail` 11:268 | yes | `inlayMesh` LineSegments 3d:344 | low | matches |
| 8 | Corridor runner lines | `drawRoomDetail` 11:266 | yes | `runnerMesh` 3d:365 | low | matches |
| 9 | Floor cracks | `drawRoomDetail` 11:271 | yes | `crackMesh` 3d:325 | low | matches |
| 10 | Rubble stones with a lit top edge | `drawRoomDetail` 11:274 | partly | instanced rubble boxes, flat colour, no lit edge (3d:289) | low | decoration |
| 11 | Torch **pool of warm light on the floor** | `drawRoomDetail` 11:288 | no | torches have a wall glow plane only (3d:256) | low | decoration/lighting |
| 12 | Torch flame and wide wall glow | `drawRoomDetail` 11:291 | yes | flame cone + glow plane, opacity flicker (3d:245–286, 1210) | low | matches |
| 13 | Wall pilasters and torch brackets | `drawWallFurniture` 11:228 | partly | instanced pilaster boxes + brackets (3d:227) | low | decoration |
| 14 | Doors: shut door (red), next door (cyan), others faint | `drawLayout` 11:147 | partly | shut door = red box, next door = cyan bar (3d:207–215); others not drawn | low | the two that matter are there |
| 15 | Stone posts at each doorway end | `drawLayout` 11:180 | no | no door posts in `rebuildLayout3D` | low | decoration |
| 16 | Exit: floor pool + standing rectangle of light (+ lines when open) | `drawLayout` 11:190 | partly | one additive slab, brighter when open (3d:217–222); no floor pool | low | way out still reads |
| 17 | Hunter body, poses (attack/dodge/run), awakened/hit tint, blade colour | `drawHunter` 11:307, `drawPlayer` 12:10 | yes | `buildHunter` 3d:1015, `tintHunter` 3d:1059, `poseHunter` 3d:1071 | low | matches |
| 18 | Hunter's dark ground shadow | `drawPlayer` 12:13 | no | no ground-shadow mesh in 3d | low | grounding, not information |
| 19 | Cyan pool of light under the hunter (violet when Awakened) | `drawPlayer` 12:15 | partly | `hunterLight` point light, colour shifts on ult (3d:1236); no floor disc | medium | the only "Awakening is on" cue besides the body tint |
| 20 | Hunter blink while invulnerable (i-frame flicker) | `drawPlayer` 12:20 | no | `tintHunter` never blinks | medium | tells the player they are briefly safe |
| 21 | Classic stick-figure hunter look (Controls: "Hunter look") | `drawHunterClassic` 11:1074, `hunterLook` 12:8 | no | 3d always builds the same hunter | low | a cosmetic setting |
| 22 | Enemy bodies per kind (horns, arrows, orbs, tusks…) and eyes following the player | `enemyPath` 11:460, `drawEnemy` 11:888 | yes | `KINDS` 3d:597; body turns to face (`Fig.enemy` 3d:980) | low | matches |
| 23 | Enemy dark ground shadow | `drawEnemy` 11:896 | no | no ground-shadow mesh | low | grounding only |
| 24 | Target ring on the floor under the squared-up enemy | `drawEnemy` 11:892 | yes | drawn in `drawFx3D` 3b (3d:1508) | low | matches |
| 25 | Elite/boss aura: pulsing glow disc **and** a rotating arc | `drawEnemy` 11:898 | partly | floor aura ring for elite/boss (3d:947–953, 558); no pulse/rotating arc | medium | pulsing marks the dangerous enemy; ring is static |
| 26 | Boss phase-2 (enraged): red aura and yellow eyes | `drawEnemy` 11:899, 907 | yes | `bossPal(col,'R')` 3d:561, applied 3d:977 | low | matches |
| 27 | **Enemy health bar above its head** | `drawEnemy` 11:924 | no | nothing in 3d: the DOM boss bar only covers the boss | high | core combat read: which add is nearly dead |
| 28 | Enemy wind-up: pale blink while charging | `drawEnemy` 11:891 | yes | `blink` + `enemyPal(...,true)` 3d:976, 551 | low | matches |
| 29 | Enemy hit: whole body flashes white | `drawEnemy` 11:915 | yes | `flashPal` 3d:585, 977 | low | matches |
| 30 | Stunned/staggered look (enemy freezes, slides from knockback) | `drawEnemy` 11:888 | yes | same freeze + `flashPal` + position from `e.x/e.y` (3d:974) | low | 2D draws no marker of its own, so nothing to add |
| 31 | Shadow soldiers, incl. berserk (legion/ult) brighter violet and boss shadows | `drawShadowSoldier` 11:932 | yes | `forShadow`/`shadow`, `shadowPal(berserk)` 3d:991, 993, 573 | low | matches |
| 32 | Six distinct boss bodies | `drawBoss` 11:481 | yes | `BOSSES` 3d:708 | low | matches |
| 33 | Attack telegraphs: filled circle/line with a growing fill and a bright outline | `drawTelegraph` 11:956 | partly | flat mesh whose opacity ramps 0.15→0.55 (3d:1310–1333); no outline, no directional fill | low | danger is still telegraphed |
| 34 | Ground zones (web spokes, fire, rubble, blood) | `drawZone` 11:973 | partly | zone meshes; web gets a wireframe outline (3d:1335–1376) | low | zone colour/area reads |
| 35 | Projectiles: glowing orb with a white core, or a crescent wave | `drawWorld` 12:58 | partly | a plain coloured sphere; no core, glow or crescent (3d:1268–1279) | medium | dodging depends on reading the shot's silhouette |
| 36 | Slash arcs (crescent sweeps) | `drawWorld` 12:69 | yes | `drawFx3D` 4 (3d:1533) | low | matches |
| 37 | Chain-lightning bolt | `drawWorld` 12:78 | yes | `drawFx3D` 5 (3d:1575) | low | matches |
| 38 | Particles: smoke, sparks, glow | `drawWorld` 12:47, 84 | yes | `drawFx3D` 6 (3d:1602) | low | matches |
| 39 | Floating damage / crit numbers | `drawWorld` 12:93 | yes | `drawFx3D` 8 (3d:1651) | low | matches |
| 40 | Expanding rings (hits, kills, ARISE, counter-window ring) | `drawWorld` 12:40; `13-loop.js` 13:46 | yes | rings loop in `drawFx3D` 3 (3d:1421) | low | matches (incl. counter ring) |
| 41 | Shadow remnant: a glowing purple wisp | `drawPickups` 11:1036 | partly | a cone mesh, static glow; no halo/face (3d:1297) | medium | marks the pickup, but no glow to catch the eye |
| 42 | **"[E] ARISE" / "ARISE" prompt beside a remnant** | `drawPickups` 11:1043 | no | nothing in `drawFx3D` | high | prompt to press a key; the core hub action |
| 43 | Gold and health orbs (diamond / cross with a soft glow) | `drawPickups` 11:1049 | partly | coloured spheres, no glow, no shape glyph (3d:1281–1295) | low | pickup is visible and colour-coded |
| 44 | Gear drop: a cut gem in its rarity colour with a soft glow halo | `drawPickups` 11:1050 | partly | octahedron in rarity colour, bobs and turns; no glow halo (3d:1281) | medium | loot rarity is the reason to walk over |
| 45 | **Low-health red pulse + vignette (`drawPost`)** | `drawPost` 12:104 | no | `drawPost` is never called by `drawFx3D` | high | the only "you are about to die" warning |
| 46 | Floor motes/embers drifting with the camera | `drawPost` 12:113 | no | dungeon branch of `drawFx3D` calls no `drawMotes` | low | atmosphere |
| 47 | **Edge-of-screen arrow + "NNm" to the boss during the boss hunt** | `drawIndicators` 12:119 | no | `drawFx3D` 8b arrow is gated on `!(bossRef.alive)` (3d:1672) | high | shows the target / the way to the boss |
| 48 | Edge-of-screen arrow, plus on-screen marker, to the next chamber | `drawIndicators` 12:124 | yes | `drawFx3D` 8b (3d:1671–1701) | low | matches between chambers |
| 49 | Minimap (rooms, dots, boss marker) | `drawMinimap` 12b:46 | yes | shared; called at 3d:1705 | low | matches |
| 50 | Stationary "⚠ MOVE! DMG x…" warning | `drawMinimap` 12b:83 | yes | shared `drawMinimap` (3d:1705) | low | matches |
| 51 | Title/hub backdrop: gate portal, spiralling matter, motes | `drawPortal` 12b:22, `drawMotes` 12b:10 | yes | `drawFx3D` non-dungeon branch (3d:1399–1405) | low | matches |
| 52 | Full-screen flash (hit, Awaken, wave) | `draw` 12:150 | yes | `drawFx3D` 9 (3d:1707) | low | matches |

## Top gaps

1. **Enemy health bar (`drawEnemy` 11:924)** — high. `drawFx3D()` already projects world points with `toScreen(e.x, e.y, height)`, so draw a small 2D bar over each living non-boss enemy there, coloured by `e.elite`/`e.hp/e.maxHp` exactly as 2D does.
2. **"[E] ARISE" prompt (`drawPickups` 11:1043)** — high. For each `remnants` entry within 95 units of the player, `toScreen(r.x, r.y, 44)` and `ctx.fillText('[E]  ARISE', …)`, matching the 2D text.
3. **Boss-hunt edge arrow (`drawIndicators` 12:119)** — high. `drawFx3D` 8b already has the arrow code; drop the `!(dungeon.bossRef && dungeon.bossRef.alive)` guard and aim it at `dungeon.bossRef` when it is alive.
4. **Low-health red pulse + vignette (`drawPost` 12:104)** — high. Vignette is a screen-space gradient, so `drawFx3D` can paint it directly after `drawMinimap()` (vignette at `w,h` plus the red `fillRect` when `hp/maxHp < 0.25`).
5. **Elite/boss aura pulse (`drawEnemy` 11:898)** — medium. The aura ring mesh already exists; animate its colour/opacity on `clock` inside `draw()`, or add the rotating arc as a `torus`/arc mesh on the overlay via `toScreen`.
6. **Projectile look (`drawWorld` 12:58)** — medium. Give the projectile sphere an emissive core (child mesh) or draw a 2D glow circle at `toScreen(p.x, p.y, 12)` with radius scaled by `pxPer`, plus the crescent arc for `p.crescent`.
7. **Hunter invulnerability blink (`drawPlayer` 12:20)** — medium. In `draw()`, when `player.inv > 0 && player.dodgeT <= 0 && player.hitFlash <= 0`, set `hunterGroup.visible` on/off (or `hunterGroup.scale`/opacity) from `Math.sin(clock*40)`.
8. **Awakening / cyan floor glow under the hunter (`drawPlayer` 12:15)** — medium. Add a small additive `auraDisc`-style plane under `hunterGroup` tinted cyan, switching to violet when `player.ultT > 0`.
9. **Gear drop rarity glow (`drawPickups` 11:1050)** — medium. Add an additive glow plane (`auraMat(GEAR_HEX3D[rarity], …, true)`) under each `gear` orb, or a 2D halo in `drawFx3D` at the orb's `toScreen` position.
10. **Shadow remnant glow halo (`drawPickups` 11:1036)** — medium. Add a soft additive plane at the remnant, or a `drawFx3D` glow circle at `toScreen(r.x, r.y, 7)` so the wisp reads at a distance.
