import dotenv from "dotenv";

dotenv.config();

const required = ["PAYTO_ADDRESS"];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`Error: ${key} is not set in .env`);
    process.exit(1);
  }
}

export const TEST_CONFIG = {
  SERVER_PORT: process.env.SERVER_PORT ?? "3333",
  PAYTO_ADDRESS: process.env.PAYTO_ADDRESS as string,
};
