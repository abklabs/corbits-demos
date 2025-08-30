import { spawn, ChildProcess, execSync } from "child_process";
import { TEST_CONFIG } from "./env.js";

export { TEST_CONFIG };
export const PORT = parseInt(TEST_CONFIG.SERVER_PORT);
export const SERVER_URL = `http://localhost:${PORT}/mcp/free`;
export const PREMIUM_URL = `http://localhost:${PORT}/mcp/premium`;

const TEST_ENV = {
  ...process.env,
  ...TEST_CONFIG,
};

let server: ChildProcess | undefined;

export async function startTestServer(): Promise<ChildProcess> {
  try {
    const pid = execSync(`lsof -ti:${PORT}`, { encoding: "utf-8" }).trim();
    if (pid) {
      console.error(
        `\nError: Port ${PORT} is already in use by process ${pid}`,
      );
      console.error(`Please kill the process using: kill -9 ${pid}`);
      process.exit(1);
    }
  } catch {
    // Port is free
  }

  server = spawn("pnpm", ["tsx", "src/http-server.ts"], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: true,
    env: TEST_ENV,
  });

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error("Server failed to start within 5 seconds"));
    }, 5000);

    server?.stdout?.on("data", (data) => {
      if (
        data.toString().includes(`HTTP MCP server running on ${SERVER_URL}`)
      ) {
        clearTimeout(timeout);
        resolve();
      }
    });

    server?.stderr?.on("data", (data) => {
      console.error(data.toString());
    });

    server?.on("error", (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });

  await new Promise((resolve) => setTimeout(resolve, 500));
  return server;
}

export async function stopTestServer(): Promise<void> {
  if (server && server.pid) {
    try {
      process.kill(-server.pid, "SIGTERM");
    } catch {
      server.kill("SIGTERM");
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
    if (server && server.pid) {
      try {
        process.kill(-server.pid, "SIGKILL");
      } catch {
        server.kill("SIGKILL");
      }
    }
    server = undefined;
  }
}
