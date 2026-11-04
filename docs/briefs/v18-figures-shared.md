# Brief: move the enemy and boss figure code into a shared file, so the 3D page's RECORD tab gets pictures too

Plain JavaScript, classic scripts sharing ONE global scope (no modules, no build step), loaded in the order of the
`<script src>` tags in `index.html`. The 3D page (`3d/index.html`) is generated from `index.html` by `tools/sync3d.py` (run by
`tools/stamp.sh`, which you must NOT run): it drops `js/11-render-world.js` and `js/12-render-fx.js` and loads three.js and
`3d/render3d.js` instead. So on the 3D page `recordPic` (the Hunter's Record pictures, `js/11-render-world.js`) does not exist,
and `tabRecord` in `js/09-ui.js` shows no pictures there.

## What the player sees
On the 3D page the RECORD tab (key 7) shows the same 40 px picture beside each enemy and boss as the 2D page does (a dark
silhouette for one never slain). Nothing else changes on either page.

## Build: a move, not a rewrite
1. Create `js/10b-figures.js` with the header comment style of the other files (`'use strict';` and a short banner saying
   "FIGURES — enemy and boss drawing, shared by the 2D and 3D pages (the Record pictures)"). MOVE into it, byte for byte and in
   their current order, exactly these eight top-level definitions from `js/11-render-world.js`, each with the comment lines
   directly above it: `line` (line 7), `disc` (line 8), `enemyPath`, `bossTrim`, `drawBoss`, `drawEnemy`, `RECORD_PICS`,
   `recordPic`. Delete them from `js/11-render-world.js`. Do not change a single character inside them. Nothing else moves.
   (They depend only on each other and on names from earlier files: `ctx`, `canvas`, `TAU`, `COLORS`, `clock` and the like;
   check with `grep` that every name they use is defined in `js/01` to `js/10` or in the new file, and list any that is not in
   your report instead of moving more.)
2. `index.html`: add `<script src="js/10b-figures.js?v=` + the same stamp number the other tags carry + `"></script>` on its own
   line directly after the `js/10-actions.js` tag and before `js/11-render-world.js`. Touch nothing else in `index.html`.
3. `js/09-ui.js` `tabRecord`: the comment `// the 3D page has no 2D figures, so no pictures there` becomes
   `// both pages load js/10b-figures.js; a picture that cannot be drawn leaves the row without one`. Keep the
   `typeof recordPic === 'function'` guard as it is.
4. `tools/sync3d.py` docstring: "the two 2D drawing scripts are swapped" stays true; add one sentence: "js/10b-figures.js (the
   enemy and boss figures) loads on both pages, for the Record pictures." Do not change its code.
5. `CLAUDE.md` line "`index.html` plus `js/` (16 classic scripts, loaded in order)": 16 becomes 17.

## Test
Add to `tools/test_record.js`, at the end before the PASS line, a check that needs no browser:
- read `index.html`, list the `<script src="js/...">` files in order: `js/10b-figures.js` is present, after `js/10-actions.js`
  and before `js/11-render-world.js`;
- run the same transform `tools/sync3d.py` makes on the script tags (drop the `js/11-render-world.js` and `js/12-render-fx.js`
  tags) and confirm `js/10b-figures.js` is still in the list;
- `js/11-render-world.js` no longer defines any of the eight names, and `js/10b-figures.js` defines all eight
  (match `^(const|let|function) +NAME\b`).
Count each as a case, as the file does now.

## Constraints
- Touch only `js/10b-figures.js` (new), `js/11-render-world.js`, `js/09-ui.js` (the one comment), `index.html` (the one tag),
  `tools/sync3d.py` (docstring), `CLAUDE.md` (the count) and `tools/test_record.js`. Do NOT edit `3d/index.html` or
  `3d/render3d.js`; do NOT run `tools/stamp.sh` or `tools/sync3d.py`.
- A move only: no renames, no reformatting, no "improvements" to the moved code.

## Checks to run (all must pass)
- `bash tools/check_names.sh` prints `names ok`; `node --check js/10b-figures.js js/11-render-world.js js/09-ui.js` prints nothing.
- `node -e "require('./tools/lib/headless.js').createGame()"` exits without an error (it loads the scripts in `index.html` order).
- `node tools/test_record.js` prints `PASS <n>` with n above 156; `node tools/test_titles.js`, `node tools/test_army.js`,
  `node tools/test_shadow_style.js`, `node tools/test_layout.js` (ends `PASS 8000`) pass.
- Prove it is a pure move: `git diff --stat` shows `js/11-render-world.js` losing the same number of lines (give or take the
  blank lines between definitions) that `js/10b-figures.js` has minus its header; paste that stat in your report.

## Done when
All five items are in and every check passes. Commit nothing yourself.
