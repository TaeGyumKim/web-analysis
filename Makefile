# ===========================================
# Web Performance Analyzer - Makefile
# ===========================================

.PHONY: help build run stop logs clean dev test lint

# Default target
help:
	@echo "Web Performance Analyzer - Available Commands"
	@echo "=============================================="
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development server"
	@echo "  make test         - Run tests"
	@echo "  make lint         - Run linter"
	@echo ""
	@echo "Docker:"
	@echo "  make build        - Build Docker image"
	@echo "  make run          - Run with docker compose"
	@echo "  make run-nginx    - Run with nginx reverse proxy"
	@echo "  make stop         - Stop containers"
	@echo "  make logs         - View container logs"
	@echo "  make clean        - Remove containers and images"
	@echo ""
	@echo "Production:"
	@echo "  make prod-build   - Build for production"
	@echo "  make prod-start   - Start production server"
	@echo ""

# Git information
GIT_COMMIT := $(shell git rev-parse --short HEAD 2>/dev/null || echo "unknown")
GIT_BRANCH := $(shell git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
GIT_TAG := $(shell git describe --tags --abbrev=0 2>/dev/null || echo "")
GIT_VERSION := $(or $(GIT_TAG),$(GIT_COMMIT))
GIT_DATETIME := $(shell date -u +"%Y-%m-%dT%H:%M:%SZ")

# Export for docker compose
export GIT_COMMIT GIT_BRANCH GIT_TAG GIT_VERSION GIT_DATETIME

# Development
dev:
	npm run dev

test:
	npm run test

lint:
	npm run lint

# Production build (local)
prod-build:
	npm run build

prod-start:
	node .output/server/index.mjs

# Docker commands
build:
	@echo "Building Docker image..."
	@echo "Version: $(GIT_VERSION)"
	docker build \
		--build-arg GIT_COMMIT="$(GIT_COMMIT)" \
		--build-arg GIT_BRANCH="$(GIT_BRANCH)" \
		--build-arg GIT_TAG="$(GIT_TAG)" \
		--build-arg GIT_VERSION="$(GIT_VERSION)" \
		--build-arg GIT_DATETIME="$(GIT_DATETIME)" \
		-t web-perf-analyzer:$(GIT_VERSION) \
		-t web-perf-analyzer:latest \
		.

run:
	docker compose up -d --build
	@echo ""
	@echo "Application running at http://localhost:3000"
	@echo "Health check: http://localhost:3000/api/health"
	@echo "Version info: http://localhost:3000/api/version"

run-nginx:
	docker compose --profile with-nginx up -d --build
	@echo ""
	@echo "Application running at https://localhost"
	@echo "Health check: http://localhost:3000/api/health"

stop:
	docker compose --profile with-nginx down

logs:
	docker compose logs -f

clean:
	docker compose --profile with-nginx down -v --rmi local
	docker image prune -f
