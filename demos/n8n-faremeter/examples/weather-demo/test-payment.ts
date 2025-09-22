import 'dotenv/config';
import { Connection, Keypair, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { createLocalWallet } from '@faremeter/wallet-solana';
import { createPaymentHandler, lookupX402Network } from '@faremeter/payment-solana-exact';
import { wrap as wrapFetch } from '@faremeter/fetch';
import * as fs from 'fs';
import * as http from 'http';
import { type } from 'arktype';
import { Network, SolanaAddress } from '../../src/types';

const envSchema = type({
  PAYER_KEYPAIR_PATH: 'string>0',
  SOLANA_NETWORK: Network,
  USDC_MINT: SolanaAddress,
  NGROK_DOMAIN: 'string>0',
  'N8N_HOST?': 'string',
  'N8N_PORT?': 'number | string',
  'N8N_PROTOCOL?': 'string',
});

const config = envSchema(process.env);
if (config instanceof type.errors) {
  console.error('Environment configuration error:');
  console.error(config.summary);
  process.exit(1);
}

const PAYER_KEYPAIR_PATH = config.PAYER_KEYPAIR_PATH;
const SOLANA_NETWORK = config.SOLANA_NETWORK;
const USDC_MINT = config.USDC_MINT;
const N8N_HOST = config.N8N_HOST ?? 'localhost';
const N8N_PORT = config.N8N_PORT ?? '5678';
const N8N_PROTOCOL = config.N8N_PROTOCOL ?? 'http';

async function getTokenBalance(
  connection: Connection,
  owner: PublicKey,
  mint: PublicKey,
): Promise<number> {
  try {
    const accounts = await connection.getParsedTokenAccountsByOwner(owner, { mint });
    let totalBalance = 0n;
    for (const account of accounts.value) {
      const amount = account.account.data.parsed.info.tokenAmount.amount;
      totalBalance += BigInt(amount);
    }
    return Number(totalBalance) / 1_000_000;
  } catch (error) {
    return 0;
  }
}

async function getSolBalance(connection: Connection, pubkey: PublicKey): Promise<number> {
  try {
    const balance = await connection.getBalance(pubkey);
    return balance / 1e9;
  } catch (error) {
    return 0;
  }
}

function startCallbackServer(
  port: number = 8080,
): Promise<{ server: http.Server; callbackPromise: Promise<any> }> {
  return new Promise((resolve) => {
    let callbackResolve: (data: any) => void;
    const callbackPromise = new Promise((res) => {
      callbackResolve = res;
    });

    const server = http.createServer((req, res) => {
      if (req.url?.includes('/callback')) {
        let body = '';
        req.on('data', (chunk) => (body += chunk));
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            callbackResolve(data);
          } catch {
            callbackResolve(body);
          }
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true }));
        });
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    server.listen(port, () => resolve({ server, callbackPromise }));
  });
}

(async () => {
  let callbackServer: http.Server | undefined;

  try {
    const webhookUrl = `${N8N_PROTOCOL}://${N8N_HOST}:${N8N_PORT}/webhook/weather-demo-webhook/weather-demo`;

    const { server, callbackPromise } = await startCallbackServer(8080);
    callbackServer = server;
    const callbackUrl = `https://${config.NGROK_DOMAIN}/callback`;

    const keypairData = JSON.parse(fs.readFileSync(PAYER_KEYPAIR_PATH, 'utf-8'));
    const keypair = Keypair.fromSecretKey(Uint8Array.from(keypairData));
    const connection = new Connection(clusterApiUrl(SOLANA_NETWORK as any), 'confirmed');

    const solBalance = await getSolBalance(connection, keypair.publicKey);
    const usdcBalance = await getTokenBalance(
      connection,
      keypair.publicKey,
      new PublicKey(USDC_MINT),
    );

    console.log(`Balance: ${solBalance.toFixed(4)} SOL, ${usdcBalance.toFixed(6)} USDC`);

    if (solBalance < 0.01) {
      console.error('Insufficient SOL for transaction fees');
      process.exit(1);
    }

    if (usdcBalance < 0.01) {
      console.error('Insufficient USDC for payment');
      process.exit(1);
    }
    const x402Network = lookupX402Network(SOLANA_NETWORK as any);
    const wallet = await createLocalWallet(x402Network, keypair);
    const mint = new PublicKey(USDC_MINT);

    const paymentHandler = createPaymentHandler(wallet, mint, connection);

    const fetchWithPayment = wrapFetch(fetch, {
      handlers: [paymentHandler],
      payerChooser: async (options) => {
        for (const option of options) {
          const amount = Number(option.requirements.maxAmountRequired) / 1_000_000;
          if (amount <= usdcBalance) {
            console.log(`Paying ${amount} USDC to ${option.requirements.payTo}`);
            return option;
          }
        }
        throw new Error('Insufficient balance for payment');
      },
      onPaymentError: (error) => {
        console.error('Payment error:', error);
      },
    });

    const requestBody = {
      zipcode: '10001',
      callbackUrl,
    };

    let response;
    try {
      response = await fetchWithPayment(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      throw error;
    }

    const responseText = await response.text();
    let responseData: any;
    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    if (response.status === 200) {
      console.log(`Response: ${response.status} OK`);

      const finalSolBalance = await getSolBalance(connection, keypair.publicKey);
      const finalUsdcBalance = await getTokenBalance(
        connection,
        keypair.publicKey,
        new PublicKey(USDC_MINT),
      );

      console.log(
        `Final: ${finalSolBalance.toFixed(4)} SOL (-${(solBalance - finalSolBalance).toFixed(4)}), ${finalUsdcBalance.toFixed(6)} USDC (-${(usdcBalance - finalUsdcBalance).toFixed(6)})`,
      );

      if (callbackPromise) {
        try {
          const callbackData = await Promise.race([
            callbackPromise,
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 30000)),
          ]);
          console.log('Callback received');
          if (callbackData?.result?.weather) {
            const { weather } = callbackData.result;
            console.log(
              `Weather: ${weather.temperature}°${weather.temperatureUnit}, ${weather.condition}`,
            );
          }
        } catch (error: any) {
          if (error.message === 'timeout') {
            console.log('Callback timeout');
          }
        }
      }
    } else {
      console.log(`Error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    if (callbackServer) {
      callbackServer.close();
    }
  }
})().catch(console.error);
