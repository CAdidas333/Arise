# Arise — Active Projects

## Current Phase: Phase 3 — V18 complete (all nine steps live since 2026-10-15); the 3D lane catching up with the 2D look
**Priority**: MEDIUM (fun/showcase project)
**Live URL**: https://cadidas333.github.io/Arise/
**Repo**: CAdidas333/Arise (public)
**Status**: Working. Session 8 (2026-10-15) finished V18 step 8 (three-phase boss fights with arena tricks) and four 3D leftovers (minimap, afterimages, Arise light pillars, hub backdrop, floor on the first frame), all live; Then thick stone walls and room dressing in 3D (U3), also live (stamp 20261015090051). Session 7 (2026-10-12) shipped the boss signature attacks, the army call, slower levels, the balance bot and the square-up. Earlier: Session 6 (2026-10-11) shipped generated dungeons, stone walls and room dressing, loot and gear, recorded music, real 3D figures, the story thread and the result card. One sub-agent job (a signature attack for each boss, a first pass at step 8) was in flight at the wrap and had not been reviewed or merged. `main` and `v18-world` were level before the wrap docs. Nothing has been tested by a human hand or on a real phone.

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
- [x] Step 2 — The System speaks: 35 voice lines in the River voice and 8 sound effects, all chosen by Chris by ear, play in the game; the extraction line is "Shadow extraction.", a 2-second wait with a charge effect, then "Successful." or "Failed.". **Live** (shipped to main 2026-10-09 on Chris's word, commit 18b896a; he will say if anything needs changing). Recipe in `assets/CREDITS.md`. Music followed on 2026-10-11 (see Done alongside)
- [x] Step 3 — Shadows look like the enemy they were and fight the way it fought; boss shadows fire a ring of shots on a timer. **Live** (shipped to main 2026-10-09, commit f465a46)
- [x] Step 4 — A hunter with a real body and a look for each boss. **Live.** Hunter: pass 3 (2026-10-10), closer to the picture Chris picked, drawn at 1.35 size; the old stick figure is one switch away (System menu, Controls tab, "Hunter look"; `settings.hunter`, `drawHunterClassic`). Bosses (2026-10-10): each of the six has its own body drawn by `drawBoss` in `js/11-render-world.js` (spider, hulking orc, cloaked knight with a greatsword, burning armoured king, dragon with spread wings, cracked stone colossus); boss shadow soldiers use the same bodies in shadow colours
- [x] Step 5 — Real dungeons. **Live** in both views (2026-10-11), with stone walls (a lit face on north walls, door posts) and room dressing in 2D (pilasters, wall torches, floor inlays, rubble, cracks, corridor runners; `layout.decor`). A gate is a generated chain of rooms and corridors (`genLayout` in `js/03a-layout.js`, a new 14th script). One wave per room: walking in shuts the doors (`roomStep` in `js/08-dungeon.js`), clearing it opens them. After the last room an exit leads to the boss, fought in the open arena as before (`enterBossArena`). Every position limit goes through `keepIn` / `inMap`. The minimap follows the hunter; an arrow points to the next door. The 3D view builds the same layout (`rebuildLayout3D`). Endless mode keeps the open arena. Test: `node tools/test_layout.js` (expects `PASS 8000`)
- [x] Step 6 — Loot and gear. **Live** (2026-10-11). Elites (22 percent) and bosses (always, Rare or better) drop gear as a gem; other enemies 1.5 percent. Three slots (armor, boots, ring) and a 12-item bag; four rarities; mods for damage, HP, MP, speed, crit, defence, cooldowns and gold, each capped. Equip, unequip and sell in the ARMORY tab. Saved with the game through `cleanGear`. Code: the GEAR section of `js/01-data.js`, `takeGear` and `dropGear` in `js/06-combat.js`. Test: `node tools/test_gear.js`
- [x] Step 7 — Story thread. **Live** (2026-10-11). A one-time opening of five System cards for a new hunter, a chapter card the first time each gate is entered, and a closing line on the victory screen the first time each gate is cleared. Text in the `STORY` table (`js/01-data.js`); what has been seen is saved in `player.story`
- [x] Step 8 — Hand-designed boss fights. **Live** (2026-10-15, stamp 20261015084150). One signature attack per boss (2026-10-12), bosses use patterns up close (2026-10-12), then three phases: a scripted move at 50 percent and a "LAST STAND" at 25 percent with its own move (`bossPhaseMove`), and arena tricks: floor patches that stay after attacks land (webs slow, fire and blood burn, rubble slows; the zone system: `addZone`, `updateZones`, `zoneSlow`, `drawZone`, `zoneMeshes`). Per boss in OPEN_THREADS (F7, Done log). Not played by a person (F12)
- [x] Step 9 — Shareable result card. **Live** (2026-10-11). SAVE RESULT CARD on the victory screen (and on the death screen in endless mode) makes a 1200 by 630 image of the run and opens the share sheet where the device supports it, otherwise downloads it. Code: `js/12a-card.js` (a 15th script). Not tried with a real share sheet
- Parked for later: shared leaderboard, co-op
- Done alongside: script split into `js/` (13 files, behaviour unchanged) so workers can take one small file per job; two scripts were added in Session 6 (`js/03a-layout.js`, `js/12a-card.js`), so there are 15 now
- Done alongside (2026-10-11): **recorded music** (closes thread F3). Three ElevenLabs tracks (hub, fight, boss; 90 seconds each) loop with a crossfade; the synthesised music is the fallback for a missing file. Picks (hub take 2, fight take 1, boss take 1) were made from a classifier's labels, not by ear. Cost about $1.35, approved by Chris in chat. `tools/el_music.py`; details in `assets/CREDITS.md`
- Done alongside (2026-10-11): tooling. `tools/serve.py` (threaded preview on port 8767; closes G2), `tools/check_names.sh` (top-level names declared twice), `tools/test_layout.js`, `tools/test_gear.js`

### Side item
- [ ] 3D lane (Chris, 2026-10-09: "develop both lanes simultaneously", with a button to flip between 2D and 3D): the same game rules in a third-person 3D view at `/3d/`, **live** with a switch link on both pages; the save is shared. `3d/index.html` is generated from `index.html` by `tools/sync3d.py` (run by `tools/stamp.sh`; never edit it by hand). Free camera (2026-10-10): Z and C turn it, V resets, right-drag orbits, the wheel zooms, movement is relative to the camera (`view3D` in `3d/render3d.js`, shared `viewYaw`). Fight effects (2026-10-10): drawn on a transparent overlay (`drawFx3D`), left-click attack works. **Session 6 (2026-10-11): real figures** for the hunter, six enemy kinds, six bosses and shadow soldiers (three.js primitives, shared geometry), gear gems in rarity colours, the generated layout (`rebuildLayout3D`), and two-finger turn and pinch zoom on phones (checked with fake touch events only). **Session 8 (2026-10-15):** minimap that turns with the camera (U5), dodge afterimages, Arise light pillars, the hub backdrop (F9), and floor textures loaded before a gate starts (G5); `drawMinimap`, `drawPortal` and `drawMotes` now live in the shared `js/12b-overlay.js` (16th script). Then thick stone walls with a camera-side cutaway and the 2D room dressing in 3D (U3), live at stamp 20261015090051

### Next Up (ranked)
1. Chris plays: the boss fights (F12), the square-up and counter (F11), pacing (E4), gear (E5), difficulty (E1, E2); his ears on the music (U6); a real-phone test (E3). Do not tune difficulty before he says how it plays
2. Balance (E1): the bot dies 0 times; the shadows do most of the boss damage. Levers when Chris asks: shadow damage per level (`shadowDmg`), boss health, enemy damage
3. 3D lane: anything the 2D view draws that 3D still does not
4. Parked: shared leaderboard and co-op (F1); the printable status report (C1)
- Open questions and deferred ideas are in `docs/context/OPEN_THREADS.md`

### Backlog / Future Vision
- [x] Multi-room procedural dungeons (replace arena format) — done, V18 step 5 (2026-10-11)
- [x] Equipment/inventory beyond the weapon ladder — done, V18 step 6 (2026-10-11)
- [ ] Character classes / hunter specializations
- [ ] Multiplayer (WebSocket-based; Kevin's original MMO vision, and he is no longer involved) — co-op parked by Chris
- [ ] Guild system
- [ ] PvP arena
- [x] Narrative / story mode following Solo Leveling arc — first version done, V18 step 7 (2026-10-11)

---

## Session 1 Summary — 2026-04-09
Went from a V1 prototype to a fully deployed, polished, mobile-ready game in 16 versions. Kevin provided live game design feedback throughout. All core systems are now in place — audio, mobile, PWA, and deployment. Phase 2 focus is skill tree and leaderboard.

## Session 3 Summary — 2026-10-09
V17 "Monarch Update" was built, merged and deployed. Chris's play-testing produced five quick fixes shipped to main (star-free circle, aim modes, extraction sound, Controls tab, slower skill points). He then picked a nine-step V18 plan and changed the working mode: Claude briefs and reviews, free models and the worker build. V18 step 1 (painted world) is live; step 3 is half built; a 3D experiment and the ElevenLabs voice tools are ready but not yet used or reviewed. Kevin is out; Chris is the only designer. Parked for a Claude app restart.

## Session 4 Summary — 2026-10-09
V18 steps 3 and 2 went live: shadow soldiers now fight the way their enemies did, and the System speaks (River voice, 35 clips and 8 sound effects, chosen and directed by Chris by ear). The first half of step 4 is live too: the hunter has a real jointed body in the look Chris picked (candidate C); boss looks are not started. The 3D view is now live at `/3d/` beside the 2D game with a switch link on both pages, generated from `index.html` by `tools/sync3d.py`. `tools/stamp.sh` now stamps to the second. Chris gave free rein on Arise (decision card D-0085) and asked for both lanes side by side. Not done: ElevenLabs music (needs Chris's yes), a real-phone test, boss looks, a free camera for 3D, and the printable status report (skipped to save weekly Claude usage).

## Session 5 Summary — 2026-10-10 (overnight)
Houston's asks were done and shipped: the mark in the middle of each gate floor is now plain rings (it could be read as a magic circle before); the old stick-figure hunter is one switch away in the Controls tab; hunter pass 3 brings the body closer to the picture Chris picked; the public page was checked by captured frame. The 3D view got a camera the player can turn, with movement relative to the camera. One fault reached the public page for about nine minutes (dodging threw an error after the hunter switch) and was fixed. Later the same night, on Chris's "keep going": the 3D view got its fight effects (damage numbers, slashes, rings, sparks) and each of the six bosses got its own body, which finishes V18 step 4. Not done: generated dungeons, music, a real-phone test, the printable status report.

## Session 6 Summary — 2026-10-11
Started as a renewal of Session 5 and ran from morning to night. Free workers (Gemini) built V18 step 5: a gate is now a chain of rooms and corridors with doors that shut, an exit to the boss arena, a minimap that follows the hunter and the same layout in the 3D view; a worker also added stone walls. From about 19:20, on Chris's order relayed by Houston (spend the remaining weekly Claude usage before the 22:00 reset), Claude sub-agents built in their own worktrees, several at once: room dressing, loot and gear (step 6), real 3D figures and a touch camera, the story thread (step 7) and the shareable result card (step 9). Recorded music went in after Chris approved the cost in chat. The orchestrator wrote the briefs, reviewed, tested in the browser and shipped; all of it is live. In flight at the wrap: a signature attack for each boss (step 8, first pass), not merged. Faults caught before the public page saw them: a name used twice by two agents that stopped the 3D renderer loading, sub-agent worktrees staged as embedded repositories, and two stale-page test mix-ups (see LESSONS). Not done: a human play-through, a real-phone test, Chris's ears on the music, the printable status report (C1).

## Session 8 Summary — 2026-10-15
Restarted by Houston in the morning. The boss signature attacks were already public (since 2026-10-12) and were re-checked in both views. Free workers (Gemini through `worker run`) then built, each job accepted on its first pass and checked by the orchestrator in both views before it shipped: a zone system for floor patches that stay, the three-phase boss fights with a scripted move per boss at each phase (V18 step 8 is done, so all nine V18 steps are live), and four 3D leftovers (minimap, dodge afterimages, Arise light pillars, hub backdrop, floor on the first frame). Live at stamp 20261015084150; a fifth job, thick walls and room dressing in 3D, followed at stamp 20261015090051. Nobody has played any of it by hand.

