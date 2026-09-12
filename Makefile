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
	docker compose run --build --rm api-test

test-web:
	docker compose run --build --rm web-build npm run check

.PHONY: smoke
smoke:
	python3 tests/smoke.py

.PHONY: test-media
test-media:
	python3 tests/media_smoke.py
