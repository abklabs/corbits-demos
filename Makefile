all: lint build test

build: packages/types $(wildcard packages/*) scripts

lint:
	pnpm prettier -c .
	pnpm eslint .

test:

format:
	pnpm prettier -w .

packages/%: FORCE
	cd $@ && rm -rf dist && pnpm tsc && pnpm tsc-esm-fix

scripts: FORCE
	cd scripts && rm -rf dist && pnpm tsc

.PHONY: all lint test
FORCE:
