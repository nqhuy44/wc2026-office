#!/usr/bin/env bash
# Force re-score Belgium-Senegal (M80) using regularTimeHome (correct 90-min score).
# Run on the server after deploying the scoring fix.
#
# Usage: bash scripts/force-rescore-m80.sh <API_BASE_URL> <ADMIN_SESSION_COOKIE>
# Example: bash scripts/force-rescore-m80.sh https://yourdomain.com "connect.sid=s%3A..."
#
# Get the session cookie from your browser DevTools → Application → Cookies after logging in as admin.
set -euo pipefail

API_BASE="${1:-http://localhost:4000}"
COOKIE="${2:-}"

if [[ -z "$COOKIE" ]]; then
  echo "Usage: $0 <API_BASE_URL> <session_cookie>"
  echo "Example: $0 https://yourdomain.com 'connect.sid=s%3A...'"
  exit 1
fi

echo "Step 1: Finding Belgium-Senegal match..."
MATCHES=$(curl -sf -H "Cookie: $COOKIE" "$API_BASE/admin/matches?all=true" 2>/dev/null || \
          curl -sf -H "Cookie: $COOKIE" "$API_BASE/matches?all=true")

# Extract leagueMatchId for Belgium-Senegal
MATCH_ID=$(echo "$MATCHES" | python3 -c "
import sys, json
data = json.load(sys.stdin)
matches = data.get('matches', [])
for m in matches:
    home = m.get('match', {}).get('homeTeam', {}).get('name', '')
    away = m.get('match', {}).get('awayTeam', {}).get('name', '')
    if 'Belgium' in home or 'Belgium' in away or 'Senegal' in home or 'Senegal' in away or 'Sénégal' in home:
        print(f\"Found: {home} vs {away} → leagueMatchId={m['id']}, matchId={m['match']['id']}\")
        print(m['match']['id'])
        break
" 2>/dev/null | tail -1)

if [[ -z "$MATCH_ID" ]]; then
  echo "Could not find Belgium-Senegal match via API."
  echo "Please run check-fix-m80.sql on the DB to get the match ID, then call:"
  echo "  curl -X PUT '$API_BASE/admin/matches/<matchId>/force-rescore' -H 'Cookie: $COOKIE'"
  exit 1
fi

echo "Step 2: Force re-scoring match ID: $MATCH_ID"
curl -sf -X PUT "$API_BASE/admin/matches/$MATCH_ID/force-rescore" \
  -H "Cookie: $COOKIE" \
  -H "Content-Type: application/json" | python3 -m json.tool

echo "Done."
