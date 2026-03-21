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
	go build -o api ./cmd/api

bootstrap: 
	go build -o bootstrap-script ./cmd/bootstrap


