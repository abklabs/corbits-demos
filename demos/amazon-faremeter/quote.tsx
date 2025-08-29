import { Context } from "npm:hono@3";
import { blob } from "https://esm.town/v/std/blob";
import { errorResponse, successResponse, usdToUsdc } from "./utils.tsx";
import { sendOrderCreatedEmail } from "./emails.tsx";

const AMAZON_PRICE = Deno.env.get("AMAZON_PRICE");
const CROSSMINT_API_KEY = Deno.env.get("CROSSMINT_API_KEY");
const AMAZON_ASIN = Deno.env.get("AMAZON_ASIN");

if (!AMAZON_PRICE) throw new Error("AMAZON_PRICE must be set");
if (!CROSSMINT_API_KEY) throw new Error("CROSSMINT_API_KEY must be set");
if (!AMAZON_ASIN) throw new Error("AMAZON_ASIN must be set");

export const quote = async (c: Context) => {
  if (c.req.method !== "POST") {
    return errorResponse("method_not_allowed", 405);
  }

  const {
    orderId: existingOrderId,
    email,
    shippingAddress,
  } = await c.req.json().catch(() => ({}) as unknown);
  if (!email) return errorResponse("missing_email", 400);
  if (!shippingAddress) return errorResponse("missing_shipping_address", 400);

  const usd = Number(AMAZON_PRICE);
  if (!Number.isFinite(usd) || usd <= 0) {
    return errorResponse("invalid_price_configuration", 500);
  }
  const priceUsdc = usdToUsdc(usd);

  // Create Crossmint order. We'll assign payerAddress later during fulfillment.
  const r = await fetch("https://staging.crossmint.com/api/2022-06-09/orders", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "X-API-KEY": CROSSMINT_API_KEY,
    },
    body: JSON.stringify({
      recipient: { email, physicalAddress: shippingAddress },
      locale: "en-US",
      payment: { method: "solana", currency: "usdc" },
      lineItems: [{ productLocator: `amazon:${AMAZON_ASIN}` }],
    }),
  });

  const raw = await r.text();
  if (!r.ok) {
    return errorResponse(
      "crossmint_error",
      502,
      `status ${r.status}: ${raw.slice(0, 200)}`,
    );
  }

  let cm: { id?: string; order?: { orderId?: string }; totals?: unknown };
  try {
    cm = JSON.parse(raw);
  } catch {
    return errorResponse("crossmint_invalid_response", 502, raw.slice(0, 200));
  }

  const orderId = existingOrderId ?? crypto.randomUUID();
  const crossmintId = cm.id ?? cm.order?.orderId ?? null;

  const existingOrder = existingOrderId
    ? await blob.getJSON<Record<string, unknown>>(`order:${existingOrderId}`)
    : null;

  await blob.setJSON(`order:${orderId}`, {
    ...(existingOrder ?? {}),
    status: existingOrder?.status ?? "created",
    email,
    shippingAddress,
    priceUsd: usd,
    priceUsdc,
    quote: cm.totals ?? null,
    crossmintOrderId: crossmintId,
    createdAt: existingOrder?.createdAt ?? Date.now(),
    updatedAt: Date.now(),
  });

  // used by fulfillment webhook
  if (crossmintId) {
    await blob.setJSON(`xmint:${crossmintId}`, { orderId });
  }

  if (!existingOrderId) {
    await sendOrderCreatedEmail({
      orderId,
      email,
      priceUsd: usd,
      status: "created",
    });
  }

  return successResponse({
    orderId,
    priceUsd: usd,
    priceUsdc,
    crossmintOrderId: crossmintId,
    quote: cm.totals ?? null,
  });
};
