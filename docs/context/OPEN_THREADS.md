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

All threads below were registered 2026-10-09 at the wrap of Session 3.

---

## Active threads

### Feature

| # | Title | Status | Effort | Blocker | Why deferred |
|---|---|---|---|---|---|
| F1 | Shared leaderboard and co-op play | OPEN | multi-session | Chris's word to start | Chris parked it ("maybe we do that later") when he picked the nine-step V18 plan |

### UX

| # | Title | Status | Effort | Blocker | Why deferred |
|---|---|---|---|---|---|
| U3 | Dress the rooms: no pillars, rubble or props on the floors yet. Done 2026-10-11: stone walls with a lit north face and door posts in 2D. Still thin glowing walls in 3D | OPEN | session | Nothing | Walls first; props need a decision on whether they block movement |
| U5 | The 3D view has no minimap; between rooms it shows only the arrow to the next door | OPEN | min | Nothing | The minimap lives in a 2D drawing script the 3D page does not load |

### Engine

| # | Title | Status | Effort | Blocker | Why deferred |
|---|---|---|---|---|---|
| E1 | Levelling speed: bot runs showed about 5 to 12 levels per gate; slow XP if the skill tree still fills too fast | OPEN | min | A human play-through showing it is a problem | Skill points were already slowed to one per 2 levels (2026-10-09); XP is the next lever |
| E2 | First boss difficulty: a level-1 character that never dodges dies to the first boss | OPEN | min | A human player confirming it is a problem | Found in bot runs only; not confirmed by a person |
| E4 | Dungeon pacing: a gate has one room per wave (4 rooms in the E gate, 9 in the A and S gates) plus the walk between them; no person has played it | OPEN | min | A human play-through | Bot runs only (2026-10-11): a level-40 test hunter cleared the D gate's five rooms and boss |
| E3 | Phone performance: never measured on a real phone | OPEN | session | Chris (or a tester) with a real phone | Matters more once painted layers and the 3D view arrive; V17 only passed emulated touch and a desktop frame-time check |

### Infra / Hygiene

| # | Title | Status | Effort | Blocker | Why deferred |
|---|---|---|---|---|---|
| I1 | Blender install: only needed if real 3D characters are made | OPEN | min | The 3D experiment continuing to real characters; ask Chris before downloading | Not needed for shapes-only 3D |
| I2 | parallax-threejs plugin (three.js debugging help) | OPEN | min | The 3D experiment continuing | Only worth adding if the experiment goes on |
| G1 | Repeatable balance bot in `tools/`: the bot that plays each gate through the `#debug` hook exists only in the session transcript | OPEN | session | Nothing | Not saved when it was written; worth a worker job when balance work resumes |
| G3 | ElevenLabs key cannot list voices: it lacks the "voices read" permission, so `el_voice.py --list` fails | OPEN | min | Chris adding that permission to the key on the ElevenLabs site (optional) | Worked around: voice ids are read from the ElevenLabs connector instead |
| G4 | `docs/previews/` (review frames and audio demos) is served on the public site | OPEN | min | Nothing | Harmless; left in place at the Session 4 wrap to keep the links in the docs working |
| G5 | 3D view shows a plain dark floor for the first seconds of a gate, until the painted floor image has loaded | OPEN | min | Nothing | Seen in the 2026-10-10 camera frames; it was there before the camera job |

### Docs

| # | Title | Status | Effort | Blocker | Why deferred |
|---|---|---|---|---|---|
| C1 | Printable status report (skipped at the Session 3 and Session 4 wraps) | OPEN | min | Weekly Claude usage having room | Skipped twice to save usage (76 percent on 2026-10-09 with two days to the reset) |

---

## Done log (most recent first)

| # | Title | Shipped | Notes |
|---|---|---|---|
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
