# syntax=docker/dockerfile:1

# ---- build with cache mounts ----
FROM golang:1.26-alpine AS build
WORKDIR /app
RUN apk add --no-cache git
COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go mod download
COPY . .
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /app/server ./cmd/server

# ---- test stage (run vet + sqlite tests) ----
FROM build AS test
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go vet ./...
RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    go test ./... -count=1 -coverprofile=/tmp/coverage.out && cat /tmp/coverage.out

# ---- final minimal image ----
FROM alpine:3.20
WORKDIR /app
RUN apk add --no-cache ca-certificates wget
COPY --from=build /app/server .
EXPOSE 8080
HEALTHCHECK --interval=5s --timeout=3s --retries=20 --start-period=10s CMD wget -qO- http://localhost:8080/health | grep -q "ok" || exit 1
ENTRYPOINT ["./server"]
