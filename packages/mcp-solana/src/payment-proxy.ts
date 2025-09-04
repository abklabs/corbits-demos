import express from "express";
import { PublicKey } from "@solana/web3.js";
import { createPaymentHandler } from "@faremeter/x-solana-settlement";
import { wrap } from "@faremeter/fetch";
import { loadKeypair, createWallet } from "./utils.js";
import dotenv from "dotenv";

dotenv.config();

const PAYER_KEYPAIR_PATH = process.env.PAYER_KEYPAIR_PATH;
const MCP_SERVER_URL = process.env.MCP_SERVER_URL;
const NETWORK = process.env.FAREMETER_NETWORK;
const ASSET_ADDRESS = process.env.ASSET_ADDRESS;

if (!PAYER_KEYPAIR_PATH) {
  console.error("Missing PAYER_KEYPAIR_PATH environment variable");
  process.exit(1);
}
if (!MCP_SERVER_URL) {
  console.error("Missing MCP_SERVER_URL environment variable");
  process.exit(1);
}
if (!NETWORK) {
  console.error("Missing FAREMETER_NETWORK environment variable");
  process.exit(1);
}
if (!ASSET_ADDRESS) {
  console.error("Missing ASSET_ADDRESS environment variable");
  process.exit(1);
}

const app = express();
app.use(express.json());
app.use(express.text({ type: "text/event-stream" }));

const keypair = loadKeypair(PAYER_KEYPAIR_PATH);
const assetMint = new PublicKey(ASSET_ADDRESS);
const wallet = createWallet(keypair, NETWORK as "devnet" | "mainnet-beta");
const paymentHandler = createPaymentHandler(wallet, assetMint);

async function proxyRequest(
  req: express.Request,
  res: express.Response,
  path: string,
  handlePayment = false,
) {
  const targetUrl = `${MCP_SERVER_URL}${path}`;
  const targetHost = new URL(MCP_SERVER_URL as string).host;

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

  try {
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

    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("text/event-stream")) {
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        req.on('close', () => {
          reader.cancel().catch(() => {});
        });

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(decoder.decode(value, { stream: true }));
          }
        } catch (err: any) {
          if (err.message !== 'terminated') {
            console.error('Stream error:', err.message);
          }
        } finally {
          res.end();
        }
      }
    } else {
      const responseBody = await response.text();
      res.send(responseBody);
    }
  } catch (err: any) {
    if (!err.message.includes('terminated')) {
      console.error('Proxy error:', err.message);
      if (!res.headersSent) {
        res.status(502).json({ error: 'Proxy error' });
      }
    }
  }
}

app.all("/mcp/premium", async (req, res) => {
  await proxyRequest(req, res, "/mcp/premium", true);
});

app.all("/mcp/free", async (req, res) => {
  await proxyRequest(req, res, "/mcp/free", false);
});

if (process.env.ENABLE_TEST_ENDPOINTS === 'true') {
  app.get("/test/stream", async (req, res) => {
    await proxyRequest(req, res, "/test/stream", false);
  });
}

const PORT = process.env.PROXY_PORT ? parseInt(process.env.PROXY_PORT) : 8402;
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

process.on('uncaughtException', (err) => {
  console.error('Connection error:', err.message);
});
