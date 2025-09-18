import { IWebhookFunctions, NodeOperationError } from 'n8n-workflow';
import { common } from '@faremeter/middleware';
import { usdcToBaseUnits } from './utils';
import { FaremeterApiCredentials } from './types';

const DEFAULT_N8N_PORT = 5678;

export type CreateMiddlewareArgs = common.CommonMiddlewareArgs;

function getResourceUrl(webhookContext: IWebhookFunctions): string {
  const req = webhookContext.getRequestObject();
  const protocol = req.protocol ?? 'http';
  let host = req.get('host') ?? 'localhost';

  if (host === 'localhost') {
    host = `localhost:${DEFAULT_N8N_PORT}`;
  }

  return `${protocol}://${host}${req.originalUrl || req.url}`;
}

export async function createMiddleware(args: CreateMiddlewareArgs) {
  return async (
    webhookContext: IWebhookFunctions,
  ): Promise<{
    paymentValid: boolean;
    paymentResponse?: { status: number; body: unknown };
  }> => {
    const headers = webhookContext.getHeaderData() as Record<string, string>;
    const resource = getResourceUrl(webhookContext);

    let paymentResponse: { status: number; body: unknown } | undefined;

    const middlewareResponse = await common.handleMiddlewareRequest({
      ...args,
      resource,
      getHeader: (key: string) => {
        // Headers in n8n are case-insensitive, normalize to lowercase
        const normalizedKey = key.toLowerCase();
        for (const [headerKey, value] of Object.entries(headers)) {
          if (headerKey.toLowerCase() === normalizedKey) {
            return typeof value === 'string' ? value : undefined;
          }
        }
        return undefined;
      },
      sendJSONResponse: (status, body) => {
        paymentResponse = { status, body };
        return body;
      },
    });

    return {
      paymentValid: !middlewareResponse,
      ...(paymentResponse && { paymentResponse }),
    };
  };
}

export async function handleFaremeterPayment(
  webhookContext: IWebhookFunctions,
  paymentAmount: number = 0.001,
): Promise<boolean> {
  let credentials: FaremeterApiCredentials;

  try {
    credentials = (await webhookContext.getCredentials('faremeterApi')) as FaremeterApiCredentials;
  } catch (error) {
    throw new NodeOperationError(
      webhookContext.getNode(),
      'Payment required but Faremeter API credentials not configured. ' +
        'Please configure Faremeter API credentials in n8n.',
    );
  }

  const { paytoAddress, facilitatorUrl, scheme, network, assetMint } = credentials;

  if (!paytoAddress) {
    throw new NodeOperationError(
      webhookContext.getNode(),
      'Payment required but payment recipient address not configured in Faremeter API credentials.',
    );
  }

  if (!facilitatorUrl || !scheme || !network || !assetMint) {
    throw new NodeOperationError(
      webhookContext.getNode(),
      'Faremeter API credentials are incomplete. Please configure all required fields.',
    );
  }

  const webhookPath = webhookContext.getNodeParameter('path', 0) as string;
  const resource = getResourceUrl(webhookContext);

  const accepts = [
    {
      scheme,
      network,
      payTo: paytoAddress,
      asset: assetMint,
      resource,
      maxAmountRequired: usdcToBaseUnits(paymentAmount.toString()),
      description: `Access to webhook: ${webhookPath}`,
      mimeType: 'application/json',
      maxTimeoutSeconds: 60,
    },
  ];

  const middleware = await createMiddleware({
    facilitatorURL: facilitatorUrl,
    accepts,
  });

  let result;
  try {
    result = await middleware(webhookContext);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes('402') || error.message.includes('Payment Required'))
    ) {
      (webhookContext as any).paymentResponse = {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'X-Payment-Required': 'true',
        },
        body: {
          x402Version: 1,
          accepts,
        },
      };
      return false;
    }

    console.error('Faremeter payment processing error:', error);
    (webhookContext as any).paymentResponse = {
      status: 500,
      body: {
        error: 'Payment processing error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
    };
    return false;
  }

  if (result.paymentResponse) {
    (webhookContext as any).paymentResponse = result.paymentResponse;
  }

  return result.paymentValid;
}
