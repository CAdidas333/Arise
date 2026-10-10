# Glossary — Arise

## Schemes
| Code pattern | What it is | Example |
|---|---|---|
| S<n> | The nth working session on this project | S3 |
| V<n> | A released version of the game; the number is shown on the title screen | V17 |
| V18 step <n> | One of the nine parts of the V18 upgrade plan Chris approved on 2026-10-09, built and shown one at a time | V18 step 1 |
| v<n>-<name> | A git branch holding a version that is being built and is not on the public site yet | v18-world |
| <letter><n> | An open thread: something raised and deliberately left for later. F is a feature, U is look and feel, E is game balance or engine, I is setup, G is housekeeping, C is documents | F4 |
| worker/<name> | A git branch where a free helper model did one job in its own copy of the project. Its work waits there to be reviewed and is merged only if approved | worker/v18-3d-spike |

## Live items
| Code | Plain words | State | Where |
|---|---|---|---|
| V17 | The "Monarch Update": a full rewrite with combo combat, six enemy types, pattern bosses, a skill tree, rewards between waves, an ultimate, an armory, an S-rank gate and an endless mode. With the later play-test fixes and the painted world from V18 step 1, it is what the public link serves today | live | index.html and js/ on main |
| V18 | The next big upgrade: give the game a painted world, a voice, real character art, real dungeons and loot. Nine steps, shown to Chris one at a time | in progress | docs/context/ACTIVE_PROJECTS.md |
| V18 step 1 | Painted floors for all six gates and a painted backdrop behind the title and hub screens. Shipped to the public link on 2026-10-09 | live | main, assets/ |
| V18 step 2 | The System speaks: the game plays 35 voice lines in the voice Chris chose (River) and 8 sound effects he picked by ear, including the extraction line with its nervous pause before "Successful" or "Failed". Music is still off until he says so | live | main (shipped 2026-10-09) |
| V18 step 3 | Each shadow soldier looks like the enemy it was and fights the way that enemy fought: archers shoot, casters drop blasts, chargers rush, brutes slam, sappers burst, and boss shadows fire a ring of shots | live | main (shipped 2026-10-09) |
| V18 step 4 | The hunter has a real body in the look Chris picked, and each of the six bosses has its own body: a spider, a hulking orc, a cloaked knight with a greatsword, a burning armoured king, a dragon with spread wings and a cracked stone colossus. The old stick-figure hunter is one switch away (System menu, Controls tab, "Hunter look"). All of it went live on 2026-10-10 | live | main |
| V18 step 5 | Real dungeons: generated rooms and corridors to explore, with the open arena kept for boss fights and endless mode | open | docs/context/ACTIVE_PROJECTS.md |
| V18 step 6 | Loot and gear: armour and accessories with rarities, dropped by enemies | open | docs/context/ACTIVE_PROJECTS.md |
| V18 step 7 | A story thread: a scripted opening and a chapter card for each gate | open | docs/context/ACTIVE_PROJECTS.md |
| V18 step 8 | Hand-designed boss fights, each with its own mechanics | open | docs/context/ACTIVE_PROJECTS.md |
| V18 step 9 | A result card you can save or share after a run | open | docs/context/ACTIVE_PROJECTS.md |
| 3D lane | The same game shown in 3D from behind the hunter, built beside the 2D game. A link on the title screen and in the pause menu flips between the two, and the saved hunter carries over. Since 2026-10-10 the camera can be turned (Z and C keys, or hold the right mouse button and drag), zoomed with the wheel and reset with V, and the hunter walks relative to the camera. Damage numbers, slashes, rings and hit sparks show there too. The figures are still simple shapes; real 3D figures come next | live | main (/3d/); 3d/render3d.js |
| v18-world | The branch where V18 is being built. Chris gave free rein on 2026-10-09, so finished steps are shipped to the public link once they have been checked in captured frames, and he is told afterwards | in progress | git branch v18-world |
| v17-monarch | The branch V17 was built on. It was merged and deployed on 2026-10-09 and is no longer used | closed | git branch v17-monarch |
| F1 | A shared leaderboard and playing together with a friend. Chris parked both when he picked the V18 plan | open | docs/context/OPEN_THREADS.md |
| F3 | Music for the game made with ElevenLabs. Chris wanted to hear the voice and sound effects first, and he has; the music script still has to be written and its key rule approved by Houston | open | docs/context/OPEN_THREADS.md |
| F5 | The 3D camera cannot be turned on a phone yet: there is no touch control for it | open | docs/context/OPEN_THREADS.md |
| E1 | Levelling may be too fast: test runs gained about 5 to 12 levels per gate. Waiting for a person to play and say whether it is a problem | open | docs/context/OPEN_THREADS.md |
| E2 | The first boss may be too hard for a brand-new hunter who never dodges. Seen only in automated runs | open | docs/context/OPEN_THREADS.md |
| E3 | The game has never been measured on a real phone | waiting on Chris | docs/context/OPEN_THREADS.md |
| G1 | The automated player that tests each gate exists only in an old conversation and should be saved as a tool | open | docs/context/OPEN_THREADS.md |
| G2 | The local preview sometimes fails to load one of the game's files, which looks like a broken game until the page is reloaded. The public site is not affected | open | docs/context/OPEN_THREADS.md |
| G4 | Review pictures and sound demos in docs/previews are reachable on the public site. Harmless | open | docs/context/OPEN_THREADS.md |
| G5 | In the 3D view the painted floor appears a few seconds after a gate starts; until then the floor is plain | open | docs/context/OPEN_THREADS.md |
| C1 | The printable status report has been skipped at three wraps to save weekly Claude usage | open | docs/context/OPEN_THREADS.md |
| F6 | In the 3D view the hunter, enemies and bosses are still plain solids, and a few effects (dodge afterimages, light pillars, the menu backdrop) are not drawn | open | docs/context/OPEN_THREADS.md |
