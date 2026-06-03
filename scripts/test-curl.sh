#!/usr/bin/env bash
# Exercises every Edge Function with curl, using secrets from .env.
# A curl-based stand-in for the Postman collection (tests all functions).
#   Run:  ./scripts/test-curl.sh    (or: bash scripts/test-curl.sh)
#
# Needs in .env: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY,
#                WEBHOOK_SECRET, TEST_EMAIL, TEST_PASSWORD
set -o pipefail
cd "$(dirname "$0")/.."
set -a; . ./.env; set +a

FN="$SUPABASE_URL/functions/v1"
PUB="$SUPABASE_PUBLISHABLE_KEY"
GREEN=$'\e[32m'; RED=$'\e[31m'; DIM=$'\e[2m'; BOLD=$'\e[1m'; NC=$'\e[0m'
ok=0; bad=0; LAST_BODY=""

section() { printf "\n${BOLD}== %s ==${NC}\n" "$1"; }

# call METHOD PATH [JSON]  — authenticated as the test user; expects <400
call() {
  local method=$1 path=$2 data=${3:-} resp status
  local args=(-s -X "$method" -H "Authorization: Bearer $TOKEN" -H "apikey: $PUB" -H "Content-Type: application/json")
  [[ -n "$data" ]] && args+=(--data "$data")
  resp=$(curl "${args[@]}" -w $'\n%{http_code}' "$FN/$path")
  status=$(printf '%s' "$resp" | tail -n1); LAST_BODY=$(printf '%s' "$resp" | sed '$d')
  if [[ "$status" -lt 400 ]]; then ok=$((ok+1)); printf "${GREEN}✓ %s %s → %s${NC}\n" "$method" "$path" "$status"
  else bad=$((bad+1)); printf "${RED}✗ %s %s → %s${NC}\n" "$method" "$path" "$status"; fi
  printf '%s' "$LAST_BODY" | jq -C . 2>/dev/null | sed "s/^/${DIM}  /;s/$/${NC}/" || printf "${DIM}  %s${NC}\n" "$LAST_BODY"
}

# event METHOD PATH JSON  — calls an event function with the webhook secret
event() {
  local path=$1 data=$2 resp status
  resp=$(curl -s -X POST -H "apikey: $PUB" -H "x-webhook-secret: $WEBHOOK_SECRET" \
    -H "Content-Type: application/json" --data "$data" -w $'\n%{http_code}' "$FN/$path")
  status=$(printf '%s' "$resp" | tail -n1); LAST_BODY=$(printf '%s' "$resp" | sed '$d')
  if [[ "$status" -lt 400 ]]; then ok=$((ok+1)); printf "${GREEN}✓ POST %s (event) → %s${NC}\n" "$path" "$status"
  else bad=$((bad+1)); printf "${RED}✗ POST %s (event) → %s${NC}\n" "$path" "$status"; fi
  printf '%s' "$LAST_BODY" | jq -C . 2>/dev/null | sed "s/^/${DIM}  /;s/$/${NC}/" || true
}

# expect CODE DESC -- CURL_ARGS...  — security test; passes when status == CODE
expect() {
  local want=$1 desc=$2; shift 3
  local status; status=$(curl -s -o /dev/null -w '%{http_code}' "$@")
  if [[ "$status" == "$want" ]]; then ok=$((ok+1)); printf "${GREEN}✓ %s → %s (expected)${NC}\n" "$desc" "$status"
  else bad=$((bad+1)); printf "${RED}✗ %s → %s (wanted %s)${NC}\n" "$desc" "$status" "$want"; fi
}

# ---- sign in --------------------------------------------------------------
section "auth"
login=$(curl -s -X POST "$SUPABASE_URL/auth/v1/token?grant_type=password" \
  -H "apikey: $PUB" -H "Content-Type: application/json" \
  --data "{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}")
TOKEN=$(printf '%s' "$login" | jq -r '.access_token')
USER_ID=$(printf '%s' "$login" | jq -r '.user.id')
if [[ -z "$TOKEN" || "$TOKEN" == "null" ]]; then printf "${RED}login failed:${NC} %s\n" "$login"; exit 1; fi
printf "${GREEN}✓ signed in${NC} (user %s)\n" "$USER_ID"

# seed a profile for the test user (it predates the on-user-created trigger)
if [[ -n "${SUPABASE_SECRET_KEY:-}" && "$SUPABASE_SECRET_KEY" != FILL* ]]; then
  curl -s -o /dev/null -X POST "$SUPABASE_URL/rest/v1/profiles" \
    -H "apikey: $SUPABASE_SECRET_KEY" -H "Authorization: Bearer $SUPABASE_SECRET_KEY" \
    -H "Content-Type: application/json" -H "Prefer: resolution=merge-duplicates" \
    --data "{\"id\":\"$USER_ID\",\"display_name\":\"Curl Tester\"}"
fi

# ---- profiles -------------------------------------------------------------
section "profiles"
call GET  profile-get
call POST profile-update '{"displayName":"Curl Tester","username":"curl_tester"}'

# ---- snippets CRUD --------------------------------------------------------
section "snippets CRUD"
call POST snippets-create '{"title":"Curl snippet","body":"echo hi","language":"bash","tags":["curl","demo"]}'
SID=$(printf '%s' "$LAST_BODY" | jq -r '.snippet.id')
call GET  snippets-list
call GET  "snippets-get?id=$SID"
call POST snippets-update "{\"id\":\"$SID\",\"title\":\"Curl snippet (edited)\"}"

# ---- tags & search --------------------------------------------------------
section "tags & search"
call GET "snippets-search?q=curl"
call GET tags-list
call GET stats-get

# ---- attachments ----------------------------------------------------------
section "attachments"
call POST attachments-create-url "{\"snippetId\":\"$SID\",\"fileName\":\"curl.txt\"}"
SIGNED=$(printf '%s' "$LAST_BODY" | jq -r '.upload.signedUrl')
ATT=$(printf '%s' "$LAST_BODY" | jq -r '.attachment.id')
up=$(curl -s -o /dev/null -w '%{http_code}' -X PUT -H "Content-Type: text/plain" --data "hello from curl" "$SIGNED")
[[ "$up" -lt 400 ]] && { ok=$((ok+1)); printf "${GREEN}✓ PUT signed upload → %s${NC}\n" "$up"; } || { bad=$((bad+1)); printf "${RED}✗ PUT signed upload → %s${NC}\n" "$up"; }
call GET "attachments-list?snippetId=$SID"
call DELETE "attachments-delete?id=$ATT"

# ---- event functions (direct, with webhook secret) ------------------------
section "event functions (direct)"
event on-snippet-change      "{\"type\":\"UPDATE\",\"record\":{\"user_id\":\"$USER_ID\"}}"
event on-user-created        "{\"record\":{\"id\":\"$USER_ID\",\"email\":\"$TEST_EMAIL\"}}"
event on-attachment-uploaded "{\"record\":{\"name\":\"noop\",\"bucket_id\":\"attachments\",\"metadata\":{}}}"
event daily-digest           "{}"

# ---- security (negative) tests --------------------------------------------
section "security"
expect 401 "snippets-list without token" -- "$FN/snippets-list" -H "apikey: $PUB"
expect 403 "daily-digest without webhook secret" -- -X POST "$FN/daily-digest" -H "apikey: $PUB" -H "Content-Type: application/json" --data '{}'

# ---- cleanup --------------------------------------------------------------
section "cleanup"
call DELETE "snippets-delete?id=$SID"

# ---- summary --------------------------------------------------------------
printf "\n${BOLD}== summary ==${NC}\n"
printf "passed: ${GREEN}%s${NC}   failed: ${RED}%s${NC}\n" "$ok" "$bad"
[[ "$bad" -eq 0 ]]
