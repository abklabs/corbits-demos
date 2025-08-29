// webhooks_crossmint.tsx
import { Context } from "npm:hono@3";
import { Webhook } from "npm:svix";
import { blob } from "https://esm.town/v/std/blob";
import {
  CORS_HEADERS,
  optionsResponse,
  errorResponse,
  parseCrossmintWebhookEvent,
} from "./utils.tsx";
import { sendOrderCompletedEmail } from "./emails.tsx";

const WEBHOOK_SECRET = Deno.env.get("CROSSMINT_WEBHOOK_SECRET");
if (!WEBHOOK_SECRET) throw new Error("CROSSMINT_WEBHOOK_SECRET must be set");

export const webhook = async (c: Context) => {
  const req = c.req;
  if (req.method === "OPTIONS") return optionsResponse();

  const payload = await req.text();

  const svixHeaders = {
    "svix-id": req.header("svix-id") ?? "",
    "svix-timestamp": req.header("svix-timestamp") ?? "",
    "svix-signature": req.header("svix-signature") ?? "",
  };

  if (
    !svixHeaders["svix-id"] ||
    !svixHeaders["svix-timestamp"] ||
    !svixHeaders["svix-signature"]
  ) {
    return errorResponse("missing_svix_headers", 400);
  }

  // Verify & parse message
  let msg: unknown;
  try {
    const wh = new Webhook(WEBHOOK_SECRET);
    msg = wh.verify(payload, svixHeaders);
  } catch (e: unknown) {
    const error = e as { message?: string };
    return errorResponse(
      "invalid_signature",
      400,
      String(error?.message ?? e).slice(0, 100),
    );
  }

  // Extract Crossmint order id from message
  const msgTyped = msg as {
    type?: string;
    event?: string;
    data?: { id?: string; orderId?: string; order?: { id?: string } };
  };
  const type: string = msgTyped?.type ?? msgTyped?.event ?? "";
  const data = msgTyped?.data ?? {};
  const cmId: string | undefined = data.id ?? data.orderId ?? data?.order?.id;

  if (!cmId) {
    return new Response("ok", { status: 200, headers: CORS_HEADERS });
  }

  // Map Crossmint id to our order id
  const mapped = await blob.getJSON<{ orderId: string }>(`xmint:${cmId}`);
  if (!mapped?.orderId) {
    return new Response("ok", { status: 200, headers: CORS_HEADERS });
  }

  const key = `order:${mapped.orderId}`;
  const order = (await blob.getJSON<Record<string, unknown>>(key)) ?? {};
  const currentStatus = order.status as string;
  const next = parseCrossmintWebhookEvent(type, currentStatus);

  await blob.setJSON(key, {
    ...order,
    crossmintOrderId: cmId,
    status: next,
    crossmintLastEvent: { type, at: Date.now() },
    updatedAt: Date.now(),
  });

  if (currentStatus !== "completed" && next === "completed") {
    await sendOrderCompletedEmail({
      orderId: mapped.orderId,
      email: order.email as string,
      status: "completed",
      signature: order.signature as string,
    });
  }

  return new Response("ok", { status: 200, headers: CORS_HEADERS });
};
