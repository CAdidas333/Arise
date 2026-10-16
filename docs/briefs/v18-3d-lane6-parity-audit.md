# Brief: audit — what the 2D view draws that the 3D view does not

## Goal
A written list, not code. The game has two views over the same rules. The 2D view is drawn by `js/11-render-world.js` and
`js/12-render-fx.js` (plus the shared `js/12b-overlay.js`); the 3D view is drawn by `3d/render3d.js` (three.js meshes in
`draw()`, plus a 2D overlay canvas in `drawFx3D()`), with the same shared `js/12b-overlay.js`. The DOM HUD in `index.html`
(health bars, buttons, pop-ups, boss bar) is the same in both views and is NOT part of this audit.

Go through every function in `js/11-render-world.js` and `js/12-render-fx.js` and list every distinct thing the player can
SEE in the 2D view during a gate (rooms, boss arena, endless mode) and on the title/hub screens. For each one, find whether
`3d/render3d.js` shows it, and how.

## Output
Write ONE new file: `docs/briefs/v18-3d-parity-audit.md`, a markdown table with these columns:
`| # | What the player sees in 2D | 2D code (function, approx line) | In 3D? (yes / partly / no) | 3D code or note | Worth adding? (high / medium / low) | Why |`
Rate "worth adding" by how much a player would miss it while fighting: anything that warns of danger, shows a target, a
pickup, a prompt to press a key, or the state of an enemy (health, elite, enraged, stunned) is high; pure decoration is low.
Then, under the table, a short section "Top gaps" listing the high and medium rows in order, each with one sentence on how the
3D view could show it using what `3d/render3d.js` already has (meshes in `draw()`, or 2D drawing on the overlay in
`drawFx3D()` using `toScreen(x, y, h)` and `pxPer(x, y)`).

Things to check carefully (do not stop at these): enemy health bars or rings, elite and boss auras, the stunned/staggered
look, enemy wind-up flashes, projectiles' look, gold/health/gear orbs, shadow remnants and the "[E] ARISE" prompt beside them,
the edge-of-screen arrow to the boss during the boss hunt (2D `drawIndicators`) versus the 3D arrow (it covers between
chambers; does it cover the boss?), the stationary "MOVE!" warning, the low-health red pulse and vignette (`drawPost`),
the floor motes and embers, the open-arena floor marks (`drawArena`), torch light pools in rooms (`drawRoomDetail`), door
posts, the exit glow, the hunter's look states (hit flash, dodge, Awakening glow, counter window), shadow soldiers' look,
the target ring under the squared-up enemy, slash arcs, damage numbers.

## Constraints
- Change NO code. The only file you create is `docs/briefs/v18-3d-parity-audit.md`.
- Every "yes / partly / no" must come from reading the code; quote the function name you found it in. If unsure, write "unsure" and why.
- Keep it under 120 lines.

## Done when
The file exists, every row has all seven columns filled, and the "Top gaps" section is there. Commit nothing yourself.
