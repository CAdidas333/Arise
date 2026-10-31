# Brief: the Gilded Rift (a rare treasure gate: no boss, fleeing gold goblins, 60 seconds)

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step). Both pages, `index.html` (2D) and
`3d/index.html` (3D), load the same `js/` game logic; the 3D page swaps the 2D renderer for `3d/render3d.js`. A top-level name
declared twice, or a `const` declared twice inside one function, stops a whole script loading; `bash tools/check_names.sh` lists
top-level clashes and `node --check <file>` catches the rest. Use exactly the new names below.

Goal: more variety WITHOUT more difficulty. Nothing in this gate can hurt the hunter.

## What the player sees
1. After the hunter clears a normal gate (not endless), the System sometimes opens a Gilded Rift: always after the hunter's first
   ever gate clear, then a 35 percent chance per clear, and only one rift can be open at a time. It is announced with the
   existing `systemPop(title, line1, line2)`: `GILDED RIFT`, `A RIFT OF GOLD HAS OPENED`, `FIND IT UNDER GATES`.
2. While a rift is open, the GATES tab shows one more card after the ENDLESS card: rank label `RIFT`, name `Gilded Rift`,
   description `Gold goblins flee. 60 seconds. Catch what you can.`, meta line `OPEN`, gold left border `#ffcc33`,
   `data-act="rift"`. No card when no rift is open.
3. Entering it closes the rift (it is used up the moment the run starts) and saves. An open arena, no chambers, no boss, no boons,
   no extraction. The floor, weather and props of the Dragon's Lair (gold heaps and cinders).
4. Eight Gilded Goblins appear around the hunter (300 to 600 from him). They never attack and do no contact damage. They flee:
   within 420 of the hunter they run directly away from him (bending along the arena wall instead of pressing into it); further
   out they wander. Every 2.5 to 4 seconds each one stumbles and stands still for 0.6 seconds, so a hunter on foot can catch them.
   Their run speed is 90 percent of the hunter's base move speed (find where the hunter's speed is set and read it). Each hit on a
   goblin spills one small gold orb (at most 5 per goblin), and it sparkles gold while it runs.
5. The HUD's gate-name line (`hud-gate-name`) reads `GILDED RIFT — 0:42 · 3 / 8 CAUGHT` and updates as time and catches change.
6. When all eight are caught, or the 60 seconds run out: the goblins still running vanish in a gold sparkle (no kill credit), every
   gold orb still on the floor is collected, and the victory overlay shows: grade `S` for 8 caught, `A` for 6 or 7, `B` for 3 to 5,
   `C` below; stats lines `Goblins Caught: 6 / 8`, `Time`, `XP Earned`, `Gold`, and the loot line as the normal victory shows it.
   The overlay's existing button returns to the hub as usual.
7. Rewards (no balance change elsewhere): a caught goblin gives the normal kill XP and gold plus a spill of 6 gold orbs worth
   `Math.ceil(tier.boss.xp * 0.25)` together, and a 25 percent chance of an item at rarity 1 (`dropGear(x, y, 1)`); catching all
   eight drops one more item at rarity 2. `tier` is the highest gate in `GATE_DEFS` the hunter's level unlocks (the same rule the
   GATES tab uses for its highlighted gate). Goblin health: `tier.enemies[0].hp * 2`; goblin XP: `tier.enemies[0].xp * 3`.
8. A rift run is NOT a gate clear: it does not touch `player.cleared`, `questProgress.gatesCleared`, `highScores.gatesCleared`,
   `highScores.bestGate`, titles earned by clears, the story chapters or the result card (do not call `armResultCard` for it).

## Build
1. `js/01-data.js`, after `ENDLESS`: `const RIFT = { id:'rift', name:'Gilded Rift', rank:'RIFT', reqLevel:1, waves:1, time:60,
   goblins:8, floor:<the Dragon's Lair floor key, read how buildFloor picks it; s_gate uses floor:'s_gate_v2'>, ambientColor:'#332a00',
   theme:{ a:'#16130a', b:'#100d07', line:'#ffcc33', ember:'#ffe58a' }, rift:true }`. Read every place that reads `dungeon.gate.*`
   during a run (weather in `js/12b-overlay.js`, gate dressing in the 2D and 3D renderers, `buildFloor`, the HUD, `extractChance`,
   `showVictory`, `storyVictoryLine`, the result card) and make each one behave for the rift as for the Dragon's Lair or skip it;
   nothing may read `RIFT.boss` (there is none) or `RIFT.enemies`.
2. Rift state: `player.rift` (boolean) and `player.rifts` (count of rift runs) in `createPlayer` (`js/04-player-fx.js`); saved and
   loaded in `js/03-state.js` (an old save has neither: `false` and `0`). Opening a rift: in `clearGate` (`js/08-dungeon.js`), after
   the clear is counted: `if (!player.rift && (player.rifts === 0 && !player.riftSeen || Math.random() < 0.35))` open it and pop the
   System window; keep a saved `player.riftSeen` flag so the guaranteed first rift happens once. Show the pop after the clear's own
   messages (titles already wait their turn through `titleTick`; read how, and make the rift pop not cover the extraction screen:
   it is fine to show it when the hunter returns to the hub instead).
3. The enemy: a new AI kind `flee` in the enemy AI table in `js/05-enemies.js` (next to `melee`, `ranged`, `charger`...). Make sure
   no generic code applies contact damage or a melee swipe for it, and that elites never roll for it. Hits spill orbs where damage
   is dealt in `js/06-combat.js`; the death spill and gear in `killEnemy` (branch on `e.kind === 'flee'`).
4. The run, `js/08-dungeon.js`: `function startRift()` sets up through `startDungeon` (add a branch for `gateDef.rift`: open arena,
   `layout = null`, arena 1800 by 1300, `dungeon.rift = { t: RIFT.time, caught: 0, total: RIFT.goblins, done: false }`,
   `dungeon.maxWaves = Infinity`, no `spawnWave`), then spawns the goblins with `makeEnemy`. `function riftStep(dt)` counts time,
   updates the HUD line, ends the run (item 6). `function showRiftEnd()` fills the victory overlay. In `js/13-loop.js` where
   `checkWave()` / `roomStep()` are called, call `riftStep(dt)` instead when `dungeon.rift` is set. Count catches where kills are
   counted (only goblins killed in the run). Pause, quit and `returnToHub` must work as for any gate.
5. The action, `js/10-actions.js`: `function enterRift()` next to `enterEndless`, same guards (`storyRun`, the full-bag question:
   extend `gateAsk` with `{ rift:true }` and make the ENTER ANYWAY path start the rift), then `player.rift = false; player.rifts++;
   saveGame(); startRift();`. Wire `data-act="rift"` where `case 'endless'` is handled. The card in `tabGates()` (`js/09-ui.js`).
6. Look: in 2D (`js/11-render-world.js`) and 3D (`3d/render3d.js`, which maps an unknown kind to the melee figure through
   `keyFor`) a goblin is a small figure in gold `#ffcc33` with a faint gold glow, clearly not a boss and with no ring. Read how each
   renderer colours an enemy; the smallest change that makes it gold and glowing in both is the one to make. No new image files.
7. Test: new `tools/test_rift.js`, modelled on `tools/test_record.js` / `tools/test_titles.js` with the headless game (stub
   `saveGame`): the first clear opens a rift; a second open is not stacked; entering closes it and counts `rifts`; the run spawns 8
   goblins with damage 0 and kind `flee`; a goblin within 420 moves away from the hunter after a step; killing all 8 ends the run
   with grade S and no change to `player.cleared` or `highScores.gatesCleared`; a run left to time out ends at 60 seconds with the
   rest uncaught; an old save without the fields loads with `false`, `0`. Print `PASS <cases>`.

## Constraints
- Touch only `js/01-data.js`, `js/03-state.js`, `js/04-player-fx.js`, `js/05-enemies.js`, `js/06-combat.js`, `js/08-dungeon.js`,
  `js/09-ui.js`, `js/10-actions.js`, `js/11-render-world.js`, `js/12b-overlay.js`, `js/13-loop.js`, `3d/render3d.js` and the new
  test. Do not edit `index.html` or `3d/index.html`; do NOT run `tools/stamp.sh`. No change to any normal gate, enemy or boss.
- Art rule (pictures and words): no star symbols, runes, occult or religious imagery or wording. The gold glow is a soft round glow
  or plain sparks, never a star shape.
- Match the surrounding style: compact statements, short names, one short comment per item saying what the player sees.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`; `node --check` on every file you touched prints nothing.
- `node tools/test_rift.js` prints `PASS <n>`; `node tools/test_record.js` (PASS 123), `node tools/test_equip_best.js` (PASS 22),
  `node tools/test_shadow_names.js` (PASS 16), `node tools/test_titles.js` (PASS 71), `node tools/test_boxes.js` (PASS 3595),
  `node tools/test_army.js` (PASS 570), `node tools/test_gear.js` (PASS 626220), `node tools/test_layout.js` (PASS 8000) still pass.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error.

## Done when
All seven build items are in and every check passes. Commit nothing yourself.
