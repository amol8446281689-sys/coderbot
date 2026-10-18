#!/usr/bin/env bash
set -e

cd /workspaces/coderbot

# install code dependencies
if [ -d server ]; then
  cd server && npm install && cd ..
fi

if [ -d frontend ]; then
  cd frontend && npm install && cd ..
fi

# install Python deps for embeddings service
if [ -d embeddings ]; then
  cd embeddings && python3 -m pip install --upgrade pip && pip install -r requirements.txt && cd ..
fi

# print ready message
printf "\nCodespace setup complete.\n"
printf "Run: docker compose up --build -d\n"
printf "Then: cd server && npm run dev\n"
printf "Then: cd frontend && npm run dev -- --host 0.0.0.0\n"
