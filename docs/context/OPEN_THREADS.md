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
| F12 | Boss fights by a human hand (new 2026-10-15): three phases, a scripted move at 50 and 25 percent, floor patches that stay (webs slow, fire and blood burn, rubble slows), on top of the signature attacks and bosses using patterns up close. Bot runs and browser checks only; the bot still clears every gate with no deaths, because bosses fall fast (the shadows do most of the boss damage, thread E1). Also for Chris's eye against his art rule: the Statue of God's sweeping eye-beam (made cold blue, one beam at a time, so it never reads as a fan of rays; `docs/previews/step8_statue_eye_beam_3d_v1.jpg`) | OPEN | min | Chris or a tester playing a boss | Chris said 2026-10-12 not to make enemies hit harder before he has played; ask how the fights feel before tuning |

### UX

| # | Title | Status | Effort | Blocker | Why deferred |
|---|---|---|---|---|---|
| U6 | The recorded music was picked without a human hearing it (hub take 2, fight take 1, boss take 1, from a classifier's labels). Chris may want to swap takes or have different music made | OPEN | min | Chris listening | He has the six files; the unpicked takes are in `assets/music/takes/` (ignored by git). A swap is: name the track and take, copy the file over `assets/music/<track>.mp3`, stamp, ship |
| U12 | Edge arrow and minimap share the top-right corner: when the boss or the next door is up and to the right, the arrow and its distance land on the minimap (both views, `drawIndicators` in 2D, `edgeArrow` in 3D). On upright phones the boss name ends exactly where the minimap starts (0 pixels apart at 440 by 762) | OPEN | min | Nothing | Found 2026-10-16 in the 3D parity frames; it was the same in 2D before. Fix: keep the arrow out of the minimap box, and move the minimap down a few pixels on upright phones |
| U13 | 3D parity, low-priority leftovers from `docs/briefs/v18-3d-parity-audit.md`: floor motes and embers in a gate, the plain dark vignette, torch pools of light on the floor, darkened corridors and unreached rooms, ground shadows under the hunter and enemies, telegraph outlines, the classic hunter look in 3D | OPEN | session | Nothing | Decoration only; every warning, target and prompt is in 3D since 2026-10-16 (U11) |

### Engine

| # | Title | Status | Effort | Blocker | Why deferred |
|---|---|---|---|---|---|
| E1 | Too easy (Chris's biggest concern, 2026-10-12). Levelling was halved on 2026-10-12 (`XP_PACE = 2` in `js/01-data.js`): a bot now needs about 32 gate runs and 24 minutes of fighting to fill the skill tree (was 17 runs and 14 minutes). Still open: nothing kills the bot. A bot that dodges half of the warned attacks died 0 times in a 32-run career, and one that never dodges died once; every gate clears in about a minute at its own level; at the S gate the shadows still do about 70 percent of the damage to the boss | OPEN | session | Chris and his testers playing the army change first | Three difficulty changes went in on 2026-10-12 (boss patterns up close, the army is called, slower levels); the next lever is enemy damage or shadow damage per level (`shadowDmg`: 3 percent a level). Measure with `node tools/balance_bot.js` |
| E2 | First boss difficulty: a level-1 character that never dodges dies to the first boss | OPEN | min | A human player confirming it is a problem | Found in bot runs only; not confirmed by a person |
| E4 | Dungeon pacing: a gate has one room per wave (4 rooms in the E gate, 9 in the A and S gates) plus the walk between them; no person has played it | OPEN | min | A human play-through | Bot runs only (2026-10-11): a level-40 test hunter cleared the D gate's five rooms and boss |
| E5 | Gear balance: drop rates (22 percent from elites, always from bosses, 1.5 percent from others) and the mod caps are untested by a person, and gear adds power on top of the skill tree, so E1 and E2 may have moved | OPEN | min | A human play-through | `node tools/test_gear.js` checks the rules, not the feel |
| E3 | Phone: never measured or tried on a real phone. Includes frame rate, music memory (two decoded tracks on desktop, one on phones), the two-finger 3D camera (fake touch events only), the armory layout and the result card's share sheet | OPEN | session | Chris (or a tester) with a real phone | Matters more now that the painted layers, recorded music and the 3D view are live; V17 only passed emulated touch and a desktop frame-time check |

### Infra / Hygiene

| # | Title | Status | Effort | Blocker | Why deferred |
|---|---|---|---|---|---|
| I1 | Blender install: only needed if real 3D characters are made | OPEN | min | The 3D experiment continuing to real characters; ask Chris before downloading | Not needed for shapes-only 3D |
| I2 | parallax-threejs plugin (three.js debugging help) | OPEN | min | The 3D experiment continuing | Only worth adding if the experiment goes on |
| G3 | ElevenLabs key cannot list voices: it lacks the "voices read" permission, so `el_voice.py --list` fails | OPEN | min | Chris adding that permission to the key on the ElevenLabs site (optional) | Worked around: voice ids are read from the ElevenLabs connector instead |
| G4 | `docs/previews/` (review frames and audio demos) is served on the public site | OPEN | min | Nothing | Harmless; left in place at the Session 4 wrap to keep the links in the docs working |
| G6 | ElevenLabs' music terms (elevenlabs.io/music-terms) have not been read in full for this project | OPEN | min | Nothing | Arise is a non-commercial fan game; matters only if it is ever shown or sold beyond that. Noted in `assets/CREDITS.md` |
| G8 | `tools/check_names.sh` is run by hand; run it from `tools/stamp.sh` so a duplicate top-level name is caught on every stamp | OPEN | min | Nothing | A duplicate name (`GEAR_COLORS`) stopped the whole 3D renderer loading on 2026-10-11 and was caught only by a browser test |

### Docs

| # | Title | Status | Effort | Blocker | Why deferred |
|---|---|---|---|---|---|
| C1 | Printable status report (skipped at the Session 3, 4, 5 and 6 wraps) | OPEN | min | Weekly Claude usage having room | Skipped twice to save usage (76 percent on 2026-10-09 with two days to the reset) |

---

## Done log (most recent first)

| # | Title | Shipped | Notes |
|---|---|---|---|
| F13 | A better backpack (Kevin's four ideas, relayed by the KevinNotary session, approved by Chris 2026-10-16) | ✅ DONE 2026-10-16 | The bag holds 24 (`BAG_MAX`, was 12); SELL ALL WEAKER THAN EQUIPPED (`sellWeakerGear`, replaced SELL ALL COMMON); an UPGRADE tag on bag items that beat the worn item or fill an empty slot, and a count on the ARMORY tab; entering a gate or endless mode with a full bag asks first (ENTER ANYWAY, OPEN ARMORY, BACK; `gateAsk`, `askGate`). Strength is `gearScore`: each mod as a share of its cap, summed (`gearBetter`, `gearWeaker` in `js/01-data.js`). One Gemini pass, accepted; by hand after: the tag moved to the slot line (it ran into the buttons on phones), the question scrolled into view, the buttons wrap. `node tools/test_gear.js` covers the new rules. Browser: both views, every path. Frames: `backpack_upgrade_tags_v1.jpg`, `backpack_full_ask_v1.jpg`. Kevin told through the KevinNotary session |
| U11 | 3D view shows every warning, target and prompt the 2D view shows | ✅ DONE 2026-10-16 | From a parity audit (`docs/briefs/v18-3d-parity-audit.md`, free OpenCode model): enemy health bars, the "[E] ARISE" prompt, the edge arrow to the boss during the hunt, the low-health red edge and pulse and the violet Awakening edge, elite and boss aura arcs, glowing shots and crescent waves, the invulnerability blink, the light under the hunter (violet and wider when Awakened), gear and remnant glows. One free-worker pass (OpenCode; Gemini was out of quota; it ran its full 30 minutes with everything done), accepted with no changes. The 3D minimap was checked at 440 by 762 with a phone's touch layout: nothing overlaps it. Frames: `3d_parity_prompt_lowhp_v1.jpg`, `3d_parity_shots_boss_arrow_v1.jpg` |
| U3 | Dress the rooms in 3D | ✅ DONE 2026-10-15 | Thick stone walls (30 thick, 70 high) with a lit top edge, brighter on north walls; walls on the camera side fade to 0.18 so the hunter is never hidden (turns with the camera); pilasters, torches with a soft glow (no real lights), rubble, cracks, inlays and runners built in 3D from the same `layout.decor` data as 2D (`buildLayoutDecor` moved to `js/03a-layout.js`). One free-worker pass, accepted; by hand after: instance buffers freed on each rebuild, cracks softer, a round glow texture for the torches. Wall ends at doorways read as door posts, as in 2D (they stand 30 into a corridor mouth; drawing only). Frame: `docs/previews/3d_walls_room_dressing_v1.jpg` |
| F7 | V18 step 8, hand-designed boss fights | ✅ DONE 2026-10-15 | First pass (one signature attack per boss) public 2026-10-12, bosses use patterns up close 2026-10-12. 2026-10-15: a third phase at 25 percent ("LAST STAND"), a scripted move at each phase change (`bossPhaseMove` in `js/05-enemies.js`): Spider Queen webs the floor, then a nine-egg clutch that all hatch; Orc Chieftain war cry with two elite orcs, then a five-jump pound chain; Death Knight raises two elites, then crossing sword lanes in a grid; Demon Lord a ring of fire round the arena for 30 seconds, then a second ring inside it; Ancient Dragon fire rain, then a firestorm; Statue of God a sweeping eye-beam, then two. Arena tricks on the signature attacks: brood eggs that do not hatch leave webs, pounds leave rubble, cleave lanes leave blood, the firewall's back row and the breath's edges leave fire. Built on a new zone system (`addZone`, a telegraph's `zone` field, `updateZones`, `zoneSlow`; drawn by `drawZone` in 2D and `zoneMeshes` in 3D). Two free-worker jobs, each accepted on pass 1; by hand after: rubble stones lighter, the Statue beam cold blue with a shorter warning. Browser: every boss reached phases 2 and 3 in both views with no errors. Frames: `docs/previews/step8_*_v1.jpg`. Not played by a person (thread F12) |
| F9 | 3D view: dodge afterimages, light pillars, the hub backdrop | ✅ DONE 2026-10-15 | Afterimages are cyan silhouettes on the 3D overlay; every Arise raises a purple column of light (`pillarFx`); the title and hub show the same gate backdrop as 2D (`drawPortal` and `drawMotes` moved to the shared `js/12b-overlay.js`). One free-worker pass (it ran into its 20-minute limit with everything done). Frames: `3d_dodge_afterimages_v1.jpg`, `3d_minimap_arise_pillar_v1.jpg`, `3d_title_backdrop_v1.jpg` |
| U5 | 3D view minimap | ✅ DONE 2026-10-15 | `drawMinimap` moved to the shared `js/12b-overlay.js` (16th script) and drawn on the 3D overlay; it turns with the camera, so up on the map is away from the camera. In 2D it is unchanged except that it is always clipped to its box |
| G5 | 3D floor plain dark for the first seconds of a gate | ✅ DONE 2026-10-15 | Every gate's floor texture loads at start into a cache (`warmFloor`, `floorTexCache` in `3d/render3d.js`) and is applied at once when a gate starts |
| F11 | The hunter squares up to his enemy (Chris, 2026-10-12: fights were trading blows or running in circles because he faced the way he moved) | ✅ DONE 2026-10-12 | Near an enemy (260 pixels, 420 for a boss) the hunter faces it whichever way he moves (`lockTarget`, `player.target`); a dodge with no stick input steps back; a dodge in the last 0.3 seconds before a hit, whether it lands on the dodge or the dodge carries him out of it (`slipped`), opens a 1.6-second Counter on the next slash (closes the gap, 2.2 times the damage on top of the critical hit, staggers; a boss at most once every 4 seconds); ordinary melee enemies wind up for 0.45 seconds with a closing red ring; a plain ring marks the target in both views. Mouse aim on desktop is unchanged. One free-worker pass, accepted; by hand after it: `slipped` (stepping back made the swing miss, so the counter almost never opened), the counter's text only when it hits, the mark at the feet, the Controls text. Browser: both views. Frames: `docs/previews/square_up_2d_v1.jpg`, `_3d_v1.jpg`. Nobody has played it by hand: the feel is unverified |
| G1 | Repeatable balance bot | ✅ DONE 2026-10-12 | `node tools/balance_bot.js` plays every gate in node (no browser) with a scripted hunter at three dodge levels and prints clear rate, waves, time, levels gained, damage taken, deaths; then an endless block and the skill tree total. Same output every run; about 18 seconds. `tools/lib/headless.js` loads the game's scripts with stubs. Free worker, two passes: the first was rejected because every row played the E gate; the bot now stops with BOT ERROR if the gate played is not the gate asked for. `sim()` takes a hunter to carry across runs (a career); the career script used for the XP numbers is in the session scratchpad only (`career.js`) |
| F10 | The army is called, it does not follow all the time (Chris's idea with Kevin's change) | ✅ DONE 2026-10-12 | Three shadows (the weakest of the deployed set) walk with the hunter; Arise: Legion calls the rest of the deployed set for its 12 seconds and its cooldown now starts when the call ends; the Awakening calls the whole roster (up to 40). `shadowRole`, `syncShadowField`, `ESCORT_SIZE` in `js/07-skills-shadows.js`; test `node tools/test_army.js` (PASS 570). One free-worker run, accepted; one line fixed by hand (a newly raised shadow no longer makes a stray pillar beside the hunter). Browser: 3, then 6, then 40, then 3 in both views. Not measured on a phone: 40 shadows cost about 5 ms a frame on the Mac against under 1 ms for three. Frame: `docs/previews/army_call_awakening_3d_v1.jpg` |
| U9 | Testers' notes, 2026-10-12 (Isaak, Kevin): no way to use potions on a phone; the raise-a-shadow wisps are not explained | ✅ DONE 2026-10-12 | The phone potion button was already there (the top-left of the skill buttons) but read as a plain plus: it is now pink with the number left. A one-line hint says how to raise a shadow, once a gate, until the hunter has done it once (`player.story.arose`). Isaak also asked whether the strongest shadows are fielded automatically: they are (`deployShadows` sorts by damage). Kevin asked for equipment: it is already live (gems, ARMORY tab) |
| U8 | A wide pop-up covered part of the combo number on upright phones | ✅ DONE 2026-10-12 | On upright phones (portrait, up to 520 wide) the combo counter now sits beside the stat bars (210 pixels from the left, 64 from the top, number at 32 pixels), above the pop-ups (`index.html`). Left as it is: pop-ups still cover the run's boon icons while they show, and on a 375-wide phone a three-digit combo touches the 2D minimap's edge by 11 pixels. Frame: `docs/previews/combo_beside_stat_bars_v1.jpg` |
| U7 | Boss name and health bar on upright phones | ✅ DONE 2026-10-12 | Chris's recording (440 by 762 in Chrome on his phone) showed the bar just above the hunter, on top of the boss when it is close. On upright phones (portrait, up to 520 wide) the health is now a thin strip along the top edge and the name sits under the gate label (`index.html`). Other layouts unchanged. Frames: `docs/previews/boss_bar_top_strip_2d_v1.jpg`, `_3d_v1.jpg`. Not yet seen by Chris on his phone |
| G7 | Stale sub-agent worktrees and branches | ✅ DONE 2026-10-11 | All seven `worktree-agent-*` folders and their merged branches were removed at about 21:20 by Session 6; confirmed 2026-10-12 with `git worktree list` (only the main checkout) and `git branch -a` |
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
