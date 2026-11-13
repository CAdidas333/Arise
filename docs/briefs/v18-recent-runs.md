# Brief: a Recent runs list (the last 10 gate runs) in the STATUS tab

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). A top-level name declared twice, or a
`const` declared twice inside one function, stops a whole script loading; `bash tools/check_names.sh` lists top-level clashes and
`node --check <file>` catches the rest. Both pages load the same `js/*.js`.

## What the player sees
In the hub's STATUS tab, under the Records block and above Titles, a **Recent runs** block lists the hunter's last 10 runs,
newest first, one compact row each, in the same `stat-row` style as Records:
- a gate clear: `E-RANK · Goblin Cavern` on the left; on the right the grade letter in its grade colour (S `#bb66ff`, A `#ffcc00`,
  B `#00d4ff`, C `#8899aa`, the colours `showVictory` uses), then `1:04 · 38 kills`;
- a Gilded Rift: `GILDED RIFT`, grade, `6/8 caught`;
- a fall: the gate name, `FELL` in `COLORS.danger` instead of a grade, `wave 3/5 · 12 kills`; in the Demon Castle: `DEMON CASTLE`,
  `FELL`, `floor 7 · 40 kills`.
With no runs yet the block shows one dim line: `No runs yet. Enter a gate from GATES.` Saved with the game. Nothing in a fight
changes; leaving a gate from the pause menu is not recorded (non-goal), and nothing else about the end screens changes.

## Build
1. `js/04-player-fx.js` `createPlayer`: the new player gets `runs:[]` (beside `slain`).
2. `js/08-dungeon.js`: `function logRun(r)` puts `r` at the front of `player.runs` and keeps at most 10. Call it once per run, at
   the moment the result is known:
   - in `showVictory()` after `run.grade` is set: `{ t:'gate', id:dungeon.gate.id, grade, time:Math.round(run.time), kills:run.kills }`;
   - in `showRiftEnd()` after the grade: `{ t:'rift', grade, caught:n, total:r.total }`;
   - in `showDeath()`: `{ t:'fell', id:dungeon.gate.id, endless:!!dungeon.endless, wave:dungeon.wave, max:dungeon.endless ? 0 : dungeon.maxWaves, kills:run.kills }`.
   Guard each so a second call for the same run cannot add a second row (`run.logged = true` on the first).
3. `js/03-state.js`: `saveGame()` saves `runs: player.runs.slice(0, 10)`; `loadGame()` keeps only well-formed entries:
   `t` one of `gate`, `rift`, `fell`; for `gate` and `fell` an `id` that is a known gate (`GATE_DEFS.some(g => g.id === id)`);
   `grade` one of `S A B C` where present; every number made a whole number `>= 0` (`Math.max(0, x|0)`); at most 10. A save from
   before this has no `runs` and loads with `[]`.
4. `js/09-ui.js` `tabStatus()`: the block described above, built with the existing `row`/`stat-row` markup and `esc()` around
   every gate name. A gate's display name and rank come from `GATE_DEFS` by `id`.

## Test (new file `tools/test_recent_runs.js`, modelled on `tools/test_record.js` and `tools/lib/headless.js`)
- A new player has `runs` `[]`; `tabStatus()` shows `No runs yet`.
- Clear a gate in the headless game the way `tools/test_record.js` or `tools/test_rift.js` reaches a victory (or call
  `showVictory()` with `dungeon` and `run` set up), and the newest entry is a `gate` row with that gate's id, a grade and the
  kills; calling `showVictory()` again for the same run adds nothing.
- A rift end (`tools/test_rift.js` shows how) adds a `rift` row with caught and total; a death (`showDeath()`) adds a `fell` row;
  in endless mode `endless:true`.
- Twelve runs keep the newest ten.
- Save round trip keeps the rows; a save with a bad row (unknown id, `t:'boss'`, grade `X`, negative kills, a string number) drops
  or cleans it as described; a save with no `runs` loads `[]`.
- `tabStatus()` lists the rows newest first, and a gate name passes through `esc()` (a gate name is fixed data, so check that the
  markup contains the name and `Recent runs`).
Stub `saveGame` storage as the other tests do. Print `PASS <cases>` at the end.

## Constraints
- Touch only `js/03-state.js`, `js/04-player-fx.js`, `js/08-dungeon.js`, `js/09-ui.js` and the new test. Do not edit `index.html`,
  `3d/index.html` or `3d/render3d.js`; do NOT run `tools/stamp.sh`.
- No change to grades, rewards, XP, gold or anything in a fight.
- Art rule: nothing occult or religious, in pictures or in words.
- Match the surrounding style: compact statements, short names, one short comment per numbered item saying what the player sees.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`; `node --check` on every file you touched prints nothing.
- `node tools/test_recent_runs.js` prints `PASS <n>`; `node tools/test_record.js` (PASS 166), `node tools/test_rift.js` (PASS 310),
  `node tools/test_titles.js` (PASS 71), `node tools/test_army.js` (PASS 570) pass.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.

## Done when
All four items are in and every check passes. Commit nothing yourself.
