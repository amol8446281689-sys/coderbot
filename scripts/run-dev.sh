#!/usr/bin/env bash
set -e

cd /workspaces/coderbot

cd server && npm install && cd ..
cd frontend && npm install && cd ..
cd embeddings && python3 -m pip install --upgrade pip && pip install -r requirements.txt && cd ..

printf "\nInstalled backend, frontend, and embeddings dependencies.\n"
