import { Hono } from "npm:hono@3";
import { hono as middleware } from "npm:@faremeter/middleware@0.3.1";
import { solana } from "npm:@faremeter/info@0.7.0";
import { index } from "./frontend/index.tsx";
import { css } from "./frontend/css.tsx";
import { js } from "./frontend/js.tsx";
import { rpc } from "./frontend/rpc.tsx";
import { favicon } from "./frontend/favicon.tsx";
import logo from "./frontend/logo.tsx";
import { paid } from "./paid.tsx";

const env = {
  PRIVY_APP_ID: Deno.env.get("PRIVY_APP_ID"),
  HOST_ORIGIN: Deno.env.get("HOST_ORIGIN")?.replace(/\/+$/, ""),
  PAYTO_ADDRESS: Deno.env.get("PAYTO_ADDRESS"),
  SOLANA_RPC_URL: Deno.env.get("SOLANA_RPC_URL"),
  FAREMETER_FACILITATOR_URL:
    Deno.env.get("FAREMETER_FACILITATOR_URL") ??
    "https://facilitator.corbits.dev",
  FAREMETER_NETWORK: Deno.env.get("FAREMETER_NETWORK") ?? "mainnet-beta",
  FAREMETER_ASSET: Deno.env.get("FAREMETER_ASSET") ?? "USDC",
  FAREMETER_AMOUNT: Deno.env.get("FAREMETER_AMOUNT") ?? "1000",
};

const required = [
  "PRIVY_APP_ID",
  "HOST_ORIGIN",
  "PAYTO_ADDRESS",
  "SOLANA_RPC_URL",
];
const missingVars = required.filter((key) => !env[key]);

if (missingVars.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missingVars.join(", ")}`,
  );
}

const app = new Hono();

app.get("/", index);
app.get("/app.css", css);
app.get("/app.js", js);
app.get("/favicon.ico", favicon);
app.get("/logo.png", logo);
app.post("/rpc", rpc);

const paymentRequirement = solana.x402Exact({
  network: env.FAREMETER_NETWORK,
  asset: env.FAREMETER_ASSET,
  amount: env.FAREMETER_AMOUNT,
  payTo: env.PAYTO_ADDRESS,
});

app.post(
  "/api/protected",
  await middleware.createMiddleware({
    facilitatorURL: env.FAREMETER_FACILITATOR_URL,
    x402Version: 1,
    accepts: [
      {
        ...paymentRequirement,
        resource: `${env.HOST_ORIGIN}/api/protected`,
        description: "Access to protected API endpoint",
      },
    ],
  }),
  paid,
);

export default app.fetch;
