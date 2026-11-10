#!/bin/sh
# Ensures backend/.env exists and has an APP_KEY. Never overwrites an existing key.
set -eu

root=$(cd "$(dirname "$0")/.." && pwd)
env_file="$root/backend/.env"
example="$root/backend/.env.example"

new_key() {
    printf 'base64:%s' "$(head -c 32 /dev/urandom | base64 | tr -d '\n')"
}

if [ ! -f "$env_file" ]; then
    if [ ! -f "$example" ]; then
        echo "backend/.env.example not found; cannot create backend/.env" >&2
        exit 1
    fi
    cp "$example" "$env_file"
    created=1
else
    created=0
fi

if grep -Eq '^APP_KEY=.+' "$env_file"; then
    exit 0
fi

key=$(new_key)
if [ "${#key}" -lt 20 ]; then
    echo "Failed to generate APP_KEY" >&2
    exit 1
fi
tmp=$(mktemp "$env_file.XXXXXX")
trap 'rm -f "$tmp"' EXIT
if grep -q '^APP_KEY=' "$env_file"; then
    awk -v key="$key" '/^APP_KEY=/ { print "APP_KEY=" key; next } { print }' "$env_file" >"$tmp"
else
    { cat "$env_file"; printf 'APP_KEY=%s\n' "$key"; } >"$tmp"
fi
cat "$tmp" >"$env_file"

if [ "$created" = 1 ]; then
    echo "Created backend/.env with a new APP_KEY"
else
    echo "Generated APP_KEY"
fi
