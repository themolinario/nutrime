#!/usr/bin/env bash
#
# Runs the Maestro suite against a freshly installed NutriMy on an iOS simulator.
#
#   scripts/e2e.sh [--build] [--device "iPhone 17 Pro"] [--pdf path/to/diet.pdf] [flow.yaml]
#
# The flows drive a real import, so the PDF is copied into the app's Documents
# folder where the iOS file picker can reach it. Pass --build to compile a fresh
# Release app first; otherwise the last build in DerivedData is reused.
set -euo pipefail

APP_ID="com.marcomolinari.nutrime"
DEVICE="iPhone 17 Pro"
PDF="${NUTRIME_TEST_PDF:-$HOME/Downloads/Molinari  Marco - Dieta a scelta multipla - 20260907.pdf}"
BUILD=0
FLOW=".maestro"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build) BUILD=1; shift ;;
    --device) DEVICE="$2"; shift 2 ;;
    --pdf) PDF="$2"; shift 2 ;;
    *) FLOW="$1"; shift ;;
  esac
done

cd "$(dirname "$0")/.."

if [[ ! -f "$PDF" ]]; then
  echo "❌ PDF di prova non trovato: $PDF" >&2
  echo "   Passa --pdf <file> oppure imposta NUTRIME_TEST_PDF." >&2
  exit 1
fi

echo "▶︎ Simulatore: $DEVICE"
xcrun simctl boot "$DEVICE" 2>/dev/null || true
xcrun simctl bootstatus "$DEVICE" -b >/dev/null 2>&1 || true

if [[ $BUILD -eq 1 ]]; then
  echo "▶︎ Build Release"
  npx expo run:ios --configuration Release --device "$DEVICE" --no-bundler >/dev/null
fi

APP_PATH=$(find "$HOME/Library/Developer/Xcode/DerivedData" -type d \
  -path "*Release-iphonesimulator*" -name "NutriMy.app" -print -quit)
if [[ -z "$APP_PATH" ]]; then
  echo "❌ Nessuna build Release trovata. Riesegui con --build." >&2
  exit 1
fi
echo "▶︎ App: $APP_PATH"

# A clean install guarantees the flows start from the import screen.
echo "▶︎ Reinstallazione pulita"
xcrun simctl terminate "$DEVICE" "$APP_ID" 2>/dev/null || true
xcrun simctl uninstall "$DEVICE" "$APP_ID" 2>/dev/null || true
xcrun simctl install "$DEVICE" "$APP_PATH"

# The container only exists once the app is installed; the picker reads Documents.
CONTAINER=$(xcrun simctl get_app_container "$DEVICE" "$APP_ID" data)
mkdir -p "$CONTAINER/Documents"
cp "$PDF" "$CONTAINER/Documents/Dieta.pdf"
echo "▶︎ PDF di prova: $CONTAINER/Documents/Dieta.pdf"

echo "▶︎ Maestro: $FLOW"
maestro test "$FLOW"
