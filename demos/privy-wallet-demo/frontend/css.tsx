export const css = async () => {
  const ret = `
:root {
  --bg: #0b0f14;
  --card: hsl(344 6% 16% / .8);
  --muted: hsl(42 40% 70%);
  --text: hsl(42 65% 90%);
  --border: hsl(344 6% 30%);
  --accent: #4f8cff;
  --primary: hsl(32 81% 53%);
  --ok: #27c093;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: hsl(344 6% 16%);
  color: var(--text);
  min-height: 100vh;
}

.header {
  text-align: center;
  padding: 2rem 1rem 1rem;
}

.logo {
  height: 100px;
  width: auto;
}

.card {
  background: var(--card);
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
  padding: 2rem;
  margin: 0 auto 1rem;
  max-width: 800px;
}

h1 {
  margin-bottom: 0.5rem;
  color: var(--text);
}

h2 {
  margin-bottom: 1rem;
  color: var(--text);
  font-size: 1.25rem;
}

p {
  color: var(--muted);
  margin-bottom: 1.5rem;
  line-height: 1.6;
}

button {
  appearance: none;
  border: 0;
  background: var(--primary);
  color: hsl(344 6% 16%);
  padding: 0.75rem 1.5rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  margin-right: 0.5rem;
  transition: opacity 0.2s;
}

button:hover:not(:disabled) {
  opacity: 0.9;
}

button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

button.secondary {
  background: var(--border);
  color: var(--text);
}

button.secondary:hover:not(:disabled) {
  opacity: 0.8;
}

button.loading {
  opacity: 0.7;
  cursor: wait;
}

pre {
  background: #0f1520;
  border: 1px solid var(--border);
  padding: 1rem;
  border-radius: 8px;
  overflow: auto;
  margin-top: 1rem;
  font-size: 0.875rem;
  line-height: 1.5;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: var(--text);
}

.info {
  color: var(--muted);
  font-size: 0.875rem;
  margin-top: 0.5rem;
}

.wallet-info {
  background: #0f1520;
  border: 1px solid var(--border);
  padding: 1rem;
  border-radius: 8px;
  margin: 1rem 0;
}

.wallet-info strong {
  display: block;
  margin-bottom: 0.5rem;
  color: var(--text);
}

ol {
  margin-left: 1.5rem;
  line-height: 1.8;
  color: var(--muted);
}

code {
  background: #0f1520;
  border: 1px solid var(--border);
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
  color: var(--text);
}

.partner-selector {
  margin: 1.5rem 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.partner-selector label {
  font-weight: 600;
  color: var(--text);
  font-size: 0.95rem;
}

.partner-selector select {
  padding: 0.75rem 1rem;
  font-size: 1rem;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: #0f1520;
  color: var(--text);
  cursor: pointer;
  transition: all 0.2s;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  outline: none;
}

.partner-selector select:hover {
  border-color: var(--primary);
}

.partner-selector select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(232, 138, 59, 0.15);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: 20px;
  font-size: 0.875rem;
  font-weight: 600;
  background: rgba(39, 192, 147, 0.15);
  color: var(--ok);
  border: 1px solid var(--ok);
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--ok);
  position: relative;
}

.status-indicator::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--ok);
  animation: pulse-outward 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse-outward {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.7;
  }
  50% {
    transform: translate(-50%, -50%) scale(2.5);
    opacity: 0;
  }
  100% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0;
  }
}

.wallet-details {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 0.875rem;
  color: var(--muted);
  font-family: 'Courier New', monospace;
}

.wallet-address-section {
  margin-bottom: 1.5rem;
}

.wallet-address-label {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--muted);
  margin-bottom: 0.5rem;
}

.wallet-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.wallet-address-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(15, 21, 32, 0.6);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 0.5rem 0.75rem;
  width: fit-content;
}

.wallet-address {
  font-family: 'Courier New', monospace;
  font-size: 0.8rem;
  color: var(--text);
  letter-spacing: -0.01em;
}

.wallet-balance {
  font-family: 'Courier New', monospace;
  font-size: 0.75rem;
  color: var(--primary);
  background: rgba(232, 142, 38, 0.1);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: 500;
}

.copy-button {
  appearance: none;
  background: transparent;
  border: none;
  color: var(--muted);
  padding: 0.25rem;
  border-radius: 4px;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  line-height: 1;
}

.copy-button:hover {
  background: rgba(255, 255, 255, 0.05);
  color: var(--primary);
}

.copy-button.copied {
  color: var(--ok);
  animation: checkmark 0.3s ease;
}

@keyframes checkmark {
  0% {
    transform: scale(0.8);
    opacity: 0;
  }
  50% {
    transform: scale(1.1);
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.log-area {
  margin-top: 1.5rem;
  border-top: 1px solid var(--border);
  padding-top: 1.5rem;
}

.log-area h3 {
  font-size: 1rem;
  color: var(--text);
  margin-bottom: 1rem;
}

.log-section {
  background: rgba(15, 21, 32, 0.5);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.log-section h4 {
  font-size: 0.875rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
  font-weight: 600;
}

.log-content {
  background: #0c1118;
  border: 1px solid var(--border);
  color: #cfe1ff;
  padding: 1rem;
  border-radius: 6px;
  overflow: auto;
  font-family: 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.log-content.empty {
  color: var(--muted);
  font-style: italic;
  background: #0f1520;
}

.status-code {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 4px;
  font-weight: 600;
  font-size: 0.875rem;
  font-family: 'Courier New', monospace;
  margin-bottom: 0.75rem;
}

.status-code.success {
  background: rgba(39, 192, 147, 0.15);
  color: var(--ok);
  border: 1px solid var(--ok);
}

.status-code.error {
  background: rgba(255, 93, 93, 0.15);
  color: #ff5d5d;
  border: 1px solid #ff5d5d;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.button-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 1.5rem;
}
`;

  return new Response(ret, {
    headers: {
      "content-type": "text/css; charset=utf-8",
      "cache-control": "public, max-age=600",
    },
  });
};
