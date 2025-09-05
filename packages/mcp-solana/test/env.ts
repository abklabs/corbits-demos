import { config } from "../src/config.js";

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
  if (!config[key as keyof typeof config]) {
    console.error(`Error: ${key} is not set in .env`);
    process.exit(1);
  }
}

if (!config.PAYTO_ADDRESS) {
  throw new Error("PAYTO_ADDRESS is required but not set");
}
if (!config.PAYER_KEYPAIR_PATH) {
  throw new Error("PAYER_KEYPAIR_PATH is required but not set");
}

export const TEST_CONFIG = {
  SERVER_PORT: String(config.SERVER_PORT),
  PROXY_PORT: String(config.PROXY_PORT),
  HOST_ORIGIN: config.HOST_ORIGIN,
  FAREMETER_FACILITATOR_URL: config.FAREMETER_FACILITATOR_URL,
  FAREMETER_NETWORK: config.FAREMETER_NETWORK,
  FAREMETER_SCHEME: config.FAREMETER_SCHEME,
  PAYTO_ADDRESS: config.PAYTO_ADDRESS,
  ASSET_ADDRESS: config.ASSET_ADDRESS,
  PAYER_KEYPAIR_PATH: config.PAYER_KEYPAIR_PATH,
  PRICE_USDC: config.PRICE_USDC,
  SOLANA_RPC_URL: config.SOLANA_RPC_URL,
  COMMITMENT: config.COMMITMENT,
};
