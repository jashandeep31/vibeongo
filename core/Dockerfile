FROM golang:1.26@sha256:5ebd6e7dc13f9e273ed9470679eb295d8b6e7de3b6379c8a5e17a9e6c3eabd38 AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
  go build -ldflags="-s -w" \
  -o proxyserver ./cmd/proxy/main.go

FROM alpine:latest@sha256:f59abe656b692d901e184be3445e084786602108599d2a51d229c0f5a48c71bf AS certs
RUN apk add --no-cache ca-certificates

FROM scratch

WORKDIR /app

COPY --from=certs /etc/ssl/certs/ca-certificates.crt \
  /etc/ssl/certs/ca-certificates.crt
COPY --from=builder /app/proxyserver ./proxyserver

CMD ["./proxyserver"]
