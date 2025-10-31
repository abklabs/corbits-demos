"use client";

import { useState } from "react";
import { createFareMeterClient } from "@/lib/faremeter-client";

export default function Home() {
  const [response, setResponse] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const handleMint = async () => {
    setLoading(true);
    setError("");
    setResponse("");

    try {
      const fetchWithPayment = await createFareMeterClient();

      const res = await fetchWithPayment("/mint", { method: "POST" });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      setResponse(JSON.stringify(data, null, 2));
    } catch (err: any) {
      console.error("Full error:", err);
      setError(err.message || err.toString() || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        maxWidth: "600px",
        margin: "50px auto",
        padding: "20px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ marginBottom: "10px" }}>Corbits Hologram</h1>
      <p style={{ color: "#666", marginBottom: "30px" }}>
        Faremeter x402 Payment Demo with Next.js
      </p>

      <div
        style={{
          background: "#f5f5f5",
          padding: "20px",
          borderRadius: "8px",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: "18px" }}>Demo Instructions</h2>
        <ol style={{ paddingLeft: "20px", lineHeight: "1.8" }}>
          <li>Install Phantom wallet and switch to Solana devnet</li>
          <li>
            Get devnet USDC from{" "}
            <a href="https://faucet.circle.com/" target="_blank" rel="noopener">
              faucet.circle.com
            </a>
          </li>
          <li>Click the button to connect Phantom and call /mint endpoint</li>
          <li>Approve the 0.001 USDC payment in Phantom</li>
        </ol>
      </div>

      <button
        onClick={handleMint}
        disabled={loading}
        style={{
          background: loading ? "#ccc" : "#007bff",
          color: "white",
          border: "none",
          padding: "15px 30px",
          fontSize: "16px",
          borderRadius: "6px",
          cursor: loading ? "not-allowed" : "pointer",
          width: "100%",
          marginBottom: "20px",
        }}
      >
        {loading ? "Processing..." : "Call /mint Endpoint (0.001 USDC)"}
      </button>

      {error && (
        <div
          style={{
            background: "#fee",
            color: "#c00",
            padding: "15px",
            borderRadius: "6px",
            marginBottom: "20px",
            wordBreak: "break-word",
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      {response && (
        <div
          style={{
            background: "#efe",
            padding: "15px",
            borderRadius: "6px",
            marginBottom: "20px",
          }}
        >
          <strong>Success! Response:</strong>
          <pre
            style={{
              marginTop: "10px",
              background: "white",
              padding: "10px",
              borderRadius: "4px",
              overflow: "auto",
            }}
          >
            {response}
          </pre>
        </div>
      )}

      <div
        style={{
          marginTop: "30px",
          padding: "15px",
          background: "#fff3cd",
          borderRadius: "6px",
          fontSize: "14px",
        }}
      >
        <strong>Note:</strong> Requires Phantom wallet with devnet USDC. Get
        Phantom at{" "}
        <a href="https://phantom.app" target="_blank" rel="noopener">
          phantom.app
        </a>
      </div>
    </div>
  );
}
