export const js = async () => {
  const PRIVY_APP_ID = Deno.env.get("PRIVY_APP_ID");
  if (!PRIVY_APP_ID) throw new Error("PRIVY_APP_ID must be set");

  const ret = `
import React, { useState } from "https://esm.sh/react@18.2.0";
import { createRoot } from "https://esm.sh/react-dom@18.2.0/client";
import { PrivyProvider, usePrivy } from "https://esm.sh/@privy-io/react-auth@2.8.3?deps=react@18.2.0,react-dom@18.2.0";
import { useSolanaWallets, toSolanaWalletConnectors } from "https://esm.sh/@privy-io/react-auth@2.8.3/solana?deps=react@18.2.0,react-dom@18.2.0";
import { PublicKey } from "https://esm.sh/@solana/web3.js@1.95.3";
import { createPaymentHandler } from "https://esm.sh/@faremeter/x-solana-settlement";
import { wrap as wrapFetch } from "https://esm.sh/@faremeter/fetch";
import { decode as msgpackDecode } from "https://esm.sh/@msgpack/msgpack";

const e = React.createElement;

const NETWORK = "mainnet-beta";
const USDC_MAINNET_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");

const PARTNER_CONFIGS = {
  triton: {
    name: 'Triton',
    url: 'https://triton.api.corbits.dev',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { jsonrpc: '2.0', id: 1, method: 'getBlockHeight' },
  },
  helius: {
    name: 'Helius',
    url: 'https://helius.api.corbits.dev',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: { jsonrpc: '2.0', id: 1, method: 'getBlockHeight' },
  },
  nansen: {
    name: 'Nansen',
    url: 'https://nansen.api.corbits.dev/api/v1/smart-money/netflow',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      chains: ['ethereum', 'solana'],
      filters: {
        exclude_smart_money_labels: ['30D Smart Trader'],
        include_native_tokens: false,
        include_smart_money_labels: ['Fund', 'Smart Trader'],
        include_stablecoins: false
      },
      pagination: { page: 1, per_page: 10 },
      order_by: [{ field: 'chain', direction: 'ASC' }]
    },
  },
  titan: {
    name: 'Titan Exchange',
    url: 'https://titan-exchange.api.corbits.dev/api/v1/info',
    method: 'GET',
    headers: { 'Accept': 'application/msgpack' },
    body: null,
  },
  yatori: {
    name: 'Yatori',
    url: 'https://yatori.api.corbits.dev/get-token-account',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: {
      owner_address: 'corzHctjX9Wtcrkfxz3Se8zdXqJYCaamWcQA7vwKF7Q',
      token_address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    },
  },
};

function PaymentDemo() {
  const { login, logout, authenticated, ready } = usePrivy();
  const { wallets } = useSolanaWallets();
  const [loading, setLoading] = useState(false);
  const [selectedPartner, setSelectedPartner] = useState('triton');
  const [requestLog, setRequestLog] = useState('');
  const [responseLog, setResponseLog] = useState('');
  const [statusCode, setStatusCode] = useState(null);
  const [copied, setCopied] = useState(false);

  console.log('All Solana wallets from useSolanaWallets():', wallets);
  const solanaWallet = wallets?.find(w => w.walletClientType === 'privy');
  console.log('Selected Solana wallet:', solanaWallet);

  const handleCopyAddress = async () => {
    if (!solanaWallet?.address) return;
    try {
      await navigator.clipboard.writeText(solanaWallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handlePayment = async () => {
    const solanaWallet = wallets?.find(w => w.walletClientType === 'privy');

    if (!solanaWallet) {
      setStatusCode(null);
      setResponseLog("Error: No Solana wallet connected");
      return;
    }

    try {
      setLoading(true);
      setStatusCode(null);
      setResponseLog("Processing...");

      const publicKey = new PublicKey(solanaWallet.address);

      const wallet = {
        network: NETWORK,
        publicKey: publicKey,
        updateTransaction: async (tx) => {
          const signedTx = await solanaWallet.signTransaction(tx);
          return signedTx;
        },
      };

      const handler = createPaymentHandler(wallet, USDC_MAINNET_MINT);

      const fetchWithPayment = wrapFetch(fetch, {
        handlers: [handler],
      });

      const partner = PARTNER_CONFIGS[selectedPartner];

      const fetchOptions = {
        method: partner.method,
        headers: partner.headers,
      };

      if (partner.body) {
        fetchOptions.body = JSON.stringify(partner.body);
      }

      const requestInfo = \`\${partner.method} \${partner.url}\\n\\nHeaders:\\n\${JSON.stringify(partner.headers, null, 2)}\${partner.body ? \`\\n\\nBody:\\n\${JSON.stringify(partner.body, null, 2)}\` : ''}\`;
      setRequestLog(requestInfo);

      const response = await fetchWithPayment(partner.url, fetchOptions);

      setStatusCode(response.status);

      if (!response.ok) {
        let text;
        try {
          text = await response.text();
        } catch (e) {
          text = 'Unable to read response body';
        }
        setResponseLog(\`\${response.statusText || 'HTTP Error'}\\n\\n\${text}\`);
        return;
      }

      let data;
      const contentType = response.headers.get('content-type');

      if (contentType && contentType.includes('msgpack')) {
        const buffer = await response.arrayBuffer();
        data = msgpackDecode(new Uint8Array(buffer));
      } else {
        try {
          data = await response.json();
        } catch (e) {
          const text = await response.text();
          data = { raw: text, note: "Could not parse response" };
        }
      }

      setResponseLog(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("Payment error:", error);
      setStatusCode(null);
      setResponseLog(\`Error: \${error.message}\${error.stack ? '\\n\\n' + error.stack : ''}\`);
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return e('div', { className: 'card' }, e('p', null, 'Loading Privy...'));
  }

  if (!authenticated) {
    return e(React.Fragment, null,
      e('div', { className: 'card' },
        e('h1', null, 'Privy Solana Wallet Demo'),
        e('p', null, 'This demo shows how to integrate Privy embedded Solana wallets with Faremeter to make paid API requests to Corbits partner APIs.'),
        e('button', { onClick: login }, 'Connect Wallet'),
        e('p', { className: 'info' }, 'Connect your wallet to create a Solana embedded wallet via Privy')
      ),
      e('div', { className: 'card' },
        e('h2', null, 'How it works'),
        e('ol', null,
          e('li', null, 'Connect wallet using Privy (creates embedded Solana wallet)'),
          e('li', null, 'Select a partner API to test (Triton, Helius, Nansen, Titan, or Yatori)'),
          e('li', null, 'Privy signs payment transaction, facilitator submits it to Solana'),
          e('li', null, 'Payment is validated by Faremeter'),
          e('li', null, 'Access granted to the selected partner API')
        )
      )
    );
  }

  return e(React.Fragment, null,
    e('div', { className: 'card' },
      e('div', { className: 'header-row' },
        e('h1', null, 'Privy + Corbits Demo'),
        e('div', { className: 'status-badge' },
          e('span', { className: 'status-indicator' }),
          'Connected'
        )
      ),
      solanaWallet && e('div', { className: 'wallet-address-section' },
        e('div', { className: 'wallet-address-label' }, 'Wallet Address'),
        e('div', { className: 'wallet-address-container' },
          e('div', { className: 'wallet-address' }, solanaWallet.address),
          e('button', {
            className: \`copy-button \${copied ? 'copied' : ''}\`,
            onClick: handleCopyAddress,
            'aria-label': 'Copy wallet address',
            title: copied ? 'Copied!' : 'Copy address'
          },
            copied
              ? e('svg', { width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '3', strokeLinecap: 'round', strokeLinejoin: 'round' },
                  e('polyline', { points: '20 6 9 17 4 12' })
                )
              : e('svg', { width: '16', height: '16', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round' },
                  e('rect', { x: '9', y: '9', width: '13', height: '13', rx: '2', ry: '2' }),
                  e('path', { d: 'M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' })
                )
          )
        )
      ),
      e('p', null, 'Make paid API requests to Corbits partner APIs using Privy embedded Solana wallets.'),
      e('div', { className: 'partner-selector' },
        e('label', null, 'Select Partner API'),
        e('select', {
          value: selectedPartner,
          onChange: (evt) => setSelectedPartner(evt.target.value)
        },
          e('option', { value: 'triton' }, 'Triton'),
          e('option', { value: 'helius' }, 'Helius'),
          e('option', { value: 'nansen' }, 'Nansen'),
          e('option', { value: 'titan' }, 'Titan Exchange'),
          e('option', { value: 'yatori' }, 'Yatori')
        )
      ),
      e('div', { className: 'button-row' },
        e('button', { onClick: handlePayment, disabled: loading || !solanaWallet },
          loading ? 'Processing...' : \`Make Payment to \${PARTNER_CONFIGS[selectedPartner].name}\`
        ),
        e('button', { className: 'secondary', onClick: logout }, 'Disconnect')
      ),
      (requestLog || responseLog) && e('div', { className: 'log-area' },
        e('h3', null, 'Log'),
        requestLog && e('div', { className: 'log-section' },
          e('h4', null, 'Request'),
          e('div', { className: 'log-content' }, requestLog)
        ),
        responseLog && e('div', { className: 'log-section' },
          e('h4', null, 'Response'),
          statusCode && e('div', {
            className: \`status-code \${statusCode >= 200 && statusCode < 300 ? 'success' : 'error'}\`
          }, \`HTTP \${statusCode}\`),
          e('div', { className: 'log-content' }, responseLog)
        )
      )
    ),
    e('div', { className: 'card' },
      e('h2', null, 'How it works'),
      e('ol', null,
        e('li', null, 'Connect wallet using Privy (creates embedded Solana wallet)'),
        e('li', null, 'Select a partner API to test (Triton, Helius, Nansen, Titan, or Yatori)'),
        e('li', null, 'Privy signs payment transaction, facilitator submits it to Solana'),
        e('li', null, 'Payment is validated by Faremeter'),
        e('li', null, 'Access granted to the selected partner API')
      )
    )
  );
}

function App() {
  return e(PrivyProvider, {
    appId: "${PRIVY_APP_ID}",
    config: {
      loginMethods: ['wallet', 'email'],
      appearance: {
        theme: 'light',
        walletChainType: 'solana-only',
      },
      embeddedWallets: {
        createOnLogin: 'all-users',
        requireUserPasswordOnCreate: false,
        solana: {
          createOnLogin: 'all-users',
        },
      },
      externalWallets: {
        solana: {
          connectors: toSolanaWalletConnectors({
            shouldAutoConnect: true,
          }),
        },
      },
    }
  }, e(PaymentDemo));
}

const root = createRoot(document.getElementById('root'));
root.render(e(App));
`;

  return new Response(ret, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
};
