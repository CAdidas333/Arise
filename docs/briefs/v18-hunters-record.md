# Brief: the Hunter's Record (a new System menu tab)

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). A top-level name declared twice, or a
`const` declared twice inside one function, stops a whole script loading; `bash tools/check_names.sh` lists top-level clashes and
`node --check <file>` catches the rest. Use exactly the new names below.

## What the player sees
A seventh tab in the hub's System menu, RECORD. For each gate, in order (E to S), a heading with the gate's rank and name, then
every enemy of that gate and its boss: the name, what kind it is (for a boss, BOSS), and how many the hunter has slain. One
never slain shows `???` in place of its name, dimmed. A boss whose shadow the hunter owns is marked `SHADOW RAISED` in violet.
A line at the top counts how many of all the entries have been slain at least once (`DISCOVERED 14 / 31`).

## Build
1. Counting: `player.slain = {}` in `createPlayer` (`js/04-player-fx.js`), an object of name → count. In `js/06-combat.js`, where a
   kill is counted (the line with `run.kills++`), add `const sn = e.isBoss ? e.def.name : (e.baseName || e.def.name); player.slain[sn] = (player.slain[sn] || 0) + 1;`
   (check the real field names on an enemy: `e.baseName` is what remnants use; elites must count under their base name).
2. `function recordNames()` in `js/01-data.js` after `GATE_DEFS`: a `Set` of every enemy `name` in every gate's `enemies` list and
   every boss name. Save and load in `js/03-state.js`: `saveGame()` adds `slain:{...player.slain}`; `loadGame()` keeps only keys
   in `recordNames()` with values `Math.max(0, v|0)` (an old save has none: `{}`).
3. The tab, `js/09-ui.js`: add `['record','RECORD']` to `TABS` after `shadows`; find where `renderSystemMenu` picks the function for
   `menuTab` and add `record` → `tabRecord()`. `function tabRecord()` builds the list above with the existing classes (`h3`,
   `stat-row`, `stat-name`, `stat-value`, the small dim sub-line style used in `tabStatus`), every name through `esc()`. The kind
   label comes from the enemy definition (read what field holds it: melee, ranged, charger, bomber, brute, caster), in capitals.
4. Test: new `tools/test_record.js`, modelled on `tools/test_titles.js` with the headless game: a kill of an ordinary enemy, an elite
   of the same kind and a boss add 2 to the base name and 1 to the boss; save and load keep the counts; a save holding an unknown
   name and a negative count loads without the unknown name and with 0; `recordNames()` has no duplicates and contains every boss.
   Print `PASS <cases>`.

## Constraints
- Touch only `js/01-data.js`, `js/03-state.js`, `js/04-player-fx.js`, `js/06-combat.js`, `js/09-ui.js` and the new test.
  Do not edit `index.html` or `3d/index.html`; do NOT run `tools/stamp.sh`. No change to anything in a fight.
- Art rule (pictures and words): nothing occult or religious added.
- Match the surrounding style: compact statements, short names, one short comment per numbered item saying what the player sees.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`; `node --check` on every file you touched prints nothing.
- `node tools/test_record.js` prints `PASS <n>`; `node tools/test_shadow_names.js`, `node tools/test_titles.js`,
  `node tools/test_boxes.js`, `node tools/test_army.js`, `node tools/test_gear.js`, `node tools/test_layout.js` (ends `PASS 8000`) pass.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.

## Done when
All four items are in and every check passes. Commit nothing yourself.
