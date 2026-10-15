# Next Session Handoff
_Written: 2026-10-15 (Thursday) during Session 8, by the Arise project manager session (started by Houston)_

## Where we left off
V18 is complete: all nine steps are live. Session 8 shipped three-phase boss fights with arena tricks (step 8) and four 3D
leftovers, live at https://cadidas333.github.io/Arise/ and `/3d/`, stamp 20261015084150, commit 705b434 (`main` = `v18-world`
at the ship). One job was in flight at the wrap: **thick stone walls and room dressing in 3D (U3)**, worker slug `walls3d`,
brief `docs/briefs/v18-3d-lane5-walls-dressing.md`. If the wrap note below does not say it shipped, review it first:
`worker diff Arise walls3d` from `~/Projects`, test both views, then `worker merge` and `worker clean`, stamp, ship.

## Tell Chris when he plays (plain words; his list, lined up, none of it blocks the work)
- **Bosses fight in three phases now.** At half health each boss enrages and does something of its own; at a quarter it makes
  a last stand. Spider Queen webs the floor (webs slow you), then lays nine eggs round you that all hatch if you stay inside.
  Orc Chieftain roars and calls two elite orcs, then jumps five times in a row. Death Knight raises two elites, then cuts a
  grid of sword lanes (stand in a square). Demon Lord rings the arena edge with fire for 30 seconds, then a second ring inside
  it. The Dragon rains fire on you, then a firestorm. The Statue of God sweeps an eye-beam round, then two.
- **Some attacks leave the floor dangerous for a moment**: fire and blood burn while you stand in them (walking through is free,
  dodging through never hurts), webs and rubble slow you.
- **The 3D view has a minimap** that turns with the camera, dodge afterimages, a column of light on every Arise, the gate picture
  on the title and hub, and the floor shows from the first frame.
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
  `3d_title_backdrop_v1.jpg`.

## Ranked next actions
1. Ship U3 (3D walls and dressing) if it is not live (see above).
2. When Chris has played: tune from what he says. Do not make enemies hit harder before he has (his word, 2026-10-12). The bot
   still dies 0 times and the shadows do most of the boss damage (E1); levers: `shadowDmg`, boss health, enemy damage.
3. 3D lane: anything else the 2D view draws that 3D does not. The 3D minimap was checked at 440 by 762 in a desktop browser
   (top right, where the 2D one is); not yet with a phone's touch layout.
4. Parked: shared leaderboard and co-op (F1); the printable status report (C1).

## Watch-outs / state of mind
- **Free rein holds (D-0085).** Decide and ship, tell Chris after. His: money, and the art rule (no star symbols, runes, occult
  or religious imagery, in pictures and in words).
- **Build route:** free workers. From `~/Projects`: `worker run Arise <slug> <absolute brief path> --engine auto --timeout 25m`
  in the background, then `worker diff`, review line by line, test, `worker merge`, `worker clean`. Gemini had quota all of
  Session 8. A job with many parts can hit its timeout with the work done (the 3D leftovers job did at 20 minutes): review the
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
