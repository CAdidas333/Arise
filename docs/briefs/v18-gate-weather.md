# Brief: weather for each gate (screen overlay, both views)

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). A top-level name declared twice, or a
`const` declared twice inside one function, stops a whole script loading; `bash tools/check_names.sh` lists top-level clashes and
`node --check <file>` catches the rest. `js/12b-overlay.js` is loaded by both pages (2D `index.html`, 3D `3d/index.html`), so the
weather is written once there and called from each view's overlay pass.

## What the player sees
Each gate gets its own weather drawn over the scene, light enough never to hide a warning shape or an enemy:
- `e_gate` Goblin Cavern: water dripping from the cave roof, thin pale-green streaks falling fast, sparse.
- `d_gate` Orc Fortress: grey ash flakes drifting sideways and slowly down.
- `c_gate` Undead Crypt: low violet-grey fog drifting slowly sideways across the lower half of the screen.
- `b_gate` Demon Realm: red-orange embers rising fast and flickering, and a faint warm glow pulsing along the bottom edge.
- `a_gate` Dragon's Lair: glowing gold cinders falling slowly and swaying.
- `s_gate` Cartenon Temple: cold pale-blue dust hanging and drifting slowly, with a faint cold mist low on the screen.
Endless mode uses the weather of whichever gate the castle floor looks like (`dungeon.gate.id`). Nothing on the title or in the hub.

## Build (`js/12b-overlay.js`, after `drawMotes`)
1. `const weather = [];` filled once (like `motes` at line 8, read how it is filled and copy that) with 48 particles
   `{ x, y, z, ph, s }` (x, y in 0..1 of the screen, z depth 0.4..1, ph a phase 0..2 pi, s a size 0.6..1.6), and one soft round
   sprite made once: an offscreen canvas 128 by 128 with a radial gradient white to transparent (`weatherBlob`, created lazily
   the first time it is needed, so the Node test harness with no DOM never makes it).
2. `function drawWeather(id, par)`: screen-space, `W`, `H`, `clock` and `camera` as `drawMotes` uses them (par = how much the
   camera moves the layer, 0.5 like the motes). One branch per gate id as listed above, each using the shared particles with its
   own speed, colour and size; fog and the bottom glow are the blob sprite drawn large (`drawImage` scaled, alpha 0.05 to 0.12),
   four to six of them. Restore `globalAlpha` to 1 and `globalCompositeOperation` to `'source-over'` before returning. Embers and
   cinders draw with `'lighter'`; ash, drips, dust and fog with `'source-over'`. Nothing allocated per frame (no arrays, no
   gradients: only the one sprite).
3. Call it in both views right after the existing in-gate motes call:
   - 2D: `js/12-render-fx.js` `drawPost()` (line about 113, the `drawMotes(floorTheme.ember, ...)` line):
     `if (dungeon && dungeon.gate) drawWeather(dungeon.gate.id, 0.5);`
   - 3D: `3d/render3d.js` `drawFx3D()` (line about 1989, the `drawMotes(moteTh.ember ...)` line): the same call.

## Constraints
- Touch only `js/12b-overlay.js`, `js/12-render-fx.js` (the one call) and `3d/render3d.js` (the one call). Do not edit
  `index.html` or `3d/index.html`; do NOT run `tools/stamp.sh`.
- Readability first: at most 48 particles; fog alpha never above 0.12; nothing drawn over the HUD (it is DOM, so the canvas cannot).
- Art rule: plain drops, flakes, sparks, dust and mist. No star shapes, runes, glyph-like marks, crosses, halos, light rays from
  above, occult or religious imagery.
- Match the surrounding style: compact statements, short names, one short comment per gate saying what the player sees.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`; `node --check` on the three files prints nothing.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.
- `node tools/test_layout.js` ends `PASS 8000`; `node tools/test_boxes.js`, `node tools/test_titles.js` pass.

## Done when
All three items are in and every check passes. Commit nothing yourself.
