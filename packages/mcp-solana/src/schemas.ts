import { z } from "zod";

export const getBalanceSchema = {
  address: z.string().min(32).describe("Base58 public key"),
  commitment: z.enum(["processed", "confirmed", "finalized"]).optional(),
};

export const getAccountInfoSchema = {
  address: z.string().min(32),
  encoding: z.enum(["base64", "jsonParsed"]).default("jsonParsed"),
  commitment: z.enum(["processed", "confirmed", "finalized"]).optional(),
};

export const getLatestBlockhashSchema = {
  commitment: z.enum(["processed", "confirmed", "finalized"]).optional(),
};

export const requestAirdropSchema = {
  address: z.string().min(32),
  lamports: z.number().int().positive(),
};
