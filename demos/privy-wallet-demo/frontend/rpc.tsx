export const rpc = async (c: any) => {
  const origin = c.req.header("Origin") || c.req.header("Referer");
  if (!origin?.includes("val.run")) {
    return c.json({ error: "Invalid origin" }, 403);
  }

  const env = {
    SOLANA_RPC_URL: Deno.env.get("SOLANA_RPC_URL"),
  };

  if (!env.SOLANA_RPC_URL) {
    return c.json({ error: "SOLANA_RPC_URL not configured" }, 500);
  }

  const body = await c.req.json();

  const response = await fetch(env.SOLANA_RPC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  return c.json(data);
};
