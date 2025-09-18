import {
  INodeType,
  INodeTypeDescription,
  IWebhookFunctions,
  IWebhookResponseData,
  INodeExecutionData,
  IDataObject,
  NodeOperationError,
} from 'n8n-workflow';

import {
  generateWebhookId,
  extractCallbackUrl,
  parseRequestBody,
  validateWebhookPath,
} from '../../src/utils';

import { x402WebhookData } from '../../src/types';
import { handleFaremeterPayment } from '../../src/faremeter';

export class x402Webhook implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'x402 Webhook',
    name: 'x402Webhook',
    icon: 'file:../../icons/x402.png',
    group: ['trigger'],
    version: 1,
    description: 'x402-enabled webhook trigger with payment and callback support',
    defaults: {
      name: 'x402 Webhook',
    },
    inputs: [],
    outputs: ['main'],
    credentials: [
      {
        name: 'faremeterApi',
        required: false,
        displayOptions: {
          show: {
            '/options.requirePayment': [true],
          },
        },
      },
    ],
    webhooks: [
      {
        name: 'default',
        httpMethod: '={{$parameter["httpMethod"]}}',
        responseMode: '={{$parameter["responseMode"]}}',
        path: '={{$parameter["path"]}}',
        isFullPath: false,
      },
    ],
    properties: [
      {
        displayName: 'HTTP Method',
        name: 'httpMethod',
        type: 'options',
        options: [
          { name: 'POST', value: 'POST' },
          { name: 'GET', value: 'GET' },
        ],
        default: 'POST',
        description: 'The HTTP method to listen for',
      },
      {
        displayName: 'Path',
        name: 'path',
        type: 'string',
        default: 'webhook',
        required: true,
        description: 'The path to listen on (e.g., "my-webhook" will create /webhook/my-webhook)',
      },
      {
        displayName: 'Response Mode',
        name: 'responseMode',
        type: 'options',
        options: [
          {
            name: 'On Received',
            value: 'onReceived',
            description: 'Returns response immediately on receiving the webhook',
          },
          {
            name: 'Last Node',
            value: 'lastNode',
            description: 'Returns data from the last executed node',
          },
          {
            name: 'Async Callback',
            value: 'callback',
            description: 'Acknowledge receipt and send workflow result to a callback URL later',
          },
        ],
        default: 'onReceived',
        description: 'How to respond to the webhook request',
      },
      {
        displayName: 'Response Code',
        name: 'responseCode',
        type: 'number',
        displayOptions: {
          show: {
            responseMode: ['onReceived', 'lastNode'],
          },
        },
        typeOptions: {
          minValue: 100,
          maxValue: 599,
        },
        default: 200,
        description: 'The HTTP response code to return',
      },
      {
        displayName: 'Response Headers',
        name: 'responseHeaders',
        type: 'json',
        displayOptions: {
          show: {
            responseMode: ['onReceived', 'lastNode'],
          },
        },
        default: '{}',
        description: 'Custom headers to send in the response',
      },
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        options: [
          {
            displayName: 'Binary Property',
            name: 'binaryPropertyName',
            type: 'string',
            default: 'data',
            description: 'Name of the binary property to write data to for binary data uploads',
          },
          {
            displayName: 'Ignore Bots',
            name: 'ignoreBots',
            type: 'boolean',
            default: false,
            description: 'Whether to ignore requests from known bots',
          },
          {
            displayName: 'Raw Body',
            name: 'rawBody',
            type: 'boolean',
            default: false,
            description: 'Whether to return the body as raw binary data',
          },
          {
            displayName: 'Require Payment',
            name: 'requirePayment',
            type: 'boolean',
            default: false,
            description: 'Whether to require Faremeter payment for webhook access',
          },
          {
            displayName: 'Payment Amount (USDC)',
            name: 'paymentAmount',
            type: 'number',
            displayOptions: {
              show: {
                requirePayment: [true],
              },
            },
            default: 0.001,
            description: 'Amount to charge in USDC for webhook access',
          },
        ],
      },
    ],
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const req = this.getRequestObject();
    const resp = this.getResponseObject();
    const headers = this.getHeaderData() as IDataObject;

    const params = this.getParamsData() as IDataObject;
    const httpMethod = this.getNodeParameter('httpMethod', 0) as string;
    const responseMode = this.getNodeParameter('responseMode', 0) as string;
    let responseCode = 200;
    let responseHeaders: IDataObject = {};
    let options: IDataObject = {};

    try {
      if (responseMode === 'onReceived' || responseMode === 'lastNode') {
        responseCode = this.getNodeParameter('responseCode', 0) as number;
        responseHeaders = this.getNodeParameter('responseHeaders', 0) as IDataObject;
      }
      options = this.getNodeParameter('options', 0) as IDataObject;
    } catch {}

    if (options.requirePayment === true) {
      const paymentAmount = (options.paymentAmount as number) || 0.001;
      const paymentValid = await handleFaremeterPayment(this, paymentAmount);

      if (!paymentValid) {
        const paymentResponse = (this as any).paymentResponse;
        if (paymentResponse) {
          resp.statusCode = 402;
          for (const [key, value] of Object.entries(paymentResponse.headers || {})) {
            resp.setHeader(key, value as string);
          }
          resp.end(JSON.stringify(paymentResponse.body));

          return {
            noWebhookResponse: true,
            workflowData: [],
          };
        }
      }
    }

    if (options.ignoreBots === true) {
      const userAgent = (headers['user-agent'] as string)?.toLowerCase() || '';
      const botPatterns = ['bot', 'crawler', 'spider', 'scraper'];
      if (botPatterns.some((pattern) => userAgent.includes(pattern))) {
        return {
          webhookResponse: {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
            body: { error: 'Bot access denied' },
          },
          workflowData: [],
        };
      }
    }

    const contentType = headers['content-type'] as string;
    let body: IDataObject | string;

    if (options.rawBody === true) {
      body = this.getBodyData().toString();
    } else {
      body = parseRequestBody(contentType, this.getBodyData());
    }

    const callbackUrl =
      responseMode === 'callback' ? extractCallbackUrl({ body, query: params }) : undefined;

    if (responseMode === 'callback' && !callbackUrl) {
      throw new NodeOperationError(this.getNode(), 'Callback URL not found in request');
    }

    const path = this.getNodeParameter('path', 0) as string;
    const validatedPath = validateWebhookPath(path);

    const webhookData: x402WebhookData = {
      httpMethod,
      path: validatedPath,
      headers,
      query: params,
      body,
      webhookId: generateWebhookId(),
      timestamp: Date.now(),
      ...(callbackUrl && { callbackUrl }), // Only include if defined
    };

    if (callbackUrl) {
      const staticData = this.getWorkflowStaticData('global');
      staticData.callbackUrl = callbackUrl;
      staticData.webhookId = webhookData.webhookId;
    }

    const returnData: INodeExecutionData[] = [
      {
        json: webhookData as IDataObject,
      },
    ];

    if (responseMode === 'onReceived') {
      const responseData = {
        success: true,
        message: 'Webhook received',
        webhookId: webhookData.webhookId,
      };

      let parsedHeaders = responseHeaders;
      if (typeof responseHeaders === 'string') {
        try {
          parsedHeaders = JSON.parse(responseHeaders);
        } catch {
          parsedHeaders = {};
        }
      }

      return {
        webhookResponse: {
          status: responseCode,
          headers: parsedHeaders,
          body: responseData,
        },
        workflowData: [returnData],
      };
    } else if (responseMode === 'callback') {
      const responseData = {
        success: true,
        message: 'Webhook received, response will be sent to callback URL',
        webhookId: webhookData.webhookId,
        callbackUrl,
      };

      return {
        webhookResponse: {
          status: 202, // Accepted
          headers: { 'Content-Type': 'application/json' },
          body: responseData,
        },
        workflowData: [returnData],
      };
    } else {
      return {
        workflowData: [returnData],
      };
    }
  }
}
