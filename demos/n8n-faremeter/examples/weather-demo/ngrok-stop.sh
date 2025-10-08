#!/bin/bash

if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

NGROK_PID_FILE="${NGROK_PID_FILE:-.ngrok.pid}"

if [ -f "$NGROK_PID_FILE" ]; then
  PID=$(cat "$NGROK_PID_FILE")
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID"
    echo "Ngrok stopped (PID: $PID)"
  else
    echo "Ngrok process not found"
  fi
  rm "$NGROK_PID_FILE"
else
  echo "Ngrok not running"
fi
