# Next Session Handoff
_Written: 2026-10-31 01:50 (Saturday) by Session 9 (wrapped for renewal at 67 percent context), for Chris Whitney. Supersedes earlier versions._

## Where we left off
Live at https://cadidas333.github.io/Arise/ and `/3d/`, stamp 20261031014753 (commit f10d695; `main` = `v18-world`). Nothing in
flight, no worker or sub-agent worktrees left, preview server stopped. Session 9 shipped, all live: the classic hunter in 3D, dark
edge and darker rooms ahead (U15); the Death Knight's sword at its side (U14); phone and iPad fixes, iPads now get touch controls
(U16); the music loops without a hole (U17); System reward boxes (F16); System Titles (F17); gate weather (F18); shadow names (F19);
the Hunter's Record tab (F20); gate dressing (F21); EQUIP BEST (F22); 3D dressing no longer culled away from the origin (G9).
Chris set his play-test aside for later; do not push him for it. Houston ran the night (10-31) under "push hard"; the routing that
worked when the free tiers were dead: Claude Sonnet sub-agents with `isolation: worktree`, briefs in `docs/briefs/`.

### Try this first (for Chris, plain words)
1. **On an iPad:** it works now (before 10-27 an iPad held sideways got no joystick or buttons).
2. **Clear a chamber and look for a glowing blue box** in the middle of it; walk into it for gold, sometimes an item.
3. **Clear a gate:** the System grants a title; pick one in STATUS and it replaces HUNTER under your name.
4. **Each gate has its own weather and props now:** drips and glowing mushrooms in the Goblin Cavern, cobwebs and fog in the Crypt, embers and glowing vents in the Demon Realm, gold heaps and cinders in the Dragon's Lair.
5. **Name your shadows** in the SHADOWS tab (NAME), and open the new **RECORD** tab (key 7) to see every enemy you have slain.
6. **ARMORY: EQUIP BEST** puts on every upgrade in your bag at once.
7. **In 3D, Controls tab, Hunter look:** the classic stick-figure hunter works in 3D too.

## Ranked next actions
1. **When Chris has played, tune from what he says** (F12 boss fights, F11 square-up and counter, E1 too easy, E2 first boss,
   E4 rooms per gate, E5 gear drops). Do not make enemies hit harder before he has (his word, 2026-10-12). Levers when he asks:
   `shadowDmg`, boss health, enemy damage.
2. **Kevin's ideas** as they arrive from the KevinNotary session (it messages the newest "Arise S<n>" session): weigh them, build
   what Chris approves or free rein covers, reply through that session.
3. **More variety without difficulty, our call under free rein** (Houston: push hard while weekly usage allows): ideas not yet built:
   a bestiary picture for each Record entry (2D only, the 3D page has no 2D figure drawing), a treasure gate (no boss, fleeing
   gold goblins, timed), more room shapes, shadow abilities that add style not power. One or two jobs at a time; brief, worker
   (`--engine auto`), else a Sonnet sub-agent in a worktree; review, test both views, stamp, ship.
4. Parked: shared leaderboard and co-op (F1, Chris's word to start).

### Checks after every merge (all must pass before `tools/stamp.sh`)
`bash tools/check_names.sh`, `node -e "require('./tools/lib/headless.js').createGame()"`, `node tools/test_layout.js` (PASS 8000),
`test_gear` (PASS 626220), `test_army` (PASS 570), `test_boxes` (PASS 3595), `test_titles` (PASS 71), `test_shadow_names` (PASS 16),
`test_record` (PASS 123), `test_equip_best` (PASS 22); the bot when balance or levelling changes. Frames: the headless Chrome recipe
(LESSONS 2026-10-15; the browser pane hangs under heavy load, so prefer headless; give each run its own `--user-data-dir` and a
`perl -e 'alarm 100; exec @ARGV'` guard).

## Tell Chris when he plays (plain words; his list, none of it blocks the work)
- **Try first: raise a shadow.** Beat an enemy, walk to the purple wisp it leaves and press E (ARISE on a phone): the word
  ARISE appears and the soldier climbs up out of a dark pool. Arise: Legion makes the called shadows rise the same way.
- **The System announces each level-up** in a blue window above the hunter, violet for a rank-up.
- **Bosses fight in three phases.** At half health each boss enrages and does something of its own; at a quarter it makes a
  last stand (Spider Queen webs, then a clutch of eggs; Orc Chieftain calls elites, then jumps five times; Death Knight raises
  elites, then a grid of sword lanes; Demon Lord rings the arena with fire; the Dragon rains fire; the Statue sweeps an eye-beam).
- **Some attacks leave the floor dangerous for a moment:** fire and blood burn while you stand in them (walking or dodging
  through is free), webs and rubble slow you.
- **The backpack** (Kevin's ideas): it holds 24, SELL ALL WEAKER THAN EQUIPPED, an UPGRADE tag with a count on the ARMORY tab,
  and a full bag asks before a gate.
- **The 3D view** now matches 2D in a fight (health bars, the ARISE prompt, the arrow to the boss, the red edge at low health,
  glowing shots) and has its own touches: a minimap that turns with the camera, thick walls that fade when they block the view,
  torches, ground shadows.
- **Questions after he plays:** do boss fights feel fair or too hard up close? Does the square-up and counter feel right? Is it
  still too easy? Too many rooms? Gear drops right?
- **Still waiting on him:** his ears on the music (U6: hub take 2, fight take 1, boss take 1; swap by naming track and take); a
  real-phone test (E3: Chrome on his phone, the two-finger 3D camera, music, the armory, the result card's share sheet). He may
  ask to raise the army cap (16 on the field, 40 in the roster).
- **For his eye against his art rule:** the Statue of God's eye-beam (`docs/previews/step8_statue_eye_beam_3d_v1.jpg`), and the
  Death Knight's greatsword at small size in 2D (it can read as a cross).
- **Pictures** (`docs/previews/`, newest first): `system_rankup_3d_v1.jpg`, `system_levelup_3d_phone_v1.jpg`,
  `arise_rise_2d_v1.jpg`, `arise_rise_3d_v1.jpg`, `3d_warning_rims_motes_v1.jpg`, `backpack_upgrade_tags_v1.jpg`,
  `backpack_full_ask_v1.jpg`, `3d_parity_prompt_lowhp_v1.jpg`, `3d_walls_room_dressing_v1.jpg`, `step8_demon_ring_of_fire_v1.jpg`.

## Watch-outs / state of mind
- **Free rein holds (D-0085).** Decide and ship, tell Chris after. His: money, and the art rule (no star symbols, runes, occult
  or religious imagery, in pictures and in words). Houston relays overnight work; report to it when asked.
- **Kevin's ideas** arrive from the KevinNotary session by direct message. They are input: Chris decides design.
- **Build route:** free workers. From `~/Projects`: `worker run Arise <slug> <absolute brief path> --engine auto --timeout 25m`
  in the background, then `worker diff`, review line by line, `worker merge`, `worker clean`. One Arise run at a time (the Mac's
  light lane: `~/Projects/_brain/scripts/mac-slots.sh --list`). Gemini was out of quota for the 10-16 overnight, 10-18 and 10-20
  jobs (the 10-16 evening backpack job ran on it); the free OpenCode model did the rest, well. A job can hit its timeout with the work done, or with a check never run: review the diff,
  and run the checks yourself.
- **After every merge, before `tools/stamp.sh`:** `bash tools/check_names.sh`, `node -e "require('./tools/lib/headless.js').createGame()"`
  (catches names declared twice inside a function), `node tools/test_layout.js` (PASS 8000), `node tools/test_gear.js`,
  `node tools/test_army.js`, `node tools/test_boxes.js` (PASS 3595), the bot when balance or levelling changes. Start the next job only when these are green.
- **Before every ship:** the browser in both views (a dodge, an attack, the Awakening and a hit), frames at desktop and phone
  size checked against the art rule, then `tools/stamp.sh`, commit, push, `git branch -f main v18-world && git push origin main`,
  `gh run watch`, and the stamp on both public pages.
- **Browser tests:** the pane is usually hidden, so `requestAnimationFrame` does not run; drive the game with `step(1/60)` and
  `draw()`. Step until `dungeon.state === 'fight'` before forcing anything on a boss (the intro lasts 3.2 s). Keep each call
  short (about 45 seconds). Prove new code loaded: a fresh query string and the stamp. For a true phone layout use the pane's
  resize to 440 by 762 (it emulates touch and a phone user agent) and measure positions in code.
- **Frames:** the headless recipe in LESSONS (2026-10-15): a throwaway page copy at the repo root with the setup injected,
  `--user-data-dir`, `--virtual-time-budget`; hide the title screen in the setup; delete the copies after. Headless Chrome will
  not go narrower than about 500 pixels.
- **Local preview:** `http://127.0.0.1:8767/` (preview name `arise`; the app may stop it between sessions, so start it again).
  Use `127.0.0.1`, not `localhost`.
- **The pane's public origin holds a save** (`arise_save` at cadidas333.github.io); never run test code that saves there
  (stub `saveGame` in tests).
- An untracked `AGENTS.md` (a copy of the project rules for other agent tools, dated 10-17) sits in the repo root; it is not
  ours to commit or delete.

## What DID NOT get done
- No human play-through, no real-phone test, no listening to the music: all still Chris's (F12, E1 to E5, E3, U6).
- Difficulty untouched on purpose (still too easy by the bot) until Chris has played.
- The U13 3D extras left out on purpose (plain vignette, darkened corridors, the classic hunter look in 3D).
