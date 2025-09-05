import tap from "tap";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import { Connection, PublicKey } from "@solana/web3.js";
import { createPaymentHandler } from "@faremeter/x-solana-settlement";
import { startTestServer, PREMIUM_URL, TEST_CONFIG } from "./server-utils.js";
import { ClientTransport } from "../src/client-transport.js";
import { loadKeypair, createWallet } from "../src/utils.js";

const USDC_DEV_MINT = new PublicKey(TEST_CONFIG.ASSET_ADDRESS);
let client: Client | undefined;
let premiumClient: Client | undefined;
let transport: ClientTransport | undefined;
let server: { kill: () => void } | undefined;

tap.before(async () => {
  server = await startTestServer();
});

tap.teardown(async () => {
  if (client) {
    await client.close();
    client = undefined;
  }
  if (premiumClient) {
    await premiumClient.close();
    premiumClient = undefined;
  }
  if (transport) {
    await transport.close();
    transport = undefined;
  }
  server?.kill();
});

tap.test("MCP Premium Endpoints with x402 Payment", async (t) => {
  const exampleAddress = TEST_CONFIG.PAYTO_ADDRESS;
  const keypair = loadKeypair(TEST_CONFIG.PAYER_KEYPAIR_PATH);
  const wallet = createWallet(
    keypair,
    TEST_CONFIG.FAREMETER_NETWORK as "devnet" | "mainnet-beta",
  );

  t.test("Premium endpoints should require payment", async (t) => {
    const response = await fetch(PREMIUM_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "mcp-session-id": "test-session-1",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: {
            name: "test-client",
            version: "1.0.0",
          },
        },
        id: 1,
      }),
    });

    t.equal(response.status, 402, "Should return 402 Payment Required");

    const paymentRequired = (await response.json()) as {
      x402Version: number;
      accepts: {
        scheme: string;
        network: string;
        maxAmountRequired: string;
        payTo: string;
        asset: string;
      }[];
    };
    t.ok(paymentRequired.x402Version, "Should have x402Version");
    t.ok(Array.isArray(paymentRequired.accepts), "Should have accepts array");
    t.ok(paymentRequired.accepts[0], "Should have at least one payment option");

    const acceptOption = paymentRequired.accepts[0];
    if (!acceptOption) {
      t.fail("No payment option available");
      return;
    }
    t.equal(
      acceptOption.scheme,
      TEST_CONFIG.FAREMETER_SCHEME,
      "Should require Solana payment",
    );
    t.equal(acceptOption.network, "devnet", "Should be on devnet");
    t.ok(acceptOption.maxAmountRequired, "Should specify amount required");
  });

  t.test("Premium endpoints should work with x402 payment", async (t) => {
    const paymentHandler = createPaymentHandler(wallet, USDC_DEV_MINT);

    transport = new ClientTransport(new URL(PREMIUM_URL), [paymentHandler]);

    premiumClient = new Client(
      { name: "test-client-premium", version: "1.0.0" },
      { capabilities: {} },
    );

    // Small delay to ensure transport is ready otherwise test fails
    // intermittently
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (!transport) throw new Error("Premium transport not initialized");
    await premiumClient.connect(
      transport as Parameters<typeof premiumClient.connect>[0],
    );

    const tools = await premiumClient.listTools();
    t.ok(tools.tools.length > 0, "Should have premium tools");

    const toolNames = tools.tools.map((t) => t.name);
    t.ok(
      toolNames.includes("solana.get_transaction"),
      "Should have get_transaction premium tool",
    );
    t.ok(
      toolNames.includes("solana.get_signatures_for_address"),
      "Should have get_signatures_for_address premium tool",
    );

    const result = await premiumClient.callTool({
      name: "solana.get_signatures_for_address",
      arguments: {
        address: exampleAddress,
        limit: 5,
      },
    });

    t.ok(result.content, "Should return content");
    const resultContent = result.content as TextContent[];
    if (!resultContent || resultContent.length === 0) {
      throw new Error("No content in result");
    }
    const textContent = resultContent[0];
    if (!textContent) throw new Error("No text content");
    const signatures = JSON.parse(textContent.text);
    t.ok(Array.isArray(signatures), "Should return array of signatures");

    const tokenAccounts = await premiumClient.callTool({
      name: "solana.get_token_accounts_by_owner",
      arguments: {
        owner: exampleAddress,
        mint: USDC_DEV_MINT.toBase58(),
      },
    });

    t.ok(tokenAccounts.content, "Should return token accounts");
    const tokenContent = tokenAccounts.content as TextContent[];
    if (!tokenContent || tokenContent.length === 0) {
      throw new Error("No token accounts in result");
    }
    const tokenTextContent = tokenContent[0];
    if (!tokenTextContent) throw new Error("No token text content");
    const accounts = JSON.parse(tokenTextContent.text);
    t.ok(accounts, "Should have token account data");
  });

  t.test("Check payer wallet has sufficient balance", async (t) => {
    const keypair = loadKeypair(TEST_CONFIG.PAYER_KEYPAIR_PATH);
    const connection = new Connection(
      TEST_CONFIG.SOLANA_RPC_URL,
      TEST_CONFIG.COMMITMENT as "confirmed" | "finalized",
    );

    const solBalance = await connection.getBalance(keypair.publicKey);
    t.ok(
      solBalance > 0.01 * 1e9,
      `Payer should have SOL for fees (has ${solBalance / 1e9} SOL)`,
    );

    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      keypair.publicKey,
      { mint: USDC_DEV_MINT },
    );

    if (tokenAccounts.value.length > 0) {
      const firstAccount = tokenAccounts.value[0];
      if (!firstAccount) {
        t.fail("No USDC token account found");
        return;
      }
      const usdcBalance =
        firstAccount.account.data.parsed.info.tokenAmount.uiAmount;
      t.ok(
        usdcBalance >= 0.01,
        `Payer should have USDC (has ${usdcBalance} USDC)`,
      );
    } else {
      t.fail(
        "Payer has no USDC token account. Please fund the wallet with USDC on devnet.",
      );
    }
  });
});
