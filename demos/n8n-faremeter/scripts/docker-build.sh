#!/bin/bash

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
IMAGE_NAME="n8n-faremeter"
IMAGE_TAG="latest"
N8N_VERSION="${N8N_VERSION:-latest}"

echo -e "${BLUE}Building Custom n8n Docker Image${NC}"
echo ""

echo -e "${YELLOW}Step 1: Building TypeScript project...${NC}"
cd "$PROJECT_ROOT"
npm run build

echo -e "${YELLOW}Step 2: Building Docker image...${NC}"
echo -e "${BLUE}Using n8n version: ${N8N_VERSION}${NC}"
docker build --build-arg N8N_VERSION=${N8N_VERSION} -t ${IMAGE_NAME}:${IMAGE_TAG} -f docker/Dockerfile .

if docker ps -a | grep -q "n8n"; then
  echo -e "${YELLOW}Step 3: Stopping existing n8n container...${NC}"
  docker rm -f n8n
fi

echo ""
echo -e "${GREEN}Docker Image Built Successfully!${NC}"
echo ""
echo -e "${BLUE}Image name: ${IMAGE_NAME}:${IMAGE_TAG}${NC}"
echo ""
echo -e "${BLUE}To run the container:${NC}"
echo ""
echo "docker run -d \\"
echo "  --name n8n \\"
echo "  -p 5678:5678 \\"
echo "  -e NODE_FUNCTION_ALLOW_EXTERNAL='*' \\"
echo "  -e N8N_ENFORCE_SETTINGS_FILE_PERMISSIONS=false \\"
echo "  -v ~/.n8n:/home/node/.n8n \\"
echo "  ${IMAGE_NAME}:${IMAGE_TAG}"
echo ""
echo -e "${BLUE}Or use: npm run docker:start${NC}"
echo ""
