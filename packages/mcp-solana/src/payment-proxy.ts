import express from "express";
import { PublicKey, Connection } from "@solana/web3.js";
import { createPaymentHandler as createXSolanaHandler } from "@faremeter/x-solana-settlement";
import { createPaymentHandler as createExactHandler } from "@faremeter/payment-solana-exact";
import { wrap } from "@faremeter/fetch";
import type { PaymentHandler } from "@faremeter/types";
import { loadKeypair, createWallet } from "./utils.js";
import { config } from "./config.js";

if (!config.PAYER_KEYPAIR_PATH) {
  console.error("Missing PAYER_KEYPAIR_PATH environment variable");
  process.exit(1);
}
if (!config.MCP_SERVER_URL) {
  console.error("Missing MCP_SERVER_URL environment variable");
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(express.text({ type: "text/event-stream" }));

const keypair = loadKeypair(config.PAYER_KEYPAIR_PATH);
const assetMint = new PublicKey(config.ASSET_ADDRESS);
const wallet = createWallet(
  keypair,
  config.FAREMETER_NETWORK as "devnet" | "mainnet-beta",
);

let paymentHandler: PaymentHandler;
if (config.FAREMETER_SCHEME === "exact") {
  const connection = new Connection(config.SOLANA_RPC_URL, config.COMMITMENT);
  paymentHandler = createExactHandler(wallet, assetMint, connection);
} else if (config.FAREMETER_SCHEME === "@faremeter/x-solana-settlement") {
  paymentHandler = createXSolanaHandler(wallet, assetMint);
} else {
  console.error(`Unsupported payment scheme: ${config.FAREMETER_SCHEME}`);
  process.exit(1);
}

async function proxyRequest(
  req: express.Request,
  res: express.Response,
  path: string,
  handlePayment = false,
) {
  const targetUrl = `${config.MCP_SERVER_URL}${path}`;
  const targetHost = new URL(config.MCP_SERVER_URL as string).host;

  const headers: Record<string, string> = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (
      typeof value === "string" &&
      key !== "host" &&
      key !== "content-length"
    ) {
      headers[key] = value;
    }
  }
  headers["host"] = targetHost;
  headers["accept"] = "application/json, text/event-stream";

  const body =
    req.method !== "GET" && req.method !== "HEAD"
      ? JSON.stringify(req.body)
      : undefined;

  if (body) {
    headers["content-type"] = "application/json";
    headers["content-length"] = Buffer.byteLength(body).toString();
  }

  const fetchOptions: RequestInit = {
    method: req.method,
    headers,
  };
  if (body) {
    fetchOptions.body = body;
  }

  const x402Fetch = wrap(fetch, {
    handlers: [paymentHandler],
  });

  const fetchFn = handlePayment ? x402Fetch : fetch;
  const response = await fetchFn(targetUrl, fetchOptions);

  res.status(response.status);
  response.headers.forEach((value, key) => {
    if (
      key !== "content-encoding" &&
      key !== "transfer-encoding" &&
      key !== "content-length"
    ) {
      res.setHeader(key, value);
    }
  });

  const responseBody = await response.text();
  res.send(responseBody);
}

app.all("/mcp/premium", async (req, res) => {
  await proxyRequest(req, res, "/mcp/premium", true);
});

app.all("/mcp/free", async (req, res) => {
  await proxyRequest(req, res, "/mcp/free", false);
});

const PORT = config.PROXY_PORT;
const server = app.listen(PORT, () => {
  console.log(`Payment proxy running on http://localhost:${PORT}`);
  console.log(`  Free: http://localhost:${PORT}/mcp/free`);
  console.log(`  Premium: http://localhost:${PORT}/mcp/premium`);
});

function shutdown() {
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
