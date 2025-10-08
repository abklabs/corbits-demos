export const index = async () => {
  const ret = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privy + Corbits Demo</title>
  <link rel="stylesheet" href="/app.css">
</head>
<body>
  <header class="header">
    <a href="https://corbits.dev" target="_blank" rel="noopener">
      <img src="https://privy-wallet-demo.val.run/logo.png" alt="Corbits" class="logo">
    </a>
  </header>
  <div id="root"></div>
  <script type="module" src="/app.js"></script>
</body>
</html>`;

  return new Response(ret, {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
};
