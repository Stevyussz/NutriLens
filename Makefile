.PHONY: up down logs dev seed check test integration build
up:
	docker compose up --build -d
down:
	docker compose down
logs:
	docker compose logs -f app seeder
dev:
	npm run dev
seed:
	npm run db:seed
check:
	npm run typecheck
test:
	npm test
integration:
	npm run test:integration
build:
	npm run build
