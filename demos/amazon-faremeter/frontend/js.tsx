export const js = async () => {
  const ASSET_ADDRESS = Deno.env.get("ASSET_ADDRESS");
  if (!ASSET_ADDRESS) throw new Error("ASSET_ADDRESS must be set");

  const ret = `
console.log("[boot] app.js loaded");

// ---------- helpers ----------

const API = {
  quote: "/quote",
  pay: "/pay",
  verify: "/fulfill",
  status: "/status",
  webhook: "/webhook",
};

const el = (s) => document.querySelector(s);
const log = (msg) => {
  const box = el("#log");
  if (box) box.textContent = (new Date()).toLocaleTimeString() + "  " + msg + "\\n" + box.textContent;
  console.log("[ui]", msg);
};

function formatError(json) {
  if (json.ok === false && json.error) {
    return json.details ? json.error + ": " + json.details : json.error;
  }
  return JSON.stringify(json);
}

async function parseErrorResponse(response) {
  try {
    const json = await response.json();
    return formatError(json);
  } catch {
    return await response.text();
  }
}

const ALL_DOTS = ["#dCreated", "#dPaid", "#dFulfill", "#dDeliver", "#dDone"];

const setDots = (s = "unknown") => {
  const map = {
    created: ["#dCreated"],
    awaiting_payment: ["#dCreated"],
    paid: ["#dCreated", "#dPaid"],
    fulfillment_created: ["#dCreated", "#dPaid", "#dFulfill"],
    delivery_started: ["#dCreated", "#dPaid", "#dFulfill", "#dDeliver"],
    completed: ["#dCreated", "#dPaid", "#dFulfill", "#dDeliver", "#dDone"],
    fulfillment_error: ["#dCreated", "#dPaid", "#dFulfill"],
    canceled: ["#dCreated"],
  };

  ALL_DOTS.forEach((id) => el(id)?.classList.remove("on"));
  (map[s] ?? []).forEach((id) => el(id)?.classList.add("on"));
  
  const st = el("#statusText");
  if (st) st.textContent = s ?? "unknown";
  
  if (s !== lastShownStatus) {
    log("status → " + s);
    lastShownStatus = s;
  }
};

const isTerminal = (s) => s === "completed" || s === "canceled" || s === "fulfillment_error";

let currentOrderId = null, lastShownStatus = null, fulfillmentCreatedSeen = false;

function setLoading(isLoading) {
  const btnPay = el("#pay");
  const btnTest = el("#test");
  const btnPrefill = el("#prefill");
  for (const b of [btnPay, btnTest, btnPrefill]) {
    if (!b) continue;
    if (isLoading) {
      b.classList?.add("loading");
      b.setAttribute("disabled", "true");
    } else {
      b.classList?.remove("loading");
      b.removeAttribute("disabled");
    }
  }
}

// ---------- Quote ----------
async function createQuote(payload, existingOrderId = null) {
  const r = await fetch(API.quote, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      orderId: existingOrderId,
      email: payload.email,
      shippingAddress: {
        name: payload.name,
        line1: payload.line1,
        city: payload.city,
        state: payload.state,
        postalCode: payload.postalCode,
        country: payload.country ?? "US",
      },
    }),
  });
  if (!r.ok) {
    const errorMsg = await parseErrorResponse(r);
    throw new Error(errorMsg);
  }
  const result = await r.json();
  if (result.ok === false) {
    throw new Error(formatError(result));
  }
  return result;
}

// ---------- Wallet + x402 ----------
import { PublicKey, Connection } from "https://esm.sh/@solana/web3.js@1.95.3";
import { wrap as wrapFetch } from "https://esm.sh/@faremeter/fetch";
import { createPaymentHandler } from "https://esm.sh/@faremeter/x-solana-settlement";

const DEVNET_RPC = "https://api.devnet.solana.com";
const USDC_DEV_MINT = new PublicKey("${ASSET_ADDRESS}");
const USDC_DECIMALS = 6;

async function ensureWallet() {
  const provider = window.solana;
  if (!provider?.isPhantom) {
    alert("Phantom not found. Install Phantom and switch to Devnet.");
    throw new Error("no_phantom");
  }
  const res = await provider.connect({ onlyIfTrusted: false });
  const pk = res?.publicKey?.toString?.() ?? provider.publicKey?.toString?.() ?? "(unknown)";
  const shortPk = pk.length > 10 ? pk.slice(0, 4) + "..." + pk.slice(-4) : pk;
  log("Wallet connected " + shortPk);
  return provider;
}

function createPhantomWallet(network, provider) {
  return {
    network,
    publicKey: new PublicKey(provider.publicKey.toString()),
    updateTransaction: async (tx) => provider.signTransaction(tx),
  };
}

async function getUsdcBalance(payerPubkey) {
  const conn = new Connection(DEVNET_RPC, "confirmed");
  const resp = await conn.getParsedTokenAccountsByOwner(payerPubkey, { mint: USDC_DEV_MINT });
  let raw = 0n;
  for (const a of resp.value) {
    const amt = a.account.data.parsed.info.tokenAmount.amount;
    raw += BigInt(amt);
  }
  return Number(raw) / 10 ** USDC_DECIMALS;
}

async function getSolBalance(payerPubkey) {
  const conn = new Connection(DEVNET_RPC, "confirmed");
  const lamports = await conn.getBalance(payerPubkey);
  return lamports / 1e9;
}

async function startPay(orderId) {
  const provider = await ensureWallet();
  const wallet = createPhantomWallet("devnet", provider);
  const payerPubkeyStr = wallet.publicKey.toBase58();

  const [usdc, sol] = await Promise.all([
    getUsdcBalance(wallet.publicKey),
    getSolBalance(wallet.publicKey),
  ]);

  const minSol = 0.02;
  if (sol < minSol) {
    throw new Error(
      "Wallet " + payerPubkeyStr +
      " has insufficient SOL for fees. " +
      "Have " + sol.toFixed(4) + " SOL. " +
      "Need at least " + minSol.toFixed(2) + " SOL on Devnet."
    );
  }

  const handler = createPaymentHandler(wallet, USDC_DEV_MINT);

  const payerChooser = async (execers) => {
    if (execers.length < 1) throw new Error("no applicable payers found");

    const preferred = execers.filter(
      e =>
        e.requirements.scheme === "solana" &&
        e.requirements.network === "devnet" &&
        e.requirements.asset === USDC_DEV_MINT.toBase58()
    );
    const ordered = preferred.length ? preferred : execers;

    for (const e of ordered) {
      const need = Number(e.requirements.maxAmountRequired) / 10 ** USDC_DECIMALS;
      if (need <= usdc) return e;
    }

    const candidate = ordered[0];
    const need = Number(candidate.requirements.maxAmountRequired) / 10 ** USDC_DECIMALS;
    const short = need - usdc;
    const payTo = candidate.requirements.payTo;
    const desc = candidate.requirements.description ?? "";
    throw new Error(
      "Wallet " + payerPubkeyStr +
      " has insufficient USDC. " +
      "Needs " + need.toFixed(6) + " USDC to " + payTo + ". " +
      desc + " " +
      "Have " + usdc.toFixed(6) + " USDC. " +
      "Short by " + short.toFixed(6) + " USDC."
    );
  };

  const f = wrapFetch(fetch, { handlers: [handler], payerChooser });

  const resp = await f("/pay", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderId }),
  });

  const text = await resp.text().catch(() => "");
  if (!resp.ok) {
    try {
      const json = JSON.parse(text);
      throw new Error(formatError(json));
    } catch {
      throw new Error(text ?? "unknown error");
    }
  }

  try {
    const result = JSON.parse(text);
    if (result.ok === false) throw new Error(formatError(result));
    return result;
  } catch {
    return text;
  }
}

// ---------- Polling ----------
async function pollOrderStatus(orderId) {
  el("#status").hidden = false;
  log("Tracking order status");

  let stop = false;

  const tick = async () => {
    try {
      const s = await fetch(API.status + "?orderId=" + encodeURIComponent(orderId));
      if (s.ok) {
        const st = await s.json();
        if (st.ok && st.status) {
          setDots(st.status);
          
          // Disable pay button once paid
          const paidOrBeyond = ["paid", "fulfillment_created", "delivery_started", "completed", "canceled", "fulfillment_error"];
          if (paidOrBeyond.includes(st.status)) {
            const btnPay = el("#pay");
            if (btnPay) {
              btnPay.setAttribute("disabled", "true");
            }
          }
          
          if (isTerminal(st.status)) {
            stop = true;
            if (st.status === "completed") {
              log("Order completed successfully!");
            } else if (st.status === "fulfillment_error") {
              log("Fulfillment error - check order details");
            }
          }
        }
      } else {
        const errorMsg = await parseErrorResponse(s);
        log("Status check failed: " + errorMsg);
      }
    } catch (e) {
      log("Status error: " + e.message);
    }

    if (!stop) setTimeout(tick, 4000);
  };

  tick();
}

// ---------- UI wiring ----------
window.addEventListener("DOMContentLoaded", () => {
  const injected = !!window.solana;
  const isPhantom = !!window.solana?.isPhantom;
  console.log("[boot] window.solana injected:", injected, "isPhantom:", isPhantom);
  if (!injected) log("No wallet provider injected. Install Phantom.");

  const urlParams = new URLSearchParams(window.location.search);
  const orderFromUrl = urlParams.get("order");
  if (orderFromUrl) {
    currentOrderId = orderFromUrl;
    log("Resuming order: " + orderFromUrl.slice(0, 8));
    el("#status").hidden = false;
    pollOrderStatus(orderFromUrl);
  }
});

document.getElementById("form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = Object.fromEntries(new FormData(e.currentTarget).entries());
  try {
    setLoading(true);
    // If resuming an order, pass the existing order ID
    const urlParams = new URLSearchParams(window.location.search);
    const existingOrderId = urlParams.get("order");
    const q = await createQuote(payload, existingOrderId);
    if (!q.orderId) {
      throw new Error("Quote response missing orderId");
    }
    currentOrderId = q.orderId;

    const newUrl = new URL(window.location);
    newUrl.searchParams.set("order", currentOrderId);
    window.history.pushState({}, "", newUrl);

    const payResult = await startPay(currentOrderId);
    if (payResult && typeof payResult === 'object') {
      log("Payment processed: " + (payResult.status ?? "success"));
    }
    await pollOrderStatus(currentOrderId);
  } catch (err) {
    alert("Error: " + err.message);
    log("Error " + err.message);
  } finally {
    setLoading(false);
  }
});

document.getElementById("prefill").addEventListener("click", () => {
  document.querySelector("input[name=email]").value = "demo@example.com";
  document.querySelector("input[name=name]").value = "Ada Lovelace";
  document.querySelector("input[name=line1]").value = "1 Market St";
  document.querySelector("input[name=city]").value = "San Francisco";
  document.querySelector("input[name=state]").value = "CA";
  document.querySelector("input[name=postalCode]").value = "94105";
  document.querySelector("input[name=country]").value = "US";
  log("Prefilled test data");
});

  function openModal(modal) {
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => modal.classList.add('show'));
  }

  function closeModal(modal) {
    modal.classList.remove('show');
    const onEnd = () => {
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      modal.removeEventListener('transitionend', onEnd);
    };
    modal.addEventListener('transitionend', onEnd);
  }

  window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('aboutBtn');
    const modal = document.getElementById('aboutModal');
    const closeBtn = document.getElementById('closeModal');

    if (!btn || !modal || !closeBtn) return;

    btn.addEventListener('click', () => openModal(modal));
    closeBtn.addEventListener('click', () => closeModal(modal));

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.hidden) closeModal(modal);
    });
  });
`;
  return new Response(ret, {
    headers: {
      "content-type": "application/javascript; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });
};
