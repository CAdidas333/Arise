# Open Threads — Arise

> **Append-only register of every open thread on Arise.**
> Items get added when raised. Status flips as work progresses.
> Nothing falls off this list — done items stay with a `✅ DONE YYYY-MM-DD` stamp so we keep the historical trail.
>
> **Read this at every session start (`/uptospeed`).**
> **Update at every wrap (`/wrap`).**
> New thread surfaced in conversation → add it here BEFORE moving on.
>
> The trigger phrase is Chris saying some version of *"not now, but put it on the radar."*
> That sentence means: open a row here before the conversation moves on. A thread that
> only ever lived in a chat transcript is a thread that is already lost.

---

## How to read this

| Field | Meaning |
|---|---|
| **Status** | `OPEN` (untouched), `SCOPING` (being designed), `IN-PROGRESS` (actively built), `BLOCKED` (waiting on X), `DECIDED` (call made, awaiting impl), `✅ DONE` (shipped, with date) |
| **Cat** | `engine`, `feature`, `ux`, `infra`, `hardening`, `enterprise`, `devops`, `hygiene`, `docs` |
| **Effort** | Claude-execution time, NOT developer-day theater. Use `min` (single-tool-call), `session` (one focused chat), `multi-session` (real architectural lift), `?` (unknown until scoped). One human-week of dev work usually = one Claude session. |
| **Blocker** | What unblocks this (a person, another thread, a decision, nothing) |
| **Why deferred** | One line on why this isn't being done right now |

**ID scheme:** one letter per category + a number, never reused — `E1` engine, `F1` feature,
`U1` ux, `I1` infra, `H1` hardening, `D1` devops, `G1` hygiene, `C1` docs.

Threads F1 to F6, U1 to U4, E1 to E3, I1, I2, G1 to G5 and C1 were registered 2026-10-09 to 2026-10-11 (Sessions 3 to 6). Threads F7 to F9, U6, E5, G6 to G8 were registered 2026-10-11 at the wrap of Session 6.

---

## Active threads

### Feature

| # | Title | Status | Effort | Blocker | Why deferred |
|---|---|---|---|---|---|
| F1 | Shared leaderboard and co-op play | OPEN | multi-session | Chris's word to start | Chris parked it ("maybe we do that later") when he picked the nine-step V18 plan |
| F7 | V18 step 8, hand-designed boss fights. First pass (one signature attack per boss, in `js/05-enemies.js` and the `patterns` lists) was with a sub-agent at the Session 6 wrap, not merged. Then phases and arena tricks per boss | IN-PROGRESS | session | Review of the first pass | The last unbuilt step of the V18 plan |
| F9 | 3D view still lacks dodge afterimages, light pillars and the hub backdrop | OPEN | session | Nothing | Left out of the 2026-10-10 effects job and the 2026-10-11 figures job |

### UX

| # | Title | Status | Effort | Blocker | Why deferred |
|---|---|---|---|---|---|
| U3 | Dress the rooms in 3D. The 2D rooms were dressed 2026-10-11 (stone walls with a lit north face, door posts, pilasters, wall torches, floor inlays, rubble, cracks, corridor runners; see the Done log). The 3D rooms still have thin glowing walls and no props | OPEN | session | Nothing | 2D first; props in 2D do not block movement (they are drawn dressing from `layout.decor`), so 3D needs the same call |
| U5 | The 3D view has no minimap; between rooms it shows only the arrow to the next door | OPEN | min | Nothing | The minimap lives in a 2D drawing script the 3D page does not load |
| U6 | The recorded music was picked without a human hearing it (hub take 2, fight take 1, boss take 1, from a classifier's labels). Chris may want to swap takes or have different music made | OPEN | min | Chris listening | He has the six files; the unpicked takes are in `assets/music/takes/` (ignored by git). A swap is: name the track and take, copy the file over `assets/music/<track>.mp3`, stamp, ship |

### Engine

| # | Title | Status | Effort | Blocker | Why deferred |
|---|---|---|---|---|---|
| E1 | Levelling speed: bot runs showed about 5 to 12 levels per gate; slow XP if the skill tree still fills too fast | OPEN | min | A human play-through showing it is a problem | Skill points were already slowed to one per 2 levels (2026-10-09); XP is the next lever |
| E2 | First boss difficulty: a level-1 character that never dodges dies to the first boss | OPEN | min | A human player confirming it is a problem | Found in bot runs only; not confirmed by a person |
| E4 | Dungeon pacing: a gate has one room per wave (4 rooms in the E gate, 9 in the A and S gates) plus the walk between them; no person has played it | OPEN | min | A human play-through | Bot runs only (2026-10-11): a level-40 test hunter cleared the D gate's five rooms and boss |
| E5 | Gear balance: drop rates (22 percent from elites, always from bosses, 1.5 percent from others) and the mod caps are untested by a person, and gear adds power on top of the skill tree, so E1 and E2 may have moved | OPEN | min | A human play-through | `node tools/test_gear.js` checks the rules, not the feel |
| E3 | Phone: never measured or tried on a real phone. Includes frame rate, music memory (two decoded tracks on desktop, one on phones), the two-finger 3D camera (fake touch events only), the armory layout and the result card's share sheet | OPEN | session | Chris (or a tester) with a real phone | Matters more now that the painted layers, recorded music and the 3D view are live; V17 only passed emulated touch and a desktop frame-time check |

### Infra / Hygiene

| # | Title | Status | Effort | Blocker | Why deferred |
|---|---|---|---|---|---|
| I1 | Blender install: only needed if real 3D characters are made | OPEN | min | The 3D experiment continuing to real characters; ask Chris before downloading | Not needed for shapes-only 3D |
| I2 | parallax-threejs plugin (three.js debugging help) | OPEN | min | The 3D experiment continuing | Only worth adding if the experiment goes on |
| G1 | Repeatable balance bot in `tools/`: the bot that plays each gate through the `#debug` hook exists only in the session transcript | OPEN | session | Nothing | Not saved when it was written; worth a worker job when balance work resumes |
| G3 | ElevenLabs key cannot list voices: it lacks the "voices read" permission, so `el_voice.py --list` fails | OPEN | min | Chris adding that permission to the key on the ElevenLabs site (optional) | Worked around: voice ids are read from the ElevenLabs connector instead |
| G4 | `docs/previews/` (review frames and audio demos) is served on the public site | OPEN | min | Nothing | Harmless; left in place at the Session 4 wrap to keep the links in the docs working |
| G5 | 3D view shows a plain dark floor for the first seconds of a gate, until the painted floor image has loaded | OPEN | min | Nothing | Seen in the 2026-10-10 camera frames; it was there before the camera job |
| G6 | ElevenLabs' music terms (elevenlabs.io/music-terms) have not been read in full for this project | OPEN | min | Nothing | Arise is a non-commercial fan game; matters only if it is ever shown or sold beyond that. Noted in `assets/CREDITS.md` |
| G7 | Stale sub-agent worktrees and branches: seven `worktree-agent-*` branches and folders under `.claude/worktrees/` (two locked) all point at commits already merged; the boss job may add another | OPEN | min | The boss job being reviewed first | Safe to remove with `git worktree remove` (unlock the two first) and `git branch -d` once nothing unmerged is left in them |
| G8 | `tools/check_names.sh` is run by hand; run it from `tools/stamp.sh` so a duplicate top-level name is caught on every stamp | OPEN | min | Nothing | A duplicate name (`GEAR_COLORS`) stopped the whole 3D renderer loading on 2026-10-11 and was caught only by a browser test |

### Docs

| # | Title | Status | Effort | Blocker | Why deferred |
|---|---|---|---|---|---|
| C1 | Printable status report (skipped at the Session 3 and Session 4 wraps) | OPEN | min | Weekly Claude usage having room | Skipped twice to save usage (76 percent on 2026-10-09 with two days to the reset) |

---

## Done log (most recent first)

| # | Title | Shipped | Notes |
|---|---|---|---|
| U3 (2D part) | Dress the 2D rooms | ✅ DONE 2026-10-11 | Stone walls with a lit north face and door posts (worker), then pilasters, wall torches, floor inlays, rubble, cracks and corridor runners from a seeded generator cached as `layout.decor` (sub-agent). The 3D part stays open under U3 |
| F6 | 3D view: real figures for the hunter, the six enemy kinds, the six bosses and the shadow soldiers | ✅ DONE 2026-10-11 | Built from three.js primitives in `3d/render3d.js`, shared geometry. Still not drawn in 3D: afterimages, light pillars, the hub backdrop, a minimap (U5) |
| F5 | 3D camera on phones | ✅ DONE 2026-10-11 | Two-finger drag turns, pinch zooms. Checked with fake touch events only, not on a real phone |
| F3 | ElevenLabs music for the game | ✅ DONE 2026-10-11 | Chris approved the cost in chat ($0.15 a minute; nine minutes made). Hub take 2, fight take 1, boss take 1 are live, picked from a classifier's labels, not by ear; Chris can swap. Details in `assets/CREDITS.md` |
| U4 | Warning circles drawn outside a room's walls | ✅ DONE 2026-10-11 | Clipped to the walkable floor in `drawWorld` |
| G2 | Local preview drops connections | ✅ DONE 2026-10-11 | `tools/serve.py`: threaded, deep backlog, no caching, port 8767 (another project took 8765) |
| F4 | 3D view fight effects: damage numbers, slash crescents, rings, lightning, sparks and the screen flash | ✅ DONE 2026-10-10 | Drawn on a transparent overlay by `drawFx3D`. Still not drawn in 3D: afterimages, light pillars, the hub backdrop |
| U2 | A body for each boss that cannot be read as a star symbol | ✅ DONE 2026-10-10 | `drawBoss`; the spiky shape is gone. The statue's first pass had face lines that read as a cross and was sent back |
| F2 | 3D lane: a camera the player can turn (Z and C keys, right-drag, wheel to zoom, V resets), with movement relative to the camera | ✅ DONE 2026-10-10 | Live at `/3d/`. Touch control is thread F5 |
| U1 | Hunter body touch-ups (boots, far blade while running) | ✅ DONE 2026-10-10 | Folded into hunter pass 3: real boots with a toe and heel, far blade steady in a run |
| — | The first-pass 3D experiment was reviewed and shown to Chris (the old blocker on F2) | ✅ DONE 2026-10-09 | He chose to keep both lanes; the 3D view is live at `/3d/` |

---

## Conventions

- **Append, don't delete.** A finished thread flips to `✅ DONE YYYY-MM-DD` and moves to the
  Done log. The historical trail is the point — it answers "did we ever look at this?"
- **Raise it here first.** If it came up in conversation and isn't being done today, it gets a
  row before the session moves on.
- **One line for "why deferred."** Not a justification — a reminder of what was true when the
  call was made, so future-you can tell whether it still holds.
- **Effort is Claude-time, not dev-time.** Estimating in developer-days imports a cost model
  that no longer applies and makes everything look too expensive to start.
