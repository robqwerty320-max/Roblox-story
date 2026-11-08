#!/usr/bin/env bash
# Parallel, resumable full render for CPU-only (SwiftShader) machines, e.g. Linux cloud.
# Why: with `--concurrency N` all tabs share ONE Chrome GPU process, and SwiftShader there uses ~1 core
# (measured: ~9 s/frame on 4 vCPU). N separate `remotion render` processes = N GPU processes = all cores.
# The video is cut into CHUNK-frame pieces rendered by JOBS workers; finished pieces are kept, so re-running
# the same command after a crash/kill only renders what is missing. Run detached for long renders:
#   setsid nohup scripts/render-parallel.sh > render.txt 2>&1 &
# usage: scripts/render-parallel.sh [composition=BridgeShort] [out=out/bridge/video.mp4] [jobs=nproc] [chunk=75]
set -euo pipefail
COMP="${1:-BridgeShort}"; OUT="${2:-out/bridge/video.mp4}"; JOBS="${3:-$(nproc)}"; CHUNK="${4:-75}"
WORK="${RENDER_WORK:-/tmp/render-parallel}/$COMP"
export TMPDIR="${REMOTION_TMP:-/tmp/remotion-tmp}"
cd "$(dirname "$0")/.."
mkdir -p "$TMPDIR" "$WORK" "$(dirname "$OUT")"
t0=$(date +%s)
# fresh bundle each run (code may have changed); delete $WORK to also drop finished pieces
rm -rf "$WORK/bundle"; npx remotion bundle src/index.ts --out-dir "$WORK/bundle" >/dev/null
TOTAL=$(npx remotion compositions "$WORK/bundle" 2>/dev/null | awk -v c="$COMP" '$1==c{print $4; exit}')
[ -n "$TOTAL" ] || { echo "cannot read frame count of $COMP"; exit 1; }
N=$(( (TOTAL + CHUNK - 1) / CHUNK ))
echo "$COMP: $TOTAL frames, $N chunks of $CHUNK, $JOBS jobs"
: > "$WORK/list.txt"; : > "$WORK/todo.txt"
for ((i=0; i<N; i++)); do
  a=$((i*CHUNK)); b=$(( a + CHUNK - 1 )); (( b >= TOTAL )) && b=$((TOTAL-1))
  f=$(printf "%s/p%04d.mp4" "$WORK" "$i"); echo "file '$f'" >> "$WORK/list.txt"
  [ -s "$f" ] || echo "$i $a $b $f" >> "$WORK/todo.txt"
done
echo "to render: $(wc -l < "$WORK/todo.txt") chunks"
export WORK COMP
# each chunk renders to .part and is renamed only on success, so a killed chunk is never mistaken for done
xargs -P "$JOBS" -L 1 bash -c 'npx remotion render "$WORK/bundle" "$COMP" "${3%.mp4}.part.mp4" --frames=$1-$2 \
  --codec h264 --crf 16 --muted --concurrency 1 --timeout 900000 > "$WORK/log$0.txt" 2>&1 \
  && mv "${3%.mp4}.part.mp4" "$3" && echo "chunk $0 ($1-$2) done $(date +%T)"' < "$WORK/todo.txt" \
  || { echo "some chunks failed, see $WORK/log*.txt; re-run to retry them"; exit 1; }
FF=$(command -v ffmpeg || echo "npx remotion ffmpeg")
$FF -y -loglevel error -f concat -safe 0 -i "$WORK/list.txt" -f lavfi -i anullsrc=r=48000:cl=stereo \
  -map 0:v -map 1:a -c:v copy -c:a aac -shortest -movflags +faststart "$OUT"
echo "done: $OUT in $(( $(date +%s) - t0 )) s"
