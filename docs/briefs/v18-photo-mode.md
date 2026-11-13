# Brief: Photo mode, a clean frozen frame from the pause menu (2D and 3D)

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). A top-level name declared twice, or a
`const` declared twice inside one function, stops a whole script loading; `bash tools/check_names.sh` lists top-level clashes and
`node --check <file>` catches the rest. `3d/index.html` is generated from `index.html` by `tools/stamp.sh` (do NOT run it and do
NOT edit `3d/index.html`): a change to `index.html` reaches the 3D page at the next stamp. The 2D view draws in
`js/12-render-fx.js` (`draw()`), the 3D view in `3d/render3d.js`; both draw the minimap through `drawMinimap()` in
`js/12b-overlay.js`.

## What the player sees
The pause menu (`#pause-overlay` in `index.html`) gains a **PHOTO MODE** button, styled like the others, right after the AIM
button. Pressing it hides everything over the game: the pause menu, the HUD (`#hud`), the touch controls (`#touch-controls`), the
toasts (`#toast-container`), and what the game draws over the scene on its canvas (the minimap, the boss name bar if it is drawn on
the canvas, the "[E] ARISE" prompt). The game stays paused, so the scene is frozen: a clean frame for a screenshot. A small line
`PHOTO MODE · ANY KEY, CLICK OR TAP TO RETURN` shows at the bottom for 1.5 seconds and then fades out, so it is gone before the
picture is taken. Any key, mouse click, tap, or the controller's Start button returns to the pause menu exactly as it was.
Nothing else changes; leaving photo mode never unpauses the game.

## Build
1. `index.html`: in `#pause-overlay`, after the `pause-aim` button, add
   `<button class="continue-btn" id="pause-photo" style="margin-top:12px">PHOTO MODE</button>`. Touch nothing else in `index.html`.
2. `js/10-actions.js`: `let photoMode = false;` `function enterPhoto()`: only while `paused`; set `photoMode = true`, hide the four
   elements (keep their previous `style.display` to restore exactly), show the hint line (one absolutely positioned `div` created
   once with `id="photo-hint"`, centred at the bottom, Orbitron 11 px, letter-spacing 3 px, `rgba(0,212,255,0.7)`, `pointer-events:none`,
   then faded with a CSS opacity transition after 1.5 s). `function exitPhoto()`: restore the elements, remove or hide the hint,
   `photoMode = false`. Wire `$('pause-photo')` to `enterPhoto()` next to the other pause buttons.
3. Leaving: at the very top of `onKey(key, e)`, `if (photoMode) { exitPhoto(); return; }` (this also catches the controller,
   because its Start button reaches `onKey('escape')`). Add `mousedown` and `touchstart` listeners on `window` that call
   `exitPhoto()` and stop that same event from doing anything else when `photoMode` is on (`e.preventDefault()`,
   `e.stopPropagation()`; use the capture phase so it runs first). The `blur` and `visibilitychange` handlers stay as they are.
4. Canvas overlays: skip `drawMinimap()` and the other over-the-scene canvas drawings while `photoMode` is on, in both views
   (find them in `js/12-render-fx.js`, `js/12b-overlay.js` and `3d/render3d.js` `drawFx3D`; the world itself, enemies, shadows,
   particles and lighting stay). Guard with `typeof photoMode !== 'undefined' && photoMode` where the file may load before
   `js/10-actions.js`. Note: while paused the game loop still calls `draw()` each frame, so the frame redraws without the overlays.
   List in the pull request which drawings you skipped.

## Test (new file `tools/test_photo_mode.js`, modelled on `tools/test_comfort_settings.js` and `tools/lib/headless.js`)
- `enterPhoto()` does nothing when not paused.
- Paused: `enterPhoto()` sets `photoMode`, and `exitPhoto()` clears it; `paused` stays true through both.
- In photo mode `onKey('x', fakeEvent)` exits photo mode and does NOT attack (wrap `useSkill` to count) and does not unpause;
  `onKey('escape', ...)` exits and does not unpause.
- `draw()` runs without error in photo mode, and `drawMinimap` is not called (wrap it to count).
- `index.html` contains `id="pause-photo"` exactly once, inside `#pause-overlay`.
Use the headless helpers; if an element is a stub in the sandbox, check only the state the code keeps. Print `PASS <cases>`.

## Constraints
- Touch only `index.html` (the one button), `js/10-actions.js`, `js/12-render-fx.js`, `js/12b-overlay.js`, `3d/render3d.js` and the
  new test. Do not touch `pollPad` or anything controller-related (another change is editing it). Do NOT run `tools/stamp.sh`.
- No change to anything in a fight or to the pause menu's other buttons.
- Art rule: nothing occult or religious, in pictures or in words.
- Match the surrounding style: compact statements, short names, one short comment per numbered item saying what the player sees.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`; `node --check` on every JavaScript file you touched prints nothing.
- `node tools/test_photo_mode.js` prints `PASS <n>`; `node tools/test_comfort_settings.js`, `node tools/test_gamepad.js`,
  `node tools/test_record.js`, `node tools/test_army.js` print PASS.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.

## Done when
All four items are in and every check passes. Commit nothing yourself unless the instructions you were given say to.
