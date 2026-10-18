#!/usr/bin/env bash
set -e

cd /workspaces/coderbot

# Start services if Docker is available
if command -v docker >/dev/null 2>&1; then
  echo "Starting CoderBot services..."
  docker compose up --build -d || true
else
  echo "Docker not available yet inside this environment; service startup skipped."
fi

printf "\nCoderBot environment ready.\n"
