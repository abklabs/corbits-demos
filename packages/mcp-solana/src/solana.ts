import { Connection, clusterApiUrl } from "@solana/web3.js";
import type { Commitment } from "@solana/web3.js";
import dotenv from "dotenv";

dotenv.config();

const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL ?? clusterApiUrl("devnet");
const COMMITMENT = (process.env.COMMITMENT as Commitment) ?? "confirmed";
const SOLANA_RPC_HEADER = process.env.SOLANA_RPC_HEADER;

export function makeConnection(
  url = SOLANA_RPC_URL,
  commitment: Commitment = COMMITMENT,
) {
  const headerString = SOLANA_RPC_HEADER;
  if (!headerString) {
    return new Connection(url, commitment);
  }

  const colonIndex = headerString.indexOf(":");
  if (colonIndex === -1) {
    return new Connection(url, commitment);
  }

  const headerKey = headerString.substring(0, colonIndex).trim();
  const headerValue = headerString.substring(colonIndex + 1).trim();

  return new Connection(url, {
    commitment,
    fetchMiddleware: (url, options, fetch) => {
      if (!options) {
        options = {};
      }
      if (!options.headers) {
        options.headers = {};
      }
      (options.headers as Record<string, string>)[headerKey] = headerValue;
      return fetch(url, options);
    },
  });
}
