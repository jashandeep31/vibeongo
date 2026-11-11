FROM golang:1.26@sha256:5ebd6e7dc13f9e273ed9470679eb295d8b6e7de3b6379c8a5e17a9e6c3eabd38 AS builder

WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY cmd/ssh-gateway ./cmd/ssh-gateway
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" \
    -o /out/ssh-gateway ./cmd/ssh-gateway

FROM alpine:latest@sha256:f59abe656b692d901e184be3445e084786602108599d2a51d229c0f5a48c71bf

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
