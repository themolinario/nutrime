#!/usr/bin/env bash
#
# Prints the anonymous usage statistics from Supabase.
#
#   npm run stats              # overview
#   npm run stats -- "select …"  # any query, e.g. on public.analytics_events
#
# Needs the Supabase CLI linked to the project and the DB password in
# .env.supabase.local (SUPABASE_DB_PASSWORD).
set -euo pipefail
cd "$(dirname "$0")/.."
set -a; source .env.supabase.local; set +a

q() {
  echo; echo "▶︎ $1"
  supabase db query --linked -o table "$2" 2>/dev/null | grep -v "untrusted data" || true
}

if [[ $# -gt 0 ]]; then
  q "Query" "$1"
  exit 0
fi

q "Ultimi 14 giorni" "select * from public.stats_daily limit 14"
q "Funzioni usate (30 giorni)" "select * from public.stats_features_30d"
q "Schermate (30 giorni)" "select * from public.stats_screens_30d"
q "Percorso (90 giorni)" "select * from public.stats_funnel_90d"
q "Ritorno per settimana di installazione" "select * from public.stats_retention limit 8"
