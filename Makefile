.PHONY: backend-env install dev format lint typecheck test e2e

backend-env:
	@sh scripts/ensure-backend-env.sh

install: backend-env
	cd backend && composer install
	cd backend && php artisan app:seed-json --if-empty
	cd frontend && pnpm install
	cd frontend && { [ -f .env ] || cp .env.example .env; }
	cd frontend && pnpm exec playwright install chromium

dev: backend-env
	cd backend && php artisan app:seed-json --if-empty
	@trap 'kill 0' INT TERM EXIT; \
	(cd backend && php artisan serve --port=8000) & \
	(cd frontend && pnpm dev --port 5173) & \
	wait

format:
	cd backend && ./vendor/bin/pint
	cd frontend && pnpm format

lint:
	cd backend && ./vendor/bin/pint --test
	cd frontend && pnpm lint
	cd frontend && pnpm exec prettier --check src e2e

typecheck:
	cd frontend && pnpm typecheck

test:
	cd backend && php artisan test
	cd frontend && pnpm test

e2e:
	cd frontend && pnpm e2e
