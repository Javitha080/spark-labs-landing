#!/usr/bin/env bash
# Post-deploy smoke test.
#   usage: smoke-test.sh <base-url>
# Retries /api/health (new Worker versions can take a few seconds to propagate)
# then checks the SPA shell and the service worker.
set -uo pipefail

base="${1:?usage: smoke-test.sh <base-url>}"
base="${base%/}"
attempts="${SMOKE_ATTEMPTS:-12}"
delay="${SMOKE_DELAY:-10}"

echo "Smoke testing ${base}"

# 1. Health endpoint (with retry)
ok=0
for i in $(seq 1 "$attempts"); do
  body="$(curl -sS --max-time 15 -H 'Cache-Control: no-cache' "${base}/api/health?ci=${GITHUB_SHA:-local}-${i}" 2>&1)"
  code=$?
  if [ $code -eq 0 ] && echo "$body" | grep -q '"status":"healthy"'; then
    echo "✓ /api/health healthy (attempt ${i}): ${body}"
    ok=1
    break
  fi
  echo "… attempt ${i}/${attempts} not healthy yet: ${body:0:200}"
  sleep "$delay"
done
if [ $ok -ne 1 ]; then
  echo "::error title=Smoke test failed::/api/health never reported healthy"
  exit 1
fi

# 2. SPA shell
status="$(curl -sS -o /tmp/index.html -w '%{http_code}' --max-time 15 "${base}/")"
if [ "$status" != "200" ] || ! grep -qi '<div id="root"' /tmp/index.html; then
  echo "::error title=Smoke test failed::GET / returned ${status} or is missing #root"
  exit 1
fi
echo "✓ / serves the SPA shell"

# 3. Service worker has a baked version
sw="$(curl -sS --max-time 15 "${base}/sw.js")"
if echo "$sw" | grep -q '__SW_VERSION__'; then
  echo "::error title=Smoke test failed::deployed sw.js still has the __SW_VERSION__ placeholder"
  exit 1
fi
echo "✓ sw.js version baked"

echo "✅ smoke test passed"
