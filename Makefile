.PHONY: test lint build dev up deploy down e2e clean

# Go tests (no Docker)
test:
	go vet ./...
	go test ./... -count=1 -coverprofile=coverage.out
	go tool cover -func=coverage.out | tail -10

# Go vet + pnpm lint
lint:
	go vet ./...
	cd frontend && pnpm run lint

frontend-test:
	cd frontend && pnpm test

frontend-build:
	cd frontend && pnpm run build

# Build images locally (manual, not used by compose)
build:
	docker build -t expense-tracker-backend:local .
	docker build -t expense-tracker-frontend:local -f frontend/Dockerfile frontend

# Build with test stage (like CI)
docker-test:
	docker build --target test -t expense-tracker-backend:test .

ci: test lint frontend-test frontend-build docker-test
	@echo "CI local passed"

# Dev: compila local con compose.override.yaml
dev:
	docker compose up --build -d
	docker compose ps

# Prod: pull de GHCR, sin compilar (Debian server)
up:
	docker compose pull
	docker compose up -d
	docker compose ps

# Push a main → CI → GHCR
deploy:
	git push origin main
	@echo "Pushed. CI will build and push to GHCR."

down:
	docker compose down

e2e:
	docker compose up -d --build
	@echo "waiting health..."
	@for i in 1 2 3 4 5 6; do curl -sf http://localhost:8080/health | grep -q ok && echo "backend healthy" && break || (echo "wait $$i"; sleep 5); done
	curl -sf http://localhost:5173/ | head -20
	docker compose ps
	docker compose down

clean:
	docker builder prune -f
	docker system df
