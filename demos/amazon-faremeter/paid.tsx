// paid.tsx
import { Context } from "npm:hono@3";
import { blob } from "https://esm.town/v/std/blob";
import { optionsResponse, errorResponse, successResponse } from "./utils.tsx";
import { sendPaymentReceivedEmail } from "./emails.tsx";

const HOST_ORIGIN = Deno.env.get("HOST_ORIGIN");
if (!HOST_ORIGIN) throw new Error("HOST_ORIGIN must be set");

export const paid = async (c: Context) => {
  if (c.req.method === "OPTIONS") return optionsResponse();
  if (c.req.method !== "POST") {
    return errorResponse("method_not_allowed", 405);
  }

  const { orderId } = await c.req.json().catch(() => ({}));
  if (!orderId) return errorResponse("missing_orderId", 400);

  const key = `order:${orderId}`;
  const order = await blob.getJSON<Record<string, unknown>>(key);
  if (!order) return errorResponse("order_not_found", 404);

  // If we reached here, x402 was satisfied by the middleware.
  // Only promote to "paid" if we haven't moved further already.
  const terminal = new Set([
    "paid",
    "fulfillment_created",
    "delivery_started",
    "completed",
    "canceled",
    "fulfillment_error",
  ]);
  const nextStatus = terminal.has(order.status) ? order.status : "paid";

  if (nextStatus !== order.status) {
    await blob.setJSON(key, {
      ...order,
      status: nextStatus,
      paidAt: order.paidAt ?? Date.now(),
      updatedAt: Date.now(),
    });

    await sendPaymentReceivedEmail({
      orderId,
      email: order.email as string,
      status: nextStatus,
    });
  }

  // Try to fulfill the order automatically
  try {
    const resp = await fetch(new URL("/fulfill", HOST_ORIGIN).toString(), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const resJson = await resp.json().catch(() => ({}));
    return successResponse({
      ...resJson,
      status: nextStatus,
      orderId,
    });
  } catch {
    // If fulfillment fails, still return success for payment
    return successResponse({
      status: nextStatus,
      orderId,
      message: "Payment received, fulfillment pending",
    });
  }
};
