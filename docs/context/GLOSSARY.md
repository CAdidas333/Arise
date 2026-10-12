# Glossary — Arise

## Schemes
| Code pattern | What it is | Example |
|---|---|---|
| S<n> | The nth working session on this project | S3 |
| V<n> | A released version of the game; the number is shown on the title screen | V17 |
| V18 step <n> | One of the nine parts of the V18 upgrade plan Chris approved on 2026-10-09, built and shown one at a time | V18 step 1 |
| v<n>-<name> | A git branch holding a version that is being built and is not on the public site yet | v18-world |
| <letter><n> | An open thread: something raised and deliberately left for later. F is a feature, U is look and feel, E is game balance or engine, I is setup, G is housekeeping, C is documents | F4 |
| D-<n> | A decision card: a numbered question Claude files with Houston (the coordinating session) when a call is not its own, such as whether to spend money. D-0085 is Chris's free rein on Arise; D-0097 and D-0099 are the music cost | D-0097 |
| worker/<name> | A git branch where a free helper model did one job in its own copy of the project. Its work waits there to be reviewed and is merged only if approved | worker/v18-3d-spike |

## Live items
| Code | Plain words | State | Where |
|---|---|---|---|
| V17 | The "Monarch Update": a full rewrite with combo combat, six enemy types, pattern bosses, a skill tree, rewards between waves, an ultimate, an armory, an S-rank gate and an endless mode. With the later play-test fixes and the painted world from V18 step 1, it is what the public link serves today | live | index.html and js/ on main |
| V18 | The big upgrade: give the game a painted world, a voice, real character art, real dungeons and loot. Nine steps; eight are live and step 8 (boss fights) is started | in progress | docs/context/ACTIVE_PROJECTS.md |
| V18 step 1 | Painted floors for all six gates and a painted backdrop behind the title and hub screens. Shipped to the public link on 2026-10-09 | live | main, assets/ |
| V18 step 2 | The System speaks: the game plays 35 voice lines in the voice Chris chose (River) and 8 sound effects he picked by ear, including the extraction line with its nervous pause before "Successful" or "Failed". Music is still off until he says so | live | main (shipped 2026-10-09) |
| V18 step 3 | Each shadow soldier looks like the enemy it was and fights the way that enemy fought: archers shoot, casters drop blasts, chargers rush, brutes slam, sappers burst, and boss shadows fire a ring of shots | live | main (shipped 2026-10-09) |
| V18 step 4 | The hunter has a real body in the look Chris picked, and each of the six bosses has its own body: a spider, a hulking orc, a cloaked knight with a greatsword, a burning armoured king, a dragon with spread wings and a cracked stone colossus. The old stick-figure hunter is one switch away (System menu, Controls tab, "Hunter look"). All of it went live on 2026-10-10 | live | main |
| V18 step 5 | Real dungeons: a gate is a generated chain of rooms and corridors (`genLayout` in `js/03a-layout.js`). One wave per room, doors that shut while it lasts, an exit to the boss arena, a minimap that follows the hunter and an arrow to the next door. Stone walls, torches, pillars, rubble and cracks dress the 2D rooms. Endless mode keeps the open arena. Live in both views since 2026-10-11 | live | main (js/03a-layout.js, js/08-dungeon.js) |
| V18 step 6 | Loot and gear: enemies drop gems that turn into armor, boots or a ring in four rarities. Three slots and a 12-item bag, handled in the ARMORY tab (equip, unequip, sell). Elites drop 22 percent of the time, bosses always, others 1.5 percent. Live since 2026-10-11 | live | main (GEAR section of js/01-data.js) |
| V18 step 7 | A story thread: a one-time opening of five System cards, a chapter card the first time each gate is entered, and a closing line on the first clear (the `STORY` table in `js/01-data.js`; what has been seen is saved in `player.story`). Live since 2026-10-11 | live | main |
| V18 step 8 | Hand-designed boss fights, each with its own mechanics. A first pass (one signature attack per boss) was with a sub-agent at the 2026-10-11 wrap and is not merged | started, not live | docs/context/ACTIVE_PROJECTS.md |
| V18 step 9 | A result card: SAVE RESULT CARD on the victory screen (and the death screen in endless mode) makes a 1200 by 630 picture of the run and opens the share sheet or downloads it (`js/12a-card.js`). Live since 2026-10-11 | live | main |
| Recorded music | Three ElevenLabs tracks (hub, fight, boss; 90 seconds each) that loop and crossfade; the synthesised music plays if a file is missing. Picked without a human hearing them (hub take 2, fight take 1, boss take 1). Live since 2026-10-11 | live | assets/music/, assets/CREDITS.md |
| Room / door / exit | In a gate, each room holds one wave; walking in shuts its doors and clearing it opens them (`roomStep`). After the last room an exit leads to the boss arena | live | js/08-dungeon.js |
| Gem | The drop an enemy leaves; picking it up gives a piece of gear (`takeGear`, `dropGear` in `js/06-combat.js`) | live | js/06-combat.js |
| 3D lane | The same game shown in 3D from behind the hunter, built beside the 2D game. A link on the title screen and in the pause menu flips between the two, and the saved hunter carries over. Since 2026-10-10 the camera can be turned (Z and C keys, or hold the right mouse button and drag), zoomed with the wheel and reset with V, and the hunter walks relative to the camera. Damage numbers, slashes, rings and hit sparks show there too. Since 2026-10-11 the hunter, enemies, bosses and shadows are real figures, gear gems show in rarity colours, the dungeon rooms are built, and on a phone two fingers turn the camera and pinching zooms | live | main (/3d/); 3d/render3d.js |
| v18-world | The branch where V18 is being built. Chris gave free rein on 2026-10-09, so finished steps are shipped to the public link once they have been checked in captured frames, and he is told afterwards | in progress | git branch v18-world |
| v17-monarch | The branch V17 was built on. It was merged and deployed on 2026-10-09 and is no longer used | closed | git branch v17-monarch |
| F1 | A shared leaderboard and playing together with a friend. Chris parked both when he picked the V18 plan | open | docs/context/OPEN_THREADS.md |
| F3 | Music for the game made with ElevenLabs | done 2026-10-11 | docs/context/OPEN_THREADS.md |
| F5 | The 3D camera on a phone: two-finger turn and pinch zoom. Checked with fake touch events only | done 2026-10-11 | docs/context/OPEN_THREADS.md |
| E1 | Levelling may be too fast: test runs gained about 5 to 12 levels per gate. Waiting for a person to play and say whether it is a problem | open | docs/context/OPEN_THREADS.md |
| E2 | The first boss may be too hard for a brand-new hunter who never dodges. Seen only in automated runs | open | docs/context/OPEN_THREADS.md |
| E3 | The game has never been measured or tried on a real phone (frame rate, music memory, the 3D camera, the armory, the share sheet) | waiting on Chris | docs/context/OPEN_THREADS.md |
| G1 | The automated player that tests each gate exists only in an old conversation and should be saved as a tool | open | docs/context/OPEN_THREADS.md |
| G2 | The local preview sometimes failed to load one of the game's files. Fixed by `tools/serve.py` (threaded, port 8767) | done 2026-10-11 | docs/context/OPEN_THREADS.md |
| G4 | Review pictures and sound demos in docs/previews are reachable on the public site. Harmless | open | docs/context/OPEN_THREADS.md |
| G5 | In the 3D view the painted floor appears a few seconds after a gate starts; until then the floor is plain | open | docs/context/OPEN_THREADS.md |
| C1 | The printable status report has been skipped at three wraps to save weekly Claude usage | open | docs/context/OPEN_THREADS.md |
| F6 | Real 3D figures for the hunter, enemies, bosses and shadows | done 2026-10-11 | docs/context/OPEN_THREADS.md |
| F7 | V18 step 8, hand-designed boss fights (first pass with a sub-agent, not merged) | in progress | docs/context/OPEN_THREADS.md |
| F9 | Dodge afterimages, light pillars and the menu backdrop are still not drawn in the 3D view | open | docs/context/OPEN_THREADS.md |
| U3 | Dress the rooms in 3D (the 2D rooms are dressed) | open | docs/context/OPEN_THREADS.md |
| U4 | Warning circles drawn outside a room's walls; now clipped to the floor | done 2026-10-11 | docs/context/OPEN_THREADS.md |
| U5 | The 3D view has no minimap | open | docs/context/OPEN_THREADS.md |
| U6 | The music was picked without a human hearing it; Chris may want to swap takes | open | docs/context/OPEN_THREADS.md |
| E4 | Dungeon pacing: one room per wave, nobody has played it | open | docs/context/OPEN_THREADS.md |
| E5 | Gear balance (drop rates and mod caps) untested by a person | open | docs/context/OPEN_THREADS.md |
| G6 | ElevenLabs' music terms not read in full | open | docs/context/OPEN_THREADS.md |
| G7 | Stale sub-agent worktrees and branches to remove | open | docs/context/OPEN_THREADS.md |
| G8 | Run `tools/check_names.sh` from `tools/stamp.sh` | open | docs/context/OPEN_THREADS.md |
