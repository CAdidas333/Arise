# Brief: the balance bot walks through L-shaped and notched rooms

Node tooling only: no game file changes. The game is plain JavaScript in `js/*.js`; `tools/balance_bot.js` plays it headless
through `tools/lib/headless.js` and is how we measure difficulty (`node tools/balance_bot.js`). Node built-ins only, no packages.

## The problem
Since 2026-11-01 about half the fight chambers are L-shaped or notched (`shapeRooms`, `roomFloor` in `js/03a-layout.js`). A room
keeps its bounding rectangle (`layout.rooms[i]`: `x0,y0,x1,y1`) and gains `parts` (non-overlapping rectangles whose union is the
floor; neighbouring parts SHARE an edge, they do not overlap), `cover`, `cuts` and `shape`. `layout.rects` is every room's `parts`
then the corridors (`layout.halls`); a corridor overlaps the room it opens into. The bot's pathing (`pathTo`, `walkToRoom`,
`walkToExit`, about lines 62 to 120) only links rectangles that strictly overlap, so:
1. two parts of one room never link (they only touch), so a path that must cross a shaped room is not found;
2. `walkToRoom` aims at the centre of the room's bounding rectangle, which can lie in a cut corner (on no rect), so `pathTo`
   returns null and the bot walks straight at that point;
3. once a room locks, `act` walks straight at the nearest enemy, which in an L can be round the inner corner.
The bot then leans on a wall until it times out ("stuck") or until an enemy happens to come to it.

## Build (all in `tools/balance_bot.js`)
1. `link(a, b)`: true when `a !== b` and the two rectangles overlap, or share an edge with at least 40 units of common length
   (corner-to-corner touching does not count). `pathTo` uses `link` instead of `overlap`.
2. `pathTo` start: when no rect contains the hunter (a margin can leave him a hair outside), use the nearest rect (smallest
   gap distance, like `rectDist` in `js/03a-layout.js`); same for the goal point.
3. `floorPoint(room)`: the centre of the room's largest part (by area), or the bounding centre when `room.parts` is missing.
   `walkToRoom` aims at `floorPoint(layout.rooms[wave])`.
4. `stepToward(layout, x, y, tx, ty)`: the one waypoint function every walk uses. Path from the hunter to the target; if there
   is none or the hunter is already in the target's rect, return the target. Otherwise, with A the hunter's rect and B the next
   rect on the path: let I be their shared region (overlap rectangle, or the shared edge segment); return the centre of I while
   the hunter is more than 24 units from it, else the centre of B. (From a point on B's edge to B's centre stays inside B,
   because B is a rectangle.) `walkToRoom`, `walkToExit` and the locked-room chase in `act` (`else if (tgt)`) all steer to
   `stepToward(...)`; in the locked-room case the target is the enemy's position.
5. Export for tests without running the bot: wrap the run at the bottom so it only runs when called directly
   (`if (require.main === module) { ...existing try/main... }`) and add
   `module.exports = { link, pathTo, floorPoint, stepToward };`. Running `node tools/balance_bot.js` must behave exactly as before.
6. Update the header comment's "BFS over the room and hall rects" line to say rooms' parts and halls, linked by overlap or a
   shared edge.

## Test (new file `tools/test_bot_paths.js`)
Load the layout code the way `tools/test_layout.js` does (read `js/03a-layout.js` with the same two stubs, run it in a `vm`
context) to call `genLayout(nFight, seed)`, and `require('./balance_bot.js')` for the bot's functions.
- `link`: two rects sharing a 100-unit edge link; sharing only a corner do not; sharing a 30-unit edge do not; overlapping link;
  apart do not.
- For seeds 1 to 300 and nFight 2 to 9: for every room whose `shape` is not `'rect'`, pick (seeded, deterministic) 6 pairs of
  points, each point 30 inside a random part of that room. Walk from the first to the second: each tick move 8 units toward
  `stepToward(layout, x, y, tx, ty)`; after every move the point must be inside some rect of `layout.rects` (edges inclusive);
  it must arrive within 12 units of the target in at most 600 ticks. Also walk from the entry room's `floorPoint` to the last
  room's `floorPoint` the same way (this crosses every corridor and shaped room in between; allow 4000 ticks).
- Print the counts (`shaped rooms`, `walks`) and `PASS <cases>` at the end; exit 1 with the seed, room and points on the first
  failure.

## Constraints
- Touch only `tools/balance_bot.js` and the new `tools/test_bot_paths.js`. No change to anything under `js/`, `3d/` or the html.
  Do not run `tools/stamp.sh`.
- Keep the bot's play otherwise identical (dodging, skills, potions, boons, the self-checks, the output table, the flags).
- Match the surrounding style: short functions, a one-line comment on each new function saying what it is for.

## Checks to run (all must pass)
- `node --check tools/balance_bot.js tools/test_bot_paths.js` prints nothing.
- `node tools/test_bot_paths.js` prints `PASS <n>`.
- `node tools/test_layout.js` still ends `PASS 8000`.
- The bot before and after, one skill level, two seeds: run `git stash`-free by comparing against the base commit's file:
  `git show HEAD:tools/balance_bot.js > /tmp/bot_before.js` is NOT allowed (stay inside the worktree): instead copy it to
  `tools/.bot_before.js` with `git show HEAD:tools/balance_bot.js > tools/.bot_before.js`, run
  `node tools/.bot_before.js --seeds 2 --skill 0.5` and `node tools/balance_bot.js --seeds 2 --skill 0.5`, delete
  `tools/.bot_before.js`, and paste both result tables in your final report. The `stuck` column after must be 0 on every row,
  and no row may lose a clear it had before.

## Done when
All six items are in, every check passes, the after table shows no stuck runs, and both tables are in the report. Commit nothing
yourself.
