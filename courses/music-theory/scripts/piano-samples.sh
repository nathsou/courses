#!/usr/bin/env bash
# Builds the course piano (static/piano/) from the Salamander Grand Piano V3 (Alexander Holm, CC BY 3.0).
# Not run in CI. Download SalamanderGrandPianoV3+20161209_44khz16bit.tar.xz from
# https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html, then:
#   scripts/piano-samples.sh path/to/SalamanderGrandPianoV3+20161209_44khz16bit.tar.xz
# Keeps the notes sampled in minor thirds (A0 … C8) at two velocity layers (6 = soft, 12 = loud), mixed to
# mono, trimmed (longer in the bass, where the sound lasts longer) with a short fade, and encoded as MP3.
set -euo pipefail
archive=${1:?usage: piano-samples.sh <archive.tar.xz>}
here=$(cd "$(dirname "$0")/.." && pwd)
out="$here/static/piano"
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT

notes=(A0)
for o in 1 2 3 4 5 6 7; do notes+=("C$o" "D#$o" "F#$o" "A$o"); done
notes+=(C8)
layers=(6 12)

patterns=()
for n in "${notes[@]}"; do for v in "${layers[@]}"; do patterns+=("*/44.1khz16bit/${n}v${v}.wav"); done; done
tar -xJf "$archive" -C "$work" --wildcards "${patterns[@]}"

mkdir -p "$out"
rm -f "$out"/*.mp3
for n in "${notes[@]}"; do
  octave=${n: -1}
  # Seconds kept: 7 s up to octave 2, 5 s for octaves 3–4, 3.5 s above.
  if (( octave <= 2 )); then len=7; elif (( octave <= 4 )); then len=5; else len=3.5; fi
  fade=$(awk "BEGIN { print $len - 0.6 }")
  for v in "${layers[@]}"; do
    src=$(find "$work" -name "${n}v${v}.wav")
    name="${n/\#/s}v${v}.mp3"
    ffmpeg -loglevel error -y -i "$src" -t "$len" -ac 1 -af "afade=t=out:st=${fade}:d=0.6" -codec:a libmp3lame -b:a 96k "$out/$name"
  done
done
du -sh "$out"
