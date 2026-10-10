# Glossary — Arise

## Schemes
| Code pattern | What it is | Example |
|---|---|---|
| S<n> | The nth working session on this project | S3 |
| V<n> | A released version of the game; the number is shown on the title screen | V17 |
| V18 step <n> | One of the nine parts of the V18 upgrade plan Chris approved on 2026-10-09, built and shown one at a time | V18 step 1 |
| v<n>-<name> | A git branch holding a version that is being built and is not on the public site yet | v18-world |
| worker/<name> | A git branch where a free helper model did one job in its own copy of the project. Its work waits there to be reviewed and is merged only if approved | worker/v18-3d-spike |

## Live items
| Code | Plain words | State | Where |
|---|---|---|---|
| V17 | The "Monarch Update": a full rewrite with combo combat, six enemy types, pattern bosses, a skill tree, rewards between waves, an ultimate, an armory, an S-rank gate and an endless mode. With the later play-test fixes and the painted world from V18 step 1, it is what the public link serves today | live | index.html and js/ on main |
| V18 | The next big upgrade: give the game a painted world, a voice, real character art, real dungeons and loot. Nine steps, shown to Chris one at a time | in progress | docs/context/ACTIVE_PROJECTS.md |
| V18 step 1 | Painted floors for all six gates and a painted backdrop behind the title and hub screens. Shipped to the public link on 2026-10-09 | live | main, assets/ |
| V18 step 2 | The System speaks: voiced lines for the big moments and better signature sound effects, made with ElevenLabs. Three test lines are recorded in three voices (Alice, River, Brian) and wait for Chris to pick one; then all 34 lines and 8 sound effects follow. Music stays blocked until he has heard the voice and effects | waiting on Chris | assets/voice/trial/ |
| V18 step 3 | Each shadow soldier looks like the enemy it was and fights the way that enemy fought: archers shoot, casters drop blasts, chargers rush, brutes slam, sappers burst, and boss shadows fire a ring of shots | live | main (shipped 2026-10-09) |
| V18 step 4 | The hunter gets a real body in place of the stick figure, and each boss gets its own look | open | docs/context/ACTIVE_PROJECTS.md |
| V18 step 5 | Real dungeons: generated rooms and corridors to explore, with the open arena kept for boss fights and endless mode | open | docs/context/ACTIVE_PROJECTS.md |
| V18 step 6 | Loot and gear: armour and accessories with rarities, dropped by enemies | open | docs/context/ACTIVE_PROJECTS.md |
| V18 step 7 | A story thread: a scripted opening and a chapter card for each gate | open | docs/context/ACTIVE_PROJECTS.md |
| V18 step 8 | Hand-designed boss fights, each with its own mechanics | open | docs/context/ACTIVE_PROJECTS.md |
| V18 step 9 | A result card you can save or share after a run | open | docs/context/ACTIVE_PROJECTS.md |
| 3D experiment | A side experiment, not part of the nine steps: the same game rules shown from behind the hunter in 3D with simple shapes, to see whether a 3D view is worth pursuing. The camera is fixed in this first pass. It must not go to the public link without Chris's word | built not live | branch worker/v18-3d-spike (3d/index.html) |
| v18-world | The branch where V18 is being built. New steps reach the public link only when Chris says to ship | in progress | git branch v18-world |
| v17-monarch | The branch V17 was built on. It was merged and deployed on 2026-10-09 and is no longer used | closed | git branch v17-monarch |
