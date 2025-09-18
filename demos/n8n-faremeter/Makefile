G := \033[32m
Y := \033[33m
B := \033[34m
R := \033[31m
N := \033[0m

N8N_URL := http://localhost:5678

.PHONY: all install build start stop restart demo overmind overmind-stop test logs clean status help

all: install build start
	@echo "$(G)✓ Ready at $(N8N_URL)$(N)"

install:
	@pnpm install

build: install
	@pnpm run build && pnpm run docker:build

start:
	@docker ps -q -f name=n8n | grep -q . || pnpm run docker:start
	@until curl -s $(N8N_URL) > /dev/null 2>&1; do sleep 1; done

stop:
	@docker stop n8n 2>/dev/null || true
	@docker rm n8n 2>/dev/null || true

restart: stop start

logs:
	@docker logs -f n8n

clean: stop
	@rm -rf dist node_modules

status:
	@docker ps -f name=n8n --format "table {{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Not running"

help:
	@echo "$(B)Commands:$(N)"
	@echo "  make         Complete setup"
	@echo "  make test    Test webhooks"
	@echo "  make logs    View logs"
	@echo "  make restart Restart container"
