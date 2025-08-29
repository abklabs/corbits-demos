export const css = async () => {
  const ret = `
:root {
  --bg: #0b0f14;
  --card: hsl(344 6% 16% / .8);
  --muted: hsl(42 40% 70%);
  --text: hsl(42 65% 90%);
  --border: solid hsl(344 6% 30%);
  --accent: #4f8cff;
  --ok: #27c093;
  --warn: #f5a524;
  --err: #ff5d5d;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  background: hsl(344 6% 16%);
  color: var(--text);
  font: 14px/1.5 ui-sans-serif, system-ui, Segoe UI, Roboto, Helvetica, Arial;
}

.wrap {
  max-width: 980px;
  margin: 40px auto;
  padding: 0 16px;
}

.grid { gap: 24px; }

.col { flex: 1 1 360px; display: flex; flex-direction: column; gap: 24px; }

.hero {
  display: flex;
  gap: 24px;
  align-items: center;
  flex-wrap: wrap;
}

.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.item {
  flex: 1 1 360px;
  padding: 22px;
}

.item img {
  width: 100%;
  max-width: 260px;
  border-radius: 12px;
  display: block;
  margin: 0 auto 12px auto;
}

.item h2 {
  margin: 8px 0 0 0;
  font-size: 18px;
}

.muted {
  color: var(--muted);
}

.price {
  font-size: 22px;
  margin: 8px 0;
}

.pill {
  display: inline-block;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: 999px;
  background: hsl(344 6% 16% / .8);
  color: hsl(42 65% 90%);
  border: 1px solid hsl(344 6% 30%);
  transition: background 0.2s ease, color 0.2s ease;
}

form {
  flex: 1 1 360px;
  padding: 22px;
  display: grid;
  gap: 10px;
}

label {
  font-size: 12px;
  color: hsl(42 40% 70%);
}

input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border);
  background: #0f1520;
  color: var(--text);
  border-radius: 10px;
  outline: none;
}

input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(79, 140, 255, 0.15);
}

button {
  appearance: none;
  border: 0;
  background: var(--accent);
  color: white;
  padding: 12px 14px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 10px;
}

button.primary {
  background: hsl(32 81% 53%);
  color: hsl(344 6% 16%);
}

button.secondary {
  background: hsl(344 6% 30%);
  color: hsl(42 65% 90%);
}

button[disabled] {
  opacity: 0.7;
  cursor: not-allowed;
}

.spinner {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.35);
  border-top-color: #fff;
  animation: spin 0.9s linear infinite;
  display: none;
}

button.loading .spinner {
  display: inline-block;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 900px) {
  .grid {
    grid-template-columns: 1.1fr 0.9fr;
  }
}

.status {
  margin-top: 22px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--border);
  background: #0f1520;
}

.row {
  display: flex;
  gap: 10px;
  align-items: center;
  justify-content: space-between;
}

.progress {
  margin-top: 10px;
  display: flex;
  gap: 6px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #223047;
}

.dot.on {
  background: var(--ok);
}

.code {
  font-family: ui-monospace, Menlo, Consolas, monospace;
  font-size: 12px;
  background: #0c1118;
  border: 1px solid #1b2636;
  color: #cfe1ff;
  border-radius: 8px;
  padding: 10px;
  overflow: auto;
}

.code { white-space: pre-wrap; }

a {
  color: var(--text);
  text-decoration: underline;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 1000;
  position: fixed;
}

.modal-overlay::before {
  content: "";
  position: absolute;
  inset: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(4px);
  opacity: 0;
  transition: opacity 200ms ease;
}

.modal-dialog {
  position: relative;
  width: min(700px, 100%);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.35);
  padding: 18px;
  transform: translateY(4px);
  transition: transform 200ms ease;
  background: hsl(344 6% 16%);
  opacity: 1;
}

.modal-overlay.show::before { opacity: 1; }
.modal-overlay.show .modal-dialog { transform: translateY(0); }
.modal-overlay[hidden] { display: none !important; }

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.modal-header h2 {
  margin: 0;
  font-size: 18px;
  color: var(--text);
}

.modal-body p {
  margin: 0 0 10px 0;
  color: var(--text);
}

button.small {
  padding: 8px 10px;
  border-radius: 10px;
  font-weight: 600;
}
`;

  return new Response(ret, {
    headers: {
      "content-type": "text/css; charset=utf-8",
      "cache-control": "public, max-age=600",
    },
  });
};
