import { Connection } from "@solana/web3.js";
import type { Commitment } from "@solana/web3.js";
import { config } from "./config.js";

export function makeConnection(
  url = config.SOLANA_RPC_URL,
  commitment: Commitment = config.COMMITMENT as Commitment,
) {
  const headerString = config.SOLANA_RPC_HEADER;
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
