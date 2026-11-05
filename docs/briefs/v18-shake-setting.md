# Brief: a Screen shake setting (FULL, LOW, OFF) in the Controls tab, both views

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). A top-level name declared twice, or a
`const` declared twice inside one function, stops a whole script loading; `bash tools/check_names.sh` lists top-level clashes and
`node --check <file>` catches the rest. Both pages (`index.html`, `3d/index.html`) load the same `js/*.js`.

## What the player sees
In the System menu's CONTROLS tab, under Settings, a new row "Screen shake" with a button that cycles FULL → LOW → OFF → FULL,
and one line under it saying what it does: FULL "The screen shakes on big hits.", LOW "A gentle shake on big hits.", OFF "The
screen never shakes.". A toast confirms the change (`SCREEN SHAKE: LOW`). The choice is saved with the game. It applies in 2D and
3D. Nothing else changes: no damage, timing or hit feedback other than the camera shake.

## Why it is small
Every shake in the game goes through one function, `const shake = n => { camera.shake = Math.min(28, Math.max(camera.shake, n)); };`
(`js/04-player-fx.js` line 103); the 2D view (`js/12-render-fx.js` line 30) and the 3D view (`3d/render3d.js` about line 1395)
only read `camera.shake`. First confirm with `grep -n "camera.shake" js/*.js 3d/render3d.js` that nothing else writes it (only the
decay line 141 in `js/04-player-fx.js` should); if something does, list it in your report and leave it.

## Build
1. `js/02-audio.js` line 9: `settings` gains `shake:'full'` (keep the other keys and their order).
2. `js/04-player-fx.js`: beside `shake`, `const SHAKE_SCALE = { full:1, low:0.4, off:0 };` and `shake` multiplies `n` by
   `(SHAKE_SCALE[settings.shake] ?? 1)` before the `Math.max`.
3. `js/03-state.js` `loadGame()`: after the `settings.hunter` line (about 108),
   `if (!(settings.shake in SHAKE_SCALE)) settings.shake = 'full';` (a save from before the setting, or a bad value, is FULL).
4. `js/10-actions.js`: `function cycleShake()` next to `cycleLook()`, in the same shape: next value in `['full', 'low', 'off']`,
   `saveGame(); playSfx('ui');`, `toast('SCREEN SHAKE: ' + settings.shake.toUpperCase(), 'blue', 2000);`. In the System menu
   click `switch` (where `case 'look': cycleLook(); break;` is, about line 163) add `case 'shake': cycleShake(); break;`.
5. `js/09-ui.js` CONTROLS tab (the Settings block, about line 255): right after the Hunter look row and its description line,
   a row in exactly the same markup: label `Screen shake`, `<button class="sys-btn" data-act="shake">` showing
   `settings.shake.toUpperCase()`, then the description `div` with the line for the current value (see above). Shown on phones
   too (unlike Aim).

## Test (new file `tools/test_shake_setting.js`, modelled on `tools/test_titles.js` and `tools/lib/headless.js`)
- Default `settings.shake === 'full'`.
- With `camera.shake = 0`: `shake(10)` gives 10 under `full`, 4 under `low`, 0 under `off` (reset `camera.shake = 0` between).
- `shake(100)` under `full` is capped at 28 (unchanged behaviour).
- Cycling calls `cycleShake()` three times from `full`: `low`, `off`, `full`.
- Save round trip keeps `low`; a save whose `settings.shake` is `'wild'` loads as `'full'`; a save with no `shake` key loads as
  `'full'` (stub storage the way the other tests do; never touch real storage).
- `tabControls` (or whatever the CONTROLS tab function is called; find it) returns markup containing `data-act="shake"`.
Print `PASS <cases>` at the end.

## Constraints
- Touch only `js/02-audio.js`, `js/03-state.js`, `js/04-player-fx.js`, `js/09-ui.js`, `js/10-actions.js` and the new test. Do not
  edit `index.html`, `3d/index.html` or `3d/render3d.js`; do NOT run `tools/stamp.sh`.
- No other setting, no other effect (flashes, vignette, slow-motion) changes.
- Art rule: nothing occult or religious, in pictures or in words.
- Match the surrounding style: compact statements, short names, one short comment per numbered item saying what the player sees.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`; `node --check` on every file you touched prints nothing.
- `node tools/test_shake_setting.js` prints `PASS <n>`; `node tools/test_titles.js` (PASS 71), `node tools/test_title_colours.js`
  (PASS 43), `node tools/test_shadow_style.js` (PASS 15), `node tools/test_army.js` (PASS 570), `node tools/test_record.js`
  (PASS 166) pass.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.

## Done when
All five items are in and every check passes. Commit nothing yourself.
