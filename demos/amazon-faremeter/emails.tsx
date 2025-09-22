import { email } from "https://esm.town/v/std/email";

const NETWORK = Deno.env.get("FAREMETER_NETWORK");
const HOST_ORIGIN = Deno.env.get("HOST_ORIGIN");

if (!NETWORK) throw new Error("FAREMETER_NETWORK must be set");
if (!HOST_ORIGIN) throw new Error("HOST_ORIGIN must be set");

interface OrderEmailData {
  orderId: string;
  email: string;
  priceUsd?: number;
  status?: string;
  errorMessage?: string;
  signature?: string;
}

function getNetworkFooter(): string {
  if (NETWORK === "mainnet" || NETWORK === "mainnet-beta") {
    return `<p style="color: #666; font-size: 12px;">Corbits Amazon Demo - Paid with USDC on Solana</p>`;
  }
  return `<p style="color: #666; font-size: 12px;">Corbits Amazon Demo - Test order on Solana ${NETWORK}</p>`;
}

function getSolanaExplorerUrl(signature: string): string {
  const baseUrl = `https://explorer.solana.com/tx/${signature}`;
  if (NETWORK === "mainnet" || NETWORK === "mainnet-beta") {
    return baseUrl;
  }
  return `${baseUrl}?cluster=${NETWORK}`;
}

function getTrackingUrl(orderId: string): string {
  return `${HOST_ORIGIN}?order=${orderId}`;
}

function getEmailStyles(): string {
  return `
    <style>
      body {
        background: #0b0f14;
        color: hsl(42 65% 90%);
        font-family: ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial;
        padding: 20px;
      }
      .email-container {
        background: hsl(344 6% 16% / .8);
        border: 1px solid hsl(344 6% 30%);
        border-radius: 16px;
        padding: 30px;
        max-width: 600px;
        margin: 0 auto;
      }
      h2 {
        color: hsl(42 65% 90%);
        margin-top: 0;
      }
      p {
        color: hsl(42 65% 90%);
        line-height: 1.6;
      }
      strong {
        color: hsl(42 70% 85%);
      }
      a {
        color: #4f8cff;
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
      .button-container {
        text-align: center;
        margin: 25px 0;
      }
      .track-button {
        display: inline-block;
        background: hsl(32 81% 53%);
        color: hsl(344 6% 16%);
        padding: 12px 24px;
        border-radius: 12px;
        font-weight: 600;
        text-decoration: none;
        font-size: 16px;
      }
      .track-button:hover {
        background: hsl(32 81% 48%);
        text-decoration: none;
      }
      hr {
        border: none;
        border-top: 1px solid hsl(344 6% 30%);
        margin: 20px 0;
      }
      .footer {
        text-align: center;
        margin-top: 30px;
      }
      .footer img {
        height: 60px;
        width: auto;
        margin-bottom: 10px;
      }
      .footer-text {
        color: hsl(42 40% 70%);
        font-size: 12px;
        margin-top: 10px;
      }
    </style>
  `;
}

function getEmailFooter(): string {
  const demoUrl = "https://corbits.dev";
  return `
    <div class="footer">
      <a href="${demoUrl}" target="_blank">
        <img src="https://corbits.dev/lovable-uploads/7ab1863f-dde2-4da9-b70b-e73adb4a5ceb.png" alt="Corbits" />
      </a>
      <div class="footer-text">
        ${getNetworkFooter()}
      </div>
    </div>
  `;
}

export async function sendOrderCreatedEmail(data: OrderEmailData) {
  const subject = `Corbits Amazon Order ${data.orderId.slice(0, 8)} - Awaiting Payment`;
  const html = `
    ${getEmailStyles()}
    <div class="email-container">
      <h2>Order Created</h2>
      <p>Your order has been created and is awaiting payment.</p>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
      <p><strong>Amount:</strong> $${data.priceUsd?.toFixed(2) ?? "0.00"} USDC</p>
      <p><strong>Status:</strong> Awaiting payment via Solana wallet</p>
      <div class="button-container">
        <a href="${getTrackingUrl(data.orderId)}" class="track-button">View Order</a>
      </div>
      <p>Complete your payment to process this order.</p>
      <hr>
      ${getEmailFooter()}
    </div>
  `;

  try {
    await email({
      to: data.email,
      subject,
      html,
    });
  } catch (e) {
    console.error("Failed to send order created email:", e);
  }
}

export async function sendPaymentReceivedEmail(data: OrderEmailData) {
  const subject = `Corbits Amazon Order ${data.orderId.slice(0, 8)} - Payment Received`;
  const html = `
    ${getEmailStyles()}
    <div class="email-container">
      <h2>Payment Confirmed</h2>
      <p>We've received your payment and are processing your order.</p>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
      <p><strong>Status:</strong> Processing fulfillment</p>
      ${data.signature ? `<p><strong>Transaction:</strong> <a href="${getSolanaExplorerUrl(data.signature)}">View on Solana Explorer</a></p>` : ""}
      <div class="button-container">
        <a href="${getTrackingUrl(data.orderId)}" class="track-button">View Order</a>
      </div>
      <p>We'll send you another email when your order ships.</p>
      <hr>
      ${getEmailFooter()}
    </div>
  `;

  try {
    await email({
      to: data.email,
      subject,
      html,
    });
  } catch (e) {
    console.error("Failed to send payment received email:", e);
  }
}

export async function sendFulfillmentStartedEmail(data: OrderEmailData) {
  const subject = `Corbits Amazon Order ${data.orderId.slice(0, 8)} - Fulfillment Started`;
  const html = `
    ${getEmailStyles()}
    <div class="email-container">
      <h2>Order Being Fulfilled</h2>
      <p>Your order has been sent to Amazon for fulfillment.</p>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
      <p><strong>Status:</strong> Fulfillment in progress</p>
      ${data.signature ? `<p><strong>Transaction:</strong> <a href="${getSolanaExplorerUrl(data.signature)}">View on Solana Explorer</a></p>` : ""}
      <div class="button-container">
        <a href="${getTrackingUrl(data.orderId)}" class="track-button">View Order</a>
      </div>
      <p>You'll receive tracking information once the order ships.</p>
      <hr>
      ${getEmailFooter()}
    </div>
  `;

  try {
    await email({
      to: data.email,
      subject,
      html,
    });
  } catch (e) {
    console.error("Failed to send fulfillment email:", e);
  }
}

export async function sendOrderCompletedEmail(data: OrderEmailData) {
  const subject = `Corbits Amazon Order ${data.orderId.slice(0, 8)} - Completed`;
  const html = `
    ${getEmailStyles()}
    <div class="email-container">
      <h2>Order Delivered</h2>
      <p>Your order has been successfully delivered!</p>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
      <p><strong>Status:</strong> Completed</p>
      ${data.signature ? `<p><strong>Transaction:</strong> <a href="${getSolanaExplorerUrl(data.signature)}">View on Solana Explorer</a></p>` : ""}
      <br>
      <p>Thank you for trying the Corbits Amazon Demo.</p>
      <hr>
      ${getEmailFooter()}
    </div>
  `;

  try {
    await email({
      to: data.email,
      subject,
      html,
    });
  } catch (e) {
    console.error("Failed to send completion email:", e);
  }
}

export async function sendOrderFailedEmail(data: OrderEmailData) {
  const subject = `Corbits Amazon Order ${data.orderId.slice(0, 8)} - Action Required`;
  const html = `
    ${getEmailStyles()}
    <div class="email-container">
      <h2>Order Issue</h2>
      <p>There was an issue processing your order.</p>
      <p><strong>Order ID:</strong> ${data.orderId}</p>
      <p><strong>Status:</strong> ${data.status ?? "Failed"}</p>
      ${data.errorMessage ? `<p><strong>Issue:</strong> ${data.errorMessage}</p>` : ""}
      <hr>
      ${getEmailFooter()}
    </div>
  `;

  try {
    await email({
      to: data.email,
      subject,
      html,
    });
  } catch (e) {
    console.error("Failed to send error email:", e);
  }
}
