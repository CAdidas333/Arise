# Brief: a picture for each entry in the Hunter's Record (2D page)

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). Both pages, `index.html` (2D) and
`3d/index.html` (3D), load the same `js/` game logic, but only the 2D page loads `js/11-render-world.js` (the 3D page draws with
`3d/render3d.js` instead). A top-level name declared twice, or a `const` declared twice inside one function, stops a whole script
loading; `bash tools/check_names.sh` lists top-level clashes and `node --check <file>` catches the rest. Use exactly the new names
below.

## What the player sees
In the hub's System menu, RECORD tab (`tabRecord()` in `js/09-ui.js`), each row gets a small square picture, 40 by 40 CSS pixels,
left of the name: the enemy (or boss) drawn exactly as it looks in a fight, facing the viewer, centred and scaled to fill most of
the square. An entry never slain (the row that shows `???`) shows the same figure as a flat dark silhouette (`#1a1d2a`), so the
shape hints at what is to come without its colours. On the 3D page there is no 2D drawing code, so the rows stay exactly as they
are today (no picture, no gap, no error).

## Build
1. `js/11-render-world.js`, at the end of the file: `const RECORD_PICS = {};` and `function recordPic(def, boss, known)`, which
   returns a PNG data URL, cached in `RECORD_PICS` under `def.name + (known ? '' : '?')` so each picture is drawn once per page load.
   The drawing functions all draw on the one global `ctx` (`const ctx` of the main canvas, `js/03-state.js`), so draw there and copy
   out at once, inside one synchronous call (the next frame repaints the main canvas):
   `ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0, 0, S, S);` translate to the square's centre, scale so the figure
   fills about 70 percent of the square (`S*0.35/def.size`, read what `size` means in `drawEnemy`), draw it with `drawEnemy(e)` on a
   plain object built like a live enemy (read `makeEnemy` in `js/05-enemies.js` and every field `drawEnemy` and `drawBoss` read:
   `x`, `y`, `size`, `kind`, `color`, `facing` = `{ x:0, y:1 }`, `animT`, `spawnT` = 0, `hitFlash` = 0, `state` = 'chase',
   `elite` = false, `isBoss`, `def`, `phase` = 1, `name`; leave out anything that draws a target mark or a hit flash). For a silhouette
   draw the figure, then `ctx.globalCompositeOperation = 'source-atop'`, fill the square with `#1a1d2a`. Copy the square into a small
   offscreen canvas (`document.createElement('canvas')`, S by S, `drawImage(canvas, 0, 0, S, S, 0, 0, S, S)`), `ctx.restore()`, and
   return `off.toDataURL()`. S = 96 (sharp on a phone's 2x and 3x screens). Shadows on the floor and auras are fine as drawn.
2. `js/09-ui.js`, `tabRecord()`: when `typeof recordPic === 'function'`, each row starts with
   `<img class="rec-pic" src="${recordPic(def, boss, known)}" width="40" height="40" alt="">` inside the existing `stat-name` span,
   floated or flexed so the name and its kind line sit to its right; the gate enemy defs come from `g.enemies`, the boss def from
   `g.boss`. Style `.rec-pic` with an inline `style` attribute (do NOT edit `index.html` or `3d/index.html`): `vertical-align:middle;
   margin-right:10px; float:left; image-rendering:auto`. Rows must not grow taller than the 40 px picture plus the existing padding.
3. Test: extend `tools/test_record.js` (keep every existing case and its count): with the headless game, `tabRecord()` output still
   lists every name and `???` for unknown ones; if `recordPic` is defined in the headless game, each row has exactly one `rec-pic`
   image and an unknown and a known entry of the same enemy get different cache keys. If the headless fake canvas lacks a method this
   needs (`toDataURL`, `setTransform`, `globalCompositeOperation`, `drawImage`...), complete the fake in `tools/lib/headless.js`; do
   NOT add guards to the game code just for the fake. Print `PASS <cases>`.

## Constraints
- Touch only `js/11-render-world.js`, `js/09-ui.js`, `tools/test_record.js` and, only if needed, `tools/lib/headless.js`. Do not edit
  `index.html` or `3d/index.html`; do NOT run `tools/stamp.sh`. No change to how anything looks or plays in a fight.
- Art rule: nothing new is drawn; the pictures are the existing figures. No star symbols, runes, occult or religious imagery.
- Match the surrounding style: compact statements, short names, one short comment per item saying what the player sees.

## Checks to run (REMOTE-ONLY pass: the Mac is memory-bound tonight, one heavy job at a time)
Run ONLY these instant checks: `bash tools/check_names.sh` (prints `names ok`) and `node --check` on every file you touched.
Do NOT run any `tools/test_*.js`, the headless load, a browser or a build; the orchestrator runs the full suite afterwards.
Still write the test changes (item 3) carefully so they pass.

## Done when
All three items are in and every check passes. Commit nothing yourself.
