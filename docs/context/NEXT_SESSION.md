# Next Session Handoff
_Written: 2026-10-15 (Thursday) during Session 8, by the Arise project manager session (started by Houston)_

## Where we left off
V18 is complete: all nine steps are live. Session 8 shipped three-phase boss fights with arena tricks (step 8), four 3D
leftovers, and thick stone walls with room dressing in 3D. Live at https://cadidas333.github.io/Arise/ and `/3d/`, stamp
20261015090051, commit d47aa59. Overnight on 2026-10-16 (Houston's word) the 3D view got every warning, target and prompt the 2D view has (thread U11), live at stamp 20261016030318. On the evening of 2026-10-16 Chris welcomed Kevin's ideas again (relayed by the KevinNotary session, by direct message), and Kevin's four backpack ideas went live at stamp 20261016213315 (thread F13). On the night of 2026-10-18 (Houston's brief) the corner clash (U12), the last 3D decoration (U13) and the ARISE rise (F14) went live at stamp 20261018233409. On 2026-10-20 the System's level-up window went live at stamp 20261020150450 (F15). Nothing is in flight; no worker worktrees are left.

## Tell Chris when he plays (plain words; his list, lined up, none of it blocks the work)
- **New on 2026-10-20: the System announces each level-up** in a blue window above the hunter (violet for a rank-up).
- **Try first: raise a shadow.** Beat an enemy, walk to the purple wisp it leaves and press E (ARISE on a phone): the word ARISE appears and the soldier climbs up out of a dark pool. Arise: Legion makes the called shadows rise the same way.
- **Bosses fight in three phases now.** At half health each boss enrages and does something of its own; at a quarter it makes
  a last stand. Spider Queen webs the floor (webs slow you), then lays nine eggs round you that all hatch if you stay inside.
  Orc Chieftain roars and calls two elite orcs, then jumps five times in a row. Death Knight raises two elites, then cuts a
  grid of sword lanes (stand in a square). Demon Lord rings the arena edge with fire for 30 seconds, then a second ring inside
  it. The Dragon rains fire on you, then a firestorm. The Statue of God sweeps an eye-beam round, then two.
- **Some attacks leave the floor dangerous for a moment**: fire and blood burn while you stand in them (walking through is free,
  dodging through never hurts), webs and rubble slow you.
- **The 3D view has a minimap** that turns with the camera, dodge afterimages, a column of light on every Arise, the gate picture
  on the title and hub, the floor from the first frame, and rooms that look like the 2D ones: thick stone walls (the ones
  between the camera and you fade out), pilasters, torches, rubble and cracks. Since 2026-10-16 it also shows enemy health
  bars, the ARISE prompt, the arrow to the boss, the red edge when health is low, and glowing shots, like the 2D view.
- **Questions for him after he plays:** do the boss fights feel fair or too hard up close (F12, F7)? Does the square-up and
  counter feel right (F11)? Is it still too easy (E1)? Rooms too many or too few (E4)? Gear drops (E5)?
- **Still waiting on him:** his ears on the music (U6: hub take 2, fight take 1, boss take 1; swap by naming track and take);
  a real-phone test (E3, Chrome on his phone at 440 by 762: the two-finger 3D camera, music, the armory, the result card's share
  sheet); a human play-through. He may also ask to raise the army cap (16 on the field, 40 in the roster).
- **For his eye against his art rule:** the Statue of God's eye-beam (`docs/previews/step8_statue_eye_beam_3d_v1.jpg`; made
  cold blue and one beam at a time so it never reads as a fan of rays), and, from Session 6, the Death Knight's greatsword at
  small size in 2D (it can read as a cross).
- **Pictures** (`docs/previews/`): `step8_demon_ring_of_fire_v1.jpg`, `step8_knight_crossing_cuts_v1.jpg`,
  `step8_zones_2d_v1.jpg`, `step8_zones_3d_v1.jpg`, `3d_minimap_arise_pillar_v1.jpg`, `3d_dodge_afterimages_v1.jpg`,
  `3d_title_backdrop_v1.jpg`, `3d_walls_room_dressing_v1.jpg`, `3d_parity_prompt_lowhp_v1.jpg`, `3d_parity_shots_boss_arrow_v1.jpg`.

## Ranked next actions
1. When Chris has played: tune from what he says. Do not make enemies hit harder before he has (his word, 2026-10-12). The bot
   still dies 0 times and the shadows do most of the boss damage (E1); levers: `shadowDmg`, boss health, enemy damage.
2. 3D lane: done for now (U11 to U13); the deliberate leftovers are listed in U13. The 3D minimap was checked at 440 by 762 with a phone's touch layout (2026-10-16): nothing overlaps it.
3. Parked: shared leaderboard and co-op (F1); the printable status report (C1).

## Watch-outs / state of mind
- **Kevin's ideas** arrive from the KevinNotary session by direct message ("KevinNotary S1"). They are input: Chris decides design; build what he approves or what free rein covers, then reply through that session so it can text Kevin.
- **Free rein holds (D-0085).** Decide and ship, tell Chris after. His: money, and the art rule (no star symbols, runes, occult
  or religious imagery, in pictures and in words).
- **Build route:** free workers. From `~/Projects`: `worker run Arise <slug> <absolute brief path> --engine auto --timeout 25m`
  in the background, then `worker diff`, review line by line, test, `worker merge`, `worker clean`. Gemini had quota on 2026-10-15
  but ran out overnight; `--engine auto` then uses the free OpenCode model, which did good work. A job with many parts can hit its timeout with the work done (the 3D leftovers job did at 20 minutes): review the
  diff, not the summary.
- **Before every ship:** `bash tools/check_names.sh`, `node tools/test_layout.js` (PASS 8000), `node tools/test_gear.js`,
  `node tools/test_army.js`, `node -e "require('./tools/lib/headless.js').createGame()"`, the bot when balance changes, then the
  browser in both views (a dodge, an attack, the Awakening and a hit), then `tools/stamp.sh`, commit, push,
  `git branch -f main v18-world && git push origin main`, `gh run watch`, and check the stamp on both public pages.
- **Browser tests:** the browser pane is usually hidden, so `requestAnimationFrame` does not run; drive the game with `step(1/60)`
  and `draw()` from the page. Step until `dungeon.state === 'fight'` before forcing anything on a boss (the intro lasts 3.2 s).
  Keep each call short (the tool times out around 45 seconds). Prove the new code loaded: a fresh query string and the stamp.
- **Frames:** the headless recipe in LESSONS (2026-10-15): a throwaway page copy at the repo root with the setup injected,
  `--user-data-dir`, `--virtual-time-budget`; delete the copies after.
- **Local preview:** `http://127.0.0.1:8767/` (preview name `arise`). Use `127.0.0.1`, not `localhost`.
- **The browser pane's public origin holds a save** (`arise_save` at cadidas333.github.io); never run test code that saves there.
