---
tags: [project]
---

# Arise — Master Context

**Last updated**: 2026-10-15 (Session 8)
**Live URL**: https://cadidas333.github.io/Arise/
**Repo**: CAdidas333/Arise (public)

## Who This Is For
Chris Whitney. As of 2026-10-09 Chris is the only designer and decision-maker; Kevin (friend/collaborator) is no longer involved. The project started as a live demo of Claude Code's capabilities, building a playable browser game from a conversation in real time, with Kevin as the design collaborator.

## The People
- **Chris Whitney** — vibe coder, AI-augmented developer. Personal IP under CWImagineering.
- **Kevin** — friend, game design collaborator in Sessions 0-1. Brought the Solo Leveling concept and vision for an immersive RPG experience, and gave live design feedback as we iterated through 16 versions. **Out as of 2026-10-09**: no longer involved, so do not plan around his input or his MMO vision.

## What This Project Does
Arise is a browser-based action RPG inspired by the manga/anime **Solo Leveling**. The game captures the core fantasy of the series: starting as the weakest hunter and ascending through increasingly dangerous dungeons via a mysterious "System" that grants power.

### Features (as of Session 1 / V16)
- **The System UI** — holographic blue interface for stats, skills, quests, and gate selection (faithful to the manga aesthetic)
- **Hybrid combat** — real-time WASD movement + mouse aiming with ability cooldowns (ARPG style)
- **Dungeon/Gate system** — arena-style encounters with enemy waves and a boss hunt finale, ranked E through A
- **Boss hunt mechanic** — arena expands, boss spawns at far edge, creating a hunt feel
- **Stat allocation** — STR/AGI/INT/VIT/PER with 5 points per level; auto-assign button available
- **Shadow extraction** — defeat bosses to extract shadows that fight alongside you (series' signature mechanic)
- **Shadow army AI** — shadows only engage when player is actively fighting; "Arise: Legion" skill sends all shadows berserk simultaneously
- **Hunter rank progression** — E through S rank based on level milestones
- **Daily quests** — "100 push-ups, 100 sit-ups, 10km run" nod to the source material
- **Procedural audio** — Web Audio API synthesizes battle music (135 BPM war drums + power riff) and 10+ SFX at runtime
- **Mobile touch controls** — virtual joystick + attack/skill buttons; fullscreen + safe-area support
- **PWA manifest** — installable to mobile home screen
- **Save/load** — localStorage persistence across sessions
- **High scores + combos** — tracked per session
- **Minimap** — real-time enemy + shadow positions
- **Pause menu** — volume slider, fullscreen toggle
- **Dev mode** — backtick = +5 levels, shift+backtick = -5 levels (hidden, not in UI)

### V17 "Monarch Update" (Session 3, live since 2026-10-09)
Full script rewrite. Adds: frame-rate-independent engine, 3-hit combo + dodge, six enemy archetypes with telegraphed attacks, pattern bosses with an enrage phase, remnant extraction (E), army cap and grades, skill tree, run boons, Monarch's Awakening ultimate (R), gold + armory, S-rank gate, endless Demon Castle, adaptive music. Controls: WASD move, mouse aim/attack, Space dodge, 1–5 skills, R ultimate, E arise, F potion, Esc pause. See SESSION_LOG Session 3 for the full list. `#debug` in the URL exposes `window.__arise`.

### Changes after V17 went live (2026-10-09, on `main`)
Fixes from Chris's play-testing: the arena-centre mark is now a star-free circle and floor marks are plain diamonds; aim modes (Auto, Keys, Mouse; `M` cycles; `X` or `J` attacks; arrow keys work); a rebuilt extraction sound; a Controls tab in the System menu; skill points at one per 2 levels (the tree fills around level 94; old saves are refunded on load). V18 step 1 (painted floors and hub backdrop) is live.

### Structure since V18 work began (branch `v18-world`)
Chris lifted the single-file rule on 2026-10-09 ("you can use as many folders and whatever you need"). `index.html` now holds the CSS and markup and loads 16 classic scripts (15 until 2026-10-15, when `js/12b-overlay.js` joined) from `js/` in order (they share one global scope; no modules, no build step; `js/03a-layout.js` and `js/12a-card.js` joined the original 13 on 2026-10-11). Painted art lives in `assets/` with provenance in `assets/CREDITS.md`. `tools/process_art.py` turns raw generated images into game assets; `tools/stamp.sh` refreshes the `?v=` on the script tags and must be run before committing any change in `js/`. `tools/el_voice.py`, `tools/el_sfx.py` and `tools/system_lines.tsv` are the ElevenLabs voice and sound-effect scripts and the System lines (the voice and effects were generated and are live since 2026-10-09); `tools/el_music.py` made the music (2026-10-11). Briefs for helper jobs live in `docs/briefs/`. How work is done: Claude writes briefs, reviews and tests; free image models and the worker (`worker run Arise <slug> <brief>`, Gemini first) do the generating and coding. The 3D view (`3d/`, with a local copy of three.js r149, MIT) has been live at `/3d/` since 2026-10-09.

### Changes on 2026-10-10 (Session 5, live)
The mark in the middle of each gate floor is plain rings only (it must never read as a magic circle). The hunter is pass 3 of the body, drawn at 1.35 size, and the old stick figure is kept as `drawHunterClassic`, chosen by `settings.hunter` ("Hunter look" in the Controls tab). The 3D view has an orbit camera (`view3D` in `3d/render3d.js`; Z, C, V, right-drag, wheel) and movement relative to the camera through the shared `viewYaw` in `js/03-state.js`. The 3D view draws fight effects on a transparent overlay (`drawFx3D`; the game canvas sits above the 3D canvas). Each boss has its own body (`drawBoss` in `js/11-render-world.js`, also used for boss shadow soldiers); V18 step 4 is complete.

### Changes on 2026-10-11 (Session 6, live on the public page)
- **Generated dungeons (V18 step 5).** A gate is a chain of rooms and corridors made by `genLayout` (`js/03a-layout.js`). One wave per room: walking in shuts the doors (`roomStep`, `js/08-dungeon.js`), clearing the room opens them; after the last room an exit leads to the boss, fought in the open arena as before (`enterBossArena`). Every position limit goes through one pair of functions (`keepIn`, `inMap`). The minimap follows the hunter and an arrow points to the next door. The 3D view builds the same layout (`rebuildLayout3D`). Endless mode keeps the open arena. Room count is waves minus one. There is no tile grid and no pathfinding: a locked room is one rectangle, so straight-line chasing still works.
- **Stone walls and room dressing in 2D.** Dark wall mass, a lit face on north walls, posts at doorways, then pilasters, wall torches, floor inlays, rubble, cracks and corridor runners from a seeded generator cached as `layout.decor`. Warning circles are clipped to the walkable floor.
- **Loot and gear (V18 step 6).** Gems drop from elites (22 percent), bosses (always, Rare or better) and, at 1.5 percent, other enemies. Three slots (armor, boots, ring), a 12-item bag, four rarities, capped mods; equip, unequip and sell in the ARMORY tab (a double-click guard stops one double click selling two items). Saved through `cleanGear`.
- **Recorded music.** Three ElevenLabs tracks (hub, fight, boss; 90 seconds each; `assets/music/`) loop with a crossfade. `js/02-audio.js` fetches the files at start, decodes one when its mode is first needed (two kept at once, one on phones) and falls back to the synthesised music for any missing file. Picks: hub take 2, fight take 1, boss take 1, chosen from a local audio classifier's labels, not by ear. Unpicked takes sit in `assets/music/takes/` (ignored by git). Cost about $1.35 (six takes, $0.15 a minute through the API), approved by Chris in chat.
- **Real 3D figures** for the hunter, six enemy kinds, six bosses and shadow soldiers (three.js primitives, shared geometry); gear gems in rarity colours; two-finger turn and pinch zoom on phones.
- **Story thread (V18 step 7).** A one-time opening of five System cards, a chapter card on first entry to each gate, a closing line on first clear; text in the `STORY` table (`js/01-data.js`); seen-flags saved in `player.story`.
- **Shareable result card (V18 step 9).** `js/12a-card.js`; SAVE RESULT CARD on the victory screen and the endless death screen (1200 by 630 PNG, share sheet or download).
- **V18 step 8** followed: signature attacks public 2026-10-12, the full fights 2026-10-15 (below).
- **Tools and checks added:** `node tools/test_layout.js` (expects `PASS 8000`), `node tools/test_gear.js`, `tools/check_names.sh` (lists top-level names declared twice, which breaks the shared global scope), `tools/serve.py` (threaded local preview, port 8767, `.claude/launch.json` points at it). `.claude/worktrees/` and `assets/music/takes/` are git-ignored.

### Changes on 2026-10-12 (Session 7, live)
Boss signature attacks public; bosses use their patterns against a hunter in close; upright-phone layout fixes (boss health strip, combo beside the stat bars); a pink potion button with a count; the army is called (three escort, Arise: Legion calls the strongest, the Awakening calls the roster); levels at half the speed (`XP_PACE = 2`); `node tools/balance_bot.js`; the hunter squares up (lock-on facing, backstep dodge, Counter, warning rings). Details in SESSION_LOG.

### Changes on 2026-10-15 (Session 8, live; stamp 20261015084150)
- **V18 step 8 done, so V18 is complete.** Each boss has three phases: at 50 percent it enrages as before and makes a scripted move, at 25 percent it makes a "LAST STAND" with a second move (`bossPhaseMove` in `js/05-enemies.js`; `e.phase` is 1, 2 or 3 and every enraged test is `phase >= 2`). Moves: Spider Queen webs the floor, then a nine-egg clutch; Orc Chieftain war cry and two elite orcs, then a five-jump pound chain; Death Knight two elite adds, then crossing sword lanes; Demon Lord a ring of fire round the arena for 30 seconds, then a second ring; Ancient Dragon fire rain, then a firestorm; Statue of God a sweeping cold eye-beam, then two.
- **Zones (arena tricks).** A floor patch that stays after an attack lands: `addZone`, or a `zone:{ kind, dur, slow, dps }` field on any telegraph. Kinds: web (slows walking), fire and blood (burn twice a second while stood in, never during a dodge), rubble (slows). Drawn by `drawZone` (2D) and `zoneMeshes` (3D). The signature attacks leave them (unhatched eggs, pounds from phase 2, cleave lanes from phase 2, the firewall's back row, the breath's edges).
- **3D lane:** a minimap that turns with the camera, dodge afterimages, Arise light pillars, the gate backdrop on the title and hub, floor textures loaded before a gate starts. `drawMinimap`, `drawPortal` and `drawMotes` moved to a 16th script, `js/12b-overlay.js`, loaded by both pages.
- **In flight at the wrap:** thick stone walls and room dressing in 3D (thread U3), a free-worker job.

### Origin
Kevin proposed building an MMO RPG that simulates the Solo Leveling experience. For V1, we scoped it to a single-player browser game capturing the core loop: enter gates, fight enemies, level up, extract shadows, repeat with harder content. By Session 1's end, the game was publicly deployed and mobile-ready.

## Architecture
- **Stack**: Pure HTML5 Canvas + vanilla JavaScript
- **Structure**: Through V17 a single self-contained `index.html` (2,828 lines). Since 2026-10-09: `index.html` (CSS and markup) + `js/` (15 classic scripts since 2026-10-11) + `assets/` (see Structure above)
- **No dependencies**: No npm, no build tools, no frameworks (the 3D view keeps a local copy of three.js; the main 2D game does not use it)
- **Audio**: Web Audio API. Music and most SFX were synthesized at runtime; since 2026-10-09 the System's voice (35 clips) and 8 signature effects are files in `assets/voice/` and `assets/sfx/`, and since 2026-10-11 three recorded music tracks are files in `assets/music/`. The synthesised music plays wherever a music file is missing
- **Rendering**: Canvas 2D with particles, screen shake, glow effects, floating damage numbers
- **State management**: Simple JavaScript objects, game loop via requestAnimationFrame
- **Persistence**: localStorage for save/load and high scores
- **Deployment**: GitHub Pages via `.github/workflows/deploy.yml`

### File Structure
```
Arise/
  index.html          — CSS and markup, loads the scripts (652 lines on v18-world, 2026-10-11)
  js/                 — 16 classic scripts, loaded in order, shared global scope (01-data ... 13-loop, plus 03a-layout, 12a-card and 12b-overlay)
  assets/             — Painted floors (floors/), hub backdrop (bg/), System voice (voice/), signature effects (sfx/), music (music/; takes/ is git-ignored), CREDITS.md (provenance)
  tools/              — process_art.py, stamp.sh, sync3d.py, serve.py, check_names.sh, test_layout.js, test_gear.js, el_voice.py, el_sfx.py, el_music.py, system_lines.tsv
  3d/                 — The 3D view: render3d.js, vendored three.js, and index.html GENERATED from the root index.html by tools/sync3d.py
  manifest.json       — PWA manifest for mobile home screen install
  CLAUDE.md           — Project instructions for Claude
  .github/
    workflows/
      deploy.yml      — GitHub Pages auto-deploy on push to main
  docs/
    context/
      MASTER_CONTEXT.md
      ACTIVE_PROJECTS.md
      SESSION_LOG.md
      GLOSSARY.md, LESSONS.md, OPEN_THREADS.md
    briefs/           — Self-contained briefs for helper (worker) jobs
```

### Game States
1. **TITLE** — Animated "ARISE" title screen
2. **CREATE** — Hunter name input
3. **HUB** — System menu (stats, gates, shadows, quests)
4. **DUNGEON** — Active gameplay (combat, waves, boss hunt)

## Key Decisions
- **Single file over modules**: Maximizes portability — just open and play. **Superseded 2026-10-09**: Chris lifted the single-file rule ("use as many folders and whatever you need"). The no-build-step rule stays; the script is now 13 classic files, not modules.
- **Zero dependencies**: Keeps it simple, fast to load, no build step to break. Non-negotiable constraint. Still holds for the game; the 3D experiment is the one place a local library copy (three.js) is used.
- **Arena combat over procedural dungeons**: Simpler to implement, still engaging. **Superseded 2026-10-11**: V18 step 5 is live; gates are generated rooms and corridors (Chris kept this against the advisor's advice); the open arena stays for boss fights and endless mode.
- **Canvas rendering over DOM**: Better performance for particle effects and real-time combat.
- **Procedural audio via Web Audio API**: Eliminates all external asset files; game remains a single HTML file. **Partly superseded 2026-10-09 and 2026-10-11**: the System's voice and three recorded music tracks are now files; the synthesised music stays as the fallback.
- **Shadow AI engagement rule**: Shadows only fight when player is in combat — prevents trivial room-clearing and keeps player as the protagonist.
- **Boss hunt format**: Boss spawns far away on arena expansion, not mid-wave — creates intentional hunt tension.
- **PWA over native app**: Fast path to mobile home screen install without an app store submission.
- **GitHub Pages deployment**: Instant public URL, auto-deploy on push, free hosting.
- **Repo made public**: CAdidas333/Arise — showcase/fan project, not commercial.
- **Solo Leveling IP**: This is a fan game / personal project, not for commercial distribution.
- **Chris alone decides design (2026-10-09)**: Kevin is out.
- **V18 plan, nine steps (2026-10-09)**: painted world; the System's voice; shadows that look and fight like the enemy; a hunter with a real body; generated dungeons; loot and gear; story thread; hand-designed boss fights; shareable result card. Shared leaderboard and co-op are parked for later. Details in ACTIVE_PROJECTS and GLOSSARY.
- **Art direction (2026-10-09)**: the independent advisor's view was adopted on art: painted floors, a hunter built from jointed parts, no sprite sheets. Chris kept generated dungeons and loot against the advisor's advice.
- **No star symbols, runes or occult imagery in any art (2026-10-09)**: after Chris objected to a star-in-circle mark. Standing rule in `CLAUDE.md` and `assets/CREDITS.md`.
- **3D (2026-10-09)**: possible as a new view over the same game rules; third-person only; tried as a side experiment, not a commitment. Unreal is ruled out (it cannot publish to a web link). Blender would be installed later only if real 3D characters are made.
- **Working mode (2026-10-09)**: Claude orchestrates (plans, writes briefs, reviews, tests); free image models and the worker do the generating and coding. Free workers need exact function names and line numbers, everything inside the repo, and a note on what not to commit.
- **ElevenLabs (2026-10-09)**: Chris approved spending credits for the System's voice and signature effects (card D-0077). Voice and effects scripts are allowed through the key broker; the music script stays blocked until Chris has heard the voice and effects.
- **Ship rule (2026-10-09)**: fixes Chris asks for go straight to `main`; new V18 steps are shown to him first and shipped when he says. Step 1 shipped; step 3 ships whole, not in halves.
- **Free rein (2026-10-09, late; decision card D-0085)**: Chris: "complete free rein between yourself and Houston. Decisions can be made without me... Make the best decision that you can for the game... I just want something that I can show off." This replaces the ship rule above: Claude decides and ships V18 work without waiting for him, and tells him afterwards. Still his: the no-stars-or-runes art rule, a yes before any ElevenLabs music, and anything that costs money.
- **Two lanes (2026-10-09, late)**: Chris wants the 2D game and the 3D view developed side by side, with a button to flip between them. The 3D view is no longer a parked experiment.
- **Skill points (2026-10-09)**: one every 2 levels; old saves are refunded at the new rate on load.
- **Music cost and picks (2026-10-11; decision cards D-0097, D-0099)**: ElevenLabs bills API music in dollars ($0.15 a minute), not plan credits, so the orchestrator held the first call and asked. Chris approved in chat ("You are approved."), then "approved. do it.", which was read as "put it in, you pick". Picks were made from a classifier's labels, not by ear; Chris can swap any take by naming the track and take. Money stays Chris's call.
- **Generated-dungeon shape (2026-10-11)**: no tile grid, no pathfinding; a locked room is one rectangle; room count is waves minus one; one function pair (`keepIn`, `inMap`) for every position limit.
- **Art rule now also covers words (2026-10-11)**: no star symbols, runes, occult or religious imagery in item names and story text, not only in pictures.
- **Build route after 2026-10-11 22:00 (Houston)**: from about 19:20 on 2026-10-11 Claude sub-agents built in their own worktrees (Chris's order via Houston: spend the remaining weekly Claude usage before the 22:00 reset). After the reset the route is back to free workers (`worker run Arise <slug> <brief> --engine auto`).

## Related Projects
- Standalone project, no dependencies on AVL, ICC-SaaS, ABR, or Armory.
- Part of the Jim Coleman Auto Group workspace for convenience but unrelated to dealership operations.
