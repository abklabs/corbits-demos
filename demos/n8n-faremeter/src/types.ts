import { type } from 'arktype';
import { isValidationError } from '@faremeter/types';

export { isValidationError };

export const SolanaAddress = type('/^[1-9A-HJ-NP-Za-km-z]{32,44}$/');
export type SolanaAddress = typeof SolanaAddress.infer;

export const HttpUrl = type('string.url');
export type HttpUrl = typeof HttpUrl.infer;

export const Network = type("'mainnet' | 'devnet'");
export const FaremeterNetwork = type("'solana-mainnet' | 'solana-devnet'");
export const FaremeterScheme = type("'exact' | '@faremeter/x-solana-settlement'");
export const Commitment = type("'finalized' | 'confirmed' | 'processed'");

export type Network = typeof Network.infer;
export type FaremeterNetwork = typeof FaremeterNetwork.infer;
export type FaremeterScheme = typeof FaremeterScheme.infer;
export type Commitment = typeof Commitment.infer;

export const WebhookPath = type('string');
export type WebhookPath = typeof WebhookPath.infer;

export const CallbackUrl = type({
  url: HttpUrl,
  'method?': "'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'",
  'headers?': 'Record<string, string>',
  'timeout?': 'number.integer >= 1000',
  'retryCount?': '0 <= number.integer <= 10',
  'retryDelay?': '100 <= number.integer <= 10000',
});
export type CallbackUrl = typeof CallbackUrl.infer;

export const WebhookRequestBody = type({
  'callbackUrl?': 'string.url',
  'callback?': 'string.url',
  'body?': 'object',
  'query?': 'object',
});
export type WebhookRequestBody = typeof WebhookRequestBody.infer;

export const PaymentConfig = type({
  enabled: 'boolean',
  scheme: FaremeterScheme,
  network: FaremeterNetwork,
  assetMint: SolanaAddress,
  'payerKeypairPath?': 'string',
  facilitatorUrl: HttpUrl,
  pricing: {
    basePrice: 'number > 0',
    'dynamicPricing?': 'boolean',
    'priceMultiplier?': 'number > 0',
  },
});
export type PaymentConfig = typeof PaymentConfig.infer;

export const PaymentRequest = type({
  x402Version: '1',
  accepts: type([
    {
      scheme: 'string',
      network: 'string',
      maxAmountRequired: 'string',
      payTo: SolanaAddress,
      asset: SolanaAddress,
      'resource?': 'string',
      'description?': 'string',
      'mimeType?': 'string',
      'maxTimeoutSeconds?': 'number.integer > 0',
    },
  ]),
});
export type PaymentRequest = typeof PaymentRequest.infer;

export const WebhookOptions = type({
  'requirePayment?': 'boolean',
  'paymentAmount?': 'number > 0',
  'ignoreBots?': 'boolean',
  'rawBody?': 'boolean',
  'responseHeaders?': {
    entries: type([
      {
        name: 'string',
        value: 'string',
      },
    ]),
  },
});
export type WebhookOptions = typeof WebhookOptions.infer;

export const HttpMethod = type("'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD'");
export type HttpMethod = typeof HttpMethod.infer;

export const ResponseMode = type("'onReceived' | 'lastNode' | 'callback'");
export type ResponseMode = typeof ResponseMode.infer;

export const x402WebhookData = type({
  httpMethod: 'string',
  path: 'string',
  headers: 'Record<string, unknown>',
  query: 'Record<string, unknown>',
  body: 'unknown',
  'callbackUrl?': 'string.url',
  webhookId: 'string',
  timestamp: 'number.integer > 0',
});
export type x402WebhookData = typeof x402WebhookData.infer;

export const NETWORKS = {
  'solana-mainnet': {
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    usdcMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' as SolanaAddress,
  },
  'solana-devnet': {
    rpcUrl: 'https://api.devnet.solana.com',
    usdcMint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU' as SolanaAddress,
  },
} as const;

export interface FaremeterApiCredentials {
  scheme: FaremeterScheme;
  network: FaremeterNetwork;
  assetMint: string;
  paytoAddress: string;
  facilitatorUrl: string;
  rpcUrl?: string;
}
