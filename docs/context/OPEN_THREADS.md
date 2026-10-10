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
| F3 | ElevenLabs music for the game | BLOCKED | session | Chris saying yes to music (he has now heard the voice and effects in the game and shipped them, 2026-10-09, but has not been asked about music) | The key broker blocks the music script until he says so |
| F4 | 3D view draws only bodies, shots and warning areas: no hit sparks, damage numbers, rings, afterimages, light pillars or hub backdrop | OPEN | session | Nothing | Registered 2026-10-09 when the 3D view shipped as a second lane; the free camera comes first |
| F5 | 3D camera on phones: turning and zooming work with keys, right-drag and the wheel only; there is no touch control | OPEN | min | Nothing | Left out of the free-camera job (2026-10-10) to keep it small; desktop first |

### UX

| # | Title | Status | Effort | Blocker | Why deferred |
|---|---|---|---|---|---|
| U2 | Boss bodies are a spiky many-pointed shape (`enemyPath`, case `boss`); when boss looks are made, give each a body that cannot be read as a star symbol | OPEN | session | Nothing | Noticed 2026-10-10 during the floor-mark check; it is a spiky blob today, not a star symbol, and boss looks (V18 step 4) replace it |

### Engine

| # | Title | Status | Effort | Blocker | Why deferred |
|---|---|---|---|---|---|
| E1 | Levelling speed: bot runs showed about 5 to 12 levels per gate; slow XP if the skill tree still fills too fast | OPEN | min | A human play-through showing it is a problem | Skill points were already slowed to one per 2 levels (2026-10-09); XP is the next lever |
| E2 | First boss difficulty: a level-1 character that never dodges dies to the first boss | OPEN | min | A human player confirming it is a problem | Found in bot runs only; not confirmed by a person |
| E3 | Phone performance: never measured on a real phone | OPEN | session | Chris (or a tester) with a real phone | Matters more once painted layers and the 3D view arrive; V17 only passed emulated touch and a desktop frame-time check |

### Infra / Hygiene

| # | Title | Status | Effort | Blocker | Why deferred |
|---|---|---|---|---|---|
| I1 | Blender install: only needed if real 3D characters are made | OPEN | min | The 3D experiment continuing to real characters; ask Chris before downloading | Not needed for shapes-only 3D |
| I2 | parallax-threejs plugin (three.js debugging help) | OPEN | min | The 3D experiment continuing | Only worth adding if the experiment goes on |
| G1 | Repeatable balance bot in `tools/`: the bot that plays each gate through the `#debug` hook exists only in the session transcript | OPEN | session | Nothing | Not saved when it was written; worth a worker job when balance work resumes |
| G2 | Local preview drops connections: the simple Python server resets some requests when many files load at once (seen with the 13 scripts, and with the 43 sound files on 2026-10-09; again on 2026-10-10, when a dropped script looked like a broken game until the page was reloaded) | OPEN | min | Nothing | Local preview only; the game falls back to audio elements and the public site has not shown it. A threaded local server would fix it |
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
