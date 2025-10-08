import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { PrivyProvider, usePrivy } from "@privy-io/react-auth";
import {
  useWallets,
  toSolanaWalletConnectors,
  useFundWallet,
} from "@privy-io/react-auth/solana";
import { createSolanaRpc } from "@solana/kit";
import { PublicKey, Connection, VersionedTransaction } from "@solana/web3.js";
import { createPaymentHandler } from "@faremeter/payment-solana/exact";
import { wrap as wrapFetch } from "@faremeter/fetch";
import { solana } from "@faremeter/info";

declare global {
  interface Window {
    PRIVY_CONFIG: {
      appId: string;
      network: string;
      asset: string;
    };
  }
}

const config = window.PRIVY_CONFIG;

const NETWORK = config.network;
const ASSET = config.asset;

const chainIdMap: Record<string, string> = {
  "mainnet-beta": "solana:mainnet",
  devnet: "solana:devnet",
  testnet: "solana:testnet",
};
const CHAIN_ID = chainIdMap[NETWORK] || `solana:${NETWORK}`;

const tokenInfo = solana.lookupKnownSPLToken(NETWORK, ASSET);
if (!tokenInfo) {
  throw new Error(`Could not lookup token ${ASSET} on ${NETWORK}`);
}
const ASSET_ADDRESS = new PublicKey(tokenInfo.address);

const connection = new Connection(window.location.origin + "/rpc");
const rpcUrl = window.location.origin + "/rpc";

function PaymentDemo() {
  const { login, logout, authenticated, ready } = usePrivy();
  const { wallets } = useWallets();
  const { fundWallet } = useFundWallet();
  const [loading, setLoading] = useState(false);
  const [requestLog, setRequestLog] = useState("");
  const [responseLog, setResponseLog] = useState("");
  const [statusCode, setStatusCode] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [balance, setBalance] = useState<string | null>(null);

  const wallet = wallets?.[0];

  const handleFundWallet = async () => {
    if (!wallet) return;
    await fundWallet(wallet.address);
  };

  React.useEffect(() => {
    if (!wallet) return;

    const fetchBalance = async () => {
      try {
        const pubkey = new PublicKey(wallet.address);
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          pubkey,
          { mint: ASSET_ADDRESS },
        );

        if (tokenAccounts.value.length > 0) {
          const accountInfo = tokenAccounts.value[0].account.data.parsed.info;
          const amount = accountInfo.tokenAmount.uiAmount;
          setBalance(amount.toFixed(2));
        } else {
          setBalance("0.00");
        }
      } catch (error) {
        console.error("Failed to fetch balance:", error);
        setBalance(null);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [wallet]);

  const handleCopyAddress = async () => {
    if (!wallet?.address) return;
    try {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handlePayment = async () => {
    if (!wallet) {
      setStatusCode(null);
      setResponseLog("Error: No Solana wallet connected");
      return;
    }

    if (balance === "0.00") {
      alert(
        `Insufficient ${ASSET} balance on Solana. You will receive a 402 Payment Required error.`,
      );
    }

    try {
      setLoading(true);
      setStatusCode(null);

      const publicKey = new PublicKey(wallet.address);

      const paymentWallet = {
        network: `solana-${NETWORK}`,
        publicKey,
        updateTransaction: async (tx: VersionedTransaction) => {
          const serialized = tx.serialize();
          const { signedTransaction } = await wallet.signTransaction({
            transaction: serialized,
            chain: CHAIN_ID,
          });

          return VersionedTransaction.deserialize(signedTransaction);
        },
      };

      const handler = createPaymentHandler(
        paymentWallet,
        ASSET_ADDRESS,
        connection,
      );
      const fetchWithPayment = wrapFetch(fetch, { handlers: [handler] });

      const url = "/api/protected";
      const method = "POST";
      const headers = { "Content-Type": "application/json" };

      setRequestLog(
        `${method} ${url}\n\nHeaders:\n${JSON.stringify(headers, null, 2)}`,
      );
      setResponseLog("Processing...");

      const response = await fetchWithPayment(url, { method, headers });

      setStatusCode(response.status);

      if (!response.ok) {
        const text = await response
          .text()
          .catch(() => "Unable to read response");
        setResponseLog(`${response.statusText || "HTTP Error"}\n\n${text}`);
        return;
      }

      const data = await response.json();
      setResponseLog(JSON.stringify(data, null, 2));
    } catch (error: any) {
      console.error("Payment error:", error);
      setStatusCode(null);
      setResponseLog(`Error: ${error.message}\n\n${error.stack || ""}`);
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return (
      <div className="card">
        <p>Loading Privy...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <>
        <div className="card">
          <h1>Privy + Faremeter Demo</h1>
          <p>
            This demo shows how to integrate Privy embedded Solana wallets with
            Faremeter middleware.
          </p>
          <button onClick={login}>Connect Wallet</button>
          <p className="info">
            Connect your wallet to create a Solana embedded wallet via Privy
          </p>
        </div>
        <div className="card">
          <h2>How it works</h2>
          <ol>
            <li>Connect wallet using Privy (creates embedded Solana wallet)</li>
            <li>Click "Make Payment" to access protected endpoint</li>
            <li>
              Faremeter middleware requests payment (402 Payment Required)
            </li>
            <li>
              Privy signs payment transaction, facilitator submits it to Solana
            </li>
            <li>
              Middleware validates payment and grants access to protected
              content
            </li>
          </ol>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="card">
        <div className="header-row">
          <h1>Privy + Faremeter</h1>
          <div className="status-badge">
            <span className="status-indicator" />
            Connected
          </div>
        </div>
        {wallet && (
          <div className="wallet-address-section">
            <div className="wallet-address-label">Wallet Address</div>
            <div className="wallet-row">
              <div className="wallet-address-container">
                <div className="wallet-address">{wallet.address}</div>
                <button
                  className={`copy-button ${copied ? "copied" : ""}`}
                  onClick={handleCopyAddress}
                  aria-label="Copy wallet address"
                  title={copied ? "Copied!" : "Copy address"}
                >
                  {copied ? (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  )}
                </button>
              </div>
              {balance !== null && (
                <div className="wallet-balance">
                  {balance} {ASSET} on Solana
                </div>
              )}
            </div>
          </div>
        )}
        <p>
          Access paywalled content using Privy embedded Solana wallets with
          server-side Faremeter middleware.
        </p>
        <div className="button-row">
          <button onClick={handlePayment} disabled={loading || !wallet}>
            {loading ? "Processing..." : "Make Payment"}
          </button>
          <button className="secondary" onClick={logout}>
            Disconnect
          </button>
        </div>
        {(requestLog || responseLog) && (
          <div className="log-area">
            <h3>Log</h3>
            {requestLog && (
              <div className="log-section">
                <h4>Request</h4>
                <div className="log-content">{requestLog}</div>
              </div>
            )}
            {responseLog && (
              <div className="log-section">
                <h4>Response</h4>
                {statusCode && (
                  <div
                    className={`status-code ${statusCode >= 200 && statusCode < 300 ? "success" : "error"}`}
                  >
                    HTTP {statusCode}
                  </div>
                )}
                <div className="log-content">{responseLog}</div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="card">
        <h2>How it works</h2>
        <ol>
          <li>Connect wallet using Privy (creates embedded Solana wallet)</li>
          <li>Click "Make Payment" to access protected endpoint</li>
          <li>Faremeter middleware requests payment (402 Payment Required)</li>
          <li>
            Privy signs payment transaction, facilitator submits it to Solana
          </li>
          <li>
            Middleware validates payment and grants access to protected content
          </li>
        </ol>
      </div>
    </>
  );
}

function App() {
  return (
    <PrivyProvider
      appId={config.appId}
      config={{
        loginMethods: ["wallet", "email"],
        appearance: {
          theme: "light",
          walletChainType: "solana-only",
          walletList: [
            "detected_solana_wallets",
            "phantom",
            "solflare",
            "privy",
          ],
        },
        embeddedWallets: {
          solana: {
            createOnLogin: "users-without-wallets",
          },
        },
        externalWallets: {
          solana: {
            connectors: toSolanaWalletConnectors(),
          },
        },
        solana: {
          rpcs: {
            [CHAIN_ID]: {
              rpc: createSolanaRpc(rpcUrl),
            },
          },
        },
      }}
    >
      <PaymentDemo />
    </PrivyProvider>
  );
}

const root = createRoot(document.getElementById("root")!);
root.render(<App />);
