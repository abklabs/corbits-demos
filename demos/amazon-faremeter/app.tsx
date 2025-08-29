import { Hono } from "npm:hono@3";
import { hono as middleware } from "npm:@faremeter/middleware@0.3.1";

import { index } from "./frontend/index.tsx";
import { css } from "./frontend/css.tsx";
import { js } from "./frontend/js.tsx";
import { quote } from "./quote.tsx";
import { paid } from "./paid.tsx";
import { fulfill } from "./fulfill.tsx";
import { status } from "./status.tsx";
import { webhook } from "./webhook.tsx";
import { favicon } from "./favicon.tsx";
import { usdcToBaseUnits } from "./utils.tsx";

const FACILITATOR_URL = Deno.env.get("FAREMETER_FACILITATOR_URL");
const NETWORK = Deno.env.get("FAREMETER_NETWORK");
const PAYTO_ADDRESS = Deno.env.get("PAYTO_ADDRESS");
const ASSET_ADDRESS = Deno.env.get("ASSET_ADDRESS");
const AMAZON_ASIN = Deno.env.get("AMAZON_ASIN");
const AMAZON_PRICE = Deno.env.get("AMAZON_PRICE");
const HOST_ORIGIN = Deno.env.get("HOST_ORIGIN");

if (!FACILITATOR_URL) throw new Error("FAREMETER_FACILITATOR_URL must be set");
if (!NETWORK) throw new Error("FAREMETER_NETWORK must be set");
if (!PAYTO_ADDRESS) throw new Error("PAYTO_ADDRESS must be set");
if (!ASSET_ADDRESS) throw new Error("ASSET_ADDRESS must be set");
if (!AMAZON_ASIN) throw new Error("AMAZON_ASIN must be set");
if (!AMAZON_PRICE) throw new Error("AMAZON_PRICE must be set");
if (!HOST_ORIGIN) throw new Error("HOST_ORIGIN must be set");

const app = new Hono();

app.get("/", index);
app.get("/app.css", css);
app.get("/app.js", js);
app.post("/quote", quote);
app.post("/fulfill", fulfill);
app.get("/status", status);
app.post("/webhook", webhook);
app.get("/favicon.ico", favicon);

app.post(
  "/pay",
  await middleware.createMiddleware({
    facilitatorURL: FACILITATOR_URL,
    x402Version: 1,
    accepts: [
      {
        scheme: "@faremeter/x-solana-settlement",
        network: NETWORK,
        payTo: PAYTO_ADDRESS,
        asset: ASSET_ADDRESS,
        maxAmountRequired: usdcToBaseUnits(AMAZON_PRICE),
        resource: `${HOST_ORIGIN}/pay`,
        description: `Amazon order ${AMAZON_ASIN}`,
        mimeType: "application/json",
        maxTimeoutSeconds: 60,
      },
    ],
  }),
  paid,
);

export default app.fetch;
