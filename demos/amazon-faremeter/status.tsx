import { Context } from "npm:hono@3";
import { blob } from "https://esm.town/v/std/blob";
import { optionsResponse, errorResponse, successResponse } from "./utils.tsx";

export const status = async (c: Context) => {
  const req = c.req;
  if (req.method === "OPTIONS") return optionsResponse();

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  if (!orderId) return errorResponse("missing_orderId", 400);

  const order = await blob.getJSON<Record<string, unknown>>(`order:${orderId}`);
  if (!order) return errorResponse("order_not_found", 404);

  return successResponse({
    orderId,
    status: order.status,
    reference: order.reference,
    crossmintOrderId: order.crossmintOrderId,
    crossmintLastEvent: order.crossmintLastEvent ?? null,
    signature: order.signature ?? null,
    updatedAt: order.updatedAt ?? null,
  });
};
