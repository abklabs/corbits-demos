import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import {
  PublicKey,
  type Commitment,
  type Finality,
  type SignaturesForAddressOptions,
  type GetProgramAccountsConfig,
} from "@solana/web3.js";
import { express as faremeter } from "@faremeter/middleware";
import { makeConnection } from "./solana.js";
import { withRetries, usdcToBaseUnits } from "./utils.js";
import {
  getBalanceSchema,
  getAccountInfoSchema,
  getLatestBlockhashSchema,
  getTransactionSchema,
  getSignaturesForAddressSchema,
  getTokenAccountsByOwnerSchema,
  getProgramAccountsSchema,
} from "./schemas.js";
import dotenv from "dotenv";

dotenv.config();

const SERVER_PORT = process.env.SERVER_PORT
  ? parseInt(process.env.SERVER_PORT)
  : 3333;
const FACILITATOR_URL = process.env.FAREMETER_FACILITATOR_URL;
const NETWORK = process.env.FAREMETER_NETWORK;
const PAYTO_ADDRESS = process.env.PAYTO_ADDRESS;
const ASSET_ADDRESS = process.env.ASSET_ADDRESS;
const HOST_ORIGIN = process.env.HOST_ORIGIN;
const PRICE_USDC = process.env.PRICE_USDC;

if (!FACILITATOR_URL) {
  console.error("Missing FAREMETER_FACILITATOR_URL environment variable");
  process.exit(1);
}
if (!NETWORK) {
  console.error("Missing FAREMETER_NETWORK environment variable");
  process.exit(1);
}
if (!PAYTO_ADDRESS) {
  console.error("Missing PAYTO_ADDRESS environment variable");
  process.exit(1);
}
if (!ASSET_ADDRESS) {
  console.error("Missing ASSET_ADDRESS environment variable");
  process.exit(1);
}
if (!HOST_ORIGIN) {
  console.error("Missing HOST_ORIGIN environment variable");
  process.exit(1);
}
if (!PRICE_USDC) {
  console.error("Missing PRICE_USDC environment variable");
  process.exit(1);
}

const app = express();
app.use(express.json());

const transports = new Map<string, StreamableHTTPServerTransport>();
const premiumTransports = new Map<string, StreamableHTTPServerTransport>();

const paywalledMiddleware = await faremeter.createMiddleware({
  facilitatorURL: FACILITATOR_URL,
  accepts: [
    {
      scheme: "@faremeter/x-solana-settlement",
      network: NETWORK,
      payTo: PAYTO_ADDRESS,
      asset: ASSET_ADDRESS,
      maxAmountRequired: usdcToBaseUnits(PRICE_USDC),
      resource: `${HOST_ORIGIN}/mcp/premium`,
      description: "Premium Solana RPC endpoints",
      mimeType: "application/json",
      maxTimeoutSeconds: 60,
    },
  ],
});

app.post("/mcp/free", async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  let transport: StreamableHTTPServerTransport;

  const existingTransport = sessionId ? transports.get(sessionId) : undefined;
  if (existingTransport) {
    transport = existingTransport;
  } else if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        transports.set(sessionId, transport);
      },
      enableDnsRebindingProtection: true,
      allowedHosts: ["127.0.0.1", "localhost", `localhost:${SERVER_PORT}`],
    });

    transport.onclose = () => {
      const sessionId = transport.sessionId;
      if (sessionId) {
        transports.delete(sessionId);
      }
    };

    const server = new McpServer({
      name: "solana-rpc",
      version: "0.0.1",
    });

    const conn = () => makeConnection();

    server.registerTool(
      "solana.get_balance",
      {
        title: "Get balance",
        description: "Get SOL balance for an address (lamports)",
        inputSchema: getBalanceSchema,
      },
      async ({ address, commitment }) => {
        const pk = new PublicKey(address);
        const value = await withRetries(() =>
          conn().getBalance(pk, commitment),
        );
        return {
          content: [
            { type: "text", text: JSON.stringify({ lamports: value }) },
          ],
        };
      },
    );

    server.registerTool(
      "solana.get_account_info",
      {
        title: "Get account info",
        description: "Get account data and owner",
        inputSchema: getAccountInfoSchema,
      },
      async ({ address, commitment }) => {
        const pk = new PublicKey(address);
        const info = await withRetries(() =>
          conn().getAccountInfo(pk, commitment),
        );
        return { content: [{ type: "text", text: JSON.stringify(info) }] };
      },
    );

    server.registerTool(
      "solana.get_latest_blockhash",
      {
        title: "Get latest blockhash",
        description: "Fetch a recent blockhash for transactions",
        inputSchema: getLatestBlockhashSchema,
      },
      async ({ commitment }) => {
        const bh = await withRetries(() =>
          conn().getLatestBlockhash(commitment),
        );
        return { content: [{ type: "text", text: JSON.stringify(bh) }] };
      },
    );

    await server.connect(transport);
  } else {
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Bad Request: No valid session ID provided",
      },
      id: null,
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

const handleSessionRequest = async (
  req: express.Request,
  res: express.Response,
) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  const transport = sessionId ? transports.get(sessionId) : undefined;
  if (!transport) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  await transport.handleRequest(req, res);
};

app.get("/mcp/free", handleSessionRequest);
app.delete("/mcp/free", handleSessionRequest);

app.post("/mcp/premium", paywalledMiddleware, async (req, res) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;

  let transport: StreamableHTTPServerTransport;

  const existingTransport = sessionId
    ? premiumTransports.get(sessionId)
    : undefined;
  if (existingTransport) {
    transport = existingTransport;
  } else if (!sessionId && isInitializeRequest(req.body)) {
    transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        premiumTransports.set(sessionId, transport);
      },
      enableDnsRebindingProtection: true,
      allowedHosts: ["127.0.0.1", "localhost", `localhost:${SERVER_PORT}`],
    });

    transport.onclose = () => {
      const sessionId = transport.sessionId;
      if (sessionId) {
        premiumTransports.delete(sessionId);
      }
    };

    const server = new McpServer({
      name: "solana-rpc-premium",
      version: "0.0.1",
    });

    const conn = () => makeConnection();

    server.registerTool(
      "solana.get_transaction",
      {
        title: "Get transaction details (PREMIUM)",
        description: "Get detailed information about a transaction",
        inputSchema: getTransactionSchema,
      },
      async ({ signature, maxSupportedTransactionVersion, commitment }) => {
        const options: {
          maxSupportedTransactionVersion?: number;
          commitment?: Finality;
        } = {};
        if (maxSupportedTransactionVersion !== undefined) {
          options.maxSupportedTransactionVersion =
            maxSupportedTransactionVersion;
        }
        if (commitment) {
          options.commitment = commitment as Finality;
        }
        const tx = await withRetries(() =>
          conn().getTransaction(signature, options),
        );
        return { content: [{ type: "text", text: JSON.stringify(tx) }] };
      },
    );

    server.registerTool(
      "solana.get_signatures_for_address",
      {
        title: "Get signatures for address (PREMIUM)",
        description: "Get transaction signatures for an address",
        inputSchema: getSignaturesForAddressSchema,
      },
      async ({ address, limit, before, until, commitment }) => {
        const pk = new PublicKey(address);
        const options: SignaturesForAddressOptions = {};
        if (limit !== undefined) options.limit = limit;
        if (before !== undefined) options.before = before;
        if (until !== undefined) options.until = until;
        const signatures = await withRetries(() =>
          conn().getSignaturesForAddress(
            pk,
            options,
            commitment ? (commitment as Finality) : undefined,
          ),
        );
        return {
          content: [{ type: "text", text: JSON.stringify(signatures) }],
        };
      },
    );

    server.registerTool(
      "solana.get_token_accounts_by_owner",
      {
        title: "Get token accounts by owner (PREMIUM)",
        description: "Get all token accounts owned by an address",
        inputSchema: getTokenAccountsByOwnerSchema,
      },
      async ({ owner, mint, programId, commitment }) => {
        const ownerPk = new PublicKey(owner);

        const filter = mint
          ? { mint: new PublicKey(mint) }
          : {
              programId: new PublicKey(
                programId || "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
              ),
            };

        const accounts = await withRetries(() =>
          conn().getTokenAccountsByOwner(
            ownerPk,
            filter,
            commitment ? { commitment: commitment as Commitment } : undefined,
          ),
        );
        return { content: [{ type: "text", text: JSON.stringify(accounts) }] };
      },
    );

    server.registerTool(
      "solana.get_program_accounts",
      {
        title: "Get program accounts (PREMIUM)",
        description: "Get all accounts owned by a program",
        inputSchema: getProgramAccountsSchema,
      },
      async ({ programId, dataSize, commitment }) => {
        const pk = new PublicKey(programId);

        const config: GetProgramAccountsConfig = {};
        if (commitment) {
          config.commitment = commitment as Commitment;
        }
        if (dataSize !== undefined) {
          config.filters = [{ dataSize }];
        }

        const accounts = await withRetries(() =>
          conn().getProgramAccounts(pk, config),
        );
        return { content: [{ type: "text", text: JSON.stringify(accounts) }] };
      },
    );

    await server.connect(transport);
  } else {
    res.status(400).json({
      jsonrpc: "2.0",
      error: {
        code: -32000,
        message: "Bad Request: No valid session ID provided",
      },
      id: null,
    });
    return;
  }

  await transport.handleRequest(req, res, req.body);
});

const handlePremiumSessionRequest = async (
  req: express.Request,
  res: express.Response,
) => {
  const sessionId = req.headers["mcp-session-id"] as string | undefined;
  const transport = sessionId ? premiumTransports.get(sessionId) : undefined;
  if (!transport) {
    res.status(400).send("Invalid or missing session ID");
    return;
  }
  await transport.handleRequest(req, res);
};

app.get("/mcp/premium", handlePremiumSessionRequest);
app.delete("/mcp/premium", handlePremiumSessionRequest);

if (process.env.ENABLE_TEST_ENDPOINTS === 'true') {
  app.get("/test/stream", (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    let counter = 0;
    const sendEvent = () => {
      counter++;
      const data = {
        id: counter,
        timestamp: new Date().toISOString(),
        message: `Event ${counter}`
      };
      res.write(`data: ${JSON.stringify(data)}\n\n`);

      if (counter >= 5) {
        res.write('event: close\ndata: Stream complete\n\n');
        res.end();
        return;
      }
    };

    sendEvent();

    const interval = setInterval(() => {
      sendEvent();
    }, 500);

    req.on('close', () => {
      clearInterval(interval);
      res.end();
    });
  });
}

const server = app.listen(SERVER_PORT, () => {
  console.log(
    `HTTP MCP server running on http://localhost:${SERVER_PORT}/mcp/free`,
    `Premium MCP endpoint at http://localhost:${SERVER_PORT}/mcp/premium`,
  );
});

function shutdown() {
  server.close(() => {
    process.exit(0);
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
