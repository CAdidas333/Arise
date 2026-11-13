# Brief: use the game controller in the hub menu and the pause menu

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). A top-level name declared twice, or a
`const` declared twice inside one function, stops a whole script loading; `bash tools/check_names.sh` lists top-level clashes and
`node --check <file>` catches the rest. Both pages load the same `js/*.js`.

Controller support already exists (2026-11-06): `readPads()`, `PAD_PREV`, `padDown()` and `pollPad()` in `js/10-actions.js`
(after `onKey`), polled at the top of `step()` in `js/13-loop.js`; `tools/test_gamepad.js` tests it. In a fight nothing changes.
Today, outside a fight, A only sends `onKey('enter')` (title and story cards), so the hub and the pause menu need the mouse.

## What the player sees
- **Hub (System menu, `gameState === 'HUB'`, no story card up):** LB and RB switch to the previous and next tab (wrapping), the
  same as number keys 1 to 7 do in `onKey` (`menuTab = TABS[i][0]; gateAsk = null; playSfx('ui'); renderSystemMenu();`).
  The D-pad moves a highlight through the visible buttons of `#system-menu` (up and left = previous, down and right = next, in
  page order, wrapping); A presses the highlighted button (`el.click()`). The highlight is a 2 px cyan outline
  (`outline: 2px solid #00d4ff; outline-offset: 2px`) set on the element's inline style, and the page scrolls it into view
  (`el.scrollIntoView({ block:'nearest' })`). After a re-render (the menu's innerHTML is rebuilt on every click), the highlight
  goes back to the same index, clamped to the number of buttons.
- **Pause menu (`paused` true in a gate):** the same D-pad highlight and A press over the visible buttons of `#pause-overlay`
  (RESUME, FULLSCREEN, AIM, SWITCH VIEW, QUIT TO HUB). Start still resumes as now.
- Nothing shows until the D-pad is first pressed, so mouse and touch players never see a highlight.

## Build (`js/10-actions.js` only, plus the test)
1. `function padMenu()` returns the container the pad drives: `$('system-menu')` when `gameState === 'HUB'` and no story card
   (`!storyRun`), `$('pause-overlay')` when `gameState === 'DUNGEON' && paused`, else `null`. `function padButtons(box)` returns
   its visible buttons: `box.querySelectorAll('button')`, keeping only those with `offsetParent !== null` and not `disabled`.
   (Guard both for the headless test: no `querySelectorAll` means `[]`.)
2. `let padFocus = -1;` and `function padMoveFocus(step)`: with the menu's buttons, clear the outline on the old one, move
   `padFocus` by `step` with wrapping (from -1, a step of +1 lands on 0 and -1 on the last), set the outline and scroll.
3. In `pollPad`, when `padMenu()` is not null, handle the rising edge of: D-pad up 12 and left 14 → `padMoveFocus(-1)`; down 13
   and right 15 → `padMoveFocus(+1)`; A 0 → click `padButtons(box)[padFocus]` if it exists; LB 4 / RB 5 in the hub → previous /
   next tab, then re-apply the highlight at the clamped index. In these menus those buttons do nothing else (in particular D-pad
   down must not send `f`, and A must not send `enter`, while a menu is driven). Keep `PAD_PREV` updated for every button as now.
   Everywhere else the existing mapping is unchanged.
4. Re-apply after re-render: at the end of `renderSystemMenu` is NOT yours to edit; instead, in `padMoveFocus` and after a click,
   always look the buttons up again (never keep element references), so a rebuilt menu is handled.

## Test (add cases to `tools/test_gamepad.js`, keep its existing cases)
Use fake elements: an object with `querySelectorAll('button')` returning fake buttons `{ offsetParent:{}, disabled:false,
style:{}, clicks:0, click(){ this.clicks++; }, scrollIntoView(){} }`, and stub `padMenu` to return it (or set `gameState` and
`$` as the file allows). Cases: D-pad down twice then A clicks button index 1; D-pad up from -1 lands on the last button;
wrapping past the end returns to 0; the old button's outline is cleared when the highlight moves; a hidden button
(`offsetParent:null`) is skipped; in the hub LB from tab 0 lands on the last tab and RB on tab 1; in the hub D-pad down does not
call `usePotion` and A does not call `onKey('enter')`; in a fight (not paused) D-pad down still drinks a potion and A still
attacks (the existing cases cover the attack). Print `PASS <n>` as now.

## Constraints
- Touch only `js/10-actions.js` and `tools/test_gamepad.js`. Do not edit `index.html`, `3d/index.html`, `3d/render3d.js` or
  `js/09-ui.js`; do NOT run `tools/stamp.sh`.
- No change in a fight; no change for mouse, keyboard or touch players.
- Match the surrounding style: compact statements, short names, one short comment per numbered item saying what the player sees.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`; `node --check js/10-actions.js tools/test_gamepad.js` prints nothing.
- `node tools/test_gamepad.js` prints `PASS <n>` with n above 19; `node tools/test_comfort_settings.js` (PASS 31),
  `node tools/test_army.js` (PASS 570), `node tools/test_titles.js` (PASS 71) pass.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.

## Done when
All four items are in and every check passes. Commit nothing yourself.
