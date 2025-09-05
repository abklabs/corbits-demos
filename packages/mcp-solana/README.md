# MCP Solana Server

```
                           ┌──────────────────┐       ┌──────────────────┐
                           │   MCP Server     │──────▶│   Solana RPC     │
                           │                  │       │                  │
                           │  /mcp/free       │       │   (Devnet/       │
                           │  /mcp/premium    │       │    Mainnet)      │
                           └──────────────────┘       └──────────────────┘
                                    │
                                    │ 402 Payment Required
                                    ▼
┌──────────────────┐       ┌──────────────────┐
│     Client       │──────▶│  Payment Proxy   │
│      (MCP)       │       │ (handles x402    │
│                  │◀──────│   payments)      │
└──────────────────┘  200  └──────────────────┘
```

## Quick Links

Get test tokens to try this demo:

- **USDC (Circle Faucet)**: https://faucet.circle.com/
- **SOL (Solana Faucet)**: https://faucet.solana.com/

## Setup

```bash
pnpm install
```

## Creating Wallets

### Server Wallet (Receives Payments)

The server needs a wallet address to receive micropayments for premium endpoints:

```bash
# Install Solana CLI tools
sh -c "$(curl -sSfL https://release.solana.com/stable/install)"

# Create a new wallet for the server
solana-keygen new --outfile server-wallet.json

# Get the public address
solana address -k server-wallet.json

# Set this address as PAYTO_ADDRESS in your .env
```

### Client Wallet (Makes Payments)

The payment proxy needs a funded wallet to pay for premium endpoints:

```bash
# Create a new wallet for the client
solana-keygen new --outfile client-wallet.json

# Get the public address to fund it
solana address -k client-wallet.json

# Set the path as PAYER_KEYPAIR_PATH in your .env
```

### Funding Test Wallets

For testing on devnet:

1. **Get SOL**: Use the [Solana Faucet](https://faucet.solana.com/) to get test SOL
2. **Get USDC**: Use the [Circle Faucet](https://faucet.circle.com/) to get test USDC

Make sure to:

- Select "Solana Devnet" network on Circle Faucet
- Fund your client wallet with both SOL (for transaction fees) and USDC (for payments)

## Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Set to "mainnet" or "devnet"
NETWORK=devnet

# Payment configuration
PAYTO_ADDRESS=<your-wallet-address>  # Receives payments
PRICE_USDC=0.01
PAYER_KEYPAIR_PATH=./client-wallet.json  # Makes payments
FAREMETER_FACILITATOR_URL=https://facilitator.dev.faremeter.xyz # Should be set to the facilitator URL for your network

# Server configuration (optional)
SERVER_PORT=3333
PROXY_PORT=8402
HOST_ORIGIN=http://localhost:3333
MCP_SERVER_URL=http://localhost:3333

# Advanced configuration (optional - defaults are set based on NETWORK)
# SOLANA_RPC_URL=https://api.devnet.solana.com
# SOLANA_RPC_HEADER=x-api-key: your-key-here  # For authenticated RPC
# ASSET_ADDRESS=4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU  # USDC mint
COMMITMENT=confirmed
```

### Running on Mainnet

To run on mainnet, change the NETWORK variable and Faremeter URL:

```env
NETWORK=mainnet
PAYTO_ADDRESS=<your-mainnet-wallet-address>
FAREMETER_FACILITATOR_URL=https://facilitator.faremeter.xyz
```

The following will be automatically configured for mainnet:

- RPC URL: `https://api.mainnet-beta.solana.com`
- USDC Address: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`

**Important for Mainnet:**

- Use a mainnet-funded wallet in `PAYER_KEYPAIR_PATH`
- Ensure your `PAYTO_ADDRESS` is a mainnet wallet
- Fund with real SOL and USDC (not test tokens)

## Run Server

```bash
pnpm tsx src/http-server.ts
```

## Run Tests

Tests require a funded wallet on Solana devnet with SOL and USDC-Dev.

```bash
pnpm tap
```

## Client Usage

Use the client library when you need to programmatically interact with the MCP server from your TypeScript/JavaScript applications instead of using it through an MCP-compatible tool (e.g. Claude Desktop).

### Free Endpoints

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ClientTransport } from "./src/client-transport.js";

const transport = new ClientTransport(
  new URL("http://localhost:3333/mcp/free"),
);
const client = new Client(
  { name: "my-client", version: "1.0.0" },
  { capabilities: {} },
);
await client.connect(transport);

const result = await client.callTool("solana.get_balance", {
  address: "...",
});
```

### Premium Endpoints

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { ClientTransport } from "./src/client-transport.js";
import { createPaymentHandler } from "@faremeter/x-solana-settlement";
import { createWallet } from "./src/utils.js";

const wallet = createWallet(keypair, "devnet");
const paymentHandler = createPaymentHandler(wallet, USDC_MINT);

const transport = new ClientTransport(
  new URL("http://localhost:3333/mcp/premium"),
  [paymentHandler],
);
const client = new Client(
  { name: "my-client", version: "1.0.0" },
  { capabilities: {} },
);
await client.connect(transport);

const result = await client.callTool("solana.get_transaction", {
  signature: "...",
});
```

## Payment Proxy

The payment proxy intercepts x402 payment requests and automatically handles them using your configured wallet:

```bash
pnpm tsx src/payment-proxy.ts
```

Then configure your mcp client to use `http://localhost:8402/mcp/free` or `http://localhost:8402/mcp/premium`.
