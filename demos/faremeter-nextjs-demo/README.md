# Next.js + Faremeter x402 Payment Demo

A Next.js application demonstrating integration with Faremeter's x402 payment protocol for micropayments using Solana and Phantom wallet.

## Prerequisites

- Node.js 18+
- [Phantom wallet](https://phantom.app) browser extension
- Solana devnet USDC in your Phantom wallet

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` with your values:

```env
PAYTO_ADDRESS=your_solana_wallet_address
FAREMETER_FACILITATOR_URL=https://facilitator.corbits.dev
FAREMETER_NETWORK=devnet
ASSET=USDC
PAYMENT_AMOUNT=1000
```

### 3. Get Devnet Tokens

1. Switch Phantom to **Solana Devnet**
2. Get devnet USDC: https://faucet.circle.com/

### 4. Run Development Server

```bash
npm run dev
```

Open http://localhost:3000

## How It Works

### 1. Client Request

The client calls `/mint` using the Faremeter fetch wrapper:

```typescript
import { createFareMeterClient } from "@/lib/faremeter-client";

const fetchWithPayment = await createFareMeterClient();
const res = await fetchWithPayment("/mint", { method: "POST" });
```

### 2. Server Protection

The API route is protected by Faremeter middleware:

```typescript
// src/app/mint/route.ts
import { common } from "@faremeter/middleware";
import { x402Exact } from "@faremeter/info/solana";

export async function POST(req: NextRequest) {
  // Middleware handles payment verification
  const middlewareResponse = await common.handleMiddlewareRequest({
    facilitatorURL: FACILITATOR_URL,
    accepts: [paymentRequirement],
    // ...
  });

  // Only reached if payment is valid
  return NextResponse.json({ success: true });
}
```
