#!/usr/bin/env bash
# Records one clip of the iOS simulator while a Maestro flow drives the app.
#   ./record.sh <flow.yaml> <out.mov>
set -euo pipefail
DEVICE="${DEVICE:-6FEBDEDD-C7E0-4A4A-8C08-9853FF5B11BE}"
xcrun simctl io "$DEVICE" recordVideo --codec=h264 --force "$2" &
REC=$!
sleep 1.5
maestro --device "$DEVICE" test "$1" >/dev/null 2>&1 || echo "⚠️ flow $1 non completato"
sleep 1
kill -INT $REC; wait $REC 2>/dev/null || true
