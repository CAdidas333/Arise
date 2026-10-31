# Brief: name your shadows (SHADOWS tab)

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). A top-level name declared twice, or a
`const` declared twice inside one function, stops a whole script loading; `bash tools/check_names.sh` lists top-level clashes and
`node --check <file>` catches the rest. Use exactly the new names below.

## What the player sees
In the hub's SHADOWS tab every shadow soldier has a small NAME button. Pressing it turns that row's name into a text box (up to
16 characters) with OK and CLEAR buttons; Enter also confirms. A named shadow shows its name large and what it was underneath,
small (`IGRIS` over `Death Knight · MARSHAL`). Names are saved with the game. Nothing in a fight changes.

## Build
1. Data: a shadow may carry `nick` (a string, '' or missing = no name). `function cleanNick(v)` in `js/01-data.js` next to `esc`
   (line 174): `String(v || '').replace(/[\u0000-\u001f<>&"'`]/g, '').trim().slice(0, 16)`.
2. Save and load, `js/03-state.js`: `saveGame()`'s `shadows: player.shadows.map(s => ({ ... }))` adds `nick: s.nick || ''`;
   `loadGame()`'s shadow map (line about 77) adds `nick: cleanNick(s.nick)`. The `name` field keeps the enemy name (other code
   uses it to work out the kind and grade), so the nickname is always a separate field.
3. SHADOWS tab, `js/09-ui.js` `tabShadows()`: a top-level `let nickEdit = -1;` (the index in `player.shadows` being named, or -1).
   For each row, `const i = player.shadows.indexOf(s)`. Normal row: the name line shows `esc(s.nick || s.name)` (with the grade
   span as now), and when `s.nick` is set a small line under it `esc(s.name)`; a button
   `<button class="sys-btn" data-act="nick" data-v="${i}">NAME</button>` at the right of the row. The row being edited
   (`i === nickEdit`) shows instead `<input id="nick-input" maxlength="16" value="${esc(s.nick || '')}" placeholder="${esc(s.name)}">`
   and two buttons `data-act="nick-ok" data-v="${i}"` (OK) and `data-act="nick-clear" data-v="${i}"` (CLEAR), styled like the other
   `sys-btn`s, and the input gets focus after the tab renders (`setTimeout(() => { const e = $('nick-input'); if (e) e.focus(); }, 0)`
   at the end of `tabShadows` when `nickEdit >= 0`).
4. Actions, `js/10-actions.js` menu `switch`: `case 'nick': nickEdit = +v; break;`,
   `case 'nick-ok': { const s = player.shadows[+v], e = $('nick-input'); if (s && e) s.nick = cleanNick(e.value); nickEdit = -1; saveGame(); playSfx('ui'); break; }`,
   `case 'nick-clear': { const s = player.shadows[+v]; if (s) s.nick = ''; nickEdit = -1; saveGame(); break; }`. Leaving the tab
   (`case 'tab':`) sets `nickEdit = -1`.
5. Typing in the box must not trigger game keys: find the `keydown` listener in `js/10-actions.js` (about line 200) and the one in
   `js/03-state.js` that fills `keys`; when `e.target` is an `INPUT` (the name screen's box already has to be handled this way,
   follow what it does), let the key through to the input and do nothing else, except Enter in `#nick-input`, which does what
   OK does (call the same code, then `renderSystemMenu()`).

## Test (new file `tools/test_shadow_names.js`, modelled on `tools/test_titles.js` and `tools/lib/headless.js`)
- `cleanNick`: strips `<`, `>`, `&`, quotes, backticks and control characters, trims, caps at 16; `cleanNick(undefined)` is ''.
- Save round trip: a player with three shadows, one named `Igris`, one with a nick holding `<b>x</b>`; `saveGame()`, `loadGame()`:
  the names come back cleaned, `name` (the enemy name) unchanged, kinds and grades unchanged.
- A save from before nicknames (shadows with no `nick`) loads with every `nick` ''.
Print `PASS <cases>` at the end.

## Constraints
- Touch only `js/01-data.js`, `js/03-state.js`, `js/09-ui.js`, `js/10-actions.js` and the new `tools/test_shadow_names.js`.
  Do not edit `index.html` or `3d/index.html`; do NOT run `tools/stamp.sh`.
- Every place a nickname reaches markup goes through `esc()`. No change to shadow damage, roles or anything in a fight.
- Art rule (pictures and words): nothing occult or religious added.
- Match the surrounding style: compact statements, short names, one short comment per numbered item saying what the player sees.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`; `node --check` on every file you touched prints nothing.
- `node tools/test_shadow_names.js` prints `PASS <n>`; `node tools/test_titles.js`, `node tools/test_boxes.js`,
  `node tools/test_army.js`, `node tools/test_gear.js` and `node tools/test_layout.js` (ends `PASS 8000`) pass.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.

## Done when
All five items are in and every check passes. Commit nothing yourself.
