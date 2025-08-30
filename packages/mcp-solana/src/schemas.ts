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

export const getTransactionSchema = {
  signature: z.string().min(32),
  maxSupportedTransactionVersion: z.number().optional(),
  commitment: z.enum(["processed", "confirmed", "finalized"]).optional(),
};

export const getSignaturesForAddressSchema = {
  address: z.string().min(32),
  limit: z.number().int().positive().optional(),
  before: z.string().optional(),
  until: z.string().optional(),
  commitment: z.enum(["processed", "confirmed", "finalized"]).optional(),
};

export const getTokenAccountsByOwnerSchema = {
  owner: z.string().min(32),
  mint: z.string().min(32).optional(),
  programId: z.string().min(32).optional(),
  commitment: z.enum(["processed", "confirmed", "finalized"]).optional(),
};

export const getProgramAccountsSchema = {
  programId: z.string().min(32),
  dataSize: z.number().int().positive().optional(),
  commitment: z.enum(["processed", "confirmed", "finalized"]).optional(),
};
