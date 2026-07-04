.PHONY: help test-phase0 test-phase1 test-phase2 test-phase3 test-frontend test-e2e test-all

help:
	@echo "AuraStore Test Suite Runner"
	@echo "==========================="
	@echo "Available commands:"
	@echo "  make test-phase0    - Run Phase 0 (Database connections & constraints)"
	@echo "  make test-phase1    - Run Phase 1 (Backend unit & integration tests)"
	@echo "  make test-phase2    - Run Phase 2 (Security vulnerability tests)"
	@echo "  make test-phase3    - Run Phase 3 (DB pool stress/concurrency tests)"
	@echo "  make test-frontend  - Run frontend unit tests (Vitest)"
	@echo "  make test-e2e       - Run E2E tests (Playwright)"
	@echo "  make test-all       - Run backend tests, security tests, and frontend unit tests"

test-phase0:
	pytest tests/backend/db/

test-phase1:
	pytest tests/backend/unit/ tests/backend/integration/

test-phase2:
	pytest tests/security/

test-phase3:
	python tests/performance/db_pool_stress.py

test-frontend:
	cd frontend && npm run test

test-e2e:
	npx playwright test --config=tests/e2e/playwright.config.ts

test-all: test-phase0 test-phase1 test-phase2
	cd frontend && npx vitest run
