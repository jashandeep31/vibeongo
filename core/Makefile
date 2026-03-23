# Database and Migration Commands
MIGRATE_BIN = ~/go/bin/migrate
DB_URL = "sqlite3://test.db"
MIGRATIONS_DIR = internal/db/migrations

migrate-create:
	@if [ -z "$(name)" ]; then \
		echo "Name is required"; \
		exit 1; \
	fi
	$(MIGRATE_BIN) create -ext sql -dir $(MIGRATIONS_DIR) -seq $(name)

migrate-up:
	$(MIGRATE_BIN) -path $(MIGRATIONS_DIR) -database $(DB_URL) up

migrate-down:
	$(MIGRATE_BIN) -path $(MIGRATIONS_DIR) -database $(DB_URL) down

sqlc:
	~/go/bin/sqlc generate

api: 
	go build -ldflags="-X github.com/jashandeep31/vibeongo/core/internal/handlers.Version=$(shell git rev-parse --short HEAD) -X github.com/jashandeep31/vibeongo/core/internal/handlers.BuildTime=$(shell date -u +'%Y-%m-%dT%H:%M:%SZ')" -o api ./cmd/api

bootstrap: 
	go build -o bootstrap-script ./cmd/bootstrap


