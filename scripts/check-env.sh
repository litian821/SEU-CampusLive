#!/usr/bin/env bash
set -euo pipefail

failures=0

check_command() {
  local command_name="$1"
  if command -v "$command_name" >/dev/null 2>&1 && "$command_name" --version >/dev/null 2>&1; then
    printf '[ok] %-16s %s\n' "$command_name" "$("$command_name" --version 2>/dev/null | head -n 1)"
  else
    printf '[missing] %s\n' "$command_name"
    failures=$((failures + 1))
  fi
}

printf 'Campus Sports Platform environment check\n'
printf 'Kernel: %s\n' "$(uname -srmo)"
check_command git
check_command docker

if command -v docker >/dev/null 2>&1; then
  if docker compose version >/dev/null 2>&1; then
    printf '[ok] docker compose   %s\n' "$(docker compose version)"
  else
    printf '[missing] docker compose plugin\n'
    failures=$((failures + 1))
  fi

  if docker info >/dev/null 2>&1; then
    printf '[ok] docker daemon is reachable\n'
  else
    printf '[blocked] Docker daemon is not reachable; start native Docker (sudo systemctl start docker), or enable Docker Desktop WSL integration; see docs/development.md.\n'
    failures=$((failures + 1))
  fi
fi

if [[ ! -f AGENTS.md || ! -f compose.yaml || ! -f .env.example ]]; then
  printf '[missing] run this script from the project root\n'
  failures=$((failures + 1))
else
  printf '[ok] project root files present\n'
fi

if (( failures > 0 )); then
  printf 'Environment check failed with %d issue(s).\n' "$failures"
  exit 1
fi

printf 'Environment check passed.\n'
