import { blob } from "https://esm.town/v/std/blob";
import { Connection, PublicKey } from "https://esm.sh/@solana/web3.js@1.95.3";

export const CORS_HEADERS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers":
    "content-type,authorization,x-crossmint-signature",
};

export function optionsResponse() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...CORS_HEADERS },
  });
}

export function errorResponse(message: string, status = 400, details?: string) {
  return jsonResponse(
    {
      ok: false,
      error: message,
      ...(details && { details }),
    },
    status,
  );
}

export function successResponse(data: Record<string, unknown> = {}) {
  return jsonResponse({ ok: true, ...data }, 200);
}

const STATUS_FLOW = [
  "unknown",
  "created",
  "awaiting_payment",
  "paid",
  "fulfillment_created",
  "delivery_started",
  "completed",
  "canceled",
  "fulfillment_error",
] as const;

export type OrderStatus = (typeof STATUS_FLOW)[number];

export function getStatusRank(status?: string): number {
  const idx = STATUS_FLOW.indexOf((status ?? "unknown") as OrderStatus);
  return idx === -1 ? 0 : idx;
}

export function mergeStatus(current?: string, next?: string): OrderStatus {
  const curr = (current ?? "unknown") as OrderStatus;
  const proposed = (next ?? curr) as OrderStatus;
  return getStatusRank(proposed) >= getStatusRank(curr) ? proposed : curr;
}

export async function getOrder(orderId: string) {
  const key = `order:${orderId}`;
  const data = await blob.getJSON<Record<string, unknown>>(key);
  return { key, data: data ?? null };
}

export async function saveOrder(
  key: string,
  updates: Record<string, unknown>,
  status?: OrderStatus,
) {
  const current = (await blob.getJSON<Record<string, unknown>>(key)) ?? {};
  const merged = {
    ...current,
    ...updates,
    status: mergeStatus(current.status, status),
    updatedAt: Date.now(),
  };
  await blob.setJSON(key, merged);
  return merged;
}

export function parseCrossmintWebhookEvent(
  event?: string,
  currentStatus?: string,
): string {
  const eventType = (event ?? "").toLowerCase().trim();
  const current = (currentStatus ?? "unknown").toLowerCase();

  if (!eventType) return current;

  let status = current;

  if (eventType.includes("orders.quote.created")) {
    status = "created";
  } else if (eventType.includes("orders.quote.updated")) {
    status = "created";
  } else if (eventType.includes("orders.payment.succeeded")) {
    status = "paid";
  } else if (eventType.includes("orders.payment.failed")) {
    status = "fulfillment_error";
  } else if (eventType.includes("orders.delivery.initiated")) {
    status = "delivery_started";
  } else if (eventType.includes("orders.delivery.completed")) {
    status = "completed";
  } else if (eventType.includes("orders.delivery.failed")) {
    status = "fulfillment_error";
  } else if (eventType.includes("purchase.succeeded")) {
    status = "completed";
  }

  // Never go backwards in status flow
  return getStatusRank(status) < getStatusRank(current) ? current : status;
}

export async function getUsdcBalance(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey,
): Promise<bigint> {
  const accounts = await connection.getTokenAccountsByOwner(owner, { mint });
  if (!accounts.value.length) return 0n;
  const balance = await connection.getTokenAccountBalance(
    accounts.value[0].pubkey,
  );
  return BigInt(balance.value.amount);
}

const USDC_DECIMALS = 6;

export function usdToUsdc(usd: number): string {
  // USDC has 6 decimals; store as integer string
  return String(Math.round(usd * 10 ** USDC_DECIMALS));
}

export function usdcToUsd(usdc: string | bigint): number {
  const value = typeof usdc === "string" ? BigInt(usdc) : usdc;
  return Number(value) / 10 ** USDC_DECIMALS;
}

export async function decodeSolanaTxBytes(data: string): Promise<Uint8Array> {
  const input = data.trim();

  try {
    const decoded = atob(input);
    return Uint8Array.from(decoded, (c) => c.charCodeAt(0));
  } catch {
    // Ignore error
  }

  try {
    const { base58 } = await import("https://esm.sh/@scure/base@1.1.3");
    return base58.decode(input);
  } catch {
    // Ignore error
  }

  try {
    const parsed = JSON.parse(input);
    if (Array.isArray(parsed)) return Uint8Array.from(parsed);
  } catch {
    // Ignore error
  }

  throw new Error("Unrecognized transaction format");
}

export function usdcToBaseUnits(amount: string | number): string {
  if (amount === null || amount === undefined) {
    throw new Error("amount is required");
  }

  const n = Number(amount);
  if (!Number.isFinite(n)) {
    throw new Error("Amount must be a finite number or number string");
  }

  return BigInt(Math.round(n * 1e6)).toString();
}
