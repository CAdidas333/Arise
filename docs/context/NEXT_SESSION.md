# Next Session Handoff
_Written: 2026-10-11 (Sunday evening) at the wrap of Session 6, by Chris Whitney's Claude session_

## Update at 14:30 on 2026-10-12 (read this first; it replaces the "held" notes below)
- **The boss signature attacks are public.** Chris said "ship the boss attacks". `main` and `v18-world` are level; public stamp 20261011231255, checked on both pages. Before the ship: `tools/check_names.sh`, `node tools/test_layout.js` (PASS 8000) and `node tools/test_gear.js` passed; in the browser each boss cast its attack three times in both views with no errors, and a dodge, an attack, the Awakening and a hit all worked.
- Seen in the test window (706 by 848, taller than wide, desktop layout): the boss name and health bar are drawn across the hunter. Not changed; it was like this before the ship.
- Next step-8 job: bosses rarely use any pattern against a hunter in melee range.

## Update at 21:25 on 2026-10-11
- **Boss signature attacks are built, merged on `v18-world` and tested, but NOT public.** One new attack per boss (brood, pound, cleave, firewall, breath, pillars; in `js/05-enemies.js`, named last in each boss's `patterns` list). Checked by the orchestrator in both views: each ran three times with no errors, and standing still through three casts cost between 6 and 42 percent of health (all are avoidable). Picture: `docs/previews/step8_death_knight_lanes_v1.jpg`.
- **Why it is held:** Chris asked at about 21:00 whether he could share the game and was told the link would stay as it is while someone looks at it. `main` (public) is at the result-card build plus the phone pop-up fix, stamp 20261011221249; `v18-world` is ahead of it by the boss attacks and docs. **Ship only when Chris says** (`git branch -f main v18-world && git push origin main`, then check the stamp).
- Known limit of the boss work: against a hunter who stays in melee range the bosses rarely pick any pattern (an old behaviour: the swipe resets the pattern timer), so the new attacks show up mostly at range. Worth fixing as the next step-8 job.
- Worth Chris's eye, against his art rule: at small size the Death Knight's upright greatsword with its guard can read as a cross (the 2D boss look from Session 5; visible in the lanes picture). Not changed.
- **22:15, after Chris played on his phone (3D view, endless mode, phone held upright):** pop-ups sat on the hunter in the middle of the screen. Fixed and live on its own (commit 6bd8a78 on `main`, public stamp 20261011221249, merged into `v18-world` as 28e040c): on upright phones pop-ups now sit under the stat bars at 150 pixels, one line each, two at a time (`#toast-container` in `index.html`, the cap in `toast()` in `js/03-state.js`). Not yet confirmed by Chris on his phone. Left alone: the boss name and health bar (228 pixels down on upright phones) and the combo counter. His recording is `~/Downloads/ScreenRecording_10-11-2026 22-17-42_1.MP4`. `main` now differs from `v18-world` only by the held boss attacks and docs.
- Chris was advised to play one gate himself before sharing: nothing from today has been played by a human hand or tried on a real phone, and the music was picked without hearing it.

## Where we left off
Session 6 turned the gates into real dungeons and put most of the rest of V18 on the public game. Everything in the "Tell Chris" list below is live at https://cadidas333.github.io/Arise/ and in the 3D view at `/3d/`. `main` and `v18-world` were level before the wrap docs; the orchestrator moves `main` after them. There are 15 scripts in `js/` now (`js/03a-layout.js` and `js/12a-card.js` are new). The one open job is V18 step 8, first pass: a sub-agent was adding one signature attack per boss (only `js/05-enemies.js` and the `patterns` lists). When this was written no "boss" merge had landed on `v18-world`, so treat it as **not done, waiting for review**. Check `git log --oneline` and `git branch -a` (a `worktree-agent-*` branch or a `.claude/worktrees/` folder may hold it) before you start it again.

## Tell Chris when he is up (plain words)
- **Gates are real dungeons now.** A gate is a chain of rooms joined by corridors. Walking into a room shuts the doors; beating its wave opens them. After the last room an exit leads to the boss, who is fought in the open arena as before. The minimap follows the hunter and an arrow points to the next door. Endless mode is still the open arena.
- **Stone walls and torches.** Dark stone walls with a lit face on the north side, door posts, pillars, wall torches, floor inlays, rubble, cracks and runners down the corridors.
- **Gems and gear.** Elites drop gems 22 percent of the time, bosses always (Rare or better), everything else 1.5 percent. Armor, boots and a ring, a 12-item bag, four rarities. Equip, unequip and sell in the ARMORY tab.
- **Recorded music.** Three tracks (hub, fight, boss) made with ElevenLabs, about $1.35 in all, which he approved in chat. **They were picked without hearing them**: hub take 2, fight take 1, boss take 1, chosen from a program's labels. He has all six files. To swap, he names the track and the take (for example "boss, take 2").
- **Real 3D figures.** The hunter, the six enemy kinds, the six bosses and the shadow soldiers are figures now, not plain blocks. Gems show in rarity colours. On a phone, two fingers turn the camera and pinching zooms.
- **A story.** A new hunter gets a five-card opening from the System, each gate shows a chapter card the first time it is entered, and the first clear of each gate ends with a closing line.
- **A result card.** SAVE RESULT CARD on the victory screen (and the death screen in endless mode) makes a 1200 by 630 picture of the run and opens the share sheet, or downloads it.
- **Nothing has been tested by a human hand or on a real phone.** Everything was checked by test scripts, bot runs, fake touch events and captured pictures.
- **Pictures worth his eye** (all in `docs/previews/`): `step5_stone_walls_room_v1.jpg`, `step6_gear_gems_and_dressed_room_v1.jpg`, `3d_figures_room_v1.jpg`, `3d_figures_dragon_statue_v1.jpg` (the Statue of God and the dragon, against his art rule), `step7_chapter_card_v1.jpg`, `step9_result_card_v1.jpg`.

## Ranked next actions (author's ranking at wrap time)
1. **Boss signature attacks.** Review and ship them if they are not live, then the rest of V18 step 8 (hand-designed fights: phases and arena tricks per boss).
2. **Chris's ears on the music.** Swap takes if he says. The unpicked takes are in `assets/music/takes/` (ignored by git); the live ones are `assets/music/hub.mp3`, `fight.mp3`, `boss.mp3`. Provenance in `assets/CREDITS.md`.
3. **A real-phone test and a human play-through** (threads E1, E2, E3, E4): the two-finger camera, music memory on a phone, the armory layout, the result card's share sheet, and pacing and balance now that gear adds power.
4. **3D lane leftovers:** a minimap (U5), afterimages, light pillars, the hub backdrop, thicker walls and room dressing in 3D, the plain floor for the first seconds (G5).
5. **A repeatable balance bot in `tools/`** (G1).
6. **Parked:** shared leaderboard and co-op (F1); the printable status report (C1, skipped again).

## Watch-outs / state of mind
- **Free rein still holds (decision card D-0085):** decide and ship, then tell Chris in plain words. Still his: money (the music cost was held and asked about, not spent), and the art rule. The art rule (no star symbols, runes, occult or religious imagery) now also covers item names and story text.
- **Who builds:** after the weekly Claude usage reset at 22:00 on 2026-10-11 the route is back to free workers. From `~/Projects`: `worker run Arise <slug> <absolute path to brief> --engine auto --timeout 15m` in the background, then `worker merge Arise <slug>` and `worker clean Arise <slug>`. `worker redo` takes no `--timeout` and fails quietly. Today's sub-agent route was a one-off to spend the week's usage.
- **Before every ship, run all of these:** `tools/check_names.sh` (any name listed twice breaks the shared global scope and stops a whole script loading), `node tools/test_layout.js` (expects `PASS 8000`), `node tools/test_gear.js`, then a browser run. Tell any agent building in parallel which top-level names the others own.
- **Any test of the hunter must include a dodge, an attack, the Awakening and a hit.** A diff that matches the brief proves the worker followed it, not that the brief was right.
- **Run `tools/stamp.sh` before committing any change in `js/`, `3d/render3d.js` or `index.html`.** It also rebuilds `3d/index.html`; never edit that by hand. When a merge conflicts on the script-tag block in `index.html`, keep the block with the new tag, then run `tools/stamp.sh`.
- **Local preview:** `http://127.0.0.1:8767/` (preview name `arise`, from `.claude/launch.json`, running `tools/serve.py`). Use `127.0.0.1`, not `localhost`: another project's server on port 8765 answered for `localhost` and a test loaded the wrong site (the page title gave it away).
- **Do not trust a browser test until the new code is proven loaded.** Add a fresh query string, check the stamp, and check that a function you just added exists. The browser pane served a cached page after a re-stamp and a test "passed" on old code. Split browser tests into short calls: one long script times out at 45 seconds on a loaded Mac.
- **Capturing frames:** screenshots of the hidden browser pane are stale. A headless Chrome screenshot (`--headless=new --screenshot`) of a temporary copy of the page is reliable; disable CSS animations when using virtual time. For visual briefs, tell the agent to render and LOOK at its own work this way (a temporary page with a small setup script): work built that way needed no second pass.
- **Sub-agents:** give read-only "reader" agents a hard tool-call budget and say a partial report beats none. Do not run `git add -A` while `.claude/worktrees/` exists unless it is ignored (it is now). Agents must commit before returning.
- **Shipping:** `git branch -f main v18-world && git push origin main`, wait for the deploy (`gh run list -L 1`), check the stamp with `curl`. Ship only after looking at a captured frame.
- **Boss sheet and pose sheet recipes (carried over from Session 5):** call `drawBoss(name, r, t, fx, fy, pal)` directly on the game canvas for all six names in normal, enraged and shadow colours (that is what `docs/previews/boss_looks_v1.jpg` shows); call `drawHunter(x, y, {...})` at a large `scale` for standing, running, attacking, dashing and the colour states (`hunter_pass3_before_after_v1.jpg`).

## What DID NOT get done
- V18 step 8: the boss signature attacks are unmerged; hand-designed fights are not started.
- A human play-through and a real-phone test; Chris has not heard the music.
- 3D leftovers: minimap, afterimages, light pillars, hub backdrop, thicker walls and room dressing.
- A repeatable balance bot, the printable status report.
