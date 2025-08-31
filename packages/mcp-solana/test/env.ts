import dotenv from "dotenv";

dotenv.config();

const required = [
  "FAREMETER_FACILITATOR_URL",
  "FAREMETER_NETWORK",
  "PAYTO_ADDRESS",
  "ASSET_ADDRESS",
  "PAYER_KEYPAIR_PATH",
  "PRICE_USDC",
  "SOLANA_RPC_URL",
  "COMMITMENT",
];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Error: ${key} is not set in .env`);
    process.exit(1);
  }
}

export const TEST_CONFIG = {
  SERVER_PORT: process.env.SERVER_PORT ?? "3333",
  PROXY_PORT: process.env.PROXY_PORT ?? "8402",
  HOST_ORIGIN: process.env.HOST_ORIGIN,
  FAREMETER_FACILITATOR_URL: process.env.FAREMETER_FACILITATOR_URL as string,
  FAREMETER_NETWORK: process.env.FAREMETER_NETWORK as string,
  PAYTO_ADDRESS: process.env.PAYTO_ADDRESS as string,
  ASSET_ADDRESS: process.env.ASSET_ADDRESS as string,
  PAYER_KEYPAIR_PATH: process.env.PAYER_KEYPAIR_PATH as string,
  PRICE_USDC: process.env.PRICE_USDC as string,
  SOLANA_RPC_URL: process.env.SOLANA_RPC_URL as string,
  COMMITMENT: process.env.COMMITMENT as string,
};
