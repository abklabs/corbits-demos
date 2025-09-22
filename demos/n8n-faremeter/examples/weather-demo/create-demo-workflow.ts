import 'dotenv/config';
import * as https from 'https';
import * as http from 'http';
import * as fs from 'fs';
import * as path from 'path';
import { type } from 'arktype';
import {
  FaremeterApiCredentials,
  FaremeterScheme,
  FaremeterNetwork,
  SolanaAddress,
} from '../../src/types';

interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, any>;
  webhookId?: string;
}

interface WorkflowConnection {
  node: string;
  type: string;
  index: number;
}

interface WorkflowDefinition {
  name: string;
  nodes: WorkflowNode[];
  connections: Record<string, { main: WorkflowConnection[][] }>;
  settings: { executionOrder: string };
}

interface ApiResponse {
  statusCode: number;
  data: any;
}

const envSchema = type({
  N8N_API_KEY: 'string>0',
  'N8N_HOST?': 'string',
  'N8N_PORT?': 'number | string',
  'N8N_PROTOCOL?': 'string',
  'WORKFLOW_NAME?': 'string',
  FAREMETER_SCHEME: FaremeterScheme,
  FAREMETER_NETWORK: FaremeterNetwork,
  FAREMETER_PAYTO_ADDRESS: SolanaAddress,
  FAREMETER_FACILITATOR_URL: 'string.url',
  SOLANA_RPC_URL: 'string.url',
  USDC_MINT: SolanaAddress,
});

const config = envSchema(process.env);
if (config instanceof type.errors) {
  console.error('Environment configuration error:');
  console.error(config.summary);
  process.exit(1);
}

const API_KEY = config.N8N_API_KEY;
const N8N_HOST = config.N8N_HOST ?? 'localhost';
const N8N_PORT = Number(config.N8N_PORT ?? 5678);
const N8N_PROTOCOL = config.N8N_PROTOCOL ?? 'http';
const WORKFLOW_NAME = config.WORKFLOW_NAME ?? 'x402 Weather Demo';

const weatherFunctionCode = `// Extract zipcode
const webhookData = items[0].json;
const zipcode = webhookData.body?.zipcode || webhookData.query?.zipcode || '10001';

// Generate weather data
const temperature = Math.floor(Math.random() * 25) + 60;
const conditions = ['sunny', 'partly cloudy', 'cloudy', 'rainy'];
const condition = conditions[Math.floor(Math.random() * conditions.length)];

const cities = {
  '10001': 'New York, NY',
  '90210': 'Beverly Hills, CA',
  '60601': 'Chicago, IL'
};

const city = cities[zipcode] ?? 'Unknown City';
const callbackUrl = webhookData.body?.callbackUrl ?? webhookData.query?.callbackUrl;

return [{
  json: {
    location: { zipcode, city },
    weather: {
      temperature,
      temperatureUnit: 'F',
      condition,
      description: \`It's \${temperature}°F and \${condition} in \${city}\`
    },
    timestamp: new Date().toISOString(),
    callbackUrl: callbackUrl ?? null
  }
}];`;

const nodes: WorkflowNode[] = [
  {
    id: 'webhook-node',
    name: 'x402 Webhook',
    type: 'n8n-nodes-faremeter.x402Webhook',
    typeVersion: 1,
    position: [250, 300],
    parameters: {
      httpMethod: 'POST',
      path: 'weather-demo',
      responseMode: 'onReceived',
      responseCode: 200,
      responseHeaders: '{"Content-Type": "application/json"}',
      options: {
        requirePayment: true,
        paymentAmount: 0.01,
      },
    },
    webhookId: 'weather-demo-webhook',
  },
  {
    id: 'weather-function',
    name: 'Generate Weather Data',
    type: 'n8n-nodes-base.function',
    typeVersion: 1,
    position: [450, 300],
    parameters: { functionCode: weatherFunctionCode },
  },
  {
    id: 'if-node',
    name: 'Has Callback URL?',
    type: 'n8n-nodes-base.if',
    typeVersion: 1,
    position: [650, 300],
    parameters: {
      conditions: {
        string: [
          {
            value1: '={{$json["callbackUrl"]}}',
            operation: 'isNotEmpty',
          },
        ],
      },
    },
  },
  {
    id: 'responder-node',
    name: 'Send Callback',
    type: 'n8n-nodes-faremeter.x402WebhookResponder',
    typeVersion: 1,
    position: [850, 250],
    parameters: {
      responseSource: 'inputData',
      callbackUrlField: 'callbackUrl',
      httpMethod: 'POST',
      responseFormat: 'json',
      responseData: 'first',
      options: {
        includeTimestamp: true,
        retryCount: 3,
      },
    },
  },
];

const connections = {
  'x402 Webhook': {
    main: [[{ node: 'Generate Weather Data', type: 'main', index: 0 }]],
  },
  'Generate Weather Data': {
    main: [[{ node: 'Has Callback URL?', type: 'main', index: 0 }]],
  },
  'Has Callback URL?': {
    main: [[{ node: 'Send Callback', type: 'main', index: 0 }], []],
  },
};

const workflowDefinition: WorkflowDefinition = {
  name: WORKFLOW_NAME,
  nodes,
  connections,
  settings: { executionOrder: 'v1' },
};

const faremeterCredentials = {
  name: 'Faremeter Demo Credentials',
  type: 'faremeterApi',
  data: {
    scheme: config.FAREMETER_SCHEME,
    network: config.FAREMETER_NETWORK,
    assetMint: config.USDC_MINT,
    paytoAddress: config.FAREMETER_PAYTO_ADDRESS,
    facilitatorUrl: config.FAREMETER_FACILITATOR_URL,
    rpcUrl: config.SOLANA_RPC_URL,
  } satisfies FaremeterApiCredentials,
};

function makeRequest(options: http.RequestOptions, data?: any): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    const client = N8N_PROTOCOL === 'https' ? https : http;

    const req = client.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => (responseData += chunk));
      res.on('end', () => {
        try {
          const parsedData = responseData ? JSON.parse(responseData) : {};
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ statusCode: res.statusCode, data: parsedData });
          } else {
            reject(new Error(`API request failed: ${res.statusCode}`));
          }
        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function createCredential(credential: any) {
  return makeRequest(
    {
      hostname: N8N_HOST,
      port: N8N_PORT,
      path: '/api/v1/credentials',
      method: 'POST',
      headers: {
        'X-N8N-API-KEY': API_KEY,
        'Content-Type': 'application/json',
      },
    },
    credential,
  );
}

async function getWorkflowByName(name: string) {
  const response = await makeRequest({
    hostname: N8N_HOST,
    port: N8N_PORT,
    path: '/api/v1/workflows',
    method: 'GET',
    headers: {
      'X-N8N-API-KEY': API_KEY,
      Accept: 'application/json',
    },
  });

  const workflows = response.data.data ?? [];
  return workflows.find((w: any) => w.name === name);
}

async function createOrUpdateWorkflow(workflow: WorkflowDefinition) {
  const existing = await getWorkflowByName(workflow.name);

  if (existing) {
    return makeRequest(
      {
        hostname: N8N_HOST,
        port: N8N_PORT,
        path: `/api/v1/workflows/${existing.id}`,
        method: 'PUT',
        headers: {
          'X-N8N-API-KEY': API_KEY,
          'Content-Type': 'application/json',
        },
      },
      workflow,
    );
  } else {
    return makeRequest(
      {
        hostname: N8N_HOST,
        port: N8N_PORT,
        path: '/api/v1/workflows',
        method: 'POST',
        headers: {
          'X-N8N-API-KEY': API_KEY,
          'Content-Type': 'application/json',
        },
      },
      workflow,
    );
  }
}

async function activateWorkflow(id: string) {
  await makeRequest({
    hostname: N8N_HOST,
    port: N8N_PORT,
    path: `/api/v1/workflows/${id}/activate`,
    method: 'POST',
    headers: {
      'X-N8N-API-KEY': API_KEY,
    },
  });
}

console.log(`Setting up Faremeter demo...`);

createCredential(faremeterCredentials)
  .then((credResult) => {
    const credentialId = credResult.data.id;
    console.log(`Credential created with ID: ${credentialId}`);

    // Update the webhook node to use the credential
    nodes[0].credentials = {
      faremeterApi: {
        id: credentialId,
        name: faremeterCredentials.name,
      },
    };

    console.log(`Creating workflow "${WORKFLOW_NAME}"...`);
    return createOrUpdateWorkflow(workflowDefinition);
  })
  .then((result) => {
    const workflowId = result.data.id;
    return activateWorkflow(workflowId).then(() => workflowId);
  })
  .then((workflowId) => {
    console.log(`Workflow ready: ${N8N_PROTOCOL}://${N8N_HOST}:${N8N_PORT}/workflow/${workflowId}`);
    console.log(
      `Webhook: ${N8N_PROTOCOL}://${N8N_HOST}:${N8N_PORT}/webhook/weather-demo-webhook/weather-demo`,
    );
    console.log(`Payment: 0.01 USDC to ${faremeterCredentials.data.paytoAddress}`);
  })
  .catch((error) => {
    console.error('Setup failed:', error);
    process.exit(1);
  });
