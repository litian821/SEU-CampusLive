.PHONY: check config up down restart ps logs test test-api test-web

check:
	./scripts/check-env.sh

config:
	docker compose config --quiet

up:
	docker compose up --build -d

down:
	docker compose down

restart: down up

ps:
	docker compose ps

logs:
	docker compose logs -f --tail=100

test: test-api test-web config

test-api:
	docker compose run --rm api-test

test-web:
	docker compose run --rm web-build npm run check
