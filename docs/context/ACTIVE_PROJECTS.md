# Arise — Active Projects

## Current Phase: Phase 3 — V17 live; V18 under way (steps 1 to 6 live; recorded music live; a 3D lane with a free camera and fight effects runs beside the 2D game)
**Priority**: MEDIUM (fun/showcase project)
**Live URL**: https://cadidas333.github.io/Arise/
**Repo**: CAdidas333/Arise (public)
**Status**: Working. Session 5 (2026-10-10, overnight) shipped the plain-ring floor mark, the old-hunter switch, hunter pass 3 and the 3D free camera. No worker job is running.

### Completed (Session 0-1)
- [x] Core game engine (canvas, game loop, input handling)
- [x] Player movement + facing (WASD + mouse, mobile joystick)
- [x] System UI hub (stats, gates, shadows, quests, skills)
- [x] Combat system (melee, dash, teleport, AOE abilities)
- [x] Enemy AI (melee + ranged, boss patterns)
- [x] Dungeon wave system with boss hunt mechanic
- [x] Leveling + stat allocation (auto-assign button)
- [x] Shadow extraction mechanic
- [x] Shadow army AI (engage only when player is fighting)
- [x] "Arise: Legion" berserk skill
- [x] Particle effects + visual polish
- [x] Daily quest tracking
- [x] Save/load game state (localStorage)
- [x] High scores + combos
- [x] Minimap
- [x] Procedural audio — Web Audio API music + 10+ SFX
- [x] Mobile touch controls (virtual joystick + buttons)
- [x] PWA manifest (home screen install)
- [x] GitHub Pages auto-deploy
- [x] Pause menu with volume slider + fullscreen toggle
- [x] Dev mode (backtick +5 levels, shift+backtick -5 levels)

### Completed (Session 3 — V17 Monarch Update, deployed 2026-10-09)
- [x] Skill tree — 3 branches, 12 nodes, dedicated tab
- [x] More enemy variety and attack patterns (6 archetypes, elites, pattern bosses)
- [x] S-Rank gate content (Cartenon Temple)
- [x] Sound design pass (adaptive music, reverb, ~25 SFX)
- [x] Portrait-mode HUD pass
- [x] Frame-rate independence, combo attacks, dodge, ultimate, run boons, armory, endless mode
- [x] Remnant extraction + army cap and grades

### Completed (after V17 went live, 2026-10-09, shipped straight to main)
- [x] Star-free arena circle and plain diamond floor marks; standing rule: no star symbols, runes or occult imagery in any art
- [x] Aim modes (Auto, Keys, Mouse; M cycles; X or J attacks)
- [x] Extraction sound rebuilt
- [x] Controls tab (sixth System menu tab) and key list in the pause menu
- [x] Skill points slowed to one every 2 levels (saves refunded on load)

### V18 plan (approved by Chris 2026-10-09; built on branch `v18-world`, one step at a time; new steps ship when he says)
- [x] Step 1 — Painted world: a painted floor per gate and a backdrop for the title and hub. **Live** (shipped to main 2026-10-09)
- [x] Step 2 — The System speaks: 35 voice lines in the River voice and 8 sound effects, all chosen by Chris by ear, play in the game; the extraction line is "Shadow extraction.", a 2-second wait with a charge effect, then "Successful." or "Failed.". **Live** (shipped to main 2026-10-09 on Chris's word, commit 18b896a; he will say if anything needs changing). Recipe in `assets/CREDITS.md`. ElevenLabs music is still blocked: Chris has now heard the voice and effects but has not said yes to music
- [x] Step 3 — Shadows look like the enemy they were and fight the way it fought; boss shadows fire a ring of shots on a timer. **Live** (shipped to main 2026-10-09, commit f465a46)
- [x] Step 4 — A hunter with a real body and a look for each boss. **Live.** Hunter: pass 3 (2026-10-10), closer to the picture Chris picked, drawn at 1.35 size; the old stick figure is one switch away (System menu, Controls tab, "Hunter look"; `settings.hunter`, `drawHunterClassic`). Bosses (2026-10-10): each of the six has its own body drawn by `drawBoss` in `js/11-render-world.js` (spider, hulking orc, cloaked knight with a greatsword, burning armoured king, dragon with spread wings, cracked stone colossus); boss shadow soldiers use the same bodies in shadow colours
- [x] Step 5 — Real dungeons. **Live** in both views (2026-10-11). A gate is a generated chain of rooms and corridors (`genLayout` in `js/03a-layout.js`, a new 14th script). One wave per room: walking in shuts the doors (`roomStep` in `js/08-dungeon.js`), clearing it opens them. After the last room an exit leads to the boss, fought in the open arena as before (`enterBossArena`). Every position limit goes through `keepIn` / `inMap`. The minimap follows the hunter; an arrow points to the next door. The 3D view builds the same layout (`rebuildLayout3D`). Endless mode keeps the open arena. Test: `node tools/test_layout.js` (expects `PASS 8000`)
- [x] Step 6 — Loot and gear. **Live** (2026-10-11). Elites (22 percent) and bosses (always, Rare or better) drop gear as a gem; other enemies 1.5 percent. Three slots (armor, boots, ring) and a 12-item bag; four rarities; mods for damage, HP, MP, speed, crit, defence, cooldowns and gold, each capped. Equip, unequip and sell in the ARMORY tab. Saved with the game through `cleanGear`. Code: the GEAR section of `js/01-data.js`, `takeGear` and `dropGear` in `js/06-combat.js`. Test: `node tools/test_gear.js`
- [ ] Step 7 — Story thread: scripted opening, chapter card per gate
- [ ] Step 8 — Hand-designed boss fights
- [ ] Step 9 — Shareable result card
- Parked for later: shared leaderboard, co-op
- Done alongside: script split into `js/` (13 files, behaviour unchanged) so workers can take one small file per job

### Side item
- [ ] 3D lane (Chris, 2026-10-09: "develop both lanes simultaneously", with a button to flip between 2D and 3D): the same game rules in a third-person 3D view at `/3d/`, **live** with a switch link on both pages; the save is shared. `3d/index.html` is generated from `index.html` by `tools/sync3d.py` (run by `tools/stamp.sh`; never edit it by hand). **Free camera live since 2026-10-10**: Z and C turn it, V resets, right-drag orbits, the wheel zooms, and movement is relative to the camera (`view3D` in `3d/render3d.js`, shared `viewYaw`). **Fight effects live since 2026-10-10**: damage numbers, slash crescents, rings, lightning, sparks and the screen flash are drawn on a transparent overlay (`drawFx3D`), and left-click attack now works there. State: simple shapes, no hub backdrop. Next: (1) the hunter and enemies as real 3D figures (bosses are still a plain solid in 3D); (2) touch control for the camera (thread F5)

### Next Up (ranked)
1. ElevenLabs music: write `tools/el_music.py` and file one card with Houston for the key rule
2. 3D lane: real 3D figures for the hunter, enemies and bosses; touch control for the camera (F5)
3. V18 step 6: loot and gear
4. Dress the rooms (open thread U3)
- Open questions and deferred ideas are in `docs/context/OPEN_THREADS.md`

### Backlog / Future Vision
- [ ] Multi-room procedural dungeons (replace arena format) — now V18 step 5
- [ ] Equipment/inventory beyond the weapon ladder — now V18 step 6
- [ ] Character classes / hunter specializations
- [ ] Multiplayer (WebSocket-based; Kevin's original MMO vision, and he is no longer involved) — co-op parked by Chris
- [ ] Guild system
- [ ] PvP arena
- [ ] Narrative / story mode following Solo Leveling arc — now V18 step 7

---

## Session 1 Summary — 2026-04-09
Went from a V1 prototype to a fully deployed, polished, mobile-ready game in 16 versions. Kevin provided live game design feedback throughout. All core systems are now in place — audio, mobile, PWA, and deployment. Phase 2 focus is skill tree and leaderboard.

## Session 3 Summary — 2026-10-09
V17 "Monarch Update" was built, merged and deployed. Chris's play-testing produced five quick fixes shipped to main (star-free circle, aim modes, extraction sound, Controls tab, slower skill points). He then picked a nine-step V18 plan and changed the working mode: Claude briefs and reviews, free models and the worker build. V18 step 1 (painted world) is live; step 3 is half built; a 3D experiment and the ElevenLabs voice tools are ready but not yet used or reviewed. Kevin is out; Chris is the only designer. Parked for a Claude app restart.

## Session 4 Summary — 2026-10-09
V18 steps 3 and 2 went live: shadow soldiers now fight the way their enemies did, and the System speaks (River voice, 35 clips and 8 sound effects, chosen and directed by Chris by ear). The first half of step 4 is live too: the hunter has a real jointed body in the look Chris picked (candidate C); boss looks are not started. The 3D view is now live at `/3d/` beside the 2D game with a switch link on both pages, generated from `index.html` by `tools/sync3d.py`. `tools/stamp.sh` now stamps to the second. Chris gave free rein on Arise (decision card D-0085) and asked for both lanes side by side. Not done: ElevenLabs music (needs Chris's yes), a real-phone test, boss looks, a free camera for 3D, and the printable status report (skipped to save weekly Claude usage).

## Session 5 Summary — 2026-10-10 (overnight)
Houston's asks were done and shipped: the mark in the middle of each gate floor is now plain rings (it could be read as a magic circle before); the old stick-figure hunter is one switch away in the Controls tab; hunter pass 3 brings the body closer to the picture Chris picked; the public page was checked by captured frame. The 3D view got a camera the player can turn, with movement relative to the camera. One fault reached the public page for about nine minutes (dodging threw an error after the hunter switch) and was fixed. Later the same night, on Chris's "keep going": the 3D view got its fight effects (damage numbers, slashes, rings, sparks) and each of the six bosses got its own body, which finishes V18 step 4. Not done: generated dungeons, music, a real-phone test, the printable status report.
