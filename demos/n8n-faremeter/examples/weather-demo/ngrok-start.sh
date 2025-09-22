#!/bin/bash

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

NGROK_PID_FILE="${NGROK_PID_FILE:-.ngrok.pid}"
NGROK_PORT="${NGROK_PORT:-8080}"

if [ -z "$NGROK_DOMAIN" ]; then
  echo "Error: NGROK_DOMAIN not set in .env"
  exit 1
fi

if [ -f "$NGROK_PID_FILE" ]; then
  PID=$(cat "$NGROK_PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    echo "Ngrok already running (PID: $PID)"
    exit 0
  fi
fi

echo "Starting ngrok at $NGROK_DOMAIN..."
ngrok http --url=$NGROK_DOMAIN $NGROK_PORT > /dev/null 2>&1 &
NGROK_PID=$!
echo $NGROK_PID > "$NGROK_PID_FILE"

sleep 2

if kill -0 "$NGROK_PID" 2>/dev/null; then
  echo "Ngrok started: https://$NGROK_DOMAIN"
else
  echo "Failed to start ngrok"
  rm "$NGROK_PID_FILE"
  exit 1
fi
