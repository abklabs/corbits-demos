import { IDataObject, INodeExecutionData } from 'n8n-workflow';
import crypto from 'crypto';
import { WebhookPath, WebhookRequestBody, isValidationError } from './types';

export function generateWebhookId(): string {
  return crypto.randomBytes(16).toString('hex');
}

export function extractCallbackUrl(data: IDataObject): string | undefined {
  const result = WebhookRequestBody(data);

  if (!isValidationError(result)) {
    if (result.callbackUrl) return result.callbackUrl;
    if (result.callback) return result.callback;
  }

  if (data.body && typeof data.body === 'object') {
    const bodyResult = WebhookRequestBody(data.body);
    if (!isValidationError(bodyResult)) {
      if (bodyResult.callbackUrl) return bodyResult.callbackUrl;
      if (bodyResult.callback) return bodyResult.callback;
    }
  }

  if (data.query && typeof data.query === 'object') {
    const queryResult = WebhookRequestBody(data.query);
    if (!isValidationError(queryResult)) {
      if (queryResult.callbackUrl) return queryResult.callbackUrl;
      if (queryResult.callback) return queryResult.callback;
    }
  }

  return undefined;
}

export function parseRequestBody(contentType: string | undefined, body: any): IDataObject | string {
  if (!contentType) {
    return body;
  }

  if (contentType.includes('application/json')) {
    try {
      return typeof body === 'string' ? JSON.parse(body) : body;
    } catch {
      return body;
    }
  }

  if (contentType.includes('application/x-www-form-urlencoded')) {
    if (typeof body === 'string') {
      const params = new URLSearchParams(body);
      const result: IDataObject = {};
      for (const [key, value] of params.entries()) {
        result[key] = value;
      }
      return result;
    }
  }

  return body;
}

export function prepareWebhookResponse(items: INodeExecutionData[]): IDataObject {
  if (items.length === 0) {
    return { success: true, message: 'Workflow executed successfully' };
  }

  if (items.length === 1) {
    const firstItem = items[0];
    if (firstItem) {
      return firstItem.json;
    }
  }

  return {
    success: true,
    count: items.length,
    data: items.map((item) => item.json),
  };
}

export async function makeHttpRequest(
  url: string,
  method: string,
  headers: IDataObject = {},
  body?: any,
  timeout = 30000,
): Promise<{ status: number; data: any; headers: IDataObject }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const options: RequestInit = {
      method,
      headers: headers as any,
      signal: controller.signal,
    };

    if (body && method !== 'GET' && method !== 'HEAD') {
      if (typeof body === 'object' && !Buffer.isBuffer(body)) {
        options.body = JSON.stringify(body);
        (options.headers as any)['Content-Type'] = 'application/json';
      } else {
        options.body = body;
      }
    }

    const response = await fetch(url, options);
    const responseHeaders: IDataObject = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      status: response.status,
      data,
      headers: responseHeaders,
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

export function validateWebhookPath(path: string): string {
  let cleanPath = path.startsWith('/') ? path.slice(1) : path;

  cleanPath = cleanPath.endsWith('/') ? cleanPath.slice(0, -1) : cleanPath;

  const result = WebhookPath(cleanPath);

  if (isValidationError(result)) {
    const error = result[0];
    throw new Error(error?.message || 'Invalid webhook path format');
  }

  return result;
}

export function getWebhookUrl(baseUrl: string, path: string, webhookId: string): string {
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = validateWebhookPath(path);
  return `${cleanBase}/webhook/${cleanPath}/${webhookId}`;
}

export function usdcToBaseUnits(amountStr: string): string {
  const amount = parseFloat(amountStr);
  return Math.floor(amount * 1_000_000).toString();
}
