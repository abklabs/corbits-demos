export const index = async () => {
  const AMAZON_PRICE = Deno.env.get("AMAZON_PRICE");
  const AMAZON_ASIN = Deno.env.get("AMAZON_ASIN");
  const AMAZON_IMAGE = Deno.env.get("AMAZON_IMAGE");
  const AMAZON_TITLE = Deno.env.get("AMAZON_TITLE");

  if (!AMAZON_PRICE) throw new Error("AMAZON_PRICE must be set");
  if (!AMAZON_ASIN) throw new Error("AMAZON_ASIN must be set");
  if (!AMAZON_IMAGE) throw new Error("AMAZON_IMAGE must be set");
  if (!AMAZON_TITLE) throw new Error("AMAZON_TITLE must be set");

  const ret = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>Corbits Amazon Demo</title>
<link rel="stylesheet" href="/app.css">
</head>
<header class="card" style="margin:20px auto; max-width:700px; text-align:center; position:relative;">
  <a href="https://corbits.dev" target="_blank" rel="noopener">
    <img style="height:100px; width:auto" src="https://corbits.dev/lovable-uploads/7ab1863f-dde2-4da9-b70b-e73adb4a5ceb.png" alt="Site logo" class="h-14 w-auto object-contain" loading="lazy">
  </a>
  <h1 style="margin-bottom: 15px; margin-top: 0px;">
    Amazon x402 Demo
  </h1>
  <p class="muted" style="margin:0; line-height:1.5; padding-left:10px; padding-right:10px; padding-bottom:20px;">
    Buy an Amazon product using Solana wallets with USDC.<br>
    The checkout is paywalled by the <code>x402</code> standard at <code>/pay</code> (402 Payment Required),  
    and orders are fulfilled on Amazon via Crossmint.<br>
    Powered by <a href="https://github.com/faremeter/faremeter" target="_blank" rel="noopener">Faremeter</a>.
  </p>

  <button id="aboutBtn" class="primary" style="margin-bottom:25px;">
    Why this matters
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-right" style="height:1rem; width:1rem; margin-left:2px"><path d="M5 12h14"></path><path d="m12 5 7 7-7 7"></path></svg>
  </button>
</header>
<body>
  <div class="wrap">
    <div class="grid">
  <!-- Left: product -->
  <div class="card item">
    <img id="itemImage" src="${AMAZON_IMAGE}" alt="Item" />
    <h2 id="itemTitle">${AMAZON_TITLE}</h2>
    <div class="muted" id="asin">ASIN ${AMAZON_ASIN}</div>
    <div class="price" id="price">$${AMAZON_PRICE}</div>
  </div>

  <!-- Right: shipping + funding stacked -->
  <div class="col">
    <form class="card" id="form">
      <div class="row">
        <h3 style="margin:0">Shipping</h3>
        <span style="display:flex; gap:6px;">
          <span class="pill" style="background:#28a745; color:#fff">Solana Devnet</span>
          <span class="pill">US only</span>
        </span>
      </div>

      <div>
        <label>Email</label>
        <input name="email" placeholder="you@example.com" required />
      </div>
      <div>
        <label>Name</label>
        <input name="name" placeholder="Buyer Name" required />
      </div>
      <div>
        <label>Address line 1</label>
        <input name="line1" placeholder="123 Main St" required />
      </div>
      <div>
        <label>City</label>
        <input name="city" placeholder="San Francisco" required />
      </div>
      <div class="row" style="gap:10px">
        <div style="flex:1">
          <label>State</label>
          <input name="state" placeholder="CA" required />
        </div>
        <div style="flex:1">
          <label>Postal code</label>
          <input name="postalCode" placeholder="94105" required />
        </div>
      </div>
      <div>
        <label>Country</label>
        <input name="country" value="US" required />
      </div>

      <div class="row" style="gap:10px; flex-wrap:wrap; margin-top:10px">
        <button id="pay" class="primary" type="submit">
          <span class="spinner" aria-hidden="true"></span>
          <span class="txt">Pay with wallet</span>
        </button>
        <button id="prefill" class="secondary" type="button">Prefill test data</button>
      </div>

      <div class="status" id="status" hidden>
        <div class="row">
          <div>Order status</div>
          <div id="statusText" class="pill">created</div>
        </div>
        <div class="progress">
          <div class="dot" id="dCreated"></div>
          <div class="dot" id="dPaid"></div>
          <div class="dot" id="dFulfill"></div>
          <div class="dot" id="dDeliver"></div>
          <div class="dot" id="dDone"></div>
        </div>
        <div style="margin-top:10px" class="code" id="log"></div>
      </div>
    </form>

    <!-- Funding card -->
    <div class="card" style="padding:22px;">
      <h3 style="margin-top:0;">Quick Links</h3>
      <p class="muted" style="margin:0 0 10px 0;">Get test tokens to try this demo</p>
      <ul style="list-style:none; padding:0; margin:0; display:grid; gap:8px; text-align:left;">
        <li>
          <a href="https://faucet.circle.com/" target="_blank" rel="noopener"
             class="pill" style="text-decoration:none; display:inline-block;">
            USDC (Circle Faucet)
          </a>
        </li>
        <li>
          <a href="https://faucet.solana.com/" target="_blank" rel="noopener"
             class="pill" style="text-decoration:none; display:inline-block;">
            SOL (Solana Faucet)
          </a>
        </li>
      </ul>
    </div>
  </div>
</div>
  </div>
 <!-- Modal -->
<div id="aboutModal" class="modal-overlay" hidden aria-hidden="true" role="dialog">
  <div class="modal-dialog card">
    <div class="modal-header">
      <h2>Why this matters</h2>
      <button id="closeModal" class="secondary small">Close</button>
    </div>
    <div class="modal-body">
      <p>People buy the most bizarre things on Amazon.</p>
      <p>There is a world in which we delegate personal shopping tasks, whether personal or business, to AI agents.</p>
      <p>Your grandson has an interest in the Marvel Universe and you decide to budget for new, exciting things every month as new movies and shows debut.</p>
      <p>Your dog has a professional approach to chewing through squeaky toys and you need to ensure your home is well equipped to prevent the couch pillows from falling victim again.</p>
      <p>Your colleagues' snacks and beverage preferences change once a quarter; keeping supplies stocked is important, and tailoring what is on hand matters.</p>
      <p>You found a new recipe on NYTimes Cooking and want to try preparing it this week.</p>
      <p>Your local charity runs an annual can drive and their needs change every year. You want to participate and provide the correct items.</p>
      <p>Using Faremeter and 402, we can enable an informed agent to purchase things on our behalf on Amazon.</p>
    </div>
  </div>
</div>
  <script type="module" src="/app.js"></script>
</body>
<footer style="margin-top:20px; margin-bottom:15px; text-align:center; font-size:14px; color:#666;">
  © ${new Date().getFullYear()} Corbits
  <span style="font-size:18px; position:relative' top:-2px;">🗻</span>
  <a href="https://corbits.dev" target="_blank" rel="noopener" style="color:#666; text-decoration:none;">corbits.dev</a>
</footer>
</html>`;

  return new Response(ret, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
};
