# Brief: two comfort settings in the Controls tab, Screen flashes (FULL, LOW, OFF) and Damage numbers (ON, OFF), both views

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). A top-level name declared twice, or a
`const` declared twice inside one function, stops a whole script loading; `bash tools/check_names.sh` lists top-level clashes and
`node --check <file>` catches the rest. Both pages (`index.html`, `3d/index.html`) load the same `js/*.js`.

Follow the Screen shake setting added on 2026-11-05 exactly; it is the pattern for both new rows: `settings.shake` in
`js/02-audio.js` line 9, `SHAKE_SCALE` and `shake` in `js/04-player-fx.js` (about line 103), the own-key check in `loadGame()`
in `js/03-state.js` (about line 109), `cycleShake()` and `case 'shake'` in `js/10-actions.js`, the Screen shake row in
`tabControls()` in `js/09-ui.js`, and `tools/test_shake_setting.js`.

## What the player sees
In the CONTROLS tab, under Settings, right after the Screen shake row and in the same markup:
1. **Screen flashes**, a button cycling FULL → LOW → OFF → FULL, with one line under it: FULL "Big hits and skills flash the
   screen.", LOW "Softer flashes.", OFF "The screen never flashes.". Toast `SCREEN FLASHES: LOW`. For players sensitive to
   flashing light.
2. **Damage numbers**, a button toggling ON ↔ OFF, with: ON "Numbers rise from every hit.", OFF "No damage numbers; messages such
   as PERFECT DODGE still show.". Toast `DAMAGE NUMBERS: OFF`.
Both are saved with the game and apply in 2D and 3D. Defaults (FULL, ON) play exactly as today. Nothing else changes: no
damage, timing, hit stop, shake or sound.

## Why it is small
Every full-screen flash goes through `const flash = (color, alpha) => { if (alpha > screenFlash.alpha) screenFlash = { alpha, color }; };`
(`js/04-player-fx.js` line 106); nothing else writes `screenFlash` except its declaration (`js/03-state.js` line 34) and the
fade (`js/04-player-fx.js` line 142); the 2D and 3D views only read it. Damage numbers come from exactly two `floatText` calls in
`js/06-combat.js`: line 23 (damage dealt to an enemy, white, gold for a crit, violet for a shadow's hit) and line 100 (damage the
hunter takes, `-N` in red). Confirm both facts with `grep -n` first; if anything else writes `screenFlash`, list it in your report
and leave it.

## Build
1. `js/02-audio.js` line 9: `settings` gains `flashes:'full', numbers:'on'` after `shake` (keep the rest and the order).
2. `js/04-player-fx.js`: beside `flash`, `const FLASH_SCALE = { full:1, low:0.4, off:0 };`; `flash` multiplies `alpha` by
   `(Object.prototype.hasOwnProperty.call(FLASH_SCALE, settings.flashes) ? FLASH_SCALE[settings.flashes] : 1)` before comparing,
   and does nothing when the scaled alpha is 0.
3. `js/06-combat.js`: the two damage-number `floatText` calls (lines 23 and 100 only) run only when `settings.numbers !== 'off'`.
   Leave every other `floatText` (ELITE SLAIN, PERFECT DODGE, and the rest) as it is.
4. `js/03-state.js` `loadGame()`: after the shake line,
   `if (!Object.prototype.hasOwnProperty.call(FLASH_SCALE, settings.flashes)) settings.flashes = 'full';` and
   `if (settings.numbers !== 'off') settings.numbers = 'on';`.
5. `js/10-actions.js`: `cycleFlashes()` (full → low → off → full) and `toggleNumbers()` (on ↔ off), each shaped like
   `cycleShake()` (`saveGame(); playSfx('ui');` and the toast above); menu `switch` gains `case 'flashes': cycleFlashes(); break;`
   and `case 'numbers': toggleNumbers(); break;` beside `case 'shake'`.
6. `js/09-ui.js` `tabControls()`: the two rows after the Screen shake row, same markup, buttons `data-act="flashes"` and
   `data-act="numbers"` showing the value in capitals, each with its description line. Shown on phones too.

## Test (new file `tools/test_comfort_settings.js`, modelled on `tools/test_shake_setting.js`)
- Defaults: `settings.flashes === 'full'`, `settings.numbers === 'on'`.
- From `screenFlash = { alpha:0, color:'#fff' }`: `flash('#fff', 0.5)` gives alpha 0.5 under full, 0.2 under low, 0 under off.
- `cycleFlashes()` three times from full: low, off, full. `toggleNumbers()` twice from on: off, on.
- Damage numbers: with one enemy from `makeEnemy(GATE_DEFS[0].enemies[0], 100, 0)` and `texts` emptied, call the combat function
  that contains line 23 (find its name, `damageEnemy` or similar) once with a hit: under on, `texts` gains one entry; under off,
  none. Same for the hunter-hit function around line 100 (call it so the hunter takes damage; keep his health above 0).
  An ELITE SLAIN or PERFECT DODGE text still appears under off if you can trigger one simply; skip that case if not.
- Damage itself is unchanged: the enemy's health after the hit is the same under on and off (seed the game the same way first).
- Save round trip keeps `low` and `off`; saves holding `flashes:'toString'`, `flashes:5`, `numbers:'maybe'` or no keys load as
  `full` and `on` (stub storage the way the shake test does).
- `tabControls()` markup contains `data-act="flashes"` and `data-act="numbers"`.
Print `PASS <cases>` at the end.

## Constraints
- Touch only `js/02-audio.js`, `js/03-state.js`, `js/04-player-fx.js`, `js/06-combat.js`, `js/09-ui.js`, `js/10-actions.js` and the
  new test. Do not edit `index.html`, `3d/index.html` or `3d/render3d.js`; do NOT run `tools/stamp.sh`.
- No other effect changes (shake, hit stop, slow motion, vignette, particles).
- Art rule: nothing occult or religious, in pictures or in words.
- Match the surrounding style: compact statements, short names, one short comment per numbered item saying what the player sees.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`; `node --check` on every file you touched prints nothing.
- `node tools/test_comfort_settings.js` prints `PASS <n>`; `node tools/test_shake_setting.js` (PASS 18), `node tools/test_army.js`
  (PASS 570), `node tools/test_titles.js` (PASS 71), `node tools/test_record.js` (PASS 166), `node tools/test_rift.js` (PASS 310)
  pass.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.

## Done when
All six items are in and every check passes. Commit nothing yourself.
