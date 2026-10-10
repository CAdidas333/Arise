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
| F2 | 3D second pass: free mouse-look camera, movement relative to the camera | BLOCKED | session | Chris looking at the frames of the fixed-camera version (`docs/previews/3d_experiment_*_v2.jpg`, branch `worker/v18-3d-spike`) and saying continue | The fixed-camera version is reviewed and tested (2026-10-09); a free camera is only worth building if he wants 3D to go on |
| F3 | ElevenLabs music for the game | BLOCKED | session | Chris saying yes to music (he has now heard the voice and effects in the game and shipped them, 2026-10-09, but has not been asked about music) | The key broker blocks the music script until he says so |

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
| G2 | Local preview drops a connection: the simple Python server once dropped a connection while loading the 13 scripts | OPEN | min | Nothing | Seen again 2026-10-09 (six scripts reset on one reload; a second reload fixed it). Local preview only; the live site has not shown it |
| G3 | ElevenLabs key cannot list voices: it lacks the "voices read" permission, so `el_voice.py --list` fails | OPEN | min | Chris adding that permission to the key on the ElevenLabs site (optional) | Worked around: voice ids are read from the ElevenLabs connector instead |

### Docs

| # | Title | Status | Effort | Blocker | Why deferred |
|---|---|---|---|---|---|
| C1 | Printable status report for the Session 3 wrap | OPEN | min | Houston saying resume | Skipped at the wrap to save usage while sessions are parked |

---

## Done log (most recent first)

| # | Title | Shipped | Notes |
|---|---|---|---|
| _none yet_ | | | |

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
