SHELL := /bin/bash
WEB_PORT ?= 9003
SEARCH_PORT ?= 8080
RAG_PORT ?= 8002

.PHONY: help bootstrap demo seed-demo test lint down clean

help:
	@echo "Targets:" 
	@echo "  bootstrap   Install Node + Python deps (pnpm + venvs)" 
	@echo "  demo        One-command demo: start all services + seed demo data" 
	@echo "  seed-demo   Seed demo documents + demo users (requires services already running)" 
	@echo "  test        Run automated tests (repo + services)" 
	@echo "  lint        Run lint" 
	@echo "  clean       Remove local artifacts (.venv, node_modules, .demo...)" 

bootstrap:
	bash scripts/bootstrap.sh

demo: down
	WEB_PORT=$(WEB_PORT) SEARCH_PORT=$(SEARCH_PORT) RAG_PORT=$(RAG_PORT) bash scripts/demo.sh

seed-demo:
	WEB_PORT=$(WEB_PORT) SEARCH_PORT=$(SEARCH_PORT) RAG_PORT=$(RAG_PORT) bash scripts/seed-demo.sh

down:
	WEB_PORT=$(WEB_PORT) SEARCH_PORT=$(SEARCH_PORT) RAG_PORT=$(RAG_PORT) bash scripts/down.sh

lint:
	pnpm lint

test:
	pnpm lint
	pnpm typecheck
	@echo "Running search-service tests" 
	cd search-service && ./.venv/bin/python -m pytest -q
	@echo "Running rag-service smoke test" 
	cd rag-service && ./.venv/bin/python -c "import app.main" 

clean:
	rm -rf node_modules .next .demo
	rm -rf search-service/.venv rag-service/.venv
