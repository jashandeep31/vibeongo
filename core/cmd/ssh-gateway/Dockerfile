FROM golang:1.26 AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY cmd/ssh-gateway ./cmd/ssh-gateway
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" \
    -o /out/ssh-gateway ./cmd/ssh-gateway

FROM alpine:latest

RUN apk add --no-cache ca-certificates \
    && addgroup -S gateway \
    && adduser -S -G gateway gateway \
    && mkdir -p /var/lib/vibeongo \
    && chown gateway:gateway /var/lib/vibeongo

COPY --from=builder /out/ssh-gateway /usr/local/bin/ssh-gateway

USER gateway
WORKDIR /var/lib/vibeongo

EXPOSE 8005/tcp
VOLUME ["/var/lib/vibeongo"]

ENTRYPOINT ["/usr/local/bin/ssh-gateway"]
