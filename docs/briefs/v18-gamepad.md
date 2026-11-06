# Brief: play with a game controller (browser Gamepad API), both views

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step, no libraries: the browser's own
`navigator.getGamepads()` only). A top-level name declared twice, or a `const` declared twice inside one function, stops a
whole script loading; `bash tools/check_names.sh` lists top-level clashes and `node --check <file>` catches the rest. Both pages
(`index.html`, `3d/index.html`) load the same `js/*.js`; the 3D view already turns movement to the camera in `updatePlayer`
(`viewYaw`), so the pad needs nothing 3D-specific.

## What the player sees
Plug in or switch on a controller (Xbox, PlayStation, Switch Pro: the browser's "standard" layout) and a toast says
`CONTROLLER CONNECTED`. In a gate:
| Control | Does | Sent as |
|---|---|---|
| Left stick | move (dead zone 0.2; a light push walks slower, like the touch stick) | movement, like `touchJoystick` |
| A (button 0) | attack; hold to keep attacking | `onKey('x')` on press, held like the X key |
| B (1) | dodge | `onKey(' ')` |
| X (2) | Arise (raise a fallen shadow) | `onKey('e')` |
| Y (3) | Monarch's Awakening | `onKey('r')` |
| LB (4), RB (5), LT (6), RT (7) | skills 2, 3, 4, 5 (Dash Strike, Shadow Strike, Ruler's Domain, Arise: Legion) | `onKey('2')` to `onKey('5')` |
| LB, RB, LT while a reward choice is up (`dungeon.state === 'boon'`) | pick reward 1, 2, 3 | `onKey('1')` to `onKey('3')` |
| D-pad down (13) | healing potion | `onKey('f')` |
| Start (9) | pause and resume | `onKey('escape')` |
Outside a fight (title screen, story cards, gameState not `'DUNGEON'` or `storyRun` set), A sends `onKey('enter')` instead,
so the title and the story cards can be passed with the pad. The CONTROLS tab gains a short **Controller** list with the table
above in the style of the keyboard list there. Keyboard, mouse and touch keep working exactly as now, together with the pad.

## Non-goals
Menu navigation with the pad (tabs, buttons, the name box), button remapping, vibration, more than one player.

## Build
1. `js/03-state.js`, next to `touchJoystick` (line 190): `const padMove = { active:false, dx:0, dy:0 };` and `let padAttack = false;`,
   and `addEventListener('gamepadconnected', () => toast('CONTROLLER CONNECTED', 'blue', 2000));` (check `toast` is defined before
   any pad can connect; if it is defined in a later file, the listener still only runs later, which is fine).
2. `js/10-actions.js`, after `onKey`: `function readPads()` returns the connected pads as a plain array, safely: `[]` when the result has no numeric `length`, when
   `navigator.getGamepads` is missing or not a function, or throws, and skipping `null` entries. `const PAD_PREV = []` holds last
   frame's pressed state per button. `function pollPad(pads = readPads())`: use the first pad with `mapping === 'standard'`, else
   the first pad, else clear `padMove` (`active:false`) and `padAttack` and return. Stick: axes 0 and 1; when their length is
   above 0.2, `padMove = { active:true, dx, dy }` with the raw values (updatePlayer already caps the length at 1), else inactive.
   `padAttack` = button 0 pressed while in a fight. Each mapped button fires its key once on the frame it goes from up to down
   (rising edge), never while held, with a fake event `{ preventDefault(){}, target:null }` as the second argument. Pick the key
   by the table above (boon state for LB, RB, LT; outside a fight A sends `enter`). Read `pressed` (or `value > 0.5` for the
   analogue triggers LT and RT).
3. `js/13-loop.js`: `step(raw)` calls `pollPad();` as its very first line (before the paused check, so Start can resume).
   `updatePlayer`: after the `touchJoystick` line, `if (padMove.active) { dx += padMove.dx; dy += padMove.dy; }`. Line 62:
   the hold-to-attack condition `(mouse.down || touchAttack || keys['x'] || keys['j'])` also accepts `padAttack`.
4. `js/09-ui.js` `tabControls()`: a `<h3>Controller</h3>` block after the keyboard list in the left column, one `k(...)` row per
   table line (A: "Attack (hold it down)", and so on), shown on every device.

## Test (new file `tools/test_gamepad.js`, modelled on `tools/test_shake_setting.js` and `tools/lib/headless.js`)
Make fake pads as plain objects: `{ mapping:'standard', axes:[0,0,0,0], buttons: Array.from({length:17}, () => ({ pressed:false, value:0 })) }`
and drive the game by calling `pollPad([pad])` then `step(1/60)` (enter a gate first, step past the intro until
`dungeon.state === 'fight'`).
- `readPads()` returns `[]` in the headless sandbox without throwing; `pollPad([])` and `pollPad([null])` do not throw.
- Stick `axes[0] = 0.9` for 30 steps moves the hunter right (x grows); `axes[0] = 0.1` for 30 steps does not move him.
- B held for 10 polls calls `dodge` exactly once (wrap `dodge` to count); release and press again: twice.
- A held: `padAttack` is true and slash is used (its cooldown starts); released: `padAttack` false.
- Start pressed once pauses (`paused` true); released and pressed again resumes.
- With `dungeon.state = 'boon'` and a boon offer present (set it up the way `tools/balance_bot.js` reaches `chooseBoon`, or wrap
  `chooseBoon` to record its argument), LB press picks index 0, RB index 1, LT index 2.
- LT as an analogue trigger: `value: 0.8, pressed:false` counts as pressed.
- With `gameState = 'TITLE'`, an A press calls `onKey('enter', …)` (wrap `onKey` to record).
- `tabControls()` markup contains `Controller`.
Print `PASS <cases>` at the end.

## Constraints
- Touch only `js/03-state.js`, `js/09-ui.js`, `js/10-actions.js`, `js/13-loop.js` and the new test. Do not edit `index.html`,
  `3d/index.html` or `3d/render3d.js`; do NOT run `tools/stamp.sh`.
- No change to any number in a fight; the pad sends the same actions the keys do.
- Art rule: nothing occult or religious, in pictures or in words.
- Match the surrounding style: compact statements, short names, one short comment per numbered item saying what the player sees.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`; `node --check` on every file you touched prints nothing.
- `node tools/test_gamepad.js` prints `PASS <n>`; `node tools/test_comfort_settings.js` (PASS 31), `node tools/test_shake_setting.js`
  (PASS 18), `node tools/test_army.js` (PASS 570), `node tools/test_rift.js` (PASS 310), `node tools/test_titles.js` (PASS 71)
  pass, and `node tools/balance_bot.js --seeds 1 --skill 0.5` still clears every gate with 0 stuck (the bot drives the touch stick;
  the pad must not interfere when no pad is connected).
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.

## Done when
All four items are in and every check passes. Commit nothing yourself.
