#!/usr/bin/env tsx

import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import { Keypair } from "@solana/web3.js";
import { config, NETWORKS, type Network } from "../src/config.js";

async function getUSDCBalance(
  connection: Connection,
  walletAddress: PublicKey,
  network: Network,
): Promise<number> {
  try {
    const mintAddress = new PublicKey(NETWORKS[network].mintAddress);

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      walletAddress,
      { mint: mintAddress },
    );

    if (tokenAccounts.value.length === 0) {
      return 0;
    }

    const balance = tokenAccounts.value[0].account.data.parsed.info.tokenAmount;
    return Number(balance.uiAmount);
  } catch (error) {
    console.error(`Error getting USDC balance: ${error}`);
    return 0;
  }
}

async function checkBalance(address: string, network: Network, label?: string) {
  const connection = new Connection(NETWORKS[network].rpcUrl, "confirmed");
  const pubkey = new PublicKey(address);

  try {
    const solBalance = await connection.getBalance(pubkey);
    const solAmount = solBalance / LAMPORTS_PER_SOL;
    const usdcBalance = await getUSDCBalance(connection, pubkey, network);

    console.log(`\n${label ? `${label} ` : ""}${address} (${network}):`);
    console.log(`  SOL:  ${solAmount.toFixed(6)} SOL`);
    console.log(`  USDC: ${usdcBalance.toFixed(2)} USDC`);
  } catch (error) {
    console.error(`Error checking balance for ${address}: ${error}`);
  }
}

function loadKeypairFromFile(filepath: string): Keypair {
  const secretKey = JSON.parse(fs.readFileSync(filepath, "utf-8"));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

const paytoAddress = config.PAYTO_ADDRESS;
const payerKeypairPath = config.PAYER_KEYPAIR_PATH;

if (paytoAddress) {
  await checkBalance(paytoAddress, "devnet", "PAYTO_ADDRESS");
  await checkBalance(paytoAddress, "mainnet", "PAYTO_ADDRESS");
}

if (payerKeypairPath && fs.existsSync(payerKeypairPath)) {
  try {
    const keypair = loadKeypairFromFile(payerKeypairPath);
    const payerAddress = keypair.publicKey.toBase58();
    await checkBalance(payerAddress, "devnet", "PAYER");
    await checkBalance(payerAddress, "mainnet", "PAYER");
  } catch (error) {
    console.error(`Error loading payer keypair: ${error}`);
  }
}

const args = process.argv.slice(2);
for (const arg of args) {
  if (fs.existsSync(arg)) {
    try {
      const keypair = loadKeypairFromFile(arg);
      const address = keypair.publicKey.toBase58();
      await checkBalance(address, "devnet", `Keypair (${path.basename(arg)})`);
      await checkBalance(address, "mainnet", `Keypair (${path.basename(arg)})`);
    } catch (error) {
      console.error(`Error loading keypair from ${arg}: ${error}`);
    }
  } else if (arg.match(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/)) {
    await checkBalance(arg, "devnet", "Address");
    await checkBalance(arg, "mainnet", "Address");
  }
}
