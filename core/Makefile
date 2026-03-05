
hello:
	echo "Hello MakeFile is working brotheeerrr"

api: 
	go build -o api ./cmd/api


bootstrap: 
	go build -o bootstrap-script ./cmd/bootstrap

watch-api:
	air -c .air.api.toml

watch-bootstrap:
	air -c .air.bootstrap.toml

# the default ip is the local ip for testing purposes 
IP ?= 192.168.1.69
deploy:
	scp ./bootstrap-script ./config.json ./api ubuntu@$(IP):/home/ubuntu

# WARN: This is only workks for the local
apideploy:
	go build -o api ./cmd/api/
	scp ./api ironman@$(IP):/home/ironman

