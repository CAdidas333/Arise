# Arise — Active Projects

## Current Phase: Phase 3 — V17 live; V18 under way (steps 1, 2 and 3 live; step 4, the hunter body, being built)
**Priority**: MEDIUM (fun/showcase project)
**Live URL**: https://cadidas333.github.io/Arise/
**Repo**: CAdidas333/Arise (public)
**Status**: Working. The Claude app restart is done (Houston, 2026-10-09 22:25). While Chris is away the Mac is on battery: no job over about 15 minutes, nothing heavy below 50 percent battery, one heavy job at a time.

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
- [ ] Step 4 — A hunter with a real body (jointed parts on the existing skeleton) and a look for each boss. **Hunter body built on `v18-world`, not live** (2026-10-09): Chris picked look C (`docs/art-direction/hunter-style/hunter_style_c_v1.png`); the body is drawn with canvas shapes in `drawHunter` (two-piece arms and legs, vest with a glowing zip, wrapped forearms, spiky hair, twin steel blades; no cape). Two worker passes; the second is merged (9cc81c0). Frames in `docs/previews/hunter_body_*_v2.jpg`. Waiting for Chris to look and say ship or change. Boss looks are not started
- [ ] Step 5 — Real dungeons: generated rooms and corridors; the arena stays for boss fights and endless mode
- [ ] Step 6 — Loot and gear
- [ ] Step 7 — Story thread: scripted opening, chapter card per gate
- [ ] Step 8 — Hand-designed boss fights
- [ ] Step 9 — Shareable result card
- Parked for later: shared leaderboard, co-op
- Done alongside: script split into `js/` (13 files, behaviour unchanged) so workers can take one small file per job

### Side item
- [ ] 3D experiment (Chris asked for it): a third-person 3D view of the same game rules with simple shapes, fixed camera, on branch `worker/v18-3d-spike` (90769db). Two passes reviewed and tested 2026-10-09: a whole gate runs through to the boss with no errors; pass 2 made the hunter bigger and the camera closer (frames in `docs/previews/3d_experiment_*_v2.jpg`). Waiting for Chris to look and say continue or stop. Not merged, not live, and not to be deployed without his word

### Next Up (ranked)
1. V18 step 4: Chris looks at the hunter body frames and says ship or change. `main` is at 18b896a and must not be fast-forwarded to `v18-world` until he approves, because the work branch contains the new body. Then the boss looks
2. 3D experiment: show Chris the second-pass frames (`docs/previews/3d_experiment_*_v2.jpg`); he says continue or stop. It is tested from its own worktree and must not be merged into `v18-world` until he says, because that branch ships to the public site
3. V18 step 4 (hunter with a real body, boss looks)
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
