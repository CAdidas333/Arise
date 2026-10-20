#!/bin/sh
# Refresh the ?v= stamp on every script tag in index.html. Run before committing a change to anything in js/.
# Refuses to stamp unless the names check passes, every script parses, and the scripts load together in node.
cd "$(dirname "$0")/.." || exit 1
sh tools/check_names.sh || { echo "stamp refused: names clash (tools/check_names.sh)"; exit 1; }
for f in js/*.js 3d/render3d.js; do
  node --check "$f" || { echo "stamp refused: cannot parse $f"; exit 1; }
done
node -e "require('./tools/lib/headless.js').createGame()" || { echo "stamp refused: scripts do not load together"; exit 1; }
sed -i '' -E "s/(js\/[0-9a-z-]+\.js)\?v=[0-9]+/\1?v=$(date +%Y%m%d%H%M%S)/g" index.html && python3 tools/sync3d.py && grep -c 'js/.*?v=' index.html
