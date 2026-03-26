#!/bin/bash
# Valance Backend Smoke Test — hits every endpoint, validates responses
set -e

BASE="http://localhost:3000/api/v1"
ALICE="cf8381f0-3a96-4f28-ac15-f9d7b4a9e1bb"
BOB="cd12a4ef-7cea-4ff3-94b6-54efefeb02c7"
CHARLIE="f58fff88-13ad-44c8-929e-632469cae977"

PASS=0
FAIL=0
TOTAL=0

check() {
  local name="$1"
  local expected_status="$2"
  local response="$3"
  local http_code="$4"
  TOTAL=$((TOTAL + 1))

  if [ "$http_code" = "$expected_status" ]; then
    # Check if response is valid JSON
    echo "$response" | python3 -m json.tool > /dev/null 2>&1
    if [ $? -eq 0 ]; then
      PASS=$((PASS + 1))
      echo "  ✓ $name (HTTP $http_code)"
    else
      FAIL=$((FAIL + 1))
      echo "  ✗ $name — invalid JSON response"
      echo "    Response: $(echo "$response" | head -c 200)"
    fi
  else
    FAIL=$((FAIL + 1))
    echo "  ✗ $name — expected HTTP $expected_status, got $http_code"
    echo "    Response: $(echo "$response" | head -c 200)"
  fi
}

request() {
  local method="$1"
  local url="$2"
  local user="$3"
  local data="$4"

  if [ -n "$data" ]; then
    local result=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "X-Dev-User-Id: $user" \
      -H "Content-Type: application/json" \
      -d "$data" \
      "$BASE$url")
  else
    local result=$(curl -s -w "\n%{http_code}" -X "$method" \
      -H "X-Dev-User-Id: $user" \
      "$BASE$url")
  fi

  local http_code=$(echo "$result" | tail -1)
  local body=$(echo "$result" | sed '$d')
  echo "$body"
  echo "---HTTP---$http_code"
}

run() {
  local name="$1"
  local expected="$2"
  local method="$3"
  local url="$4"
  local user="$5"
  local data="$6"

  local output=$(request "$method" "$url" "$user" "$data")
  local body=$(echo "$output" | sed '/^---HTTP---/d')
  local code=$(echo "$output" | grep "^---HTTP---" | sed 's/---HTTP---//')

  check "$name" "$expected" "$body" "$code"

  # Return body for chaining
  echo "$body" > /tmp/smoke_last_response.json
}

echo "=================================="
echo "  VALANCE BACKEND SMOKE TEST"
echo "=================================="
echo ""

# =================== HEALTH ===================
echo "--- Health ---"
output=$(curl -s -w "\n%{http_code}" http://localhost:3000/health)
code=$(echo "$output" | tail -1)
body=$(echo "$output" | sed '$d')
check "GET /health" "200" "$body" "$code"

# =================== USERS ===================
echo ""
echo "--- Users ---"
run "GET /users/me" "200" "GET" "/users/me" "$ALICE"
run "GET /users/:id/profile" "200" "GET" "/users/$BOB/profile" "$ALICE"
run "PATCH /users/me/settings" "200" "PATCH" "/users/me/settings" "$ALICE" '{"timezone":"Asia/Kolkata","persona_type":"achiever"}'
run "PATCH /users/me/equip (default theme)" "200" "PATCH" "/users/me/equip" "$ALICE" '{"theme":"nocturnal"}'

# =================== HABITS ===================
echo ""
echo "--- Habits ---"

# Clean up any existing habits first
run "GET /habits (list)" "200" "GET" "/habits" "$ALICE"

# Create habits for Alice
run "POST /habits (create #1)" "200" "POST" "/habits" "$ALICE" '{"name":"Morning Run","intensity":"intense","tracking_method":"manual","visibility":"full"}'
HABIT1=$(cat /tmp/smoke_last_response.json | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null || echo "")

run "POST /habits (create #2)" "200" "POST" "/habits" "$ALICE" '{"name":"Read 30 pages","intensity":"light","tracking_method":"manual","visibility":"minimal"}'
HABIT2=$(cat /tmp/smoke_last_response.json | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null || echo "")

run "GET /habits (list after create)" "200" "GET" "/habits" "$ALICE"
run "PATCH /habits/:id (update)" "200" "PATCH" "/habits/$HABIT1" "$ALICE" '{"name":"Morning Run 5km","redirect_url":"https://strava.com"}'

# Complete habit
run "POST /habits/:id/complete" "200" "POST" "/habits/$HABIT1/complete" "$ALICE"
run "POST /habits/:id/complete (idempotent)" "200" "POST" "/habits/$HABIT1/complete" "$ALICE"

# Miss habit
run "POST /habits/:id/miss" "200" "POST" "/habits/$HABIT2/miss" "$ALICE" '{"reason_category":"no_energy","reason_text":"long day at work"}'

# Logs
run "GET /habits/:id/logs (week)" "200" "GET" "/habits/$HABIT1/logs?range=week" "$ALICE"
run "GET /habits/:id/logs (month)" "200" "GET" "/habits/$HABIT1/logs?range=month" "$ALICE"

# Create habits for Bob + Charlie
run "POST /habits (Bob)" "200" "POST" "/habits" "$BOB" '{"name":"Solve LeetCode","intensity":"moderate","tracking_method":"manual","visibility":"full"}'
BOB_HABIT=$(cat /tmp/smoke_last_response.json | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null || echo "")

run "POST /habits (Charlie)" "200" "POST" "/habits" "$CHARLIE" '{"name":"Meditate","intensity":"light","tracking_method":"manual","visibility":"full"}'

# =================== GROUPS ===================
echo ""
echo "--- Groups ---"

run "POST /groups (create)" "200" "POST" "/groups" "$ALICE" '{"name":"Morning Warriors"}'
GROUP_ID=$(cat /tmp/smoke_last_response.json | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null || echo "")
INVITE_CODE=$(cat /tmp/smoke_last_response.json | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['inviteCode'])" 2>/dev/null || echo "")

run "POST /groups/:id/join (Bob)" "200" "POST" "/groups/$GROUP_ID/join" "$BOB" "{\"invite_code\":\"$INVITE_CODE\"}"
run "POST /groups/:id/join (Charlie)" "200" "POST" "/groups/$GROUP_ID/join" "$CHARLIE" "{\"invite_code\":\"$INVITE_CODE\"}"

run "GET /groups/:id" "200" "GET" "/groups/$GROUP_ID" "$ALICE"
run "GET /groups/:id/members" "200" "GET" "/groups/$GROUP_ID/members" "$ALICE"
run "GET /groups/:id/streak" "200" "GET" "/groups/$GROUP_ID/streak" "$ALICE"
run "GET /groups/:id/feed" "200" "GET" "/groups/$GROUP_ID/feed" "$ALICE"
run "GET /groups/:id/leaderboard (week)" "200" "GET" "/groups/$GROUP_ID/leaderboard?period=week" "$ALICE"
run "GET /groups/:id/leaderboard (month)" "200" "GET" "/groups/$GROUP_ID/leaderboard?period=month" "$ALICE"

# =================== SOCIAL ===================
echo ""
echo "--- Social ---"

# Complete all of Alice's habits first (required for nudging)
run "POST complete habit #2 (Alice)" "200" "POST" "/habits/$HABIT2/complete" "$ALICE"

# Now Alice can nudge Bob
run "POST /nudge (Alice→Bob)" "200" "POST" "/nudge" "$ALICE" "{\"receiver_id\":\"$BOB\",\"group_id\":\"$GROUP_ID\"}"

# Kudos
run "POST /kudos (Bob→Alice)" "200" "POST" "/kudos" "$BOB" "{\"receiver_id\":\"$ALICE\",\"group_id\":\"$GROUP_ID\"}"

# Nudge rate limit — Alice already nudged Bob, can't again
run "POST /nudge (duplicate blocked)" "429" "POST" "/nudge" "$ALICE" "{\"receiver_id\":\"$BOB\",\"group_id\":\"$GROUP_ID\"}"

# Bob hasn't completed habits — can't nudge
run "POST /nudge (Bob incomplete)" "400" "POST" "/nudge" "$BOB" "{\"receiver_id\":\"$ALICE\",\"group_id\":\"$GROUP_ID\"}"

# =================== FREEZE ===================
echo ""
echo "--- Freeze ---"

run "POST /groups/:id/freeze" "200" "POST" "/groups/$GROUP_ID/freeze" "$ALICE"

# =================== SHOP ===================
echo ""
echo "--- Shop ---"

run "GET /shop/items" "200" "GET" "/shop/items" "$ALICE"
run "GET /shop/items?category=theme" "200" "GET" "/shop/items?category=theme" "$ALICE"
run "GET /shop/items?category=flame" "200" "GET" "/shop/items?category=flame" "$ALICE"

# Purchase
run "POST /shop/purchase (blue flame)" "200" "POST" "/shop/purchase/flame-blue" "$ALICE"
run "POST /shop/purchase (already owned)" "409" "POST" "/shop/purchase/flame-blue" "$ALICE"

# =================== PLUGINS ===================
echo ""
echo "--- Plugins ---"

run "GET /plugins" "200" "GET" "/plugins" "$ALICE"
run "POST /plugins/:id/connect (leetcode)" "200" "POST" "/plugins/leetcode/connect" "$ALICE" '{"username":"tourist"}'
run "GET /plugins/:id/status" "200" "GET" "/plugins/leetcode/status" "$ALICE"

# =================== INSIGHTS ===================
echo ""
echo "--- Insights ---"

run "POST /reflections" "200" "POST" "/reflections" "$ALICE" "[{\"habit_id\":\"$HABIT1\",\"difficulty\":3,\"text\":\"felt good today\"}]"
run "GET /insights" "200" "GET" "/insights" "$ALICE"
run "GET /insights/motivation" "200" "GET" "/insights/motivation" "$ALICE"

# =================== NOTIFICATIONS ===================
echo ""
echo "--- Notifications ---"

run "GET /notifications" "200" "GET" "/notifications" "$ALICE"
run "GET /notifications?unread_only=true" "200" "GET" "/notifications?unread_only=true" "$ALICE"

# Get a notification ID to mark as read
NOTIF_ID=$(cat /tmp/smoke_last_response.json | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d[0]['id']) if d else print('')" 2>/dev/null || echo "")
if [ -n "$NOTIF_ID" ]; then
  run "POST /notifications/:id/read" "200" "POST" "/notifications/$NOTIF_ID/read" "$ALICE"
fi

# =================== DELETE / LEAVE ===================
echo ""
echo "--- Cleanup ---"

run "DELETE /habits/:id (archive)" "200" "DELETE" "/habits/$HABIT2" "$ALICE"
run "DELETE /groups/:id/leave (Charlie)" "200" "DELETE" "/groups/$GROUP_ID/leave" "$CHARLIE"

# =================== EDGE CASES ===================
echo ""
echo "--- Edge Cases ---"

run "GET /users/me (no auth)" "401" "GET" "/users/me" ""
run "POST /habits (max cap)" "200" "POST" "/habits" "$ALICE" '{"name":"H3","intensity":"light","tracking_method":"manual"}'
run "POST /habits (H4)" "200" "POST" "/habits" "$ALICE" '{"name":"H4","intensity":"light","tracking_method":"manual"}'
run "POST /habits (H5)" "200" "POST" "/habits" "$ALICE" '{"name":"H5","intensity":"light","tracking_method":"manual"}'
run "POST /habits (H6)" "200" "POST" "/habits" "$ALICE" '{"name":"H6","intensity":"light","tracking_method":"manual"}'
run "POST /habits (H7)" "200" "POST" "/habits" "$ALICE" '{"name":"H7","intensity":"light","tracking_method":"manual"}'
run "POST /habits (H8 — should fail, max 7)" "400" "POST" "/habits" "$ALICE" '{"name":"H8","intensity":"light","tracking_method":"manual"}'

# =================== SUMMARY ===================
echo ""
echo "=================================="
echo "  RESULTS: $PASS passed, $FAIL failed, $TOTAL total"
echo "=================================="

if [ $FAIL -gt 0 ]; then
  exit 1
fi
