#!/usr/bin/env bash
# Type-checks every Supabase Edge Function with Deno.
# A function-local deno.json (if present) takes precedence over the shared
# supabase/functions/deno.json, mirroring how the Supabase runtime resolves it.
set -uo pipefail

shared="supabase/functions/deno.json"
failed=()

for dir in supabase/functions/*/; do
  name="$(basename "$dir")"
  [ -f "$dir/index.ts" ] || continue

  cfg="$shared"
  [ -f "$dir/deno.json" ] && cfg="$dir/deno.json"

  echo "::group::deno check ${name} (config: ${cfg})"
  if deno check --config "$cfg" "$dir/index.ts"; then
    echo "ok"
  else
    failed+=("$name")
    echo "::error title=Edge function type error::${name} failed deno check"
  fi
  echo "::endgroup::"
done

if [ "${#failed[@]}" -gt 0 ]; then
  echo "Failed functions: ${failed[*]}"
  exit 1
fi
echo "✅ all edge functions type-check"
