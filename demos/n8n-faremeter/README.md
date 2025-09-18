# n8n-nodes-faremeter

x402-enabled webhook nodes for n8n with Faremeter payment support.

## Quick Links

Get test tokens for the demo:

- **USDC (Circle Faucet)**: https://faucet.circle.com/
- **SOL (Solana Faucet)**: https://faucet.solana.com/

## Prerequisites

- Docker
- Node.js and pnpm
- [ngrok](https://ngrok.com) account with a static domain
- Solana wallet with devnet USDC for testing

## Quick Start

```bash
# Clone and setup
git clone https://github.com/abklabs/corbits-demos.git
cd corbits-demos/demos/n8n-faremeter

# Build and start n8n with custom nodes
make build
make start

# Get n8n API key from UI
# 1. Open http://localhost:5678
# 2. Go to Settings → API
# 3. Create an API key

# Configure the demo
cd examples/weather-demo
cp .env.example .env
# Edit .env and add:
# - N8N_API_KEY from step above
# - NGROK_URL with your ngrok domain (e.g., https://your-domain.ngrok.app)
# - PAYER_KEYPAIR_PATH pointing to your Solana wallet

# Create demo workflow
make demo

# Test the payment flow
make test
```

## How It Works

The demo automatically:

1. Creates Faremeter credentials in n8n configured for Solana devnet
2. Sets up a weather API workflow that requires 0.01 USDC payment
3. Activates the workflow at `/webhook/weather-demo-webhook/weather-demo`

The test script demonstrates a complete x402 payment flow by making a request to the webhook, paying with USDC, and receiving weather data via callback through ngrok.

## Wallet Setup

You need two wallets for the demo:

### 1. Client Wallet (Makes Payments)

```bash
# Install Solana CLI tools
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Create client wallet for making payments
solana-keygen new --outfile client-wallet.json

# Get the wallet address to fund it
solana address -k client-wallet.json
```

**Fund this wallet with:**

- **SOL** (for transaction fees): Visit https://faucet.solana.com/
- **USDC** (for payments): Visit https://faucet.circle.com/ (select Solana Devnet)

### 2. Server Wallet (Receives Payments)

```bash
# Create server wallet for receiving payments
solana-keygen new --outfile server-wallet.json

# Get the wallet address
solana address -k server-wallet.json
```

This wallet doesn't need funding - it will receive the payments.

## Configuration

Required in `examples/weather-demo/.env`:

```bash
# n8n API access
N8N_API_KEY=your-n8n-api-key

# Ngrok for callbacks
NGROK_URL=https://your-domain.ngrok.app

# Client wallet (makes payments)
PAYER_KEYPAIR_PATH=./client-wallet.json
SOLANA_NETWORK=devnet
USDC_MINT=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU

# Server wallet (receives payments)
FAREMETER_PAYTO_ADDRESS=<address-from-server-wallet.json>
```

## Custom Nodes

### x402Webhook

Receives HTTP requests and enforces x402 payment requirements.

### x402WebhookResponder

Sends workflow results to callback URLs with retry logic.

## Creating Your Own Workflows

1. Add x402Webhook node to receive requests
2. Configure payment amount in node options
3. Connect to your processing logic
4. (Optional) Add x402WebhookResponder for callbacks

## Troubleshooting

**Payment not working**: Verify wallet has SOL for fees and USDC for payment

**Webhook not receiving**: Check workflow is active at http://localhost:5678

**Callback not sending**: Ensure ngrok is running for local testing
