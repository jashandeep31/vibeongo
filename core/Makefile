
hello:
	echo "Hello MakeFile is working brotheeerrr"


api: 
	go build -o api ./cmd/api-server


bootstrap: 
	go build -o bootstrap-script ./cmd/bootstrap

deploy:
	scp ./bootstrap-script ./config.json ironman@192.168.1.69:/home/ironman
