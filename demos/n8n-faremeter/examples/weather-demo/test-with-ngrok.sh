#!/bin/bash

# Load .env file if it exists
if [ -f .env ]; then
  set -a
  source .env
  set +a
fi

./ngrok-start.sh
if [ $? -ne 0 ]; then
  echo "Failed to start ngrok"
  exit 1
fi

echo "Running test with callback at $NGROK_URL"

npx tsx test-payment.ts

./ngrok-stop.sh
