# Amazon x402 Demo

Demo e-commerce app that accepts USDC payments on Solana via Faremeter's x402 protocol using Crossmint for Amazon product fulfillment.

## Environment Variables

```bash
# Faremeter
FAREMETER_FACILITATOR_URL=https://facilitator.dev.faremeter.xyz
FAREMETER_NETWORK=devnet
PAYTO_ADDRESS=<your_payto_address>  # merchant public address
PAYTO_KEYPAIR_JSON=[1,2,3,...]  # merchant private key
ASSET_ADDRESS=Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr  # USDC-Dev on devnet

# Host
HOST_ORIGIN=https://yourname.web.val.run

# Amazon Product
AMAZON_ASIN=B0D9S8P5N7
AMAZON_PRICE=46.00
AMAZON_TITLE=Product Name
AMAZON_IMAGE=https://example.com/image.jpg

# Crossmint
CROSSMINT_API_KEY=your_api_key
CROSSMINT_WEBHOOK_SECRET=your_webhook_secret

# Solana
RPC_URL=https://api.devnet.solana.com
```

Deploy to Val Town and set env vars there.
