# Next Session Handoff
_Written: 2026-10-20 (Tuesday) by the Arise project manager session (Session 8, continued; started by Houston)_

## Where we left off
V18 is complete and the 3D view has caught up with the 2D one. Live at https://cadidas333.github.io/Arise/ and `/3d/`,
stamp 20261020150450, commit 7eee5b6 (docs eca9e42 and this file after it; `main` = `v18-world`). Nothing is in flight and no
worker worktrees are left. Everything since 10-15 is in SESSION_LOG ("Session 8, continued" entries) and OPEN_THREADS:
- 10-15: three-phase boss fights with floor hazards (F7), 3D minimap, afterimages, Arise pillars, hub backdrop, thick walls and dressing.
- 10-16: the 3D view shows every warning, target and prompt 2D shows (U11); Kevin's ideas welcome again; his four backpack ideas (F13).
- 10-18: the edge arrow kept off the minimap (U12), the last 3D decoration (U13), the ARISE rise (F14).
- 10-20: the System's level-up window, violet for a rank-up (F15).
Nobody has played any of this by hand, tried it on a real phone, or heard the music.

## Ranked next actions
1. **When Chris has played, tune from what he says** (F12 boss fights, F11 square-up and counter, E1 too easy, E2 first boss,
   E4 rooms per gate, E5 gear drops). Do not make enemies hit harder before he has (his word, 2026-10-12). The bot still dies
   0 times and the shadows do most of the boss damage; levers when he asks: `shadowDmg`, boss health, enemy damage.
2. **Unblocked now (free rein): G8, make `tools/stamp.sh` refuse to stamp a broken build.** Have it run `tools/check_names.sh`
   and `node -e "require('./tools/lib/headless.js').createGame()"` first and stop on either failure. The headless load is what
   caught the 10-18 fault (a name declared twice inside `drawMinimap`) that `check_names.sh` cannot see. Small worker job.
3. **Kevin's ideas** as they arrive from the KevinNotary session: weigh them, build what Chris approves or free rein covers,
   reply through that session.
4. Low, when there is nothing better: the U13 leftovers kept out on purpose (a plain dark vignette, darkened corridors,
   the classic hunter look in 3D); G4 (preview frames served on the public site, harmless); G6 (read ElevenLabs' music terms).
5. Parked: shared leaderboard and co-op (F1, Chris's word to start); the printable status report (C1).

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
  `node tools/test_army.js`, the bot when balance or levelling changes. Start the next job only when these are green.
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
