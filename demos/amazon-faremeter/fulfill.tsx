import { Context } from "npm:hono@3";
import { blob } from "https://esm.town/v/std/blob";
import {
  Connection,
  Keypair,
  PublicKey,
  VersionedTransaction,
} from "https://esm.sh/@solana/web3.js@1.95.3";
import {
  optionsResponse,
  errorResponse,
  successResponse,
  getUsdcBalance,
  decodeSolanaTxBytes,
  getOrder,
  saveOrder,
  type OrderStatus,
} from "./utils.tsx";
import {
  sendFulfillmentStartedEmail,
  sendOrderFailedEmail,
} from "./emails.tsx";

const CROSSMINT_API_KEY = Deno.env.get("CROSSMINT_API_KEY");
const RPC_URL = Deno.env.get("RPC_URL");
const PAYTO_KEYPAIR_JSON = Deno.env.get("PAYTO_KEYPAIR_JSON");
const ASSET_ADDRESS = Deno.env.get("ASSET_ADDRESS");

if (!CROSSMINT_API_KEY) throw new Error("CROSSMINT_API_KEY must be set");
if (!RPC_URL) throw new Error("RPC_URL must be set");
if (!PAYTO_KEYPAIR_JSON) throw new Error("PAYTO_KEYPAIR_JSON must be set");
if (!ASSET_ADDRESS) throw new Error("ASSET_ADDRESS must be set");

const merchantSecret: number[] = JSON.parse(PAYTO_KEYPAIR_JSON);
const merchantKeypair = Keypair.fromSecretKey(Uint8Array.from(merchantSecret));
const conn = new Connection(RPC_URL, "confirmed");
const usdcMint = new PublicKey(ASSET_ADDRESS);

export const fulfill = async (c: Context) => {
  if (c.req.method === "OPTIONS") return optionsResponse();

  const { orderId } = await c.req.json().catch(() => ({}));
  if (!orderId) return errorResponse("missing_orderId", 400);

  const { key, data: order } = await getOrder(orderId);
  if (!order) return errorResponse("order_not_found", 404);

  const cmId: string | undefined =
    order.crossmintOrderId ?? order.crossmintDraftId;
  if (!cmId) {
    return errorResponse("missing_crossmint_order", 412, "call /quote first");
  }

  const mapKey = `xmint:${cmId}`;
  const mapped = await blob
    .getJSON<{ orderId: string }>(mapKey)
    .catch(() => null);
  if (!mapped?.orderId) {
    await blob.setJSON(mapKey, { orderId });
  }

  if (order.status === "fulfillment_error") {
    return errorResponse(
      "fulfillment_error",
      502,
      order.fulfillError ?? "unknown",
    );
  }
  if (order.status === "canceled") {
    return errorResponse("order_canceled", 409);
  }
  if (
    order.status === "completed" ||
    order.status === "delivery_started" ||
    order.status === "fulfillment_created"
  ) {
    return successResponse({
      status: order.status,
      crossmintOrderId: cmId,
    });
  }
  if (order.status !== "paid") {
    return errorResponse(
      "awaiting_payment",
      202,
      `status is ${order.status ?? "created"}`,
    );
  }

  // Balance pre-check
  const need = BigInt(String(order.priceUsdc ?? "0"));
  const have = await getUsdcBalance(conn, merchantKeypair.publicKey, usdcMint);
  if (have < need) {
    return errorResponse(
      "merchant_insufficient_funds",
      402,
      `need ${need} USDC, have ${have} USDC. Fund merchant devnet wallet before fulfillment.`,
    );
  }

  // Tell Crossmint we will pay on Solana USDC from merchant wallet
  const patch = await fetch(
    `https://staging.crossmint.com/api/2022-06-09/orders/${cmId}`,
    {
      method: "PATCH",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "X-API-KEY": CROSSMINT_API_KEY,
      },
      body: JSON.stringify({
        payment: {
          method: "solana",
          currency: "usdc",
          payerAddress: merchantKeypair.publicKey.toBase58(),
        },
      }),
    },
  );

  if (!patch.ok) {
    const err = await patch.text();
    // If order already has a transaction that's fine just continue
    if (err.includes("already has a txId")) {
      console.log("Order already has txId, continuing to get transaction...");
    } else {
      await saveOrder(
        key,
        { fulfillError: err },
        "fulfillment_error" as OrderStatus,
      );
      return errorResponse("crossmint_error", 502, err.slice(0, 200));
    }
  }

  // Get prepared serialized transaction
  const pj = await patch.json().catch(() => ({}));
  let ser: string | undefined = pj?.payment?.preparation?.serializedTransaction;
  if (!ser) {
    const r2 = await fetch(
      `https://staging.crossmint.com/api/2022-06-09/orders/${cmId}`,
      {
        headers: { accept: "application/json", "X-API-KEY": CROSSMINT_API_KEY },
      },
    );
    if (r2.ok) {
      const j2 = await r2.json().catch(() => ({}));
      ser = j2?.payment?.preparation?.serializedTransaction;
    }
  }
  if (!ser) {
    await saveOrder(
      key,
      {
        fulfillError: "missing serializedTransaction",
      },
      "fulfillment_error" as OrderStatus,
    );
    return errorResponse("missing_serialized_transaction", 502);
  }

  // Decode, sign, send
  try {
    const bytes = await decodeSolanaTxBytes(ser);
    const vtx = VersionedTransaction.deserialize(bytes);
    vtx.sign([merchantKeypair]);
    const signature = await conn.sendTransaction(vtx, { skipPreflight: false });
    await conn.confirmTransaction(signature, "confirmed");

    await saveOrder(key, { signature }, "fulfillment_created" as OrderStatus);

    const latest = (await blob.getJSON<Record<string, unknown>>(key)) ?? {};

    await sendFulfillmentStartedEmail({
      orderId,
      email: order.email as string,
      status: "fulfillment_created",
      signature,
    });
    return successResponse({
      crossmintOrderId: cmId,
      signature,
      status: latest.status ?? "fulfillment_created",
    });
  } catch (e: unknown) {
    const error = e as {
      transactionMessage?: string;
      message?: string;
      transactionLogs?: unknown;
    };
    const message = error?.transactionMessage ?? error?.message ?? String(e);
    const logs = error?.transactionLogs;
    await saveOrder(key, { fulfillError: message, logs }, "fulfillment_error");

    await sendOrderFailedEmail({
      orderId,
      email: order.email as string,
      status: "fulfillment_error",
      errorMessage: message,
    });

    return errorResponse("transaction_failed", 502, message.slice(0, 200));
  }
};
