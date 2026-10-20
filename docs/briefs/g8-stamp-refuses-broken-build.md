# Brief: `tools/stamp.sh` refuses to stamp a broken build (thread G8)

## Goal
`tools/stamp.sh` refreshes the `?v=` stamp on every script tag (and rebuilds `3d/index.html`) before a commit. Today it stamps
whatever is there, even when a script cannot load. Make it run three checks first and refuse to stamp (print why, exit 1, change
nothing) when any of them fails:
1. **Top-level names declared twice** across the shared global scope: `tools/check_names.sh`. Today it prints `CLASH ...` but
   always exits 0. Make it exit 1 when it prints any CLASH (keep its output exactly as it is), 0 otherwise.
2. **A script that cannot even be parsed**, which is how the 2026-10-18 fault looked (`const b` declared twice inside one
   function in `js/12b-overlay.js`): `node --check <file>` for every `js/*.js` file and for `3d/render3d.js`. A name declared
   twice in the same block is an early error, so `node --check` rejects it.
3. **The game's scripts loading together in Node**: `node -e "require('./tools/lib/headless.js').createGame()"` (exits non-zero
   if any `js/` script throws while loading).

## Exact changes
- `tools/check_names.sh`: in the awk `END` block, after printing, `exit bad` (so a clash gives exit 1). Nothing else changes.
- `tools/stamp.sh`: stays a POSIX `sh` script. After the existing `cd`, before the `sed`, add the three checks in that order. For
  each failure print one line starting `stamp refused:` that says which check failed (for `node --check`, the file name), let the
  tool's own error output show, and `exit 1` before anything is changed. When all pass, stamp exactly as today (same `sed`, then
  `python3 tools/sync3d.py`, then the `grep -c` count). Keep the comment at the top and add one short line saying what it checks.

## Constraints
- Change only `tools/stamp.sh` and `tools/check_names.sh`. No new files, no new dependencies.
- Do NOT leave the repo stamped or changed: your proof runs must end with `git status` showing only your two script edits
  (run `git checkout index.html 3d/index.html js/` after any proof that stamps or breaks files).

## Prove it (do all four, and paste each result in your report)
1. Clean repo: `bash tools/stamp.sh` stamps (prints the count, `16`) and exits 0; then `git checkout index.html 3d/index.html`.
2. A top-level clash: append `const BAG_MAX = 1;` to `js/01-data.js`; `bash tools/stamp.sh` prints `stamp refused:` with the
   CLASH line and exits 1, and `git diff --stat index.html` shows no change; then `git checkout js/01-data.js`.
3. A clash inside a function: in `js/12b-overlay.js`, inside `function drawMinimap()`, add a second line `const L = 1;` right
   after its first line; `bash tools/stamp.sh` prints `stamp refused:` naming `js/12b-overlay.js` and exits 1; `git checkout js/12b-overlay.js`.
4. The same inside `3d/render3d.js` (add `const dt = 1;` as the second line of `function draw()`): refused, naming `3d/render3d.js`;
   then `git checkout 3d/render3d.js`.

## Done when
The two scripts are changed, all four proofs behave as above, and `git status` shows only the two script edits. Commit nothing yourself.
