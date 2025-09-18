#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

IMAGE_NAME="n8n-faremeter"
IMAGE_TAG="latest"
CONTAINER_NAME="n8n"

echo -e "${BLUE}Starting n8n with Custom Nodes${NC}"
echo ""

if ! docker images | grep -q "${IMAGE_NAME}.*${IMAGE_TAG}"; then
  echo -e "${RED}Docker image ${IMAGE_NAME}:${IMAGE_TAG} not found!${NC}"
  echo -e "${YELLOW}Please run 'npm run docker:build' first.${NC}"
  exit 1
fi

if docker ps -a | grep -q "${CONTAINER_NAME}"; then
  echo -e "${YELLOW}Removing existing ${CONTAINER_NAME} container...${NC}"
  docker rm -f ${CONTAINER_NAME}
fi

echo -e "${YELLOW}Starting n8n container...${NC}"
docker run -d \
  --name ${CONTAINER_NAME} \
  -p 5678:5678 \
  -e NODE_FUNCTION_ALLOW_EXTERNAL='*' \
  -e N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false \
  -v ~/.n8n:/home/node/.n8n \
  ${IMAGE_NAME}:${IMAGE_TAG}

echo -e "${YELLOW}Waiting for n8n to start...${NC}"
sleep 5

if curl -s -o /dev/null -w "%{http_code}" http://localhost:5678 | grep -q "200"; then
  echo -e "${GREEN}✓ n8n is running at http://localhost:5678${NC}"
else
  echo -e "${YELLOW}n8n is starting up. It should be available at http://localhost:5678 shortly.${NC}"
fi

echo ""
echo -e "${GREEN}n8n Started Successfully!${NC}"
echo ""
echo -e "${BLUE}Available custom nodes:${NC}"
echo "  - x402Webhook (trigger node)"
echo "  - x402WebhookResponder (action node)"
echo ""
echo -e "${BLUE}To view logs:${NC}"
echo "  docker logs -f n8n"
echo ""
echo -e "${BLUE}To stop:${NC}"
echo "  docker stop n8n"
echo ""
