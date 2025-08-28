import tap from "tap";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { ClientTransport } from "../src/client-transport.js";
import {
  startTestServer,
  stopTestServer,
  SERVER_URL,
  TEST_CONFIG,
} from "./server-utils.js";

let client: Client | undefined;
let transport: ClientTransport | undefined;

tap.before(async () => {
  await startTestServer();
});

tap.teardown(async () => {
  if (client) {
    await client.close();
    client = undefined;
  }
  if (transport) {
    await transport.close();
    transport = undefined;
  }
  await stopTestServer();
});

tap.test("MCP HTTP Client Tests", async (t) => {
  const exampleAddress = TEST_CONFIG.PAYTO_ADDRESS;

  t.before(async () => {
    transport = new ClientTransport(new URL(SERVER_URL));
    client = new Client(
      { name: "test-client", version: "1.0.0" },
      { capabilities: {} },
    );

    await client.connect(transport as Parameters<typeof client.connect>[0]);
  });

  t.after(async () => {
    if (client) {
      await client.close();
      client = undefined;
    }
    if (transport) {
      await transport.close();
      transport = undefined;
    }
  });

  t.test("Connection", async (t) => {
    t.ok(transport?.sessionId, "Should have a session ID after connecting");
    t.match(
      transport?.sessionId || "",
      /^[0-9a-f-]{36}$/,
      "Session ID should be a UUID",
    );
  });

  t.test("List tools", async (t) => {
    t.ok(client, "Client should be connected");
    if (!client) throw new Error("Client not connected");
    const tools = await client.listTools();

    t.equal(tools.tools.length, 3, "Should have 3 tools");

    const toolNames = tools.tools.map((t) => t.name);
    t.ok(
      toolNames.includes("solana.get_balance"),
      "Should have get_balance tool",
    );
    t.ok(
      toolNames.includes("solana.get_account_info"),
      "Should have get_account_info tool",
    );
    t.ok(
      toolNames.includes("solana.get_latest_blockhash"),
      "Should have get_latest_blockhash tool",
    );

    const balanceTool = tools.tools.find(
      (t) => t.name === "solana.get_balance",
    );
    t.equal(
      balanceTool?.description,
      "Get SOL balance for an address (lamports)",
      "Balance tool should have correct description",
    );
  });

  t.test("get_latest_blockhash", async (t) => {
    t.ok(client, "Client should be connected");
    if (!client) throw new Error("Client not connected");
    const result = await client.callTool({
      name: "solana.get_latest_blockhash",
      arguments: {},
    });

    const typedResult = result as CallToolResult;
    t.ok(typedResult.content, "Should return content");
    t.equal(typedResult.content.length, 1, "Should have one content item");
    const content = typedResult.content[0];
    if (!content) {
      throw new Error("No content returned");
    }
    t.equal(content.type, "text", "Content should be text type");

    if (content.type !== "text") {
      throw new Error("Invalid content format");
    }
    const data = JSON.parse(content.text as string);
    t.ok(data.blockhash, "Should have a blockhash");
    t.type(data.blockhash, "string", "Blockhash should be a string");
    t.ok(
      data.blockhash.length > 30,
      "Blockhash should be at least 30 characters",
    );
    t.ok(data.lastValidBlockHeight, "Should have lastValidBlockHeight");
    t.type(
      data.lastValidBlockHeight,
      "number",
      "lastValidBlockHeight should be a number",
    );

    const confirmedResult = await client.callTool({
      name: "solana.get_latest_blockhash",
      arguments: { commitment: "confirmed" },
    });

    const typedConfirmedResult = confirmedResult as CallToolResult;
    const confirmedContent = typedConfirmedResult.content[0];
    if (!confirmedContent || confirmedContent.type !== "text") {
      throw new Error("Invalid content format");
    }
    const confirmedData = JSON.parse(confirmedContent.text as string);
    t.ok(confirmedData.blockhash, "Confirmed request should return blockhash");
  });

  t.test("get_balance", async (t) => {
    t.ok(client, "Client should be connected");
    if (!client) throw new Error("Client not connected");
    const result = await client.callTool({
      name: "solana.get_balance",
      arguments: { address: exampleAddress },
    });

    const typedResult = result as CallToolResult;
    t.ok(typedResult.content, "Should return content");
    const content = typedResult.content[0];
    if (!content || content.type !== "text") {
      throw new Error("Invalid content format");
    }
    const data = JSON.parse(content.text as string);
    t.ok(data.lamports !== undefined, "Should have lamports field");
    t.type(data.lamports, "number", "Lamports should be a number");
    t.ok(data.lamports >= 0, "Lamports should be non-negative");
    t.ok(data.lamports > 0, "Wallet should have some SOL balance");

    const finalizedResult = await client.callTool({
      name: "solana.get_balance",
      arguments: {
        address: exampleAddress,
        commitment: "finalized",
      },
    });

    const typedFinalizedResult = finalizedResult as CallToolResult;
    const finalizedContent = typedFinalizedResult.content[0];
    if (!finalizedContent || finalizedContent.type !== "text") {
      throw new Error("Invalid content format");
    }
    const finalizedData = JSON.parse(finalizedContent.text as string);
    t.ok(
      finalizedData.lamports !== undefined,
      "Finalized balance should have lamports",
    );
    t.type(
      finalizedData.lamports,
      "number",
      "Finalized lamports should be a number",
    );
  });

  t.test("get_account_info", async (t) => {
    t.ok(client, "Client should be connected");
    if (!client) throw new Error("Client not connected");
    const jsonResult = await client.callTool({
      name: "solana.get_account_info",
      arguments: {
        address: exampleAddress,
        encoding: "jsonParsed",
      },
    });

    const typedJsonResult = jsonResult as CallToolResult;
    const jsonContent = typedJsonResult.content[0];
    if (!jsonContent || jsonContent.type !== "text") {
      throw new Error("Invalid content format");
    }
    const jsonData = JSON.parse(jsonContent.text as string);
    t.ok(jsonData, "Should return account info");
    t.equal(jsonData.executable, false, "Account should not be executable");
    t.type(jsonData.lamports, "number", "Should have lamports as number");
    t.equal(
      jsonData.owner,
      "11111111111111111111111111111111",
      "Should have system program as owner",
    );
    t.equal(jsonData.space, 0, "Should have 0 space for system account");

    const base64Result = await client.callTool({
      name: "solana.get_account_info",
      arguments: {
        address: exampleAddress,
        encoding: "base64",
      },
    });

    const typedBase64Result = base64Result as CallToolResult;
    const base64Content = typedBase64Result.content[0];
    if (!base64Content || base64Content.type !== "text") {
      throw new Error("Invalid content format");
    }
    const base64Data = JSON.parse(base64Content.text as string);
    t.ok(base64Data, "Should return account info with base64 encoding");
    t.equal(base64Data.executable, false, "Account should not be executable");

    const processedResult = await client.callTool({
      name: "solana.get_account_info",
      arguments: {
        address: exampleAddress,
        encoding: "jsonParsed",
        commitment: "processed",
      },
    });

    const typedProcessedResult = processedResult as CallToolResult;
    const processedContent = typedProcessedResult.content[0];
    if (!processedContent || processedContent.type !== "text") {
      throw new Error("Invalid content format");
    }
    const processedData = JSON.parse(processedContent.text as string);
    t.ok(processedData, "Should return account info with processed commitment");
    t.equal(
      processedData.owner,
      "11111111111111111111111111111111",
      "Should have correct owner",
    );
  });

  t.test("Error handling - invalid address", async (t) => {
    t.ok(client, "Client should be connected");

    try {
      if (!client) throw new Error("Client not connected");
      await client.callTool({
        name: "solana.get_balance",
        arguments: { address: "invalid_address" },
      });
      t.fail("Should throw error for invalid address");
    } catch (error: unknown) {
      t.ok(error, "Should throw an error for invalid address");
      const err = error as { message?: string; code?: string };
      t.ok(err.message || err.code, "Error should have a message or code");
    }
  });

  t.test("Parameter validation", async (t) => {
    t.ok(client, "Client should be connected");
    try {
      if (!client) throw new Error("Client not connected");
      await client.callTool({
        name: "solana.get_latest_blockhash",
        arguments: { commitment: "invalid_commitment" as never },
      });
      t.fail("Should throw error for invalid commitment");
    } catch (error: unknown) {
      t.ok(error, "Should throw an error for invalid commitment");
    }

    try {
      if (!client) throw new Error("Client not connected");
      await client.callTool({
        name: "solana.get_account_info",
        arguments: {
          address: exampleAddress,
          encoding: "invalid_encoding" as never,
        },
      });
      t.fail("Should throw error for invalid encoding");
    } catch (error: unknown) {
      t.ok(error, "Should throw an error for invalid encoding");
    }
  });
});
