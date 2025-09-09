import { $ } from "zx/core";
import { sleep } from "zx";
import { TEST_CONFIG } from "./env.js";

$.verbose = true;

export { TEST_CONFIG };

const BASE_PORT = parseInt(TEST_CONFIG.SERVER_PORT);
const BASE_PROXY_PORT = parseInt(TEST_CONFIG.PROXY_PORT);
const CHILD_ID = parseInt(process.env.TAP_CHILD_ID || "0");

export const PORT = BASE_PORT + CHILD_ID;
export const PROXY_PORT = BASE_PROXY_PORT + CHILD_ID;
export const SERVER_URL = `http://localhost:${PORT}/mcp/free`;
export const PREMIUM_URL = `http://localhost:${PORT}/mcp/premium`;
export const PROXY_FREE_URL = `http://localhost:${PROXY_PORT}/mcp/free`;
export const PROXY_PREMIUM_URL = `http://localhost:${PROXY_PORT}/mcp/premium`;

const TEST_ENV = {
  ...process.env,
  ...TEST_CONFIG,
  SERVER_PORT: PORT.toString(),
  HOST_ORIGIN: `http://localhost:${PORT}`,
};

export async function startTestServer() {
  const server = $({ env: TEST_ENV })`pnpm tsx src/http-server.ts`;

  await sleep(2000);

  if (server.stage !== "running") {
    throw new Error(`Server process is not running! Stage: ${server.stage}`);
  }
  console.log(`Server process is running with PID: ${server.pid}`);

  return {
    kill: () => {
      try {
        console.log("Stopping test server...");
        void server.nothrow(true).kill("SIGTERM");
      } catch {
        // Ignore errors when killing
      }
    },
  };
}

export async function startTestProxy() {
  const proxyEnv = {
    ...process.env,
    ...TEST_ENV,
    PROXY_PORT: PROXY_PORT.toString(),
    MCP_SERVER_URL: `http://localhost:${PORT}`,
  };

  const proxy = $({ env: proxyEnv })`pnpm tsx src/payment-proxy.ts`;

  await sleep(2000);

  if (proxy.stage !== "running") {
    throw new Error(`Proxy process is not running! Stage: ${proxy.stage}`);
  }
  console.log(`Proxy process is running with PID: ${proxy.pid}`);

  return {
    kill: () => {
      console.log("Stopping test proxy...");

      try {
        void proxy.nothrow(true).kill("SIGTERM");
      } catch {
        // Ignore errors when killing
      }
    },
  };
}
