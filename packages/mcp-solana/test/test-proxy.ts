import tap from "tap";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import type { TextContent } from "@modelcontextprotocol/sdk/types.js";
import { ClientTransport } from "../src/client-transport.js";
import { createPaymentHandler } from "@faremeter/x-solana-settlement";
import { PublicKey } from "@solana/web3.js";
import {
  startTestServer,
  startTestProxy,
  PROXY_FREE_URL,
  PROXY_PREMIUM_URL,
  TEST_CONFIG,
} from "./server-utils.js";
import { loadKeypair, createWallet } from "../src/utils.js";

const USDC_DEV_MINT = new PublicKey(TEST_CONFIG.ASSET_ADDRESS);

let freeClient: Client | undefined;
let premiumClient: Client | undefined;
let freeTransport: ClientTransport | undefined;
let premiumTransport: ClientTransport | undefined;
let server: { kill: () => void } | undefined;
let proxy: { kill: () => void } | undefined;

tap.before(async () => {
  server = await startTestServer();
  proxy = await startTestProxy();
});

tap.teardown(async () => {
  if (freeClient) {
    await freeClient.close();
    freeClient = undefined;
  }
  if (premiumClient) {
    await premiumClient.close();
    premiumClient = undefined;
  }
  if (freeTransport) {
    await freeTransport.close();
    freeTransport = undefined;
  }
  if (premiumTransport) {
    await premiumTransport.close();
    premiumTransport = undefined;
  }
  proxy?.kill();
  server?.kill();
});

tap.test("Payment Proxy Tests", async (t) => {
  const exampleAddress = TEST_CONFIG.PAYTO_ADDRESS;

  t.test("Free endpoints through proxy work without payment", async (t) => {
    freeTransport = new ClientTransport(new URL(PROXY_FREE_URL));
    freeClient = new Client(
      { name: "test-client-proxy-free", version: "1.0.0" },
      { capabilities: {} },
    );

    await freeClient.connect(
      freeTransport as Parameters<typeof freeClient.connect>[0],
    );

    const result = await freeClient.callTool({
      name: "solana.get_latest_blockhash",
      arguments: {},
    });

    t.ok(result.content, "Should return content");
    const content = result.content as TextContent[];
    const textContent = content[0];
    if (!textContent) throw new Error("No text content");
    const data = JSON.parse(textContent.text);
    t.ok(data.blockhash, "Should have a blockhash through proxy");
  });

  t.test("Premium endpoints through proxy with payment", async (t) => {
    const keypair = loadKeypair(TEST_CONFIG.PAYER_KEYPAIR_PATH);
    const wallet = createWallet(
      keypair,
      TEST_CONFIG.FAREMETER_NETWORK as "devnet" | "mainnet-beta",
    );
    const paymentHandler = createPaymentHandler(wallet, USDC_DEV_MINT);

    premiumTransport = new ClientTransport(new URL(PROXY_PREMIUM_URL), [
      paymentHandler,
    ]);
    premiumClient = new Client(
      { name: "test-client-proxy-premium", version: "1.0.0" },
      { capabilities: {} },
    );

    // Small delay to ensure transport is ready otherwise test fails
    // intermittently
    await new Promise((resolve) => setTimeout(resolve, 100));

    await premiumClient.connect(
      premiumTransport as Parameters<typeof premiumClient.connect>[0],
    );

    const tools = await premiumClient.listTools();
    t.ok(tools.tools.length > 0, "Should have premium tools through proxy");

    const toolNames = tools.tools.map((t) => t.name);
    t.ok(
      toolNames.includes("solana.get_transaction"),
      "Should have get_transaction premium tool",
    );

    const result = await premiumClient.callTool({
      name: "solana.get_signatures_for_address",
      arguments: {
        address: exampleAddress,
        limit: 5,
      },
    });

    t.ok(result.content, "Should return content through proxy");
    const resultContent = result.content as TextContent[];
    const textContent = resultContent[0];
    if (!textContent) throw new Error("No text content");
    const signatures = JSON.parse(textContent.text);
    t.ok(
      Array.isArray(signatures),
      "Should return array of signatures through proxy",
    );
  });

  t.test("Proxy correctly forwards requests", async (t) => {
    // Test that the proxy correctly forwards requests to the backend
    const testTransport = new ClientTransport(new URL(PROXY_FREE_URL));
    const testClient = new Client(
      { name: "test-forwarding-client", version: "1.0.0" },
      { capabilities: {} },
    );

    await testClient.connect(
      testTransport as Parameters<typeof testClient.connect>[0],
    );

    // Test a simple tool call through the proxy
    const result = await testClient.callTool({
      name: "solana.get_balance",
      arguments: {
        address: exampleAddress,
      },
    });

    t.ok(result.content, "Should return content through proxy");
    const content = result.content as TextContent[];
    const textContent = content[0];
    if (!textContent) throw new Error("No text content");
    const data = JSON.parse(textContent.text);
    t.ok(data.lamports !== undefined, "Should have balance data through proxy");

    await testClient.close();
    await testTransport.close();
  });

  t.test("Proxy streams SSE responses correctly", async (t) => {
    const response = await fetch(`${PROXY_FREE_URL.replace('/mcp/free', '/test/stream')}`);

    t.ok(response.headers.get('content-type')?.includes('text/event-stream'), 
      "Should have SSE content type");

    const chunks: string[] = [];
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk.trim()) {
        chunks.push(chunk);
      }
    }

    t.ok(chunks.length > 0, "Should receive streaming chunks");

    const events = chunks.join('').split('\n\n').filter(e => e.startsWith('data: '));
    t.ok(events.length >= 5, "Should receive at least 5 events");

    const firstEvent = events[0];
    if (firstEvent) {
      t.ok(firstEvent.includes('"id":1'), "First event should have id 1");
      t.ok(firstEvent.includes('Event 1'), "First event should have correct message");
    }
  });

  t.test("Proxy handles client disconnection gracefully", async (t) => {
    const abortController = new AbortController();

    const requestPromise = fetch(`${PROXY_FREE_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 1,
      }),
      signal: abortController.signal,
    });

    abortController.abort();

    try {
      await requestPromise;
      t.fail("Request should have been aborted");
    } catch (err: any) {
      t.ok(err.name === 'AbortError', "Should handle abort gracefully");
    }

    await new Promise(resolve => setTimeout(resolve, 100));

    const verifyResponse = await fetch(`${PROXY_FREE_URL}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'tools/list',
        id: 2,
      }),
    });

    t.ok(verifyResponse, "Proxy should still respond after client disconnection");
    const text = await verifyResponse.text();
    t.ok(text.length > 0, "Should get a response after disconnect");
  });
});
