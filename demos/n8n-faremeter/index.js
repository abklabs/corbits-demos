module.exports = {
  nodes: [
    require('./dist/nodes/x402Webhook/x402Webhook.node.js'),
    require('./dist/nodes/x402WebhookResponder/x402WebhookResponder.node.js'),
  ],
  credentials: [require('./dist/credentials/FaremeterApi.credentials.js')],
};
