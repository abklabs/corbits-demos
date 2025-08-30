import { Keypair, VersionedTransaction } from "@solana/web3.js";
import * as fs from "fs";
import type { types } from "@faremeter/x-solana-settlement";

export async function withRetries<T>(
  fn: () => Promise<T>,
  max = 3,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < max; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const wait = Math.min(1000 * Math.pow(2, i), 5000);
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

export function usdcToBaseUnits(usdcAmount: string): string {
  const [whole = "0", decimal = "0"] = usdcAmount.split(".");
  const paddedDecimal = decimal.padEnd(6, "0");
  const result = BigInt(whole) * 1000000n + BigInt(paddedDecimal.slice(0, 6));
  return result.toString();
}

export function loadKeypair(path: string): Keypair {
  try {
    const keypairData = JSON.parse(fs.readFileSync(path, "utf-8"));
    return Keypair.fromSecretKey(Uint8Array.from(keypairData));
  } catch (error) {
    console.error("Failed to load keypair from", path);
    console.error(
      "Please ensure path points to a valid Solana keypair JSON file",
    );
    throw error;
  }
}

export function createWallet(keypair: Keypair, network: string): types.Wallet {
  return {
    network,
    publicKey: keypair.publicKey,
    updateTransaction: async (tx: VersionedTransaction) => {
      tx.sign([keypair]);
      return tx;
    },
  };
}
