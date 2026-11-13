# Brief: controller rumble on big hits, with a Controller rumble setting (ON, OFF)

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step, no libraries). A top-level name declared
twice, or a `const` declared twice inside one function, stops a whole script loading; `bash tools/check_names.sh` lists
top-level clashes and `node --check <file>` catches the rest. Both pages load the same `js/*.js`.

Controller support exists (`readPads()`, `pollPad()` in `js/10-actions.js`). Every camera shake goes through
`const shake = n => { ... }` in `js/04-player-fx.js` (about line 105), scaled by the Screen shake setting (`SHAKE_SCALE`,
`settings.shake`). Settings follow the pattern of `settings.numbers` (Damage numbers, ON/OFF): `js/02-audio.js` line 9 holds the
defaults, `loadGame()` in `js/03-state.js` cleans the loaded value, `toggleNumbers()` and `case 'numbers'` in
`js/10-actions.js`, and its row in `tabControls()` in `js/09-ui.js`.

## What the player sees
With a controller that can rumble (most Xbox and PlayStation pads in Chrome and Edge), big hits rumble the controller: a short
buzz in the same moments the screen shakes, stronger for bigger hits. In the CONTROLS tab's Settings, a new row
**Controller rumble** with a button toggling ON ↔ OFF and the line ON "The controller rumbles on big hits.", OFF "No rumble.".
Toast `CONTROLLER RUMBLE: OFF`. Saved with the game; default ON. Without a controller, or with one that cannot rumble, nothing
happens and nothing breaks. The Screen shake setting does not affect rumble (OFF shake can still rumble), and rumble OFF does
not affect the screen.

## Build
1. `js/02-audio.js` line 9: `settings` gains `rumble:'on'` at the end (keep everything else and the order).
2. `js/10-actions.js`, after `pollPad`: `function padRumble(n)`: return at once when `settings.rumble === 'off'` or `n <= 0`;
   take the first pad from `readPads()` that has `vibrationActuator` with a `playEffect` function; with `k = Math.min(1, n/28)`
   call `pad.vibrationActuator.playEffect('dual-rumble', { duration: Math.round(60 + 140*k), strongMagnitude: k,
   weakMagnitude: Math.min(1, k*0.6 + 0.2) })` inside `try { ... } catch (e) {}` and swallow a rejected promise
   (`.catch(() => {})` when it returns one). At most one rumble per 0.05 s of `clock` (keep `let padRumbleT = -1`).
3. `js/04-player-fx.js` `shake`: after it sets `camera.shake`, call `if (typeof padRumble === 'function') padRumble(n);` with the
   raw `n` (before the shake scale).
4. `js/03-state.js` `loadGame()`: after the numbers line, `if (settings.rumble !== 'off') settings.rumble = 'on';`.
5. `js/10-actions.js`: `toggleRumble()` shaped like `toggleNumbers()` with the toast above, and `case 'rumble': toggleRumble(); break;`
   beside `case 'numbers'`.
6. `js/09-ui.js` `tabControls()`: the row after the Damage numbers row, same markup, `data-act="rumble"`, value in capitals, with
   its description line.

## Test (new file `tools/test_rumble.js`, modelled on `tools/test_comfort_settings.js` and `tools/test_gamepad.js`)
Use a fake pad `{ mapping:'standard', axes:[0,0,0,0], buttons:[...], vibrationActuator:{ calls:[], playEffect(type, p){ this.calls.push([type, p]); return Promise.resolve(); } } }`
and make `readPads` return it (replace the function in the test context, or stub `navigator.getGamepads` if the sandbox allows).
- Default `settings.rumble === 'on'`.
- `shake(14)` with time moving on (`clock += 0.1` between calls) records one `dual-rumble` call with `strongMagnitude` 0.5 and
  `duration` 130; `shake(28)` gives strength 1 and duration 200.
- Two `shake` calls in the same 0.05 s give one call.
- `settings.rumble = 'off'`: no call. `settings.shake = 'off'` with rumble on: still a call.
- A pad without `vibrationActuator`, a `playEffect` that throws, and a `playEffect` that returns a rejected promise: no error
  escapes (await a tick so an unhandled rejection would show).
- No pads at all: `shake(10)` does not throw and `camera.shake` is set exactly as before.
- `toggleRumble()` twice from on: off, on. Save round trip keeps `off`; a save with `rumble:'maybe'` or no key loads as `on`.
- `tabControls()` markup contains `data-act="rumble"`.
Print `PASS <cases>` at the end.

## Constraints
- Touch only `js/02-audio.js`, `js/03-state.js`, `js/04-player-fx.js`, `js/09-ui.js`, `js/10-actions.js` and the new test. Do not
  edit `index.html`, `3d/index.html` or `3d/render3d.js`; do NOT run `tools/stamp.sh`.
- No change to shake, damage or anything in a fight; keyboard, mouse and touch players see nothing new except the setting row.
- Match the surrounding style: compact statements, short names, one short comment per numbered item saying what the player sees.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`; `node --check` on every file you touched prints nothing.
- `node tools/test_rumble.js` prints `PASS <n>`; `node tools/test_gamepad.js`, `node tools/test_comfort_settings.js` (PASS 31),
  `node tools/test_shake_setting.js` (PASS 18), `node tools/test_army.js` (PASS 570) pass.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.

## Done when
All six items are in and every check passes. Commit nothing yourself.
