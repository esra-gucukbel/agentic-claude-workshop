#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "==> Starting Docker stack (backend pointed at vibeplanner_tests)..."
cd "$ROOT_DIR"
docker compose -f docker-compose.yml -f docker-compose.test.yml up -d --build --wait

echo "==> Installing Playwright browsers (if needed)..."
cd "$ROOT_DIR/e2e"
npm install
npx playwright install --with-deps chromium

echo "==> Running E2E tests..."
npx playwright test

echo "==> Tearing down Docker stack..."
cd "$ROOT_DIR"
docker compose -f docker-compose.yml -f docker-compose.test.yml down

echo "==> All E2E tests passed!"
