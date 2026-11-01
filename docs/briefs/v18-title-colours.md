# Brief: hunter colours earned by titles (2D and 3D, cosmetic only)

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). A top-level name declared twice, or a
`const` declared twice inside one function, stops a whole script loading; `bash tools/check_names.sh` lists top-level clashes and
`node --check <file>` catches the rest. Use exactly the new names below. Both pages (`index.html` and `3d/index.html`) load the
same `js/*.js` files; the 3D page draws with `3d/render3d.js` instead of `js/11-render-world.js`/`js/12-render-fx.js`.

## What the player sees
Each System title, once earned, also unlocks a glow colour for the hunter. In the STATUS tab's Titles list every earned title gets
a second small button, a colour swatch with the word WEAR (WORN when it is the one worn). Wearing one changes the hunter's glow:
the rim light on the body, the zip line and the pool of light under the feet (2D and 3D), and the point light that follows the
hunter (3D). Pressing WORN again goes back to the default cyan. It is separate from SHOW (the title under the name): a player may
show one title and wear another's colour. The hit flash (red) and the Awakening (violet) still override it, exactly as now.
No change to damage, health, speed or anything else in a fight.

## Build
1. Data, `js/01-data.js`: add a `hue` field to every entry of `TITLES` (keep everything else in each entry as it is):
   gate_walker `'#4fa8ff'`, cuts_100 `'#3dffb0'`, cuts_1000 `'#00ffe0'`, chain_50 `'#c8ff4a'`, ghost_step `'#e8f4ff'`,
   captain `'#7f9cff'`, commander `'#5b6bff'`, seeker `'#ffb347'`, breaker `'#ff8a3d'`, untouchable `'#b8ffea'`,
   climber `'#ff6fae'`, heir `'#ffd700'`.
   Under `titleName` add `const hunterHue = p => { const t = p && p.hue && TITLES.find(x => x.id === p.hue); return t ? t.hue : COLORS.primary; };`
   and `const hexRgba = (h, a) => 'rgba(' + parseInt(h.slice(1,3),16) + ',' + parseInt(h.slice(3,5),16) + ',' + parseInt(h.slice(5,7),16) + ',' + a + ')';`
   (first `grep -n "hexRgba\|hunterHue" js/*.js 3d/*.js`; if a helper doing the same already exists, use it instead of adding one).
2. Player and save, `js/04-player-fx.js` line 11: the new player gets `hue:''` beside `title:''`. `js/03-state.js`: `saveGame()`
   saves `hue: player.hue` beside `title:player.title` (line 54); `loadGame()` sets
   `player.hue = player.titles.includes(d.hue) ? d.hue : '';` right after the `player.title = ...` line (about 120). A save from
   before this has no `hue` and loads as ''.
3. STATUS tab, `js/09-ui.js` `tabStatus()` Titles loop (about line 133): for an earned title, beside the SHOW/SHOWN button add
   `<button class="sys-btn${worn ? ' on' : ''}" data-act="hue" data-v="${t.id}"><span style="display:inline-block;width:9px;height:9px;margin-right:5px;background:${t.hue};box-shadow:0 0 6px ${t.hue}"></span>${worn ? 'WORN' : 'WEAR'}</button>`
   with `const worn = player.hue === t.id;`. Unearned rows unchanged. Keep both buttons on one line at phone width (375 px): put
   them in one `span.stat-value` with a small gap; shrink the button padding only if they wrap.
4. Action, `js/10-actions.js` menu `switch`, next to `case 'title':` (line 164):
   `case 'hue': player.hue = player.hue === v ? '' : (player.titles.includes(v) ? v : player.hue); saveGame(); playSfx('ui'); break;`
5. 2D drawing, `js/12-render-fx.js` `drawPlayer()`: compute `const hue = hunterHue(player);` once; the hunter's `color:` uses
   `hue` where it used `COLORS.primary`; the glow gradient's not-Awakened stop `'rgba(0,212,255,0.17)'` becomes `hexRgba(hue, 0.17)`.
   Leave the hit flash, the Awakening colours, `eye`, `blade`, `body` and `cape` as they are. Check `drawHunterClassic` takes
   the colour from `o.color` too (it should; if it hard-codes cyan anywhere for the hunter's glow, use `o.color` there).
6. 3D drawing, `3d/render3d.js`: `Fig.tintHunter(state, blade)` gets a third argument `hue` (a '#rrggbb' string). Inside, the
   state-0 glow uses `hue` instead of `CYAN`, and the cache check becomes `state !== tintNow || hue !== hueNow` (a new
   `let hueNow = ''` beside `tintNow`). At the call site (about line 1442) pass `hunterHue(player)` (guard with
   `typeof hunterHue === 'function' ? hunterHue(player) : CYAN`). In the same block, the not-Awakened `hunterLight.color.set(...)`
   and `hunterGlow3D.material.color.set(...)` use that hue instead of `COLORS.primary` / `0x00d4ff`. The Awakened and hit colours
   stay as they are. Do not touch shadows, enemies or the classic-look switch otherwise (the classic body `CM.line`/`CM.rim` follow
   the same glow, as they do now).

## Test (new file `tools/test_title_colours.js`, modelled on `tools/test_titles.js`)
- Every `TITLES` entry has a `hue` matching `/^#[0-9a-f]{6}$/`; all twelve differ; none equals `COLORS.danger`, `COLORS.primary`,
  `'#cc88ff'` or `'#8844ff'` (hit and Awakening colours).
- A new player: `hue === ''` and `hunterHue(player) === COLORS.primary`.
- Wearing: give the player `cuts_100`, run the `hue` action (call the same code the menu runs, or set `player.hue` the way the
  action does): `hunterHue(player) === '#3dffb0'`; running it again clears it to ''.
- Save round trip keeps `hue`; a save whose `hue` names a title the player has not earned, or an unknown id, loads as '';
  a save with no `hue` field loads as ''.
- `hexRgba('#3dffb0', 0.5) === 'rgba(61,255,176,0.5)'`.
Stub `saveGame` writes to memory only, as the other tests do. Print `PASS <cases>` at the end.

## Constraints
- Touch only `js/01-data.js`, `js/03-state.js`, `js/04-player-fx.js`, `js/09-ui.js`, `js/10-actions.js`, `js/12-render-fx.js`,
  `3d/render3d.js` and the new test. Do not edit `index.html` or `3d/index.html`; do NOT run `tools/stamp.sh`.
- Cosmetic only: no change to any number in a fight. No new art, symbols or words beyond WEAR and WORN.
- Art rule: nothing occult or religious, in pictures or in words.
- Match the surrounding style: compact statements, short names, one short comment per numbered item saying what the player sees.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`; `node --check` on every file you touched prints nothing.
- `node tools/test_title_colours.js` prints `PASS <n>`; `node tools/test_titles.js` (PASS 71), `node tools/test_record.js`,
  `node tools/test_boxes.js`, `node tools/test_army.js` and `node tools/test_layout.js` (ends `PASS 8000`) pass.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.

## Done when
All six items are in and every check passes. Commit nothing yourself.
