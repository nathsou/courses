#!/bin/sh
# Regenerate everything derived from the content after adding lessons or words:
# character readings, stroke data, character components and the font subset.
#   sh scripts/refresh.sh path/to/complete.json path/to/LXGWWenKai-Regular.ttf [path/to/dictionary.txt]
# (complete.json: github.com/drkameleon/complete-hsk-vocabulary; the font: github.com/lxgw/LxgwWenKai/releases;
# dictionary.txt: github.com/skishore/makemeahanzi, downloaded if omitted)
set -e
cd "$(dirname "$0")/.."
node --experimental-strip-types scripts/build-lexicon.ts "$1"
node --experimental-strip-types scripts/copy-strokes.ts
node --experimental-strip-types scripts/build-components.ts $3
python3 scripts/subset-font.py "$2"
