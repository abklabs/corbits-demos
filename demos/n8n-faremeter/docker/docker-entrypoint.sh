#!/bin/sh

if [ -d "/opt/n8n-custom-nodes/n8n-nodes-faremeter" ]; then
  echo "Installing n8n-nodes-faremeter..."
  
  mkdir -p /home/node/.n8n/nodes
  cd /home/node/.n8n/nodes
  
  if [ ! -d "node_modules/n8n-nodes-faremeter" ]; then
    echo "Installing n8n-nodes-faremeter from /opt/n8n-custom-nodes/n8n-nodes-faremeter..."
    npm install file:/opt/n8n-custom-nodes/n8n-nodes-faremeter
    echo "n8n-nodes-faremeter installed successfully"
  else
    echo "n8n-nodes-faremeter already installed"
  fi
fi

if [ -d /opt/custom-certificates ]; then
  echo "Trusting custom certificates from /opt/custom-certificates."
  export NODE_OPTIONS="--use-openssl-ca $NODE_OPTIONS"
  export SSL_CERT_DIR=/opt/custom-certificates
  c_rehash /opt/custom-certificates
fi

if [ "$#" -gt 0 ]; then
  exec n8n "$@"
else
  exec n8n
fi
