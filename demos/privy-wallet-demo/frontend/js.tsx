import { blob } from "https://esm.town/v/std/blob";

export const js = async () => {
  const env = {
    PRIVY_APP_ID: Deno.env.get("PRIVY_APP_ID"),
    FAREMETER_NETWORK: Deno.env.get("FAREMETER_NETWORK") ?? "mainnet-beta",
    FAREMETER_ASSET: Deno.env.get("FAREMETER_ASSET") ?? "USDC",
  };

  const required = ["PRIVY_APP_ID"];
  const missingVars = required.filter((key) => !env[key]);

  if (missingVars.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missingVars.join(", ")}`,
    );
  }

  // Fetch the bundled Privy 3.1.0 + Faremeter app from blob storage
  const compressedBundle = await blob.get("privy-app-bundle");
  const decompressedStream = compressedBundle.body!.pipeThrough(
    new DecompressionStream("gzip"),
  );
  const bundle = await new Response(decompressedStream).text();

  const ret = `// Privy 3.1.0 + Faremeter Bundle
window.PRIVY_CONFIG = {
  appId: "${env.PRIVY_APP_ID}",
  network: "${env.FAREMETER_NETWORK}",
  asset: "${env.FAREMETER_ASSET}"
};

${bundle}`;

  return new Response(ret, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
};
