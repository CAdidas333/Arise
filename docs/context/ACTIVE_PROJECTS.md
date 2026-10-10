# Arise — Active Projects

## Current Phase: Phase 3 — V17 live; V18 under way (step 1 live, step 3 half built)
**Priority**: MEDIUM (fun/showcase project)
**Live URL**: https://cadidas333.github.io/Arise/
**Repo**: CAdidas333/Arise (public)
**Status**: Parked 2026-10-09 by Houston for a Claude app restart. No worker, image job or browser run until Houston says resume.

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
- [ ] Step 2 — The System speaks: voiced lines for the big moments, ElevenLabs signature sound effects. **Unblocked**: Chris approved the credit spend and the key rule is in; the voice and sound-effect scripts and a list of 34 System lines are ready; nothing generated yet. ElevenLabs music stays blocked until Chris has heard the voice and effects
- [ ] Step 3 — Shadows look like the enemy they were and fight the way it fought; boss shadows keep one old attack. **Half built**: the look is merged on `v18-world`; the fighting styles are finished on branch `worker/v18-shadow-roles` (commit 6bbab81) and await review. Ships whole, not in halves
- [ ] Step 4 — A hunter with a real body (jointed parts on the existing skeleton) and a look for each boss
- [ ] Step 5 — Real dungeons: generated rooms and corridors; the arena stays for boss fights and endless mode
- [ ] Step 6 — Loot and gear
- [ ] Step 7 — Story thread: scripted opening, chapter card per gate
- [ ] Step 8 — Hand-designed boss fights
- [ ] Step 9 — Shareable result card
- Parked for later: shared leaderboard, co-op
- Done alongside: script split into `js/` (13 files, behaviour unchanged) so workers can take one small file per job

### Side item
- [ ] 3D experiment (Chris asked for it): a third-person 3D view of the same game rules with simple shapes, fixed camera, on branch `worker/v18-3d-spike` (commit 915ea83). Built, awaiting review and a local browser test. Not live and not to be deployed without Chris's word

### Next Up (ranked)
1. When Houston says resume: review, browser-test and merge the shadow fighting-styles job, run `tools/stamp.sh`, then ship V18 step 3 whole to main
2. Review and browser-test the 3D experiment locally; show Chris a screenshot
3. ElevenLabs voice trial: list voices, three lines in two or three voices for Chris to choose, then all 34 lines, then the 8 signature sound effects with two takes each
4. V18 step 4 (hunter with a real body, boss looks)
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
