import { type } from "arktype";
import dotenv from "dotenv";

dotenv.config();

const Network = type("'mainnet' | 'devnet'");
const Commitment = type("'finalized' | 'confirmed' | 'processed'");
const FaremeterNetwork = type("'solana-mainnet' | 'solana-devnet'");
const FaremeterScheme = type("@faremeter/x-solana-settlement");
const Port = type("1 <= number.integer <= 65535");
const UsdcAmount = type("string.numeric");
const SolanaAddress = type("/^[1-9A-HJ-NP-Za-km-z]{32,44}$/");
const Url = type("string.url");

export type Network = typeof Network.infer;
export type Commitment = typeof Commitment.infer;
export type FaremeterNetwork = typeof FaremeterNetwork.infer;
export type FaremeterScheme = typeof FaremeterScheme.infer;
export type SolanaAddress = typeof SolanaAddress.infer;

type NetworkConfig = {
  rpcUrl: string;
  faremeterNetwork: FaremeterNetwork;
  mintAddress: SolanaAddress;
};

export const NETWORKS: Record<Network, NetworkConfig> = {
  mainnet: {
    rpcUrl: "https://api.mainnet-beta.solana.com",
    faremeterNetwork: "solana-mainnet",
    mintAddress: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  },
  devnet: {
    rpcUrl: "https://api.devnet.solana.com",
    faremeterNetwork: "solana-devnet",
    mintAddress: "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU",
  },
};

export const ConfigSchema = type({
  NETWORK: Network,
  SOLANA_RPC_URL: Url,
  COMMITMENT: Commitment,
  FAREMETER_FACILITATOR_URL: Url,
  FAREMETER_NETWORK: FaremeterNetwork,
  FAREMETER_SCHEME: FaremeterScheme,
  PAYTO_ADDRESS: SolanaAddress.or("undefined"),
  ASSET_ADDRESS: SolanaAddress,
  HOST_ORIGIN: Url,
  PRICE_USDC: UsdcAmount,
  PAYER_KEYPAIR_PATH: type("string | undefined"),
  MCP_SERVER_URL: type("string | undefined"),
  SERVER_PORT: Port,
  PROXY_PORT: Port,
  SOLANA_RPC_HEADER: type("string | undefined"),
});

export type Config = typeof ConfigSchema.infer;

function buildConfig() {
  const network = (process.env.NETWORK ?? "devnet") as Network;
  const defaults = NETWORKS[network];

  return {
    NETWORK: network,
    SOLANA_RPC_URL: process.env.SOLANA_RPC_URL ?? defaults.rpcUrl,
    COMMITMENT: process.env.COMMITMENT ?? "confirmed",
    FAREMETER_FACILITATOR_URL:
      process.env.FAREMETER_FACILITATOR_URL ??
      "https://facilitator.dev.faremeter.xyz",
    FAREMETER_NETWORK: defaults.faremeterNetwork,
    FAREMETER_SCHEME: process.env.FAREMETER_SCHEME,
    ASSET_ADDRESS: process.env.ASSET_ADDRESS ?? defaults.mintAddress,
    HOST_ORIGIN: process.env.HOST_ORIGIN ?? "http://localhost:3333",
    PRICE_USDC: process.env.PRICE_USDC ?? "0.01",
    SERVER_PORT: process.env.SERVER_PORT
      ? parseInt(process.env.SERVER_PORT)
      : 3333,
    PROXY_PORT: process.env.PROXY_PORT
      ? parseInt(process.env.PROXY_PORT)
      : 8402,
    PAYTO_ADDRESS: process.env.PAYTO_ADDRESS ?? undefined,
    PAYER_KEYPAIR_PATH: process.env.PAYER_KEYPAIR_PATH ?? undefined,
    MCP_SERVER_URL: process.env.MCP_SERVER_URL ?? undefined,
    SOLANA_RPC_HEADER: process.env.SOLANA_RPC_HEADER ?? undefined,
  };
}

export function isValidationError(
  possibleErrors: unknown,
): possibleErrors is type.errors {
  return possibleErrors instanceof type.errors;
}

const result = ConfigSchema(buildConfig());

if (isValidationError(result)) {
  const errorMessages = result
    .map((e) => `  ${e.path}: ${e.message}`)
    .join("\n");
  console.error(`Configuration validation failed:\n${errorMessages}`);
  process.exit(1);
}

export const config = result;
