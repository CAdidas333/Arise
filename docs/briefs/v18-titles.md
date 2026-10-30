# Brief: System Titles (new content, cosmetic only)

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). A top-level name declared twice, or a
`const` declared twice inside one function, stops a whole script loading; `bash tools/check_names.sh` lists top-level clashes and
`node --check <file>` catches the rest. Use exactly the new names below. Both pages (`index.html`, `3d/index.html`) load the
`js/` files this brief touches, so the feature works in both views with no 3D code.

## What the player sees
The System grants titles for feats. When one is earned in a gate, the System window shows `[ TITLE ACQUIRED ]`, the title's name
and what earned it. In the hub, the STATUS tab gets a **Titles** list: every title, earned ones bright with a SHOW button, locked
ones dim with how to earn them. The title shown replaces the word HUNTER under the hunter's name on the HUD (`RANK E — GHOST STEP`)
and on the shareable result card. Titles give NO stats and change nothing in a fight.

## 1. The table (`js/01-data.js`, right after the `BOX_CHANCE` line)
```js
// System titles: earned by feats, shown under the hunter's name; cosmetic only. has(p, h): p = the player, h = highScores
const TITLES = [
  { id:'gate_walker', name:'GATE WALKER',       how:'Clear your first gate',              has:(p, h) => h.gatesCleared >= 1 },
  { id:'cuts_100',    name:'HUNDRED CUTS',      how:'Defeat 100 enemies',                 has:(p, h) => h.totalKills >= 100 },
  { id:'cuts_1000',   name:'THOUSAND CUTS',     how:'Defeat 1,000 enemies',               has:(p, h) => h.totalKills >= 1000 },
  { id:'chain_50',    name:'UNBROKEN CHAIN',    how:'Reach a 50-hit combo',               has:(p, h) => h.bestCombo >= 50 },
  { id:'ghost_step',  name:'GHOST STEP',        how:'Make 25 perfect dodges',             has:(p) => p.feats.perfects >= 25 },
  { id:'captain',     name:'SHADOW CAPTAIN',    how:'Raise an army of 10 shadows',        has:(p) => p.shadows.length >= 10 },
  { id:'commander',   name:'LEGION COMMANDER',  how:'Raise an army of 40 shadows',        has:(p) => p.shadows.length >= 40 },
  { id:'seeker',      name:'TREASURE SEEKER',   how:'Open 10 reward boxes',               has:(p) => p.feats.boxes >= 10 },
  { id:'breaker',     name:'GATE BREAKER',      how:'Clear 25 gates',                     has:(p, h) => h.gatesCleared >= 25 },
  { id:'untouchable', name:'UNTOUCHABLE',       how:'Clear a gate without taking damage', has:(p) => p.feats.flawless >= 1 },
  { id:'climber',     name:'CASTLE CLIMBER',    how:'Reach floor 20 of the Demon Castle', has:(p, h) => h.bestFloor >= 20 },
  { id:'heir',        name:"THE MONARCH'S HEIR", how:'Clear the S-rank gate',             has:(p) => (p.cleared.s_gate | 0) >= 1 },
];
const titleName = p => { const t = p && p.title && TITLES.find(x => x.id === p.title); return t ? t.name : 'HUNTER'; };
```

## 2. The player (`js/04-player-fx.js`, `createPlayer`)
Add to the object: `titles:[], title:'', feats:{ perfects:0, boxes:0, flawless:0 },` (titles: ids earned; title: the id shown, or '').

## 3. Counting the feats
- `js/06-combat.js` line 103, where `player.perfect = true` is set: add `player.feats.perfects++;` on that line.
- `js/08-dungeon.js`, `openRewardBox(b)`: add `player.feats.boxes++;` as its first line.
- `js/08-dungeon.js`, `clearGate(b)`: after `player.cleared[g.id] = ...`: `if (run && run.dmgTaken === 0) player.feats.flawless++;` and then `checkTitles(false);`.

## 4. Checking and announcing (`js/09-ui.js`, right after `function systemPop`)
```js
let titleQueue = [], titleGap = 0, titleCheckT = 0;
// Grants every title whose feat is met. silent: grant without the System window (used once on load, for deeds done before titles existed). Returns the number granted.
function checkTitles(silent) { ... }
// Called every frame in a gate: re-checks every 0.5 s and shows queued titles one at a time, 2.4 s apart
function titleTick(dt) { ... }
```
- `checkTitles(silent)`: if no `player` return 0. For each title not in `player.titles` whose `has(player, highScores)` is true:
  push its id onto `player.titles`; unless silent, push it onto `titleQueue`. If anything was granted, `saveGame()`. Return the count.
- `titleTick(dt)`: `titleCheckT -= dt; if (titleCheckT <= 0) { titleCheckT = 0.5; checkTitles(false); }`, then `titleGap -= dt;` and
  when `titleGap <= 0` and the queue is not empty: take the first id, `systemPop('TITLE ACQUIRED', t.name, t.how.toUpperCase())`,
  `playSfx('boon')`, `titleGap = 2.4`.
- `js/13-loop.js`, `updatePlayer(dt)`: call `titleTick(dt);` right after the reward boxes block.

## 5. Save and load (`js/03-state.js`)
- `saveGame()`: add `titles:[...player.titles], title:player.title, feats:{...player.feats},` to the object `d`.
- `loadGame()`: right before `checkDailyReset();`: `player.titles` = the saved array filtered to ids that exist in `TITLES`, no
  duplicates (an old save has none: `[]`); `player.feats` = `{ perfects, boxes, flawless }` each `Math.max(0, saved|0)`;
  `player.title` = the saved id only if it is in `player.titles`, else `''`. Then, after `recalcPlayer(...)` near the end:
  `const past = checkTitles(true); if (past) toast(\`THE SYSTEM GRANTS ${past} TITLE${past > 1 ? 'S' : ''} FOR PAST DEEDS\`, 'purple', 4500);`
  (`toast` exists; check its arguments in the code). Saved strings must never reach markup unchecked: only known ids are kept.

## 6. Showing it
- HUD, `js/09-ui.js` line 37: `setT('hud-rank', \`RANK ${player.rank} — ${titleName(player)}\`);`
- Result card, `js/12a-card.js`: the data object gets `title: titleName(player)` next to `hunterRank` (line 83), and the line at
  164 becomes `` `LEVEL ${d.level}  ·  ${d.hunterRank}-RANK ${d.title}` `` (the same font and place).
- STATUS tab, `js/09-ui.js`, `tabStatus()`: right after the Records rows (`left += '<h3>Records</h3>' + ...;`), add
  `left += '<h3>Titles <span style="font-size:11px;opacity:.5">' + player.titles.length + ' / ' + TITLES.length + '</span></h3>';`
  then one row per title, in table order: earned titles use the existing `stat-row` look with the name in `#00d4ff`, the `how`
  text small and dim under it, and on the right a button `<button class="sys-btn" data-act="title" data-v="ID">SHOW</button>`
  (reading `SHOWN` and styled `on`, like other selected buttons in this file, when it is `player.title`); locked titles show the
  name at 35 percent opacity, the `how` text, and no button. Match the markup style of the rows around it.
- `js/10-actions.js`, the menu `switch`: `case 'title': player.title = player.title === v ? '' : (player.titles.includes(v) ? v : player.title); saveGame(); playSfx('ui'); break;`
  (pressing SHOWN again goes back to HUNTER).

## 7. Test (new file `tools/test_titles.js`, modelled on `tools/test_boxes.js`)
With the headless game (`const { ctx, api } = require('./lib/headless.js').createGame()`, globals through `vm.runInContext`):
- `TITLES` has 12 entries, unique ids, every name in capitals, and no name or `how` text contains any of these words (case
  insensitive): STAR, RUNE, GOD, HOLY, SAINT, ANGEL, CROSS, PRAY, CHURCH, TEMPLE, DIVINE, SACRED, CURSE, OCCULT, SPELL, DEVIL.
- A new player has `titles` empty, `title` '' and every feat 0; `titleName` gives HUNTER.
- `highScores.totalKills = 150`, then `checkTitles(true)`: `cuts_100` granted, `cuts_1000` not, nothing else granted (the other
  feats are 0); a second call grants nothing and leaves no duplicate.
- Each title's `has` is true just at its threshold and false just below it (build the player and highScores fields for each).
- Save round trip: earn two titles, show one, set feats, `saveGame()`, `loadGame()`: titles, title and feats come back. A save
  edited to hold an unknown id and a title that was not earned loads with the unknown id dropped and the title ''.
- The queue: with `systemPop` replaced by a counter, earning two titles with `checkTitles(false)` and stepping `titleTick` over
  3 s shows exactly 2 pops, at least 2.4 s apart.
Print `PASS <cases>` at the end.

## Constraints
- Touch only `js/01-data.js`, `js/03-state.js`, `js/04-player-fx.js`, `js/06-combat.js`, `js/08-dungeon.js`, `js/09-ui.js`,
  `js/10-actions.js`, `js/12a-card.js`, `js/13-loop.js` and the new `tools/test_titles.js`. Do not edit `index.html` or
  `3d/index.html`; do NOT run `tools/stamp.sh`.
- Titles give no stats: nothing in damage, health, speed, XP, gold or drops may read `player.titles`, `player.title` or `player.feats`.
- Art rule (pictures and words): no star symbols, runes, occult or religious words or imagery.
- Match the surrounding style: compact statements, short names, one short comment per numbered item saying what the player sees.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`.
- `node --check` on every file you touched prints nothing.
- `node tools/test_titles.js` prints `PASS <n>`; `node tools/test_boxes.js`, `node tools/test_layout.js` (ends `PASS 8000`),
  `node tools/test_gear.js` and `node tools/test_army.js` pass.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.

## Done when
All seven items are in and every check passes. Commit nothing yourself.
