import { Context } from "npm:hono@3";

export const paid = async (c: Context) => {
  const rpcUrl = Deno.env.get("SOLANA_RPC_URL");

  const res = await fetch(rpcUrl!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "getSlot" }),
  });

  const data = await res.json();

  return c.json({
    success: true,
    message: "Payment successful!",
    currentSlot: data.result,
  });
};
