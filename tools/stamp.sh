#!/bin/sh
# Refresh the ?v= stamp on every script tag in index.html. Run before committing a change to anything in js/.
cd "$(dirname "$0")/.." && sed -i '' -E "s/(js\/[0-9a-z-]+\.js)\?v=[0-9]+/\1?v=$(date +%Y%m%d%H%M)/g" index.html && grep -c 'js/.*?v=' index.html
