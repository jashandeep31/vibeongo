FROM golang:1.26 AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
  go build -ldflags="-s -w" \
  -o proxyserver ./cmd/proxy/main.go

FROM alpine:latest AS certs
RUN apk add --no-cache ca-certificates

FROM scratch

WORKDIR /app

COPY --from=certs /etc/ssl/certs/ca-certificates.crt \
  /etc/ssl/certs/ca-certificates.crt
COPY --from=builder /app/proxyserver ./proxyserver

CMD ["./proxyserver"]
