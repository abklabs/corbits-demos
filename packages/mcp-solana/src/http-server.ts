import express from "express";
import { randomUUID } from "node:crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { PublicKey } from "@solana/web3.js";
import { makeConnection } from "./solana.js";
import { withRetries } from "./utils.js";
import {
  getBalanceSchema,
  getAccountInfoSchema,
  getLatestBlockhashSchema,
} from "./schemas.js";
import dotenv from "dotenv";

dotenv.config();

const SERVER_PORT = process.env.SERVER_PORT
  ? parseInt(process.env.SERVER_PORT)
  : 3333;

const app = express();
app.use(express.json());

const transports = new Map<string, StreamableHTTPServerTransport>();

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

app.listen(SERVER_PORT, () => {
  console.log(
    `HTTP MCP server running on http://localhost:${SERVER_PORT}/mcp/free`,
  );
});
