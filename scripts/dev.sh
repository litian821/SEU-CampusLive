#!/usr/bin/env bash
set -euo pipefail

if [[ ! -f .env ]]; then
  cp .env.example .env
  printf 'Created .env from .env.example\n'
fi

docker compose up --build -d
docker compose ps
printf 'Open http://localhost:%s\n' "${WEB_PORT:-8080}"
