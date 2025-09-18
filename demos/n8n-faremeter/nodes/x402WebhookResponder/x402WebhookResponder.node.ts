import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IDataObject,
  NodeOperationError,
} from 'n8n-workflow';

import { makeHttpRequest } from '../../src/utils';

export class x402WebhookResponder implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'x402 Webhook Responder',
    name: 'x402WebhookResponder',
    icon: 'file:../../icons/x402.png',
    group: ['transform'],
    version: 1,
    description: 'Send response to x402 webhook callback URL',
    defaults: {
      name: 'x402 Webhook Responder',
    },
    inputs: ['main'],
    outputs: ['main'],
    properties: [
      {
        displayName: 'Response Source',
        name: 'responseSource',
        type: 'options',
        options: [
          {
            name: 'Workflow Static Data',
            value: 'staticData',
            description: 'Use callback URL from workflow static data (set by x402 Webhook)',
          },
          {
            name: 'Input Data',
            value: 'inputData',
            description: 'Use callback URL from input data',
          },
          {
            name: 'Manual',
            value: 'manual',
            description: 'Manually specify callback URL',
          },
        ],
        default: 'staticData',
        description: 'Where to get the callback URL from',
      },
      {
        displayName: 'Callback URL Field',
        name: 'callbackUrlField',
        type: 'string',
        displayOptions: {
          show: {
            responseSource: ['inputData'],
          },
        },
        default: 'callbackUrl',
        description: 'Field name containing the callback URL in input data',
      },
      {
        displayName: 'Callback URL',
        name: 'callbackUrl',
        type: 'string',
        displayOptions: {
          show: {
            responseSource: ['manual'],
          },
        },
        default: '',
        placeholder: 'https://example.com/callback',
        description: 'The URL to send the response to',
      },
      {
        displayName: 'HTTP Method',
        name: 'httpMethod',
        type: 'options',
        options: [
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
          { name: 'PATCH', value: 'PATCH' },
          { name: 'GET', value: 'GET' },
          { name: 'DELETE', value: 'DELETE' },
        ],
        default: 'POST',
        description: 'HTTP method to use for the callback',
      },
      {
        displayName: 'Response Format',
        name: 'responseFormat',
        type: 'options',
        options: [
          {
            name: 'JSON',
            value: 'json',
            description: 'Send response as JSON',
          },
          {
            name: 'Form Data',
            value: 'formData',
            description: 'Send response as form data',
          },
          {
            name: 'Raw',
            value: 'raw',
            description: 'Send raw data',
          },
        ],
        default: 'json',
        description: 'Format to send the response in',
      },
      {
        displayName: 'Response Data',
        name: 'responseData',
        type: 'options',
        options: [
          {
            name: 'All Items',
            value: 'all',
            description: 'Send all items as an array',
          },
          {
            name: 'First Item',
            value: 'first',
            description: 'Send only the first item',
          },
          {
            name: 'Last Item',
            value: 'last',
            description: 'Send only the last item',
          },
          {
            name: 'Custom',
            value: 'custom',
            description: 'Define custom response data',
          },
        ],
        default: 'all',
        description: 'What data to send in the response',
      },
      {
        displayName: 'Custom Response',
        name: 'customResponse',
        type: 'json',
        displayOptions: {
          show: {
            responseData: ['custom'],
          },
        },
        default: '{}',
        description: 'Custom JSON data to send in the response',
      },
      {
        displayName: 'Options',
        name: 'options',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        options: [
          {
            displayName: 'Headers',
            name: 'headers',
            type: 'json',
            default: '{}',
            description: 'Custom headers to send with the callback request',
          },
          {
            displayName: 'Include Webhook ID',
            name: 'includeWebhookId',
            type: 'boolean',
            default: true,
            description: 'Whether to include the webhook ID in the response',
          },
          {
            displayName: 'Include Timestamp',
            name: 'includeTimestamp',
            type: 'boolean',
            default: true,
            description: 'Whether to include a timestamp in the response',
          },
          {
            displayName: 'Retry Count',
            name: 'retryCount',
            type: 'number',
            typeOptions: {
              minValue: 0,
              maxValue: 5,
            },
            default: 3,
            description: 'Number of times to retry on failure',
          },
          {
            displayName: 'Retry Delay (ms)',
            name: 'retryDelay',
            type: 'number',
            typeOptions: {
              minValue: 100,
              maxValue: 10000,
            },
            default: 1000,
            description: 'Exponential backoff delay between retries',
          },
          {
            displayName: 'Timeout (ms)',
            name: 'timeout',
            type: 'number',
            typeOptions: {
              minValue: 1000,
              maxValue: 60000,
            },
            default: 30000,
            description: 'Request timeout in milliseconds',
          },
          {
            displayName: 'Continue On Fail',
            name: 'continueOnFail',
            type: 'boolean',
            default: false,
            description: 'Whether to continue workflow execution if callback fails',
          },
        ],
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();

    try {
      const responseSource = this.getNodeParameter('responseSource', 0) as string;
      const httpMethod = this.getNodeParameter('httpMethod', 0) as string;
      const responseFormat = this.getNodeParameter('responseFormat', 0) as string;
      const responseDataType = this.getNodeParameter('responseData', 0) as string;
      const options = this.getNodeParameter('options', 0, {}) as IDataObject;

      let callbackUrl: string | undefined;

      if (responseSource === 'staticData') {
        const staticData = this.getWorkflowStaticData('global');
        callbackUrl = staticData.callbackUrl as string;
      } else if (responseSource === 'inputData') {
        const fieldName = this.getNodeParameter('callbackUrlField', 0) as string;
        const item = items[0];
        if (item && item.json && fieldName in item.json) {
          callbackUrl = item.json[fieldName] as string;
        }
      } else if (responseSource === 'manual') {
        callbackUrl = this.getNodeParameter('callbackUrl', 0) as string;
      }

      if (!callbackUrl) {
        throw new NodeOperationError(this.getNode(), 'Callback URL not found or not specified');
      }

      let responseBody: any;

      if (responseDataType === 'all') {
        responseBody = items.map((item) => item.json);
      } else if (responseDataType === 'first') {
        responseBody = items[0]?.json || {};
      } else if (responseDataType === 'last') {
        responseBody = items[items.length - 1]?.json || {};
      } else if (responseDataType === 'custom') {
        const customResponse = this.getNodeParameter('customResponse', 0);
        responseBody =
          typeof customResponse === 'string' ? JSON.parse(customResponse) : customResponse;
      }

      const metadata: IDataObject = {};

      if (options.includeWebhookId === true) {
        const staticData = this.getWorkflowStaticData('global');
        if (staticData.webhookId) {
          metadata.webhookId = staticData.webhookId;
        }
      }

      if (options.includeTimestamp === true) {
        metadata.timestamp = Date.now();
      }

      if (Object.keys(metadata).length > 0) {
        responseBody = {
          metadata,
          result: responseBody,
        };
      }

      const headers: IDataObject = {};

      if (responseFormat === 'json') {
        headers['Content-Type'] = 'application/json';
      } else if (responseFormat === 'formData') {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
      } else if (responseFormat === 'raw') {
        headers['Content-Type'] = 'text/plain';
      }

      if (options.headers) {
        const customHeaders =
          typeof options.headers === 'string' ? JSON.parse(options.headers) : options.headers;
        Object.assign(headers, customHeaders);
      }

      let formattedBody: any = undefined;

      if (httpMethod !== 'GET' && httpMethod !== 'DELETE') {
        formattedBody = responseBody;

        if (responseFormat === 'formData' && typeof responseBody === 'object') {
          const params = new URLSearchParams();
          Object.entries(responseBody).forEach(([key, value]) => {
            params.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
          });
          formattedBody = params.toString();
        }
      }

      const retryCount = (options.retryCount as number) || 3;
      const retryDelay = (options.retryDelay as number) || 1000;
      const timeout = (options.timeout as number) || 30000;

      let lastError: Error | undefined;
      let response: any;
      let actualAttempts = 0;

      for (let attempt = 0; attempt <= retryCount; attempt++) {
        actualAttempts++;
        try {
          if (attempt > 0) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
          }

          response = await makeHttpRequest(
            callbackUrl,
            httpMethod,
            headers,
            formattedBody,
            timeout,
          );

          if (response.status >= 200 && response.status < 300) {
            lastError = undefined;
            break;
          } else {
            throw new Error(`HTTP ${response.status}: ${response.data}`);
          }
        } catch (error) {
          lastError = error as Error;
          if (attempt === retryCount) {
            if (options.continueOnFail !== true) {
              throw error;
            }
          }
        }
      }

      const resultData: IDataObject = {
        success: !lastError,
        callbackUrl,
        method: httpMethod,
        attempts: actualAttempts,
      };

      if (response) {
        resultData.response = {
          status: response.status,
          headers: response.headers,
          data: response.data,
        };
      }

      if (lastError) {
        resultData.error = lastError.message;
      }

      return [
        [
          {
            json: resultData,
            pairedItem: { item: 0 },
          },
        ],
      ];
    } catch (error) {
      if (this.continueOnFail()) {
        return [
          [
            {
              json: {
                error: (error as Error).message,
                success: false,
              },
              pairedItem: { item: 0 },
            },
          ],
        ];
      }
      throw error;
    }
  }
}
