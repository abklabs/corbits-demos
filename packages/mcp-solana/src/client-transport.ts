import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { wrap } from "@faremeter/fetch";
import type { PaymentHandler } from "@faremeter/types";

export class ClientTransport extends StreamableHTTPClientTransport {
  constructor(url: URL, paymentHandlers: PaymentHandler[] = []) {
    const x402Fetch = wrap(fetch, {
      handlers: paymentHandlers,
    });

    super(url, {
      fetch: x402Fetch,
    });
  }
}
