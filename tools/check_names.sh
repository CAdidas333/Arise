#!/bin/sh
# Every script shares one global scope, so a top-level name declared twice stops a whole file from loading.
# Lists any top-level const, let, function or class declared in more than one place. Run before shipping a merge.
# (buildFloor and draw are meant to exist twice: the 2D files js/11 and js/12, and 3d/render3d.js, never load together.)
cd "$(dirname "$0")/.." && /usr/bin/grep -oE '^(const|let|var|function|class) +[A-Za-z_$][A-Za-z0-9_$]*' js/*.js 3d/render3d.js \
  | awk -F: '{split($2, a, " "); n[a[2]]++; w[a[2]] = w[a[2]] " " $1} END {for (k in n) if (n[k] > 1 && k != "buildFloor" && k != "draw") {print "CLASH " k ":" w[k]; bad = 1} if (!bad) print "names ok"}'
