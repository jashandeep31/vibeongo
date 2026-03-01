
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

deploy:
	scp ./bootstrap-script ./config.json ironman@192.168.1.69:/home/ironman
