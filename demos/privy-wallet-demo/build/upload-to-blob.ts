import { config } from "dotenv";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: resolve(__dirname, "../.env") });

const apiKey = process.env.VALTOWN_API_KEY;
if (!apiKey) {
  console.error("Error: VALTOWN_API_KEY not found in .env file");
  process.exit(1);
}

async function uploadToBlob() {
  console.log("Reading compressed bundle...");
  const compressedContent = readFileSync(
    resolve(__dirname, "./dist/app.js.gz"),
  );

  console.log(
    `Uploading ${compressedContent.length} bytes to Val.town blob storage...`,
  );

  const response = await fetch(
    "https://api.val.town/v1/blob/privy-app-bundle",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/octet-stream",
      },
      body: compressedContent,
    },
  );

  if (!response.ok) {
    throw new Error(
      `Upload failed: ${response.status} ${await response.text()}`,
    );
  }

  console.log("Upload complete...bundle stored as 'privy-app-bundle'");
}

uploadToBlob().catch((error) => {
  console.error("Upload failed:", error);
  process.exit(1);
});
